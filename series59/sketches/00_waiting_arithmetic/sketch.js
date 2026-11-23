// ============================================
// 00 待ち合わせの算数 ─ 「2 人とも揃ったら出発」は max、「移動に t 分」は +
// A さん（a 分）と B さん（b 分）が駅 1 に着く。揃ったら出発 = max(a, b)、t1 分で駅 2 へ。そこで C さん（c 分）と合流して t2 分でゴール
//   a ⊕ b = max(a, b)、a ⊗ t = a + t と書くと、ゴールの時刻 = ((a ⊕ b) ⊗ t1 ⊕ c) ⊗ t2 = a⊗t1⊗t2 ⊕ b⊗t1⊗t2 ⊕ c⊗t2（1 次式！）
//   ε = −∞ は「待たなくていい人（来ない人）」、e = 0 は「所要時間 0」
// ドラッグ 到着時刻を動かす / ↑↓ t1 / ← → t2 / B・C その人を ε（来ない）にする / R ランダム
// ============================================

let arr = { a: 12, b: 20, c: 45 };     // ★ 3 人の到着時刻（分）。NEG_INF にすると「来ない人」
let t1 = 18, t2 = 10;                  // ★ 駅 1 → 駅 2、駅 2 → ゴールの所要時間（分）
const T_MAX = 100;                     // タイムラインの長さ（分）
let dragging = null, saved = { b: 20, c: 45 };

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); }

// ★ 待ち合わせの計算（ふつうの書き方）
function plainTrip(a, b, c, t1, t2) {
  let dep1 = mpAdd(a, b);                       // 揃ったら出発（max）
  let arr2 = mpMul(dep1, t1);                   // 移動（+）
  let dep2 = mpAdd(arr2, c);                    // 駅 2 で C を待つ
  return { dep1, arr2, dep2, goal: mpMul(dep2, t2) };
}
// ★ 展開した 1 次式：a⊗t1⊗t2 ⊕ b⊗t1⊗t2 ⊕ c⊗t2（どの項がいちばん大きい？ = だれが全体を決める？）
function expandedTerms(a, b, c, t1, t2) {
  return [{ who: 'A', v: mpMul(mpMul(a, t1), t2) }, { who: 'B', v: mpMul(mpMul(b, t1), t2) }, { who: 'C', v: mpMul(c, t2) }];
}

