// ============================================
// 00 多項式時間 vs 指数時間
// n を増やすと、計算回数 n, n², n³, 2ⁿ, n! はどれだけ増える？ 1 秒に 10 億回計算できるコンピュータで何秒かかる？
// 「多項式時間（n の何乗か）で解ける」＝ 現実的に解ける。2ⁿ や n! は n = 60 で宇宙の年齢を超える
// 左右キー / マウスの横位置 で n を変える / スペースで n を自動で増やす / 1：最適化問題 2：判定問題（Yes/No）
// ============================================

let n = 10;
let auto = false;
let mode = 1;
const SPEED = 1e9; // ★ 1 秒に何回計算できるか（10 億回）

let funcs = [
  { name: 'n', f: (n) => n, hue: 120 },
  { name: 'n log n', f: (n) => n * Math.log2(Math.max(n, 2)), hue: 160 },
  { name: 'n²', f: (n) => n * n, hue: 190 },
  { name: 'n³', f: (n) => n * n * n, hue: 220 },
  { name: '2ⁿ', f: (n) => Math.pow(2, n), hue: 30 },
  { name: 'n!', f: (n) => factorial(n), hue: 0 },
];

function factorial(k) { let r = 1; for (let i = 2; i <= k; i++) r *= i; return r; }

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
}

function draw() {
  background(230, 30, 10);
  if (auto && frameCount % 12 === 0) n = n >= 80 ? 1 : n + 1;

  fill(0, 0, 100); noStroke(); textSize(18); textAlign(LEFT, BASELINE);
  text('左右キー／マウスで n を変える　スペースで自動　1：最適化問題　2：判定問題', 20, 36);
  textSize(42); fill(50, 80, 100);
  text('n = ' + n, 20, 92);

  // ---- 棒グラフ（対数目盛り）----
  let left = 170, right = width - 330, top = 130, rowH = min(70, (height - 330) / funcs.length);
  let maxLog = 120; // 10^120 まで
  for (let i = 0; i < funcs.length; i++) {
    let v = funcs[i].f(n);
    let lg = v <= 1 ? 0 : Math.log10(v);
    let y = top + i * rowH;
    fill(0, 0, 70); textSize(20); textAlign(RIGHT, CENTER);
    text(funcs[i].name, left - 16, y + rowH / 2);
    fill(0, 0, 20); rect(left, y + 8, right - left, rowH - 16, 6);
    let w = map(min(lg, maxLog), 0, maxLog, 4, right - left);
    fill(funcs[i].hue, 75, 95); rect(left, y + 8, w, rowH - 16, 6);
    textAlign(LEFT, CENTER); fill(0, 0, 100); textSize(18);
    text(fmtCount(v) + ' 回', right + 16, y + rowH / 2 - 11);
    fill(funcs[i].hue, 40, 100); textSize(15);
    text(fmtTime(v / SPEED), right + 16, y + rowH / 2 + 13);
  }
  // 目盛り
  stroke(0, 0, 35); strokeWeight(1);
  for (let e = 0; e <= maxLog; e += 20) {
    let x = map(e, 0, maxLog, left + 4, right);
    line(x, top, x, top + rowH * funcs.length);
    noStroke(); fill(0, 0, 55); textAlign(CENTER, TOP); textSize(13);
    text('10^' + e, x, top + rowH * funcs.length + 6);
    stroke(0, 0, 35);
  }
  noStroke();

  // ---- 説明 ----
  let by = top + rowH * funcs.length + 50;
  textAlign(LEFT, TOP); textSize(17);
  if (mode === 1) {
    fill(50, 60, 100); text('最適化問題：「いちばん短い巡回路は？」「いちばん小さい頂点被覆は？」', 20, by);
    fill(0, 0, 80); text('答えは数（長さ・個数）。NP 完全性の理論ではまず判定問題に言いかえる →  2 を押す', 20, by + 28);
  } else {
    fill(190, 60, 100); text('判定問題：「長さ k 以下の巡回路はある？」 → 答えは Yes / No だけ', 20, by);
    fill(0, 0, 80); text('判定問題が難しい ⇒ 最適化問題も難しい（最適値がわかれば判定は一瞬）。k を二分探索すれば逆もほぼ同じ', 20, by + 28);
  }
  fill(0, 0, 60);
  text('目盛りは対数（1 目盛りで 10²⁰ 倍）。宇宙の年齢 ≈ 4×10¹⁷ 秒。入力は「ビット列」で書いた長さ n で測る（数 N を書くと n ≈ log₂N ビット）', 20, by + 62);
}

function fmtCount(v) {
  if (!isFinite(v)) return '∞';
  if (v < 1e6) return nf(round(v), 0, 0);
  let e = floor(Math.log10(v));
  return nf(v / Math.pow(10, e), 1, 2) + '×10^' + e;
}
function fmtTime(s) {
  if (!isFinite(s)) return '計算不能';
  if (s < 1e-6) return nf(s * 1e9, 1, 1) + ' ナノ秒';
  if (s < 1e-3) return nf(s * 1e6, 1, 1) + ' マイクロ秒';
  if (s < 1) return nf(s * 1e3, 1, 1) + ' ミリ秒';
  if (s < 60) return nf(s, 1, 1) + ' 秒';
  if (s < 3600) return nf(s / 60, 1, 1) + ' 分';
  if (s < 86400) return nf(s / 3600, 1, 1) + ' 時間';
  if (s < 3.15e7) return nf(s / 86400, 1, 1) + ' 日';
  let y = s / 3.15e7;
  if (y < 1e6) return nf(y, 1, 0) + ' 年';
  return '10^' + floor(Math.log10(y)) + ' 年' + (s > 4e17 ? '（宇宙の年齢以上）' : '');
}

function mouseMoved() { if (!auto && mouseY > 110) n = constrain(floor(map(mouseX, 0, width, 1, 81)), 1, 80); }
function mouseDragged() { mouseMoved(); }
function keyPressed() {
  if (key === RIGHT_ARROW) n = min(80, n + 1);
  if (key === LEFT_ARROW) n = max(1, n - 1);
  if (key === ' ') auto = !auto;
  if (key === '1') mode = 1;
  if (key === '2') mode = 2;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. n³ が 1 秒を超える n と、2ⁿ が 1 秒を超える n を比べよう
// 2. SPEED を 1000 倍にしても 2ⁿ で解ける n はいくつ増える？（たった 10）
// 3. funcs に n⁵ や 1.1ⁿ を足してみよう。いつ逆転する？
