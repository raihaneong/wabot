export async function safeReact(msg, emoji) {
  if (!msg || typeof msg.react !== "function") {
    return false;
  }

  try {
    await msg.react(emoji);
    return true;
  } catch (error) {
    console.warn(
      `[reaction] failed for ${msg.from || "unknown"} with ${emoji}:`,
      error?.message || error,
    );
    return false;
  }
}
