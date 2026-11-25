import { HEIGHT, SHOT_ORIGIN, WIDTH, aimDirection } from './game.js';
import portraitUrl from './portrait.webp';

const THEMES = [
  { wall: '#293052', deep: '#121630', floor: '#1d203d', trim: '#596189', sky: '#161c42', moon: '#ffe2a3' },
  { wall: '#233a52', deep: '#111c32', floor: '#152d3d', trim: '#476c79', sky: '#142443', moon: '#bce9d7' },
  { wall: '#37304e', deep: '#1b162e', floor: '#251d39', trim: '#655a80', sky: '#262040', moon: '#ddd5fb' },
];

function box(ctx, x, y, width, height, color, radius = 0) {
  ctx.fillStyle = color;
  if (!radius) {
    ctx.fillRect(x, y, width, height);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.fill();
}

function ellipse(ctx, x, y, rx, ry, color, rotation = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fill();
}

function line(ctx, points, color, width = 1, fill = false) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  if (fill) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function paintRoom(ctx, theme) {
  const wall = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT * .7);
  wall.addColorStop(0, theme.wall);
  wall.addColorStop(1, theme.deep);
  box(ctx, 0, 0, WIDTH, HEIGHT, wall);
  box(ctx, 0, 453, WIDTH, 207, theme.floor);
  box(ctx, 0, 447, WIDTH, 4, '#090e23');
  box(ctx, 0, 450, WIDTH, 2, theme.trim);
  for (let i = 0; i < 6; i++) {
    line(ctx, [[65 + 60 * i, 455], [-95 + i * 112, 660]], '#a0a6d614');
  }
  for (let i = 0; i < 520; i++) {
    const x = (i * 103.71) % WIDTH;
    const y = (i * 237.33) % HEIGHT;
    box(ctx, x, y, i % 6 ? 1 : 2, 1, i % 4 ? '#c8cbff12' : '#080d2922');
  }

  // Open shutters, one pane of sky and the shadow cast across the bedroom.
  line(ctx, [[57, 201], [184, 201], [336, 472], [131, 472]], '#8a9dff0d', 1, true);
  box(ctx, 43, 61, 156, 154, '#111631', 10);
  box(ctx, 49, 67, 144, 142, theme.trim, 6);
  box(ctx, 55, 73, 132, 130, theme.sky, 3);
  const moonGlow = ctx.createRadialGradient(134, 119, 5, 134, 119, 47);
  moonGlow.addColorStop(0, '#d5daff57');
  moonGlow.addColorStop(1, '#9fb8ff00');
  ellipse(ctx, 134, 119, 46, 46, moonGlow);
  ellipse(ctx, 134, 119, 18, 18, theme.moon);
  ellipse(ctx, 141, 113, 16, 17, theme.sky);
  for (const [x, y] of [[69, 91], [91, 128], [164, 86], [175, 152], [109, 161], [94, 86]]) {
    ellipse(ctx, x, y, 1.4, 1.4, '#eaeaff9c');
  }
  line(ctx, [[55, 190], [74, 174], [94, 180], [112, 169], [127, 177], [146, 169], [167, 183], [187, 177], [187, 203], [55, 203]], '#1d2c52', 1, true);
  box(ctx, 56, 147, 130, 3, theme.trim);
  box(ctx, 118, 73, 3, 128, theme.trim);
  for (const [x, side] of [[20, 1], [196, -1]]) {
    box(ctx, x, 79, 25, 116, '#202441', 3);
    for (let y = 90; y < 194; y += 12) line(ctx, [[x + 6, y], [x + 18, y + side * 2]], theme.trim, 2);
  }
  box(ctx, 39, 205, 166, 8, '#697199', 3);
  box(ctx, 48, 213, 149, 4, '#11162e', 2);

  // Small wall clock and bedside lamp.
  ellipse(ctx, 333, 171, 26, 26, '#0e132a');
  ellipse(ctx, 333, 169, 22, 22, '#736d89');
  ellipse(ctx, 333, 169, 18, 18, '#373750');
  line(ctx, [[326, 174], [333, 169], [333, 157]], '#d4c5be', 2);
  ellipse(ctx, 333, 169, 2, 2, '#df9d6f');
  const lampGlow = ctx.createRadialGradient(348, 398, 3, 348, 398, 122);
  lampGlow.addColorStop(0, '#ffa96c35');
  lampGlow.addColorStop(1, '#ffa96c00');
  ellipse(ctx, 348, 398, 122, 122, lampGlow);
  box(ctx, 322, 434, 65, 7, '#35233a', 3);
  box(ctx, 330, 440, 4, 27, '#23192d', 2);
  box(ctx, 375, 440, 4, 27, '#23192d', 2);
  box(ctx, 349, 405, 4, 24, '#d18963', 2);
  ellipse(ctx, 351, 430, 14, 3, '#ce845e');
  line(ctx, [[328, 407], [338, 381], [363, 381], [374, 407]], '#edb181', 1, true);
  line(ctx, [[338, 383], [335, 405]], '#ffe6ad', 2);
  line(ctx, [[363, 383], [368, 405]], '#bc735f', 2);
  line(ctx, [[328, 407], [374, 407]], '#ffe0a3', 2);
}

