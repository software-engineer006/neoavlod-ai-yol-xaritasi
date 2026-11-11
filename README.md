# Neoavlod · AI yo‘l xaritasi

AI asoslaridan agentlargacha bo‘lgan o‘zbek tilidagi tanishtiruv va kursga ariza sahifasi. O‘quv dasturidagi olti bosqich foydalanuvchi bergan **AI o‘rganish yo‘l xaritasi** asosida tayyorlangan.

## Saytni ishga tushirish

Node.js 22 yoki yangiroq versiyasi kerak. Tashqi paket o‘rnatish talab qilinmaydi.

```sh
cp .env.example .env
npm start
```

Brauzerda `http://127.0.0.1:4173` manzilini oching. Lokal sozlamalarni `.env` fayliga, hostingda esa muhit o‘zgaruvchilariga kiriting.

| Sozlama | Qiymat |
| --- | --- |
| `admin_tg_id` | Administratorning Telegram chat ID raqami |
| `TELEGRAM_BOT_TOKEN` | BotFather bergan maxfiy token |

1. Telegram’da [BotFather](https://t.me/BotFather) orqali bot yarating.
2. Administrator o‘sha botning shaxsiy chatini ochib **Start** ni bosadi.
3. Tokenni `.env` fayliga yoki hostingning maxfiy sozlamalariga yozing. Hostingda ikkala o‘zgaruvchini ham kiriting.
4. Saytda sinov arizasini yuborib, xabar administrator chatiga kelganini tekshiring.

Formada ism va telefon raqami so‘raladi. Server Telegram tasdig‘idan keyin muvaffaqiyat holatini qaytaradi. Arizalar sayt bazasida saqlanmaydi. `.env` Git tomonidan kuzatilmaydi. [Telegram Bot API](https://core.telegram.org/bots/api#sendmessage)

## Tekshirish va hosting

```sh
npm test
npm run build
```

Testlar Telegram so‘rovini taqlid qiladi. Build `dist/server/index.js` manzilida Cloudflare Worker uchun modul yaratadi. Oddiy Node hostingda `npm start` ishlatiladi. Hosting portni tayinlasa `PORT` ni, tashqi tarmoqdan kirish kerak bo‘lsa `HOST=0.0.0.0` ni sozlang.

Interfeysda [Lucide](https://lucide.dev/) SVG ikonkalari ishlatilgan. Litsenziya `public/assets/lucide-license.txt` faylida.

## Ubuntu serveri

`deploy/` ichida systemd va Nginx andozalari bor. Dastur Git’da tasdiqlangan versiyadan `/opt/neoavlod-ai/releases/<commit>` manziliga chiqariladi, `/opt/neoavlod-ai/current` esa joriy versiyaga ishora qiladi. Node xizmatini `neoavlod-ai` foydalanuvchisi nomidan ishga tushiring. Nginx andozalaridagi `__SITE_HOST__` ni haqiqiy domen yoki IP bilan almashtiring va TLS sertifikati yo‘lini moslang.

Serverda administrator ID sini kiritish va xizmatni qayta ishga tushirish:

```sh
sudoedit /etc/neoavlod-ai/.env
sudo systemctl restart neoavlod-ai
sudo systemctl status neoavlod-ai
```

`admin_tg_id` to‘ldirilgach, administrator [@NeoAvlodAIBot](https://t.me/NeoAvlodAIBot) chatida **Start** tugmasini bosadi. Sinov arizasi yetib kelganini Telegram’dan tekshiring.

Ubuntu 26.04’da `deploy/bootstrap.sh SITE_IP COMMIT ARCHIVE` andozalarni o‘rnatadi, IP uchun HTTPS sertifikati oladi va uni avtomatik yangilashni sozlaydi. Ishga tushirishdan avval `/etc/neoavlod-ai/.env` faylini root uchun 0600 huquqi bilan tayyorlang.
