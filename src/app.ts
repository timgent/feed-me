import { App, ExpressReceiver } from "@slack/bolt";

import express from "express";
import { prisma } from "./db";
import { getTopPeopleSpokenTo, getUserToken } from "./slack";

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
    `<a href="https://slack.com/oauth/v2/authorize?scope=incoming-webhook,commands&user_scope=im:read,im:history,mpim:read,channels:history,groups:read&client_id=5531295706209.5612380644420&redirect_uri=https://timmeh-bee-bop.serveo.net/authorize">Install Feed Me to Slack</a>`
  );
});

expressApp.get("/authorize", async (req, res) => {
  if (typeof req.query["code"] === "string") {
    res.writeHead(200);
    const slackAuthResponse = await getUserToken(req.query["code"]);
    const slackUser = {
      slackUserId: slackAuthResponse.data.authed_user.id,
      accessToken: slackAuthResponse.data.authed_user.access_token,
      scope: slackAuthResponse.data.authed_user.scope,
    };
    await prisma.slackUser.upsert({
      where: { slackUserId: slackUser.slackUserId },
      update: slackUser,
      create: slackUser,
    });

    res.end("Nice one - you've successfully authorized feed me!");
  } else {
    res.writeHead(400);
    res.end("Bad code given");
  }
});

const app = new App({
  receiver: receiver,
  token: process.env["SLACK_BOT_TOKEN"],
  signingSecret: process.env["SLACK_SIGNING_SECRET"],
});

app.command("/feedme", async ({ command, ack, respond }) => {
  console.log("FEED ME!!!");
  await ack();
  await respond("Suggested people for feedback coming right up...");
  const topPeople = await getTopPeopleSpokenTo(command.user_id, 1, 1);
  const responseStrings = topPeople.map(({ userId, score }) => {
    return `<@${userId}> was a top person with a score of ${score}!`;
  });
  await Promise.all(
    responseStrings.map(async (responseString) => {
      await respond(responseString);
    })
  );
});

(async () => {
  await app.start(process.env["PORT"] || 3000);
  console.log("⚡️ Bolt app is running!");
})();

export { app };
