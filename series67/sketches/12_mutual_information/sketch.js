// ============================================
// 12 相互情報量と独立 ─ 同時分布の表 p(x, y) から「独立な表の集まり」M への KL が相互情報量 I(X; Y)
// m-射影（06）の足は周辺分布の積 q = p(x)p(y)、I = D(p‖q) = H(X) + H(Y) − H(X, Y)。独立なら 0
// 3 変数（2 値 × 3）：全体の関係 D(p‖p1) = 「3 つ全体の関係」D(p‖p2) + 「2 つずつの関係」D(p2‖p1)
//   p1 = 3 つの周辺分布の積、p2 = 2 つずつの周辺分布を守るエントロピー最大の分布（反復比例あてはめ IPF）。XOR ではペアは独立なのに全体は 1 ビット
// 1 2×2　2 3×3　3 3 変数 / マス目を上下にドラッグ = 確率を増やす・減らす / P お手本を順に / R でたらめ
// ============================================

const PRESETS2 = ['独立', 'コピー（x = y）', '逆（x ≠ y）', 'ノイズつきコピー', 'でたらめ'];
const PRESETS3 = ['XOR（z = x ⊕ y）', '3 つとも同じ', 'x = y、z は独立', 'でたらめ'];
let modeK = 0, tab = [], preK = 0, grabCell = -1, lastY = 0, cells = [];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(12); applyPreset(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function dimK() { return modeK === 1 ? 3 : 2; }
// ---- 2 変数：tab[x*k + y]
function marg2(t, k) { let px = new Array(k).fill(0), py = new Array(k).fill(0); for (let x = 0; x < k; x++) for (let y = 0; y < k; y++) { px[x] += t[x * k + y]; py[y] += t[x * k + y]; } return [px, py]; }
function prod2(t, k) { let [px, py] = marg2(t, k), q = []; for (let x = 0; x < k; x++) for (let y = 0; y < k; y++) q.push(px[x] * py[y]); return q; }
function mutualInfo(t, k) { return divKL(t, prod2(t, k)); }
// ---- 3 変数（2 値）：tab[4x + 2y + z]
function idx3(x, y, z) { return 4 * x + 2 * y + z; }
function prod3(t) { let m = [0, 0, 0]; for (let i = 0; i < 8; i++) { if (i & 4) m[0] += t[i]; if (i & 2) m[1] += t[i]; if (i & 1) m[2] += t[i]; } return Array.from({ length: 8 }, (_, i) => [0, 1, 2].reduce((s, j) => s * ((i >> (2 - j)) & 1 ? m[j] : 1 - m[j]), 1)); }
function pairMarg(t, a, b) { let out = [0, 0, 0, 0]; for (let i = 0; i < 8; i++) out[2 * ((i >> (2 - a)) & 1) + ((i >> (2 - b)) & 1)] += t[i]; return out; }
function ipfPairwise(t) {                // ★ 反復比例あてはめ：一様から始めて、3 つのペアの周辺分布を順に合わせる
  let r = new Array(8).fill(1 / 8), pairs = [[0, 1], [1, 2], [0, 2]];
  for (let it = 0; it < 5000; it++) {
    let err = 0;
    for (let [a, b] of pairs) {
      let want = pairMarg(t, a, b), have = pairMarg(r, a, b);
      for (let i = 0; i < 8; i++) { let c = 2 * ((i >> (2 - a)) & 1) + ((i >> (2 - b)) & 1); r[i] = have[c] > 0 ? (r[i] * want[c]) / have[c] : 0; }
      err = Math.max(err, ...want.map((w, c) => Math.abs(w - have[c])));
    }
    if (err < 1e-15) break;
  }
  return r;
}
function applyPreset() {
  if (modeK < 2) {
    let k = dimK(), t = [];
    for (let x = 0; x < k; x++) for (let y = 0; y < k; y++) {
      let v = [((x + 1) * (y + 2)) % 5 + 1, x === y ? 1 : 0, x !== y ? 1 : 0, x === y ? 0.85 : 0.15 / (k - 1), rnd()][preK];
      if (preK === 0) v = (x + 1) * (k - y + 1);   // 独立：行と列の積
      t.push(v);
    }
    tab = mixFloor(normP(t), 1e-4);
  } else {
    let t = [];
    for (let i = 0; i < 8; i++) { let x = (i >> 2) & 1, y = (i >> 1) & 1, z = i & 1; t.push([z === (x ^ y) ? 1 : 0, x === y && y === z ? 1 : 0, x === y ? 1 : 0, rnd()][preK]); }
    tab = normP(t);
  }
}

function draw() {
  background(...BG);
  let names = modeK < 2 ? PRESETS2 : PRESETS3;
  hudTitle('相互情報量と独立：独立な表の集まりへの KL', '1 2×2　2 3×3　3 3 変数　マス目を上下にドラッグ　P お手本（' + names[preK % names.length] + '）　R でたらめ');
  if (modeK < 2) draw2(); else draw3();
  drawSelfTest(width - 180, height - 14);
}
function drawTable(t, k1, k2, x0, y0, cs, title, col, store) {   // 表を色の濃さで（store = ドラッグ用に位置を覚える）
  noStroke(); fill(...col); textSize(15); textAlign(LEFT, BASELINE); text(title, x0, y0 - 10);
  let mx = Math.max(...t);
  for (let a = 0; a < k1; a++) for (let b = 0; b < k2; b++) {
    let v = t[a * k2 + b], x = x0 + b * cs, y = y0 + a * cs;
    fill(...col.map((c) => 30 + (c - 30) * Math.sqrt(v / Math.max(mx, 1e-9)))); stroke(...WIRE); strokeWeight(1); rect(x, y, cs - 4, cs - 4, 6);
    noStroke(); fill(...INK); textAlign(CENTER, CENTER); textSize(14); text(fmtN(v, 3), x + cs / 2 - 2, y + cs / 2 - 2);
    if (store) cells.push({ x, y, w: cs - 4, h: cs - 4, i: a * k2 + b });
  }
}
function draw2() {
  let k = dimK(), cs = Math.min(110, (height - 300) / k), q = prod2(tab, k), [px, py] = marg2(tab, k), I = mutualInfo(tab, k);
  cells = [];
  drawTable(tab, k, k, 70, 140, cs, '同時分布 p(x, y)（行 = x、列 = y）', ORANGE, true);
  drawTable(q, k, k, 120 + k * cs, 140, cs, '周辺分布の積 q = p(x)p(y)', VIOLET, false);
  noStroke(); fill(...DIMC); textSize(13); textAlign(LEFT, BASELINE);
  text('p(x) = ' + fmtP(px, 3) + '　p(y) = ' + fmtP(py, 3), 70, 170 + k * cs);
  let u = new Array(k * k).fill(1 / (k * k)), y0 = 220 + k * cs, Hx = entropyH(px), Hy = entropyH(py), Hxy = entropyH(tab);
  fill(...INK); textSize(17);
  text('相互情報量 I(X; Y) = D(p‖q) = ' + fmtN(bitsOf(I), 5) + ' ビット', 70, y0);
  fill(...DIMC); textSize(15);
  text('H(X) + H(Y) − H(X, Y) = ' + fmtN(bitsOf(Hx), 4) + ' + ' + fmtN(bitsOf(Hy), 4) + ' − ' + fmtN(bitsOf(Hxy), 4) + ' = ' + fmtN(Math.max(0, bitsOf(Hx + Hy - Hxy)), 5) + ' ビット', 70, y0 + 28);
  fill(...LIME);
  text('ピタゴラス：D(p‖一様) = ' + fmtN(divKL(tab, u), 5) + ' = I + D(q‖一様) = ' + fmtN(I, 5) + ' + ' + fmtN(divKL(q, u), 5) + '（ナット）', 70, y0 + 56);
  fill(...DIMC); textSize(14);
  text('I = 0 ⇔ 表が独立（q と同じ）。x を知ると y について平均 I ビット分かる', 70, y0 + 84);
  text('q は「独立なモデル」の最尤推定（06 の m-射影）。どの独立な r でも D(p‖r) = I + D(q‖r)', 70, y0 + 106);
}
function draw3() {
  let cs = Math.min(90, (height - 380) / 2), p1 = prod3(tab), p2 = ipfPairwise(tab), tot = divKL(tab, p1), three = divKL(tab, p2), two = divKL(p2, p1);
  cells = [];
  let half = (t, z) => [t[idx3(0, 0, z)], t[idx3(0, 1, z)], t[idx3(1, 0, z)], t[idx3(1, 1, z)]];
  for (let z = 0; z < 2; z++) drawTable(half(tab, z), 2, 2, 70 + z * (2 * cs + 40), 140, cs, 'p（z = ' + z + '）', ORANGE, false);
  // ドラッグ用のマス目（z ごとの表の位置から 8 個の番号へ）
  for (let z = 0; z < 2; z++) for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) cells.push({ x: 70 + z * (2 * cs + 40) + y * cs, y: 140 + x * cs, w: cs - 4, h: cs - 4, i: idx3(x, y, z) });
  for (let z = 0; z < 2; z++) drawTable(half(p2, z), 2, 2, width * 0.55 + z * (2 * cs + 40), 140, cs, 'p2：ペアだけ守る（z = ' + z + '）', VIOLET, false);
  let y0 = 200 + 2 * cs; noStroke(); textAlign(LEFT, BASELINE); textSize(16);
  let mi = (a, b) => { let m = pairMarg(tab, a, b); return mutualInfo(m, 2); };
  fill(...DIMC); text('2 つずつの相互情報量：I(X;Y) = ' + fmtN(bitsOf(mi(0, 1)), 4) + '　I(Y;Z) = ' + fmtN(bitsOf(mi(1, 2)), 4) + '　I(X;Z) = ' + fmtN(bitsOf(mi(0, 2)), 4) + ' ビット', 70, y0);
  fill(...INK); textSize(17);
  text('全体の関係 D(p‖p1) = ' + fmtN(bitsOf(tot), 6) + ' ビット（p1 = 3 つの周辺分布の積）', 70, y0 + 36);
  fill(...ORANGE); text('= 3 つ全体の関係 D(p‖p2) = ' + fmtN(bitsOf(three), 6), 70, y0 + 64);
  fill(...VIOLET); text('+ 2 つずつの関係 D(p2‖p1) = ' + fmtN(bitsOf(two), 6), 70, y0 + 92);
  fill(...LIME); textSize(15); text('差 = ' + (tot - three - two).toExponential(1) + '（ピタゴラスで、ぴったり 2 つに分かれる）', 70, y0 + 120);
  fill(...DIMC); textSize(14); text('XOR：どの 2 つも独立（ペアの相互情報量 0）なのに、3 つ全体では 1 ビットの関係（z は x と y の両方を見ないと分からない）', 70, y0 + 150);
}
function mousePressed() { grabCell = -1; for (let c of cells) if (inRect(mouseX, mouseY, c)) grabCell = c.i; lastY = mouseY; }
function mouseDragged() {
  if (grabCell < 0) return;
  let f = Math.exp(-(mouseY - lastY) * 0.02); lastY = mouseY;          // 上へドラッグ = 増やす
  let t = tab.slice(); t[grabCell] = Math.max(t[grabCell], 1e-4) * f; tab = mixFloor(normP(t), modeK < 2 ? 1e-4 : 0);
}
function mouseReleased() { grabCell = -1; }
function keyPressed() {
  for (let k = 1; k <= 3; k++) if (key === String(k)) { modeK = k - 1; preK = 0; applyPreset(); }
  if (key === 'p' || key === 'P') { preK = (preK + 1) % (modeK < 2 ? PRESETS2.length : PRESETS3.length); applyPreset(); }
  if (key === 'r' || key === 'R') { preK = modeK < 2 ? 4 : 3; applyPreset(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(1212); let okEq = true, okPos = true, okInd = true, okPy = true;
  for (let n = 0; n < 200; n++) {
    let k = 2 + (n % 3), t = rndDist(k * k, 1e-4), [px, py] = marg2(t, k), I = mutualInfo(t, k);
    if (Math.abs(I - (entropyH(px) + entropyH(py) - entropyH(t))) > 1e-12) okEq = false;
    if (!(I >= 0)) okPos = false;
    let ind = prod2(t, k); if (mutualInfo(ind, k) > 1e-14) okInd = false;
    let a = rndDist(k), b = rndDist(k), r = []; for (let x = 0; x < k; x++) for (let y = 0; y < k; y++) r.push(a[x] * b[y]);
    if (Math.abs(divKL(t, r) - I - divKL(ind, r)) > 1e-10) okPy = false;
  }
  check('I(X;Y) = D(p‖p(x)p(y)) = H(X) + H(Y) − H(X,Y)（200 個の表、誤差 1e-12）', okEq);
  check('I ≥ 0、独立な表なら I = 0', okPos && okInd);
  check('どの独立な r でも D(p‖r) = I + D(q‖r)（ピタゴラス、誤差 1e-10）', okPy);
  let okD = true, okM = true;
  for (let n = 0; n < 50; n++) {
    let t = rndDist(8, 1e-3), p1 = prod3(t), p2 = ipfPairwise(t);
    if (Math.abs(divKL(t, p1) - divKL(t, p2) - divKL(p2, p1)) > 1e-10) okD = false;
    for (let [a, b] of [[0, 1], [1, 2], [0, 2]]) if (pairMarg(p2, a, b).some((v, c) => Math.abs(v - pairMarg(t, a, b)[c]) > 1e-12)) okM = false;
  }
  check('3 変数：D(p‖p1) = D(p‖p2) + D(p2‖p1)（50 個、誤差 1e-10）', okD);
  check('IPF の p2 は 3 つのペアの周辺分布をすべて守る（誤差 1e-12）', okM);
  let xor = normP(Array.from({ length: 8 }, (_, i) => ((i & 1) === (((i >> 2) & 1) ^ ((i >> 1) & 1)) ? 1 : 0))), x2 = ipfPairwise(xor);
  check('XOR：ペアの相互情報量はすべて 0、3 つ全体の関係 D(p‖p2) = 1 ビット', [[0, 1], [1, 2], [0, 2]].every(([a, b]) => mutualInfo(pairMarg(xor, a, b), 2) < 1e-15) && Math.abs(bitsOf(divKL(xor, x2)) - 1) < 1e-12);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 2×2 で「コピー」の表は何ビット？ ノイズを増やす（対角を下げる）と I はどう減る？
// 2. 3×3 でコピーの表は log₂3 ≈ 1.585 ビット。なぜ 2×2 より大きい？
// 3. 3 変数で「3 つとも同じ」の表は、全体の関係のうち何割が「2 つずつ」で説明できる？
// 4. XOR の表のマスを 1 つ少しだけ変えると、D(p2‖p1) は 0 からどう動く？
// 5. 暗号の「秘密分散」は XOR と同じ形：2 人だけでは何も分からず、3 人そろうと分かる

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestOk() { return selfTestResults.every((r) => r.ok); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestOk() ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
