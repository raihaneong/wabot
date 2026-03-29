// listening to all incoming messages
// client.on("message", async (msg) => {
//   const chat = await msg.getChat();
//   if (chat.isGroup) {
//     console.log("Name:", chat.name);
//     console.log("ID:", chat.id._serialized);
//   }
// });

// List all groups the bot is a part of and print their names and IDs
// client.on("ready", async () => {
//   const chats = await client.getChats();
//   const groups = chats.filter((c) => c.isGroup);

//   groups.forEach((g) => {
//     console.log(`${g.name} => ${g.id._serialized}`);
//   });
// });
