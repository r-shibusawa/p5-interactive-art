// ============================================
// 06 正多角形の中の貴金属比
// 正 m 角形で、k 個とばしの対角線と辺の比は  d(k) / 辺 = sin(kπ/m) / sin(π/m)
//   正五角形 → φ（黄金比） / 正八角形 → 1+√2（白銀比） / 正十二角形 → 1+√3, 2+√3 …
// ←→ = 角の数 m / マウスを頂点に近づける = その頂点からの対角線 / クリック = 固定 / D = 全対角線 / スペース = 回転
// ============================================

let m = 5;               // ★ 正 m 角形
let picked = -1;         // クリックで固定した頂点
let showAll = true;
let spin = false;
let rot = -Math.PI / 2;

// 名前つきの比（見つけたら名前を出す）
const NAMED = [
  { v: Math.SQRT2, name: '√2（白銀比・大和比）' },
  { v: (1 + Math.sqrt(5)) / 2, name: 'φ（黄金比）' },
  { v: Math.sqrt(3), name: '√3' },
  { v: 2, name: '2' },
  { v: 1 + Math.SQRT2, name: '1+√2（白銀比）' },
  { v: 1 + Math.sqrt(3), name: '1+√3（第2白銀比）' },
  { v: 2 + Math.sqrt(3), name: '2+√3' },
  { v: (1 + Math.sqrt(5)) / 2 + 1, name: 'φ² = φ+1' },
  { v: Math.sqrt(4 + 2 * Math.SQRT2), name: '√(4+2√2)' },
  { v: Math.sqrt(2 + Math.SQRT2), name: '√(2+√2)' },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(250, 25, 10);
  if (spin) rot += 0.004;
  let cx = width * 0.36, cy = height * 0.55, R = min(width * 0.3, height * 0.38);
  let P = [];
  for (let i = 0; i < m; i++) P.push({ x: cx + R * cos(rot + TWO_PI * i / m), y: cy + R * sin(rot + TWO_PI * i / m) });

  // マウスにいちばん近い頂点（固定していなければ）
  let sel = picked;
  if (sel < 0) {
    let best = 1e9;
    for (let i = 0; i < m; i++) { let d = dist(mouseX, mouseY, P[i].x, P[i].y); if (d < best) { best = d; sel = i; } }
    if (best > R * 0.6) sel = -1;
  }

  // 全部の対角線（長さの種類ごとに色）
  if (showAll) {
    for (let i = 0; i < m; i++) for (let j = i + 2; j < m; j++) {
      let k = min(j - i, m - (j - i));
      stroke(hueOf(k), 50, 80, 25);
      strokeWeight(1);
      line(P[i].x, P[i].y, P[j].x, P[j].y);
    }
  }
  // 辺
  noFill();
  stroke(0, 0, 100);
  strokeWeight(3);
  beginShape();
  for (let p of P) vertex(p.x, p.y);
  endShape(CLOSE);

  // 選んだ頂点からの対角線
  if (sel >= 0) {
    for (let k = 2; k <= floor(m / 2); k++) {
      let q = P[(sel + k) % m];
      stroke(hueOf(k), 80, 100);
      strokeWeight(4);
      line(P[sel].x, P[sel].y, q.x, q.y);
      noStroke();
      fill(hueOf(k), 80, 100);
      circle(q.x, q.y, 12);
    }
    fill(0, 0, 100);
    circle(P[sel].x, P[sel].y, 18);
  }
  noStroke();
  fill(0, 0, 100);
  for (let p of P) circle(p.x, p.y, 7);

  // 文字
  fill(0, 0, 100);
  textSize(18);
  text('正 ' + m + ' 角形（←→）　マウスを頂点へ / クリックで固定 ' + (picked >= 0 ? 'ON' : 'off') + '　D：全対角線 ' + (showAll ? 'ON' : 'off') + '　スペース：回転', 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text('辺を 1 としたときの対角線の長さ。sin(kπ/m) / sin(π/m) は「k 個とばし」の対角線', 20, 68);

  // 右：比の表
  let px = width * 0.7, py = 130;
  fill(0, 0, 100);
  textSize(17);
  text('辺 = 1 として', px, py);
  for (let k = 1; k <= floor(m / 2); k++) {
    let v = sin(k * PI / m) / sin(PI / m);
    let nm = nameOfValue(v);
    fill(k === 1 ? color(0, 0, 100) : color(hueOf(k), 70, 100));
    textSize(16);
    text((k === 1 ? '辺　　' : 'd' + k + '　　') + nf(v, 1, 5) + (nm ? '　= ' + nm : ''), px, py + 34 + (k - 1) * 28);
  }
  // 比どうしの比（となりの対角線）
  fill(0, 0, 70);
  textSize(14);
  let yy = py + 60 + floor(m / 2) * 28;
  text('おもな例', px, yy);
  text('正五角形　対角線 / 辺 = φ（星形の中に φ が何回も）', px, yy + 24);
  text('正八角形　d3 / 辺 = 1 + √2、d2 / 辺 = √(2+√2)', px, yy + 46);
  text('正十二角形　d3 / 辺 = 1 + √3、d5 / 辺 = 2 + √3', px, yy + 68);
  text('正方形　対角線 / 辺 = √2（A 判の比）', px, yy + 90);
}

function nameOfValue(v) {
  for (let t of NAMED) if (abs(t.v - v) < 1e-6) return t.name;
  return '';
}
function hueOf(k) { return (k * 67 + 20) % 360; }

function mousePressed() {
  if (picked >= 0) { picked = -1; return; }
  let cx = width * 0.36, cy = height * 0.55, R = min(width * 0.3, height * 0.38);
  for (let i = 0; i < m; i++) {
    let x = cx + R * cos(rot + TWO_PI * i / m), y = cy + R * sin(rot + TWO_PI * i / m);
    if (dist(mouseX, mouseY, x, y) < 40) picked = i;
  }
}

function keyPressed() {
  if (key === RIGHT_ARROW) { m = min(m + 1, 24); picked = -1; }
  if (key === LEFT_ARROW) { m = max(m - 1, 3); picked = -1; }
  if (key === 'd' || key === 'D') showAll = !showAll;
  if (key === ' ') spin = !spin;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 正五角形の対角線を全部ひくと星形の中に小さな五角形ができる。大きさの比は？（φ² 倍）
// 2. 正十角形・正十二角形で、表に名前が出る対角線を探そう
// 3. 正 m 角形の d2 / 辺 = 2cos(π/m)。m を大きくすると 2 に近づくのはなぜ？
// 4. NAMED に「(√6+√2)/2」（正十二角形の d2）など自分で見つけた値を足してみよう

// ---------- 道具 ----------
// （このスケッチは p5.js の sin / cos / dist だけで計算している）
