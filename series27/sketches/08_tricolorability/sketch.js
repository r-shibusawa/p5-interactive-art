// ============================================
// 08 ライデマイスター移動と三彩色性
// 結び目の図を「弧」（下をくぐるところで切れた線）に分けて 3 色で塗る。ルール：どの交点でも 3 本の弧が「全部同じ色」か「全部ちがう色」
//   2 色以上使って塗れる ＝ 三彩色可能。図を動かしても（ライデマイスター移動）変わらないので、三葉結び目はほどけないと証明できる！
// クリック = 弧の色を変える / 1 = 三葉結び目 / 2 = 8 の字結び目 / 3 = ねじれた輪（ほどける） / 4 = 五葉結び目 / 5 = (3,4) トーラス結び目
// R = ライデマイスター移動 I（ねじれを足す・消す） / W = 移動 II（ひもを上に重ねる・戻す） / S = 塗り方を 1 つ見せる / C = 色を消す
// ============================================

let knot = 1;
let nS = 320;                 // ★ 曲線の点の数
let pts = [], crossings = [], unders = [];
let arcCol = [], nArcs = 1;
let kink = 0, kinkGoal = 0, finger = 0, fingerGoal = 0;
let solutions = 0, lastSig = '';
let palette;
let sc;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  palette = [color(0, 75, 100), color(130, 70, 90), color(215, 75, 100)];
  sc = min(width, height) * 0.11;
}

// ★ 結び目の式 (x, y, z)：z は高さ（交点でどちらが上か）
function base(t) {
  if (knot === 1) return [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)];
  if (knot === 2) return [(2 + Math.cos(2 * t)) * Math.cos(3 * t), (2 + Math.cos(2 * t)) * Math.sin(3 * t), Math.sin(4 * t)];
  if (knot === 3) return [2 * Math.cos(t), 1.5 * Math.sin(2 * t), Math.sin(t)];
  let pp = knot === 4 ? 2 : 3, qq = knot === 4 ? 5 : 4, r = 2 + Math.cos(qq * t);
  return [r * Math.cos(pp * t), r * Math.sin(pp * t), -Math.sin(qq * t)];
}

// 図を動かす：ねじれ（移動 I）と指のように押し込む（移動 II）を足した曲線
function buildCurve() {
  pts = [];
  let raw = [];
  for (let i = 0; i < nS; i++) raw.push(base((i / nS) * TWO_PI));
  let cx = raw.reduce((a, p) => a + p[0], 0) / nS, cy = raw.reduce((a, p) => a + p[1], 0) / nS;
  // 移動 I の場所（i1）と移動 II の場所（いちばん外側の点 i2）
  let i1 = floor(nS * 0.12), w1 = floor(nS * 0.05), i2 = 0;
  raw.forEach((p, i) => { if (Math.hypot(p[0] - cx, p[1] - cy) > Math.hypot(raw[i2][0] - cx, raw[i2][1] - cy)) i2 = i; });
  if (Math.abs(i2 - i1) < w1 * 3) i1 = (i2 + floor(nS / 2)) % nS;
  let A = raw[(i1 - w1 + nS) % nS], B = raw[(i1 + w1) % nS], D = Math.hypot(B[0] - A[0], B[1] - A[1]) || 0.1;
  let T = [(B[0] - A[0]) / D, (B[1] - A[1]) / D], N = [-T[1], T[0]];
  if ((raw[i1][0] - cx) * N[0] + (raw[i1][1] - cy) * N[1] < 0) N = [-N[0], -N[1]];     // 外向きにループを出す
  let P2 = raw[i2], toC = [cx - P2[0], cy - P2[1]], L2 = Math.hypot(...toC);
  for (let i = 0; i < nS; i++) {
    let [x, y, z] = raw[i];
    let du = ((i - i1 + nS * 1.5) % nS) - nS / 2, u = du / w1;
    if (kink > 0 && Math.abs(u) < 1) {
      let s = Math.sin(PI * u), c = 1 + Math.cos(PI * u);
      x += kink * D * (-1.6 * s * T[0] + 0.6 * c * N[0]); y += kink * D * (-1.6 * s * T[1] + 0.6 * c * N[1]); z += kink * 0.8 * u;
    }
    let d2 = ((i - i2 + nS * 1.5) % nS) - nS / 2, g = Math.exp(-(d2 * d2) / (nS * 0.035) ** 2);
    if (finger > 0) { x += finger * g * toC[0] * 1.05; y += finger * g * toC[1] * 1.05; z += finger * g * 3; }
    pts.push([x, y, z]);
  }
}

