# App functionality

## Running the app

```bash
npm run dev
```

In a separate terminal:

```bash
ssh -R timmeh-bee-bop.serveo.net:80:localhost:3000 serveo.net
```

Make sure the Slack app has the https://timmeh-bee-bop.serveo.net/authorize URL added to the allowed redirect URLs - https://api.slack.com/apps/A05J0B6JYCC/oauth?

## Endpoints/functionality

The app is setup to have a very basic auth flow for Slack. It goes as follows:

1. At http://localhost:3000/install a Slack user can click the link to be taken to a Slack OAuth page where the user can give the app permissions to access their data. Part of this link is the redirect_uri which points to an ngrok address currently.
2. After going to the OAuth screen grant the app the requested permissions
3. You now get redirected back to the `/authorize` endpoint on the app, and the request includes a temporary authorization code.
4. The handler for the `/authorize` endpoint uses this code to make a POST to the Slack API. This request gets permanent access_tokens for both the bot user and for the user that made the request. Currently it just logs them out.
