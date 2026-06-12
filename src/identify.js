import wwebjs from "whatsapp-web.js";

async function identifyHandler(msg) {
  if (msg.body === "/identify") {
    msg.reply(
      "/identify all\n/identify me\n/identify contact me id\n/identify chat all\n/identify chat participants\n/identify quoted\n/identify quoted all\n/identify quoted mimetype\n/identify quoted quoted\n/identify quoted quoted id",
    );
  }

  if (msg.body === "/identify me all") {
    msg.reply(JSON.stringify(contactInfo, null, 2));
  }

  if (msg.body === "/identify contact me id") {
    msg.reply(JSON.stringify(botId, null, 2));
  }

  if (msg.body === "/identify chat all") {
    msg.reply(JSON.stringify(chat, null, 2));
  }

  if (msg.body === "/identify chat participants") {
    let participants = chat.participants || [];
    let userNumber = participants
      .map((p) => `${p.id.user} - ${p.name}`)
      .join("\n");
    msg.reply(userNumber);
  }
  if (msg.body === "siapa?") {
    msg.reply(user);
    // listenedGroupsLogger.info(`Replied to ${chat.name} with sender info.`);
  }

  if (msg.body === "/identify quoted") {
    msg.reply("/identify quoted all\n/identify quoted mimetype");
  }

  if (msg.body === "/identify quoted all") {
    const quoted = await msg.getQuotedMessage();
    msg.reply(`${JSON.stringify(quoted, null, 2)}`);
  }

  if (msg.body === "/identify quoted mimetype") {
    const quoted = await msg.getQuotedMessage();
    try {
      msg.reply(`${quoted?.mimetype}`);
    } catch (err) {
      console.error("Error accessing mimetype of the quoted message:", err);
      msg.reply(err);
    }
  }

  if (msg.body === "/identify quoted quoted") {
    const quoted = await msg.getQuotedMessage();
    const quotedMsg = await quoted?._data;
    msg.reply(`${JSON.stringify(quotedMsg, null, 2)}`);
  }

  if (msg.body === "/identify quoted quoted id") {
    const quoted = await msg.getQuotedMessage();
    const quotedMsg = await quoted?._data;
    const quotedMsgid = await quotedMsg?.id;
    msg.reply(`${JSON.stringify(quotedMsgid, null, 2)}`);
  }
}

export { identifyHandler };
