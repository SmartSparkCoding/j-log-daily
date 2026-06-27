require("dotenv").config();
const cron = require("node-cron");

// Initialize the Slack app
const { App } = require("@slack/bolt");
const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

let lastQuestionId = -1;

// Function to generate a daily question using Hack Club AI
async function generateDailyQuestion() {
  try {
    const prompt = `
Generate one interesting and relevant question for a Slack bot.
The question should be centered around technology, science, or engineering topics.
Avoid personal questions or sensitive information.
Topics: Apple, Technology, Programming, AI, Cybersecurity, Space, Engineering, Smart homes, Home automation, Minecraft, Servers, Raspberry Pi, Linux, Robotics, Future technology, Science, Gadgets, Software, Hardware, Electronics, Swimming, Creative problem solving
The question should be under 220 characters and vary every day.
`;
    const response = await fetch(`https://ai.hackclub.com/proxy/v1/responses`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${process.env.HACKCLUB_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "qwen/qwen3-32b", // Use the Hack Club AI model
        input: prompt,
        max_output_tokens: 150,
      }),
    });
    const data = await response.json();
    if (data.status !== "completed" || !data.output) {
      throw new Error("Hack Club AI failed to generate a question.");
    }
    return data.output[0].text.trim();
  } catch (error) {
    console.error("Error generating daily question:", error);
    return null;
  }
}

// Function to post the generated question in the configured Slack channel
async function postQuestion(questionText) {
  if (!questionText) {
    console.log("No valid question text to post.");
    return;
  }
  await app.client.chat.postMessage({
    channel: process.env.SLACK_CHANNEL_ID,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🌟 Daily Question\n${questionText}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "image",
            image_url: "https://slack.bots.com/stickers/slack/bot-stickers/question-mark/3-48x.png",
            alt_text: "Question Mark",
          },
        ],
      },
    ],
  });
}

// Function to handle daily question posting
async function handleDailyQuestion() {
  const question = await generateDailyQuestion();
  if (question) {
    console.log("Daily question generated:", question);
    postQuestion(question);
  } else {
    console.error("Failed to generate daily question.");
  }
}

// Schedule the bot to run at 17:00 every day in UTC
cron.schedule("0 17 * * *", () => {
  handleDailyQuestion().catch(console.error);
});

app.start(process.env.SLACK_APP_TOKEN).then(() => {
  console.log(`Bot is running. Visit ${process.env.SLACK_BOT_URL} to view the app.`);
});