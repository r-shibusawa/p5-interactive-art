// ============================================
// 00 対称性を見つける
// 図形を動かしても「ぴったり重なる」動かし方 = 対称性。回転と鏡映（裏返し）がある
//   正 n 角形には回転 n 個 + 鏡映 n 個 = 2n 個の対称性がある（二面体群 Dₙ）
// 1〜4 = 図形（正多角形・雪の結晶・風車・文字）/ ↑↓ = 角の数・文字 / R = 回す / F = 鏡に映す
// ←→ = 鏡の軸をえらぶ / 0 = もとにもどす
// ============================================

let shapeNo = 1;
let n = 5;                 // ★ 角の数（回転の対称性の数）
let k = 0, f = 0;          // 今の対称性 = rᵏ sᶠ（r：回転、s：鏡映）
let axis = 0;              // えらんでいる鏡の軸
let anim = null;           // { type: 'r' | 's', t, ... }
let R0 = 210;              // ★ 図形の大きさ
const LETTERS = {          // ★ 文字：線分の列、回転の数 n、鏡があるか、鏡の向き（ラジアン）
  A: { segs: [[-1, 1, 0, -1], [0, -1, 1, 1], [-0.5, 0.2, 0.5, 0.2]], n: 1, mirror: true, phi: Math.PI / 2 },
  H: { segs: [[-1, -1, -1, 1], [1, -1, 1, 1], [-1, 0, 1, 0]], n: 2, mirror: true, phi: 0 },
  N: { segs: [[-1, 1, -1, -1], [-1, -1, 1, 1], [1, 1, 1, -1]], n: 2, mirror: false, phi: 0 },
  S: { segs: [[1, -1, -1, -1], [-1, -1, -1, 0], [-1, 0, 1, 0], [1, 0, 1, 1], [1, 1, -1, 1]], n: 2, mirror: false, phi: 0 },
  Z: { segs: [[-1, -1, 1, -1], [1, -1, -1, 1], [-1, 1, 1, 1]], n: 2, mirror: false, phi: 0 },
  X: { segs: [[-1, -1, 1, 1], [1, -1, -1, 1]], n: 2, mirror: true, phi: Math.PI / 4 },
  E: { segs: [[1, -1, -1, -1], [-1, -1, -1, 1], [-1, 1, 1, 1], [-1, 0, 0.6, 0]], n: 1, mirror: true, phi: 0 },
  F: { segs: [[1, -1, -1, -1], [-1, -1, -1, 1], [-1, 0, 0.6, 0]], n: 1, mirror: false, phi: 0 },
};
let letterKeys = Object.keys(LETTERS);
let letterIdx = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
}

// 今の図形の「回転の数 n・鏡があるか・最初の鏡の向き」
function info() {
  if (shapeNo === 1) return { n, mirror: true, phi: -HALF_PI };
  if (shapeNo === 2) return { n: 6, mirror: true, phi: -HALF_PI };
  if (shapeNo === 3) return { n, mirror: false, phi: 0 };
  let L = LETTERS[letterKeys[letterIdx]];
  return { n: L.n, mirror: L.mirror, phi: L.phi };
}

