import fs from "fs"

async function silentReader(msg, isSiderActive) {
    if (!isSiderActive || !msg.hasMedia) return;

    const media = await msg.downloadMedia();
    if (!media || !media.mimetype || !media.data) return;

    const ext = media.mimetype.split('/')[1] || 'bin';
    const filename = `${msg.from}_${msg.timestamp}.${ext}`;

    let folder;
    switch (msg.type) {
        case 'sticker': folder = 'saved/stickers'; break;
        case 'image': folder = 'saved/images'; break;
        case 'video': folder = 'saved/videos'; break;
        default: return;
    }

    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }

    const rawData = media.data;
    const buffer = Buffer.isBuffer(rawData)
        ? rawData
        : Buffer.from(rawData.includes(',') ? rawData.split(',')[1] : rawData, 'base64');

    fs.writeFileSync(`${folder}/${filename}`, buffer);
}

export { silentReader }