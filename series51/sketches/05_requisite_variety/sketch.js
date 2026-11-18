// ============================================
// 05 必要多様度の法則（アシュビー 1956）
// 外乱 D がやってくる → あなたが調整 R を選ぶ → 表から結果 O が決まる。結果の種類をできるだけ少なく（一定に）保とう
// でも結果の種類 V(O) は V(D) ÷ V(R) より少なくできない。「多様性をおさえられるのは多様性だけ」
// 1〜9 またはマスをクリック = 調整を選ぶ / ←→ = 調整の種類 V(R) / A = 最適な調整器が自動で / N = 新しい表 / スペース = 次の外乱 / R = 記録を消す
// ============================================

const ND = 9;                         // 外乱の種類 V(D)
const VR_LIST = [1, 2, 3, 9];         // ★ 選べる調整の種類 V(R)
const LETTERS = 'abcdefghi';
let vrI = 2, table, labels, curD = 0, tally, rounds = 0, autoPlay = false, autoT = 0, best, lastO = -1, rng, tableSeed = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  rng = makeRng(51);
  newTable(0);
}
// 表 T[d][r] = 結果。どの列（1 つの調整）も、外乱がちがえば結果もちがう（列は 0〜8 の並べかえ）
function makeTable(sd) {
  let t = [], shifts = [0, 1, 2, 5, 7, 3, 8, 4, 6];
  if (sd === 0) { for (let d = 0; d < ND; d++) t.push(shifts.map((k) => (d + k) % ND)); return t; }
  let r = makeRng(sd), cols = [];
  for (let c = 0; c < 9; c++) { let p = [...Array(ND).keys()]; for (let i = ND - 1; i > 0; i--) { let j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } cols.push(p); }
  for (let d = 0; d < ND; d++) t.push(cols.map((p) => p[d]));
  return t;
}
function newTable(sd) {
  tableSeed = sd; table = makeTable(sd); labels = LETTERS.split('');
  resetTally();
}
function resetTally() { tally = new Array(ND).fill(0); rounds = 0; lastO = -1; best = bestRegulator(table, VR_LIST[vrI]); curD = Math.floor(rng() * ND); }

// ---- 最適な調整器：結果の集合 O' を小さい順にさがし、「どの外乱にも O' に入る調整がある」最小の O' を見つける
function bestRegulator(T, vr) {
  for (let size = 1; size <= ND; size++) {
    for (let m = 1; m < 1 << ND; m++) {
      if (popcount(m) !== size) continue;
      let map = [];
      for (let d = 0; d < ND; d++) { let r = -1; for (let c = 0; c < vr; c++) if (m & (1 << T[d][c])) { r = c; break; } if (r < 0) { map = null; break; } map.push(r); }
      if (map) return { V: size, set: m, map };
    }
  }
  return null;
}
function popcount(m) { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; }
// 多様度とエントロピー（ビット）
function varietyOf(counts) { return counts.filter((c) => c > 0).length; }
function entropyBits(counts) { let n = counts.reduce((a, b) => a + b, 0), h = 0; for (let c of counts) if (c > 0) h -= (c / n) * Math.log2(c / n); return n ? h : 0; }

function choose(r) {
  if (r < 0 || r >= VR_LIST[vrI]) return;
  lastO = table[curD][r]; tally[lastO]++; rounds++;
  curD = Math.floor(rng() * ND);
}

