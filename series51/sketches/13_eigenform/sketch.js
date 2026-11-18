// ============================================
// 13 固有形（フォン・フェルスター）
// 同じ操作を、その結果にまたくり返す：x → Op(x) → Op(Op(x)) → … すると、はじめの形によらず決まった「固有のふるまい」に落ちつく
// 1：数 x → cos x（電卓で cos を押し続ける。答えは 0.739085…） 2：形 → となりと平均して大きさをそろえる（だ円になる）
// 3：形 → 半分に縮めた 3 つのコピー（シェルピンスキーの三角形になる）
// 1〜3 = 操作 / ドラッグ = はじめの形を描く（1 ではクリックで x₀） / スペース = 1 回 / A = 自動 / R = はじめに戻す
// ============================================

const NP = 64;            // 形の点の数
let modeSel = 1, x0 = 2.5, xs = [], shape0, cur, dists = [], iter = 0, autoRun = true, drawing = null, gfx, ifsPts;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  shape0 = defaultShape();
  restart();
}
function defaultShape() { let s = []; for (let i = 0; i < NP; i++) { let a = (i / NP) * TWO_PI, r = 1 + 0.45 * Math.sin(5 * a) + 0.25 * Math.cos(3 * a); s.push([r * Math.cos(a) + 0.3, 0.7 * r * Math.sin(a)]); } return s; }
function dropGfx() { if (gfx) gfx.remove(); gfx = null; }
function restart() { dropGfx(); iter = 0; dists = []; xs = [x0]; cur = shape0.map((p) => p.slice()); ifsPts = cur.map((p) => [(p[0] + 1.6) / 3.2, (p[1] + 1.6) / 3.2]); }

// ---- 操作 1：x → cos x
function opCos(x) { return Math.cos(x); }
// ---- 操作 2：となり 2 つずつと平均（重み 1:2:2 の 5 点平均）→ 重心を 0、大きさ（RMS 半径）を 1 に
function opSmooth(P) {
  let n = P.length, Q = [];
  for (let i = 0; i < n; i++) { let q = [0, 0]; for (let d = -2; d <= 2; d++) { let p = P[(i + d + n) % n]; q[0] += p[0] / 5; q[1] += p[1] / 5; } Q.push(q); }
  return normalizeShape(Q);
}
function normalizeShape(Q) {
  let cx = 0, cy = 0; for (let q of Q) { cx += q[0] / Q.length; cy += q[1] / Q.length; }
  let r = Math.sqrt(Q.reduce((a, q) => a + (q[0] - cx) ** 2 + (q[1] - cy) ** 2, 0) / Q.length) || 1;
  return Q.map((q) => [(q[0] - cx) / r, (q[1] - cy) / r]);
}
// ---- 操作 3：点の集まりを、半分に縮めて 3 か所へコピー（ハッチンソンの作用素）
const IFS = [[0, 0], [0.5, 0], [0.25, 0.433]];
function opIFS(P) { let out = []; for (let t of IFS) for (let p of P) out.push([p[0] / 2 + t[0], p[1] / 2 + t[1]]); return out; }
// ---- 距離
function rmsDist(P, Q) { let s = 0; for (let i = 0; i < P.length; i++) s += (P[i][0] - Q[i][0]) ** 2 + (P[i][1] - Q[i][1]) ** 2; return Math.sqrt(s / P.length); }
function hausdorff(P, Q) {
  let dir = (A, B) => { let m = 0; for (let a of A) { let best = 1e18; for (let b of B) { let d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; if (d < best) best = d; } if (best > m) m = best; } return Math.sqrt(m); };
  return Math.max(dir(P, Q), dir(Q, P));
}
function oneIter() {
  if (modeSel === 1) { let x = xs[xs.length - 1], y = opCos(x); dists.push(Math.abs(y - x)); xs.push(y); if (xs.length > 60) xs.shift(); }
  else if (modeSel === 2) { let n = opSmooth(cur); dists.push(rmsDist(n, cur)); cur = n; }
  else { if (iter >= 7) return; let n = opIFS(ifsPts); dists.push(n.length * ifsPts.length < 3e7 ? hausdorff(n, ifsPts) : NaN); ifsPts = n; dropGfx(); }
  iter++;
}

