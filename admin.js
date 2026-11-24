// Milliy Tovuq — Admin panel
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const som = n => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
const STOCK = ['butun', 'golen', 'lashka', 'son', 'qanot', 'file', 'boyin', 'oyoq', 'jigar', 'yurak', 'oshqozon', 'qiyma'].map(n => `/images/${n}.svg`);

let token = sessionStorage.getItem('adm') || '';
let data = { products: [], orders: [], settings: {}, categories: [] };
let editing = null;

function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(t._t); t._t = setTimeout(() => t.className = 'toast', 2500);
}
async function api(url, method = 'GET', body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== '/api/login') { logout(true); throw new Error('Sessiya tugadi, qayta kiring'); }
  if (!r.ok) throw new Error(d.error || 'Xatolik');
  return d;
}

/* ---------- Kirish / chiqish ---------- */
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const d = await api('/api/login', 'POST', { password: e.target.password.value });
    token = d.token; sessionStorage.setItem('adm', token);
    e.target.reset(); await boot();
  } catch (err) { toast(err.message, true); }
});
function logout(silent) {
  if (!silent && token) api('/api/logout', 'POST').catch(() => {});
  token = ''; sessionStorage.removeItem('adm');
  $('#appView').hidden = true; $('#loginView').hidden = false;
}
$('#logoutBtn').onclick = () => logout();

async function boot() {
  try { data = await api('/api/admin'); } catch { $('#loginView').hidden = false; return; }
  $('#loginView').hidden = true; $('#appView').hidden = false;
  renderBrand(); renderProducts(); renderOrders(); fillSettings();
}

/* ---------- Tablar ---------- */
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== b.dataset.tab);
  if (b.dataset.tab === 'orders') refreshOrders();
});

function renderBrand() {
  const s = data.settings;
  $('#sideLogo').src = s.logo; $('#sideName').textContent = s.brandName; document.title = 'Admin — ' + s.brandName;
}

/* ---------- Mahsulotlar ---------- */
function renderProducts() {
  const q = $('#pSearch').value.trim().toLowerCase();
  const list = data.products.filter(p => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  const inStock = data.products.filter(p => p.inStock).length;
  $('#prodStats').textContent = `Jami ${data.products.length} ta · sotuvda ${inStock} ta`;
  $('#plist').innerHTML = list.length ? list.map(p => `
    <div class="pc ${p.visible ? '' : 'off'}">
      <div class="im" data-edit="${p.id}"><img src="${esc(p.image)}" alt="">
        <div class="tags">${p.inStock ? '' : '<span class="tag out">Tugagan</span>'}${p.visible ? '' : '<span class="tag hid">Yashirin</span>'}${p.badge ? `<span class="tag b">${esc(p.badge)}</span>` : ''}</div>
      </div>
      <div class="bd"><small>${esc(p.category)}</small><b>${esc(p.name)}</b><span class="pr">${som(p.price)} / ${p.unit}</span></div>
      <div class="ac">
        <button class="btn ghost" data-edit="${p.id}">Tahrirlash</button>
        <button class="btn ghost" data-stock="${p.id}" title="Sotuvda bor / tugagan">${p.inStock ? 'Tugadi' : 'Sotuvga'}</button>
      </div>
    </div>`).join('') : '<div class="empty">Mahsulot topilmadi</div>';
}
$('#pSearch').oninput = renderProducts;
$('#addProduct').onclick = () => openProduct(null);

$('#plist').addEventListener('click', async e => {
  const ed = e.target.closest('[data-edit]'); if (ed) return openProduct(data.products.find(p => p.id === ed.dataset.edit));
  const st = e.target.closest('[data-stock]');
  if (st) {
    const p = data.products.find(x => x.id === st.dataset.stock);
    try { Object.assign(p, await api('/api/products/' + p.id, 'PUT', { inStock: !p.inStock })); renderProducts(); toast(p.inStock ? 'Sotuvga qaytarildi' : 'Tugagan deb belgilandi'); }
    catch (err) { toast(err.message, true); }
  }
});

const dlg = $('#pDialog'), pf = $('#pForm');
$('#stockImgs').innerHTML = STOCK.map(s => `<img src="${s}" data-pick="${s}" alt="">`).join('');
$('#stockImgs').onclick = e => { const s = e.target.dataset.pick; if (s) setPImg(s); };
function setPImg(url) { pf.image.value = url; $('#pImg').src = url; }

function openProduct(p) {
  editing = p;
  $('#pTitle').textContent = p ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot';
  $('#pCat').innerHTML = [...new Set([...data.categories, p?.category].filter(Boolean))].map(c => `<option>${esc(c)}</option>`).join('');
  const v = p || { name: '', price: '', unit: 'kg', category: data.categories[0], badge: '', description: '', image: '/images/butun.svg', inStock: true, visible: true };
  pf.name.value = v.name; pf.price.value = v.price; pf.unit.value = v.unit; pf.category.value = v.category || '';
  pf.badge.value = v.badge || ''; pf.description.value = v.description || '';
  pf.inStock.checked = v.inStock; pf.visible.checked = v.visible; setPImg(v.image);
  $('#pDelete').hidden = !p;
  dlg.showModal();
}
dlg.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target === dlg) dlg.close(); });

