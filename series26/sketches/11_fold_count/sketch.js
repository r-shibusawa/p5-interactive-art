// ============================================
// 11 折り紙で数を数える：紙を何回折れる？
// 半分に折るたびに厚さは 2 倍：n 回で 2ⁿ 枚。0.1 mm の紙でも 42 回で月に届く計算
//   でも実際は折り目の丸みで長さが足りなくなる。同じ向きに n 回折るのに必要な長さ（ギャリバンの式）
//   L = (π t / 6)(2ⁿ + 4)(2ⁿ − 1)
// ←→ = 折る回数 n / スライダー（ドラッグ）= 紙の厚さ t・長さ L / ↑↓ = 厚さ / Z・X = 長さ
// ============================================

let n = 4;                       // 折った回数
let logT = Math.log10(0.1e-3);   // ★ 紙の厚さ（m）の log。0.1 mm
let logL = Math.log10(0.297);    // ★ 紙の長さ（m）の log。A4 の長い辺
let dragS = -1;
const MARKS = [[0.1, '手のひら'], [1.7, '人の背'], [333, '東京タワー'], [3776, '富士山'], [8849, 'エベレスト'], [4e5, '宇宙ステーション（400 km）'], [3.844e8, '月（38 万 km）'], [1.496e11, '太陽（1.5 億 km）']];

function setup() { createCanvas(windowWidth, windowHeight); }

// ★ ギャリバンの式：同じ向きに n 回折るのに必要な長さ
function needLength(t, k) { let N = 2 ** k; return (PI * t / 6) * (N + 4) * (N - 1); }
function maxFolds(t, L) { let k = 0; while (k < 60 && needLength(t, k + 1) <= L) k++; return k; }

function draw() {
  background(34, 32, 40);
  let t = 10 ** logT, L = 10 ** logL;
  let thick = t * 2 ** n, need = needLength(t, n), nmax = maxFolds(t, L);
  let ok = need <= L;

  noStroke(); fill(255); textSize(18);
  text('←→：折る回数 n = ' + n + '　スライダー：厚さ・長さ（↑↓・Z/X でも）', 20, 40);
  fill(170); textSize(15);
  text('左 = 同じ向きに n 回折った紙の断面（外側の折り目ほど大きな丸みで紙を食う）、右 = 厚さのグラフ（目盛りは 10 倍ずつ）', 20, 68);

  // --- 左：断面図
  let bx = 170, by = height * 0.62, bw = max(120, width * 0.45 - 340);   // 左右に折り目の丸みのぶん余白
  if (n <= 7) drawStack(n, bx, by, bw, min(10, 280 / 2 ** n));
  else { fill(246, 240, 226); rect(bx, by - 280, bw, 280); fill(60); textSize(16); text(fmtNum(2 ** n) + ' 枚の層\n（細かすぎて描けない）', bx + 20, by - 140); }
  noStroke(); fill(255); textSize(20);
  text('層の数 2^' + n + ' = ' + fmtNum(2 ** n) + ' 枚', 60, by + 40);
  text('厚さ ' + fmtLen(thick), 60, by + 70);
  fill(ok ? color(80, 220, 140) : color(255, 110, 90));
  text('必要な長さ ' + fmtLen(need) + (ok ? '（足りる）' : '（足りない！）'), 60, by + 100);
  fill(255, 190, 40);
  text('この紙で折れる最大回数：' + nmax + ' 回', 60, by + 130);

  // --- 右：厚さのグラフ（対数）
  let gx = width * 0.45, gy = height - 90, gw = width * 0.5, gh = height - 230;
  let ymin = -5, ymax = 12;
  let Y = (v) => gy - gh * (Math.log10(v) - ymin) / (ymax - ymin);
  let X = (k) => gx + gw * k / 50;
  stroke(80); strokeWeight(1);
  line(gx, gy, gx + gw, gy); line(gx, gy, gx, gy - gh);
  for (let e = ymin; e <= ymax; e += 1) { stroke(60); line(gx, Y(10 ** e), gx + gw, Y(10 ** e)); }
  for (let [v, name] of MARKS) {
    stroke(120, 160, 220, 120); drawingContext.setLineDash([6, 6]); line(gx, Y(v), gx + gw, Y(v)); drawingContext.setLineDash([]);
    let k = Math.ceil(Math.log2(v / t));
    noStroke(); fill(150, 190, 255); textSize(13);
    text(name + '　→ ' + k + ' 回', gx + 6, Y(v) - 4);
  }
  drawingContext.save();
  drawingContext.beginPath(); drawingContext.rect(gx, gy - gh, gw, gh); drawingContext.clip();   // グラフの枠の中だけ描く
  noFill(); stroke(255, 190, 40); strokeWeight(2.5);
  beginShape(); for (let k = 0; k <= 50; k++) vertex(X(k), Y(t * 2 ** k)); endShape();
  // 必要な長さ L(n) と、手持ちの長さ L
  stroke(230, 90, 70); strokeWeight(2);
  beginShape(); for (let k = 1; k <= 50; k++) vertex(X(k), Y(needLength(t, k))); endShape();
  stroke(230, 90, 70, 140); drawingContext.setLineDash([3, 5]); line(gx, Y(L), gx + gw, Y(L)); drawingContext.setLineDash([]);
  drawingContext.restore();
  noStroke(); fill(255); circle(X(n), Y(thick), 12);
  fill(255, 190, 40); textSize(14); text('厚さ t·2ⁿ', X(30), Y(t * 2 ** 30) - 10);
  fill(230, 90, 70); text('必要な長さ L(n)', X(16), Y(needLength(t, 16)) - 26);
  fill(230, 90, 70, 200); text('手持ちの長さ ' + fmtLen(L), gx + gw - 170, Y(L) - 6);
  fill(170); text('n →', gx + gw + 8, gy + 4);
  for (let k = 0; k <= 50; k += 10) text(k, X(k) - 6, gy + 20);

  // --- スライダー
  slider(0, 60, height - 100, '紙の厚さ t = ' + fmtLen(t), (logT - Math.log10(0.02e-3)) / (Math.log10(1e-3) - Math.log10(0.02e-3)));
  slider(1, 60, height - 50, '紙の長さ L = ' + fmtLen(L), (logL - Math.log10(0.1)) / (Math.log10(10000) - Math.log10(0.1)));
  fill(150); textSize(13);
  text('2002 年、高校生のブリトニー・ギャリバンは長さ 1.2 km のトイレットペーパーで 12 回折りに成功した', 20, height - 14);
}

