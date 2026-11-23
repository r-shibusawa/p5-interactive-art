// ============================================
// 11 時間付きペトリネット（イベントグラフ） ─ □ トランジション（できごと）、○ プレース（条件）、● トークン（そろった条件）
// 入ってくるプレース全部に「保持時間 h を過ぎたトークン」があると発火し、出ていくプレースにトークンを 1 つずつ置く
//   プレース j → i（トークン m 個、保持 h）は「x_i(k) ≥ x_j(k − m) + h」→ x(k) = A0⊗x(k) ⊕ A1⊗x(k−1) ⊕ A2⊗x(k−2)
//   トークンを 1 つずつ動かすシミュレーションと、マックスプラスの漸化式の発火時刻がぴったり一致する
// プレース ○ をクリックで選ぶ / ↑↓ 保持時間 / ← → トークンの数（0〜2）/ スペース 一時停止 / R 時刻を 0 に
// ============================================

const TR_NAMES = ['T0 投入', 'T1 機械1→2', 'T2 機械2 終了', 'T3 搬出'];
let places = [                         // ★ プレース：from → to、保持時間 h（分）、はじめのトークン m
  { from: 0, to: 1, h: 4, m: 0, note: '機械 1 で加工' }, { from: 1, to: 0, h: 0, m: 1, note: '機械 1 が空く' },
  { from: 1, to: 2, h: 5, m: 0, note: '機械 2 で加工' }, { from: 2, to: 1, h: 0, m: 1, note: '機械 2 が空く' },
  { from: 2, to: 3, h: 2, m: 0, note: '運ぶ' }, { from: 3, to: 0, h: 3, m: 2, note: 'パレットが戻る' }, { from: 3, to: 3, h: 1, m: 1, note: '搬出ロボット' },
];
const NT = 4, K_FIRE = 40;
let tpos = [], sel = 2, tNow = 0, paused = false, rec = null, simF = null;

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR);
  tpos = [[0.12, 0.42], [0.32, 0.25], [0.52, 0.42], [0.32, 0.62]].map(([x, y]) => ({ x: x * width, y: y * height }));
  selfTest(); recompute();
}
// ★ ネットから行列 A0, A1, A2（a_ij = プレース j → i の保持時間、トークン m 個なら A_m）
function netMatrices(pl) { let As = [0, 1, 2].map(() => mpMat(NT, NT)); for (let p of pl) As[p.m][p.to][p.from] = mpAdd(As[p.m][p.to][p.from], p.h); return As; }
// ★ マックスプラスの漸化式：x(k) = A0* ⊗ (A1 ⊗ x(k−1) ⊕ A2 ⊗ x(k−2))、k ≤ 0 は 0（はじめのトークンは時刻 0 に置いてある）
function recursion(pl, K) {
  let [A0, A1, A2] = netMatrices(pl), st = mpStar(A0), x = [];
  if (mpPow(A0, NT).flat().some((v) => v !== NEG_INF)) return null;      // トークン 0 の回路 = デッドロック
  let get = (k) => (k <= 0 ? new Array(NT).fill(0) : x[k - 1]);
  for (let k = 1; k <= K; k++) x.push(mpMatVec(st.star, mpMatVec(A1, get(k - 1)).map((v, i) => mpAdd(v, mpMatVec(A2, get(k - 2))[i]))));
  return x;
}
// ★ トークンを 1 つずつ動かすシミュレーション（いちばん早く発火できるトランジションから順に）
function tokenGame(pl, K) {
  let q = pl.map((p) => new Array(p.m).fill(0)), fires = Array.from({ length: NT }, () => []);
  for (let guard = 0; guard < NT * K * 4; guard++) {
    let best = -1, bt = Infinity;
    for (let t = 0; t < NT; t++) {
      if (fires[t].length >= K) continue;
      let ins = pl.map((p, i) => i).filter((i) => pl[i].to === t), e = 0;
      if (ins.some((i) => q[i].length === 0)) continue;
      for (let i of ins) e = Math.max(e, q[i][0] + pl[i].h);
      if (e < bt) { bt = e; best = t; }
    }
    if (best < 0) break;
    pl.forEach((p, i) => { if (p.to === best) q[i].shift(); });
    pl.forEach((p, i) => { if (p.from === best) q[i].push(bt); });
    fires[best].push(bt);
  }
  return fires;                        // fires[t][k−1] = k 回目の発火時刻
}
function cycleRatio(pl) {             // 回路の (保持時間の和) / (トークンの和) の最大 = 周期 λ
  let best = NEG_INF, dfs = (s, v, used, w, m) => {
    for (let p of pl) if (p.from === v) {
      if (p.to === s) { if (m + p.m > 0) best = Math.max(best, (w + p.h) / (m + p.m)); }
      else if (p.to > s && !used.includes(p.to)) dfs(s, p.to, used.concat([p.to]), w + p.h, m + p.m);
    }
  };
  for (let s = 0; s < NT; s++) dfs(s, s, [s], 0, 0);
  return best;
}
function recompute() { rec = recursion(places, K_FIRE); simF = tokenGame(places, K_FIRE); tNow = 0; }

