// ============================================
// 02 関数の増え方（漸近記法）
// アルゴリズムの速さは「n が大きくなったとき、手間がどう増えるか」で比べる（O 記法・Θ 記法）
// 左右キーで n の範囲を広げると、最初は小さかった 2ⁿ や n² が、すぐに他を追い越す
// ←→：横軸の範囲　1〜7：その関数を表示／非表示　マウスを横に動かす：その n での値を読む
// ============================================

let funcs = [
  { name: '1', f: n => 1, on: true },
  { name: 'log₂ n', f: n => Math.log2(max(n, 1)), on: true },
  { name: 'n', f: n => n, on: true },
  { name: 'n log₂ n', f: n => n * Math.log2(max(n, 1)), on: true },
  { name: 'n²', f: n => n * n, on: true },
  { name: 'n³', f: n => n * n * n, on: true },
  { name: '2ⁿ', f: n => Math.pow(2, n), on: true },
];
let ranges = [8, 16, 32, 64, 128, 1024, 1e6]; // ★ 横軸の最大値の候補
let ri = 1;
let ops = 1e9;   // ★ 1 秒に計算できる回数（いまのパソコンはだいたい 10⁹ 回）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(220, 35, 9);
  let nMax = ranges[ri];
  let L = 90, R = width - 380, T = 130, B = height - 80;
  let yMax = funcs[4].f(nMax);     // 縦軸は n² の値に合わせる（はみ出したものは上に張りつく）
  stroke(0, 0, 30); strokeWeight(1);
  line(L, B, R, B); line(L, B, L, T);
  for (let k = 0; k <= 4; k++) {
    let y = map(k, 0, 4, B, T);
    stroke(0, 0, 18); line(L, y, R, y);
    noStroke(); fill(0, 0, 55); textSize(12); textAlign(RIGHT, CENTER);
    text(fmt(yMax * k / 4), L - 8, y);
    textAlign(CENTER, TOP);
    text(fmt(nMax * k / 4), map(k, 0, 4, L, R), B + 8);
  }
  for (let i = 0; i < funcs.length; i++) {
    let F = funcs[i];
    if (!F.on) continue;
    let c = color(i * 50, 70, 100);
    noFill(); stroke(c); strokeWeight(3);
    beginShape();
    for (let px = 0; px <= 400; px++) {
      let n = nMax * px / 400;
      let v = F.f(n);
      let y = map(min(v, yMax * 1.02), 0, yMax, B, T);
      vertex(map(px, 0, 400, L, R), y);
    }
    endShape();
  }
  // マウスの位置の n
  let mn = constrain(map(mouseX, L, R, 0, nMax), 1, nMax);
  stroke(0, 0, 60); strokeWeight(1); drawingContext.setLineDash([4, 6]);
  let mx = map(mn, 0, nMax, L, R);
  line(mx, T, mx, B); drawingContext.setLineDash([]);

  // 右の表：その n で、1 秒 10⁹ 回の計算機が何秒かかるか
  let x0 = width - 350;
  noStroke(); fill(0, 0, 100); textAlign(LEFT, BASELINE); textSize(18);
  text('n = ' + fmt(mn), x0, T);
  textSize(14);
  for (let i = 0; i < funcs.length; i++) {
    let F = funcs[i], v = F.f(mn);
    fill(i * 50, 70, F.on ? 100 : 40);
    text((i + 1) + '  ' + F.name, x0, T + 34 + i * 30);
    fill(0, 0, F.on ? 90 : 40);
    text(fmt(v) + ' 回', x0 + 100, T + 34 + i * 30);
    text(timeStr(v / ops), x0 + 220, T + 34 + i * 30);
  }
  fill(0, 0, 60); textSize(13);
  text('右端 = 1 秒に 10⁹ 回計算できるとしたときの時間', x0, T + 34 + 7 * 30 + 10);

  fill(0, 0, 100); textSize(22);
  text('関数の増え方　横軸 n = 0 〜 ' + fmt(nMax), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('←→：範囲を変える　1〜7：表示切替　マウス：その n の値　（縦軸は n² の最大値に合わせて、はみ出たものは上に張りつく）', 20, 68);
  text('O(f(n))：「せいぜい f(n) の定数倍」　Θ：「ちょうど定数倍」　Ω：「少なくとも定数倍」。定数や小さい項は n が大きいと効かない', 20, 92);
}

function fmt(v) {
  if (!isFinite(v)) return '∞';
  if (v >= 1e6) { let e = floor(Math.log10(v)); return (v / Math.pow(10, e)).toFixed(1) + '×10^' + e; }
  if (v >= 100) return round(v).toLocaleString();
  return (round(v * 10) / 10).toString();
}
function timeStr(s) {
  if (!isFinite(s)) return '永遠';
  if (s < 1e-6) return (s * 1e9).toFixed(1) + ' ナノ秒';
  if (s < 1e-3) return (s * 1e6).toFixed(1) + ' マイクロ秒';
  if (s < 1) return (s * 1e3).toFixed(1) + ' ミリ秒';
  if (s < 60) return s.toFixed(1) + ' 秒';
  if (s < 3600) return (s / 60).toFixed(1) + ' 分';
  if (s < 86400) return (s / 3600).toFixed(1) + ' 時間';
  if (s < 3.15e7) return (s / 86400).toFixed(1) + ' 日';
  let y = s / 3.15e7;
  return y < 1e6 ? y.toFixed(0) + ' 年' : '約 10^' + floor(Math.log10(y)) + ' 年';
}

function keyPressed() {
  if (key === RIGHT_ARROW) ri = min(ranges.length - 1, ri + 1);
  if (key === LEFT_ARROW) ri = max(0, ri - 1);
  if (key >= '1' && key <= '7') funcs[int(key) - 1].on = !funcs[int(key) - 1].on;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. n = 64 で 2ⁿ は何年かかる？ 宇宙の年齢（約 1.4×10¹⁰ 年）と比べよう
// 2. funcs に n! （階乗）や √n を追加してみる
// 3. 100n と n² はどこで逆転する？ 定数倍は「いつか」必ず負ける
