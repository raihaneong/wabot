botwa
feature

- turn video and image into sticker (260317)
- image generation
- AI knowledge retrieval

--
Name: Umamusume Trainer Class
ID: 120363406343353135@g.us

Sticker & out of topic => 120363426915771477@g.us

--
!ngomong
B8gJV1IhpuegLxdpXFOE

--
!sticker-caption

emoji black color
modularize src
top caption
ai signed response
group memory

--
STICKER_LIBRARY=

--
!test
cek aktif

!sticker
ubah pesan balasan jadi stiker

!ai blablabla
tanya ai

!sticker-caption blablabla
ubah pesan balasan jadi stiker dan bikin caption di bawah

!sticker "blablabla"
ubah pesan balasan jadi stiker dan bikin caption di atas

!spam-sticker
kirim 4 stiker random

!gacha-sticker
kirim 4 stiker random dari folder lokal

!gacha-sticker-10
kirim 10 stiker random dari folder lokal

!za-warudo
only admin can send message

!zero
all member can send message

!archive-sticker
archive all sticker in a group

!summary
jumlah stiker terkirim di hari ini

---

src/
tts.js
llm.js
sticker.js
sticker-caption.js
doc/
doc.md
README.md

---
run `$env:TELEMETRY_ENABLED='true'; npm start` to lookup group ID the bot is in