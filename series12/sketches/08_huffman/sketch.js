// ============================================
// 08 ハフマン符号：よく出る文字ほど短い 0/1 に
// 出現回数の少ない 2 つを取り出して 1 つにまとめる、を繰り返すだけで最適な符号の木ができる
// 取り出すのはいつも「いちばん小さい 2 つ」→ 優先度つきキュー（ヒープ）を使う貪欲法
// キーボードで文を入力 / Enter = 自動で木をつくる / → = 1 回まとめる / Backspace = 1 文字消す / 下のボタンでお手本
// ============================================

let message = 'abracadabra';   // ★ 最初の文
let framesPerMerge = 40;       // ★ まとめる間隔（フレーム）

let forest = [], merges = 0, auto = false, timer = 0, nextId = 0, preset = null;

const BG = '#16111c', PANEL = '#231a2b', FG = '#f3eaf0', MUTED = '#9a8aa3';
const RASP = '#ff6b8b', CYAN = '#5ee6e0', AMBER = '#ffc857', LIME = '#a3e635';
const BUTTONS = [
  { label: '頻度のお手本（a〜f）', act: () => { preset = { a: 40, b: 8, c: 18, d: 6, e: 22, f: 6 }; rebuild(); } },
  { label: 'mississippi', act: () => { preset = null; message = 'mississippi river'; rebuild(); } },
  { label: 'クリア', act: () => { preset = null; message = ''; rebuild(); } },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  rebuild();
}

function freqTable() {
  if (preset) return preset;
  let f = {};
  for (let ch of message) f[ch] = (f[ch] || 0) + 1;
  return f;
}

function rebuild() {
  nextId = 0; merges = 0; auto = false;
  let f = freqTable();
  forest = Object.keys(f).map(ch => ({ ch, freq: f[ch], id: nextId++ }));
  sortForest();
}

function sortForest() { forest.sort((a, b) => a.freq - b.freq || a.id - b.id); }

function mergeOnce() {
  if (forest.length < 2) return;
  let x = forest.shift(), y = forest.shift();       // いちばん小さい 2 つ（EXTRACT-MIN を 2 回）
  forest.push({ left: x, right: y, freq: x.freq + y.freq, id: nextId++, born: frameCount });
  sortForest();                                     // INSERT
  merges++;
}

function leavesOf(t) { return t.ch !== undefined ? 1 : leavesOf(t.left) + leavesOf(t.right); }
function depthOf(t) { return t.ch !== undefined ? 0 : 1 + max(depthOf(t.left), depthOf(t.right)); }

function codes(t, prefix, out) {
  if (!t) return out;
  if (t.ch !== undefined) { out[t.ch] = prefix || '0'; return out; }
  codes(t.left, prefix + '0', out); codes(t.right, prefix + '1', out);
  return out;
}

