// ============================================
// 13 電磁波のスペクトル ─ 電波から ガンマ線まで、みんな同じ電磁波
// 波長 λ と周波数 f は c = fλ（c = 3.00×10⁸ m/s）、光子 1 個のエネルギーは E = hf = hc/λ
// 波長を対数の目盛りで並べ、身近な例と比べる。下の図は電場 E（たて）と磁場 B（横）が直角にゆれながら進む波
// 帯をクリック・ドラッグ = 波長をえらぶ / ←→ = 少しずつ / 1〜7 = 帯へジャンプ / スペース = 波を止める
// ============================================

const C_LIGHT = 2.998e8, H_PL = 6.626e-34, QE = 1.602e-19;   // 光の速さ [m/s]、プランク定数 [J·s]、電気素量 [C]
const LMAX = 1e4, LMIN = 1e-13;        // 帯のはし：10 km 〜 0.1 pm
const BANDS = [                        // ★ 名前・波長の範囲 [m]（境目はおおよそ。X 線とガンマ線は重なっている）
  { name: '電波（ラジオ・テレビ）', lo: 1, hi: 1e4, col: [200, 120, 70] },
  { name: 'マイクロ波', lo: 1e-3, hi: 1, col: [220, 160, 80] },
  { name: '赤外線', lo: 780e-9, hi: 1e-3, col: [200, 70, 60] },
  { name: '可視光', lo: 380e-9, hi: 780e-9, col: [255, 255, 255] },
  { name: '紫外線', lo: 10e-9, hi: 380e-9, col: [150, 90, 230] },
  { name: 'X 線', lo: 1e-11, hi: 10e-9, col: [90, 160, 230] },
  { name: 'ガンマ線', lo: 1e-13, hi: 1e-11, col: [80, 220, 200] },
];
const EXAMPLES = [                     // ★ 身近な例（波長 [m]）
  ['AM ラジオ 1 MHz', 300], ['FM ラジオ 80 MHz', 3.75], ['地デジ 500 MHz', 0.6], ['電子レンジ・Wi-Fi 2.45 GHz', 0.1224], ['5G ミリ波 28 GHz', 0.0107],
  ['体から出る赤外線', 10e-6], ['テレビのリモコン', 940e-9], ['赤い光', 650e-9], ['緑の光', 530e-9], ['青い光', 450e-9],
  ['日焼けの紫外線（UV-B）', 300e-9], ['殺菌灯', 254e-9], ['レントゲン（X 線）', 2e-11], ['コバルト 60 のガンマ線', 9.3e-13],
];
const SIZES = [['サッカー場', 100], ['人の背', 1.7], ['ハチ', 0.01], ['髪の毛の太さ', 1e-4], ['細胞', 1e-5], ['ウイルス', 1e-7], ['分子', 1e-9], ['原子', 1e-10], ['原子核', 1e-14]];
let lamSel = 530e-9, phase = 0, moving = true, bar;

function setup() {
  createCanvas(windowWidth, windowHeight);
  bar = { x: 40, y: 150, w: width - 80, h: 60 };
  selfTest();
}
function xOf(l) { return bar.x + (Math.log10(LMAX / l) / Math.log10(LMAX / LMIN)) * bar.w; }
function lOf(x) { return LMAX / Math.pow(10, ((x - bar.x) / bar.w) * Math.log10(LMAX / LMIN)); }