function draw() {
  background(250, 247, 240);
  let I = info();
  let cx = width * 0.4, cy = height * 0.55;

  // 今の変換を行列で（回転 2πk/n、鏡映は軸 phi で）
  let M = elementMatrix(k, f, I);
  if (anim) {
    anim.t = min(1, anim.t + 0.045);
    let e = anim.t * anim.t * (3 - 2 * anim.t);
    let T;
    if (anim.type === 'r') T = rotM(e * TWO_PI / I.n);
    else T = squashM(anim.phi, 1 - 2 * e);           // 軸に垂直な方向につぶして裏返す
    M = mulM(T, elementMatrix(anim.k0, anim.f0, I));
    if (anim.t >= 1) anim = null;
  }

  // もとの位置（うすい影）と、動かした図形
  drawShape(cx, cy, [1, 0, 0, 1], true);
  drawShape(cx, cy, M, false);

  // 鏡の軸
  if (I.mirror) {
    for (let j = 0; j < I.n; j++) {
      let a = I.phi + (j * PI) / I.n;
      stroke(j === axis % I.n ? color(230, 60, 90) : color(0, 30));
      strokeWeight(j === axis % I.n ? 3 : 1);
      drawingContext.setLineDash([8, 8]);
      line(cx - cos(a) * R0 * 1.35, cy - sin(a) * R0 * 1.35, cx + cos(a) * R0 * 1.35, cy + sin(a) * R0 * 1.35);
      drawingContext.setLineDash([]);
    }
  }
  noStroke();
  fill(230, 60, 90);
  circle(cx, cy, 8);

  // 文字
  fill(30);
  textSize(18);
  text('1〜4：図形　↑↓：' + (shapeNo === 4 ? '文字' : '角の数') + '　R：回す　F：鏡に映す　←→：鏡の軸　0：もとにもどす', 20, 36);
  fill(110);
  textSize(15);
  text('うすい影（もとの位置）とぴったり重なれば、その動かし方は「対称性」。対称性どうしを続けても、また対称性になる（群）', 20, 62);

  let px = width * 0.72, py = 120;
  let count = I.n * (I.mirror ? 2 : 1);
  fill(30);
  textSize(22);
  text(['', '正 ' + n + ' 角形', '雪の結晶', n + ' 枚羽根の風車', '文字「' + letterKeys[letterIdx] + '」'][shapeNo], px, py);
  textSize(16);
  fill(80);
  text('回転 ' + I.n + ' 個' + (I.mirror ? ' + 鏡映 ' + I.n + ' 個' : '（鏡映なし）'), px, py + 32);
  textSize(48);
  fill(230, 60, 90);
  text(count + ' 個', px, py + 90);
  textSize(15);
  fill(80);
  text(I.mirror ? '二面体群 D' + I.n + '（位数 ' + count + '）' : '巡回群 C' + I.n + '（位数 ' + count + '）', px, py + 118);
  // 対称性の一覧（小さな図）
  let s = 54, y0 = py + 150;
  for (let i = 0; i < count; i++) {
    let kk = i % I.n, ff = i < I.n ? 0 : 1;
    let x = px + (i % 4) * (s + 10) + s / 2, y = y0 + floor(i / 4) * (s + 26) + s / 2;
    if (y > height - 30) break;
    noStroke();
    fill(kk === k && ff === f ? color(255, 220, 120) : color(235, 230, 220));
    rect(x - s / 2, y - s / 2, s, s, 6);
    drawShape(x, y, elementMatrix(kk, ff, I), false, s / (2.6 * R0));
    fill(60);
    textSize(12);
    textAlign(CENTER);
    text(elName(kk, ff), x, y + s / 2 + 14);
    textAlign(LEFT);
  }
}

// 図形を描く。M は 2×2 行列 [a, b, c, d]
function drawShape(cx, cy, M, ghost, sc = 1) {
  push();
  translate(cx, cy);
  applyMatrix(M[0], M[2], M[1], M[3], 0, 0);
  scale(sc);
  strokeJoin(ROUND);
  if (shapeNo === 1) {
    stroke(ghost ? color(0, 25) : color(40, 60, 120));
    strokeWeight(ghost ? 3 : 4);
    fill(ghost ? color(0, 10) : color(120, 160, 240, 160));
    beginShape();
    for (let i = 0; i < n; i++) vertex(R0 * cos(-HALF_PI + (i * TWO_PI) / n), R0 * sin(-HALF_PI + (i * TWO_PI) / n));
    endShape(CLOSE);
    if (!ghost) for (let i = 0; i < n; i++) {   // 頂点に番号と色 → どの対称性か区別できる
      let x = R0 * cos(-HALF_PI + (i * TWO_PI) / n), y = R0 * sin(-HALF_PI + (i * TWO_PI) / n);
      noStroke();
      colorMode(HSB); fill((i * 360) / n, 70, 90); colorMode(RGB);
      circle(x, y, 34);
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(18);
      push(); translate(x, y); applyMatrix(M[0], M[1], M[2], M[3], 0, 0); text(i + 1, 0, 0); pop(); // 数字は読める向きに
      textAlign(LEFT, BASELINE);
    }
  } else if (shapeNo === 2) {
    stroke(ghost ? color(0, 25) : color(40, 120, 200));
    strokeWeight(ghost ? 4 : 6);
    noFill();
    for (let i = 0; i < 6; i++) {
      push();
      rotate((i * TWO_PI) / 6);
      line(0, 0, 0, -R0);
      for (let t of [0.35, 0.6, 0.82]) {
        let L = R0 * (0.36 - t * 0.25);
        line(0, -R0 * t, L, -R0 * t - L);
        line(0, -R0 * t, -L, -R0 * t - L);
      }
      if (!ghost && i === 0) { noStroke(); fill(230, 60, 90); circle(R0 * 0.12, -R0 * 0.62, 18); } // 目印（1 つだけ）
      pop();
    }
  } else if (shapeNo === 3) {
    noStroke();
    for (let i = 0; i < n; i++) {
      push();
      rotate((i * TWO_PI) / n);
      fill(ghost ? color(0, 18) : i === 0 ? color(230, 60, 90) : color(60, 160, 120));
      beginShape();
      vertex(0, 0); vertex(R0 * 0.25, -R0 * 0.55); vertex(0, -R0); vertex(-R0 * 0.08, -R0 * 0.3);
      endShape(CLOSE);
      pop();
    }
  } else {
    let L = LETTERS[letterKeys[letterIdx]];
    stroke(ghost ? color(0, 25) : color(40, 60, 120));
    strokeWeight(ghost ? 30 : 34);
    strokeCap(ROUND);
    for (let sg of L.segs) line(sg[0] * R0 * 0.75, sg[1] * R0 * 0.75, sg[2] * R0 * 0.75, sg[3] * R0 * 0.75);
    if (!ghost) { stroke(230, 60, 90); strokeWeight(12); point(L.segs[0][0] * R0 * 0.75, L.segs[0][1] * R0 * 0.75); } // 目印
  }
  pop();
}

