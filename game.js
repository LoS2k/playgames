/* ============================================================
   СМАКОЛИК — Isometric Restaurant Tycoon
   ============================================================ */

const SAVE_KEY = 'smakolyk_iso_save_v1';

/* ---------- CONTENT DEFINITIONS ---------- */

const DISH_DEFS = [
  { id: 'borscht', name: 'Борщ', emoji: '🍲', unlockLevel: 1, cookTime: 3000, pay: [8, 14] },
  { id: 'salad', name: 'Салат', emoji: '🥗', unlockLevel: 1, cookTime: 2000, pay: [6, 10] },
  { id: 'burger', name: 'Бургер', emoji: '🍔', unlockLevel: 2, cookTime: 3500, pay: [10, 16], price: 60 },
  { id: 'pizza', name: 'Піца', emoji: '🍕', unlockLevel: 3, cookTime: 4000, pay: [12, 20], price: 120 },
  { id: 'sushi', name: 'Суші', emoji: '🍣', unlockLevel: 4, cookTime: 4500, pay: [16, 26], price: 200 },
  { id: 'cake', name: 'Тортик', emoji: '🍰', unlockLevel: 5, cookTime: 5000, pay: [20, 32], price: 300 },
];

const DECOR_DEFS = [
  { id: 'plant', name: 'Кімнатна рослина', emoji: '🪴', price: 40, tipBonus: 0.05, desc: '+5% до чайових' },
  { id: 'lamp', name: 'Тепла лампа', emoji: '💡', price: 70, tipBonus: 0.08, desc: '+8% до чайових' },
  { id: 'painting', name: 'Картина на стіну', emoji: '🖼️', price: 110, tipBonus: 0.10, desc: '+10% до чайових' },
  { id: 'aquarium', name: 'Акваріум', emoji: '🐠', price: 180, tipBonus: 0.14, desc: '+14% до чайових' },
];

const STAFF_DEFS = [
  { id: 'cook1', name: 'Кухар Іванко', emoji: '👨‍🍳', price: 90, speedBonus: 0.25, desc: '+25% швидкості готування' },
  { id: 'cook2', name: 'Шеф-кухарка Олена', emoji: '👩‍🍳', price: 220, speedBonus: 0.4, desc: '+40% швидкості готування' },
  { id: 'waiter1', name: 'Офіціант Тарас', emoji: '🤵', price: 90, capacityBonus: 1, desc: '+1 столик одночасно' },
];

const LEVEL_XP_REQ = (lvl) => 50 + (lvl - 1) * 35;

const TABLE_POSITIONS = [
  { gx: 2, gy: 1 }, { gx: 5, gy: 1 },
  { gx: 2, gy: 3 }, { gx: 5, gy: 3 },
  { gx: 2, gy: 5 }, { gx: 5, gy: 5 },
];
const KITCHEN_POS = { gx: 0.5, gy: 0 };
const ENTRANCE_POS = { gx: 7.5, gy: 5.5 };
const DECOR_SLOT_POSITIONS = [
  { gx: 0, gy: 5 }, { gx: 7, gy: 0 }, { gx: 0, gy: 2 }, { gx: 7, gy: 3 }
];

/* ---------- STATE ---------- */

let state = {
  restaurantName: 'Смаколик',
  money: 50,
  level: 1,
  xp: 0,
  served: 0,
  tableCount: 3,
  unlockedDishes: ['borscht', 'salad'],
  ownedDecor: [],
  ownedStaff: [],
};

let tables = [];
let characters = [];
let charIdCounter = 0;

/* ---------- DERIVED VALUES ---------- */

function getCookSpeedMultiplier() {
  let mult = 1;
  state.ownedStaff.forEach(id => {
    const def = STAFF_DEFS.find(s => s.id === id);
    if (def && def.speedBonus) mult += def.speedBonus;
  });
  return mult;
}

function getTipMultiplier() {
  let mult = 1;
  state.ownedDecor.forEach(id => {
    const def = DECOR_DEFS.find(d => d.id === id);
    if (def && def.tipBonus) mult += def.tipBonus;
  });
  return mult;
}

