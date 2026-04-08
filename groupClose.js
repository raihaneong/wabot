const path = require("path");
const fs = require("fs");
const { MessageMedia } = require("whatsapp-web.js");

function normalizeJid(value) {
  if (!value) return "";
  const raw = typeof value === "string" ? value : value._serialized || "";
  return raw.split("@")[0] || "";
}

function findParticipantByAnyId(participants, ids) {
  const normalized = ids.map(normalizeJid).filter(Boolean);
  if (!normalized.length) return undefined;
  return participants.find((p) => {
    const pid = normalizeJid(p?.id);
    return normalized.includes(pid);
  });
}

async function buildSenderCandidates(msg) {
  const candidates = [msg.author, msg.id?.participant, msg.from];
  const rawAuthorPhone = msg?._data?.authorPn;
  if (rawAuthorPhone) {
    candidates.push(rawAuthorPhone, `${rawAuthorPhone}@c.us`);
  }

  try {
    const contact = await msg.getContact();
    const contactId = contact?.id?._serialized;
    if (contactId) candidates.push(contactId);
    if (contact?.number) {
      candidates.push(contact.number, `${contact.number}@c.us`);
    }
  } catch (error) {
    console.log("[handleGroupClose] getContact failed:", error?.message);
  }

  return [...new Set(candidates.filter(Boolean))];
}

async function handleGroupClose(msg, chat, client) {
  if (!chat.isGroup) {
    return msg.reply("command ini cuma bisa dipake di grup");
  }

  console.log("[handleGroupClose] triggered");
  console.log("[handleGroupClose] chat.isGroup:", chat.isGroup);

  const senderCandidates = await buildSenderCandidates(msg);
  const senderId = senderCandidates.find(Boolean) || "";
  console.log("[handleGroupClose] senderId:", senderId);
  console.log("[handleGroupClose] senderCandidates:", senderCandidates);

  const botCandidates = [client?.info?.wid?._serialized];
  if (msg.fromMe) botCandidates.unshift(senderId);

  // Group participant roles can be stale right after admin changes.
  // Re-read chat data and retry lookup once to reduce false "not admin" blocks.
  const getRoleSnapshot = async (baseChat) => {
    const participants = baseChat?.participants || [];
    return {
      sender: findParticipantByAnyId(participants, senderCandidates),
      botParticipant: findParticipantByAnyId(participants, botCandidates),
      participants,
    };
  };

  let { sender, botParticipant, participants } = await getRoleSnapshot(chat);
  if (!sender || !botParticipant) {
    const refreshedChat = await msg.getChat();
    ({ sender, botParticipant, participants } =
      await getRoleSnapshot(refreshedChat));
  }

  const senderIsAdmin = Boolean(sender?.isAdmin || sender?.isSuperAdmin);
  const botIsAdmin = Boolean(
    botParticipant?.isAdmin || botParticipant?.isSuperAdmin,
  );
  const isAuthorized = senderIsAdmin || (msg.fromMe && botIsAdmin);

  console.log("[handleGroupClose] sender:", sender);
  console.log("[handleGroupClose] botParticipant:", botParticipant);
  console.log("[handleGroupClose] participantsCount:", participants.length);
  console.log(
    "[handleGroupClose] isAdmin:",
    sender?.isAdmin,
    "| isSuperAdmin:",
    sender?.isSuperAdmin,
  );

  if (!isAuthorized) {
    console.log("[handleGroupClose] blocked — sender is not admin");
    return msg.reply("member gabisa lah nutup grup");
  }

  if (!botIsAdmin) {
    console.log("[handleGroupClose] blocked — bot is not admin");
    return msg.reply("bot harus jadi admin dulu buat nutup grup");
  }

  const audioPath = path.join(__dirname, "assets", "lullaby.mp3");
  console.log("[handleGroupClose] audioPath:", audioPath);
  console.log("[handleGroupClose] file exists:", fs.existsSync(audioPath));

  if (!fs.existsSync(audioPath)) {
    return msg.reply("lullaby audio file gada!");
  }

  const media = MessageMedia.fromFilePath(audioPath);
  await chat.setMessagesAdminsOnly(true);
  console.log("[handleGroupClose] group closed successfully");
  await msg.reply(media);
}

async function handleGroupOpen(chat) {
  await chat.setMessagesAdminsOnly(false);
}

module.exports = {
  handleGroupClose,
  handleGroupOpen,
};
