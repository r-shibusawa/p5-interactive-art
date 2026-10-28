// ============================================
// 03 一般化フィボナッチ数列 ─ 比は φn に近づく
// a(k+1) = n·a(k) + a(k−1)。n=1 フィボナッチ数、n=2 ペル数、n=3 …
// となりどうしの比 a(k+1)/a(k) は、どんな出発点からでも φn に吸い寄せられる
// ←→ = n / A = 出発点をランダムに / Z = 0, 1 に戻す / スペース = 一時停止 / ↑↓ = 速さ
// ============================================

let n = 1;                 // ★ 漸化式の係数
let start = [0, 1];        // ★ はじめの 2 項
let seq = [];
let shownK = 2;            // いま何項目まで見えているか
let speed = 30;            // 何フレームごとに 1 項増やすか
let paused = false;
let timer = 0;
const MAXK = 24;           // ★ 何項まで

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

function rebuild() {
  seq = [start[0], start[1]];
  for (let k = 2; k < MAXK; k++) seq.push(n * seq[k - 1] + seq[k - 2]);
  shownK = 2;
}

function draw() {
  background(210, 30, 11);
  if (!paused) {
    timer++;
    if (timer > speed) { timer = 0; shownK = shownK >= MAXK ? 2 : shownK + 1; }
  }
  let phi = metallic(n);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('a(k+1) = ' + n + '·a(k) + a(k−1)　n = ' + n + '（←→）' + seqName() + '　出発点 ' + start[0] + ', ' + start[1] + '（A：ランダム Z：0,1）　↑↓：速さ　スペース：停止', 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text('となりの比はどんどん φ' + n + ' = ' + nf(phi, 1, 8) + ' に近づく。誤差は 1 項ごとにおよそ −1/φ² 倍（符号が入れかわる）', 20, 68);

  // 表
  let tx = 30, ty = 110;
  textSize(14);
  fill(0, 0, 100);
  text('k', tx, ty); text('a(k)', tx + 40, ty); text('a(k)/a(k−1)', tx + 230, ty); text('φ との差', tx + 360, ty);
  let rows = min(shownK, floor((height - 160) / 22));
  let first = max(0, shownK - rows);
  for (let k = first; k < shownK; k++) {
    let yy = ty + 24 + (k - first) * 22;
    fill(k === shownK - 1 ? color(50, 80, 100) : color(0, 0, 80));
    text(k, tx, yy);
    text(String(seq[k]), tx + 40, yy);
    if (k >= 1 && seq[k - 1] !== 0) {
      let r = seq[k] / seq[k - 1];
      text(nf(r, 1, 8), tx + 230, yy);
      text((r - phi).toExponential(2), tx + 360, yy);
    }
  }

  // グラフ 1：比の収束
  let gx = width * 0.42, gy = 100, gw = width * 0.55, gh = (height - 160) * 0.5;
  frameBox(gx, gy, gw, gh, '比 a(k)/a(k−1)（点線 = φ' + n + '）');
  let lo = phi - 1.2, hi = phi + 1.2;
  let yOf = v => gy + gh - map(constrain(v, lo, hi), lo, hi, 0, gh);
  drawingContext.setLineDash([6, 6]);
  stroke(50, 90, 100);
  line(gx, yOf(phi), gx + gw, yOf(phi));
  drawingContext.setLineDash([]);
  noFill();
  stroke(190, 70, 100);
  strokeWeight(2);
  beginShape();
  vertex(gx, yOf(phi));
  for (let k = 2; k < shownK; k++) if (seq[k - 1] !== 0) vertex(gx + k * gw / MAXK, yOf(seq[k] / seq[k - 1]));
  endShape();
  noStroke();
  fill(190, 70, 100);
  for (let k = 2; k < shownK; k++) if (seq[k - 1] !== 0) circle(gx + k * gw / MAXK, yOf(seq[k] / seq[k - 1]), 7);

  // グラフ 2：項の大きさ（対数）→ 直線 = φ^k で増える
  let hy = gy + gh + 40;
  frameBox(gx, hy, gw, gh - 20, 'log a(k)：まっすぐ = 毎回 φ 倍（指数関数的に増える）');
  let maxLog = Math.log(Math.max(2, Math.abs(seq[MAXK - 1])));
  for (let k = 0; k < shownK; k++) {
    let v = Math.log(Math.max(1, Math.abs(seq[k])));
    let bh = map(v, 0, maxLog, 0, gh - 40);
    fill(k % 2 ? color(25, 60, 95) : color(200, 60, 95));
    rect(gx + k * gw / MAXK + 2, hy + gh - 20 - bh, gw / MAXK - 4, bh);
  }
  fill(0, 0, 70);
  textSize(13);
  text('傾き = log φ' + n + ' = ' + nf(Math.log(phi), 1, 4), gx + 10, hy + 40);
}

function frameBox(x, y, w, h, title) {
  noFill();
  stroke(0, 0, 100, 18);
  strokeWeight(1);
  rect(x, y, w, h, 6);
  noStroke();
  fill(0, 0, 80);
  textSize(14);
  text(title, x + 10, y + 20);
}

function seqName() {
  if (start[0] === 0 && start[1] === 1) return n === 1 ? '（フィボナッチ数）' : n === 2 ? '（ペル数）' : '';
  if (start[0] === 2 && start[1] === 1 && n === 1) return '（リュカ数）';
  return '';
}

function keyPressed() {
  if (key === RIGHT_ARROW) { n = min(n + 1, 8); rebuild(); }
  if (key === LEFT_ARROW) { n = max(n - 1, 1); rebuild(); }
  if (key === UP_ARROW) speed = max(4, speed - 6);
  if (key === DOWN_ARROW) speed = min(90, speed + 6);
  if (key === 'a' || key === 'A') { start = [floor(random(0, 20)), floor(random(1, 20))]; rebuild(); }
  if (key === 'z' || key === 'Z') { start = [0, 1]; rebuild(); }
  if (key === ' ') paused = !paused;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. A を何度も押して、どんな出発点でも同じ φ に近づくことを確かめよう
// 2. start = [2, 1], n = 1 はリュカ数。フィボナッチ数とどちらが速く φ に近づく？
// 3. ペル数（n = 2）で、(a(k) + a(k−1)) / a(k) が √2 に近づくのを表に列を足して確かめよう
// 4. 漸化式を a(k+1) = a(k) + 2·a(k−1) に変えると比は何に近づく？（答え：2）

// ---------- 道具 ----------
function metallic(k) { return (k + Math.sqrt(k * k + 4)) / 2; }
