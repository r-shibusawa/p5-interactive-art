// ============================================
// 05 チェイン法のハッシュ表
// キー k を h(k) 番のマスへ。同じマスに来たもの（衝突）は連結リストでつなぐ
// 負荷率 α = n / m（1 マスあたりの平均の個数）。探索にかかる時間の平均は Θ(1 + α)
// 操作：数字 + Enter = 挿入 / 数字 + S = 探索 / 数字 + D = 削除 / スペース = ランダムに 1 個 / A = 10 個
//       ↑↓ = マスの数 m（入れ直し）/ H = ハッシュ関数（割り算法 ⇄ かけ算法）/ C = 空に
// ============================================

let m = 9;              // ★ マスの数
let keyMax = 1000;      // ★ キーの範囲 0〜keyMax-1
let A = (Math.sqrt(5) - 1) / 2; // ★ かけ算法の定数（Knuth のおすすめ 0.618…）
let method = 'div';

let T = [];             // T[i] = キーの配列（先頭 = リストの先頭）
let n = 0, buf = '', msg = 'スペースでランダムに挿入、数字 + Enter で好きな数を挿入';
let scan = null, flashKey = -1, flashT = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  rebuild([]);
  for (let i = 0; i < 12; i++) chainedInsert(floor(random(keyMax)));
}

function h(k) {
  if (method === 'div') return k % m;                          // 割り算法 h(k) = k mod m
  return floor(m * ((k * A) % 1));                             // かけ算法 h(k) = ⌊m (kA mod 1)⌋
}
function chainedInsert(k) {
  if (T[h(k)].includes(k)) { msg = `${k} はもう入っています`; return; }
  T[h(k)].unshift(k); n++;                                     // リストの先頭に入れる → O(1)
  flashKey = k; flashT = 45;
  msg = `INSERT(${k})：h(${k}) = ${h(k)} 番のリストの先頭へ`;
}
function rebuild(keys) { T = []; for (let i = 0; i < m; i++) T.push([]); n = 0; for (let k of keys) { T[h(k)].unshift(k); n++; } }
function allKeysH() { return T.flat(); }

function draw() {
  background(14, 22, 24);
  if (flashT > 0) flashT--;
  if (scan && frameCount % 16 === 0) advanceScan();

  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('チェイン法のハッシュ表', 30, 24);
  fill(150, 180, 180); textSize(15);
  text('数字 + Enter = 挿入　数字 + S = 探索　数字 + D = 削除　スペース / A = ランダム　↑↓ = m　H = ハッシュ関数　C = 空に', 30, 60);
  fill(255); textSize(18);
  text(`入力：${buf}${frameCount % 60 < 30 ? '｜' : ''}　　h(k) = ${method === 'div' ? 'k mod ' + m + '（割り算法）' : '⌊' + m + ' × (k × 0.618… mod 1)⌋（かけ算法）'}`, 30, 90);

  let y0 = 140, rh = min(46, (height - 290) / m), x0 = 90, nw = 58;
  let longest = 0;
  for (let i = 0; i < m; i++) {
    let y = y0 + i * rh;
    stroke(60, 90, 90); strokeWeight(1.5); fill(30, 50, 55);
    rect(x0, y, 46, rh - 6, 6);
    noStroke(); fill(160, 200, 200); textAlign(RIGHT, CENTER); textSize(14);
    text(i, x0 - 10, y + rh / 2 - 3);
    longest = max(longest, T[i].length);
    let maxFit = floor((width - x0 - 120) / nw);
    T[i].forEach((k, j) => {
      if (j >= maxFit) { if (j === maxFit) { fill(200); textAlign(LEFT, CENTER); text(`… 他 ${T[i].length - maxFit}`, x0 + 60 + j * nw, y + rh / 2 - 3); } return; }
      let x = x0 + 60 + j * nw;
      stroke(90, 130, 130); strokeWeight(2);
      line(j === 0 ? x0 + 46 : x - 12, y + rh / 2 - 3, x, y + rh / 2 - 3);
      let isScan = scan && scan.slot === i && scan.idx === j;
      stroke(isScan ? color(255, 214, 90) : color(80, 120, 120)); strokeWeight(isScan ? 4 : 1);
      fill(k === flashKey && flashT > 0 ? color(255, 214, 90) : color(keyHue(k), 120, 160));
      rect(x, y + 2, nw - 14, rh - 10, 8);
      noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(min(15, rh * 0.42));
      text(k, x + (nw - 14) / 2, y + rh / 2 - 3);
    });
  }

  // 統計
  let alpha = n / m;
  fill(220); noStroke(); textAlign(LEFT, TOP); textSize(18);
  text(`n = ${n}　m = ${m}　負荷率 α = n/m = ${nf(alpha, 1, 2)}　いちばん長いリスト = ${longest}　失敗する探索の平均 ≈ 1 + α = ${nf(1 + alpha, 1, 2)} 回`, 30, height - 110);
  // リストの長さの棒グラフ
  let bw = min(30, (width * 0.3) / m);
  for (let i = 0; i < m; i++) { fill(80, 160, 160); rect(width - 40 - (m - i) * bw, height - 120 - T[i].length * 6, bw - 3, T[i].length * 6); }
  fill(255, 225, 140); textSize(18); text(msg, 30, height - 70);
}
function keyHue(k) { return (k * 37) % 120 + 40; }

