require("dotenv").config();
const cron = require("node-cron");

const { App } = require("@slack/bolt");

// --------------------
// Slack App (Socket Mode)
// --------------------
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

async function generateDailyQuestion() {
  try {
    const prompt = `
Generate one interesting question of the day.
Focus broadly on: technology, AI, Apple, programming, cybersecurity, space, engineering, smart homes, Minecraft, Linux, servers, robotics, and science.
Keep it under 220 characters.
Return ONLY the question.
`;

    const response = await fetch("https://ai.hackclub.com/proxy/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HACKCLUB_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3-32b",
        input: prompt,
        max_output_tokens: 150,
      }),
    });

    const data = await response.json();

    console.log("Hack Club AI response:");
    console.dir(data, { depth: 3 });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    let text = "";

    for (const item of data.output || []) {
      // ONLY take real assistant messages
      if (item.type === "message") {
        for (const c of item.content || []) {
          if (c.type === "output_text") {
            text += c.text;
          }
        }
      }
    }

    // fallback: sometimes response is inside reasoning/text (your current case)
    if (!text) {
      for (const item of data.output || []) {
        if (item.content) {
          for (const c of item.content) {
            if (c.text && typeof c.text === "string") {
              text += c.text;
            }
          }
        }
      }
    }

    text = (text || "").trim();

    if (!text) {
      throw new Error("No usable text found in AI response");
    }

    return text;
  } catch (err) {
    console.error("AI generation error:", err);
    return "⚠️ Failed to generate question (check logs)";
  }
}
// --------------------
// Post to Slack
// --------------------
async function postQuestion(question) {
  if (!question) return;

  try {
    await app.client.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: `🌟 Daily Question\n${question}`,
    });

    console.log("Posted question:", question);
  } catch (err) {
    console.error("Slack post error:", err);
  }
}

// --------------------
// Main daily job
// --------------------
async function handleDailyQuestion() {
  const question = await generateDailyQuestion();
  await postQuestion(question);
}

// --------------------
// Schedule (17:00 UTC)
// --------------------
cron.schedule("0 17 * * *", () => {
  handleDailyQuestion();
});

// --------------------
// Respond when the bot is mentioned
// --------------------
app.event("app_mention", async ({ event, say }) => {
  try {
    console.log(`Mention received from ${event.user}`);

    const question = await generateDailyQuestion();

    if (!question) {
      await say({
        thread_ts: event.ts,
        text: "❌ Sorry, I couldn't generate a question right now. Please try again in a moment.",
      });
      return;
    }

    await say({
      thread_ts: event.ts,
      text: `🌟 *Daily Question*\n\n${question}`,
    });

    console.log("Question sent in reply to mention.");
  } catch (err) {
    console.error("Mention handler error:", err);

    await say({
      thread_ts: event.ts,
      text: "❌ Something went wrong while generating today's question.",
    });
  }
});

// --------------------
// Start bot (Socket Mode)
// --------------------
(async () => {
  await app.start();
  console.log("⚡ Slack bot running in Socket Mode");
})();