function draw() {
  background(24, 35, 10);
  let vr = VR_LIST[vrI];
  if (autoPlay) { autoT += deltaTime / 1000; if (autoT > 0.25) { autoT = 0; choose(best.map[curD]); } }

  say('必要多様度の法則 ─ 結果の種類 V(O) は、V(D) ÷ V(R) より少なくできない', 20, 36, 20);
  say('1〜' + vr + ' またはマス：調整を選ぶ　←→ V(R) = ' + vr + '　A 最適な調整器 ' + (autoPlay ? 'ON' : 'OFF') + '　N 新しい表　スペース 次の外乱　R 記録を消す', 20, 62, 15, C_SUB);

  // ---- 結果の表
  let tx = 40, ty = 120, cs = Math.min(54, (height - 220) / 10, (width * 0.5 - 80) / 10);
  say('外乱 ＼ 調整', tx, ty - 14, 13, C_SUB);
  for (let c = 0; c < vr; c++) say('R' + (c + 1), tx + (c + 1) * cs + cs * 0.25, ty + cs * 0.6, 15, C_TUBE);
  for (let d = 0; d < ND; d++) {
    let y = ty + (d + 1) * cs, isCur = d === curD;
    say('D' + (d + 1), tx + 6, y + cs * 0.6, 15, isCur ? C_TXT : C_SUB);
    for (let c = 0; c < vr; c++) {
      let o = table[d][c], inBest = autoPlay && best && best.set & (1 << o), pick = best && best.map[d] === c;
      stroke(isCur ? col(C_TUBE) : color(30, 20, 30)); strokeWeight(isCur ? 2 : 1);
      fill(inBest ? color(135, 50, 30) : color(28, 25, 18)); rect(tx + (c + 1) * cs, y, cs - 4, cs - 4, 5);
      noStroke(); fill(col(pick && autoPlay ? C_TUBE : C_TXT)); textSize(18); textAlign(CENTER, CENTER); text(labels[o], tx + (c + 1.5) * cs - 2, y + cs / 2 - 2); textAlign(LEFT, BASELINE);
    }
  }
  say(autoPlay ? '緑のマス = 最適な調整器がめざす結果（' + best.V + ' 種類）' : 'A を押すと、最適な調整器のめざす結果が緑で見える', tx, ty + 11 * cs, 13, C_SCOPE);
  // 今の外乱
  let cx = tx + Math.max(vr + 2, 5) * cs + 20, cy = ty;
  noStroke(); fill(col(C_TUBE, 25)); rect(cx, cy, 220, 110, 10);
  say('外乱がきた！', cx + 16, cy + 30, 16, C_TUBE);
  say('D' + (curD + 1), cx + 16, cy + 82, 44);
  if (lastO >= 0) say('前の結果：' + labels[lastO], cx + 110, cy + 82, 18, C_SCOPE);

  // ---- 記録と法則
  let hx = cx, hy = cy + 150, bw = Math.min(380, width - hx - 30);
  say('あなた（または自動）の結果のヒストグラム　' + rounds + ' 回', hx, hy, 15);
  let mx = Math.max(1, ...tally);
  for (let o = 0; o < ND; o++) { noStroke(); fill(col(C_SCOPE, 70)); rect(hx + o * (bw / ND), hy + 130 - (110 * tally[o]) / mx, bw / ND - 4, (110 * tally[o]) / mx); say(labels[o], hx + o * (bw / ND) + 8, hy + 150, 14, C_SUB); }
  let vo = varietyOf(tally), ho = entropyBits(tally), ly = hy + 190;
  say('V(D) = ' + ND + '　V(R) = ' + vr + '　→ 下限 V(D)/V(R) = ' + (ND / vr).toFixed(2), hx, ly, 16);
  say('あなたの V(O) = ' + vo + '　（最適な調整器の V(O) = ' + best.V + '）', hx, ly + 28, 17, vo <= best.V && rounds > 0 ? C_SCOPE : C_TUBE);
  say('ビットで：log₂V(O) ≥ log₂V(D) − log₂V(R)　' + (vo ? Math.log2(vo).toFixed(3) : '—') + ' ≥ ' + Math.log2(ND).toFixed(3) + ' − ' + Math.log2(vr).toFixed(3) + ' = ' + (Math.log2(ND) - Math.log2(vr)).toFixed(3), hx, ly + 56, 15);
  say('結果のエントロピー H(O) = ' + ho.toFixed(3) + ' ビット（外乱は H(D) = ' + Math.log2(ND).toFixed(3) + '）', hx, ly + 82, 15);
  say('どの列も「外乱がちがえば結果もちがう」ので、1 つの調整でまとめられる外乱は 1 つの結果につき 1 つだけ', hx, ly + 110, 13, C_SUB);
  say('→ V(R) 個の調整で 1 つの結果に集められる外乱は V(R) 個まで → V(O) ≥ V(D) / V(R)', hx, ly + 130, 13, C_SUB);
  drawSelfTest();
}

