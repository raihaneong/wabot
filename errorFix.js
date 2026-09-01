  async function handleError(msg) {
  const chat = msg.getChat();
  try {
    // prevents the channelMetadata error: TypeError: Cannot read properties of undefined (reading 'description')
    let chat;
      chat = await msg.getChat();
    }
    catch (err) {
              const message = String(err?.message || "");
      const stack = String(err?.stack || "");
      const knownChannelParseError =
        message.includes("channelMetadata") ||
        message.includes("description") ||
        stack.includes("Channel.js") ||
        stack.includes("ChatFactory.js");
      if (knownChannelParseError) {
        return;
      }
      throw err;
      console.error("Error getting chat:", err);
      return;
    }
}
