import { OpenRouter } from "@openrouter/sdk";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "none";
const OPENROUTER_TIMEOUT_MS =
  Number(process.env.OPENROUTER_TIMEOUT_MS) || 30_000;

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

if (!process.env.OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY in .env");
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("OpenRouter timeout")), ms),
    ),
  ]);
}

async function getMessageContext(msg) {
  let quotedMsg = null;
  let targetMsg = msg;

  if (msg.hasQuotedMsg) {
    try {
      quotedMsg = await msg.getQuotedMessage();
      targetMsg = quotedMsg;
    } catch (error) {
      console.error("Failed to read quoted message:", error);
    }
  }

  const repliedText = quotedMsg?.body?.trim() || "";
  const currentBody = (msg.body || "").trim();
  const commandPrompt = currentBody.replace(/^(\.ai|!ai)\s*/i, "").trim();

  let mediaPayload = null;
  let mediaSummary = "";

  if (targetMsg?.hasMedia) {
    try {
      const media = await targetMsg.downloadMedia();
      if (media?.data) {
        const mimeType = media.mimetype || "application/octet-stream";
        const dataUrl = `data:${mimeType};base64,${media.data}`;

        if (mimeType.startsWith("image/")) {
          mediaPayload = {
            type: "image_url",
            imageUrl: { url: dataUrl, detail: "auto" },
          };
          mediaSummary = `Attached image (${mimeType})`;
        } else if (mimeType.startsWith("audio/")) {
          mediaSummary = `Attached audio (${mimeType})`;
        } else if (mimeType.startsWith("video/")) {
          mediaSummary = `Attached video (${mimeType})`;
        } else {
          mediaSummary = `Attached file (${mimeType})`;
        }
      }
    } catch (error) {
      console.log("Failed to download media context:", error);
    }
  }

  return {
    repliedText,
    commandPrompt,
    mediaPayload,
    mediaSummary,
  };
}

async function handleAI(msg) {
  const chat = await msg.getChat();
  const body = (msg.body || "").trim();
  const lower = body.toLowerCase();

  // AI command (bot-only trigger)
  if (lower.startsWith(".ai") || lower.startsWith("!ai")) {
    // if (!msg.fromMe) return;

    const { repliedText, commandPrompt, mediaPayload, mediaSummary } =
      await getMessageContext(msg);
    const prompt = commandPrompt || "";

    if (!prompt && !repliedText && !mediaSummary) {
      return msg.reply("kata AI: lu mau nanya apa bjir");
    }

    await chat.sendStateTyping();

    try {
      const userText = [
        prompt ? `${prompt}` : "",
        repliedText ? `${repliedText}` : "",
        mediaSummary ? `${mediaSummary}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const messages = [
        {
          role: "system",
          content: "answer in indonesian language, don't exceed 100 tokens",
        },
        {
          role: "user",
          content: mediaPayload
            ? [
                {
                  type: "text",
                  text: userText || "analisis konteks pesan ini",
                },
                mediaPayload,
              ]
            : userText || "analisis konteks pesan ini",
        },
      ];

      const response = await withTimeout(
        openrouter.chat.send({
          chatGenerationParams: {
            model: OPENROUTER_MODEL,
            messages,
          },
        }),
        OPENROUTER_TIMEOUT_MS,
      );

      const reply = response.choices?.[0]?.message?.content;
      await msg.reply(reply ?? "kata AI: entahlah banh");
    } catch (err) {
      console.log("OpenRouter error:", err);

      try {
        const fallbackText = [prompt, repliedText].filter(Boolean).join("\n\n");
        const fallbackMessages = [
          {
            role: "system",
            content: "answer in indonesian language, don't exceed 100 tokens",
          },
          {
            role: "user",
            content: fallbackText || "analisis pesan ini",
          },
        ];

        const fallbackResponse = await withTimeout(
          openrouter.chat.send({
            chatGenerationParams: {
              model: OPENROUTER_MODEL,
              messages: fallbackMessages,
            },
          }),
          OPENROUTER_TIMEOUT_MS,
        );

        const fallbackReply = fallbackResponse.choices?.[0]?.message?.content;
        await msg.reply(fallbackReply ?? "kata AI: entahlah banh");
      } catch (fallbackErr) {
        console.error("OpenRouter fallback error:", fallbackErr);
        if (fallbackErr?.message?.includes("timeout")) {
          await msg.reply("AI nya lagi nyari inspirasi. entar lagi dah banh");
        } else {
          await msg.reply("AI nya lagi ngantuk, entar lagi deh yaa");
        }
      }
    }

    return;
  }

  return;
}

export { handleAI };