function drawWeather(ctx, level, time) {
  if (level === 0) return;
  ctx.save();
  if (level === 2 || level === 3) {
    ctx.beginPath();
    ctx.rect(55, 73, 132, 130);
    ctx.clip();
    for (let i = 0; i < 21; i++) {
      const y = 62 + (i * 27.45 + time * (163 + i % 4 * 18)) % 153;
      const x = 56 + (i * 49.71) % 144;
      line(ctx, [[x, y], [x - 6, y + 16]], '#b7d7ff65', 1.25);
    }
  } else {
    ctx.translate(261, 41);
    box(ctx, -2, -41, 4, 42, '#11182c');
    ctx.rotate(time * 3.2);
    for (let i = 0; i < 3; i++) {
      ctx.rotate(2 * Math.PI / 3);
      ellipse(ctx, 20, 0, 28, 3.2, '#101a2f');
    }
    ellipse(ctx, 0, 0, 7, 6, '#151b32');
  }
  ctx.restore();
}

function drawCot(ctx, time, held, aim, faceMood, portrait) {
  const wood = '#87505d';
  const edge = '#d38773';
  ellipse(ctx, 215, 615, 178, 32, '#090b205c');
  line(ctx, [[55, 500], [96, 472], [111, 525], [55, 560]], '#58405d', 1, true);
  line(ctx, [[56, 511], [98, 484]], '#ad6970', 6);
  line(ctx, [[55, 527], [102, 500]], '#ad6970', 6);
  line(ctx, [[58, 490], [58, 583]], wood, 11);
  line(ctx, [[100, 466], [100, 536]], wood, 9);
  ellipse(ctx, 58, 489, 7, 6, edge);
  ellipse(ctx, 100, 466, 6, 5, edge);
  line(ctx, [[59, 557], [307, 613], [366, 564], [366, 587], [306, 636], [59, 583]], '#7d475a', 1, true);
  line(ctx, [[60, 576], [306, 628], [364, 583]], '#bc6b68', 3);
  for (const [x, y] of [[62, 581], [305, 631], [364, 587]]) line(ctx, [[x, y - 5], [x, y + 15]], wood, 9);
  line(ctx, [[60, 540], [112, 502], [366, 548], [307, 595]], '#c7a2a8', 1, true);
  line(ctx, [[60, 540], [307, 595], [366, 548], [366, 566], [307, 613], [60, 558]], '#946e89', 1, true);
  line(ctx, [[62, 545], [307, 599], [362, 555]], '#e0b5b0', 2);

  ctx.save();
  ctx.translate(123, 533);
  ctx.rotate(.2);
  box(ctx, -36, -18, 70, 29, '#e2bd9f', 13);
  line(ctx, [[-26, 7], [23, 7]], '#ba8c8b', 2);
  ctx.restore();
  line(ctx, [[156, 538], [235, 556], [276, 565]], '#22182c', 9);
  line(ctx, [[239, 558], [292, 575], [310, 570]], '#22182c', 5);
  line(ctx, [[236, 563], [285, 586], [302, 585]], '#22182c', 5);
  line(ctx, [[312, 568], [312, 573]], '#c69184', 7);
  line(ctx, [[302, 584], [301, 588]], '#c69184', 7);
  line(ctx, [[231, 558], [271, 535], [350, 550], [310, 585], [282, 600], [227, 584]], '#47787e', 1, true);
  line(ctx, [[227, 584], [282, 600], [310, 585], [310, 606], [282, 617], [227, 601]], '#345064', 1, true);
  line(ctx, [[232, 575], [291, 591], [317, 575]], '#b9b78d', 2.4);
  line(ctx, [[234, 570], [296, 585], [322, 570]], '#8da69a', 1.3);
  for (let i = 0; i < 8; i++) {
    const x = 232 + i * 6.5;
    const y = 601 + i * 1.9;
    line(ctx, [[x, y], [x, y + 5]], '#77969e', 1.4);
  }

  const direction = aim ? aimDirection(aim) : { x: .14, y: -.99 };
  const charging = held && !held.ready && !held.past;
  const stroke = charging ? Math.sin(time * 24) * 7 : held ? 0 : Math.sin(time * 2.8) * 1.4;
  const point = (distance, side = 0) => [
    SHOT_ORIGIN.x - direction.x * distance - direction.y * side,
    SHOT_ORIGIN.y - direction.y * distance + direction.x * side,
  ];
  const tip = point(0);
  const base = point(28);
  const grip = point(13 + stroke);
  line(ctx, [[161, 536], [191, 559], base], '#241d31', 5);
  line(ctx, [[165, 534], [194, 551 - stroke * .32], grip], '#241d31', 5);
  line(ctx, [base, tip], '#88798c', 6.5);
  line(ctx, [base, tip], '#16111c', 4.7);
  ellipse(ctx, ...base, 5, 3.7, '#ce8d77', -.3);
  ellipse(ctx, ...grip, 5.3, 3.8, '#edb393', -.3);
  if (charging) {
    line(ctx, [point(7, 9), point(19, 9)], '#ffe1af75', 1.3);
    line(ctx, [point(12, 13), point(19, 13)], '#ffe1af44', 1);
  }
  if (held) {
    const glow = held.ready ? 13 : 6;
    const core = held.ready ? 5 : 2.5;
    ellipse(ctx, ...tip, glow, glow, held.ready ? '#ffd87950' : '#bfb4ff36');
    ellipse(ctx, ...tip, core, core, held.ready ? '#ffe3a3' : '#deccfb');
  }
  if (portrait.complete && portrait.naturalWidth) drawPortrait(ctx, portrait, time, held, faceMood);
  else drawFace(ctx, time, Boolean(held), faceMood);
}

