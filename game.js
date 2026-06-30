/* ============================================================
   СМАКОЛИК — Restaurant Tycoon
   In-memory state with localStorage save/load.
   ============================================================ */

const SAVE_KEY = 'smakolyk_save_v1';

/* ---------- CONTENT DEFINITIONS ---------- */

const DISH_DEFS = [
  { id: 'borscht', name: 'Борщ', emoji: '🍲', unlockLevel: 1, cookTime: 3000, pay: [8, 14] },
  { id: 'salad', name: 'Салат', emoji: '🥗', unlockLevel: 1, cookTime: 2000, pay: [6, 10] },
  { id: 'burger', name: 'Бургер', emoji: '🍔', unlockLevel: 2, cookTime: 3500, pay: [10, 16], price: 60 },
  { id: 'pizza', name: 'Піца', emoji: '🍕', unlockLevel: 3, cookTime: 4000, pay: [12, 20], price: 120 },
  { id: 'sushi', name: 'Суші', emoji: '🍣', unlockLevel: 4, cookTime: 4500, pay: [16, 26], price: 200 },
  { id: 'cake', name: 'Тортик', emoji: '🍰', unlockLevel: 5, cookTime: 5000, pay: [20, 32], price: 300 },
  { id: 'ramen', name: 'Рамен', emoji: '🍜', unlockLevel: 6, cookTime: 4200, pay: [18, 28], price: 280 },
  { id: 'taco', name: 'Тако', emoji: '🌮', unlockLevel: 7, cookTime: 3200, pay: [14, 22], price: 220 },
];

const DECOR_DEFS = [
  { id: 'plant', name: 'Кімнатна рослина', emoji: '🪴', price: 40, tipBonus: 0.05, desc: '+5% до чайових' },
  { id: 'lamp', name: 'Тепла лампа', emoji: '💡', price: 70, tipBonus: 0.08, desc: '+8% до чайових' },
  { id: 'painting', name: 'Картина на стіну', emoji: '🖼️', price: 110, tipBonus: 0.10, desc: '+10% до чайових' },
  { id: 'aquarium', name: 'Акваріум', emoji: '🐠', price: 180, tipBonus: 0.14, desc: '+14% до чайових' },
  { id: 'fireplace', name: 'Камін', emoji: '🔥', price: 260, tipBonus: 0.18, desc: '+18% до чайових' },
  { id: 'chandelier', name: 'Розкішна люстра', emoji: '✨', price: 380, tipBonus: 0.24, desc: '+24% до чайових' },
];

const STAFF_DEFS = [
  { id: 'cook1', name: 'Кухар Іванко', emoji: '👨‍🍳', price: 90, speedBonus: 0.25, desc: '+25% швидкості готування' },
  { id: 'cook2', name: 'Шеф-кухарка Олена', emoji: '👩‍🍳', price: 220, speedBonus: 0.4, desc: '+40% швидкості готування' },
  { id: 'waiter1', name: 'Офіціант Тарас', emoji: '🤵', price: 90, capacityBonus: 1, desc: '+1 столик одночасно' },
  { id: 'waiter2', name: 'Офіціантка Марійка', emoji: '💁‍♀️', price: 220, capacityBonus: 2, desc: '+2 столики одночасно' },
];

const LEVEL_XP_REQ = (lvl) => 50 + (lvl - 1) * 35;

/* ---------- STATE ---------- */

let state = {
  restaurantName: 'Смаколик',
  money: 50,
  level: 1,
  xp: 0,
  served: 0,
  tableCount: 4,
  unlockedDishes: ['borscht', 'salad'],
  ownedDecor: [],
  ownedStaff: [],
};

let tables = [];

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
  return Math.min(base, 9);
}

function getAvailableDishes() {
  return DISH_DEFS.filter(d => state.unlockedDishes.includes(d.id));
}

/* ---------- SAVE / LOAD ---------- */

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save failed', e);
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const loaded = JSON.parse(raw);
      state = Object.assign(state, loaded);
    }
  } catch (e) {
    console.error('Load failed', e);
  }
}

/* ---------- TABLES SETUP ---------- */

function initTables() {
  const max = getMaxTables();
  while (tables.length < max) {
    tables.push({ state: 'empty', progress: 0, dish: null, payout: 0, locked: false });
  }
}

/* ---------- GAME ACTIONS ---------- */

function seatCustomer(i) {
  const t = tables[i];
  if (t.state !== 'empty') return;
  const available = getAvailableDishes();
  const dish = available[Math.floor(Math.random() * available.length)];
  t.state = 'waiting';
  t.dish = dish;
  t.progress = 0;
  render();
}

let cookIntervals = {};

function cookDish(i) {
  const t = tables[i];
  if (t.state !== 'waiting') return;
  t.state = 'cooking';
  t.progress = 0;
  render();

  const speed = getCookSpeedMultiplier();
  const totalTime = t.dish.cookTime / speed;
  const stepMs = 100;
  const stepPct = (stepMs / totalTime) * 100;

  cookIntervals[i] = setInterval(() => {
    t.progress += stepPct;
    if (t.progress >= 100) {
      t.progress = 100;
      t.state = 'ready';
      const [min, max] = t.dish.pay;
      const base = min + Math.random() * (max - min);
      t.payout = Math.round(base * getTipMultiplier());
      clearInterval(cookIntervals[i]);
      delete cookIntervals[i];
    }
    render();
  }, stepMs);
}

