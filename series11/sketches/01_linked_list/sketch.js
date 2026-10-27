// ============================================
// 01 双方向連結リストと番兵
// 各要素が「次（next）」と「前（prev）」の 2 本の矢印を持つ。並び順は矢印で決まり、配列の番号はいらない
// 番兵 nil（灰色）を置くと、先頭と末尾の特別あつかいがなくなり、コードが短くなる（輪になったリスト）
// 操作：数字を打って Enter = 先頭に挿入 / S = 探索 / D = 削除 / 要素をクリック = 削除
//       スペース = ランダムな数を挿入 / R = リセット
// ============================================

let speed = 18;     // ★ 探索の 1 歩にかけるフレーム数（小さいほど速い）
let maxShow = 12;   // ★ 画面に並べる最大の数

let nil;            // 番兵（sentinel）
let buf = '';       // 打ち込み中の数字
let msg = '数字を打って Enter で挿入。S で探索、D で削除';
let scan = null;    // 探索中の状態 { key, x, mode, t }
let flash = null, flashT = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  resetAll();
}

function resetAll() {
  nil = { key: 'nil' };
  nil.next = nil; nil.prev = nil; // 空のリスト：番兵が自分自身を指す
  for (let k of [7, 23, 12, 5]) listInsert({ key: k });
  scan = null;
}

// ---------- リストの操作（どれも矢印のつなぎかえだけ）----------
function listInsert(x) {      // 先頭に入れる
  x.next = nil.next;
  nil.next.prev = x;
  nil.next = x;
  x.prev = nil;
}
function listDelete(x) {      // x を取り除く（番兵のおかげで if がいらない）
  x.prev.next = x.next;
  x.next.prev = x.prev;
}
function toArray() { let a = [], x = nil.next; while (x !== nil) { a.push(x); x = x.next; } return a; }

function draw() {
  background(14, 20, 28);
  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('双方向連結リスト（番兵つき）', 30, 24);
  fill(150, 165, 190); textSize(15);
  text('数字 + Enter = 挿入　S = 探索　D = 削除　クリック = 削除　スペース = ランダム挿入　R = リセット', 30, 60);
  fill(255); textSize(20); text('入力：' + buf + (frameCount % 60 < 30 ? '｜' : ''), 30, 92);

  // 探索のアニメーション
  if (scan && frameCount % speed === 0) advanceScan();
  if (flashT > 0) flashT--;

  let items = toArray();
  let all = [nil, ...items];
  let n = all.length;
  let w = min(110, (width - 80) / n), y = height * 0.48;
  let pos = new Map();
  all.forEach((x, i) => pos.set(x, { x: 40 + w * i + w / 2, y }));

  // next の矢印（上）と prev の矢印（下）
  for (let i = 0; i < n; i++) {
    let a = all[i], b = all[(i + 1) % n];
    let pa = pos.get(a), pb = pos.get(b);
    if (i < n - 1) {
      arrow(pa.x + 22, pa.y - 10, pb.x - 22, pb.y - 10, color(120, 220, 170));
      arrow(pb.x - 22, pb.y + 10, pa.x + 22, pa.y + 10, color(255, 170, 110));
    } else {
      // 末尾 → 番兵（輪をとじる）
      noFill(); strokeWeight(2);
      stroke(120, 220, 170, 160); bezier(pa.x, pa.y - 26, pa.x, y - 130, pb.x, y - 130, pb.x, pb.y - 26);
      stroke(255, 170, 110, 160); bezier(pb.x, pb.y + 26, pb.x, y + 130, pa.x, y + 130, pa.x, pa.y + 26);
    }
  }
  // 要素
  for (let x of all) {
    let p = pos.get(x);
    let isScan = scan && scan.x === x;
    stroke(isScan ? color(255, 214, 90) : color(80, 90, 120)); strokeWeight(isScan ? 4 : 1.5);
    fill(x === nil ? color(70, 75, 90) : color(40, 110, 150));
    if (flash === x && flashT > 0) fill(255, 214, 90);
    rect(p.x - 24, p.y - 26, 48, 52, 8);
    noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(x === nil ? 14 : 20);
    text(x.key, p.x, p.y);
  }
  fill(120, 220, 170); textAlign(LEFT, TOP); textSize(14);
  text('緑 = next（次へ）', 30, y - 160);
  fill(255, 170, 110); text('橙 = prev（前へ）', 30, y + 150);

  fill(255, 225, 140); textSize(19); textAlign(LEFT, TOP);
  text(msg, 30, height - 70);
}

function arrow(x1, y1, x2, y2, c) {
  stroke(c); strokeWeight(2); line(x1, y1, x2, y2);
  let a = atan2(y2 - y1, x2 - x1);
  noStroke(); fill(c);
  triangle(x2, y2, x2 - cos(a - 0.4) * 9, y2 - sin(a - 0.4) * 9, x2 - cos(a + 0.4) * 9, y2 - sin(a + 0.4) * 9);
}

function startScan(mode) {
  if (buf === '') { msg = '先に数字を打ってください'; return; }
  scan = { key: int(buf), x: nil.next, mode, steps: 1 };
  buf = '';
  msg = `探索(${scan.key})：先頭から順に比べていく…`;
}
function advanceScan() {
  let s = scan;
  if (s.x === nil) { msg = `${s.key} は見つからなかった（${s.steps - 1} 回比べて番兵まで来た）`; scan = null; return; }
  if (s.x.key === s.key) {
    if (s.mode === 'delete') { listDelete(s.x); msg = `${s.key} を削除：前の next と次の prev をつなぎかえるだけ（${s.steps} 回目で発見）`; }
    else { msg = `${s.key} を ${s.steps} 回目の比較で見つけた！`; flash = s.x; flashT = 60; }
    scan = null; return;
  }
  s.x = s.x.next; s.steps++;
}

function keyPressed() {
  if (key >= '0' && key <= '9') { if (buf.length < 3) buf += key; return; }
  if (key === BACKSPACE) { buf = buf.slice(0, -1); return; }
  let k = key.toLowerCase();
  if (key === ENTER) {
    if (buf === '') return;
    if (toArray().length >= maxShow) { msg = 'これ以上は画面に入りません（D で消してから）'; buf = ''; return; }
    let x = { key: int(buf) }; listInsert(x); flash = x; flashT = 40;
    msg = `挿入(${buf})：先頭に入れる。矢印を 4 本つなぎかえるだけなので O(1)`; buf = '';
  }
  if (k === 's') startScan('search');
  if (k === 'd') startScan('delete');
  if (key === ' ') {
    if (toArray().length >= maxShow) { msg = 'いっぱいです'; return; }
    let x = { key: floor(random(1, 100)) }; listInsert(x); flash = x; flashT = 40; msg = `${x.key} を先頭に挿入`;
  }
  if (k === 'r') { resetAll(); msg = 'リセットしました'; }
}

function mousePressed() {
  let items = toArray(), n = items.length + 1;
  let w = min(110, (width - 80) / n), y = height * 0.48;
  items.forEach((x, i) => {
    let px = 40 + w * (i + 1) + w / 2;
    if (abs(mouseX - px) < 26 && abs(mouseY - y) < 28) { listDelete(x); msg = `${x.key} を削除（O(1)：場所がわかっていれば探す必要なし）`; }
  });
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 存在しない数を S で探すと、番兵まで全部たどる。要素が n 個なら n 回 → O(n)
// 2. listDelete の 2 行を紙に書いて、番兵がないと先頭・末尾で何が困るか考える
// 3. 末尾に入れる listAppend を作ってみよう（nil.prev が末尾）