function drawPortrait(ctx, portrait, time, held, mood) {
  ctx.save();
  ctx.translate(131, mood === 'bite' ? 513 : 519);
  ctx.rotate(mood === 'bite' ? -.26 : .19 + (held ? Math.sin(time * 24) * .025 : 0));
  ellipse(ctx, 0, 7, 32, 31, '#20182c60');
  ctx.beginPath();
  ctx.moveTo(-29, 9);
  ctx.bezierCurveTo(-32, 0, -33, -9, -29, -17);
  ctx.bezierCurveTo(-26, -27, -20, -32, -7, -35);
  ctx.bezierCurveTo(6, -38, 21, -33, 26, -25);
  ctx.bezierCurveTo(34, -16, 32, -2, 27, 13);
  ctx.bezierCurveTo(25, 23, 18, 28, 12, 31);
  ctx.bezierCurveTo(4, 36, -5, 36, -12, 31);
  ctx.bezierCurveTo(-23, 27, -28, 21, -29, 9);
  ctx.closePath();
  ctx.strokeStyle = '#231a2c';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.clip();
  ctx.drawImage(portrait, -33, -37, 66, 73);
  ctx.restore();
}

function drawFace(ctx, time, charging, mood) {
  const up = mood === 'bite' ? -5 : 0;
  ctx.save();
  ctx.translate(132, 521 + up);
  ctx.rotate(mood === 'bite' ? -.12 : .21);
  ellipse(ctx, -2, 4, 30, 24, '#33223b');
  ellipse(ctx, -26, 2, 7, 9, '#c68272');
  ellipse(ctx, 24, 0, 6, 7, '#c68272');
  ellipse(ctx, 1, 2, 24, 23, '#cb8975');
  ellipse(ctx, 2, -1, 23, 21, '#eaab89');
  ellipse(ctx, -10, -14, 18, 10, '#292139', -.23);
  ellipse(ctx, -19, -7, 5, 12, '#292139', -.4);
  ellipse(ctx, 20, -10, 4.5, 9, '#292139', -.3);
  line(ctx, [[-20, -14], [-10, -20], [0, -20]], '#9d7b89', 1.4);
  line(ctx, [[-17, -6], [-12, -9], [-6, -8]], '#5b3944', 2.4);
  line(ctx, [[5, -8], [11, -10], [17, -7]], '#5b3944', 2.4);
  const eyesClosed = charging || (mood !== 'bite' && time % 4.7 > 4.5);
  for (const x of [-11, 11]) {
    if (eyesClosed) {
      line(ctx, [[x - 4, -2], [x, -3], [x + 3, 0]], '#372638', 1.9);
    } else {
      ellipse(ctx, x, -1, 4.3, mood === 'bite' ? 5 : 3.5, '#fff1ce');
      ellipse(ctx, x + 1, -1, 1.9, 2.4, '#2f2540');
    }
  }
  ellipse(ctx, 1, 3, 4.8, 4, '#d98a76', -.4);
  ellipse(ctx, -5, 9, 7, 2.6, '#513344', -.23);
  ellipse(ctx, 7, 9, 7, 2.6, '#513344', .23);
  if (mood) {
    ellipse(ctx, 1, 15, mood === 'bite' ? 5 : 7, 4, '#683e4e');
    if (mood !== 'bite') line(ctx, [[-3, 13], [5, 13]], '#fff0d5', 2);
  } else {
    line(ctx, [[-3, 15], [1, 16], [6, 14]], '#99565e', 1.5);
  }
  ctx.restore();
}

