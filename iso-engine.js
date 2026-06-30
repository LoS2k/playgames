/* ============================================================
   ISO ENGINE — isometric projection, tile floor, characters
   Grid coordinates (gx, gy) -> screen pixels via isometric math.
   ============================================================ */

const TILE_W = 64;
const TILE_H = 32;
const GRID_W = 8;
const GRID_H = 6;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let originX = 0;
let originY = 0;

function resizeCanvas() {
  const wrap = canvas.parentElement;
  const w = Math.min(wrap.clientWidth || 880, 880);
  const h = Math.round(w * 0.62);
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  originX = w / 2;
  originY = 90;
}
window.addEventListener('resize', resizeCanvas);

function gridToScreen(gx, gy) {
  return {
    x: originX + (gx - gy) * (TILE_W / 2),
    y: originY + (gx + gy) * (TILE_H / 2)
  };
}

function screenToGrid(sx, sy) {
  const x = sx - originX;
  const y = sy - originY;
  const gx = (x / (TILE_W / 2) + y / (TILE_H / 2)) / 2;
  const gy = (y / (TILE_H / 2) - x / (TILE_W / 2)) / 2;
  return { gx, gy };
}

/* ---------- FLOOR DRAWING ---------- */

function drawFloorTile(gx, gy, color1, color2) {
  const p = gridToScreen(gx, gy);
  const checker = (gx + gy) % 2 === 0;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + TILE_W / 2, p.y + TILE_H / 2);
  ctx.lineTo(p.x, p.y + TILE_H);
  ctx.lineTo(p.x - TILE_W / 2, p.y + TILE_H / 2);
  ctx.closePath();
  ctx.fillStyle = checker ? color1 : color2;
  ctx.fill();
  ctx.strokeStyle = 'rgba(74,46,31,0.06)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawFloor() {
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      drawFloorTile(gx, gy, '#F3D9AE', '#EECB9A');
    }
  }
}

function drawWalls() {
  const leftWallColor = '#D8A9D9';
  const rightWallColor = '#C893CA';
  const wallHeight = 70;

  const topLeft = gridToScreen(0, 0);
  const topRight = gridToScreen(GRID_W, 0);
  const bottomLeft = gridToScreen(0, GRID_H);

  ctx.fillStyle = leftWallColor;
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y - wallHeight);
  ctx.lineTo(bottomLeft.x, bottomLeft.y - wallHeight);
  ctx.lineTo(bottomLeft.x, bottomLeft.y);
  ctx.lineTo(topLeft.x, topLeft.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = rightWallColor;
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y - wallHeight);
  ctx.lineTo(topRight.x, topRight.y - wallHeight);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(topLeft.x, topLeft.y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(74,46,31,0.12)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    const fy = topLeft.y - (wallHeight / 3) * i;
    ctx.beginPath();
    ctx.moveTo(topLeft.x - 100, fy + 20);
    ctx.lineTo(topLeft.x + 100, fy + 20);
    ctx.stroke();
  }
}

/* ---------- SPRITE HELPERS (drawn with canvas primitives, no images) ---------- */

function drawShadow(sx, sy, scale = 1) {
  ctx.beginPath();
  ctx.ellipse(sx, sy, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(74,46,31,0.18)';
  ctx.fill();
}

function drawTable(gx, gy, tableObj) {
  const p = gridToScreen(gx, gy);
  const baseY = p.y + TILE_H / 2;

  drawShadow(p.x, baseY + 4, 1.1);

  ctx.fillStyle = '#A9714A';
  roundRectPath(p.x - 20, baseY - 28, 40, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#C8916A';
  roundRectPath(p.x - 22, baseY - 32, 44, 8, 4);
  ctx.fill();

  if (tableObj.state === 'waiting') {
    drawEmoji(tableObj.dish.emoji, p.x, baseY - 50, 22);
    drawBubbleTail(p.x, baseY - 38);
  } else if (tableObj.state === 'cooking') {
    drawProgressRing(p.x, baseY - 46, tableObj.progress);
  } else if (tableObj.state === 'ready') {
    drawEmoji('🍽️', p.x, baseY - 46, 24);
    drawSparkle(p.x + 16, baseY - 58);
  }
}

function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawEmoji(emoji, x, y, size) {
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}

function drawBubbleTail(x, y) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 22, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 8);
  ctx.lineTo(x + 4, y + 8);
  ctx.lineTo(x, y + 16);
  ctx.closePath();
  ctx.fill();
}