function startScan(mode) {
  if (buf === '') { msg = '先に数字を打ってください'; return; }
  let k = int(buf); buf = '';
  scan = { k, slot: h(k), idx: 0, mode };
  msg = `${mode === 'delete' ? 'DELETE' : 'SEARCH'}(${k})：h(${k}) = ${scan.slot} 番のリストだけを先頭から調べる…`;
  if (T[scan.slot].length === 0) { msg += ' 空なので、ない'; scan = null; }
}
function advanceScan() {
  let s = scan, list = T[s.slot];
  if (s.idx >= list.length) { msg = `${s.k} はなかった（リストの ${list.length} 個を全部見た）`; scan = null; return; }
  if (list[s.idx] === s.k) {
    if (s.mode === 'delete') { list.splice(s.idx, 1); n--; msg = `${s.k} を削除（${s.idx + 1} 個目で発見）`; }
    else { msg = `${s.k} を ${s.idx + 1} 個目で発見！ 他のマスは一切見ていない`; flashKey = s.k; flashT = 60; }
    scan = null; return;
  }
  s.idx++;
}

function keyPressed() {
  if (key >= '0' && key <= '9') { if (buf.length < 3) buf += key; return; }
  if (key === BACKSPACE) { buf = buf.slice(0, -1); return; }
  let k = key.toLowerCase();
  if (key === ENTER && buf) { chainedInsert(int(buf)); buf = ''; }
  if (k === 's') startScan('search');
  if (k === 'd') startScan('delete');
  if (key === ' ') chainedInsert(floor(random(keyMax)));
  if (k === 'a') for (let i = 0; i < 10; i++) chainedInsert(floor(random(keyMax)));
  if (k === 'c') { rebuild([]); msg = '空にしました'; }
  if (k === 'h') { method = method === 'div' ? 'mul' : 'div'; rebuild(allKeysH()); msg = 'ハッシュ関数を変えて入れ直した'; scan = null; }
  if (key === UP_ARROW) { m = min(20, m + 1); rebuild(allKeysH()); msg = `m = ${m} にして全部入れ直し（再ハッシュ）`; scan = null; }
  if (key === DOWN_ARROW) { m = max(1, m - 1); rebuild(allKeysH()); msg = `m = ${m} にして全部入れ直し（再ハッシュ）`; scan = null; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. A で 50 個入れて α を 5 くらいにする。↑ で m を増やすとリストが短くなる
// 2. m = 1 にすると？（ただの連結リスト。探索は O(n)）
// 3. 10, 20, 30, … と 10 の倍数ばかり入れて m = 10 にすると？ H でかけ算法にすると？
