// ============================================
// 03 ID3 とカテゴリの表 ─ 「テニスをする？」の 14 日分の表から、情報利得で質問を選んで木を作る（ID3、クインラン）
// 根：4 つの属性（天気・気温・湿度・風）それぞれで表を分けたときの情報利得を計算 → いちばん大きい属性で分ける → 枝ごとにくり返す
//   カテゴリの属性は「値の数だけ枝」が出る（しきい値ではない）。純粋になった枝は葉
//   利得比 = 利得 / 分割情報（値の分かれ方のエントロピー）。値の種類が多い属性（たとえば「日付」）をひいきしないための工夫（C4.5）
// クリック 表のマスの値を変える / G 情報利得 ⇔ 利得比 / R もとの表に
// ============================================

const ATTRS = ['天気', '気温', '湿度', '風'];
const VALS = [['晴れ', 'くもり', '雨'], ['暑い', 'ふつう', '涼しい'], ['高い', 'ふつう'], ['弱い', '強い']];
const PLAY = ['する', 'しない'];
const TENNIS = [                       // [天気, 気温, 湿度, 風, テニス]（値は VALS の番号、テニスは 0 = する、1 = しない）
  [0, 0, 0, 0, 1], [0, 0, 0, 1, 1], [1, 0, 0, 0, 0], [2, 1, 0, 0, 0], [2, 2, 1, 0, 0], [2, 2, 1, 1, 1], [1, 2, 1, 1, 0],
  [0, 1, 0, 0, 1], [0, 2, 1, 0, 0], [2, 1, 1, 0, 0], [0, 1, 1, 1, 0], [1, 1, 0, 1, 0], [1, 0, 1, 0, 0], [2, 1, 0, 1, 1],
];
let rows, useRatio = false, id3Root, rootStats, cellW = 82, cellH = 30, tbl = { x: 40, y: 120 };

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); resetTable(); }
function resetTable() { rows = TENNIS.map((r) => r.slice()); rebuild(); }
function rebuild() { rootStats = attrStats(rows, [0, 1, 2, 3]); id3Root = buildID3(rows, [0, 1, 2, 3], useRatio, 0); }
function countsOf(rs) { let c = [0, 0]; for (let r of rs) c[r[4]]++; return c; }
// ★ 属性 a で分けたときの情報利得と利得比
function attrGain(rs, a) {
  let H = entropyOf(countsOf(rs)), rem = 0, sizes = [];
  for (let v = 0; v < VALS[a].length; v++) { let sub = rs.filter((r) => r[a] === v); sizes.push(sub.length); if (sub.length) rem += (sub.length / rs.length) * entropyOf(countsOf(sub)); }
  let gain = H - rem, si = entropyOf(sizes);                       // 分割情報 = 「どの枝に行くか」のエントロピー
  return { gain, si, ratio: si > 1e-12 ? gain / si : 0 };
}
function attrStats(rs, attrs) { return attrs.map((a) => Object.assign({ a }, attrGain(rs, a))); }
// ★ ID3：利得（か利得比）がいちばん大きい属性で分け、値ごとの枝でくり返す
function buildID3(rs, attrs, ratio, depth) {
  let c = countsOf(rs), node = { rows: rs, counts: c, pred: c[1] > c[0] ? 1 : 0, depth, leaf: true };
  if (rs.length === 0 || c[0] === 0 || c[1] === 0 || attrs.length === 0) return node;
  let st = attrStats(rs, attrs), best = st.reduce((m, s) => ((ratio ? s.ratio : s.gain) > (ratio ? m.ratio : m.gain) + 1e-12 ? s : m), st[0]);
  node.leaf = false; node.attr = best.a; node.gain = best.gain; node.ratio = best.ratio;
  node.kids = VALS[best.a].map((_, v) => buildID3(rs.filter((r) => r[best.a] === v), attrs.filter((a) => a !== best.a), ratio, depth + 1));
  node.kids.forEach((k) => { if (k.rows.length === 0) k.pred = node.pred; });   // 行が 0 の枝は親の多数決
  return node;
}
function id3Predict(t, r) { while (!t.leaf) t = t.kids[r[t.attr]]; return t.pred; }