function draw() {
  background(22, 22, 28);
  let tl = { x: 140, y: 120, w: width - 200, h: 300, x0: 0, x1: T_MAX, y0: 0, y1: 1 };
  let res = plainTrip(arr.a, arr.b, arr.c, t1, t2), terms = expandedTerms(arr.a, arr.b, arr.c, t1, t2);
  let win = terms.reduce((m, t) => (t.v > m.v ? t : m), { who: '', v: NEG_INF });
  let rows = [tl.y + 40, tl.y + 150, tl.y + 260], names = ['駅 1', '駅 2', 'ゴール'];

  // ---- タイムライン
  stroke(60); strokeWeight(1);
  for (let m = 0; m <= T_MAX; m += 10) line(gX(tl, m), tl.y, gX(tl, m), tl.y + tl.h);
  noStroke(); fill(150); textSize(12); textAlign(CENTER, TOP);
  for (let m = 0; m <= T_MAX; m += 10) text(m + ' 分', gX(tl, m), tl.y + tl.h + 6);
  textAlign(RIGHT, CENTER); textSize(16); fill(210);
  for (let r = 0; r < 3; r++) text(names[r], tl.x - 16, rows[r]);
  stroke(80); for (let r = 0; r < 3; r++) line(tl.x, rows[r], tl.x + tl.w, rows[r]);
  // 待ち時間（早く着いた人が待つ）と移動
  let wait = (from, to, y, col) => { if (from === NEG_INF || to === NEG_INF || to <= from) return; stroke(col); strokeWeight(6); line(gX(tl, from), y, gX(tl, to), y); };
  wait(arr.a, res.dep1, rows[0] - 14, color(255, 170, 70, 120)); wait(arr.b, res.dep1, rows[0] + 14, color(110, 190, 255, 120));
  wait(res.arr2, res.dep2, rows[1] - 14, color(255, 220, 120, 120)); wait(arr.c, res.dep2, rows[1] + 14, color(150, 230, 160, 120));
  if (res.dep1 !== NEG_INF) { stroke(240); strokeWeight(3); line(gX(tl, res.dep1), rows[0], gX(tl, res.arr2), rows[1]); }
  if (res.dep2 !== NEG_INF) { stroke(240); strokeWeight(3); line(gX(tl, res.dep2), rows[1], gX(tl, res.goal), rows[2]); }
  // 人のマーカー（ε の人は左はしに薄く）
  let marker = (key, y, col, lab) => {
    let v = arr[key], x = v === NEG_INF ? tl.x - 70 : gX(tl, v);
    noStroke(); fill(v === NEG_INF ? color(red(col), green(col), blue(col), 70) : col); circle(x, y, 26);
    fill(20); textAlign(CENTER, CENTER); textSize(14); text(lab, x, y);
    fill(220); textSize(13); textAlign(RIGHT, CENTER); text(v === NEG_INF ? 'ε（来ない）' : mpFmt(v, 0) + ' 分', x - 18, y);
  };
  marker('a', rows[0] - 14, color(255, 170, 70), 'A'); marker('b', rows[0] + 14, color(110, 190, 255), 'B'); marker('c', rows[1] + 14, color(150, 230, 160), 'C');
  noStroke(); fill(255, 230, 120);
  for (let [v, y, s] of [[res.dep1, rows[0], '出発'], [res.dep2, rows[1], '出発'], [res.goal, rows[2], '到着']]) if (v !== NEG_INF) { circle(gX(tl, v), y, 12); textSize(13); textAlign(LEFT, CENTER); text(s + ' ' + mpFmt(v, 0), gX(tl, v) + 10, y + 22); }

  // ---- 式
  let f = (v) => mpFmt(v, 0), y0 = tl.y + tl.h + 60;
  textAlign(LEFT, BASELINE); textSize(22); fill(240);
  text('駅 1 の出発 = a ⊕ b = ' + f(arr.a) + ' ⊕ ' + f(arr.b) + ' = ' + f(res.dep1) + '　（max）', 40, y0);
  text('ゴール = ((a ⊕ b) ⊗ t1 ⊕ c) ⊗ t2 = ((' + f(res.dep1) + ' ⊗ ' + t1 + ') ⊕ ' + f(arr.c) + ') ⊗ ' + t2 + ' = ' + f(res.goal), 40, y0 + 36);
  fill(255, 220, 120);
  text('展開すると 1 次式：a⊗t1⊗t2 ⊕ b⊗t1⊗t2 ⊕ c⊗t2 = ' + terms.map((t) => f(t.v)).join(' ⊕ ') + ' = ' + f(mpAdd(mpAdd(terms[0].v, terms[1].v), terms[2].v)), 40, y0 + 72);
  fill(200); textSize(17);
  text(win.who ? 'いちばん大きい項は ' + win.who + ' さん → ' + win.who + ' さんが 1 分遅れるとゴールも 1 分遅れる。ほかの人は少し遅れても影響なし（係数は「0 か 1」）' : 'だれも来ない → ゴールも ε', 40, y0 + 108);
  fill(160); textSize(16);
  text('ふつうの算数 → マックスプラス：　足す + → max（⊕）　掛ける × → +（⊗）　0 → ε = −∞（⊕ しても変わらない）　1 → e = 0（⊗ しても変わらない）', 40, y0 + 142);
  fill(240); textSize(20); text('待ち合わせの算数　t1 = ' + t1 + ' 分、t2 = ' + t2 + ' 分', 40, 40);
  fill(170); textSize(15); text('ドラッグ 到着時刻　↑↓ t1　← → t2　B・C その人を ε（来ない）に　R ランダム', 40, 66);
  drawSelfTest(width - 170, height - 12);
}