function getMaxTables() {
  let base = state.tableCount;
  state.ownedStaff.forEach(id => {
    const def = STAFF_DEFS.find(s => s.id === id);
    if (def && def.capacityBonus) base += def.capacityBonus;
  });
  return Math.min(base, TABLE_POSITIONS.length);
}

function getAvailableDishes() {
  return DISH_DEFS.filter(d => state.unlockedDishes.includes(d.id));
}

/* ---------- SAVE / LOAD ---------- */

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  catch (e) { console.error('Save failed', e); }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) state = Object.assign(state, JSON.parse(raw));
  } catch (e) { console.error('Load failed', e); }
}

/* ---------- TABLES SETUP ---------- */

function initTables() {
  const max = getMaxTables();
  tables = TABLE_POSITIONS.slice(0, max).map((pos, i) => ({
    id: i, gx: pos.gx, gy: pos.gy,
    state: 'empty', progress: 0, dish: null, payout: 0,
    guestCharId: null
  }));
}

/* ---------- CHARACTER SYSTEM ---------- */

function spawnGuestIfPossible() {
  const emptyTable = tables.find(t => t.state === 'empty' && !characters.some(c => c.targetTableId === t.id));
  if (!emptyTable) return;
  if (characters.filter(c => c.type === 'guest').length >= 2) return;

  const outfits = ['guest1', 'guest2', 'guest3', 'guest4'];
  const outfit = outfits[Math.floor(Math.random() * outfits.length)];

  const ch = {
    id: charIdCounter++,
    type: 'guest',
    outfit,
    gx: ENTRANCE_POS.gx, gy: ENTRANCE_POS.gy,
    targetGx: emptyTable.gx, targetGy: emptyTable.gy,
    targetTableId: emptyTable.id,
    state: 'walking_in',
    facing: 'left',
    speed: 0.03,
  };
  characters.push(ch);
}

function updateCharacters(dt) {
  characters.forEach(ch => {
    if (ch.state === 'walking_in' || ch.state === 'leaving') {
      const dx = ch.targetGx - ch.gx;
      const dy = ch.targetGy - ch.gy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.08) {
        ch.gx = ch.targetGx;
        ch.gy = ch.targetGy;
        if (ch.state === 'walking_in') {
          arrivedAtTable(ch);
        } else {
          characters = characters.filter(c => c.id !== ch.id);
        }
      } else {
        const moveAmt = ch.speed * dt;
        ch.gx += (dx / dist) * moveAmt;
        ch.gy += (dy / dist) * moveAmt;
        ch.facing = dx < -0.01 ? 'left' : dx > 0.01 ? 'right' : ch.facing;
      }
    }
  });
}

function arrivedAtTable(ch) {
  const table = tables.find(t => t.id === ch.targetTableId);
  if (!table) return;
  const available = getAvailableDishes();
  const dish = available[Math.floor(Math.random() * available.length)];
  table.state = 'waiting';
  table.dish = dish;
  table.progress = 0;
  table.guestCharId = ch.id;
  ch.state = 'seated';
}

function sendGuestAway(table) {
  const ch = characters.find(c => c.id === table.guestCharId);
  if (ch) {
    ch.state = 'leaving';
    ch.targetGx = ENTRANCE_POS.gx;
    ch.targetGy = ENTRANCE_POS.gy;
  }
  table.guestCharId = null;
}

/* ---------- GAME ACTIONS ---------- */

let cookIntervals = {};

function onTableClick(table) {
  if (table.state === 'waiting') {
    startCooking(table);
  } else if (table.state === 'ready') {
    serveTable(table);
  }
}

