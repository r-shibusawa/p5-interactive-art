// ============================================
// 07 フィロタキシス（葉序）─ ひまわりの種の並び
// i 番目の種を「角度 i·θ、半径 c√i」に置く。θ = 360° × φ（の小数部分）= 360°/φ が黄金角
//   黄金比なら 222.5°（逆回りに見ると 137.5°）。有理数の角度だとスポーク（放射状のすき間）が出る
// ←→ = 角度のプリセット / ↑↓ = 0.05° ずつ微調整 / C = らせんの腕を色分け（本数を切りかえ）/ スペース = 成長をやり直す
// ============================================

let N = 1400;            // ★ 種の数
let c = 0;               // 種の間隔（画面に合わせて決める）
let grown = 0;           // いま何個まで育ったか
let preset = 0;
let theta;               // 角度（度）
let armIdx = -1;         // 色分けに使う分母の番号（-1 = しない）
let presets = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  presets = [
    { name: '黄金角（n=1）', deg: 360 / metallic(1) },
    { name: '白銀角（n=2）', deg: 360 / metallic(2) },
    { name: '青銅角（n=3）', deg: 360 / metallic(3) },
    { name: '有理数 2/5 回転', deg: 144 },
    { name: '有理数 3/8 回転', deg: 135 },
    { name: '有理数 1/3 回転', deg: 120 },
    { name: '黄金角に近い 137.0°', deg: 137.0 },
    { name: 'もっと近い 137.5°', deg: 137.5 },
  ];
  theta = presets[0].deg;
}

function draw() {
  background(100, 25, 10);
  grown = min(N, grown + 12);
  c = min(width * 0.7, height - 110) * 0.45 / sqrt(N);
  let cx = width * 0.38, cy = (height + 90) / 2;
  let dens = convergentDens(theta / 360);
  let q = armIdx >= 0 && dens.length ? dens[armIdx % dens.length] : 0;

  noStroke();
  let th = radians(theta);
  for (let i = 1; i <= grown; i++) {
    let a = i * th, r = c * sqrt(i);
    let x = cx + r * cos(a), y = cy + r * sin(a);
    if (q > 0) fill((i % q) * 360 / q, 70, 95);
    else fill(40 + 20 * sin(i * 0.002), 80 - 40 * i / N, 100 - 30 * i / N);
    circle(x, y, c * 1.25);
  }

  // 文字
  fill(0, 0, 100);
  textSize(18);
  text('θ = ' + nf(theta, 1, 3) + '°（←→ プリセット ↑↓ 微調整）　' + presets[preset].name + '　C：腕の色分け ' + (q ? q + ' 本' : 'off') + '　スペース：やり直す', 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text('有理数の角度（p/q 回転）では q 本のスポークになり、すき間ができる。いちばん「無理」な黄金角はすき間なく詰まる', 20, 68);

  // 右：θ/360 の連分数と、見えるらせんの本数
  let px = width * 0.72, py = 130;
  let cf = contFrac(theta / 360, 10);
  fill(0, 0, 100);
  textSize(16);
  text('θ / 360° = ' + nf(theta / 360, 1, 6), px, py);
  text('連分数 [' + cf.join(', ') + ']', px, py + 26);
  textSize(14);
  fill(0, 0, 80);
  text('近似分数の分母 = らせんの腕の本数', px, py + 60);
  for (let j = 0; j < dens.length; j++) {
    fill(dens[j] === q ? color(50, 90, 100) : color(0, 0, 75));
    text(dens[j] + ' 本', px + (j % 4) * 70, py + 86 + floor(j / 4) * 22);
  }
  fill(0, 0, 70);
  textSize(13);
  let yy = py + 160;
  text('黄金角：1, 2, 3, 5, 8, 13, 21, 34, 55 …', px, yy);
  text('　→ フィボナッチ数！（ひまわりは 34 と 55 など）', px, yy + 20);
  text('白銀角：1, 2, 5, 12, 29 …（ペル数）', px, yy + 44);
  text('C を何度も押して、色が「まっすぐな腕」に', px, yy + 72);
  text('そろう本数を探そう', px, yy + 92);
}

function keyPressed() {
  if (key === RIGHT_ARROW) { preset = (preset + 1) % presets.length; theta = presets[preset].deg; grown = 0; }
  if (key === LEFT_ARROW) { preset = (preset + presets.length - 1) % presets.length; theta = presets[preset].deg; grown = 0; }
  if (key === UP_ARROW) theta += 0.05;
  if (key === DOWN_ARROW) theta -= 0.05;
  if (key === 'c' || key === 'C') armIdx = armIdx >= 9 ? -1 : armIdx + 1;
  if (key === ' ') grown = 0;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 137.0° と 137.5° と黄金角を見くらべよう。ほんの 0.5° でどこにすき間が出る？
// 2. C で 8・13・21・34 本の腕を順に色分けしよう。中心近くと外側で目立つ本数が変わる
// 3. 種の大きさ（c * 1.25）を i によって変えると、もっとひまわりらしくなる
// 4. 半径を c·√i ではなく c·i にすると？（アルキメデスらせんになり、密度がそろわない）

// ---------- 道具 ----------
function metallic(k) { return (k + Math.sqrt(k * k + 4)) / 2; }
function contFrac(x, m) {
  let a = [];
  for (let i = 0; i < m; i++) {
    let f = Math.floor(x); a.push(f);
    let rest = x - f;
    if (rest < 1e-9) break;
    x = 1 / rest;
  }
  return a;
}
// 近似分数の分母（2 以上 200 以下）
function convergentDens(x) {
  let a = contFrac(x, 12), q0 = 0, q1 = 1, out = [];
  for (let i = 1; i < a.length; i++) {
    let q2 = a[i] * q1 + q0; q0 = q1; q1 = q2;
    if (q2 >= 2 && q2 <= 200 && !out.includes(q2)) out.push(q2);
  }
  return out;
}
