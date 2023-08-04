import { App, ExpressReceiver } from "@slack/bolt";
import axios from "axios";
import FormData from "form-data";

import express from "express";

require("dotenv").config();

const expressApp = express();

const receiver = new ExpressReceiver({
  app: expressApp,
  signingSecret: process.env["SLACK_SIGNING_SECRET"],
  clientId: process.env["SLACK_CLIENT_ID"],
  clientSecret: process.env["SLACK_CLIENT_SECRET"],
});

expressApp.get("/health-check", (req, res) => {
  res.writeHead(200);
  res.end(`Things are going just fine at ${req.headers.host}!`);
});

expressApp.get("/install", (_req, res) => {
  res.writeHead(200);
  res.end(
    `<a href="https://slack.com/oauth/v2/authorize?scope=incoming-webhook,commands&user_scope=im:read,im:history&client_id=5531295706209.5612380644420&redirect_uri=https://0495-81-78-96-145.ngrok-free.app/authorize">Install Feed Me to Slack</a>`
  );
});

expressApp.get("/authorize", async (req, res) => {
  res.writeHead(200);
  const formData = new FormData();
  formData.append("code", req.query["code"]);
  formData.append("client_id", process.env.SLACK_CLIENT_ID);
  formData.append("client_secret", process.env.SLACK_CLIENT_SECRET);

  const slackRes = await axios.post(
    "https://slack.com/api/oauth.v2.access",
    formData
  );
  console.log("Slack Response is:");
  console.log(slackRes);

  res.end("Woohoo!");
});

const app = new App({
  receiver: receiver,
  token: process.env["SLACK_BOT_TOKEN"],
  signingSecret: process.env["SLACK_SIGNING_SECRET"],
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  const conversations = await app.client.users.conversations();
  // app.client.chat.postMessage({
  //   channel: "C05F8KLBN90",
  //   text: "Moop",
  // });
  console.log(conversations);

  console.log("⚡️ Bolt app is running!");
})();
