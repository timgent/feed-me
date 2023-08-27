import { SlackUser } from "@prisma/client";
import axios from "axios";
import FormData from "form-data";
import * as R from "remeda";
import util from "util";
import { Channel } from "@slack/web-api/dist/response/UsersConversationsResponse";
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

type ChannelType = string;

// TODO NEXT: Need to add in the list of users that are in the channel. Maybe I should use an
// accumulator with that as the key of a map rather than just this list
type ChannelMessageCount = {
  channelId: string;
  channelName: string;
  channelType: ChannelType;
  messageCount: number;
  members: string[];
};

type UserMessageCount = {
  channelId: string;
  channelName: string;
  channelType: ChannelType;
  messageCount: number;
  memberCount: number;
};

type UserId = string;

async function getChannelMessageCounts(
  channel: Channel,
  accessToken: string,
  numberOfDays: number
) {
  // TODO: Improve this -
  // - Check has_more? is false. I can pass a cursory if needed. In the response.response_metadata.next_cursor
  // - Each message has a reply_count field
  if (channel.id) {
    const channelHistory = await app.client.conversations.history({
      token: accessToken,
      channel: channel.id,
      limit: 1000,
      oldest: dayjs().add(-numberOfDays, "days").unix().toString(),
    });
    const channelMembers = await app.client.conversations.members({
      token: accessToken,
      channel: channel.id,
    });
    return {
      channelId: channel.id,
      channelName: channel.name || "",
      channelType: "ims",
      messageCount: channelHistory.messages?.length || 0,
      members: channelMembers.members || [],
    };
  } else {
    return null;
  }
}

function getMessageCountsByUser(
  channelMessageCounts: Array<ChannelMessageCount | null>,
  currentUserId: string
): Map<UserId, UserMessageCount[]> {
  const zeroMessageCounts: Map<UserId, UserMessageCount[]> = new Map();
  const userMessageCount = channelMessageCounts.reduce(
    (messageCounts, channelMessageCount) => {
      const channelMemberCount = channelMessageCount?.members.length || 0;
      channelMessageCount?.members.reduce((messageCounts, slackUserId) => {
        const currentUserMessageCounts = messageCounts.get(slackUserId) || [];
        messageCounts.set(slackUserId, [
          {
            channelId: channelMessageCount.channelId,
            channelName: channelMessageCount.channelName,
            channelType: channelMessageCount.channelType,
            messageCount: channelMessageCount.messageCount,
            memberCount: channelMemberCount,
          },
          ...currentUserMessageCounts,
        ]);
        return messageCounts;
      }, messageCounts);
      return messageCounts;
    },
    zeroMessageCounts
  );
  userMessageCount.delete(currentUserId);
  return userMessageCount;
}

function scoreUsers(
  messageCountsByUser: Map<UserId, UserMessageCount[]>
): { userId: string; score: number }[] {
  const userScores = Array.from(
    messageCountsByUser,
    ([userId, userMessageCounts]) => {
      const userScore = userMessageCounts.reduce((score, userMessageCount) => {
        if (userMessageCount.memberCount <= 1) {
          return score + 0;
        } else {
          return (
            score +
            userMessageCount.messageCount / (userMessageCount.memberCount - 1)
          );
        }
      }, 0);
      return { userId: userId, score: userScore };
    }
  );
  return userScores;
}

async function getTopPeopleSpokenTo(
  slackUserId: string,
  numberOfDays: number,
  numberOfPeople: number
): Promise<{ userId: string; score: number }[]> {
  const slackUser = await lookupSlackUser(slackUserId);
  if (slackUser) {
    const ims = await app.client.users.conversations({
      token: slackUser.accessToken,
      types: "im",
    });
    const imChannels = ims.channels || [];
    const channelMessageCounts = await Promise.all(
      imChannels.map(async (channel) => {
        return getChannelMessageCounts(
          channel,
          slackUser.accessToken,
          numberOfDays
        );
      })
    );
    const messageCountsByUser: Map<UserId, UserMessageCount[]> =
      getMessageCountsByUser(channelMessageCounts, slackUserId);
    const scoredUsers = scoreUsers(messageCountsByUser);
    const topUsers = scoredUsers
      .sort(({ score: scoreA }, { score: scoreB }) => {
        if (scoreA == scoreB) {
          return 0;
        } else if (scoreA > scoreB) {
          return -1;
        } else {
          return 1;
        }
      })
      .slice(0, numberOfPeople);
    return topUsers;
  } else {
    return [];
  }
}

export { getTopPeopleSpokenTo, getUserToken };
