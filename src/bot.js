import wwebjs from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import config from "./config.json" with { type: "json" };
import { createBotCommands } from "./commands.js";
import { registerTelemetry } from "./logger.js";
import { silentReader } from "./reader.js";
import { startScheduledMoves } from "./cloud.js";

const { Client, LocalAuth } = wwebjs;

export function createBot() {
  const client = new Client({
    authStrategy: new LocalAuth({}),
    puppeteer: {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--no-zygote",
      ],
    },
  });

  const { state, handleMessage, internalGroup } = createBotCommands(client);

  client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
    console.log("QR code received, scan it with your WhatsApp app.");
  });

  client.on("disconnected", (reason) => {
    console.log("Client disconnected:", reason);
  });

  client.on("auth_failure", (msg) => {
    console.log("Auth failure:", msg);
  });

  client.on("ready", () => {
    state.isReady = true;
    console.log("WhatsApp client is ready!");
  });

  client.on("message_create", async (msg) => {
    const senderId = msg.from;

    if (state.isSiderActive && msg.hasMedia) {
      try {
        await silentReader(msg, true);
      } catch (error) {
        console.error("Silent reader error:", error);
      }
    }

    if (!internalGroup.includes(senderId)) return;

    await handleMessage(msg);
  });

  client.setMaxListeners(60);

  return {
    client,
    start() {
      if (process.env.TELEMETRY_ENABLED === "true") {
        registerTelemetry(client);
        console.log("[telemetry] enabled");
      }

      // startScheduledMoves();
      client.initialize();
    },
  };
}

export default createBot;
