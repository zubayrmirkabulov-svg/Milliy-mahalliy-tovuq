/**
 * Milliy Tovuq — to'liq (full-stack) do'kon serveri
 * Hech qanday tashqi kutubxona kerak emas: faqat Node.js (18+)
 * Ishga tushirish:  node server.js   →   http://localhost:3000
 * Admin panel:      http://localhost:3000/admin   (standart parol: admin123)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
// Railway Volume ulangan bo'lsa, ma'lumotlar o'sha yerda saqlanadi (qayta deployda o'chib ketmaydi)
const STORAGE = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.STORAGE_DIR || ROOT;
const UPLOAD_DIR = path.join(STORAGE, 'uploads');
const DATA_DIR = path.join(STORAGE, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const MAX_BODY = 8 * 1024 * 1024; // 8 MB (rasm yuklash uchun)
const TOKEN_TTL = 12 * 60 * 60 * 1000; // 12 soat

[UPLOAD_DIR, DATA_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

/* ---------------- Ma'lumotlar bazasi (JSON fayl) ---------------- */
function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return { salt, hash };
}
function checkPassword(pw, rec) {
  const { hash } = hashPassword(pw, rec.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(rec.hash, 'hex'));
}
const id = () => crypto.randomBytes(6).toString('hex');

function seed() {
  const p = (name, category, price, unit, image, description, badge = '') =>
    ({ id: id(), name, category, price, unit, image: `/images/${image}.svg`, description, badge, inStock: true, visible: true, createdAt: Date.now() });
  return {
    settings: {
      brandName: 'Milliy Mahalliy Tovuq',
      slogan: "Mahalliy fermadan — 100% halol tovuq go'shti",
      logo: '/images/logo.png',
      phone: '+998 90 123 45 67',
      address: "Toshkent sh., Chilonzor tumani",
      workHours: 'Har kuni 08:00 – 21:00',
      telegram: '',
      deliveryNote: "Toshkent bo'ylab yetkazib berish 1–3 soat ichida",
    },
    admin: hashPassword(process.env.ADMIN_PASSWORD || 'admin123'),
    categories: ['Butun tovuq', "Go'sht qismlari", 'Subproduktlar'],
    products: [
      p('Butun tovuq', 'Butun tovuq', 38000, 'kg', 'butun', "Mahalliy fermada boqilgan, halol so'yilgan butun tovuq. 1.6–2.2 kg.", 'Ommabop'),
      p('Golen', "Go'sht qismlari", 45000, 'kg', 'golen', "Tovuq boldiri (golen) — qovurish, grill va sho'rva uchun ideal.", 'Ommabop'),
      p('Lashka (son usti)', "Go'sht qismlari", 42000, 'kg', 'lashka', "Sersuv, yumshoq son usti go'shti. Shashlik va palov uchun."),
      p('Son (butun oyoq)', "Go'sht qismlari", 40000, 'kg', 'son', "Lashka va golen birga — tovuq oyog'ining butun qismi."),
      p('Qanot', "Go'sht qismlari", 36000, 'kg', 'qanot', "Tovuq qanotlari — grill, duxovka va qovurma uchun."),
      p("To'sh filesi", "Go'sht qismlari", 58000, 'kg', 'file', "Suyaksiz, terisiz ko'krak filesi. Parhez va sport ovqatlari uchun.", 'Parhez'),
      p("Bo'yin", "Go'sht qismlari", 18000, 'kg', 'boyin', "Tovuq bo'yni — mazali sho'rva va bulyon uchun."),
      p('Oyoq (panja)', 'Subproduktlar', 15000, 'kg', 'oyoq', "Tozalangan tovuq panjalari — xolodets va bulyon uchun."),
      p('Jigar', 'Subproduktlar', 30000, 'kg', 'jigar', "Yangi tovuq jigari — temir moddasiga boy."),
      p('Yurak', 'Subproduktlar', 35000, 'kg', 'yurak', "Tovuq yuraklari — qovurma va shashlik uchun."),
      p('Oshqozon (pupak)', 'Subproduktlar', 32000, 'kg', 'oshqozon', "Tozalangan tovuq oshqozoni, dimlama uchun ajoyib."),
      p('Tovuq qiymasi', "Go'sht qismlari", 50000, 'kg', 'qiyma', "Yangi tayyorlangan tovuq qiymasi — kotlet, manti, chuchvara uchun."),
    ],
    orders: [],
  };
}

