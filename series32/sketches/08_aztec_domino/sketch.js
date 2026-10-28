// ============================================
// 08 ドミノ・タイリングと北極円
// 階段状のダイヤモンド（アステカ・ダイヤモンド）を 1×2 のドミノでランダムに埋める
//   「ドミノ・シャッフル」：ぶつかるペアを消す → 全部 1 マス動かす → 空いた 2×2 にランダムに 2 枚置く、をくり返す
//   大きくすると、四隅はレンガのように固まり、真ん中だけがランダム。その境目がほぼ円 = 北極円（arctic circle）
// ↑↓ = 目標の大きさ / スペース = 作り直す / F = 一気に / A = 円を表示 / S = 保存
// ============================================

let target = 80;        // ★ ダイヤモンドの大きさ（次数 n）
let n = 0;              // いまの大きさ
let doms = [];          // ドミノ { x, y, t }  t: 0 = 北, 1 = 南（横向き）, 2 = 東, 3 = 西（縦向き）
let showCircle = true;
let img;

// ★ 色：北・南・東・西（動く向きで色分け）
let cols = [[250, 200, 60], [230, 80, 70], [80, 190, 120], [70, 130, 220]];

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(18, 20, 28);
  if (n < target) grow();
  else if (n > target) { doms = []; n = 0; }

  let cs = (Math.min(width, height - 120) * 0.92) / (2 * Math.max(n, 1));
  let cx = width / 2, cy = height / 2 + 30;
  if (n <= 40) {
    stroke(18, 20, 28);
    strokeWeight(n > 25 ? 1 : 2);
    for (let d of doms) {
      let c = cols[d.t];
      fill(c[0], c[1], c[2]);
      if (d.t < 2) rect(cx + d.x * cs, cy - (d.y + 1) * cs, 2 * cs, cs);
      else rect(cx + d.x * cs, cy - (d.y + 2) * cs, cs, 2 * cs);
    }
  } else {
    // 大きいときは 1 マス = 1 画素の画像にしてから拡大
    if (!img || img.width !== 2 * n) img = createImage(2 * n, 2 * n);
    img.loadPixels();
    img.pixels.fill(0);
    for (let d of doms) {
      let c = cols[d.t];
      setCell(d.x, d.y, c);
      if (d.t < 2) setCell(d.x + 1, d.y, c); else setCell(d.x, d.y + 1, c);
    }
    img.updatePixels();
    noSmooth();
    image(img, cx - n * cs, cy - n * cs, 2 * n * cs, 2 * n * cs);
    smooth();
  }
  if (showCircle && n > 0) {
    noFill();
    stroke(255);
    strokeWeight(2);
    circle(cx, cy, (2 * n * cs) / Math.SQRT2);   // ダイヤモンドに内接する円
  }

  noStroke();
  fill(255);
  textSize(20);
  text('アステカ・ダイヤモンドのランダムなドミノ・タイリング　大きさ ' + n + ' / 目標 ' + target + '（↑↓）', 20, 36);
  textSize(15);
  fill(190);
  text('ドミノ ' + doms.length + ' 枚。色 = 動く向き（黄 北・赤 南・緑 東・青 西）。白い円 = 北極円（A）', 20, 62);
  text('円の外側はレンガ積みに「凍って」いて、内側だけが「液体」のようにランダム', 20, 84);
}

function setCell(x, y, c) {
  let px = x + n, py = n - 1 - y;
  let i = 4 * (py * 2 * n + px);
  img.pixels[i] = c[0];
  img.pixels[i + 1] = c[1];
  img.pixels[i + 2] = c[2];
  img.pixels[i + 3] = 255;
}

// ★ ドミノ・シャッフル（大きさ n → n + 1）
function grow() {
  let W = 2 * (n + 2), off = n + 2;
  let at = new Int8Array(W * W).fill(-1);          // その左下マスにあるドミノの種類
  let idx = (x, y) => (y + off) * W + (x + off);
  for (let d of doms) at[idx(d.x, d.y)] = d.t;
  // 1. 向かい合ってぶつかるペアを消す（北の上に南、東の右に西）
  let keep = [];
  for (let d of doms) {
    if (d.t === 0 && at[idx(d.x, d.y + 1)] === 1) continue;
    if (d.t === 1 && at[idx(d.x, d.y - 1)] === 0) continue;
    if (d.t === 2 && at[idx(d.x + 1, d.y)] === 3) continue;
    if (d.t === 3 && at[idx(d.x - 1, d.y)] === 2) continue;
    keep.push(d);
  }
  // 2. 全部 1 マス、自分の向きに動かす
  for (let d of keep) {
    if (d.t === 0) d.y++; else if (d.t === 1) d.y--; else if (d.t === 2) d.x++; else d.x--;
  }
  // 3. 空いた 2×2 にランダムに 2 枚（横 2 枚 = 南と北、縦 2 枚 = 西と東）
  n++;
  W = 2 * (n + 1);
  let off2 = n + 1;
  let occ = new Uint8Array(W * W);
  let id2 = (x, y) => (y + off2) * W + (x + off2);
  for (let d of keep) {
    occ[id2(d.x, d.y)] = 1;
    if (d.t < 2) occ[id2(d.x + 1, d.y)] = 1; else occ[id2(d.x, d.y + 1)] = 1;
  }
  for (let y = -n; y < n; y++) {
    for (let x = -n; x < n; x++) {
      if (Math.abs(x + 0.5) + Math.abs(y + 0.5) > n || occ[id2(x, y)]) continue;
      if (random() < 0.5) keep.push({ x, y, t: 1 }, { x, y: y + 1, t: 0 });
      else keep.push({ x, y, t: 3 }, { x: x + 1, y, t: 2 });
      occ[id2(x, y)] = occ[id2(x + 1, y)] = occ[id2(x, y + 1)] = occ[id2(x + 1, y + 1)] = 1;
    }
  }
  doms = keep;
}

function keyPressed() {
  if (key === UP_ARROW) target = Math.min(240, target + 10);
  if (key === DOWN_ARROW) { target = Math.max(1, target - 10); if (n > target) { doms = []; n = 0; } }
  if (key === ' ') { doms = []; n = 0; }
  if (key === 'f' || key === 'F') { let t = millis(); while (n < target && millis() - t < 2000) grow(); }
  if (key === 'a' || key === 'A') showCircle = !showCircle;
  if (key === 's' || key === 'S') saveCanvas('aztec', 'png');
}

// ---------- やってみよう ----------
// 1. target を 4 にして、1 枚ずつ増えていく様子をスペースで何度も見よう
// 2. 大きさ 200 で、円の外側に「レンガ」の 4 色の領域ができるのを確かめよう（なぜ固まる？）
// 3. random() < 0.5 を 0.8 にすると「かたより」ができる。円はどんな形にゆがむ？
// 4. 大きさ n のダイヤモンドの埋め方は 2^(n(n+1)/2) 通り。n = 10 で何通り？
