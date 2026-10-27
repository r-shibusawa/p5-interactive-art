// ============================================
// 00 スタックとキュー
// スタック = 最後に入れたものが最初に出る（LIFO：お皿の山）
// キュー   = 最初に入れたものが最初に出る（FIFO：レジの行列）
// どちらも「配列 1 本 + 番号 1〜2 個」で作れる。キューは配列の端と端をつないだ「輪」として使う
// 操作：P = プッシュ / O = ポップ / E = エンキュー / D = デキュー / スペース = 自動で動かす / R = リセット
// ============================================

let N = 8;          // ★ 配列の大きさ（キューに入るのは N-1 個まで：1 マス空けて「満杯」と「空」を区別する）
let autoSpeed = 40; // ★ 自動モードで何フレームごとに操作するか

let S = [], sTop = 0;              // スタック：S[0..sTop-1] に入っている（sTop は「次に入れる場所」＝今の個数）
let Q = [], head = 0, tail = 0;    // キュー：Q[head] が先頭、Q[tail] が次に入れる場所
let counter = 1;                   // 入れる値（1, 2, 3, …）
let msg = 'P/O でスタック、E/D でキュー。スペースで自動';
let flashS = -1, flashQ = -1, flashT = 0, warn = '';
let auto = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('sans-serif');
  resetAll();
}

function resetAll() {
  S = new Array(N).fill(null); sTop = 0;
  Q = new Array(N).fill(null); head = 0; tail = 0;
  counter = 1; warn = '';
}

// ---------- スタック ----------
function stackEmpty() { return sTop === 0; }
function stackPush(x) {
  if (sTop === N) { warn = 'スタックのオーバーフロー（満杯）！'; return; }
  S[sTop] = x; flashS = sTop; sTop++; flashT = 30;
  msg = `PUSH(${x})：S[${sTop - 1}] に入れて top = ${sTop}`;
}
function stackPop() {
  if (stackEmpty()) { warn = 'スタックのアンダーフロー（空）！'; return; }
  sTop--; let x = S[sTop]; S[sTop] = null; flashS = sTop; flashT = 30;
  msg = `POP() → ${x}（最後に入れたもの）　top = ${sTop}`;
}

// ---------- キュー（循環バッファ）----------
function enqueue(x) {
  if ((tail + 1) % N === head) { warn = 'キューのオーバーフロー（満杯）！'; return; }
  Q[tail] = x; flashQ = tail; flashT = 30;
  tail = (tail + 1) % N; // 端まで来たら 0 へ戻る
  msg = `ENQUEUE(${x})：Q[${flashQ}] に入れて tail = ${tail}`;
}
function dequeue() {
  if (head === tail) { warn = 'キューのアンダーフロー（空）！'; return; }
  let x = Q[head]; Q[head] = null; flashQ = head; flashT = 30;
  head = (head + 1) % N;
  msg = `DEQUEUE() → ${x}（最初に入れたもの）　head = ${head}`;
}

function draw() {
  background(16, 18, 30);
  if (auto && frameCount % autoSpeed === 0) {
    let r = random();
    if (r < 0.28) stackPush(counter++); else if (r < 0.5) stackPop(); else if (r < 0.78) enqueue(counter++); else dequeue();
  }
  if (flashT > 0) flashT--;

  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('スタックとキュー', 30, 24);
  fill(160, 170, 200); textSize(15);
  text('P = プッシュ　O = ポップ　E = エンキュー　D = デキュー　スペース = 自動 ' + (auto ? 'ON' : 'OFF') + '　R = リセット', 30, 60);

  drawStack(width * 0.2, height * 0.22);
  drawQueue(width * 0.66, height * 0.5);

  fill(255, 225, 140); textSize(19); textAlign(LEFT, TOP);
  text(msg, 30, height - 80);
  if (warn) { fill(255, 110, 110); text(warn, 30, height - 48); }
}