function draw() {
  background(BG);
  if (auto && forest.length > 1 && ++timer >= framesPerMerge) { timer = 0; mergeOnce(); }

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(26);
  text('ハフマン符号：少ない 2 つをまとめる、を繰り返す', 32, 24);
  fill(MUTED); textSize(15);
  text('文字を入力　Enter 自動でつくる　→ 1 回まとめる　Backspace 消す', 32, 60);

  // 入力欄
  fill(PANEL); rect(32, 92, width - 64, 44, 8);
  fill(FG); textSize(22); textAlign(LEFT, CENTER);
  let shownMsg = preset ? '（頻度表）' + Object.keys(preset).map(k => `${k}:${preset[k]}`).join('  ') : message.replace(/ /g, '␣');
  text(shownMsg + (!preset && frameCount % 40 < 20 ? '|' : ''), 46, 114);

  // ボタン
  let bx = 32;
  textSize(13);
  for (let b of BUTTONS) {
    let w = textWidth(b.label) + 24;
    b.x = bx; b.y = 146; b.w = w; b.h = 28;
    fill('#33263d'); rect(bx, 146, w, 28, 14);
    fill(FG); textAlign(CENTER, CENTER); text(b.label, bx + w / 2, 160);
    bx += w + 10;
  }

  // 森を描く
  let totalLeaves = forest.reduce((a, t) => a + leavesOf(t), 0);
  if (totalLeaves === 0) { fill(MUTED); textSize(18); textAlign(CENTER, CENTER); text('文字を入力してください', width / 2, height / 2); return; }
  let areaW = width * 0.66 - 40, unit = min(70, areaW / totalLeaves);
  let maxD = max(...forest.map(depthOf));
  let dy = min(70, (height - 330) / max(1, maxD));
  let x = 40;
  for (let k = 0; k < forest.length; k++) {
    let t = forest[k], w = leavesOf(t) * unit;
    let pick = forest.length > 1 && k < 2;
    drawTree(t, x, x + w, 230, dy, pick);
    x += w;
  }

  // 右パネル：符号表
  let px = width * 0.68, pw = width - px - 30;
  fill(PANEL); rect(px, 200, pw, height - 230, 12);
  fill(FG); textAlign(LEFT, TOP); textSize(16);
  if (forest.length > 1) {
    text(`キューの中身（小さい順）`, px + 16, 214);
    textSize(14);
    for (let k = 0; k < min(forest.length, 12); k++) {
      fill(k < 2 ? AMBER : MUTED);
      text(`${forest[k].freq}　${forest[k].ch !== undefined ? '「' + show(forest[k].ch) + '」' : '（まとめた木）'}`, px + 16, 244 + k * 22);
    }
    fill(MUTED); text(`あと ${forest.length - 1} 回まとめる`, px + 16, height - 60);
  } else {
    let f = freqTable(), cd = codes(forest[0], '', {});
    let chars = Object.keys(f).sort((a, b) => f[b] - f[a]);
    text('できた符号', px + 16, 214);
    textSize(14);
    let bits = 0, n = 0;
    for (let k = 0; k < chars.length; k++) {
      let ch = chars[k]; bits += f[ch] * cd[ch].length; n += f[ch];
      if (k < 14) { fill(FG); text(`「${show(ch)}」×${f[ch]}`, px + 16, 244 + k * 22); fill(LIME); text(cd[ch], px + 120, 244 + k * 22); }
    }
    let fixed = max(1, ceil(log(chars.length) / log(2))) * n;
    fill(FG); textSize(15);
    text(`ハフマン：${bits} ビット`, px + 16, height - 110);
    fill(MUTED); text(`固定長（${max(1, ceil(log(chars.length) / log(2)))} ビット/文字）：${fixed} ビット`, px + 16, height - 86);
    fill(AMBER); text(`${fixed > 0 ? round(100 * bits / fixed) : 0}% の長さ`, px + 16, height - 62);
    if (!preset) {
      let enc = [...message].map(ch => cd[ch]).join(' ');
      fill(MUTED); textSize(12); textAlign(LEFT, TOP);
      text(enc.length > 120 ? enc.slice(0, 120) + '…' : enc, 40, height - 52, width * 0.62);
    }
  }
}

function show(ch) { return ch === ' ' ? '␣' : ch; }

// 木を [x0, x1] の幅に描き、根の座標を返す
function drawTree(t, x0, x1, y, dy, pick) {
  if (t.ch !== undefined) {
    let cx = (x0 + x1) / 2;
    fill(pick ? AMBER : RASP); noStroke(); rect(cx - 20, y - 18, 40, 36, 8);
    fill(BG); textAlign(CENTER, CENTER); textSize(16); text(show(t.ch), cx, y - 4);
    textSize(10); text(t.freq, cx, y + 11);
    return [cx, y];
  }
  let ll = leavesOf(t.left), lr = leavesOf(t.right);
  let mid = x0 + (x1 - x0) * ll / (ll + lr);
  let [ax, ay] = drawTree(t.left, x0, mid, y + dy, dy, false);
  let [bx2, by2] = drawTree(t.right, mid, x1, y + dy, dy, false);
  let cx = (ax + bx2) / 2;
  let fresh = t.born && frameCount - t.born < 30;
  stroke('#6b5a78'); strokeWeight(2); line(cx, y, ax, ay - 18); line(cx, y, bx2, by2 - 18);
  noStroke(); fill(CYAN); textSize(12); textAlign(CENTER, CENTER);
  text('0', (cx + ax) / 2 - 8, (y + ay) / 2 - 8); text('1', (cx + bx2) / 2 + 8, (y + by2) / 2 - 8);
  fill(pick ? AMBER : fresh ? LIME : '#4a3d56'); circle(cx, y, 34);
  fill(pick || fresh ? BG : FG); textSize(12); text(t.freq, cx, y);
  return [cx, y];
}

function keyPressed() {
  if (key === ENTER || key === RETURN) { if (forest.length <= 1) rebuild(); auto = true; return; }
  if (key === RIGHT_ARROW) { mergeOnce(); return; }
  if (key === BACKSPACE) { preset = null; message = message.slice(0, -1); rebuild(); return; }
  if (key.length === 1 && message.length < 40) { preset = null; message += key; rebuild(); }
}

function mousePressed() {
  for (let b of BUTTONS) if (b.x !== undefined && mouseX > b.x && mouseX < b.x + b.w && mouseY > b.y && mouseY < b.y + b.h) b.act();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
