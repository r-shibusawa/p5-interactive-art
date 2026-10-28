// ============================================
// 04 エニグマ風ローター（概念モデル）
// 3 つのローター（文字の入れかえ）と反射板。キーを押すたびに右のローターが 1 つ回るので、
// 同じ文字でも毎回ちがう文字になる。反射板のおかげで「同じ設定にもどせば、同じ操作で復号できる」
// 配線はこのスケッチ用のランダムなもの（歴史上のエニグマとは違う）
// 文字を打つ = 暗号化 / ↑↓ = ローターを選ぶ / ←→ = 開始位置を変える / Backspace = 開始位置に戻してテープを消す
// ※ 教育用。実際の安全な暗号には使わない
// ============================================

let seed = 7;                       // ★ 配線を決める種（変えると別の機械になる）
let rotors = [], reflector = [];
let notch = [17, 5, 22];            // ★ この位置を通過すると左隣のローターが 1 つ回る
let startPos = [0, 0, 0];           // 開始位置（左・中・右）
let pos = [0, 0, 0];
let sel = 2;                        // 選んでいるローター
let tapeIn = '', tapeOut = '';
let lastPath = null, lampOn = -1, lampTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  randomSeed(seed);
  for (let r = 0; r < 3; r++) rotors.push(shuffle([...Array(26).keys()]));
  // 反射板：26 文字を 13 組のペアにする（A↔Q なら Q↔A）
  let order = shuffle([...Array(26).keys()]);
  for (let i = 0; i < 26; i += 2) { reflector[order[i]] = order[i + 1]; reflector[order[i + 1]] = order[i]; }
  pos = startPos.slice();
}

// ★ ローターの段送り：右は毎回、中と左は「ノッチ」を通過したとき
function stepRotors() {
  let midTurn = pos[2] === notch[2];
  let leftTurn = pos[1] === notch[1] && midTurn;
  pos[2] = (pos[2] + 1) % 26;
  if (midTurn) pos[1] = (pos[1] + 1) % 26;
  if (leftTurn) pos[0] = (pos[0] + 1) % 26;
}

// ローター r を通す（forward = 右→左、そうでなければ帰り道）
function through(r, c, forward) {
  let p = pos[r];
  if (forward) return (rotors[r][(c + p) % 26] - p + 26) % 26;
  return (rotors[r].indexOf((c + p) % 26) - p + 26) % 26;
}

// ★ 1 文字の暗号化：回す → 右→中→左 → 反射 → 左→中→右
function encryptLetter(c) {
  stepRotors();
  let path = [c];
  let x = c;
  for (let r = 2; r >= 0; r--) { x = through(r, x, true); path.push(x); }
  x = reflector[x]; path.push(x);
  for (let r = 0; r < 3; r++) { x = through(r, x, false); path.push(x); }
  lastPath = path;
  return x;
}