function drawStack(cx, y0) {
  let cw = 120, ch = min(52, (height * 0.6) / N);
  fill(200); textAlign(CENTER, BOTTOM); textSize(18);
  text('スタック S（LIFO）', cx, y0 - 10);
  for (let i = 0; i < N; i++) {
    let y = y0 + (N - 1 - i) * ch;
    stroke(70, 80, 110); strokeWeight(1.5);
    fill(i < sTop ? color(80, 200, 160) : color(28, 32, 48));
    if (i === flashS && flashT > 0) fill(255, 214, 90);
    rect(cx - cw / 2, y, cw, ch - 4, 6);
    noStroke(); fill(i < sTop ? 10 : 90); textAlign(CENTER, CENTER); textSize(20);
    if (S[i] !== null) text(S[i], cx, y + ch / 2 - 2);
    fill(110, 120, 150); textSize(12); textAlign(RIGHT, CENTER);
    text(i, cx - cw / 2 - 10, y + ch / 2);
  }
  // top の矢印
  let ty = y0 + (N - 1 - sTop) * ch + ch / 2;
  fill(255, 160, 90); textAlign(LEFT, CENTER); textSize(16);
  text('← top = ' + sTop, cx + cw / 2 + 12, constrain(ty, y0 - 20, y0 + N * ch));
}

function drawQueue(cx, cy) {
  let R = min(width * 0.22, height * 0.3);
  fill(200); textAlign(CENTER, BOTTOM); textSize(18); noStroke();
  text('キュー Q（FIFO・輪にした配列）', cx, cy - R - 50);
  let cnt = (tail - head + N) % N;
  for (let i = 0; i < N; i++) {
    let a = -HALF_PI + (TWO_PI * i) / N;
    let x = cx + cos(a) * R, y = cy + sin(a) * R;
    let inside = (i - head + N) % N < cnt;
    stroke(70, 80, 110); strokeWeight(1.5);
    fill(inside ? color(110, 160, 255) : color(28, 32, 48));
    if (i === flashQ && flashT > 0) fill(255, 214, 90);
    circle(x, y, 64);
    noStroke(); fill(inside ? 10 : 90); textAlign(CENTER, CENTER); textSize(20);
    if (Q[i] !== null) text(Q[i], x, y);
    fill(110, 120, 150); textSize(12);
    text(i, cx + cos(a) * (R - 52), cy + sin(a) * (R - 52));
  }
  // head / tail の針
  for (let [idx, lab, col] of [[head, 'head', color(255, 160, 90)], [tail, 'tail', color(160, 255, 140)]]) {
    let a = -HALF_PI + (TWO_PI * idx) / N, off = lab === 'head' ? 58 : 82;
    stroke(col); strokeWeight(3);
    line(cx + cos(a) * (R + 34), cy + sin(a) * (R + 34), cx + cos(a) * (R + off - 12), cy + sin(a) * (R + off - 12));
    noStroke(); fill(col); textSize(15);
    text(lab, cx + cos(a) * (R + off + 6), cy + sin(a) * (R + off + 6));
  }
  fill(200); textSize(16);
  text(`入っている数 ${cnt} / ${N - 1}`, cx, cy);
}

function keyPressed() {
  let k = key.toLowerCase();
  warn = '';
  if (k === 'p') stackPush(counter++);
  if (k === 'o') stackPop();
  if (k === 'e') enqueue(counter++);
  if (k === 'd') dequeue();
  if (key === ' ') auto = !auto;
  if (k === 'r') { resetAll(); msg = 'リセットしました'; }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. P を 9 回押すとどうなる？　（N = 8 なのでオーバーフロー）
// 2. E を 3 回、D を 3 回、を繰り返すと head と tail がぐるぐる回る。配列の端で 0 に戻るのが「循環」
// 3. キューは N-1 個しか入らない。なぜ 1 マス空ける必要がある？（head === tail が「空」の意味だから）
