// ============================================
// 15 周波数ホッピング（おまけ）
// 送信機が決まった順番で周波数を飛び回る。順番を知っている受信機だけが追いかけられる
// 妨害電波（マウス）が 1 つの周波数を潰しても、ほとんどのデータは通る
// マウス上下 = 妨害する周波数 / 1 = ホッピングなし / 2 = ホッピングあり
// ============================================

let channels = 16;
let hopping = true;
let timeline = []; // {ch, ok}
let seed = 7;
let jamCh = 8;
let stats = { sent: 0, lost: 0 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// ★ ホッピング列：送信機と受信機が共有する「秘密の順番」（擬似乱数）
function hopSequence(t) {
  if (!hopping) return 5; // ホッピングなし：いつも同じ周波数
  return (t * 7 + seed) % channels; // 単純な擬似乱数
}

function draw() {
  background(230, 40, 10);
  jamCh = floor(map(mouseY, 100, height - 80, channels - 1, 0, true));

  if (frameCount % 8 === 0) {
    let t = floor(frameCount / 8);
    let ch = hopSequence(t);
    let ok = ch !== jamCh; // 妨害されている周波数なら失敗
    timeline.push({ ch, ok });
    stats.sent++;
    if (!ok) stats.lost++;
    if (timeline.length > 60) timeline.shift();
  }

  // ---- 周波数（縦）× 時間（横）----
  let left = 100, right = width - 60, top = 100, bottom = height - 80;
  let rowH = (bottom - top) / channels;
  for (let c = 0; c < channels; c++) {
    let y = bottom - (c + 1) * rowH;
    noStroke();
    fill(c === jamCh ? 0 : 230, c === jamCh ? 80 : 30, c === jamCh ? 35 : 14);
    rect(left, y, right - left, rowH - 2);
    fill(0, 0, 60);
    textSize(12);
    text('ch ' + c, left - 50, y + rowH / 2 + 4);
  }
  // 妨害電波
  noStroke();
  fill(0, 90, 100);
  textSize(14);
  text('妨害電波（マウス上下）', right - 170, bottom - (jamCh + 1) * rowH - 6);

  // パケット
  let colW = (right - left) / 60;
  for (let i = 0; i < timeline.length; i++) {
    let p = timeline[i];
    let x = left + i * colW, y = bottom - (p.ch + 1) * rowH;
    fill(p.ok ? 120 : 0, 80, 100);
    rect(x + 1, y + 2, colW - 2, rowH - 6, 3);
  }

  fill(0, 0, 100);
  textSize(18);
  text((hopping ? 'ホッピングあり' : 'ホッピングなし（1 つの周波数）') + '　1 / 2 で切りかえ　　送信 ' + stats.sent + '　妨害で失敗 ' + stats.lost + '（' + nf((100 * stats.lost) / max(stats.sent, 1), 1, 0) + ' %）', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('Bluetooth は 1 秒に 1600 回、79 の周波数を飛び回る。Wi-Fi や電子レンジと周波数がぶつかっても、すぐ別の周波数へ逃げる', 20, 68);
}

function keyPressed() {
  if (key === '1' || key === '2') {
    hopping = key === '2';
    timeline = [];
    stats = { sent: 0, lost: 0 };
  }
}

// ---------- やってみよう ----------
// 1. ホッピングなし（1）で、マウスを ch 5 に合わせる → 全部失敗。ホッピングあり（2）なら 1/16 だけ
// 2. 妨害を 2 つにすると？（jamCh2 を追加）
// 3. hopSequence を自分の順番にして、「受信機が知らない順番」だと受け取れないことを確認