function draw() {
  background(20, 18, 16);
  noStroke();
  fill(240);
  textSize(18);
  text('ローター暗号機（概念モデル）　文字を打つ・↑↓ ローター選択・←→ 開始位置・Backspace リセット', 24, 34);
  fill(150);
  textSize(14);
  text('配線はこのスケッチ用のランダムなもの。同じ開始位置から暗号文を打つと平文に戻る　｜ 教育用', 24, 56);

  // 列：反射板 | 左 | 中 | 右 | 入出力
  let colX = [], top = 110, rowH = (height - top - 190) / 26;
  let colW = min(170, (width - 120) / 5);
  for (let i = 0; i < 5; i++) colX.push(60 + i * colW * 1.15);
  let names = ['反射板', '左', '中', '右', '入力・ランプ'];
  for (let i = 0; i < 5; i++) {
    fill(i - 1 === sel ? color(255, 210, 90) : 200);
    textSize(15);
    textAlign(CENTER);
    text(names[i] + (i >= 1 && i <= 3 ? '  位置 ' + String.fromCharCode(65 + pos[i - 1]) : ''), colX[i] + colW / 2, top - 14);
    fill(i - 1 === sel ? color(60, 52, 30) : color(36, 34, 32));
    rect(colX[i], top, colW, rowH * 26, 8);
    textAlign(LEFT);
  }
  // 各列の 26 行の文字（ローターは回った分だけずれて見える）
  textSize(min(14, rowH * 0.8));
  for (let j = 0; j < 26; j++) {
    let y = top + j * rowH + rowH * 0.75;
    fill(110);
    for (let i = 1; i <= 3; i++) text(String.fromCharCode(65 + (j + pos[i - 1]) % 26), colX[i] + 6, y);
    fill(j === lampOn && millis() - lampTime < 600 ? color(255, 230, 120) : 150);
    text(String.fromCharCode(65 + j), colX[4] + colW / 2 - 5, y);
  }

  // 最後に押した文字の通り道
  if (lastPath) {
    let P = lastPath, yOf = j => top + j * rowH + rowH / 2;
    let L0 = colX[0], R = colX.map(x => x + colW);
    let go = [[colX[4], P[0]], [R[3], P[0]], [colX[3], P[1]], [R[2], P[1]], [colX[2], P[2]], [R[1], P[2]], [colX[1], P[3]], [R[0], P[3]]];
    let back = [[R[0], P[4]], [colX[1], P[4]], [R[1], P[5]], [colX[2], P[5]], [R[2], P[6]], [colX[3], P[6]], [R[3], P[7]], [colX[4], P[7]]];
    strokeWeight(3);
    noFill();
    stroke(120, 200, 255);            // 行き（右 → 左）
    beginShape(); for (let q of go) vertex(q[0], yOf(q[1])); endShape();
    stroke(255, 150, 220);            // 反射板の中
    beginShape(); vertex(R[0], yOf(P[3])); vertex(L0 + colW * 0.4, yOf(P[3])); vertex(L0 + colW * 0.4, yOf(P[4])); vertex(R[0], yOf(P[4])); endShape();
    stroke(255, 200, 90);             // 帰り（左 → 右）
    beginShape(); for (let q of back) vertex(q[0], yOf(q[1]) + 2); endShape();
    noStroke();
  }

  // テープ
  let ty = height - 140;
  fill(40, 36, 32);
  rect(24, ty, width - 48, 110, 10);
  textSize(20);
  fill(120, 200, 255);
  text('入力　' + tapeIn.slice(-48), 44, ty + 38);
  fill(255, 200, 90);
  text('出力　' + tapeOut.slice(-48), 44, ty + 72);
  fill(150);
  textSize(14);
  text('開始位置 ' + startPos.map(p => String.fromCharCode(65 + p)).join('') + '　｜ 気づくこと：ある文字が自分自身になることは決してない（反射板のせい）→ 本物のエニグマが破られた手がかりの 1 つ', 44, ty + 100);
}

function keyPressed() {
  if (key === UP_ARROW) sel = (sel + 2) % 3;
  else if (key === DOWN_ARROW) sel = (sel + 1) % 3;
  else if (key === LEFT_ARROW || key === RIGHT_ARROW) {
    startPos[sel] = (startPos[sel] + (key === LEFT_ARROW ? 25 : 1)) % 26;
    reset();
  } else if (key === 'Backspace') reset();
  else if (key.length === 1) {
    let up = key.toUpperCase();
    if (up >= 'A' && up <= 'Z') {
      let out = encryptLetter(up.charCodeAt(0) - 65);
      tapeIn += up;
      tapeOut += String.fromCharCode(65 + out);
      lampOn = out; lampTime = millis();
    }
  }
  return false;
}

function reset() { pos = startPos.slice(); tapeIn = ''; tapeOut = ''; lastPath = null; }

// ---------- やってみよう ----------
// 1. AAAAA と打つと出力はどうなる？ 同じ文字が毎回ちがう文字になるのを確かめよう
// 2. 出力をメモ → Backspace → メモした文字を打つと、元の文に戻る（暗号化と復号が同じ操作）
// 3. 開始位置は 26³ = 17576 通り。現代のコンピュータなら一瞬で総当たりできる。何通りなら安全？
// 4. 入力と出力の間に「プラグボード」（文字のペアを入れかえる）を足して、鍵の数を増やそう

// ==================================================
// ここから下は「道具」：特になし（shuffle と randomSeed は p5.js の関数）
// ==================================================
