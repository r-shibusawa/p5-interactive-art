// ============================================
// 12 ファジィ画像処理（コントラスト強調とエッジ検出）
// 画素の明るさを「明るい」の所属度 μ（0〜1）にする → INT 演算子で 0.5 より上はより明るく、下はより暗く → 画素に戻す
//   INT(μ) = 2μ²（μ ≤ 0.5）、1 − 2(1 − μ)²（μ > 0.5）。エッジ：「となりとの差 dx が 0 に近い かつ dy が 0 に近い」でなければ縁
// ↑↓ = INT を何回かけるか / ←→ = 「差が 0 に近い」の幅 t / E = エッジを元画像・強調後のどちらで測るか / N = 別のテスト画像
// ============================================

const W = 240, H = 150;   // 画像の大きさ（小さめにして計算を軽く）
let nInt = 2;             // ★ INT 演算子をくり返す回数
let tEdge = 0.12;         // ★ 「差が 0 に近い」の三角形の半分の幅
let edgeOnEnh = false, seedImg = 1;
let g0 = [], muA = [], muB = [], edge = [], imA, imB, imE, hA = [], hB = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  imA = createImage(W, H); imB = createImage(W, H); imE = createImage(W, H);
  selfTest();
  makeTestImage();
}

// ぼんやりしたテスト画像（コントラストが低い：明るさ 85〜165 くらい）
function makeTestImage() {
  let gr = createGraphics(W, H); gr.pixelDensity(1);
  let r = lcg(seedImg++);
  gr.background(110);
  for (let y = 0; y < H; y++) { gr.stroke(100 + (y / H) * 40); gr.line(0, y, W, y); }
  gr.noStroke();
  for (let k = 0; k < 9; k++) { gr.fill(85 + r() * 80); let s = 20 + r() * 60; if (r() < 0.5) gr.circle(r() * W, r() * H, s); else gr.rect(r() * W, r() * H, s, s * 0.6, 4); }
  gr.fill(150); gr.textSize(30); gr.textStyle(BOLD); gr.text('FUZZY', 20 + r() * 80, 60 + r() * 60);
  gr.loadPixels();
  g0 = new Array(W * H);
  for (let i = 0; i < W * H; i++) g0[i] = clampv(gr.pixels[4 * i] + (r() - 0.5) * 10, 0, 255);
  gr.remove();
  recompute();
}
// パラメータが変わったときだけ計算する
function recompute() {
  muA = fuzzify(g0);
  muB = muA.map((m) => intN(m, nInt));
  edge = fuzzyEdge(edgeOnEnh ? muB : muA, W, H, tEdge);
  toImage(imA, muA); toImage(imB, muB); toImage(imE, edge);
  hA = histo(muA); hB = histo(muB);
}
function toImage(im, arr) {
  im.loadPixels();
  for (let i = 0; i < W * H; i++) { let v = arr[i] * 255; im.pixels[4 * i] = v; im.pixels[4 * i + 1] = v; im.pixels[4 * i + 2] = v; im.pixels[4 * i + 3] = 255; }
  im.updatePixels();
}
function histo(arr) { let h = new Array(32).fill(0); for (let v of arr) h[Math.min(31, Math.floor(v * 32))]++; return h; }