// 断面図：2ⁿ 本の層を、つながる端で半円でつなぐ（同じ向きに折りつづけたときの重なり方を計算）
function drawStack(k, x, y, w, gap) {
  let N = 2 ** k, segs = [];
  for (let i = 0; i < N; i++) segs.push({ x0: i, x1: i + 1, z: 0 });
  let wid = N, maxZ = 0;
  for (let f = 0; f < k; f++) {
    let m = wid / 2;
    for (let s of segs) if (s.x0 >= m - 1e-9 && s.x1 >= m - 1e-9) { s.x0 = 2 * m - s.x0; s.x1 = 2 * m - s.x1; s.z = 2 * maxZ + 1 - s.z; }
    maxZ = 2 * maxZ + 1; wid = m;
  }
  let yz = (z) => y - z * gap;
  noFill(); strokeWeight(max(1, gap * 0.4));
  for (let i = 0; i < N; i++) {
    let s = segs[i];
    stroke(lerpColor(color(246, 240, 226), color(226, 84, 72), i / max(1, N - 1)));
    line(x, yz(s.z), x + w, yz(s.z));
    if (i < N - 1) {
      let s2 = segs[i + 1], right = s.x1 > 0.5;      // 共有する端が右か左か
      let y1 = yz(s.z), y2 = yz(s2.z), r = abs(y1 - y2);
      if (right) arc(x + w, (y1 + y2) / 2, r, r, -HALF_PI, HALF_PI);
      else arc(x, (y1 + y2) / 2, r, r, HALF_PI, PI + HALF_PI);
    }
  }
}

function slider(i, x, y, label2, v) {
  let w = width * 0.3;
  stroke(90); strokeWeight(4); line(x, y, x + w, y);
  noStroke(); fill(dragS === i ? color(255, 190, 40) : 255); circle(x + w * constrain(v, 0, 1), y, 18);
  fill(220); textSize(15); text(label2, x + w + 20, y + 5);
}
function setSlider(i) {
  let v = constrain((mouseX - 60) / (width * 0.3), 0, 1);
  if (i === 0) logT = Math.log10(0.02e-3) + v * (Math.log10(1e-3) - Math.log10(0.02e-3));
  else logL = Math.log10(0.1) + v * (Math.log10(10000) - Math.log10(0.1));
}
function mousePressed() {
  if (abs(mouseY - (height - 100)) < 16 && mouseX < 60 + width * 0.3 + 10) dragS = 0;
  else if (abs(mouseY - (height - 50)) < 16 && mouseX < 60 + width * 0.3 + 10) dragS = 1;
  else dragS = -1;
  if (dragS >= 0) setSlider(dragS);
}
function mouseDragged() { if (dragS >= 0) setSlider(dragS); }
function mouseReleased() { dragS = -1; }
function keyPressed() {
  if (key === RIGHT_ARROW) n = min(50, n + 1);
  if (key === LEFT_ARROW) n = max(0, n - 1);
  if (key === UP_ARROW) logT = min(Math.log10(1e-3), logT + 0.1);
  if (key === DOWN_ARROW) logT = max(Math.log10(0.02e-3), logT - 0.1);
  if (key === 'x' || key === 'X') logL = min(4, logL + 0.2);
  if (key === 'z' || key === 'Z') logL = max(-1, logL - 0.2);
}

// ---------- やってみよう ----------
// 1. 0.1 mm の紙を何回折れば富士山・月に届く？ グラフの目盛りで読もう（倍々の速さ = 指数関数）
// 2. A4（長さ 0.297 m）で折れる最大回数は？ 本物の紙で試して、式の答えと比べよう
// 3. 12 回折るのに必要な長さは？ ギャリバンの 1.2 km と比べよう。13 回には何 km いる？
// 4. 毎回向きを変えて（縦・横交互に）折ると、必要な紙はどう変わる？ 考えてみよう


// ==================================================
// ここから下は「数を読みやすくする道具」
// ==================================================
function fmtLen(m) {
  if (m < 1e-2) return nf(m * 1000, 1, 2) + ' mm';
  if (m < 1) return nf(m * 100, 1, 1) + ' cm';
  if (m < 1000) return nf(m, 1, 1) + ' m';
  if (m < 1e8) return fmtNum(Math.round(m / 1000)) + ' km';
  return nf(m / 1000 / 1e8, 1, 2) + ' 億 km';
}
function fmtNum(v) { return v.toLocaleString('ja-JP'); }