function drawProgressRing(x, y, pct) {
  const r = 14;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + (pct / 100) * Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#6C7FE0';
  ctx.fill();
  drawEmoji('⏳', x, y, 14);
}

let sparkleTime = 0;
function drawSparkle(x, y) {
  const s = 8 + Math.sin(sparkleTime * 0.1) * 2;
  ctx.fillStyle = '#FFC94A';
  ctx.font = `${s}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('✨', x, y);
}

/* ---------- CHARACTER (chibi style, drawn procedurally) ---------- */

function drawCharacter(sx, sy, facing, outfit, bobOffset) {
  const bob = bobOffset || 0;
  const y = sy + bob;

  drawShadow(sx, sy + 2, 0.9);

  ctx.save();
  ctx.translate(sx, y);

  ctx.fillStyle = outfit.body;
  roundRectPath(-11, -28, 22, 24, 8);
  ctx.fill();

  ctx.fillStyle = outfit.skin;
  ctx.beginPath();
  ctx.arc(0, -38, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = outfit.hair;
  ctx.beginPath();
  ctx.arc(0, -42, 11.5, Math.PI, Math.PI * 2);
  ctx.fill();
  if (outfit.hat) {
    ctx.fillStyle = outfit.hat;
    roundRectPath(-9, -52, 18, 7, 3);
    ctx.fill();
  }

  const eyeOffsetX = facing === 'left' ? -2 : facing === 'right' ? 2 : 0;
  ctx.fillStyle = '#3a2418';
  ctx.beginPath();
  ctx.arc(-4 + eyeOffsetX, -38, 1.6, 0, Math.PI * 2);
  ctx.arc(4 + eyeOffsetX, -38, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = outfit.skin;
  roundRectPath(-15, -26, 5, 14, 2);
  ctx.fill();
  roundRectPath(10, -26, 5, 14, 2);
  ctx.fill();

  ctx.fillStyle = outfit.pants;
  roundRectPath(-9, -6, 8, 10, 2);
  ctx.fill();
  roundRectPath(1, -6, 8, 10, 2);
  ctx.fill();

  ctx.restore();
}

const OUTFITS = {
  guest1: { body: '#FF8A65', skin: '#FFD7B5', hair: '#4A2E1F', pants: '#5C4033' },
  guest2: { body: '#6C7FE0', skin: '#F5C9A0', hair: '#2B1B12', pants: '#3E3E5C' },
  guest3: { body: '#4ECCA3', skin: '#FFE0C2', hair: '#7A4A2B', pants: '#2F4F4F' },
  guest4: { body: '#FFC94A', skin: '#FFD7B5', hair: '#1A1A1A', pants: '#444444' },
  waiter: { body: '#fff', skin: '#FFD7B5', hair: '#3A2418', pants: '#2B2B2B', hat: '#FF6B4A' },
};

/* ---------- DECOR OBJECTS ---------- */

function drawDecorItem(gx, gy, type) {
  const p = gridToScreen(gx, gy);
  const baseY = p.y + TILE_H / 2;
  drawShadow(p.x, baseY + 2, 0.7);

  const decorEmoji = {
    plant: '🪴', lamp: '💡', painting: '🖼️',
    aquarium: '🐠', fireplace: '🔥', chandelier: '✨'
  };
  drawEmoji(decorEmoji[type] || '🪑', p.x, baseY - 18, 26);
}