function startCooking(table) {
  table.state = 'cooking';
  table.progress = 0;

  const speed = getCookSpeedMultiplier();
  const totalTime = table.dish.cookTime / speed;
  const stepMs = 100;
  const stepPct = (stepMs / totalTime) * 100;

  cookIntervals[table.id] = setInterval(() => {
    table.progress += stepPct;
    if (table.progress >= 100) {
      table.progress = 100;
      table.state = 'ready';
      const [min, max] = table.dish.pay;
      const base = min + Math.random() * (max - min);
      table.payout = Math.round(base * getTipMultiplier());
      clearInterval(cookIntervals[table.id]);
      delete cookIntervals[table.id];
    }
  }, stepMs);
}

function serveTable(table) {
  state.money += table.payout;
  state.served += 1;
  addXp(Math.round(table.payout / 2));
  showMoneyToast(table.payout);
  sendGuestAway(table);

  table.state = 'empty';
  table.progress = 0;
  table.dish = null;
  table.payout = 0;

  saveGame();
  renderUI();
}

function addXp(amount) {
  state.xp += amount;
  let req = LEVEL_XP_REQ(state.level);
  let leveledUp = false;
  while (state.xp >= req) {
    state.xp -= req;
    state.level += 1;
    leveledUp = true;
    req = LEVEL_XP_REQ(state.level);
  }
  if (leveledUp) onLevelUp();
}

function onLevelUp() {
  const newlyUnlocked = DISH_DEFS.filter(d => d.unlockLevel === state.level && !d.price);
  newlyUnlocked.forEach(d => {
    if (!state.unlockedDishes.includes(d.id)) state.unlockedDishes.push(d.id);
  });
  showCelebration(`Рівень ${state.level}! Заглянь у меню та декор — можливо з'явилось щось нове.`);
  saveGame();
}

function buyDish(id) {
  const def = DISH_DEFS.find(d => d.id === id);
  if (!def || !def.price || state.unlockedDishes.includes(id) || state.money < def.price) return;
  state.money -= def.price;
  state.unlockedDishes.push(id);
  saveGame();
  renderUI();
}

function buyDecor(id) {
  const def = DECOR_DEFS.find(d => d.id === id);
  if (!def || state.ownedDecor.includes(id) || state.money < def.price) return;
  state.money -= def.price;
  state.ownedDecor.push(id);
  saveGame();
  renderUI();
}

function buyStaff(id) {
  const def = STAFF_DEFS.find(s => s.id === id);
  if (!def || state.ownedStaff.includes(id) || state.money < def.price) return;
  state.money -= def.price;
  state.ownedStaff.push(id);
  initTables();
  saveGame();
  renderUI();
}

/* ---------- UI: TOASTS AND CELEBRATIONS ---------- */