export function drawMosquito(ctx, bug, time) {
  const flap = Math.sin(time * 64 + (bug.id || 0));
  const dart = bug.flight === 'dart';
  ctx.save();
  ctx.translate(bug.x, bug.y);
  if (bug.supply) {
    ellipse(ctx, 0, -4, 26, 25, '#ffda5c21');
    ellipse(ctx, 16, -19, 8, 8, '#ffe2a0');
    line(ctx, [[12, -19], [20, -19]], '#523446', 1.5);
    line(ctx, [[16, -23], [16, -15]], '#523446', 1.5);
  }
  if (bug.warning) {
    const radius = 23 + Math.sin(time * 21) * 3;
    ctx.strokeStyle = '#ff9b70b0';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    line(ctx, [[0, -35], [0, -29]], '#ffab7d', 2);
    ellipse(ctx, 0, -26, 1.2, 1.2, '#ffab7d');
  }
  ctx.scale(bug.facing || 1, 1);
  ctx.rotate(-.16);
  ellipse(ctx, -4, -6, 21, 13, '#0c122846', -.3);
  const wingColor = bug.supply ? '#ffd889dc' : dart ? '#9beeeeb8' : '#b8d9ecb8';
  ellipse(ctx, -10, -5, 13, 3.8, bug.supply ? '#d4bb6c9e' : '#a9baf798', -.61 + flap * .62);
  ellipse(ctx, -5, -14, 13, 4.4, wingColor, .52 + flap * .5);
  ellipse(ctx, 2, -13, 11, 3.5, bug.supply ? '#fff0acc2' : '#e1eff5c2', .86 - flap * .48);
  line(ctx, [[1, 3], [-6, 10], [-14, 11]], '#d39b9d', 1.35);
  line(ctx, [[3, 4], [1, 12], [-6, 16]], '#d39b9d', 1.35);
  line(ctx, [[7, 4], [9, 11], [6, 14]], '#d39b9d', 1.35);
  ellipse(ctx, -8, 1, dart ? 12 : 10, 5.1, bug.supply ? '#d99350' : dart ? '#5bc4c7' : '#dc696e', -.23);
  line(ctx, [[-10, -3], [-8, 2]], '#ff9f89', 1.7);
  line(ctx, [[-14, -1], [-12, 3]], '#ff9f89', 1.4);
  ellipse(ctx, 2, 0, 7, 5.8, '#7f657d');
  ellipse(ctx, 8, -1, 6.4, 6, '#211c3b');
  ellipse(ctx, 10, -3, 4.1, 4.1, '#ffe2aa');
  ellipse(ctx, 12, -3, 1.7, 2.2, '#352438');
  line(ctx, [[12, 1], [20, 4]], '#ffc7a7', 1.4);
  line(ctx, [[7, -4], [7, -10], [11, -14]], '#e2a0ae', 1.1);
  ctx.restore();
}

