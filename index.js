require("dotenv").config();
const cron = require("node-cron");
const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

function extractText(data) {
  const outputs = data?.output || [];

  let text = "";

  for (const item of outputs) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === "output_text" && typeof c.text === "string") {
          text += c.text;
        }
        if (typeof c.text === "string" && !c.type) {
          text += c.text;
        }
      }
    }

    if (item.type === "output_text" && typeof item.text === "string") {
      text += item.text;
    }
  }

  text = (text || "").replace(/\n{3,}/g, "\n\n").trim();

  return text || null;
}

async function generateDailyQuestion() {
  try {
    const prompt = `
Generate one interesting question of the day.
Focus broadly on: technology, AI, Apple, programming, cybersecurity, space, engineering, smart homes, Minecraft, Linux, servers, robotics, and science. The questions must be aimed towards ages 15 to 18.
IMPORTANT: Do NOT include any reasoning, explanation, or thinking steps.
Return ONLY a single clean question.
Keep it under 220 characters.
`;

    const response = await fetch(
      "https://ai.hackclub.com/proxy/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HACKCLUB_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        input: prompt,
        max_output_tokens: 600,
        reasoning: { effort: "low" }
        }),
      }
    );

    const data = await response.json();

    console.log("Hack Club AI response:");
    console.dir(data, { depth: 3 });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = extractText(data);

    if (!text) {
      throw new Error("No usable text found in AI response");
    }

    return text;
  } catch (err) {
    console.error("AI generation error:", err);
    return "Failed to generate question (check logs)";
  }
}

async function postQuestion(question) {
  if (!question) return;

  try {
    await app.client.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: `:star2: *Daily Question*\n Reply in the Thread! \n\n${question}`,
    });

    console.log("Posted question:", question);
  } catch (err) {
    console.error("Slack post error:", err);
  }
}

async function handleDailyQuestion() {
  const question = await generateDailyQuestion();
  await postQuestion(question);
}

cron.schedule("0 17 * * *", () => {
  handleDailyQuestion();
});

app.event("app_mention", async ({ event, say }) => {
  try {
    console.log(`Mention received from ${event.user}`);

    const question = await generateDailyQuestion();

    if (!question) {
      await say({
        thread_ts: event.ts,
        text: "Sorry, I couldn't generate a question right now. Please try again in a moment.",
      });
      return;
    }

    await say({
      thread_ts: event.ts,
      text: `:star2: *Daily Question*\n Reply in the Thread! \n\n${question}`,
    });

    console.log("Question sent in reply to mention.");
  } catch (err) {
    console.error("Mention handler error:", err);

    await say({
      thread_ts: event.ts,
      text: "Something went wrong while generating today's question. Please contact @Jacob.",
    });
  }
});

(async () => {
  await app.start();
  console.log("⚡ Slack bot running in Socket Mode");
})();