import { SlackUser } from "@prisma/client";
import axios from "axios";
import FormData from "form-data";
import { prisma } from "./db";
import { app } from "./app";
import dayjs from "dayjs";

type SlackAuthResponse = {
  authed_user: ApiSlackUser;
};

type ApiSlackUser = {
  id: string;
  access_token: string;
  scope: string;
};

async function getUserToken(code: string) {
  const formData = new FormData();
  formData.append("code", code);
  formData.append("client_id", process.env["SLACK_CLIENT_ID"]);
  formData.append("client_secret", process.env["SLACK_CLIENT_SECRET"]);

  const slackRes = await axios.post<SlackAuthResponse>(
    "https://slack.com/api/oauth.v2.access",
    formData
  );

  return slackRes;
}

async function lookupSlackUser(slackUserId: string): Promise<SlackUser | null> {
  return await prisma.slackUser.findFirst({
    where: { slackUserId: slackUserId },
  });
}

// TODO NEXT: Need to add in the list of users that are in the channel. Maybe I should use an
// accumulator with that as the key of a map rather than just this list
type MessageCounts = {
  channelId: string;
  channelName: string;
  messageCount: number;
};

async function getTopPeopleSpokenTo(
  slackUserId: string,
  numberOfDays: number,
  numberOfPeople: number
) {
  const slackUser = await lookupSlackUser(slackUserId);
  if (slackUser) {
    const ims = await app.client.users.conversations({
      token: slackUser.accessToken,
      types: "im",
    });
    const imChannels = ims.channels || [];
    // imChannels.reduce(async (moop, chan) => {
    //   return moop;
    // }, zeroMessageCounts);
    const allMessageCountsPromise = imChannels.map(async (channel) => {
      if (channel.id) {
        // TODO: Improve this -
        // - Check has_more? is false. I can pass a cursory if needed. In the response.response_metadata.next_cursor
        // - Each message has a reply_count field
        const channelHistory = await app.client.conversations.history({
          token: slackUser.accessToken,
          channel: channel.id,
          limit: 1000,
          oldest: dayjs().add(-7, "days").unix().toString(),
        });
        const res = {
          channelId: channel.id,
          channelName: channel.name || "",
          messageCount: channelHistory.messages?.length || 0,
        };
        return res;
      } else {
        // This should never happen
        return null;
      }
    });
    const allMessagesCountsWithNulls = await Promise.all(
      allMessageCountsPromise
    );
    const allChannelMessageCounts = allMessagesCountsWithNulls.filter(
      (messageCounts): messageCounts is MessageCounts => messageCounts !== null
    );
    console.log({ allChannelMessageCounts });
    return allChannelMessageCounts;
  }
}

export { getTopPeopleSpokenTo, getUserToken };
