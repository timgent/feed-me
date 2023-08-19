import { SlackUser } from "@prisma/client";
import axios from "axios";
import FormData from "form-data";

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

function getTopPeopleSpokenTo(
  slack_user: SlackUser,
  number_of_days: number,
  number_of_people: number
) {}

export { getTopPeopleSpokenTo, getUserToken };
