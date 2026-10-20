// ============================================
// 09 画像のフィルトレーション（白黒の「しきい値」を動かす）
// 絵を描いて、しきい値を動かすと、暗い部分だけが「ON」になる
// しきい値を変えながら、ON の塊の数（β0）と穴の数（β1）を数える = 画像の TDA
// ドラッグで描く（ぼんやりした筆） / マウス左右（上の帯）= しきい値 / C で消す / 1〜2 でお手本
// ============================================

let cols = 48, rows = 30, cell;
let img = []; // 0〜1 の濃さ
let threshold = 0.5;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 300) / cols, (height - 160) / rows);
  img = new Array(cols * rows).fill(0);
  preset(1);
}

function preset(k) {
  img.fill(0);
  if (k === 1) {
    // 2 つのリング（穴 2 つ）
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      for (let [cx, cy] of [[15, 15], [33, 15]]) {
        let d = dist(x, y, cx, cy);
        img[x + y * cols] = max(img[x + y * cols], constrain(1 - abs(d - 8) / 4, 0, 1));
      }
    }
  } else {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) img[x + y * cols] = noise(x * 0.12, y * 0.12);
  }
}

// ★ しきい値で 2 値化して、β0（8 近傍の塊）と β1（オイラー標数から）を数える
function betti(th) {
  let on = img.map((v) => v >= th);
  let parent = [];
  for (let i = 0; i < cols * rows; i++) parent.push(i);
  let find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  let V = 0, E = 0, F = 0;
  let corners = new Set(), edgesSet = new Set();
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let i = x + y * cols;
    if (!on[i]) continue;
    F++;
    for (let [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) corners.add((x + dx) + ',' + (y + dy));
    edgesSet.add('h' + x + ',' + y); edgesSet.add('h' + x + ',' + (y + 1)); edgesSet.add('v' + x + ',' + y); edgesSet.add('v' + (x + 1) + ',' + y);
    for (let [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
      let nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      let j = nx + ny * cols;
      if (on[j]) parent[find(i)] = find(j);
    }
  }
  V = corners.size; E = edgesSet.size;
  let comps = new Set();
  for (let i = 0; i < cols * rows; i++) if (on[i]) comps.add(find(i));
  let b0 = comps.size;
  let chi = V - E + F; // オイラー標数 = β0 − β1
  return [b0, b0 - chi, F];
}

function draw() {
  background(230, 40, 10);
  let ox = 20, oy = 110;
  let [b0, b1, area] = betti(threshold);

  // 帯（しきい値）
  noStroke();
  fill(0, 0, 20);
  rect(ox, 80, cols * cell, 14, 7);
  fill(45, 90, 100);
  rect(ox, 80, cols * cell * threshold, 14, 7);

  for (let i = 0; i < cols * rows; i++) {
    let v = img[i];
    let x = ox + (i % cols) * cell, y = oy + floor(i / cols) * cell;
    fill(v >= threshold ? 45 : 230, v >= threshold ? 90 : 30, v >= threshold ? 100 : 15 + v * 40);
    rect(x, y, cell - 1, cell - 1);
  }

  // 右：ベッチ数の曲線（しきい値を 0〜1 で走査）
  let rx = ox + cols * cell + 40, rw = width - rx - 30, ry = 130, rh = height - 240;
  if (frameCount % 20 === 1) { curve0 = []; curve1 = []; for (let t = 0; t <= 1.001; t += 0.05) { let [c0, c1] = betti(t); curve0.push(c0); curve1.push(c1); } }
  stroke(0, 0, 30);
  line(rx, ry + rh, rx + rw, ry + rh);
  for (let [curve, hue] of [[curve0, 200], [curve1, 20]]) {
    noFill();
    stroke(hue, 80, 100);
    strokeWeight(2.5);
    beginShape();
    for (let k = 0; k < curve.length; k++) vertex(rx + (k / (curve.length - 1)) * rw, ry + rh - min(curve[k], 20) * (rh / 20));
    endShape();
  }
  stroke(45, 90, 100);
  line(rx + threshold * rw, ry, rx + threshold * rw, ry + rh);
  noStroke();
  fill(200, 80, 100); textSize(14); text('■ β0 塊', rx, ry - 12);
  fill(20, 80, 100); text('■ β1 穴', rx + 80, ry - 12);
  fill(0, 0, 60); text('しきい値 0 → 1', rx, ry + rh + 20);

  fill(0, 0, 100);
  textSize(18);
  text('しきい値 ' + nf(threshold, 1, 2) + '（上の帯をドラッグ）　ON の画素 ' + area + '　塊 β0 = ' + b0 + '　穴 β1 = ' + b1 + '　ドラッグで描く　C：消す　1〜2：お手本', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('画像を「濃さ ≥ しきい値」で 2 値化。しきい値を動かすと塊が現れ・合体し・穴が開き・埋まる。右は全部のしきい値での β0, β1', 20, 68);
}
let curve0 = [], curve1 = [];

function paint() {
  if (mouseY > 74 && mouseY < 100) { threshold = constrain((mouseX - 20) / (cols * cell), 0, 1); return; }
  let gx = (mouseX - 20) / cell, gy = (mouseY - 110) / cell;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let d = dist(x + 0.5, y + 0.5, gx, gy);
    if (d < 3) img[x + y * cols] = min(1, img[x + y * cols] + (1 - d / 3) * 0.25);
  }
}
function mousePressed() { paint(); }
function mouseDragged() { paint(); }
function keyPressed() {
  if (key === 'c' || key === 'C') img.fill(0);
  if (key === '1' || key === '2') preset(int(key));
}

// ---------- やってみよう ----------
// 1. お手本 1 で、しきい値を動かす。穴が 2 つある範囲は？ 高いしきい値で輪が切れると穴は消える
// 2. 自分で「ドーナツ」を描いて穴を作る。穴が消えるのはしきい値がどのくらいのとき？
// 3. お手本 2（ノイズ画像）は、しきい値 0.5 付近で塊と穴が激しく変わる（パーコレーション）
