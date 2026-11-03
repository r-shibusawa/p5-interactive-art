// ============================================
// 08 カタラン数
// Dyck 経路（対角線を越えない格子路）・正しい括弧列・二分木・多角形の三角形分割は
// どれも同じ数 C_n = 1, 1, 2, 5, 14, 42, … で数えられる（全部が 1 対 1 に対応する）
// ↑↓ = n（1〜5）/ ←→ or クリック = どれを見るか / スペース = 自動で次へ
// ============================================

let n = 3;                // ★ 対の数（括弧 n 組、辺 2n の経路、内部節点 n 個の木）
let items = [];           // 括弧列の一覧（辞書順）
let sel = 0;
let auto = true;
let tick = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

// ★ 正しい括弧列を全部つくる（開き > 閉じ を守りながら再帰）
function rebuild() {
  items = [];
  function rec(s, open, close) {
    if (s.length === 2 * n) { items.push(s); return; }
    if (open < n) rec(s + '(', open + 1, close);
    if (close < open) rec(s + ')', open, close + 1);
  }
  rec('', 0, 0);
  sel = 0;
}

function catalan(m) { let c = [1]; for (let i = 1; i <= m; i++) { let s = 0; for (let j = 0; j < i; j++) s += c[j] * c[i - 1 - j]; c.push(s); } return c; }

// 括弧列 → 二分木：'(' 左部分木 ')' 右部分木
function parseTree(s, pos) {
  if (pos.i >= s.length || s[pos.i] !== '(') return null;
  pos.i++;
  let left = parseTree(s, pos);
  pos.i++;                     // ')'
  let right = parseTree(s, pos);
  return { left, right, size: 1 + (left ? left.size : 0) + (right ? right.size : 0) };
}

function draw() {
  background(226, 28, 11);
  if (auto) { tick += deltaTime / 1000; if (tick > 1.2) { tick = 0; sel = (sel + 1) % items.length; } }
  let s = items[sel];
  let C = catalan(6);

  // 一覧（上の帯）：小さな Dyck 経路
  let tileW = Math.min(90, (width - 60) / items.length), ty = 100;
  for (let i = 0; i < items.length; i++) {
    let x = 30 + i * tileW;
    if (i === sel) { noStroke(); fill(50, 80, 100, 25); rect(x - 4, ty - 44, tileW - 2, 60, 5); }
    drawDyck(items[i], x, ty + 8, Math.min(tileW - 10, 80) / (2 * n), i === sel ? 2 : 1);
  }

  // 4 つの表現
  let colW = (width - 80) / 4, top = 220, boxH = height - top - 60;
  let titles = ['Dyck 経路（上は対角線を越えない）', '括弧列', '二分木（( 左 ) 右）', '多角形の三角形分割（' + (n + 2) + ' 角形）'];
  for (let c = 0; c < 4; c++) {
    let x = 40 + c * colW;
    noStroke(); fill(0, 0, 100, 6); rect(x, top, colW - 16, boxH, 10);
    fill(0, 0, 85); textSize(14); text(titles[c], x + 12, top + 24);
  }
  // 1: Dyck
  let u = Math.min((colW - 60) / (2 * n), 36);
  drawDyck(s, 40 + 20, top + boxH - 60, u, 5);
  // 2: 括弧列（深さを表示）
  let bx = 40 + colW + 20, by = top + 80;
  textSize(Math.min(40, (colW - 50) / (2 * n) * 1.6));
  let depth = 0, cw = (colW - 50) / (2 * n);
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    fill(s[i] === '(' ? 140 : 20, 70, 100);
    text(s[i], bx + i * cw, by + depth * 22);
    if (s[i] === ')') depth--;
  }
  fill(0, 0, 60); textSize(13);
  text('どこで切っても「( の数 ≥ ) の数」', bx, top + boxH - 30);
  // 3: 二分木
  let tree = parseTree(s, { i: 0 });
  drawTree(tree, 40 + 2 * colW + (colW - 16) / 2, top + 70, (colW - 40) / 4, 60);
  // 4: 三角形分割
  let cx = 40 + 3 * colW + (colW - 16) / 2, cy = top + boxH / 2 + 10, R = Math.min(colW, boxH) * 0.36;
  drawTriangulation(tree, cx, cy, R);

  // 漸化式
  noStroke(); fill(0, 0, 100); textSize(18);
  text('n = ' + n + '（↑↓）　C_' + n + ' = ' + items.length + '　［' + (sel + 1) + ' / ' + items.length + '］ ←→ / クリック　スペース：自動 ' + (auto ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 60); textSize(15);
  let rec = [];
  for (let j = 0; j < n; j++) rec.push('C_' + j + '·C_' + (n - 1 - j));
  let recV = [];
  for (let j = 0; j < n; j++) recV.push(C[j] * C[n - 1 - j]);
  text('C_n = Σ C_j · C_{n−1−j}：C_' + n + ' = ' + rec.join(' + ') + ' = ' + recV.join(' + ') + ' = ' + C[n] + '　　C_n = C(2n,n)/(n+1)：' + C.slice(0, 7).join(', ') + ' …', 20, 68);
  fill(0, 0, 50); textSize(13);
  text('最初の ( とそれに対応する ) で「中」と「後ろ」に分かれる → 中が j 組、後ろが n−1−j 組（漸化式の意味）', 20, 140 + 20);
}