function draw() {
  background(24, 35, 10);
  if (autoRun && frameCount % (modeSel === 3 ? 40 : modeSel === 1 ? 20 : 2) === 0) oneIter();
  let names = ['', 'x → cos x', '形 → となりと平均 → 大きさをそろえる', '形 → 半分のコピー 3 つ'];
  say('固有形 ─ 同じ操作をくり返すと、はじめによらない「固有のふるまい」に落ちつく', 20, 36, 20);
  say('1〜3 操作（いま ' + modeSel + '：' + names[modeSel] + '）　' + (modeSel === 1 ? 'クリック x₀' : 'ドラッグ 形を描く') + '　スペース 1 回　A 自動 ' + (autoRun ? 'ON' : 'OFF') + '　R はじめに戻す', 20, 62, 15, C_SUB);
  let ax = 20, ay = 90, aw = width * 0.58, ah = height - 140;
  noStroke(); fill(28, 25, 13); rect(ax, ay, aw, ah, 8);
  if (modeSel === 1) drawCobweb(ax, ay, aw, ah);
  else if (modeSel === 2) {
    let sc = Math.min(aw, ah) / 5, cx = ax + aw / 2, cy = ay + ah / 2;
    noFill(); stroke(col(C_SUB, 40)); strokeWeight(1.5); beginShape(); for (let p of normalizeShape(shape0)) vertex(cx + p[0] * sc, cy + p[1] * sc); endShape(CLOSE);
    stroke(col(C_TUBE)); strokeWeight(3); beginShape(); for (let p of cur) vertex(cx + p[0] * sc, cy + p[1] * sc); endShape(CLOSE);
  } else {
    if (!gfx) { gfx = createGraphics(Math.floor(aw), Math.floor(ah)); gfx.background(0, 0); gfx.stroke(255, 140, 40); gfx.strokeWeight(ifsPts.length > 5000 ? 1 : 3); let s = Math.min(aw, ah) * 0.9; for (let p of ifsPts) gfx.point(aw / 2 - s / 2 + p[0] * s, ah / 2 + s * 0.4 - p[1] * s); }
    image(gfx, ax, ay);
  }
  if (drawing && drawing.length > 1) { noFill(); stroke(col(C_SCOPE)); strokeWeight(2); beginShape(); for (let p of drawing) vertex(p[0], p[1]); endShape(); }

  // ---- 距離のグラフ（対数）
  let hx = ax + aw + 30, hy = 110, gw = width - hx - 30;
  say('くり返し ' + iter + ' 回', hx, hy, 18);
  let last = dists[dists.length - 1];
  say('いまの 1 回での変化 d = ' + (Number.isFinite(last) ? last.toExponential(3) : '—'), hx, hy + 28, 15, C_TUBE);
  if (modeSel === 1) say('x = ' + xs[xs.length - 1].toFixed(10) + '（固有値 cos x* = x* = 0.7390851332）', hx, hy + 54, 14, C_SCOPE);
  if (modeSel === 2) say('Fourier で見ると、±1 以外の成分の割合 = ' + nonEllipse(cur).toExponential(2), hx, hy + 54, 14, C_SCOPE);
  if (modeSel === 3) say('点の数 ' + ifsPts.length + '（1 回で 3 倍、7 回まで）　距離 = ハウスドルフ距離', hx, hy + 54, 14, C_SCOPE);
  let gy = hy + 80, gh = height - gy - 60;
  plotFrame(hx, gy, gw, gh, 'log₁₀ d（−12〜1）：右下がり = 近づいている');
  plotLine(dists.map((d) => Math.log10(Math.max(d, 1e-13))), hx, gy, gw, gh, -12, 1, C_TUBE, Math.max(30, dists.length), 2);
  say(modeSel === 1 ? 'cos は [0.54, 1] で傾きが sin 1 = 0.84 未満 → 毎回 0.84 倍以下に縮む' : modeSel === 2 ? '細かいゆれほど速く消え、だ円（いちばんゆるやかな成分）だけが残る' : '1 回ごとに距離は半分以下：はじめの形を忘れて三角形へ', hx, height - 30, 13, C_SUB);
  drawSelfTest();
}
function drawCobweb(ax, ay, aw, ah) {
  let X = (v) => ax + ((v + 3.2) / 6.4) * aw, Y = (v) => ay + ah - ((v + 1.6) / 3.2) * ah;
  stroke(col(C_SUB, 40)); strokeWeight(1); line(X(-3.2), Y(0), X(3.2), Y(0)); line(X(0), Y(-1.6), X(0), Y(1.6));
  stroke(col(C_BRASS)); strokeWeight(1.5); line(X(-1.6), Y(-1.6), X(1.6), Y(1.6));
  noFill(); stroke(col(C_SCOPE)); strokeWeight(2.5); beginShape(); for (let v = -3.2; v <= 3.2; v += 0.05) vertex(X(v), Y(Math.cos(v))); endShape();
  stroke(col(C_TUBE)); strokeWeight(2); noFill(); beginShape();
  vertex(X(xs[0]), Y(0)); for (let i = 0; i + 1 < xs.length; i++) { vertex(X(xs[i]), Y(xs[i + 1])); vertex(X(xs[i + 1]), Y(xs[i + 1])); } endShape();
  say('y = cos x（緑）と y = x（黄）。オレンジ = くり返しの道すじ（クモの巣図）', ax + 10, ay + 22, 13, C_SUB);
}
// だ円以外の成分の割合：Σ_{k ≠ ±1} |c_k|² ÷ Σ |c_k|²（重心 0 なので c_0 = 0）
function nonEllipse(P) {
  let n = P.length, tot = 0, ell = 0;
  for (let k = 0; k < n; k++) {
    let re = 0, im = 0; for (let j = 0; j < n; j++) { let a = (-TWO_PI * k * j) / n, x = P[j][0], y = P[j][1]; re += x * Math.cos(a) - y * Math.sin(a); im += x * Math.sin(a) + y * Math.cos(a); }
    let e = re * re + im * im; tot += e; if (k === 1 || k === n - 1) ell += e;
  }
  return tot > 0 ? 1 - ell / tot : 0;
}