pf.addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    name: pf.name.value, price: +pf.price.value, unit: pf.unit.value, category: pf.category.value, badge: pf.badge.value,
    description: pf.description.value, image: pf.image.value, inStock: pf.inStock.checked, visible: pf.visible.checked,
  };
  try {
    if (editing) Object.assign(editing, await api('/api/products/' + editing.id, 'PUT', body));
    else data.products.push(await api('/api/products', 'POST', body));
    dlg.close(); renderProducts(); toast('Saqlandi ✓');
  } catch (err) { toast(err.message, true); }
});
$('#pDelete').onclick = async () => {
  if (!editing || !confirm(`"${editing.name}" o'chirilsinmi?`)) return;
  try { await api('/api/products/' + editing.id, 'DELETE'); data.products = data.products.filter(p => p !== editing); dlg.close(); renderProducts(); toast("O'chirildi"); }
  catch (err) { toast(err.message, true); }
};

/* ---------- Rasm yuklash ----------
   Mahsulot rasmlari avtomatik ravishda 800×800 kvadrat, OQ fonga joylanadi —
   shunda saytdagi barcha rasmlar bir xil ko'rinadi. */
function readImage(file) {
  return new Promise((res, rej) => {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return rej(new Error('Faqat PNG, JPG, WEBP yoki GIF'));
    const img = new Image();
    img.onload = () => res(img); img.onerror = () => rej(new Error("Rasmni o'qib bo'lmadi"));
    img.src = URL.createObjectURL(file);
  });
}
async function prepImage(file, { size, whiteBg, square }) {
  const img = await readImage(file);
  const scale = Math.min(1, size / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const c = document.createElement('canvas');
  c.width = square ? size : w; c.height = square ? size : h;
  const g = c.getContext('2d');
  if (whiteBg) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); }
  if (square) {
    const pad = size * 0.06, s = Math.min((size - pad * 2) / img.width, (size - pad * 2) / img.height);
    const dw = img.width * s, dh = img.height * s;
    g.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
  } else g.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);
  return c.toDataURL(whiteBg ? 'image/jpeg' : 'image/png', .9);
}
async function upload(dataUrl) { return (await api('/api/upload', 'POST', { data: dataUrl })).url; }

$('#pFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { toast('Yuklanmoqda…'); setPImg(await upload(await prepImage(f, { size: 800, whiteBg: true, square: true }))); toast('Rasm yuklandi ✓'); }
  catch (err) { toast(err.message, true); }
};