function drawDyck(s, x0, y0, u, sw) {
  // 対角線（上限）
  stroke(0, 0, 35); strokeWeight(1);
  line(x0, y0, x0 + 2 * n * u, y0);
  let x = x0, y = y0;
  stroke(50, 80, 100); strokeWeight(sw); noFill();
  beginShape();
  vertex(x, y);
  for (let ch of s) { x += u; y += ch === '(' ? -u : u; vertex(x, y); }
  endShape();
  if (sw > 2) {
    noStroke();
    x = x0; y = y0;
    fill(0, 0, 100); circle(x, y, 8);
    for (let ch of s) { x += u; y += ch === '(' ? -u : u; circle(x, y, 8); }
  }
}

function drawTree(t, x, y, dx, dy) {
  if (!t) return;
  stroke(0, 0, 60); strokeWeight(2);
  if (t.left) { line(x, y, x - dx, y + dy); drawTree(t.left, x - dx, y + dy, dx * 0.55, dy); }
  if (t.right) { line(x, y, x + dx, y + dy); drawTree(t.right, x + dx, y + dy, dx * 0.55, dy); }
  noStroke(); fill(140, 70, 100); circle(x, y, 18);
  // 葉（null の子）は小さな四角
  fill(0, 0, 50);
  if (!t.left) rect(x - dx * 0.5 - 5, y + dy * 0.6 - 5, 10, 10);
  if (!t.right) rect(x + dx * 0.5 - 5, y + dy * 0.6 - 5, 10, 10);
}

// 二分木 → 三角形分割：辺 (a,b) を底辺にもつ三角形の頂点 = a + 左部分木の大きさ + 1
function drawTriangulation(tree, cx, cy, R) {
  let m = n + 2;
  let P = [];
  for (let i = 0; i < m; i++) { let a = -HALF_PI + (i * TWO_PI) / m; P.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }); }
  function rec(t, a, b) {
    if (!t) return;
    let apex = a + (t.left ? t.left.size : 0) + 1;
    noStroke(); fill((apex * 60) % 360, 50, 70, 50);
    triangle(P[a].x, P[a].y, P[apex].x, P[apex].y, P[b].x, P[b].y);
    rec(t.left, a, apex);
    rec(t.right, apex, b);
  }
  rec(tree, 0, m - 1);
  noFill(); stroke(0, 0, 80); strokeWeight(2);
  beginShape();
  for (let p of P) vertex(p.x, p.y);
  endShape(CLOSE);
  stroke(50, 80, 100); strokeWeight(3);
  line(P[0].x, P[0].y, P[m - 1].x, P[m - 1].y);   // 根に対応する辺
  noStroke(); fill(0, 0, 100);
  for (let i = 0; i < m; i++) circle(P[i].x, P[i].y, 8);
}

function mousePressed() {
  let tileW = Math.min(90, (width - 60) / items.length);
  if (mouseY > 50 && mouseY < 170) { let i = Math.floor((mouseX - 30) / tileW); if (i >= 0 && i < items.length) { sel = i; auto = false; } }
}

function keyPressed() {
  if (key === UP_ARROW && n < 5) { n++; rebuild(); }
  if (key === DOWN_ARROW && n > 1) { n--; rebuild(); }
  if (key === RIGHT_ARROW) { sel = (sel + 1) % items.length; auto = false; }
  if (key === LEFT_ARROW) { sel = (sel - 1 + items.length) % items.length; auto = false; }
  if (key === ' ') auto = !auto;
}

// ---------- やってみよう ----------
// 1. n = 3 の 5 通りを順に見て、経路の「山」と木の「枝」と三角形の「扇」がどう対応するか言葉にしよう
// 2. C_n = C(2n,n) − C(2n,n+1)：対角線を越える経路を「反射」で数えると引き算で出る（02 とつなぐ）
// 3. 括弧列の生成で close < open の条件を外すと、ただの 2^(2n) 通りの文字列になる。試して C_n と比べよう
// 4. 「n 段の階段を 1 段か 2 段で登る」はフィボナッチ、「山脈の形」はカタラン。似た問題でも数列がちがう