function mousePressed() {
  let tx = 40, ty = 120, cs = Math.min(54, (height - 220) / 10, (width * 0.5 - 80) / 10);
  let c = Math.floor((mouseX - tx) / cs) - 1, d = Math.floor((mouseY - ty) / cs) - 1;
  if (d === curD) choose(c);
}
function keyPressed() {
  let n = parseInt(key);
  if (n >= 1 && n <= 9) choose(n - 1);
  if (key === RIGHT_ARROW) { vrI = (vrI + 1) % VR_LIST.length; resetTally(); }
  if (key === LEFT_ARROW) { vrI = (vrI + VR_LIST.length - 1) % VR_LIST.length; resetTally(); }
  if (key === 'a' || key === 'A') autoPlay = !autoPlay;
  if (key === 'n' || key === 'N') newTable(tableSeed + 1);
  if (key === ' ') curD = Math.floor(rng() * ND);
  if (key === 'r' || key === 'R') resetTally();
}

// ---- 自己テスト
function isPermCols(T, vr) { for (let c = 0; c < vr; c++) { let seen = new Set(T.map((r) => r[c])); if (seen.size !== ND) return false; } return true; }
function selfTest() {
  selfTestResults = [];
  let T = makeTable(0), ok = true;
  for (let s = 1; s <= 30; s++) if (!isPermCols(makeTable(s), 9)) ok = false;
  check('前提：どの表のどの列も 0〜8 の並べかえ（同じ調整で 2 つの外乱が同じ結果にならない）', ok && isPermCols(T, 9));
  let res = VR_LIST.map((vr) => bestRegulator(T, vr).V);
  check('この表の最小の V(O)：V(R) = 1, 2, 3, 9 で ' + res.join(', ') + '（下限 ⌈9/V(R)⌉ = 9, 5, 3, 1 と一致）', res.join() === '9,5,3,1');
  let law = true;
  for (let s = 1; s <= 30; s++) for (let vr of VR_LIST) if (bestRegulator(makeTable(s), vr).V < Math.ceil(ND / vr)) law = false;
  check('ランダムな表 30 個 × V(R) 4 通り：最適でも V(O) ≥ V(D)/V(R)（法則が破れない）', law);
  let b = bestRegulator(T, 3), cnt = new Array(ND).fill(0);
  for (let d = 0; d < ND; d++) cnt[T[d][b.map[d]]]++;
  check('最適な調整器の地図で 9 つの外乱を 1 回ずつ → 結果は ' + varietyOf(cnt) + ' 種類 = 探した最小', varietyOf(cnt) === b.V);
  check('H(O) = ' + entropyBits(cnt).toFixed(4) + ' = H(D) − log₂V(R) = log₂9 − log₂3（等号）', near(entropyBits(cnt), Math.log2(9) - Math.log2(3), 1e-12));
  let flat = []; for (let d = 0; d < ND; d++) flat.push([0, 0, 0]);
  check('前提をくずす（全部の結果が a）と V(O) = 1 < 9/3：法則は「列が並べかえ」のときの話', bestRegulator(flat, 3).V === 1);
  check('エントロピー：同じ結果ばかり = 0 ビット、9 種類が同じ数 = log₂9', near(entropyBits([5, 0, 0]), 0) && near(entropyBits(new Array(9).fill(2)), Math.log2(9), 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. V(R) = 3 で 30 回やってみよう。結果を 3 種類だけにおさえられた？ 最適な調整器（A）と比べよう
// 2. ←→ で V(R) = 1 にすると？ 何もできない調整器は、外乱をそのまま結果に通してしまう
// 3. V(R) = 2 では、どうがんばっても 5 種類より少なくできない。なぜ 4.5 ではなく 5？
// 4. N で表を変えると、最適な V(O) はどう変わる？ 法則の下限より多くなる表はある？
// 5. 自分の生活で「外乱」「調整」「結果」を考えよう（天気と服、体温と汗、クラスと先生…）


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
