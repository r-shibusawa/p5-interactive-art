// ============================================
// 04 直接アドレス表
// キー k をそのまま配列の番号として使う：T[k] に入れる。探索・挿入・削除がすべて O(1)
// でも、キーがとりうる範囲（全体集合 U）が大きいと、ほとんど空のムダな表になる → ハッシュ表へ
// 操作：左の数字をクリック = 挿入/削除 / S → 数字 + Enter = 探索 / 1〜3 = U の大きさ / スペース = ランダム / C = 空にする
// ============================================

let sizes = [10, 40, 400];   // ★ 1〜3 キーで選べる全体集合 U の大きさ
let names = ['りんご', 'みかん', 'ぶどう', 'もも', 'なし', 'かき', 'いちご', 'すいか', 'メロン', 'レモン', 'キウイ', 'バナナ'];
let U = 10;
let T = [];                  // 表：T[k] = { key, data } または null
let searching = false;
let buf = '', msg = '左の数字をクリックして挿入', look = -1, lookT = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  resetU(10);
}
function resetU(u) {
  U = u; T = new Array(U).fill(null);
  for (let i = 0; i < min(5, U); i++) directInsert(floor(random(U)));
}

// ---------- 3 つの操作（探索・挿入・削除）----------
function directSearch(k) { return T[k]; }
function directInsert(k) { T[k] = { key: k, data: names[k % names.length] }; }
function directDelete(k) { T[k] = null; }

function used() { return T.filter((x) => x).length; }

function draw() {
  background(22, 18, 24);
  if (lookT > 0) lookT--;
  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('直接アドレス表', 30, 24);
  fill(170, 160, 185); textSize(15);
  text('左の数字をクリック = 挿入/削除　S → 数字 + Enter = 探索　1〜3 = U の大きさ（10 / 40 / 400）　スペース = ランダム　C = 空に', 30, 60);
  if (searching) { fill(255); textSize(18); text('探索：' + buf + '｜', 30, 88); }

  // 左：全体集合 U（とりうるキーすべて）
  let cols = ceil(sqrt(U * 1.2)), cell = min(52, (width * 0.4) / cols, (height - 300) / ceil(U / cols));
  let x0 = 40, y0 = 150;
  fill(200); textSize(17); textAlign(LEFT, BOTTOM);
  text(`全体集合 U（キーになりうる数 0〜${U - 1}）`, x0, y0 - 10);
  for (let k = 0; k < U; k++) {
    let x = x0 + (k % cols) * cell, y = y0 + floor(k / cols) * cell;
    let on = T[k] !== null;
    noStroke(); fill(on ? color(255, 140, 120) : color(55, 48, 62));
    circle(x + cell / 2, y + cell / 2, cell * 0.8);
    if (cell > 16) { fill(on ? 20 : 150); textAlign(CENTER, CENTER); textSize(cell * 0.32); text(k, x + cell / 2, y + cell / 2); }
  }

  // 右：表 T
  let tx = width * 0.52, tw = width * 0.44;
  let tcols = U <= 40 ? 2 : 20, rowsN = ceil(U / tcols);
  let rh = min(40, (height - 260) / rowsN), cw = tw / tcols;
  fill(200); textAlign(LEFT, BOTTOM); textSize(17);
  text('表 T（番号 = キー）', tx, y0 - 10);
  for (let k = 0; k < U; k++) {
    let x = tx + (k % tcols) * cw, y = y0 + floor(k / tcols) * rh;
    stroke(70, 60, 80); strokeWeight(1);
    fill(T[k] ? color(70, 140, 120) : color(35, 30, 40));
    if (k === look && lookT > 0) fill(255, 214, 90);
    rect(x, y, cw - 2, rh - 2, 4);
    if (rh > 18 && cw > 60) {
      noStroke(); fill(150); textAlign(LEFT, CENTER); textSize(min(13, rh * 0.4));
      text(k, x + 6, y + rh / 2);
      fill(255); text(T[k] ? `${T[k].key}：${T[k].data}` : '/', x + 40, y + rh / 2);
    }
  }

  // メモリのムダ
  let u = used();
  fill(220); textAlign(LEFT, TOP); textSize(18); noStroke();
  text(`使っているマス ${u} / 表の大きさ ${U}　→ 利用率 ${nf((100 * u) / U, 1, 1)}%`, 30, height - 110);
  fill(80); rect(30, height - 80, width - 60, 12, 6);
  fill(255, 140, 120); rect(30, height - 80, ((width - 60) * u) / U, 12, 6);
  fill(255, 225, 140); textSize(18);
  text(msg, 30, height - 56);
}

function mousePressed() {
  let cols = ceil(sqrt(U * 1.2)), cell = min(52, (width * 0.4) / cols, (height - 300) / ceil(U / cols));
  let c = floor((mouseX - 40) / cell), r = floor((mouseY - 150) / cell);
  if (c < 0 || c >= cols || r < 0) return;
  let k = r * cols + c;
  if (k >= U) return;
  if (T[k]) { directDelete(k); msg = `DELETE(${k})：T[${k}] = NIL にするだけ。O(1)`; }
  else { directInsert(k); msg = `INSERT(${k})：T[${k}] に入れるだけ。O(1)`; }
  look = k; lookT = 40;
}
function keyPressed() {
  if (searching) {
    if (key >= '0' && key <= '9' && buf.length < 3) buf += key;
    if (key === BACKSPACE) buf = buf.slice(0, -1);
    if (key === ENTER) {
      searching = false;
      if (buf === '') return;
      let k = int(buf); buf = '';
      if (k >= U) { msg = `${k} は全体集合 U の外です`; return; }
      look = k; lookT = 60;
      msg = T[k] ? `SEARCH(${k})：T[${k}] を見るだけで「${T[k].data}」が見つかった` : `SEARCH(${k})：T[${k}] は空 → ない`;
    }
    return;
  }
  let k = key.toLowerCase();
  if (key >= '1' && key <= '3') { resetU(sizes[int(key) - 1]); msg = `U = ${U}`; }
  if (k === 's') { searching = true; buf = ''; msg = '探すキーを打って Enter'; }
  if (k === 'c') { T = new Array(U).fill(null); msg = '空にしました'; }
  if (key === ' ') { directInsert(floor(random(U))); msg = 'ランダムに挿入'; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. U = 400 にすると、5 個しか入っていないのに 400 マス必要。電話番号（10^10 通り）だったら？
// 2. 同じキーが 2 回来たら上書きされる。直接アドレス表は「キーがすべて違う」ことが前提
// 3. この問題を解くのが次の 05 ハッシュ表：大きな U を小さな m マスに「折りたたむ」