function mousePressed() {
  if (modeSel === 1) { if (mouseX < 20 + width * 0.58 && mouseY > 90) { x0 = clampv(((mouseX - 20) / (width * 0.58)) * 6.4 - 3.2, -3.2, 3.2); restart(); } return; }
  drawing = [[mouseX, mouseY]];
}
function mouseDragged() { if (drawing) drawing.push([mouseX, mouseY]); }
function mouseReleased() {
  if (drawing && drawing.length > 8) { shape0 = resample(drawing.map((p) => [(p[0] - width * 0.3) / 120, (p[1] - height * 0.5) / 120]), NP); restart(); }
  drawing = null;
}
// 描いた線を、長さにそって等間隔の NP 点にする
function resample(path, n) {
  let L = [0]; for (let i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  let tot = L[L.length - 1] || 1, out = [], j = 0;
  for (let k = 0; k < n; k++) { let s = (k / n) * tot; while (j < L.length - 2 && L[j + 1] < s) j++; let f = (s - L[j]) / (L[j + 1] - L[j] || 1); out.push([path[j][0] + f * (path[j + 1][0] - path[j][0]), path[j][1] + f * (path[j + 1][1] - path[j][1])]); }
  return out;
}
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { modeSel = +key; restart(); }
  if (key === ' ') oneIter();
  if (key === 'a' || key === 'A') autoRun = !autoRun;
  if (key === 'r' || key === 'R') restart();
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let ok = true;
  for (let s of [0, 1, 3, -2]) { let x = s; for (let k = 0; k < 100; k++) x = opCos(x); if (!near(x, 0.7390851332151607, 1e-12)) ok = false; }
  check('cos を 100 回：x₀ = 0, 1, 3, −2 どれからでも 0.7390851332（誤差 < 1e-12）', ok);
  let x = 3, d = [], mono = true; for (let k = 0; k < 40; k++) { let y = opCos(x); d.push(Math.abs(y - x)); x = y; }
  for (let k = 2; k + 1 < d.length; k++) if (!(d[k + 1] < d[k]) && d[k] > 1e-15) mono = false;
  check('2 回目から先は変化 d が毎回へる（縮小写像）、比は sin 1 = 0.841 以下', mono && d.slice(2, 20).every((v, k) => d[k + 3] <= 0.8415 * v + 1e-15));
  let P = defaultShape(); for (let k = 0; k < 600; k++) P = opSmooth(P);
  check('平均の操作を 600 回：どんな形もだ円に（だ円以外の成分 ' + nonEllipse(P).toExponential(1) + ' < 1e-6）', nonEllipse(P) < 1e-6);
  let Q = normalizeShape(defaultShape());
  check('大きさをそろえる：重心 0、RMS 半径 1', near(Q.reduce((a, q) => a + q[0], 0), 0, 1e-12) && near(Math.sqrt(Q.reduce((a, q) => a + q[0] ** 2 + q[1] ** 2, 0) / NP), 1, 1e-12));
  let A = defaultShape().slice(0, 16).map((p) => [(p[0] + 1.6) / 3.2, (p[1] + 1.6) / 3.2]), h = [];
  for (let k = 0; k < 4; k++) { let B = opIFS(A); h.push(hausdorff(B, A)); A = B; }
  check('3 つのコピー：ハウスドルフ距離が毎回半分以下（' + h.map((v) => v.toFixed(3)).join(' → ') + '）', h.every((v, k) => k === 0 || v <= h[k - 1] / 2 + 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1 でクリックして x₀ をいろいろ変えよう。いつも同じ数に落ちつく？ 電卓で cos を押し続けても確かめられる（ラジアンで）
// 2. 2 でぐちゃぐちゃな形を描いてみよう。最後のだ円の形は、描いた形の何で決まる？
// 3. 3 で丸・線・文字を描いても、最後は同じ三角形になる？「はじめの形を忘れる」とはどういうこと？
// 4. IFS の 3 つの位置を 4 つに変えると、固有形はどうなる？
// 5. フォン・フェルスターは「ものとは、くり返しの固有のふるまいである」と考えた。言葉や習慣で同じことが起きる例は？


// ==================================================
// ここから下は「サイバネティクスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function fin(v, d) { return Number.isFinite(v) ? v : d; }        // NaN・Infinity なら d にもどす
// 決まった種（seed）から毎回同じ乱数列（0〜1）を出す。自己テストをいつも同じにするため
function makeRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- 画面の道具（色は [色相, 彩度, 明るさ] の配列）
const C_TXT = [40, 12, 96], C_SUB = [35, 18, 72], C_SCOPE = [135, 70, 92], C_TUBE = [24, 85, 100], C_BRASS = [42, 55, 88], C_ALARM = [0, 80, 100];
function col(c, a) { return color(c[0], c[1], c[2], a === undefined ? 100 : a); }
function say(s, x, y, size, c) { noStroke(); fill(col(c || C_TXT)); textSize(size || 15); text(s, x, y); }
// オシロスコープ風の枠
function plotFrame(x, y, w, h, title) {
  noStroke(); fill(130, 40, 6, 90); rect(x, y, w, h, 6);
  stroke(130, 40, 40, 40); strokeWeight(1);
  for (let k = 1; k < 4; k++) line(x, y + (h * k) / 4, x + w, y + (h * k) / 4);
  noFill(); stroke(C_BRASS[0], C_BRASS[1], 60); rect(x, y, w, h, 6);
  if (title) say(title, x + 8, y + 18, 13, C_SUB);
}
// arr の値を lo〜hi の範囲で、枠 (x, y, w, h) に折れ線で描く（n = 横に並べる点の数）
function plotLine(arr, x, y, w, h, lo, hi, c, n, wt) {
  if (!arr || arr.length < 2) return;
  n = n || arr.length;
  stroke(col(c)); strokeWeight(wt || 2); noFill();
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / (n - 1)) * w, y + h - clampv((fin(arr[i], lo) - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
function hLine(v, x, y, w, h, lo, hi, c) {   // グラフの中の水平線（目標値など）
  let yy = y + h - clampv((v - lo) / (hi - lo), 0, 1) * h;
  stroke(col(c, 70)); strokeWeight(1); drawingContext.setLineDash([6, 5]); line(x, yy, x + w, yy); drawingContext.setLineDash([]);
}
// ブロック図の箱（名前と今の値）
function blockBox(x, y, w, h, name, val, c) {
  stroke(col(c || C_BRASS)); strokeWeight(2); fill(25, 40, 16); rect(x, y, w, h, 8);
  noStroke(); fill(col(C_TXT)); textAlign(CENTER, CENTER); textSize(15); text(name, x + w / 2, y + h / 2 - (val === undefined ? 0 : 10));
  if (val !== undefined) { fill(col(c || C_TUBE)); textSize(14); text(val, x + w / 2, y + h / 2 + 12); }
  textAlign(LEFT, BASELINE);
}
// 信号の矢印：点が流れて「ループを回る」ようすを見せる（phase = 0〜1）
function flowArrow(x1, y1, x2, y2, c, phase, label) {
  stroke(col(c)); strokeWeight(2); line(x1, y1, x2, y2);
  let a = Math.atan2(y2 - y1, x2 - x1);
  noStroke(); fill(col(c)); triangle(x2, y2, x2 - 11 * Math.cos(a - 0.4), y2 - 11 * Math.sin(a - 0.4), x2 - 11 * Math.cos(a + 0.4), y2 - 11 * Math.sin(a + 0.4));
  for (let k = 0; k < 3; k++) { let f = (phase + k / 3) % 1; circle(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 6); }
  if (label) { fill(col(C_SUB)); textSize(13); text(label, (x1 + x2) / 2 + 6, (y1 + y2) / 2 - 6); }
}

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return Number.isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest() { say(selfTestLine(), 20, height - 16, 14, selfTestResults.every((r) => r.ok) ? C_SCOPE : C_ALARM); }
