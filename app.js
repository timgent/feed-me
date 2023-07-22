const { App, ExpressReceiver } = require("@slack/bolt");
const { FileInstallationStore } = require("@slack/oauth");

const express = require("express");

require("dotenv").config();

const expressApp = express();

const receiver = new ExpressReceiver({
  app: expressApp,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: "my-state-secret",
  scopes: ["commands", "chat:write"],
  installationStore: new FileInstallationStore({}),
});

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  customRoutes: [
    {
      path: "/health-check",
      method: ["GET"],
      handler: (req, res) => {
        console.log({ req });
        res.writeHead(200);
        res.end(`Things are going just fine at ${req.headers.host}!`);
      },
    },
    {
      path: "/install",
      method: ["GET"],
      handler: (req, res) => {
        res.writeHead(200);
        res.end(
          `<a href="https://slack.com/oauth/v2/authorize?scope=incoming-webhook,commands&user_scope=im:read,im:history&client_id=5531295706209.5612380644420&redirect_uri=https://62f3-81-78-96-145.ngrok-free.app/authorize">Install Feed Me to Slack</a>`
        );
      },
    },
    {
      path: "/authorize",
      method: ["GET"],
      handler: (req, res) => {
        res.writeHead(200);
        console.log("REQUEST PARAMS ARE: ");
        console.log(req);
        res.end("Woohoo!");
      },
    },
  ],
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  conversations = await app.client.users.conversations();
  // app.client.chat.postMessage({
  //   channel: "C05F8KLBN90",
  //   text: "Moop",
  // });
  console.log(conversations);

  console.log("⚡️ Bolt app is running!");
})();
