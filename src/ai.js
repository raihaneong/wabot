const { OpenRouter } = require("@openrouter/sdk");
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "none";
const OPENROUTER_TIMEOUT_MS =
  Number(process.env.OPENROUTER_TIMEOUT_MS) || 30_000;

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

if (!process.env.OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY in .env");
  process.exit(1);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("OpenRouter timeout")), ms),
    ),
  ]);
}

async function handleAI(msg) {
  const chat = await msg.getChat();
  const body = (msg.body || "").trim();
  const lower = body.toLowerCase();

  // AI command (bot-only trigger)
  if (lower.startsWith(".ai") || lower.startsWith("!ai")) {
    if (!msg.fromMe) return;

    console.log(Date.now(), "AI handler triggered");

    const prompt = body.replace(/^(\.ai|!ai)\s*/i, "").trim();
    console.log(Date.now(), "Prompt:", prompt);

    if (!prompt) {
      return msg.reply("kata AI: lu mau nanya apa bjir");
    }

    await chat.sendStateTyping();

    try {
      console.log(Date.now(), "Calling OpenRouter (model:", OPENROUTER_MODEL, ")...");
      const response = await withTimeout(
        openrouter.chat.send({
          chatGenerationParams: {
            model: OPENROUTER_MODEL,
            messages: [
              {
                role: "system",
                content:
                  "answer in indonesian language, don't exceed 100 tokens",
              },
              { role: "user", content: prompt },
            ],
          },
        }),
        OPENROUTER_TIMEOUT_MS,
      );

      console.log("Response:", JSON.stringify(response, null, 2));
      const reply = response.choices?.[0]?.message?.content;
      await msg.reply(reply ?? "kata AI: entahlah banh");
    } catch (err) {
      console.error("OpenRouter error:", err);
      if (err?.message?.includes("timeout")) {
        await msg.reply("AI nya lagi nyari inspirasi. entar lagi dah banh");
      } else {
        await msg.reply("AI nya lagi ngantuk, entar lagi deh yaa");
      }
    }

    return;
  }

  return;
}

module.exports = {
  handleAI,
};