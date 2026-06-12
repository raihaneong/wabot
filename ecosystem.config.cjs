import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  apps: [
    {
      name: "whatsapp-bot-1",
      script: "./index.js",
      instances: 1,
      exec_mode: "fork",
      cwd: __dirname,
      env: {
        BOT_ID: "bot1",
        AUTH_DIR: "/session/auth/bot1",
        CACHE_DIR: "/session/cache/bot1",
      },
    },
    {
      name: "whatsapp-bot-2",
      script: "./index.js",
      instances: 1,
      exec_mode: "fork",
      cwd: __dirname,
      env: {
        BOT_ID: "bot2",
        AUTH_DIR: "/session/auth/bot2",
        CACHE_DIR: "/session/cache/bot2",
      },
    },
    {
      name: "whatsapp-bot-3",
      script: "./index.js",
      instances: 1,
      exec_mode: "fork",
      cwd: __dirname,
      env: {
        BOT_ID: "bot3",
        AUTH_DIR: "/session/auth/bot3",
        CACHE_DIR: "/session/cache/bot3",
      },
    },
  ],

  deploy: {
    production: {
      user: "SSH_USERNAME",
      host: "SSH_HOSTMACHINE",
      ref: "origin/master",
      repo: "GIT_REPOSITORY",
      path: "DESTINATION_PATH",
      "pre-deploy-local": "",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
};
