# Milliy Tovuq — halol tovuq go'shti do'koni

Bitta sahifali sayt: do'kon, savat, buyurtma va admin panel (`/#admin`).
Hech qanday o'rnatish yoki build kerak emas — Vercel uni to'g'ridan-to'g'ri ochadi.

## Kompyuterda ko'rish
`index.html` faylini brauzerda oching (ikki marta bosing). Tamom.

## GitHub'ga yuklash
1. https://github.com/new — yangi repository yarating (masalan `milliy-tovuq`).
2. "uploading an existing file" havolasini bosing.
3. Shu papkadagi hamma fayllarni (`index.html`, `favicon.svg`, `vercel.json`, `README.md`, `.gitignore`) sudrab tashlang va **Commit changes** bosing.

Yoki terminal orqali:
```
git init
git add .
git commit -m "Milliy Tovuq sayti"
git branch -M main
git remote add origin https://github.com/FOYDALANUVCHI/milliy-tovuq.git
git push -u origin main
```

## Vercel'ga chiqarish
1. https://vercel.com — GitHub orqali kiring.
2. **Add New → Project** → `milliy-tovuq` repository'ni tanlab **Import**.
3. Framework Preset: **Other**. Boshqa sozlamalarni o'zgartirmang → **Deploy**.
4. 30 soniyada sayt `https://milliy-tovuq.vercel.app` kabi manzilda ochiladi.
   O'z domeningiz bo'lsa: Project → Settings → Domains.

GitHub'ga yangi o'zgarish yuklasangiz, Vercel saytni avtomatik yangilaydi.

## Admin panel
Manzil: `https://SAYTINGIZ/#admin` (yoki sahifa pastidagi "Admin panel" havolasi).
Standart parol: **admin123** — "Brend va logo" bo'limida o'zgartiring.

## Muhim: ma'lumotlar qayerda saqlanadi
Bu versiyada server yo'q — admin paneldagi o'zgarishlar va buyurtmalar **faqat
shu brauzerning xotirasida** saqlanadi. Ya'ni:
- admin panelda narxni o'zgartirsangiz, uni faqat o'zingiz ko'rasiz;
- mijozlarning buyurtmalari sizga kelmaydi.

Barcha mijozlarga doimiy ko'rinadigan narx, rasm va logo uchun: ularni to'g'ridan-to'g'ri
`index.html` ichidagi `fresh()` funksiyasida o'zgartiring (nom, narx, telefon, manzil)
va GitHub'ga qayta yuklang.

Haqiqiy buyurtmalar va umumiy admin panel kerak bo'lsa, server versiyasini
(`milliy-tovuq.zip`, Node.js) Railway/Render kabi hostingga joylash kerak yoki
Vercel'ga ma'lumotlar bazasi ulanishi kerak.