function showMoneyToast(amount) {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'money-toast';
  el.textContent = `+${amount} 💰`;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

function showCelebration(text) {
  document.getElementById('celebrationText').textContent = text;
  document.getElementById('celebrationOverlay').classList.add('show');
}

/* ---------- UI RENDERING (stat bar + menu/shop/staff tabs) ---------- */

function renderUI() {
  document.getElementById('moneyVal').textContent = Math.round(state.money);
  document.getElementById('levelVal').textContent = state.level;
  const req = LEVEL_XP_REQ(state.level);
  document.getElementById('xpFill').style.width = Math.min(100, (state.xp / req) * 100) + '%';

  renderMenu();
  renderShop();
  renderStaff();
}

function renderMenu() {
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = '';
  DISH_DEFS.forEach(def => {
    const unlocked = state.unlockedDishes.includes(def.id);
    let footer;
    if (unlocked) {
      footer = `<span class="item-badge">У меню</span>`;
    } else if (!def.price) {
      footer = `<span class="item-price">Рівень ${def.unlockLevel}</span>`;
    } else {
      const canAfford = state.money >= def.price && state.level >= def.unlockLevel;
      footer = `<span class="item-price">${def.price} 💰</span>
        <button class="btn-buy" ${canAfford ? '' : 'disabled'} onclick="buyDish('${def.id}')">
          ${state.level < def.unlockLevel ? `Рівень ${def.unlockLevel}` : 'Купити'}
        </button>`;
    }
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-emoji">${def.emoji}</div>
      <div class="item-name">${def.name}</div>
      <div class="item-desc">Час: ${(def.cookTime / 1000).toFixed(1)}с · Дохід: ${def.pay[0]}–${def.pay[1]} 💰</div>
      <div class="item-footer">${footer}</div>`;
    grid.appendChild(card);
  });
}

function renderShop() {
  const grid = document.getElementById('shopGrid');
  grid.innerHTML = '';
  DECOR_DEFS.forEach(def => {
    const owned = state.ownedDecor.includes(def.id);
    const canAfford = state.money >= def.price;
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-emoji">${def.emoji}</div>
      <div class="item-name">${def.name}</div>
      <div class="item-desc">${def.desc}</div>
      <div class="item-footer">
        ${owned ? `<span class="item-badge">Встановлено</span>`
          : `<span class="item-price">${def.price} 💰</span><button class="btn-buy" ${canAfford ? '' : 'disabled'} onclick="buyDecor('${def.id}')">Купити</button>`}
      </div>`;
    grid.appendChild(card);
  });
}

function renderStaff() {
  const grid = document.getElementById('staffGrid');
  grid.innerHTML = '';
  STAFF_DEFS.forEach(def => {
    const owned = state.ownedStaff.includes(def.id);
    const canAfford = state.money >= def.price;
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-emoji">${def.emoji}</div>
      <div class="item-name">${def.name}</div>
      <div class="item-desc">${def.desc}</div>
      <div class="item-footer">
        ${owned ? `<span class="item-badge">Найнято</span>`
          : `<span class="item-price">${def.price} 💰</span><button class="btn-buy" ${canAfford ? '' : 'disabled'} onclick="buyStaff('${def.id}')">Найняти</button>`}
      </div>`;
    grid.appendChild(card);
  });
}

/* ---------- CANVAS RENDER LOOP ---------- */

let lastTime = performance.now();

function gameLoop(now) {
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;
  sparkleTime += dt;

  updateCharacters(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWalls();
  drawFloor();

  state.ownedDecor.forEach((id, i) => {
    const pos = DECOR_SLOT_POSITIONS[i];
    if (pos) drawDecorItem(pos.gx, pos.gy, id);
  });

  const drawables = [];

  tables.forEach(t => {
    drawables.push({ depth: t.gx + t.gy, draw: () => drawTable(t.gx, t.gy, t) });
  });

  characters.forEach(ch => {
    const bob = ch.state === 'walking_in' || ch.state === 'leaving'
      ? Math.sin(now * 0.012) * 2 : 0;
    const screenPos = gridToScreen(ch.gx, ch.gy);
    drawables.push({
      depth: ch.gx + ch.gy + 0.1,
      draw: () => drawCharacter(screenPos.x, screenPos.y + TILE_H / 2, ch.facing, OUTFITS[ch.outfit], bob)
    });
  });

  drawables.sort((a, b) => a.depth - b.depth);
  drawables.forEach(d => d.draw());

  requestAnimationFrame(gameLoop);
}

/* ---------- CLICK HANDLING ---------- */

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const sy = (e.clientY - rect.top) * (canvas.height / rect.height);

  let closest = null;
  let closestDist = 28;

  tables.forEach(t => {
    const p = gridToScreen(t.gx, t.gy);
    const tx = p.x;
    const ty = p.y + TILE_H / 2 - 40;
    const dist = Math.hypot(sx - tx, sy - ty);
    if (dist < closestDist) { closestDist = dist; closest = t; }
  });

  if (closest) onTableClick(closest);
});

/* ---------- GUEST SPAWN TIMER ---------- */

setInterval(() => {
  spawnGuestIfPossible();
}, 2500);

/* ---------- TABS ---------- */

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

document.getElementById('celebrationCloseBtn').addEventListener('click', () => {
  document.getElementById('celebrationOverlay').classList.remove('show');
});

/* ---------- INIT ---------- */

loadGame();
initTables();
resizeCanvas();
renderUI();
requestAnimationFrame(gameLoop);

setTimeout(spawnGuestIfPossible, 800);