function serveDish(i) {
  const t = tables[i];
  if (t.state !== 'ready') return;

  state.money += t.payout;
  state.served += 1;
  addXp(Math.round(t.payout / 2));
  showMoneyToast(t.payout);

  tables[i] = { state: 'empty', progress: 0, dish: null, payout: 0, locked: false };
  saveGame();
  render();
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
  if (leveledUp) {
    onLevelUp();
  }
}

function onLevelUp() {
  const newlyUnlocked = DISH_DEFS.filter(d => d.unlockLevel === state.level && !d.price);
  newlyUnlocked.forEach(d => {
    if (!state.unlockedDishes.includes(d.id)) state.unlockedDishes.push(d.id);
  });
  initTables();
  showCelebration(`Рівень ${state.level}! Заклад росте — заглянь у меню та декор, можливо з'явилось щось нове.`);
  saveGame();
}

function buyDish(id) {
  const def = DISH_DEFS.find(d => d.id === id);
  if (!def || !def.price) return;
  if (state.unlockedDishes.includes(id)) return;
  if (state.money < def.price) return;
  state.money -= def.price;
  state.unlockedDishes.push(id);
  saveGame();
  render();
}

function buyDecor(id) {
  const def = DECOR_DEFS.find(d => d.id === id);
  if (!def) return;
  if (state.ownedDecor.includes(id)) return;
  if (state.money < def.price) return;
  state.money -= def.price;
  state.ownedDecor.push(id);
  saveGame();
  render();
}

function buyStaff(id) {
  const def = STAFF_DEFS.find(s => s.id === id);
  if (!def) return;
  if (state.ownedStaff.includes(id)) return;
  if (state.money < def.price) return;
  state.money -= def.price;
  state.ownedStaff.push(id);
  initTables();
  saveGame();
  render();
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

function closeCelebration() {
  document.getElementById('celebrationOverlay').classList.remove('show');
}

/* ---------- RENDERING ---------- */

function render() {
  document.getElementById('restaurantName').textContent = state.restaurantName;
  document.getElementById('moneyVal').textContent = Math.round(state.money);
  document.getElementById('levelVal').textContent = state.level;

  const req = LEVEL_XP_REQ(state.level);
  const pct = Math.min(100, (state.xp / req) * 100);
  document.getElementById('xpFill').style.width = pct + '%';

  renderRoom();
  renderMenu();
  renderShop();
  renderStaff();
}

function renderRoom() {
  const floor = document.getElementById('roomFloor');
  floor.innerHTML = '';

  tables.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'table-card ' + t.state;

    if (t.state === 'empty') {
      card.innerHTML = `
        <div class="table-emoji">🪑</div>
        <div class="table-label">Вільний столик</div>
        <div class="table-sub">Натисни, щоб посадити гостя</div>
      `;
      card.onclick = () => seatCustomer(i);
    } else if (t.state === 'waiting') {
      card.innerHTML = `
        <div class="table-emoji">${t.dish.emoji}</div>
        <div class="table-label">${t.dish.name}</div>
        <div class="table-sub">Натисни, щоб готувати</div>
      `;
      card.onclick = () => cookDish(i);
    } else if (t.state === 'cooking') {
      card.innerHTML = `
        <div class="table-emoji">⏳</div>
        <div class="table-label">${t.dish.name} готується</div>
        <div class="table-progress"><div class="table-progress-fill" style="width:${t.progress}%"></div></div>
      `;
    } else if (t.state === 'ready') {
      card.innerHTML = `
        <div class="table-emoji">🛎️</div>
        <div class="table-label">Готово до подачі!</div>
        <div class="table-payout">+${t.payout} 💰</div>
      `;
      card.onclick = () => serveDish(i);
    }

    floor.appendChild(card);
  });
}

function renderMenu() {
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = '';

  DISH_DEFS.forEach(def => {
    const unlocked = state.unlockedDishes.includes(def.id);
    const card = document.createElement('div');
    card.className = 'item-card';

    let footer;
    if (unlocked) {
      footer = `<span class="item-badge">У меню</span>`;
    } else if (!def.price) {
      footer = `<span class="item-price">Рівень ${def.unlockLevel}</span>`;
    } else {
      const canAfford = state.money >= def.price && state.level >= def.unlockLevel;
      footer = `
        <span class="item-price">${def.price} 💰</span>
        <button class="btn-buy" ${canAfford ? '' : 'disabled'} onclick="buyDish('${def.id}')">
          ${state.level < def.unlockLevel ? `Рівень ${def.unlockLevel}` : 'Купити'}
        </button>
      `;
    }

    card.innerHTML = `
      <div class="item-emoji">${def.emoji}</div>
      <div class="item-name">${def.name}</div>
      <div class="item-desc">Час готування: ${(def.cookTime / 1000).toFixed(1)}с · Дохід: ${def.pay[0]}–${def.pay[1]} 💰</div>
      <div class="item-footer">${footer}</div>
    `;
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
        ${owned
          ? `<span class="item-badge">Встановлено</span>`
          : `<span class="item-price">${def.price} 💰</span><button class="btn-buy" ${canAfford ? '' : 'disabled'} onclick="buyDecor('${def.id}')">Купити</button>`}
      </div>
    `;
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
        ${owned
          ? `<span class="item-badge">Найнято</span>`
          : `<span class="item-price">${def.price} 💰</span><button class="btn-buy" ${canAfford ? '' : 'disabled'} onclick="buyStaff('${def.id}')">Найняти</button>`}
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ---------- TABS ---------- */

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

document.getElementById('celebrationCloseBtn').addEventListener('click', closeCelebration);

/* ---------- INIT ---------- */

loadGame();
initTables();
render();
