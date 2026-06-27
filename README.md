# Slack Bot

## Installation

1. **Install Dependencies:**

   ```bash
   npm install
   ```

2. **Run the Bot:**

   ```bash
   npm start
   ```

3. **Start Development Mode (Using nodemon):**

   ```bash
   npm run dev
   ```

4. **Copy `.env.example` into `.env`:**

   - Copy the contents from `/.env.example` to `/path/to/.env`.
   - Fill in the placeholders with your actual values.

5. **Fill in Credentials:**

   - Replace `YOUR_SLACK_BOT_TOKEN`, `YOUR_SLACK_SIGNING_SECRET`, `YOUR_SLACK_APP_TOKEN`, `YOUR_SLACK_CHANNEL_ID`, and `YOUR_HACKCLUB_API_KEY` with your actual Slack bot and Hack Club AI API credentials.

6. **Invite the Bot to a Slack Workspace:**

   - Go to the [Slack App Directory](https://slack.com/apps) and search for "Bots".
   - Install the app by selecting the workspace you want to add it to.
   - Click on "Add to Slack" and authorize the app.

7. **Required OAuth Scopes:**

   - `chat:write`: The bot needs permission to send messages in the configured channel.
   - `users.profile:read`: The bot might need to access user profiles if it needs to personalize questions.

8. **Required Event Subscriptions:**

   - Ensure that you have event subscriptions enabled for the following events:
     - `app_mention`
     - `message.channels`

9. **Socket Mode:**

   - Socket mode allows your bot to listen for messages without needing to continuously poll for them.
   - This is a more efficient way to handle message events.

## How to Use

1. **Invite the Bot to a Channel:**

   Make sure the bot is added to the channel where you want it to post daily questions.

2. **Start Generating Questions:**

   The bot will automatically generate and post a daily question at 17:00 UTC each day in the specified Slack channel.

3. **Monitor and Manage:**

   You can monitor the bot's logs and manage its behavior through the Slack App Directory or the bot's console.
```

#### .gitignore

```plaintext
node_modules/
.env