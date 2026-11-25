// ============================================
// 15 カメラ映像の色の分布 📷 ─ 画面を 8×6 のブロックに分け、ブロックごとに「色の分布」（8 色のヒストグラム）を作る
// R で記録した基準の分布とのフィッシャー-ラオ距離 d = 2 arccos(Σ√(p q))（13 の球の上の大円）をヒートマップに
// 動いた所・照明が変わった所が「分布の距離」で光る。K で KL ダイバージェンスに切りかえ（数え始めに 0.5 を足して log 0 を防ぐ）
// R 基準を記録 / K 距離 ⇔ KL / ↑↓ 色の濃さ / C カメラ ⇔ テスト画像 / S 画面を保存 / マウスを映像に乗せる = そのブロックの分布
// ============================================

const CAM_W = 64, CAM_H = 48, BX = 8, BY = 6;   // ★ 映像の大きさとブロックの数
const BIN_NAMES = ['黒', '灰', '白', '赤', '黄', '緑', '青', '紫'];
const PSEUDO = 0.5;                       // ★ 各色に最初から足しておく数（0 の色をなくす）
let cap = null, useCam = true, refH = null, curH = null, useKL = false, gain = 1, testImg = null, flash = 0, seen = 0, lastLive = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  testImg = createImage(CAM_W, CAM_H);
  try { cap = createCapture(VIDEO, { flipped: true }); cap.size(CAM_W, CAM_H); cap.hide(); } catch (e) { cap = null; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function camLive() { return useCam && cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0; }
// ★ 1 画素の色 → 8 色のどれか（暗い = 黒、色がうすい = 灰か白、それ以外は色相で 5 色）
function colorBin(r, g, b) {
  let mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx < 50) return 0;
  if (mx - mn < 40) return mx < 160 ? 1 : 2;
  let h; if (mx === r) h = (60 * (g - b)) / (mx - mn); else if (mx === g) h = 120 + (60 * (b - r)) / (mx - mn); else h = 240 + (60 * (r - g)) / (mx - mn);
  h = (h + 360) % 360;
  return h < 30 || h >= 330 ? 3 : h < 90 ? 4 : h < 180 ? 5 : h < 270 ? 6 : 7;
}
function blockHists(px) {                // 画素の列（RGBA）→ 48 個のヒストグラム（合計 1）
  let H = []; for (let k = 0; k < BX * BY; k++) H.push(new Array(8).fill(PSEUDO));
  let bw = CAM_W / BX, bh = CAM_H / BY;
  for (let y = 0; y < CAM_H; y++) for (let x = 0; x < CAM_W; x++) { let o = 4 * (y * CAM_W + x); H[Math.floor(y / bh) * BX + Math.floor(x / bw)][colorBin(px[o], px[o + 1], px[o + 2])]++; }
  return H.map(normP);
}
// ---- テスト画像（カメラがないとき）：色の帯 ＋ 動く丸 ＋ ゆっくり変わる明るさ
function testFrame(t, out) {
  let cx = 32 + 22 * Math.cos(t * 0.6), cy = 24 + 12 * Math.sin(t * 0.9), lum = 0.75 + 0.25 * Math.sin(t * 0.25);
  for (let y = 0; y < CAM_H; y++) for (let x = 0; x < CAM_W; x++) {
    let o = 4 * (y * CAM_W + x), band = Math.floor(x / 16), c = [[200, 60, 50], [60, 160, 80], [60, 90, 200], [220, 200, 70]][band];
    if (y > 36) c = [200, 200, 200];
    if ((x - cx) ** 2 + (y - cy) ** 2 < 49) c = [170, 70, 200];
    out[o] = c[0] * lum; out[o + 1] = c[1] * lum; out[o + 2] = c[2] * lum; out[o + 3] = 255;
  }
  return out;
}
function distOf(p, q) { return useKL ? divKL(p, q) : fisherRao(p, q); }

