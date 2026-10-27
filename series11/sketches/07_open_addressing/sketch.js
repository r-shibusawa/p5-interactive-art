// ============================================
// 07 オープンアドレス法
// リストを使わず、表のマスだけに入れる。ふさがっていたら「探査列」h(k,0), h(k,1), … の順に空きを探す
// 線形探査：隣へ隣へ → 「固まり（クラスタ）」ができて遅くなる
// 二次探査：1, 3, 6, 10 … と飛ぶ / ダブルハッシュ：キーごとに飛ぶ幅が違う → 固まりにくい
// 削除：単に消すと探索がそこで止まってしまうので「削除済み」の印を置く。
//       線形探査なら、後ろの要素を詰め直して印を残さない方法もある
// 操作：スペース = ランダムに挿入 / 数字 + Enter = 挿入 / 数字 + S = 探索 / マスをクリック = 削除
//       M = 探査の方法（線形 → 二次 → ダブルハッシュ）/ T = 削除の方法を切りかえ / C = 空に
// ============================================

let m = 16;           // ★ マスの数（2 のべき乗にしておくと二次探査・ダブルハッシュが全マスを回れる）
let speed = 14;       // ★ 探査 1 回にかけるフレーム数
let method = 1, delMode = 'mark';
let T = [], probes = {}, buf = '';
let op = null, msg = 'スペースでランダムに挿入。M で探査の方法を切りかえ';
let DEL = 'DEL';

function setup() {
  createCanvas(windowWidth, windowHeight);
  clearTable();
}
function clearTable() { T = new Array(m).fill(null); probes = {}; op = null; }

function h1(k) { return k % m; }
function h2(k) { return 2 * (floor(k / m) % (m / 2)) + 1; } // 奇数 → m（2 のべき乗）と互いに素
function hp(k, i) {
  if (method === 1) return (h1(k) + i) % m;                     // 線形探査
  if (method === 2) return (h1(k) + (i + i * i) / 2) % m;       // 二次探査（c1 = c2 = 1/2）
  return (h1(k) + i * h2(k)) % m;                               // ダブルハッシュ
}
function filled() { return T.filter((x) => x !== null && x !== DEL).length; }

function startOp(kind, k) {
  if (op) return;
  if (kind === 'insert' && T.includes(k)) { msg = `${k} はもう入っています`; return; }
  op = { kind, k, i: 0, path: [], wait: 0 };
  msg = `${kind === 'insert' ? 'INSERT' : 'SEARCH'}(${k})：h(${k}, 0) = ${hp(k, 0)} から探査開始`;
}
function advanceOp() {
  let o = op, q = hp(o.k, o.i);
  o.path.push(q);
  if (o.kind === 'insert') {
    if (T[q] === null || T[q] === DEL) {
      T[q] = o.k; probes[o.k] = o.i + 1;
      msg = `INSERT(${o.k})：${o.i + 1} 回目の探査でマス ${q} に入れた`; op = null; return;
    }
  } else {
    if (T[q] === o.k) { msg = `SEARCH(${o.k})：${o.i + 1} 回目でマス ${q} に発見！`; op = null; return; }
    if (T[q] === null) { msg = `SEARCH(${o.k})：空のマス ${q} に着いた → ない（${o.i + 1} 回）`; op = null; return; }
  }
  o.i++;
  if (o.i >= m) { msg = o.kind === 'insert' ? '表があふれた（overflow）' : 'ない（全マスを見た）'; op = null; }
}

function deleteAt(q) {
  if (T[q] === null || T[q] === DEL) return;
  let k = T[q];
  if (delMode === 'mark' || method !== 1) {
    T[q] = DEL; delete probes[k];
    msg = `${k} を削除 → 「削除済み」の印を置く（探索は印を通りぬけ、挿入は印に入れる）`;
    return;
  }
  // 線形探査だけの削除法：印を置かずに、後ろの要素を前へ詰める
  delete probes[k];
  let moved = 0;
  while (true) {
    T[q] = null;
    let q2 = q, k2;
    while (true) {
      q2 = (q2 + 1) % m; k2 = T[q2];
      if (k2 === null) { msg = `${k} を削除して、後ろの ${moved} 個を前へ詰めた（印なし）`; return; }
      if ((q - h1(k2) + m) % m < (q2 - h1(k2) + m) % m) break; // k2 は q へ動かしても見つかる
    }
    T[q] = k2; probes[k2] = (q - h1(k2) + m) % m + 1; q = q2; moved++;
  }
}