function personAt(mx, my) {
  let tl = { x: 140, y: 120, w: width - 200, h: 300, x0: 0, x1: T_MAX, y0: 0, y1: 1 }, ys = { a: tl.y + 26, b: tl.y + 54, c: tl.y + 164 };
  for (let k of ['a', 'b', 'c']) { let x = arr[k] === NEG_INF ? tl.x - 70 : gX(tl, arr[k]); if (Math.hypot(mx - x, my - ys[k]) < 16) return k; }
  return null;
}
function mousePressed() { dragging = personAt(mouseX, mouseY); }
function mouseDragged() {
  if (!dragging) return;
  let v = Math.round(((mouseX - 140) / (width - 200)) * T_MAX);
  arr[dragging] = clampv(v, 0, T_MAX - 10);
}
function mouseReleased() { dragging = null; }
function keyPressed() {
  if (key === UP_ARROW) t1 = Math.min(40, t1 + 1);
  if (key === DOWN_ARROW) t1 = Math.max(0, t1 - 1);
  if (key === RIGHT_ARROW) t2 = Math.min(40, t2 + 1);
  if (key === LEFT_ARROW) t2 = Math.max(0, t2 - 1);
  for (let k of ['b', 'c']) if (key === k || key === k.toUpperCase()) { if (arr[k] === NEG_INF) arr[k] = saved[k]; else { saved[k] = arr[k]; arr[k] = NEG_INF; } }
  if (key === 'r' || key === 'R') { arr.a = Math.floor(Math.random() * 40); arr.b = Math.floor(Math.random() * 40); arr.c = Math.floor(Math.random() * 70); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(59);
  let vals = () => (rnd() < 0.2 ? NEG_INF : rndInt(-20, 60)), same = true, noN = true, crit = true, lip = true;
  for (let n = 0; n < 400; n++) {
    let a = vals(), b = vals(), c = vals(), s = rndInt(0, 30), u = rndInt(0, 30);
    let g1 = plainTrip(a, b, c, s, u).goal, ts = expandedTerms(a, b, c, s, u), g2 = mpAdd(mpAdd(ts[0].v, ts[1].v), ts[2].v);
    if (g1 !== g2) same = false;
    if (!noNaN([g1, g2])) noN = false;
    if (g1 !== NEG_INF && !ts.some((t) => t.v === g1)) crit = false;
    if (a !== NEG_INF) { let g3 = plainTrip(a + 1, b, c, s, u).goal; if (!(g3 >= g1 && g3 <= g1 + 1)) lip = false; }
  }
  check('入れ子の式 ((a⊕b)⊗t1 ⊕ c)⊗t2 = 展開した 1 次式（400 通り、ε も入れて）', same);
  check('ε は ⊕ の単位元（a ⊕ ε = a）、⊗ では吸収（a ⊗ ε = ε）、e = 0 は ⊗ の単位元', [-3, 0, 7].every((a) => mpAdd(a, NEG_INF) === a && mpMul(a, NEG_INF) === NEG_INF && mpMul(a, 0) === a) && mpMul(NEG_INF, NEG_INF) === NEG_INF);
  check('NaN が一度も出ない（ε どうしの ⊗・⊕ も）', noN && noNaN([mpAdd(NEG_INF, NEG_INF), mpMul(NEG_INF, 5)]));
  check('ゴールの時刻は必ずどれか 1 つの項と等しい（全体を決める人がいる）', crit);
  check('A が 1 分遅れると、ゴールは 0〜1 分遅れる（増えるだけ・1 分より多くは遅れない）', lip);
  check('ε の表示は「ε」（−Infinity と書かない）', mpFmt(NEG_INF) === 'ε' && mpFmt(-0.04) === '0');
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. A さんをドラッグして、B さんより遅くしたり早くしたりしよう。駅 1 の出発時刻はどう変わる？
// 2. C さんがとても遅いとき、A や B が遅れてもゴールは変わらない。なぜ？（max の中で負けている項）
// 3. B キーで B さんを ε（来ない）にすると、式のどこが消える？ ε ⊕ a = a を確かめよう
// 4. 3 つ目の駅と D さんを足して、式を 1 次式に展開してみよう
// 5. 06・07 では、この「待ち合わせ」を行列でまとめて、列車や工場のダイヤを計算する

// ==================================================
// ここから下は「マックスプラスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- マックスプラスの数：ε = −∞（「ゼロ」= 起きない・制約なし）、e = 0（「いち」= 待ち時間なし）
const NEG_INF = -Infinity;
function mpAdd(a, b) { return a >= b ? a : b; }                                   // a ⊕ b = max(a, b)
function mpMul(a, b) { return a === NEG_INF || b === NEG_INF ? NEG_INF : a + b; }  // a ⊗ b = a + b（ε があれば ε。−∞ + ∞ を作らない）
function mpFmt(v, d) {                                                             // ε を「ε」と表示（−Infinity を見せない）
  if (v === NEG_INF) return 'ε';
  if (v === Infinity) return '+∞';
  if (typeof v !== 'number' || v !== v) return '?';
  let s = (+v.toFixed(d === undefined ? 1 : d)).toString();
  return s === '-0' ? '0' : s;
}
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
// ---- グラフと図の道具：g = { x, y, w, h, x0, x1, y0, y1 }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