function draw() {
  background(...BG);
  hudTitle('カメラ映像の色の分布：' + (useKL ? 'KL(いま‖基準)' : 'フィッシャー-ラオ距離') + '（' + (camLive() ? 'カメラ' : 'テスト画像') + '）', 'R 基準を記録　K 距離 ⇔ KL　↑↓ 色の濃さ ×' + fmtN(gain, 1) + '　C カメラ ⇔ テスト画像　S 画面を保存　映像にマウス = そのブロック');
  let src, px, live = camLive();
  if (live !== lastLive) { lastLive = live; seen = 0; curH = null; }   // カメラが動き出した・切りかえた → 基準を取り直す
  if (live) { cap.loadPixels(); px = cap.pixels; src = cap; }
  if (!px || px.length < CAM_W * CAM_H * 4) { testImg.loadPixels(); testFrame(millis() / 1000, testImg.pixels); testImg.updatePixels(); px = testImg.pixels; src = testImg; }
  let now = blockHists(px);
  curH = curH ? curH.map((h, k) => h.map((v, i) => 0.6 * v + 0.4 * now[k][i])) : now;   // 少しなめらかに（ちらつき防止）
  if (!refH || seen++ < 30) refH = curH.map((h) => h.slice());   // 最初の 0.5 秒は基準を更新（カメラの立ち上がりを待つ）
  // ---- 左：映像とヒートマップ
  let vw = Math.min(width * 0.55, (height - 170) * (4 / 3)), vh = vw * 0.75, vx = 30, vy = 90, cw = vw / BX, chh = vh / BY;
  image(src, vx, vy, vw, vh);
  let ds = curH.map((h, k) => distOf(h, refH[k])), dmax = useKL ? 1.5 : 1.2;
  for (let k = 0; k < BX * BY; k++) {
    let t = clampv((ds[k] * gain) / dmax, 0, 1), x = vx + (k % BX) * cw, y = vy + Math.floor(k / BX) * chh;
    noStroke(); fill(ORANGE[0], ORANGE[1] * (1 - 0.4 * t), ORANGE[2] * (1 - t), 200 * t); rect(x, y, cw, chh);
    stroke(...INK, 40); strokeWeight(1); noFill(); rect(x, y, cw, chh);
    noStroke(); fill(...INK, 120 + 135 * t); textSize(11); textAlign(LEFT, TOP); text(fmtN(ds[k], 2), x + 3, y + 3);
  }
  if (flash > 0) { flash--; noStroke(); fill(...LIME, flash * 4); rect(vx, vy, vw, vh); }
  // ---- 右：ブロックの分布
  let sel = inRect(mouseX, mouseY, { x: vx, y: vy, w: vw, h: vh }) ? clampv(Math.floor((mouseY - vy) / chh), 0, BY - 1) * BX + clampv(Math.floor((mouseX - vx) / cw), 0, BX - 1) : ds.indexOf(Math.max(...ds));
  let rx = vx + vw + 40, rw = width - rx - 30;
  { let x = vx + (sel % BX) * cw, y = vy + Math.floor(sel / BX) * chh; stroke(...LIME); strokeWeight(3); noFill(); rect(x, y, cw, chh); }
  drawBars(curH[sel], { x: rx, y: 130, w: rw, h: 150 }, { names: BIN_NAMES, ghost: refH[sel], vmax: 1, cols: [[70, 70, 80], [150, 150, 160], [235, 235, 235], [235, 80, 70], [235, 210, 70], [90, 200, 110], [80, 130, 235], [180, 100, 230]] });
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE);
  text('ブロック ' + sel + ' の色の分布（白い枠 = 基準）', rx, 112);
  let p = curH[sel], q = refH[sel];
  text('フィッシャー-ラオ d = ' + fmtN(fisherRao(p, q), 4), rx, 330);
  text('KL(いま‖基準) = ' + fmtN(divKL(p, q), 4) + '　KL(基準‖いま) = ' + fmtN(divKL(q, p), 4), rx, 354);
  fill(...DIMC); textSize(13);
  text('ヘリンジャー Σ(√p − √q)² = ' + fmtN(hellingerSq(p, q), 4) + '　全変動 = ' + fmtN(tvDist(p, q), 4), rx, 378);
  text('d は 0〜π の本当の距離（三角不等式 OK）、KL は向きがある', rx, 402);
  let all = normP(curH.reduce((s, h) => s.map((v, i) => v + h[i]), new Array(8).fill(0))), allR = normP(refH.reduce((s, h) => s.map((v, i) => v + h[i]), new Array(8).fill(0)));
  text('画面全体の分布の距離 d = ' + fmtN(fisherRao(all, allR), 4) + '（動きは打ち消し合うことがある）', rx, 430);
  text('照明が変わると全部のブロックが少しずつ、動いた所は 1 か所が大きく光る', rx, 452);
  drawSelfTest(width - 180, height - 14);
}
function keyPressed() {
  if (key === 'r' || key === 'R') { refH = curH ? curH.map((h) => h.slice()) : null; flash = 40; }
  if (key === 'k' || key === 'K') useKL = !useKL;
  if (key === UP_ARROW) gain = Math.min(5, gain * 1.25);
  if (key === DOWN_ARROW) gain = Math.max(0.2, gain / 1.25);
  if (key === 'c' || key === 'C') { useCam = !useCam; curH = null; refH = null; }
  if (key === 's' || key === 'S') saveCanvas('color_distribution', 'png');
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let a = testFrame(0, new Uint8ClampedArray(CAM_W * CAM_H * 4)), b = testFrame(8 * Math.PI, new Uint8ClampedArray(CAM_W * CAM_H * 4)), Ha = blockHists(a), Hb = blockHists(b);
  check('48 個のヒストグラムはどれも合計 1、0 の色はない（数え始め 0.5）', Ha.every((h) => Math.abs(h.reduce((s, v) => s + v, 0) - 1) < 1e-12 && h.every((v) => v > 0)));
  check('色の判定：黒・灰・白・赤・黄・緑・青・紫', [[10, 10, 10], [120, 120, 125], [240, 240, 235], [220, 40, 30], [220, 210, 40], [40, 200, 60], [40, 80, 220], [170, 60, 210]].every((c, i) => colorBin(...c) === i));
  let okSym = true, okArc = true; seedRng(15);
  for (let k = 0; k < 100; k++) {
    let p = rndDist(8, 0.01), q = rndDist(8, 0.01), d = fisherRao(p, q);
    if (Math.abs(d - fisherRao(q, p)) > 1e-15 || d < 0 || d > Math.PI) okSym = false;
    let sp = p.map(Math.sqrt), sq = q.map(Math.sqrt), om = Math.acos(clampv(bhatta(p, q), -1, 1)), L = 0, prev = sp;   // 半径 1 の球の大円を 500 分割
    for (let j = 1; j <= 500; j++) { let t = j / 500, cur = sp.map((v, i) => (Math.sin((1 - t) * om) * v + Math.sin(t * om) * sq[i]) / Math.sin(om)); L += Math.sqrt(cur.reduce((s, v, i) => s + (v - prev[i]) ** 2, 0)); prev = cur; }
    if (Math.abs(2 * L - d) > 1e-5) okArc = false;
  }
  check('d は向きによらず 0〜π、8 色でも d = 2 × 単位球の大円の長さ（誤差 1e-5）', okSym && okArc);
  check('同じ分布なら d = 0、KL = 0', Ha.every((h) => fisherRao(h, h) < 1e-6 && divKL(h, h) === 0));
  let ds = Ha.map((h, k) => fisherRao(h, Hb[k])), still = ds[44], moved = Math.max(...ds);
  check('テスト画像（明るさが同じ 2 つの時刻）：丸が動いたブロックの距離 ' + fmtN(moved, 2) + ' は、動かない下の帯 ' + fmtN(still, 3) + ' よりずっと大きい', moved > 0.5 && still < 0.05);
  let kl = Ha.map((h, k) => divKL(h, Hb[k]));
  check('数え始め 0.5 のおかげで KL はどこでも有限', kl.every((v) => isFinite(v)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 手をふって、どのブロックが光るか見よう。R で基準を取り直すと？
// 2. 部屋の明かりを少し暗くすると、全部のブロックが同時に変わる？（テスト画像でも明るさがゆっくり変わる）
// 3. K で KL に切りかえよう。基準に「なかった色」が現れると KL は大きくなりやすい。なぜ？
// 4. PSEUDO を 0.01 にすると KL はどう変わる？ 0 にするとどうなる？（log 0 に注意）
// 5. BX, BY を 16, 12 にすると細かくなるが、1 ブロックの画素は 16 個だけ。分布はどれくらい信用できる？

// ==================================================
// ここから下は「情報幾何の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（等高線地図の色）
const BG = [22, 33, 52];                // 背景（深いスレートブルー）
const INK = [240, 236, 226];            // 文字（紙の白）
const ORANGE = [255, 150, 75], VIOLET = [170, 140, 255], TEAL = [95, 205, 190], ROSE = [255, 110, 125], LIME = [150, 225, 120], SAND = [235, 210, 150];
const DIMC = [140, 152, 175], PANEL = [32, 46, 70], WIRE = [62, 80, 110];
const OUTC = [[255, 150, 75], [95, 205, 190], [170, 140, 255], [235, 210, 150], [255, 110, 125], [150, 225, 120], [120, 175, 255], [230, 140, 210]];   // 結果ごとの色
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; return v.toFixed(d === undefined ? 2 : d); }
function fmtP(p, d) { return '(' + p.map((v) => fmtN(v, d === undefined ? 2 : d)).join(', ') + ')'; }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function drawField(f) { if (f) image(f.img, f.x, f.y, f.w, f.h); }   // 等高線の地図（画像）を描く
function freeField(f) { if (f && f.img) f.img.remove(); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function gaussRnd() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布（ボックス-ミュラー法）
function rndDist(k, floor) {            // でたらめな確率分布（k 個、どれも floor 以上）
  let p = []; for (let i = 0; i < k; i++) p.push(-Math.log(1 - rnd()) + 1e-9);
  return mixFloor(normP(p), floor || 0);
}
function sampleIndex(p) { let u = rnd(), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }
// ---- 情報の道具：確率分布 p = [p1, p2, ...]（合計 1）。log(0) は 0·log 0 = 0 として扱う
const TINY = 1e-300;
function normP(p) { let s = 0; for (let v of p) s += Math.max(0, v); if (!(s > 0)) return p.map(() => 1 / p.length); return p.map((v) => Math.max(0, v) / s); }
function mixFloor(p, f) { if (!f) return p; return normP(p.map((v) => Math.max(v, f))); }   // どの確率も f 以上に（0 を避ける）
function safeLog(v) { return Math.log(Math.max(v, TINY)); }
function entropyH(p) { let h = 0; for (let v of p) if (v > 0) h -= v * Math.log(v); return h; }           // エントロピー（ナット）
function divKL(p, q) {                  // KL ダイバージェンス D(p‖q)（ナット）。q が 0 で p > 0 なら ∞
  let d = 0;
  for (let i = 0; i < p.length; i++) { if (p[i] <= 0) continue; if (q[i] <= 0) return Infinity; d += p[i] * Math.log(p[i] / q[i]); }
  return Math.max(0, d);
}
function crossH(p, q) { let h = 0; for (let i = 0; i < p.length; i++) if (p[i] > 0) h -= p[i] * safeLog(q[i]); return h; }  // 交差エントロピー
function bhatta(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.sqrt(Math.max(0, p[i] * q[i])); return Math.min(1, s); }
function fisherRao(p, q) { return 2 * Math.acos(clampv(bhatta(p, q), -1, 1)); }                          // フィッシャー-ラオ距離 = 球の大円の長さ
function hellingerSq(p, q) { let s = 0; for (let i = 0; i < p.length; i++) { let d = Math.sqrt(p[i]) - Math.sqrt(q[i]); s += d * d; } return s; }   // Σ(√p − √q)²
function tvDist(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]); return s / 2; }
function alphaDiv(p, q, a) {            // α-ダイバージェンス（甘利の流儀）。α → −1 で D(p‖q)、α → +1 で D(q‖p)
  if (Math.abs(a + 1) < 1e-12) return divKL(p, q);
  if (Math.abs(a - 1) < 1e-12) return divKL(q, p);
  let s = 0, ea = (1 - a) / 2, eb = (1 + a) / 2;
  for (let i = 0; i < p.length; i++) s += Math.pow(Math.max(p[i], 0), ea) * Math.pow(Math.max(q[i], 0), eb);
  return Math.max(0, (4 / (1 - a * a)) * (1 - s));
}
function mixM(p, q, t) { return p.map((v, i) => (1 - t) * v + t * q[i]); }                       // m-測地線：確率をそのまま混ぜる
function mixE(p, q, t) { return normP(p.map((v, i) => Math.exp((1 - t) * safeLog(v) + t * safeLog(q[i])))); }   // e-測地線：対数で混ぜて正規化
function mixAlpha(p, q, t, a) {         // α-測地線：u^((1−α)/2) で混ぜて正規化（α = −1 は m、α = +1 は e）
  if (Math.abs(a - 1) < 1e-9) return mixE(p, q, t);
  let ex = (1 - a) / 2;
  return normP(p.map((v, i) => Math.pow((1 - t) * Math.pow(v, ex) + t * Math.pow(q[i], ex), 1 / ex)));
}
function bitsOf(nat) { return nat / Math.LN2; }
// ---- 棒グラフ（ドラッグで高さを変えられる）
function drawBars(p, r, opt) {          // r = {x, y, w, h}、opt = {cols, names, vmax, ghost（重ねて描く別の分布）}
  opt = opt || {};
  let k = p.length, bw = r.w / k, vmax = opt.vmax || 1;
  stroke(...WIRE); strokeWeight(1); line(r.x, r.y + r.h, r.x + r.w, r.y + r.h);
  for (let i = 0; i < k; i++) {
    let hh = (clampv(p[i], 0, vmax) / vmax) * r.h, col = (opt.cols || OUTC)[i % 8];
    noStroke(); fill(...col, 210); rect(r.x + i * bw + 3, r.y + r.h - hh, bw - 6, hh, 3);
    if (opt.ghost) { let gh = (clampv(opt.ghost[i], 0, vmax) / vmax) * r.h; noFill(); stroke(...INK); strokeWeight(1.5); rect(r.x + i * bw + 3, r.y + r.h - gh, bw - 6, gh, 3); }
    noStroke(); fill(...INK); textSize(12); textAlign(CENTER, BASELINE);
    if (bw >= 30) text(fmtN(p[i], 2), r.x + (i + 0.5) * bw, r.y + r.h - hh - 4);   // 細い棒では数字を省く
    fill(...DIMC); text(opt.names ? opt.names[i] : String(i + 1), r.x + (i + 0.5) * bw, r.y + r.h + 15);
  }
}
function barsDrag(p, r, mx, my, floor) {  // 棒をドラッグ：i 番目の高さを変えて、残りを比例で縮める（合計 1 のまま）
  let k = p.length, i = Math.floor((mx - r.x) / (r.w / k));
  if (i < 0 || i >= k || my < r.y - 30 || my > r.y + r.h + 20) return p;
  let v = clampv((r.y + r.h - my) / r.h, floor || 0.001, 1 - (floor || 0.001) * (k - 1)), rest = 1 - p[i], q = p.slice();
  for (let j = 0; j < k; j++) q[j] = j === i ? v : rest > 1e-9 ? (p[j] / rest) * (1 - v) : (1 - v) / (k - 1);
  return mixFloor(q, floor || 0.001);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestOk() { return selfTestResults.every((r) => r.ok); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestOk() ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