function draw() {
  background(22, 22, 28);
  if (!paused && rec) tNow += 0.05;
  if (rec && tNow > rec[K_FIRE - 1][0]) tNow = 0;
  // ---- プレースと矢印
  places.forEach((p, pi) => {
    let a = tpos[p.from], b = tpos[p.to], pc = placePos(pi), act = pi === sel;
    stroke(act ? color(255, 220, 120) : 120); strokeWeight(act ? 2.5 : 1.5); noFill();
    if (p.from === p.to) { line(a.x + 11, a.y - 10, pc.x, pc.y); line(pc.x, pc.y, a.x + 11, a.y + 20); } else { line(a.x, a.y, pc.x, pc.y); line(pc.x, pc.y, b.x, b.y); }
    // トークン：時刻 tNow にこのプレースにあるもの（色 = 保持時間を過ぎた / まだ）
    let dep = rec ? new Array(p.m).fill(0).concat(rec.map((x) => x[p.from])) : [], con = rec ? rec.map((x) => x[p.to]) : [], here = [];
    for (let n = 0; n < Math.min(dep.length, con.length); n++) if (dep[n] <= tNow && tNow < con[n]) here.push(tNow - dep[n] >= p.h);
    stroke(act ? color(255, 220, 120) : 200); fill(34); circle(pc.x, pc.y, 46);
    noStroke(); here.slice(0, 6).forEach((ready, q) => { fill(ready ? color(255, 170, 70) : color(110, 190, 255)); circle(pc.x - 12 + (q % 3) * 12, pc.y - 6 + Math.floor(q / 3) * 12, 9); });
    fill(200); textSize(11); textAlign(CENTER, TOP); text('h=' + p.h + ' m=' + p.m, pc.x, pc.y + 25);
  });
  for (let t = 0; t < NT; t++) {
    let fired = rec && rec.some((x) => Math.abs(x[t] - tNow) < 0.15);
    stroke(220); strokeWeight(2); fill(fired ? color(255, 220, 120) : color(60, 90, 140)); rectMode(CENTER); rect(tpos[t].x, tpos[t].y, 22, 64); rectMode(CORNER);
    noStroke(); fill(230); textSize(13); textAlign(CENTER, BOTTOM); text(TR_NAMES[t], tpos[t].x, tpos[t].y - 36);
  }
  // ---- 発火時刻の表：漸化式 / トークンのシミュレーション
  let tx = width * 0.62, ty = 130, ok = rec && simF.every((f, t) => f.length === K_FIRE && f.every((v, k) => v === rec[k][t]));
  textAlign(LEFT, BASELINE); noStroke(); fill(220); textSize(15); text('発火時刻 x_i(k)（漸化式 ／ シミュレーション）', tx, ty - 16);
  for (let k = 0; k <= 10; k++) {
    fill(150); textSize(13); text(k === 0 ? '' : 'k=' + k, tx, ty + 12 + k * 22);
    for (let t = 0; t < NT; t++) {
      if (k === 0) { fill(200); text('T' + t, tx + 50 + t * 105, ty + 12); continue; }
      let r = rec ? rec[k - 1][t] : NaN, s = simF[t][k - 1];
      fill(rec && r === s ? color(160, 220, 180) : color(255, 130, 120)); text(rec ? mpFmt(r) + ' ／ ' + (s === undefined ? '—' : mpFmt(s)) : '—', tx + 50 + t * 105, ty + 12 + k * 22);
    }
  }
  let lam = cycleRatio(places), y0 = ty + 280;
  fill(ok ? color(120, 210, 150) : color(255, 120, 110)); textSize(17);
  text(!rec ? 'デッドロック：トークン 0 個の回路がある（だれも発火できない）' : ok ? '✓ ' + K_FIRE + ' 回分すべて一致' : '✗ 一致しない', tx, y0, width - tx - 30);
  fill(220); textSize(15);
  if (rec) text('周期 λ = max（回路の保持時間の和 ÷ トークンの数）= ' + mpFmt(lam, 3) + ' 分　（シミュレーションの傾き ' + ((rec[K_FIRE - 1][0] - rec[K_FIRE - 21][0]) / 20).toFixed(3) + '）', tx, y0 + 26, width - tx - 30);
  fill(255, 220, 120); textSize(15);
  let p = places[sel]; text('選んだプレース：T' + p.from + ' → T' + p.to + '「' + p.note + '」 h = ' + p.h + '、m = ' + p.m, tx, y0 + 90, width - tx - 30);
  // ---- タイトル
  fill(240); textSize(20); text('時間付きペトリネット　t = ' + tNow.toFixed(1) + ' 分' + (paused ? '（一時停止）' : ''), 40, 40);
  fill(170); textSize(15); text('○ をクリックで選ぶ　↑↓ 保持時間　← → トークン（0〜2）　スペース 一時停止　R 時刻 0　● オレンジ = 使える、青 = 保持中', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function placePos(pi) {
  let p = places[pi], a = tpos[p.from], b = tpos[p.to];
  if (p.from === p.to) return { x: a.x + 70, y: a.y + 40 };
  let dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, twin = places.some((q) => q.from === p.to && q.to === p.from) ? 34 : 0;
  return { x: (a.x + b.x) / 2 - (dy / L) * twin, y: (a.y + b.y) / 2 + (dx / L) * twin };
}

function mousePressed() { places.forEach((p, i) => { let c = placePos(i); if (Math.hypot(mouseX - c.x, mouseY - c.y) < 24) sel = i; }); }
function keyPressed() {
  let p = places[sel];
  if (key === UP_ARROW) p.h = Math.min(12, p.h + 1);
  if (key === DOWN_ARROW) p.h = Math.max(0, p.h - 1);
  if (key === RIGHT_ARROW) p.m = Math.min(2, p.m + 1);
  if (key === LEFT_ARROW) p.m = Math.max(0, p.m - 1);
  if (key === ' ') paused = !paused;
  if (key !== ' ') recompute();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let same = (pl, K) => { let r = recursion(pl, K), f = tokenGame(pl, K); return r && f.every((fs, t) => fs.length === K && fs.every((v, k) => v === r[k][t])); };
  check('はじめのネット：トークンのシミュレーション = マックスプラスの漸化式（40 回 × 4 トランジション）', same(places, 40));
  seedRng(11);
  let okR = true, okDL = true, okL = true, cnt = 0;
  for (let t = 0; t < 60; t++) {
    let pl = places.map((p) => ({ from: p.from, to: p.to, h: rndInt(0, 9), m: rndInt(0, 2) })), r = recursion(pl, 60);
    if (r) { cnt++; if (!same(pl, 60) || !noNaN(r)) okR = false; if (Math.abs((r[59][0] - r[39][0]) / 20 - cycleRatio(pl)) > 1e-9 && Math.abs((r[59][0] - r[59 - 24][0]) / 24 - cycleRatio(pl)) > 1e-9) okL = false; }
    else if (tokenGame(pl, 5).every((f) => f.length === 5)) okDL = false;                 // デッドロックなら本当に止まる
  }
  check('ランダムな保持時間・トークン（生きている ' + cnt + ' 例）でもシミュレーション = 漸化式、NaN なし', okR && cnt > 10);
  check('トークン 0 の回路があるとき（A0 にべき零でない）、シミュレーションも本当に止まる', okDL);
  check('長い目で見た発火の間隔 = 回路の (保持時間の和)/(トークンの和) の最大', okL);
  let A0 = netMatrices(places)[0];
  check('はじめのネット：A0（トークン 0 のプレース）に回路なし、λ = max(4+0, 5+0, (4+5+2+3)/2, 1) = 7', mpPow(A0, NT).flat().every((v) => v === NEG_INF) && cycleRatio(places) === 7);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 「パレットが戻る」プレースのトークンを ← → で 1・2 に変えると、周期 λ はどう変わる？
// 2. 機械 2 の加工時間 h を ↑ で長くしていくと、どこでボトルネックが入れかわる？
// 3. 「機械 1 が空く」のトークンを 0 にするとデッドロック。なぜ？（どの条件もそろわない回路）
// 4. 表の 2 つの数（漸化式 ／ シミュレーション）がいつも同じなのはなぜ？
// 5. 07 の生産ラインをこのペトリネットで描いてみよう（パレット = 戻りのプレースのトークン）

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
// ---- マックスプラス行列（配列の配列）。(A ⊗ B)_ij = max_k (a_ik + b_kj)
function mpMat(n, m, v) { return Array.from({ length: n }, () => new Array(m).fill(v === undefined ? NEG_INF : v)); }
function mpEye(n) { let I = mpMat(n, n); for (let i = 0; i < n; i++) I[i][i] = 0; return I; }      // 単位行列 E（対角 e = 0、他は ε）
function mpMatMul(A, B) {
  let n = A.length, m = B[0].length, q = B.length, C = mpMat(n, m);
  for (let i = 0; i < n; i++) for (let k = 0; k < q; k++) {
    let a = A[i][k]; if (a === NEG_INF) continue;
    for (let j = 0; j < m; j++) { let b = B[k][j]; if (b !== NEG_INF && a + b > C[i][j]) C[i][j] = a + b; }
  }
  return C;
}
function mpMatAdd(A, B) { return A.map((r, i) => r.map((v, j) => mpAdd(v, B[i][j]))); }
function mpMatVec(A, x) { return A.map((r) => { let s = NEG_INF; for (let j = 0; j < r.length; j++) s = mpAdd(s, mpMul(r[j], x[j])); return s; }); }
function mpPow(A, k) { let P = mpEye(A.length); for (let t = 0; t < k; t++) P = mpMatMul(P, A); return P; }
// A* = E ⊕ A ⊕ A² ⊕ … ⊕ A^(n−1)。正の回路があると A* は発散する → positive = true（tol は計算誤差のゆとり）
function mpStar(A, tol) {
  let n = A.length, St = mpMatAdd(mpEye(n), A), P = A, plus = A.map((r) => r.slice());
  for (let k = 2; k <= n; k++) { P = mpMatMul(P, A); plus = mpMatAdd(plus, P); if (k < n) St = mpMatAdd(St, P); }
  let positive = false; for (let i = 0; i < n; i++) if (plus[i][i] > (tol === undefined ? 1e-9 : tol)) positive = true;
  return { star: St, positive };
}
// 残余（いちばん大きい劣解）：A ⊗ x ≤ b を満たす最大の x。x_j = min_i (b_i − a_ij)（a_ij = ε の行は制約なし）
function mpResid(A, b) {
  let m = A[0].length, x = new Array(m).fill(Infinity);
  for (let j = 0; j < m; j++) for (let i = 0; i < A.length; i++) {
    if (A[i][j] === NEG_INF) continue;
    let v = b[i] === NEG_INF ? NEG_INF : b[i] - A[i][j];
    if (v < x[j]) x[j] = v;
  }
  return x;                            // どの行にも関係しない列は +∞（いくら遅くてもよい）
}
function mpVecLeq(u, v, tol) { return u.every((a, i) => a === NEG_INF || a <= v[i] + (tol || 1e-9)); }
function mpVecEq(u, v, tol) { return u.every((a, i) => (a === NEG_INF && v[i] === NEG_INF) || (a !== NEG_INF && v[i] !== NEG_INF && Math.abs(a - v[i]) <= (tol || 1e-9))); }
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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
