import pino from "pino";

const listenedGroupsLogger = pino({
  transport: {
    target: "pino/file",
    options: { destination: "logs/bot.log" },
  },
});

const generalGroupsLogger = pino({
  transport: {
    target: "pino/file",
    options: { destination: "logs/general.log" },
  },
});

export { listenedGroupsLogger, generalGroupsLogger };