let db;
function loadDb() {
  if (!fs.existsSync(DB_FILE)) { db = seed(); saveDb(); return; }
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  db.orders ||= []; db.categories ||= [];
}
function saveDb() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
loadDb();

/* ---------------- Yordamchi funksiyalar ---------------- */
const tokens = new Map();
function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error("So'rov juda katta (maks. 8 MB)"), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error("Noto'g'ri JSON"), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
function isAdmin(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const exp = tokens.get(t);
  if (!exp) return false;
  if (exp < Date.now()) { tokens.delete(t); return false; }
  return true;
}
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const num = v => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
const isImagePath = v => typeof v === 'string' && /^\/(images|uploads)\/[\w.-]+$/.test(v);

function cleanProduct(b, old = {}) {
  const out = { ...old };
  if ('name' in b) out.name = str(b.name, 80);
  if ('category' in b) out.category = str(b.category, 50);
  if ('price' in b) out.price = Math.round(num(b.price));
  if ('unit' in b) out.unit = ['kg', 'dona'].includes(b.unit) ? b.unit : 'kg';
  if ('description' in b) out.description = str(b.description, 400);
  if ('badge' in b) out.badge = str(b.badge, 20);
  if ('image' in b) out.image = isImagePath(b.image) ? b.image : (old.image || '/images/butun.svg');
  if ('inStock' in b) out.inStock = !!b.inStock;
  if ('visible' in b) out.visible = !!b.visible;
  return out;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.json': 'application/json',
};
function serveStatic(req, res, pathname) {
  let base = PUBLIC_DIR, rel = pathname;
  if (pathname.startsWith('/uploads/')) { base = UPLOAD_DIR; rel = pathname.slice('/uploads'.length); }
  if (rel === '/' ) rel = '/index.html';
  if (rel === '/admin' || rel === '/admin/') rel = '/admin.html';
  const file = path.normalize(path.join(base, decodeURIComponent(rel)));
  if (!file.startsWith(base + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Sahifa topilmadi'); }
    const ext = path.extname(file).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' };
    if (base === UPLOAD_DIR) headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------------- API ---------------- */
async function api(req, res, pathname) {
  const m = req.method;
  const parts = pathname.split('/').filter(Boolean); // ['api', 'products', ':id']
  const [, resource, rid] = parts;

  // --- Ommaviy (public) ---
  if (m === 'GET' && resource === 'public') {
    return send(res, 200, {
      settings: db.settings,
      categories: db.categories,
      products: db.products.filter(p => p.visible),
    });
  }
  if (m === 'POST' && resource === 'login') {
    const b = await readBody(req);
    if (!b.password || !checkPassword(b.password, db.admin)) return send(res, 401, { error: "Parol noto'g'ri" });
    const t = crypto.randomBytes(24).toString('hex');
    tokens.set(t, Date.now() + TOKEN_TTL);
    return send(res, 200, { token: t });
  }
  if (m === 'POST' && resource === 'orders') {
    const b = await readBody(req);
    const name = str(b.name, 60), phone = str(b.phone, 30), address = str(b.address, 200), note = str(b.note, 300);
    if (!name || phone.replace(/\D/g, '').length < 9) return send(res, 400, { error: 'Ism va telefon raqamini kiriting' });
    const items = [];
    for (const it of Array.isArray(b.items) ? b.items.slice(0, 50) : []) {
      const p = db.products.find(x => x.id === it.id && x.visible && x.inStock);
      const qty = Math.min(num(it.qty), 1000);
      if (p && qty > 0) items.push({ id: p.id, name: p.name, price: p.price, unit: p.unit, qty, sum: Math.round(p.price * qty) });
    }
    if (!items.length) return send(res, 400, { error: "Savat bo'sh yoki mahsulot tugagan" });
    const order = { id: id(), number: (db.orders[0]?.number || 1000) + 1, name, phone, address, note, items,
      total: items.reduce((s, i) => s + i.sum, 0), status: 'yangi', createdAt: Date.now() };
    db.orders.unshift(order); saveDb();
    return send(res, 201, { ok: true, number: order.number, total: order.total });
  }

  // --- Faqat admin ---
  if (!isAdmin(req)) return send(res, 401, { error: 'Avval tizimga kiring' });

  if (resource === 'logout' && m === 'POST') {
    tokens.delete((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
    return send(res, 200, { ok: true });
  }
  if (resource === 'admin' && m === 'GET') {
    return send(res, 200, { settings: db.settings, categories: db.categories, products: db.products, orders: db.orders });
  }
  if (resource === 'products') {
    if (m === 'POST' && !rid) {
      const b = await readBody(req);
      const p = cleanProduct({ name: '', category: db.categories[0] || '', price: 0, unit: 'kg', description: '', badge: '',
        image: '/images/butun.svg', inStock: true, visible: true, ...b });
      if (!p.name) return send(res, 400, { error: 'Mahsulot nomini kiriting' });
      p.id = id(); p.createdAt = Date.now();
      db.products.push(p); saveDb();
      return send(res, 201, p);
    }
    const idx = db.products.findIndex(p => p.id === rid);
    if (idx === -1) return send(res, 404, { error: 'Mahsulot topilmadi' });
    if (m === 'PUT') {
      const p = cleanProduct(await readBody(req), db.products[idx]);
      if (!p.name) return send(res, 400, { error: 'Mahsulot nomini kiriting' });
      db.products[idx] = p; saveDb();
      return send(res, 200, p);
    }
    if (m === 'DELETE') { db.products.splice(idx, 1); saveDb(); return send(res, 200, { ok: true }); }
  }
  if (resource === 'reorder' && m === 'PUT') {
    const b = await readBody(req);
    const order = Array.isArray(b.ids) ? b.ids : [];
    db.products.sort((a, c) => (order.indexOf(a.id) + 1 || 1e9) - (order.indexOf(c.id) + 1 || 1e9));
    saveDb(); return send(res, 200, { ok: true });
  }
  if (resource === 'settings' && m === 'PUT') {
    const b = await readBody(req);
    const s = db.settings;
    for (const k of ['brandName', 'slogan', 'phone', 'address', 'workHours', 'telegram', 'deliveryNote']) if (k in b) s[k] = str(b[k], 200);
    if ('logo' in b && isImagePath(b.logo)) s.logo = b.logo;
    if (Array.isArray(b.categories)) db.categories = [...new Set(b.categories.map(c => str(c, 50)).filter(Boolean))].slice(0, 20);
    if (!s.brandName) s.brandName = 'Milliy Mahalliy Tovuq';
    saveDb(); return send(res, 200, { settings: s, categories: db.categories });
  }
  if (resource === 'password' && m === 'PUT') {
    const b = await readBody(req);
    if (!checkPassword(b.current || '', db.admin)) return send(res, 400, { error: "Joriy parol noto'g'ri" });
    if (String(b.next || '').length < 6) return send(res, 400, { error: "Yangi parol kamida 6 ta belgi bo'lsin" });
    db.admin = hashPassword(b.next); saveDb();
    return send(res, 200, { ok: true });
  }
  if (resource === 'upload' && m === 'POST') {
    const b = await readBody(req);
    const mt = /^data:(image\/(png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(b.data || '');
    if (!mt) return send(res, 400, { error: 'Faqat PNG, JPG, WEBP yoki GIF rasm yuklang' });
    const ext = { png: 'png', jpeg: 'jpg', webp: 'webp', gif: 'gif' }[mt[2]];
    const buf = Buffer.from(mt[3], 'base64');
    if (buf.length > 6 * 1024 * 1024) return send(res, 413, { error: 'Rasm 6 MB dan katta' });
    const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    return send(res, 201, { url: `/uploads/${name}` });
  }
  if (resource === 'orders') {
    const o = db.orders.find(x => x.id === rid);
    if (!o) return send(res, 404, { error: 'Buyurtma topilmadi' });
    if (m === 'PUT') {
      const b = await readBody(req);
      if (['yangi', 'qabul qilindi', 'yetkazilmoqda', 'yetkazildi', 'bekor qilindi'].includes(b.status)) o.status = b.status;
      saveDb(); return send(res, 200, o);
    }
    if (m === 'DELETE') { db.orders = db.orders.filter(x => x.id !== rid); saveDb(); return send(res, 200, { ok: true }); }
  }
  return send(res, 404, { error: 'Topilmadi' });
}

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  try {
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    serveStatic(req, res, pathname);
  } catch (e) {
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Server xatosi' });
    if (!e.status) console.error(e);
  }
}).listen(PORT, () => {
  console.log(`\n  🐔  ${db.settings.brandName} ishga tushdi`);
  console.log(`  Sayt:        http://localhost:${PORT}`);
  console.log(`  Admin panel: http://localhost:${PORT}/admin\n`);
});
