# Milliy Mahalliy Tovuq — halol tovuq go'shti do'koni

Full-stack sayt: mijozlar uchun do'kon + admin panel + Node.js server.
Hech qanday qo'shimcha kutubxona kerak emas.

## Papkalar tuzilmasi
```
milliy-tovuq/
├── server.js          ← backend (API + sayt fayllari)
├── package.json       ← Railway shu fayl orqali "bu Node.js loyiha" deb taniydi
├── .gitignore
├── README.md
├── uploads/.gitkeep   ← admin yuklagan rasmlar uchun (bo'sh papka)
└── public/            ← sayt (frontend)
    ├── index.html, style.css, app.js        ← do'kon sahifasi
    ├── admin.html, admin.css, admin.js      ← admin panel
    └── images/                              ← logo, mahsulot rasmlari, tovuq qismlari rasmi
```
`data/` papkasi (ma'lumotlar bazasi) server birinchi ishga tushganda o'zi yaratiladi — uni GitHub'ga yuklamang.

## Kompyuterda ishga tushirish
```
node server.js
```
Sayt: http://localhost:3000 · Admin panel: http://localhost:3000/admin · Parol: `admin123`

## Railway'ga joylash
1. **GitHub'ga yuklang.** Yuqoridagi hamma fayl va papkalarni yangi repository'ga yuklang.
2. **Railway'da loyiha oching.** railway.com → **New Project** → **Deploy from GitHub repo** → repository'ni tanlang.
   Railway `package.json` ni ko'rib, `npm start` (ya'ni `node server.js`) bilan o'zi ishga tushiradi.
3. **Volume ulang (MUHIM!).** Servisni o'ng tugma bilan bosing → **Attach Volume** → Mount path: `/data`.
   Shunda mahsulotlar, buyurtmalar va yuklangan rasmlar qayta deploy qilganda o'chib ketmaydi.
   Server Volume'ni o'zi topadi, qo'shimcha sozlash kerak emas.
4. **Parol qo'ying.** **Variables** bo'limiga qo'shing: `ADMIN_PASSWORD` = o'zingizning parolingiz.
   (Bu faqat birinchi ishga tushishda ishlaydi; keyin parolni admin paneldan o'zgartirasiz.)
5. **Manzil oling.** **Settings → Networking → Generate Domain**. Sayt `https://...up.railway.app` manzilida ochiladi.
   O'z domeningiz bo'lsa, shu yerda **Custom Domain** qo'shasiz.

Admin panel: `https://SAYTINGIZ/admin`

GitHub'ga yangi o'zgarish yuklasangiz, Railway saytni avtomatik yangilaydi.
