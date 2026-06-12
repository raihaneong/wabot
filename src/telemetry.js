import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TELEMETRY_PATH = join(__dirname, "..", "telemetry.ndjson");

function appendTelemetry(event) {
  const line = `${JSON.stringify(event)}\n`;
  fs.appendFileSync(TELEMETRY_PATH, line, "utf8");
}

function registerTelemetry(client) {
  client.on("ready", async () => {
    try {
      const chats = await client.getChats();
      const groups = chats.filter((chat) => chat.isGroup);
      for (const group of groups) {
        appendTelemetry({
          ts: new Date().toISOString(),
          kind: "group_catalog",
          groupId: group?.id?._serialized || "",
          groupName: group?.name || "",
        });
      }
      console.log(
        `[telemetry] cataloged ${groups.length} groups -> ${TELEMETRY_PATH}`,
      );
    } catch (error) {
      console.error(
        "[telemetry] ready handler failed:",
        error?.message || error,
      );
    }
  });

  client.on("message", async (msg) => {
    try {
      const chat = await msg.getChat();
      appendTelemetry({
        ts: new Date().toISOString(),
        kind: "incoming_message",
        chatId: chat?.id?._serialized || msg?.from || "",
        chatName: chat?.name || "",
        isGroup: Boolean(chat?.isGroup),
        authorId: msg?.author || "",
        fromMe: Boolean(msg?.fromMe),
        type: msg?.type || "",
        bodyPreview: String(msg?.body || "").slice(0, 80),
      });
    } catch (error) {
      if (String(error?.message || "").includes("channelMetadata")) return;
      console.error(
        "[telemetry] message handler failed:",
        error?.message || error,
      );
    }
  });
}

export { registerTelemetry };