// 交点をさがし、下をくぐる位置で区切って「弧」に分ける
function findArcs() {
  crossings = [];
  for (let i = 0; i < nS; i++) for (let j = i + 2; j < nS; j++) {
    if (i === 0 && j === nS - 1) continue;
    let a = pts[i], b = pts[(i + 1) % nS], c = pts[j], d = pts[(j + 1) % nS];
    let den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
    if (Math.abs(den) < 1e-12) continue;
    let t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
    let u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
    if (t < 0 || t >= 1 || u < 0 || u >= 1) continue;
    let zi = a[2] + (b[2] - a[2]) * t, zj = c[2] + (d[2] - c[2]) * u;
    let pi = i + t, pj = j + u;
    crossings.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, over: zi > zj ? pi : pj, under: zi > zj ? pj : pi });
  }
  unders = crossings.map((c) => c.under).sort((a, b) => a - b);
  let m = max(1, unders.length);
  if (m !== nArcs) { nArcs = m; arcCol = new Array(m).fill(-1); }
  let sig = nArcs + ':' + crossings.length;
  if (sig !== lastSig) { lastSig = sig; solutions = countColorings(); }
}
// 位置 s（点の番号、小数あり）が何番目の弧か
function arcOf(s) {
  if (!unders.length) return 0;
  s = ((s % nS) + nS) % nS;
  let k = 0;
  while (k < unders.length && unders[k] < s) k++;
  return k % unders.length;
}
function crossingArcs(c) { return [arcOf(c.over), arcOf(c.under - 0.3), arcOf(c.under + 0.3)]; }
function rule(a, b, c) { return (a === b && b === c) || (a !== b && b !== c && a !== c); }

