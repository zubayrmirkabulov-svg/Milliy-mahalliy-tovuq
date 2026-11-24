// Milliy Tovuq — do'kon sahifasi
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const som = n => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
const fmtQty = (q, u) => (u === 'kg' ? (+q).toString().replace('.', ',') + ' kg' : q + ' dona');

let state = { products: [], categories: [], settings: {}, cat: 'Hammasi', q: '' };
let cart = {};
try { cart = JSON.parse(localStorage.getItem('cart') || '{}'); } catch { cart = {}; }
const saveCart = () => { try { localStorage.setItem('cart', JSON.stringify(cart)); } catch {} };

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2600);
}

async function load() {
  try {
    const r = await fetch('/api/public');
    const d = await r.json();
    state = { ...state, ...d };
    applySettings(); renderChips(); renderGrid(); renderCart();
  } catch {
    $('#grid').innerHTML = '<div class="empty">Server bilan aloqa yo\'q. Keyinroq urinib ko\'ring.</div>';
  }
}

function applySettings() {
  const s = state.settings;
  document.title = `${s.brandName} — halol tovuq go'shti`;
  ['#brandName', '#brandName2', '#brandName3', '#heroTitle'].forEach(id => $(id).textContent = s.brandName);
  ['#slogan', '#slogan2'].forEach(id => $(id).textContent = s.slogan || '');
  ['#logo', '#logo2'].forEach(id => $(id).src = s.logo);
  $('#favicon').href = s.logo;
  const tel = (s.phone || '').replace(/[^\d+]/g, '');
  $('#heroPhone').href = 'tel:' + tel; $('#heroPhone span').textContent = s.phone || '';
  $('#fPhone').innerHTML = s.phone ? `📞 <a href="tel:${esc(tel)}">${esc(s.phone)}</a>` : '';
  const tg = (s.telegram || '').replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '');
  $('#fTg').innerHTML = tg ? `✈ <a href="https://t.me/${esc(tg)}" target="_blank" rel="noopener">@${esc(tg)}</a>` : '';
  $('#fAddress').textContent = s.address ? '📍 ' + s.address : '';
  $('#fHours').textContent = s.workHours ? '🕗 ' + s.workHours : '';
  $('#deliveryNote').textContent = s.deliveryNote ? '🚚 ' + s.deliveryNote : '';
  $('#year').textContent = new Date().getFullYear();
}

function renderChips() {
  const cats = ['Hammasi', ...state.categories.filter(c => state.products.some(p => p.category === c))];
  $('#chips').innerHTML = cats.map(c => `<button class="chip ${c === state.cat ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
}

function renderGrid() {
  const q = state.q.toLowerCase();
  const list = state.products.filter(p =>
    (state.cat === 'Hammasi' || p.category === state.cat) &&
    (!q || (p.name + ' ' + p.description).toLowerCase().includes(q)));
  if (!list.length) { $('#grid').innerHTML = '<div class="empty">Hech narsa topilmadi</div>'; return; }
  $('#grid').innerHTML = list.map(p => `
    <article class="card">
      <div class="img">
        <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
        <span class="halal">HALOL</span>
        ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}
        ${p.inStock ? '' : '<div class="soldout">Tugagan</div>'}
      </div>
      <div class="body">
        <span class="cat">${esc(p.category)}</span>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.description)}</p>
        <div class="row">
          <div class="price">${som(p.price)} <small>/ ${p.unit === 'kg' ? 'kg' : 'dona'}</small></div>
          <button class="add" data-add="${p.id}" ${p.inStock ? '' : 'disabled'}>+ Savatga</button>
        </div>
      </div>
    </article>`).join('');
}

const step = p => (p.unit === 'kg' ? 0.5 : 1);
function addToCart(id, delta) {
  const p = state.products.find(x => x.id === id); if (!p) return;
  const q = Math.round(((cart[id] || 0) + delta * step(p)) * 10) / 10;
  if (q <= 0) delete cart[id]; else cart[id] = q;
  saveCart(); renderCart();
}

function renderCart() {
  // mavjud bo'lmagan mahsulotlarni tozalash
  for (const id in cart) if (!state.products.find(p => p.id === id && p.inStock)) delete cart[id];
  const items = Object.entries(cart).map(([id, qty]) => ({ p: state.products.find(x => x.id === id), qty }));
  const count = items.length;
  $('#cartCount').textContent = count;
  const total = items.reduce((s, i) => s + i.p.price * i.qty, 0);
  $('#cartTotal').textContent = som(total);
  $('#cartItems').innerHTML = count ? items.map(({ p, qty }) => `
    <div class="ci">
      <img src="${esc(p.image)}" alt="">
      <div><b>${esc(p.name)}</b><small>${som(p.price)} / ${p.unit} · ${som(p.price * qty)}</small></div>
      <div class="qty"><button data-dec="${p.id}">−</button><span>${fmtQty(qty, p.unit)}</span><button data-inc="${p.id}">+</button></div>
    </div>`).join('') : '<div class="empty-cart">🛒<br>Savat hozircha bo\'sh</div>';
  $('#orderForm').style.display = count ? '' : 'none';
}

function openCart(open) {
  $('#drawer').classList.toggle('open', open);
  $('#overlay').classList.toggle('show', open);
  $('#drawer').setAttribute('aria-hidden', !open);
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-add],[data-inc],[data-dec],[data-cat]');
  if (!t) return;
  if (t.dataset.cat) { state.cat = t.dataset.cat; renderChips(); renderGrid(); }
  if (t.dataset.add) {
    const pr = state.products.find(x => x.id === t.dataset.add);
    addToCart(t.dataset.add, !cart[t.dataset.add] && pr?.unit === 'kg' ? 2 : 1);
    const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    toast("Savatga qo'shildi ✓");
  }
  if (t.dataset.inc) addToCart(t.dataset.inc, 1);
  if (t.dataset.dec) addToCart(t.dataset.dec, -1);
});
$('#search').addEventListener('input', e => { state.q = e.target.value.trim(); renderGrid(); });
$('#cartBtn').onclick = () => openCart(true);
$('#closeCart').onclick = () => openCart(false);
$('#overlay').onclick = () => openCart(false);
document.addEventListener('keydown', e => e.key === 'Escape' && openCart(false));

$('#orderForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const body = Object.fromEntries(f.entries());
  body.items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
  const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Yuborilmoqda…';
  try {
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Xatolik');
    cart = {}; saveCart(); renderCart(); e.target.reset(); openCart(false);
    toast(`Rahmat! Buyurtma №${d.number} qabul qilindi. Tez orada qo'ng'iroq qilamiz.`);
  } catch (err) { toast(err.message); }
  btn.disabled = false; btn.textContent = 'Buyurtma berish';
});

load();