function draw() {
  background(14, 18, 26);
  if (moving) phase += 0.06;
  // ---- 帯
  BANDS.forEach((b, i) => { noStroke(); fill(b.col[0], b.col[1], b.col[2], 70); rect(xOf(b.hi), bar.y, xOf(b.lo) - xOf(b.hi), bar.h); fill(230); textSize(13); text(b.name, xOf(b.hi) + 4, bar.y - 8 - (i === 4 ? 18 : 0)); });
  for (let x = xOf(780e-9); x < xOf(380e-9); x++) { let c = wavelengthRGB(lOf(x) * 1e9); stroke(c[0], c[1], c[2]); line(x, bar.y, x, bar.y + bar.h); }
  stroke(90); noFill(); rect(bar.x, bar.y, bar.w, bar.h);
  noStroke(); fill(160); textSize(11);
  for (let e = 4; e >= -13; e--) { let x = xOf(Math.pow(10, e)); stroke(90); line(x, bar.y + bar.h, x, bar.y + bar.h + 6); noStroke(); text(lenLabel(Math.pow(10, e)), x - 14, bar.y + bar.h + 20); }
  // 例
  textSize(11);
  EXAMPLES.forEach((ex, i) => { let x = xOf(ex[1]), y = bar.y + bar.h + 34 + (i % 5) * 15; stroke(200, 200, 200, 90); line(x, bar.y + bar.h, x, y - 10); noStroke(); fill(200); text(ex[0], x - 4, y); });
  // 選んだ波長
  let xs = xOf(lamSel); stroke(255, 230, 120); strokeWeight(3); line(xs, bar.y - 24, xs, bar.y + bar.h + 4); strokeWeight(1);
  // ---- 数字
  let f = C_LIGHT / lamSel, EJ = H_PL * f, band = bandOf(lamSel), y = bar.y + bar.h + 128;
  noStroke(); fill(255, 230, 120); textSize(22);
  text('λ = ' + lenLabel(lamSel, true) + '　→　f = c/λ = ' + freqLabel(f) + '　→　光子のエネルギー E = hf = ' + sci(EJ) + ' J = ' + sci(EJ / QE) + ' eV', 40, y);
  fill(235); textSize(16); text('「' + band + '」　1 秒に ' + sci(f) + ' 回ゆれる。' + nearestExample(lamSel), 40, y + 30);
  fill(170); textSize(13);
  text('E が 1.6〜3.3 eV（可視光）くらいから上は、1 個の光子で分子の結合をこわせる（紫外線で日焼け）。電子レンジの光子は 10⁻⁵ eV しかなく、たくさん当てて水を温める', 40, y + 52, width - 80);
  drawWave(40, y + 90, width - 80, height - y - 150);
  fill(235); textSize(17); noStroke();
  text('帯をクリック・ドラッグで波長をえらぶ　←→ 少しずつ　1〜7 帯へジャンプ　スペース 波を止める', 20, 34);
  fill(170); textSize(13); text('目盛りは対数（1 目盛り = 10 倍）。左ほど波長が長く（周波数が低く）、右ほど短い（エネルギーが高い）。c = 2.998×10⁸ m/s、h = 6.626×10⁻³⁴ J·s', 20, 60, width - 40);
  drawSelfTest(20, height - 14);
}

// 下：E（たて）と B（ななめ = 奥行き）がゆれながら進む波。横はばに 1 つの大きさの例をならべる
function drawWave(x, y, w, h) {
  let span = Math.pow(10, Math.ceil(Math.log10(lamSel * 3)));          // 画面の横はばが表す長さ（10 のべき）
  let cycles = span / lamSel, cyMid = y + h / 2, A = Math.min(60, h * 0.35), ptsE = [], ptsB = [], n = Math.min(1200, Math.max(200, Math.ceil(cycles * 20)));
  for (let i = 0; i <= n; i++) { let u = i / n, s = Math.sin(2 * Math.PI * cycles * u - phase); ptsE.push([x + u * w, cyMid - A * s]); ptsB.push([x + u * w + 0.5 * A * s, cyMid + 0.5 * A * s]); }
  let c = bandOf(lamSel) === '可視光' ? wavelengthRGB(lamSel * 1e9) : [255, 200, 90];
  stroke(c[0], c[1], c[2]); strokeWeight(2); noFill(); polyline(ptsE);
  stroke(110, 200, 255, 200); strokeWeight(1.5); polyline(ptsB);
  stroke(100); line(x, cyMid, x + w, cyMid);
  noStroke(); fill(c[0], c[1], c[2]); textSize(13); text('電場 E（たて）', x, y + 4); fill(110, 200, 255); text('磁場 B（奥行き、|B| = |E|/c）', x + 130, y + 4);
  fill(200); text('横はば = ' + lenLabel(span) + '　比べると：' + SIZES.filter((s) => s[1] <= span && s[1] >= span / 1000).map((s) => s[0] + ' ' + lenLabel(s[1])).join('、'), x, y + h + 14);
}