function draw() {
  background(230, 25, 12);
  kink += Math.sign(kinkGoal - kink) * min(0.025, abs(kinkGoal - kink));
  finger += Math.sign(fingerGoal - finger) * min(0.02, abs(fingerGoal - finger));
  buildCurve(); findArcs();
  let cx = width * 0.4, cy = height * 0.55, X = (p) => cx + p[0] * sc, Y = (p) => cy - p[1] * sc;
  strokeWeight(7); noFill();
  for (let i = 0; i < nS; i++) {
    let mid = i + 0.5;
    if (unders.some((u) => Math.abs(u - mid) < 1.6 || Math.abs(u - mid + nS) < 1.6 || Math.abs(u - mid - nS) < 1.6)) continue;   // 下をくぐる所はすき間
    let k = arcCol[arcOf(mid)];
    if (k >= 0) stroke(palette[k]); else stroke(0, 0, 70);
    let a = pts[i], b = pts[(i + 1) % nS];
    line(X(a), Y(a), X(b), Y(b));
  }
  // 交点のチェック
  let allColored = arcCol.every((k) => k >= 0), okAll = true;
  for (let c of crossings) {
    let [a, b, d] = crossingArcs(c).map((k) => arcCol[k]);
    if (a < 0 || b < 0 || d < 0) { okAll = false; continue; }
    let ok = rule(a, b, d); okAll = okAll && ok;
    noFill(); stroke(ok ? 130 : 0, 80, 100); strokeWeight(3); circle(cx + c.x * sc, cy - c.y * sc, 30);
  }
  let used = new Set(arcCol.filter((k) => k >= 0)).size;
  let names = ['', '三葉結び目', '8 の字結び目', 'ねじれた輪（ほどける）', '五葉結び目', '(3,4) トーラス結び目'];
  let x0 = width * 0.64;
  noStroke(); fill(0, 0, 100); textSize(30); text(names[knot], x0, 150);
  textSize(20);
  text('交点 ' + crossings.length + '　弧 ' + (unders.length || 1), x0, 196);
  text('3 色の正しい塗り方の数：' + solutions, x0, 232);
  fill(0, 0, 65); textSize(15);
  text('（全部同じ色の 3 通りを含む。図を動かしても不変）', x0, 258);
  textSize(22);
  if (allColored && crossings.length) {
    fill(okAll && used >= 2 ? 130 : 0, 70, 100);
    text(okAll ? (used >= 2 ? '成功！三彩色できた（' + used + ' 色）' : 'ルールは OK、でも 1 色だけ') : 'ルールに合わない交点がある（赤い丸）', x0, 310);
  }
  fill(solutions > 3 ? 130 : 30, 70, 100); textSize(20);
  text(solutions > 3 ? '→ 三彩色可能：ほどけない！' : '→ 三彩色できない（三葉結び目とは別物）', x0, 350);
  fill(0, 0, 100); textSize(18);
  text('クリック：弧の色　1〜5：結び目　R：移動 I（ねじれ）' + (kinkGoal ? ' ON' : '') + '　W：移動 II（重ねる）' + (fingerGoal ? ' ON' : '') + '　S：答えを 1 つ　C：色を消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('ルール：どの交点でも、上を通る弧と下の 2 本の弧が「全部同じ色」か「全部ちがう色」。緑の丸 = OK、赤 = ルール違反', 20, 68);
}

function mousePressed() {
  let cx = width * 0.4, cy = height * 0.55, best = -1, bd = 26;
  pts.forEach((p, i) => { let d = Math.hypot(cx + p[0] * sc - mouseX, cy - p[1] * sc - mouseY); if (d < bd) { bd = d; best = i; } });
  if (best >= 0) { let a = arcOf(best + 0.5); arcCol[a] = (arcCol[a] + 1) % 3; }
}
function keyPressed() {
  if ('12345'.includes(key) && key.length === 1) { knot = int(key); kink = kinkGoal = finger = fingerGoal = 0; lastSig = ''; nArcs = -1; }
  if (key === 'r' || key === 'R') kinkGoal = kinkGoal ? 0 : 1;
  if (key === 'w' || key === 'W') fingerGoal = fingerGoal ? 0 : 1;
  if (key === 'c' || key === 'C') arcCol.fill(-1);
  if (key === 's' || key === 'S') { let s = findSolution(); if (s) arcCol = s; }
}

// ---------- やってみよう ----------
// 1. 三葉結び目を自分の手で 3 色に塗ろう。弧は何本？ 交点は何個？
// 2. 8 の字結び目は何をしても 1 色しか成り立たない。塗り方の数が 3 のままなのを確かめよう
// 3. R と W で図を変えても「塗り方の数」は変わらない（9 か 3）。これが「不変量」
// 4. 五葉結び目は三彩色できない。でも 5 色版（五彩色）なら？ rule() を「a + b ≡ 2c (mod 5)」に変えて試そう


// ==================================================
// ここから下は「塗り方を数える道具」（3 の弧の数乗 通りを全部ためす）
// ==================================================
function validColoring(cols) {
  for (let c of crossings) { let [a, b, d] = crossingArcs(c); if (!rule(cols[a], cols[b], cols[d])) return false; }
  return true;
}
function countColorings() {
  if (nArcs > 12) return '多すぎて数えない';
  let n = nArcs, total = Math.pow(3, n), cnt = 0, cols = new Array(n);
  for (let m = 0; m < total; m++) { let v = m; for (let i = 0; i < n; i++) { cols[i] = v % 3; v = Math.floor(v / 3); } if (validColoring(cols)) cnt++; }
  return cnt;
}
function findSolution() {
  let n = nArcs, total = Math.pow(3, min(n, 12)), cols = new Array(n);
  for (let m = 0; m < total; m++) {
    let v = m; for (let i = 0; i < n; i++) { cols[i] = v % 3; v = Math.floor(v / 3); }
    if (new Set(cols).size >= 2 && validColoring(cols)) return cols.slice();
  }
  return null;
}
