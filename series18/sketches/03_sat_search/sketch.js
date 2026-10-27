// ============================================
// 03 SAT を探索木で解く
// 論理式（CNF：(x1 ∨ ¬x2 ∨ x3) ∧ … の形）を真にする変数の割り当てはある？
// 総当たりは 2ⁿ 枚の葉を全部見る。途中で「もう偽の節がある」と気づいたら枝を切る（バックトラック）
// さらに「残り 1 つで決まる節（単位節）」があれば迷わず進む（DPLL のアイデア）
// スペース：探索開始・一時停止 / 1：総当たり 2：枝刈り 3：枝刈り＋単位節 / R：新しい式 / U：充足不能な式
// ============================================

let nVars = 5;
let clauses = [];       // 例 [1, -2, 3] = (x1 ∨ ¬x2 ∨ x3)
let method = 2;
let gen = null, running = false;
let visited = [];       // { path, status }
let current = [];
let result = '';
let SPEED = 2;          // ★ 1 フレームに進める手数
let M_CLAUSES = 14;     // ★ R で作る節の数（多いほど充足不能になりやすい）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomFormula();
}

function randomFormula() {
  nVars = 5; clauses = [];
  for (let c = 0; c < M_CLAUSES; c++) {
    let vs = shuffle([1, 2, 3, 4, 5]).slice(0, 3).sort();
    clauses.push(vs.map((v) => (random() < 0.5 ? v : -v)));
  }
  restart();
}
function unsatFormula() {
  nVars = 4; clauses = [];
  for (let m = 0; m < 8; m++) clauses.push([1, 2, 3].map((v, i) => ((m >> i) & 1 ? -v : v)));
  clauses.push([4, -1, 2]);
  restart();
}
function restart() { visited = []; current = []; result = ''; gen = solve([], 0); running = false; }

// 節の状態： 1 = 真, -1 = 偽（全部の文字が偽）, 0 = まだ決まらない
function clauseState(cl, a) {
  let open = false;
  for (let lit of cl) {
    let v = a[abs(lit) - 1];
    if (v === undefined) { open = true; continue; }
    if ((lit > 0) === v) return 1;
  }
  return open ? 0 : -1;
}
function forcedValue(a) { // 次の変数が単位節で決まるか
  let next = a.length + 1;
  for (let cl of clauses) {
    if (clauseState(cl, a) !== 0) continue;
    let un = cl.filter((lit) => a[abs(lit) - 1] === undefined);
    if (un.length === 1 && abs(un[0]) === next) return un[0] > 0;
  }
  return undefined;
}

function* solve(a, depth) {
  current = a.slice();
  let states = clauses.map((cl) => clauseState(cl, a));
  let conflict = states.includes(-1);
  if (a.length === nVars) {
    let ok = states.every((s) => s === 1);
    visited.push({ path: a.slice(), status: ok ? 'sat' : 'conflict' });
    yield;
    return ok;
  }
  if (conflict && method >= 2) { visited.push({ path: a.slice(), status: 'conflict' }); yield; return false; }
  visited.push({ path: a.slice(), status: 'open' });
  yield;
  let forced = method === 3 ? forcedValue(a) : undefined;
  for (let v of [true, false]) {
    if (forced !== undefined && v !== forced) { visited.push({ path: a.concat([v]), status: 'skip' }); continue; }
    if (yield* solve(a.concat([v]), depth + 1)) return true;
  }
  return false;
}