function mousePressed() { if (mouseY > bar.y - 30 && mouseY < bar.y + bar.h + 30) lamSel = clampv(lOf(mouseX), LMIN, LMAX); }
function mouseDragged() { mousePressed(); }
function keyPressed() {
  if (key === RIGHT_ARROW) lamSel = Math.max(LMIN, lamSel / 1.1);
  if (key === LEFT_ARROW) lamSel = Math.min(LMAX, lamSel * 1.1);
  if (key >= '1' && key <= '7') { let b = BANDS[+key - 1]; lamSel = Math.sqrt(b.lo * b.hi); }
  if (key === ' ') moving = !moving;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('c = fλ：2.45 GHz → λ = 12.2 cm', nearRel(C_LIGHT / 2.45e9, 0.1224, 0.001));
  check('500 nm の光子 = 2.48 eV', nearRel((H_PL * C_LIGHT) / 500e-9 / QE, 2.48, 0.002));
  check('hc = 1240 eV·nm', nearRel((H_PL * C_LIGHT) / QE / 1e-9, 1239.8, 0.001));
  check('λ → f → λ でもとにもどる', nearRel(C_LIGHT / (C_LIGHT / 3.7e-7), 3.7e-7, 1e-12));
  check('帯の名前：550 nm = 可視光、10 μm = 赤外線、0.1 nm = X 線、10 m = 電波', bandOf(550e-9) === '可視光' && bandOf(10e-6) === '赤外線' && bandOf(1e-10) === 'X 線' && bandOf(10) === '電波（ラジオ・テレビ）');
  let r = wavelengthRGB(650), b = wavelengthRGB(450), g = wavelengthRGB(530);
  check('色：650 nm は赤、530 nm は緑、450 nm は青がいちばん強い', r[0] > r[1] && r[0] > r[2] && g[1] > g[0] && g[1] > g[2] && b[2] > b[0] && b[2] > b[1]);
  check('電磁波の |B| = |E|/c：E = 1 V/m なら B = 3.34 nT', nearRel(1 / C_LIGHT, 3.336e-9, 0.001));
  check('対数の目盛り：x → λ → x がもどる', near(xOf(lOf(bar.x + 123.4)), bar.x + 123.4, 1e-6));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 自分のスマホの Wi-Fi（2.4 GHz と 5 GHz）の波長を調べ、どちらが壁を回りこみやすいか考えよう
// 2. 可視光のはしからはしまで（380〜780 nm）は、全体の目盛りのうちどれくらい？
// 3. 光子 1 個のエネルギーが 1 eV をこえるのは、どの波長より短いとき？
// 4. EXAMPLES に自分の知っている電磁波（GPS、ラジコン、体温計 など）を足そう
// 5. 12 のアンテナの波長を、ここで何の電磁波に当たるか調べよう


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function bandOf(l) { for (let b of BANDS) if (l >= b.lo && l <= b.hi) return b.name; return l > LMAX ? '電波' : 'ガンマ線'; }
function lenLabel(l, fine) {           // 長さを m・cm・mm・μm・nm・pm・fm で
  let u = [[1e3, 'km'], [1, 'm'], [1e-2, 'cm'], [1e-3, 'mm'], [1e-6, 'μm'], [1e-9, 'nm'], [1e-12, 'pm'], [1e-15, 'fm']];
  for (let [s, n] of u) if (l >= s * 0.999) { let v = l / s; return (fine ? (v >= 100 ? v.toFixed(0) : v.toPrecision(3)) : +v.toPrecision(2)) + ' ' + n; }
  return sci(l) + ' m';
}
function freqLabel(f) { let u = [[1e18, 'EHz'], [1e15, 'PHz'], [1e12, 'THz'], [1e9, 'GHz'], [1e6, 'MHz'], [1e3, 'kHz'], [1, 'Hz']]; for (let [s, n] of u) if (f >= s) return (f / s).toPrecision(3) + ' ' + n; return sci(f) + ' Hz'; }
function nearestExample(l) { let best = null, bd = 0.3; for (let e of EXAMPLES) { let d = Math.abs(Math.log10(e[1] / l)); if (d < bd) { bd = d; best = e; } } return best ? '近い例：' + best[0] + '（' + lenLabel(best[1], true) + '）' : ''; }
// ---- 波長 [nm] → 見える色の RGB（よく使われる区分的な近似。両はしは暗くする）
function wavelengthRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = (440 - nm) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = (645 - nm) / 65; } else if (nm <= 780) r = 1;
  let k = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (780 - nm)) / 80 : 1;
  if (nm < 380 || nm > 780) k = 0;
  return [255 * r * k, 255 * g * k, 255 * b * k];
}
// ---- 描く道具（どのスケッチも同じ）
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（[[x, y], ...]）
  if (!pts || pts.length < 2) return;
  beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function arrowTo(x1, y1, x2, y2, hs) {  // (x1, y1) → (x2, y2) の矢印。hs = 矢じりの大きさ
  let dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  if (!(L > 0.5)) return;
  line(x1, y1, x2, y2);
  let ux = dx / L, uy = dy / L, h = Math.min(hs || 8, L * 0.5);
  line(x2, y2, x2 - h * ux + h * 0.5 * uy, y2 - h * uy - h * 0.5 * ux);
  line(x2, y2, x2 - h * ux - h * 0.5 * uy, y2 - h * uy + h * 0.5 * ux);
}
const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
function sci(v, d) {                   // 0.000032 → "3.20×10⁻⁵"（大きい数・小さい数を読みやすく）
  if (!isFinite(v)) return '—';
  if (v === 0) return '0';
  let sig = d === undefined ? 3 : d, e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e <= 3) return v.toFixed(Math.max(0, sig - 1 - e));
  let m = v / Math.pow(10, e);
  return m.toFixed(sig - 1) + '×10' + String(e).split('').map((c) => SUP[c]).join('');
}
// グラフの枠：g = { x, y, w, h }。lo〜hi の範囲で、数字の配列 arr を左から右へ（cap 個ぶん）
function plotFrame(g, title, lo, hi) {
  noFill(); stroke(70, 80, 100); strokeWeight(1); rect(g.x, g.y, g.w, g.h);
  if (lo < 0 && hi > 0) { let y0 = g.y + g.h * (hi / (hi - lo)); stroke(70, 80, 100, 160); line(g.x, y0, g.x + g.w, y0); }
  noStroke(); fill(200); textSize(13); text(title, g.x + 4, g.y - 6);
  fill(140); textSize(11); text(sci(hi, 2), g.x + g.w + 4, g.y + 10); text(sci(lo, 2), g.x + g.w + 4, g.y + g.h);
}
function plotTrace(g, arr, lo, hi, cap) {
  if (!arr || arr.length < 2) return;
  noFill(); beginShape();
  for (let i = 0; i < arr.length; i++) vertex(g.x + (i / (cap - 1)) * g.w, g.y + g.h - clampv((arr[i] - lo) / (hi - lo), 0, 1) * g.h);
  endShape();
}
function pushCap(arr, v, cap) { arr.push(v); if (arr.length > cap) arr.shift(); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function nearRel(a, b, rel) { return near(a, b, Math.abs(b) * rel); }   // 相対誤差 rel 以内
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) {
  noStroke(); textSize(13);
  if (selfTestResults.length > 0 && selfTestResults.every((r) => r.ok)) fill(120, 220, 160); else fill(255, 100, 90);
  text(selfTestLine(), x, y);
}