function draw() {
  background(250, 18, 14);
  let sc = Math.min((width - 80) / (3 * W), (height * 0.5) / H), iw = W * sc, ih = H * sc, y0 = 110;
  let xs = [20, 40 + iw, 60 + 2 * iw];
  let names = ['元の画像（μ = 明るい の所属度）', '強調後  INT を ' + nInt + ' 回', 'ファジィなエッジ（' + (edgeOnEnh ? '強調後' : '元画像') + 'で測る）'];
  [imA, imB, imE].forEach((im, i) => { image(im, xs[i], y0, iw, ih); noStroke(); fill(0, 0, 90); textSize(15); text(names[i], xs[i], y0 - 8); });
  // ヒストグラム
  let hy = y0 + ih + 20, hh = height * 0.16;
  drawHist(hA, xs[0], hy, iw, hh, color(260, 30, 90)); drawHist(hB, xs[1], hy, iw, hh, color(20, 45, 100));
  // INT の曲線
  let cx = xs[2], cw = Math.min(iw, hh * 1.6);
  noFill(); stroke(0, 0, 100, 30); rect(cx, hy, cw, hh);
  stroke(0, 0, 100, 25); line(cx, hy + hh, cx + cw, hy);
  stroke(175, 60, 80); strokeWeight(2.5); beginShape();
  for (let i = 0; i <= 50; i++) { let m = i / 50; vertex(cx + m * cw, hy + hh - intN(m, nInt) * hh); }
  endShape(); strokeWeight(1);
  noStroke(); fill(0, 0, 70); textSize(13); text('μ → INT^' + nInt + '(μ)', cx + cw + 8, hy + 14); text('0.5 は動かない', cx + cw + 8, hy + 32);

  // マウスの画素の値
  let iy = hy + hh + 34; fill(0, 0, 95); textSize(16);
  for (let i = 0; i < 3; i++) {
    let px = Math.floor((mouseX - xs[i]) / sc), py = Math.floor((mouseY - y0) / sc);
    if (px >= 0 && px < W && py >= 0 && py < H) {
      let k = py * W + px, mu = muA[k];
      text('画素 (' + px + ', ' + py + ')　明るさ ' + Math.round(g0[k]) + ' → μ = ' + mu.toFixed(3) + '　→ INT^' + nInt + ' = ' + muB[k].toFixed(3) + '　エッジの度合い = ' + edge[k].toFixed(3), 20, iy);
      noFill(); stroke(20, 45, 100); rect(xs[i] + px * sc - 4, y0 + py * sc - 4, 8, 8); noStroke(); fill(0, 0, 95);
    }
  }
  fill(0, 0, 70); textSize(14);
  text('エッジ = 1 − min( zero(dx), zero(dy) )、zero(d) = 三角形（−t, 0, t）、t = ' + tEdge.toFixed(2) + '。差が t 以上なら完全に縁（1）', 20, iy + 26);

  fill(0, 0, 95); textSize(18);
  text('↑↓ INT の回数 ' + nInt + '　←→ 幅 t = ' + tEdge.toFixed(2) + '　E エッジの元 　N 別の画像', 20, 36);
  fill(0, 0, 70); textSize(15);
  text('μ = (明るさ − 最小) ÷ (最大 − 最小)。INT で 0.5 より上はより 1 に、下はより 0 に寄る → ヒストグラムが両端へ分かれる', 20, 62);
  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}
function drawHist(h, x, y, w, hh, c) {
  let mx = Math.max(1, ...h), bw = w / h.length;
  noFill(); stroke(0, 0, 100, 30); rect(x, y, w, hh); noStroke(); fill(c);
  h.forEach((v, i) => rect(x + i * bw, y + hh - (v / mx) * hh, bw - 1, (v / mx) * hh));
  fill(0, 0, 70); textSize(12); text('0', x, y + hh + 14); text('μ', x + w / 2, y + hh + 14); text('1', x + w - 8, y + hh + 14);
}

function keyPressed() {
  if (key === UP_ARROW) nInt = Math.min(6, nInt + 1);
  if (key === DOWN_ARROW) nInt = Math.max(0, nInt - 1);
  if (key === RIGHT_ARROW) tEdge = Math.min(0.5, tEdge + 0.02);
  if (key === LEFT_ARROW) tEdge = Math.max(0.02, tEdge - 0.02);
  if (key === 'e' || key === 'E') edgeOnEnh = !edgeOnEnh;
  if (key === 'n' || key === 'N') { makeTestImage(); return; }
  recompute();
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  check('INT(0.25) = 2 · 0.25² = 0.125', near(intOp(0.25), 0.125));
  check('INT(0.75) = 1 − 2 · 0.25² = 0.875', near(intOp(0.75), 0.875));
  check('INT(0.5) = 0.5、INT(0) = 0、INT(1) = 1（動かない点）', near(intOp(0.5), 0.5) && intOp(0) === 0 && intOp(1) === 1);
  let mono = true; for (let i = 1; i <= 100; i++) if (intN(i / 100, 3) < intN((i - 1) / 100, 3)) mono = false;
  check('INT は大小の順番を変えない（単調）', mono);
  let f = fuzzify([50, 100, 150]);
  check('いちばん暗い画素 → μ = 0、いちばん明るい → 1、中間 → 0.5', f[0] === 0 && f[1] === 0.5 && f[2] === 1);
  let flat = new Array(25).fill(0.4);
  check('平らな画像のエッジはどこも 0', fuzzyEdge(flat, 5, 5, 0.1).every((e) => e === 0));
  let st = []; for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) st.push(x < 2 ? 0 : 1);
  let e = fuzzyEdge(st, 5, 5, 0.1);
  check('白黒の境目では 1、境目から離れると 0', e[2 * 5 + 1] === 1 && e[2 * 5 + 3] === 0);
  check('となりの差 dx = t/2 なら zero = 0.5 → エッジ 0.5', near(fuzzyEdge([0, 0.025, 0.05, 0, 0.025, 0.05, 0, 0.025, 0.05], 3, 3, 0.1)[4], 0.5));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑ で INT の回数を増やす。ヒストグラムが真ん中から両端へ分かれていく。何回で白黒の 2 値に近くなる？