/* ---------- Buyurtmalar ---------- */
const STATUSES = ['yangi', 'qabul qilindi', 'yetkazilmoqda', 'yetkazildi', 'bekor qilindi'];
async function refreshOrders() { try { data.orders = (await api('/api/admin')).orders; renderOrders(); } catch {} }
function renderOrders() {
  const f = $('#oFilter').value;
  const list = data.orders.filter(o => !f || o.status === f);
  const nNew = data.orders.filter(o => o.status === 'yangi').length;
  $('#newOrders').hidden = !nNew; $('#newOrders').textContent = nNew;
  const done = data.orders.filter(o => o.status === 'yetkazildi');
  $('#orderStats').textContent = `Jami ${data.orders.length} ta · yangi ${nNew} ta · yetkazilgan summa ${som(done.reduce((s, o) => s + o.total, 0))}`;
  $('#olist').innerHTML = list.length ? list.map(o => `
    <div class="order">
      <div>
        <h4>№${o.number} · ${esc(o.name)} <span class="st st-${o.status.split(' ')[0]}">${esc(o.status)}</span></h4>
        <div class="meta">📞 <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a> ${o.address ? '· 📍 ' + esc(o.address) : ''} · ${new Date(o.createdAt).toLocaleString('uz-UZ')}</div>
        ${o.note ? `<div class="meta">💬 ${esc(o.note)}</div>` : ''}
        <ul>${o.items.map(i => `<li>${esc(i.name)} — ${String(i.qty).replace('.', ',')} ${i.unit} × ${som(i.price)} = <b>${som(i.sum)}</b></li>`).join('')}</ul>
      </div>
      <div class="oa">
        <div class="sum">${som(o.total)}</div>
        <select class="input" data-status="${o.id}">${STATUSES.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <button class="btn link" data-odel="${o.id}">O'chirish</button>
      </div>
    </div>`).join('') : '<div class="empty">Buyurtmalar yo\'q</div>';
}
$('#oFilter').onchange = renderOrders;
$('#olist').addEventListener('change', async e => {
  const id = e.target.dataset.status; if (!id) return;
  try { const o = await api('/api/orders/' + id, 'PUT', { status: e.target.value }); Object.assign(data.orders.find(x => x.id === id), o); renderOrders(); toast('Holat yangilandi'); }
  catch (err) { toast(err.message, true); }
});
$('#olist').addEventListener('click', async e => {
  const id = e.target.dataset.odel; if (!id || !confirm("Buyurtma o'chirilsinmi?")) return;
  try { await api('/api/orders/' + id, 'DELETE'); data.orders = data.orders.filter(o => o.id !== id); renderOrders(); }
  catch (err) { toast(err.message, true); }
});
setInterval(() => token && !$('#appView').hidden && refreshOrders(), 30000);

/* ---------- Sozlamalar (brend nomi, logo) ---------- */
const sf = $('#settingsForm');
function fillSettings() {
  const s = data.settings;
  for (const k of ['brandName', 'slogan', 'phone', 'telegram', 'address', 'workHours', 'deliveryNote', 'logo']) sf[k].value = s[k] || '';
  sf.categories.value = data.categories.join(', ');
  $('#logoPreview').src = s.logo;
}
$('#logoFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { toast('Yuklanmoqda…'); const url = await upload(await prepImage(f, { size: 400, whiteBg: false })); sf.logo.value = url; $('#logoPreview').src = url; toast('Logo yuklandi — "Saqlash"ni bosing'); }
  catch (err) { toast(err.message, true); }
};
$('#logoReset').onclick = () => { sf.logo.value = '/images/logo.png'; $('#logoPreview').src = '/images/logo.png'; };
sf.addEventListener('submit', async e => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(sf).entries());
  body.categories = body.categories.split(',').map(s => s.trim()).filter(Boolean);
  try { const d = await api('/api/settings', 'PUT', body); data.settings = d.settings; data.categories = d.categories; renderBrand(); fillSettings(); toast('Sozlamalar saqlandi ✓'); }
  catch (err) { toast(err.message, true); }
});

/* ---------- Parol ---------- */
$('#pwForm').addEventListener('submit', async e => {
  e.preventDefault();
  try { await api('/api/password', 'PUT', { current: e.target.current.value, next: e.target.next.value }); e.target.reset(); toast("Parol o'zgartirildi ✓"); }
  catch (err) { toast(err.message, true); }
});

if (token) boot();