function draw() {
  background(20, 18, 14);
  if (op && frameCount % speed === 0) advanceOp();
  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('オープンアドレス法', 30, 24);
  fill(190, 180, 160); textSize(15);
  text('スペース / 数字 + Enter = 挿入　数字 + S = 探索　クリック = 削除　M 探査の方法　T 削除方法　C 空に', 30, 60);
  let mname = ['', '線形探査 h(k,i) = (k mod m + i) mod m', '二次探査 h(k,i) = (k mod m + (i + i²)/2) mod m', 'ダブルハッシュ h(k,i) = (k mod m + i·h₂(k)) mod m'][method];
  fill(255); textSize(18);
  text(`${mname}　削除：${delMode === 'mark' || method !== 1 ? '削除済みの印' : '詰め直し（線形のみ）'}　入力：${buf}`, 30, 90);

  let cw = min(72, (width - 80) / m), x0 = (width - cw * m) / 2, y = height * 0.42;
  // 固まり（連続してふさがっている所）
  for (let s = 0; s < m; s++) {
    if (T[s] !== null && T[(s - 1 + m) % m] === null) {
      let len = 0; while (len < m && T[(s + len) % m] !== null) len++;
      for (let j = 0; j < len; j++) { let c = (s + j) % m; fill(255, 120, 80, min(220, 40 + len * 25)); rect(x0 + c * cw + 2, y + cw + 8, cw - 4, 8, 4); }
    }
  }
  for (let i = 0; i < m; i++) {
    let x = x0 + i * cw, v = T[i];
    let onPath = op && op.path.includes(i), now = op && op.path[op.path.length - 1] === i;
    stroke(now ? color(255, 214, 90) : color(90, 80, 70)); strokeWeight(now ? 4 : 1.5);
    fill(v === null ? color(40, 36, 30) : v === DEL ? color(80, 60, 60) : color(200, 150, 70));
    if (onPath && !now) fill(120, 100, 60);
    rect(x + 2, y, cw - 4, cw, 8);
    noStroke(); textAlign(CENTER, CENTER);
    fill(v === null ? 90 : 20); textSize(v === DEL ? 12 : 18);
    text(v === null ? '' : v === DEL ? '削除済' : v, x + cw / 2, y + cw / 2);
    fill(150); textSize(13); text(i, x + cw / 2, y - 14);
    if (v !== null && v !== DEL && probes[v] > 1) { fill(255, 160, 120); textSize(11); text(probes[v] + '回', x + cw / 2, y + cw + 26); }
  }
  // 探査列の矢印
  if (op) {
    for (let j = 1; j < op.path.length; j++) {
      let xa = x0 + op.path[j - 1] * cw + cw / 2, xb = x0 + op.path[j] * cw + cw / 2;
      noFill(); stroke(255, 214, 90); strokeWeight(2);
      bezier(xa, y - 26, xa, y - 80 - j * 6, xb, y - 80 - j * 6, xb, y - 26);
    }
    noStroke(); fill(255, 214, 90); textSize(16); textAlign(CENTER, BOTTOM);
    text(`k = ${op.k}　i = ${op.i}`, width / 2, y - 120);
  }
  // 統計
  let n = filled(), alpha = n / m;
  let ps = Object.values(probes), avg = ps.length ? ps.reduce((s, v) => s + v, 0) / ps.length : 0;
  fill(220); textAlign(LEFT, TOP); textSize(18);
  text(`n = ${n}　α = ${nf(alpha, 1, 2)}　成功する探索の平均探査数（実測）${nf(avg, 1, 2)}　理論 ${alpha > 0 && alpha < 1 ? nf((1 / alpha) * Math.log(1 / (1 - alpha)), 1, 2) : '-'}　失敗する探索の理論 1/(1-α) = ${alpha < 1 ? nf(1 / (1 - alpha), 1, 2) : '∞'}`, 30, height - 110);
  fill(255, 120, 80); textSize(14); text('オレンジの帯 = 固まり（クラスタ）。長いほど濃い', 30, height - 82);
  fill(255, 225, 140); textSize(18); text(msg, 30, height - 56);
}

function keyPressed() {
  if (key >= '0' && key <= '9') { if (buf.length < 3) buf += key; return; }
  if (key === BACKSPACE) { buf = buf.slice(0, -1); return; }
  let k = key.toLowerCase();
  if (key === ENTER && buf) { startOp('insert', int(buf)); buf = ''; }
  if (k === 's' && buf) { startOp('search', int(buf)); buf = ''; }
  if (key === ' ') startOp('insert', floor(random(1, 200)));
  if (k === 'c') { clearTable(); msg = '空にしました'; }
  if (k === 'm' && !op) { method = method % 3 + 1; clearTable(); msg = ['', '線形探査', '二次探査', 'ダブルハッシュ'][method] + 'にして空にした'; }
  if (k === 't') { delMode = delMode === 'mark' ? 'shift' : 'mark'; msg = delMode === 'shift' ? '削除 = 詰め直し（線形探査のときだけ使える）' : '削除 = 削除済みの印'; }
}
function mousePressed() {
  let cw = min(72, (width - 80) / m), x0 = (width - cw * m) / 2, y = height * 0.42;
  let i = floor((mouseX - x0) / cw);
  if (i >= 0 && i < m && mouseY > y && mouseY < y + cw && !op) deleteAt(i);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 線形探査で 12 個入れる。長いオレンジの帯ができ、探査回数が増える
// 2. 同じことを M でダブルハッシュにして。帯が短く、平均探査数が小さい
// 3. 印を置く方法で削除と挿入を繰り返すと「削除済」だらけに → 探索が遅くなる。T で詰め直しにすると？