// 2. INT は 0.5 をさかいに分ける。fuzzify の最小・最大を変えて、さかい目の明るさを変えてみよう
// 3. ←→ で t を変える。小さいと細かい模様（ノイズ）まで縁になる、大きいと太い縁だけ残る
// 4. E で、強調した画像でエッジを測る。縁がくっきりする？
// 5. zero(d) を三角形からガウス（gaussmf）に変えると、エッジの見え方はどう変わる？


// ==================================================
// ここから下は「ファジィの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- メンバーシップ関数（所属度 μ を 0〜1 で返す）
function trimf(x, a, b, c) {            // 三角：a で 0、b で 1、c で 0
  if (x < a || x > c) return 0;
  if (x === b) return 1;
  if (x < b) return b > a ? (x - a) / (b - a) : 1;
  return c > b ? (c - x) / (c - b) : 1;
}
function trapmf(x, a, b, c, d) {         // 台形：b〜c が 1
  if (x < a || x > d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}
function gaussmf(x, c, s) { return Math.exp(-((x - c) * (x - c)) / (2 * s * s)); }
function sigmf(x, a, c) { return 1 / (1 + Math.exp(-a * (x - c))); }
function bellmf(x, a, b, c) { return 1 / (1 + Math.pow(Math.abs((x - c) / a), 2 * b)); }
// mf = { type: 'tri', p: [a, b, c] } のような形
function evalMF(mf, x) {
  let p = mf.p;
  if (mf.type === 'tri') return trimf(x, p[0], p[1], p[2]);
  if (mf.type === 'trap') return trapmf(x, p[0], p[1], p[2], p[3]);
  if (mf.type === 'gauss') return gaussmf(x, p[0], p[1]);
  if (mf.type === 'sig') return sigmf(x, p[0], p[1]);
  if (mf.type === 'bell') return bellmf(x, p[0], p[1], p[2]);
  return 0;
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }

// ---- ファジィ画像処理の道具
// 明るさ → 「明るい」の所属度（いちばん暗い画素が 0、いちばん明るい画素が 1）
function fuzzify(g) {
  let lo = Math.min(...g), hi = Math.max(...g);
  return g.map((v) => (hi > lo ? (v - lo) / (hi - lo) : 0));
}
// INT 演算子（強調）：0.5 より下は 2μ²、上は 1 − 2(1 − μ)²
function intOp(m) { return m <= 0.5 ? 2 * m * m : 1 - 2 * (1 - m) * (1 - m); }
function intN(m, n) { for (let i = 0; i < n; i++) m = intOp(m); return m; }
// ファジィなエッジ：規則「dx が 0 に近い かつ dy が 0 に近い ならば 縁ではない」の否定
function fuzzyEdge(mu, w, h, t) {
  let out = new Array(w * h).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let k = y * w + x;
    let dx = mu[y * w + Math.min(w - 1, x + 1)] - mu[y * w + Math.max(0, x - 1)];
    let dy = mu[Math.min(h - 1, y + 1) * w + x] - mu[Math.max(0, y - 1) * w + x];
    out[k] = 1 - Math.min(trimf(dx, -t, 0, t), trimf(dy, -t, 0, t));
  }
  return out;
}
// 決まった順番の乱数
function lcg(s) { let x = s * 9301 + 49297; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }
