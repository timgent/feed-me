declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SLACK_SIGNING_SECRET: string;
      SLACK_BOT_TOKEN: string;
      SLACK_CLIENT_ID: string;
      SLACK_CLIENT_SECRET: string;
      NODE_ENV: "development" | "production";
      PORT?: string;
      PWD: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