function drawAim(ctx, target, charge) {
  const { x, y } = aimDirection(target);
  const start = SHOT_ORIGIN;
  const distance = Math.hypot(target.x - start.x, target.y - start.y);
  const marker = { x: start.x + distance * x, y: start.y + distance * y };
  const color = charge?.ready ? '#ffdb86' : '#d5caffb0';
  ctx.setLineDash([5, 8]);
  line(ctx, [[start.x + x * 8, start.y + y * 8], [start.x + x * 650, start.y + y * 650]], color, charge?.ready ? 2.2 : 1.5);
  ctx.setLineDash([]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, charge?.ready ? 16 : 10, 0, Math.PI * 2);
  ctx.stroke();
  ellipse(ctx, marker.x, marker.y, 2, 2, color);
}

function drawEffects(ctx, visualTime, effects) {
  for (const effect of effects) {
    const age = visualTime - effect.born;
    const progress = Math.min(1, age / effect.duration);
    ctx.save();
    ctx.globalAlpha = 1 - progress ** 1.8;
    if (effect.type === 'spark') {
      const reach = Math.min(effect.reach, 110 + age * 2700);
      const tail = Math.max(0, reach - (effect.perfect ? 170 : 112));
      const { x, y } = effect.direction;
      const start = [SHOT_ORIGIN.x + x * tail, SHOT_ORIGIN.y + y * tail];
      const end = [SHOT_ORIGIN.x + x * reach, SHOT_ORIGIN.y + y * reach];
      line(ctx, [start, end], effect.perfect ? '#ffc56a80' : '#b5a6fc70', effect.perfect ? 14 : 8);
      line(ctx, [start, end], effect.perfect ? '#ffe1a0' : '#d9cdfd', effect.perfect ? 4 : 2);
    } else {
      const { x, y, color } = effect;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * (1 - progress) + .5;
      ctx.beginPath();
      ctx.arc(x, y, 9 + Math.sqrt(progress) * 33, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const angle = i * Math.PI * 2 / 7;
        const distance = 11 + progress * (20 + i % 3 * 7);
        ellipse(ctx, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 2.9 - progress * 1.8, 1.9, color, angle);
      }
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.fillText(effect.label, x, y - 16 - progress * 31);
    }
    ctx.restore();
  }
}

export function createRoomPainter(onPortraitReady) {
  const portrait = new Image();
  portrait.addEventListener('load', onPortraitReady, { once: true });
  portrait.src = portraitUrl;
  const room = document.createElement('canvas');
  room.width = WIDTH * 2;
  room.height = HEIGHT * 2;
  const background = room.getContext('2d');
  background.scale(2, 2);
  let lastTheme;
  return (ctx, { level = 0, time = 0, bugs = [], target, charge, effects = [], mood, keyboardAim = false }) => {
    const theme = THEMES[Math.min(level, THEMES.length - 1)];
    if (theme !== lastTheme) {
      paintRoom(background, theme);
      lastTheme = theme;
    }
    ctx.drawImage(room, 0, 0, WIDTH, HEIGHT);
    drawWeather(ctx, level, time);
    if (target && (charge || keyboardAim)) drawAim(ctx, target, charge);
    drawCot(ctx, time, charge, charge || keyboardAim || mood === 'shot' ? target : null, mood, portrait);
    for (const bug of bugs) drawMosquito(ctx, bug, time);
    drawEffects(ctx, time, effects);
  };
}

export function drawRoomPreview(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const painter = createRoomPainter(draw);
  draw();

  function draw() {
    const scale = canvas.width / WIDTH;
    ctx.setTransform(scale, 0, 0, scale, 0, -360 * scale);
    painter(ctx, {
      level: 2, time: .61, target: { x: 263, y: 437 }, charge: { ready: true },
      bugs: [{ id: 1, x: 263, y: 437, facing: -1 }, { id: 2, x: 168, y: 403, facing: 1 }],
    });
  }
}