// rᵏ sᶠ の行列：まず鏡映（軸 phi）、それから回転
function elementMatrix(kk, ff, I) {
  let Rm = rotM((kk * TWO_PI) / I.n);
  if (!ff) return Rm;
  let c = cos(2 * I.phi), s = sin(2 * I.phi);
  return mulM(Rm, [c, s, s, -c]);
}
function rotM(a) { return [cos(a), -sin(a), sin(a), cos(a)]; }
// 軸 phi に垂直な方向を s 倍（s = -1 で鏡映）
function squashM(phi, s) {
  let c = cos(phi), sn = sin(phi);
  return mulM(mulM([c, -sn, sn, c], [1, 0, 0, s]), [c, sn, -sn, c]);
}
function mulM(A, B) { return [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3], A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3]]; }
function elName(kk, ff) { return (kk === 0 && !ff ? 'e' : '') + (kk ? 'r' + (kk > 1 ? kk : '') : '') + (ff ? 's' : ''); }

function keyPressed() {
  let I = info();
  if (key >= '1' && key <= '4' && key.length === 1) { shapeNo = +key; k = 0; f = 0; axis = 0; anim = null; }
  if (anim) return false;
  if (key === 'r' || key === 'R') { anim = { type: 'r', t: 0, k0: k, f0: f }; k = (k + 1) % I.n; }
  if ((key === 'f' || key === 'F') && I.mirror) {
    let j = axis % I.n;                        // 軸 j の鏡映 = rʲ s。rʲ s · rᵏ sᶠ = rʲ⁻ᵏ s¹⁺ᶠ
    anim = { type: 's', t: 0, k0: k, f0: f, phi: I.phi + (j * PI) / I.n };
    k = (((j - k) % I.n) + I.n) % I.n; f = 1 - f;
  }
  if (key === LEFT_ARROW) axis = (axis + I.n - 1) % I.n;
  if (key === RIGHT_ARROW) axis = (axis + 1) % I.n;
  if (key === UP_ARROW || key === DOWN_ARROW) {
    let d = key === UP_ARROW ? 1 : -1;
    if (shapeNo === 4) letterIdx = (letterIdx + d + letterKeys.length) % letterKeys.length;
    else n = constrain(n + d, 2, 12);
    k = 0; f = 0; axis = 0;
  }
  if (key === '0') { k = 0; f = 0; }
  return false;
}

// ---------- やってみよう ----------
// 1. 正方形（n = 4）で R を 4 回 → もとどおり。F を 2 回 → もとどおり。対称性には必ず「逆」がある
// 2. R のあと F と、F のあと R は同じ？ 番号の位置を比べよう（→ 01 で詳しく）
// 3. 風車（3）には鏡映がない。なぜ？ 羽根を鏡に映すと向きが逆になるから
// 4. 文字を ↑↓ で切りかえて、それぞれ何個の対称性があるか予想してから確かめよう
// 5. LETTERS に自分の文字（T, O, K…）を足そう。n と mirror、phi を正しく決められるかな？
