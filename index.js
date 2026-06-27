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

// --------------------
// Daily Question Generator (Hack Club AI)
// --------------------
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

    if (!data.output || !data.output[0]) {
      throw new Error("No AI output received");
    }

    return data.output[0].text.trim();
  } catch (err) {
    console.error("AI generation error:", err);
    return null;
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
// Start bot (Socket Mode)
// --------------------
(async () => {
  await app.start();
  console.log("⚡ Slack bot running in Socket Mode");
})();