function draw() {
  background(...BG_COL);
  cellH = Math.min(32, (height - 190) / 15);
  // ---- 表
  let heads = ['#'].concat(ATTRS, ['テニス']), cw = [36, cellW, cellW, cellW, cellW, cellW];
  textAlign(CENTER, CENTER); textSize(14);
  let x = tbl.x;
  heads.forEach((h, k) => { noStroke(); fill(60, 90, 75); rect(x, tbl.y, cw[k] - 2, cellH - 2, 4); fill(240); text(h, x + cw[k] / 2, tbl.y + cellH / 2); x += cw[k]; });
  rows.forEach((r, i) => {
    let yy = tbl.y + (i + 1) * cellH; x = tbl.x;
    noStroke(); fill(170); text(i + 1, x + cw[0] / 2, yy + cellH / 2); x += cw[0];
    for (let a = 0; a < 5; a++) {
      let changed = r[a] !== TENNIS[i][a];
      fill(a === 4 ? (r[4] === 0 ? color(60, 110, 60) : color(110, 60, 55)) : color(32, 46, 40)); stroke(changed ? color(255, 240, 150) : color(0, 0)); strokeWeight(2);
      rect(x, yy, cw[a + 1] - 2, cellH - 2, 4); noStroke(); fill(235);
      text(a === 4 ? PLAY[r[4]] : VALS[a][r[a]], x + cw[a + 1] / 2, yy + cellH / 2); x += cw[a + 1];
    }
  });
  let c = countsOf(rows), acc = rows.filter((r) => id3Predict(id3Root, r) === r[4]).length;
  textAlign(LEFT, BASELINE); fill(220); textSize(15);
  text('する ' + c[0] + ' 日 / しない ' + c[1] + ' 日　H = ' + fmtNum(entropyOf(c), 3) + ' ビット', tbl.x, tbl.y + 15.8 * cellH);
  text('木で表を当てると ' + acc + ' / ' + rows.length + ' 行', tbl.x, tbl.y + 15.8 * cellH + 22);
  // ---- 根での利得の棒グラフ
  let bx = tbl.x + 36 + 5 * cellW + 50, bw = width - bx - 40, gy = 120;
  fill(240); textSize(16); text('根で比べる：' + (useRatio ? '利得比 = 利得 / 分割情報' : '情報利得（ビット）'), bx, gy - 10);
  let best = argMaxArr(rootStats.map((s) => (useRatio ? s.ratio : s.gain)));
  rootStats.forEach((s, k) => {
    let yy = gy + 10 + k * 30, v = useRatio ? s.ratio : s.gain;
    fill(200); textSize(14); textAlign(RIGHT, CENTER); text(ATTRS[s.a], bx + 50, yy + 10);
    fill(k === best ? color(175, 225, 95) : color(85, 175, 240)); rect(bx + 60, yy, (bw - 330) * clampv(v / 0.3, 0, 1.1), 20, 3);
    fill(230); textAlign(LEFT, CENTER); text('利得 ' + fmtNum(s.gain, 4) + '　分割情報 ' + fmtNum(s.si, 3) + '　利得比 ' + fmtNum(s.ratio, 4), bx + 70 + (bw - 330) * clampv(v / 0.3, 0, 1.1), yy + 10);
  });
  let dayG = entropyOf(c), dayR = dayG / Math.log2(rows.length);
  fill(150); textSize(13); textAlign(LEFT, BASELINE);
  text('もし「日付」（14 日とも別の値）を属性にすると：利得 ' + fmtNum(dayG, 3) + '（最大！でも役に立たない）、利得比なら ' + fmtNum(dayR, 3) + ' に下がる', bx, gy + 146, bw);
  // ---- ID3 の木
  drawID3(id3Root, bx, gy + 200, bw, height - gy - 260);
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('ID3 とカテゴリの表　「テニスをする？」の 14 日', 40, 40);
  fill(170); textSize(15); text('クリック 表のマスの値を変える（黄色の枠 = もとの表と変えたマス）　G 情報利得 ⇔ 利得比（いま ' + (useRatio ? '利得比' : '情報利得') + '）　R もとの表に', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function drawID3(root, x0, y0, w, h) {
  let leaves = 0, pos = new Map(), maxD = 0;
  let place = (t) => { maxD = Math.max(maxD, t.depth); if (t.leaf) { pos.set(t, leaves++); return pos.get(t); } let ps = t.kids.map(place); pos.set(t, (ps[0] + ps[ps.length - 1]) / 2); return pos.get(t); };
  place(root);
  let cw = w / Math.max(1, leaves), rh = Math.min(110, h / (maxD + 1)), P = (t) => [x0 + (pos.get(t) + 0.5) * cw, y0 + t.depth * rh + 20];
  let walk = (t) => {
    if (t.leaf) return;
    t.kids.forEach((k, v) => {
      let a = P(t), b = P(k); stroke(120, 140, 125); strokeWeight(1.5); line(a[0], a[1] + 18, b[0], b[1] - 18);
      noStroke(); fill(255, 240, 150); textSize(12); textAlign(CENTER, CENTER); text(VALS[t.attr][v], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      walk(k);
    });
  };
  walk(root);
  let draw1 = (t) => {
    let [x, yy] = P(t), bw = Math.min(118, cw - 6);
    stroke(t.leaf ? (t.pred === 0 ? color(120, 200, 120) : color(230, 120, 110)) : color(110, 130, 115)); strokeWeight(1.5);
    fill(t.leaf ? (t.pred === 0 ? color(40, 80, 45) : color(80, 40, 38)) : color(30, 44, 38)); rect(x - bw / 2, yy - 18, bw, 36, 6);
    noStroke(); fill(240); textSize(12); textAlign(CENTER, CENTER);
    text(t.leaf ? (t.rows.length ? PLAY[t.pred] : PLAY[t.pred] + '（0 行）') : ATTRS[t.attr] + '？', x, yy - 7);
    fill(200); text('[' + t.counts[0] + '|' + t.counts[1] + ']' + (t.leaf ? '' : ' ' + fmtNum(useRatio ? t.ratio : t.gain, 3)), x, yy + 8);
    if (!t.leaf) t.kids.forEach(draw1);
  };
  draw1(root);
}
function mousePressed() {
  let cw = [36, cellW, cellW, cellW, cellW, cellW], i = Math.floor((mouseY - tbl.y) / cellH) - 1, x = tbl.x + cw[0];
  if (i < 0 || i >= rows.length) return;
  for (let a = 0; a < 5; a++) { if (mouseX >= x && mouseX < x + cw[a + 1]) { rows[i][a] = (rows[i][a] + 1) % (a === 4 ? 2 : VALS[a].length); rebuild(); return; } x += cw[a + 1]; }
}
function keyPressed() {
  if (key === 'g' || key === 'G') { useRatio = !useRatio; rebuild(); }
  if (key === 'r' || key === 'R') resetTable();
  return false;
}

// ---- 自己テスト（いつも「もとの表」TENNIS で）
function selfTest() {
  selfTestResults = [];
  let c = countsOf(TENNIS), st = attrStats(TENNIS, [0, 1, 2, 3]);
  check('表は 14 行、する 9 日 / しない 5 日、H = 0.940 ビット', TENNIS.length === 14 && c[0] === 9 && c[1] === 5 && near(entropyOf(c), 0.9403, 1e-4));
  check('根の情報利得：天気 0.2467、湿度 0.1518、風 0.0481、気温 0.0292（±0.001）', near(st[0].gain, 0.2467, 1e-3) && near(st[2].gain, 0.1518, 1e-3) && near(st[3].gain, 0.0481, 1e-3) && near(st[1].gain, 0.0292, 1e-3));
  check('根でいちばん利得が大きいのは「天気」', argMaxArr(st.map((s) => s.gain)) === 0);
  check('利得比：天気 0.247 / 1.577 = 0.156、湿度 0.152 / 1 = 0.152（天気がまだ 1 位）', near(st[0].si, 1.5774, 1e-3) && near(st[0].ratio, 0.1564, 1e-3) && near(st[2].ratio, 0.1518, 1e-3) && argMaxArr(st.map((s) => s.ratio)) === 0);
  let t = buildID3(TENNIS, [0, 1, 2, 3], false, 0);
  check('ID3 の木：天気 → くもりは全部「する」、晴れ → 湿度、雨 → 風', t.attr === 0 && t.kids[1].leaf && t.kids[1].pred === 0 && t.kids[1].counts[1] === 0 && t.kids[0].attr === 2 && t.kids[2].attr === 3);
  check('ID3 の木は 14 行を全部当てる。葉は 5 枚', TENNIS.every((r) => id3Predict(t, r) === r[4]) && countID3Leaves(t) === 5);
  check('どの属性でも利得 ≥ 0、「日付」なら利得 = H = 0.940 で利得比 = 0.940 / log₂14 = 0.247', st.every((s) => s.gain >= -1e-12) && near(entropyOf(c) / Math.log2(14), 0.247, 1e-3));
  reportSelfTest();
}
function countID3Leaves(t) { return t.leaf ? 1 : sumArr(t.kids.map(countID3Leaves)); }

// ---------- やってみよう ----------
// 1. 根の棒グラフで、天気の利得 0.247 がいちばん大きいことを確かめよう。手で計算もしてみよう
// 2. 「くもり」の日を 1 日「しない」に変える（テニスの列をクリック）。木はどう変わる？
// 3. G で利得比にすると、根の属性は変わる？ 値が 3 つある天気と、2 つの湿度で比べてみよう
// 4. 表の値を変えて、木の葉が 10 枚以上になる表を作れる？
// 5. 04 からは、カテゴリではなく連続の値（しきい値で分ける）の木＝CART

// ==================================================
// ここから下は「決定木の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 小さな道具：はさむ・合計・いちばん大きい番号
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function sumArr(a) { let s = 0; for (let v of a) s += v; return s; }
function argMaxArr(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
// ---- 不純度：counts = 各クラスの個数（重みつきでもよい）
function entropyP(p) { return p <= 0 || p >= 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p); }   // 2 クラスのエントロピー（ビット）
function entropyOf(counts) {
  let n = sumArr(counts), h = 0; if (n <= 0) return 0;
  for (let c of counts) if (c > 0) { let q = c / n; h -= q * Math.log2(q); }
  return Math.max(0, h);
}
function giniOf(counts) { let n = sumArr(counts), s = 1; if (n <= 0) return 0; for (let c of counts) s -= (c / n) * (c / n); return Math.max(0, s); }
function errOf(counts) { let n = sumArr(counts); return n <= 0 ? 0 : Math.max(0, 1 - Math.max(...counts) / n); }   // 誤分類率
function impurityOf(counts, crit) { return crit === 'entropy' ? entropyOf(counts) : crit === 'error' ? errOf(counts) : giniOf(counts); }
// 分けたときの「不純度の減り」= 親 − (左の割合·左 + 右の割合·右)。crit = 'entropy' なら情報利得
function gainOf(parent, left, right, crit) {
  let n = sumArr(parent), nl = sumArr(left), nr = sumArr(right); if (n <= 0) return 0;
  return impurityOf(parent, crit) - (nl / n) * impurityOf(left, crit) - (nr / n) * impurityOf(right, crit);
}
// ---- 描く道具：クラスの色、領域の絵、木の図
const CLS_COL = [[245, 140, 75], [85, 175, 240], [175, 225, 95]];   // ★ クラス A・B・C の色
const BG_COL = [20, 30, 26];                                       // 背景（森の色）
function mixCol(probs, k) {           // クラスの割合 → 背景と混ぜた色（k = 色の濃さ）
  let c = BG_COL.slice(), s = sumArr(probs) || 1;
  probs.forEach((p, j) => { for (let q = 0; q < 3; q++) c[q] += (p / s) * (CLS_COL[j][q] - BG_COL[q]) * k; });
  return c;
}
// img の全部の画素に fn(u, v) → [r, g, b] を塗る（u は右向き、v は上向き、どちらも 0〜1）
function paintImage(img, fn) {
  img.loadPixels();
  let W = img.width, H = img.height;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    let c = fn((px + 0.5) / W, 1 - (py + 0.5) / H), i = 4 * (px + W * py);
    img.pixels[i] = c[0]; img.pixels[i + 1] = c[1]; img.pixels[i + 2] = c[2]; img.pixels[i + 3] = 255;
  }
  img.updatePixels();
}
function toPx(bx, u, v) { return [bx.x + u * bx.w, bx.y + (1 - v) * bx.h]; }   // [0,1]² → 画面
function fromPx(bx, px, py) { return [(px - bx.x) / bx.w, 1 - (py - bx.y) / bx.h]; }
function drawPoints(bx, X, y, r, ws) {   // ws = 点の大きさの倍率（なければ 1）
  stroke(15); strokeWeight(1);
  for (let i = 0; i < X.length; i++) { let p = toPx(bx, X[i][0], X[i][1]); fill(...CLS_COL[y[i]]); circle(p[0], p[1], r * (ws ? ws[i] : 1)); }
}
function fmtNum(v, d) { if (!isFinite(v)) return '?'; let s = (+v.toFixed(d === undefined ? 2 : d)).toString(); return s === '-0' ? '0' : s; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