function draw() {
  background(260, 30, 9);
  if (running && gen) {
    for (let k = 0; k < SPEED; k++) {
      let r = gen.next();
      if (r.done) { running = false; gen = null; result = r.value ? '充足可能！ 割り当てを見つけた' : '充足不能（どの割り当てでも偽）'; break; }
    }
  }

  // ---- 式 ----
  textAlign(LEFT, BASELINE); fill(0, 0, 100); noStroke(); textSize(18);
  text('スペース：探索　1：総当たり　2：枝刈り　3：枝刈り＋単位節　R：新しい式　U：充足不能な式', 20, 34);
  let x = 20, y = 70;
  textSize(17); textFont('monospace');
  for (let i = 0; i < clauses.length; i++) {
    let st = clauseState(clauses[i], current);
    let s = '(' + clauses[i].map((l) => (l > 0 ? 'x' : '¬x') + abs(l)).join('∨') + ')';
    let w = textWidth(s) + 16;
    if (x + w > width - 20) { x = 20; y += 28; }
    fill(st === 1 ? color(130, 70, 90) : st === -1 ? color(0, 80, 100) : color(0, 0, 75));
    text(s, x, y);
    x += w;
  }
  textFont('sans-serif');

  // ---- 探索木 ----
  let top = y + 50, bottom = height - 90, L = 40, W = width - 80;
  let levelH = (bottom - top) / nVars;
  let P = (path) => {
    let idx = 0;
    for (let b of path) idx = idx * 2 + (b ? 0 : 1);
    return { x: L + ((idx + 0.5) / pow(2, path.length)) * W, y: top + path.length * levelH };
  };
  for (let v of visited) {
    if (v.path.length === 0) continue;
    let a = P(v.path.slice(0, -1)), b = P(v.path);
    stroke(v.status === 'skip' ? color(0, 0, 25) : v.path[v.path.length - 1] ? color(190, 60, 80) : color(30, 60, 80));
    strokeWeight(v.status === 'skip' ? 1 : 2);
    line(a.x, a.y, b.x, b.y);
  }
  for (let v of visited) {
    let p = P(v.path);
    noStroke();
    if (v.status === 'sat') { fill(120, 90, 100); circle(p.x, p.y, 20); }
    else if (v.status === 'conflict') { stroke(0, 90, 100); strokeWeight(3); line(p.x - 6, p.y - 6, p.x + 6, p.y + 6); line(p.x - 6, p.y + 6, p.x + 6, p.y - 6); }
    else if (v.status === 'skip') { fill(0, 0, 30); circle(p.x, p.y, 6); }
    else { fill(0, 0, 90); circle(p.x, p.y, 10); }
  }
  // 段のラベル
  noStroke(); fill(0, 0, 60); textSize(14); textAlign(LEFT, CENTER);
  for (let d = 0; d < nVars; d++) text('x' + (d + 1) + ' を決める', 4, top + (d + 0.5) * levelH);

  // ---- 状態 ----
  textAlign(LEFT, BASELINE); textSize(18);
  let names = ['', '総当たり', '枝刈り（バックトラック）', '枝刈り＋単位節（DPLL 風）'];
  fill(50, 80, 100);
  let work = visited.filter((v) => v.status !== 'skip').length;
  text(names[method] + '　訪れた節点 ' + work + '　（総当たりなら ' + (pow(2, nVars + 1) - 1) + '）', 20, height - 52);
  fill(0, 0, 100);
  text(result || ('今の割り当て：' + current.map((b, i) => 'x' + (i + 1) + '=' + (b ? 'T' : 'F')).join(' ')), 20, height - 22);
  fill(0, 0, 55); textSize(14); textAlign(RIGHT, BASELINE);
  text('左の枝 = 真(T)　右の枝 = 偽(F)　× = 偽の節が出た　● = 解', width - 20, height - 22);
}

function keyPressed() {
  if (key === ' ') { if (!gen) restart(); running = !running; }
  if (key >= '1' && key <= '3') { method = int(key); restart(); }
  if (key === 'r' || key === 'R') randomFormula();
  if (key === 'u' || key === 'U') unsatFormula();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 同じ式で 1・2・3 を比べよう。訪れた節点はどれだけ減る？
// 2. U（充足不能）では全部調べないと「ない」と言えない。何節点かかる？
// 3. M_CLAUSES を 8 や 24 に。変数 5 個で節が何個をこえると充足不能が増える？（相転移：節/変数 ≈ 4.27）
