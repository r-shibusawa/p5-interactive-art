// ============================================
// 15 ウェブカメラの射影補正（スキャン）
// 映像の中の紙・本・画面の 4 隅を選ぶと、それを正面から見た長方形に直す（書類スキャンアプリと同じ仕組み）
//   出力の各画素 (u, v) → ホモグラフィ H で映像の座標 (x, y) → その色を取ってくる（逆ホモグラフィで画素をサンプル）
//   映像は小さく縮めて（320×240）計算するので 60 fps で動く。カメラが使えないときは代わりのチェッカー画像
// 映像の 4 隅をドラッグ / 1 = 出力を A4 の比率 / 2 = 正方形 / 3 = 横長 / R = 隅をリセット（カメラの許可が必要）
// ============================================

let cap, usingCam = false;
let vw = 320, vh = 240;         // ★ 映像の大きさ（小さいほど速い）
let ow = 240, oh = 340;         // ★ 出力の大きさ（px）
let corners = [];               // 映像の中の 4 隅（映像の px 座標）
let dragging = -1;
let out, fake, H = null;
let vr;                         // 映像の表示位置 {x, y, s}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  out = createImage(ow, oh);
  fake = createGraphics(vw, vh);
  resetCorners();
}
function resetCorners() { corners = [{ x: vw * 0.25, y: vh * 0.2 }, { x: vw * 0.78, y: vh * 0.15 }, { x: vw * 0.85, y: vh * 0.85 }, { x: vw * 0.2, y: vh * 0.8 }]; }
function videoRect() { let s = min((width * 0.55) / vw, (height - 160) / vh); return { x: 30, y: 110, s }; }

// 映像の画素（カメラが使えなければ代わりの絵：ななめに置いたチェッカー）
function sourcePixels() {
  if (cap && cap.width > 0) {
    cap.loadPixels();
    if (cap.pixels && cap.pixels.length >= vw * vh * 4) { usingCam = true; return cap.pixels; }
  }
  usingCam = false;
  drawFake();
  fake.loadPixels();
  return fake.pixels;
}
function drawFake() {
  fake.colorMode(HSB, 360, 100, 100);
  fake.background(220, 30, 30);
  let t = millis() * 0.0004;
  let q = [{ x: 80 + 20 * Math.sin(t), y: 60 }, { x: 250, y: 40 + 15 * Math.cos(t) }, { x: 270, y: 200 }, { x: 60, y: 190 }];
  let Hf = homographyFrom4([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], q);
  fake.noStroke();
  if (Hf) for (let i = 0; i < 6; i++) for (let j = 0; j < 8; j++) {
    let c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => applyH(Hf, { x: a / 6, y: b / 8 }));
    if (c.some((p) => !p)) continue;
    fake.fill((i + j) % 2 ? 45 : 0, (i + j) % 2 ? 70 : 0, (i + j) % 2 ? 95 : 15);
    fake.quad(c[0].x, c[0].y, c[1].x, c[1].y, c[2].x, c[2].y, c[3].x, c[3].y);
  }
}

function draw() {
  background(30, 35, 11);
  vr = videoRect();
  if (dragging >= 0) corners[dragging] = { x: constrain((mouseX - vr.x) / vr.s, 0, vw - 1), y: constrain((mouseY - vr.y) / vr.s, 0, vh - 1) };
  let px = sourcePixels();

  // ★ 出力の正規化座標 (u, v) ∈ [0,1]² → 映像の座標。H は「出力 → 映像」の向き（逆ホモグラフィ）
  H = homographyFrom4([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], corners);
  if (H && px) {
    out.loadPixels();
    let op = out.pixels;
    for (let j = 0; j < oh; j++) {
      let v = j / oh;
      // 1 行分：u についての H の 1 次式なので、行ごとに係数をまとめておく（速くなる）
      let a0 = H[0][1] * v + H[0][2], b0 = H[1][1] * v + H[1][2], c0 = H[2][1] * v + H[2][2];
      for (let i = 0; i < ow; i++) {
        let u = i / ow, w = H[2][0] * u + c0;
        let x = (H[0][0] * u + a0) / w, y = (H[1][0] * u + b0) / w;
        let o = (i + j * ow) * 4;
        if (w > 0 && x >= 0 && x < vw && y >= 0 && y < vh) {
          let s = ((x | 0) + (y | 0) * vw) * 4;
          op[o] = px[s]; op[o + 1] = px[s + 1]; op[o + 2] = px[s + 2]; op[o + 3] = 255;
        } else { op[o] = 40; op[o + 1] = 40; op[o + 2] = 40; op[o + 3] = 255; }
      }
    }
    out.updatePixels();
  }

  // 左：映像と 4 隅
  image(usingCam ? cap : fake, vr.x, vr.y, vw * vr.s, vh * vr.s);
  let sc = corners.map((c) => ({ x: vr.x + c.x * vr.s, y: vr.y + c.y * vr.s }));
  noFill(); stroke(45, 90, 100); strokeWeight(2);
  quad(sc[0].x, sc[0].y, sc[1].x, sc[1].y, sc[2].x, sc[2].y, sc[3].x, sc[3].y);
  noStroke(); textSize(14);
  for (let i = 0; i < 4; i++) { fill(45, 90, 100); circle(sc[i].x, sc[i].y, 18); fill(0, 0, 10); text(i + 1, sc[i].x - 4, sc[i].y + 5); }
  // 右：出力
  let ox = vr.x + vw * vr.s + 40, maxW = width - ox - 30, maxH = height - 160, k = min(maxW / ow, maxH / oh);
  image(out, ox, vr.y, ow * k, oh * k);
  noFill(); stroke(0, 0, 100, 60); strokeWeight(1); rect(ox, vr.y, ow * k, oh * k);
  noStroke(); fill(0, 0, 100); textSize(14);
  text('出力 ' + ow + '×' + oh + '（1：A4　2：正方形　3：横長）', ox, vr.y - 10);
  text(usingCam ? 'カメラ' : 'カメラが使えないので代わりの絵（チェッカー）', vr.x, vr.y - 10);

  fill(0, 0, 100); textSize(18);
  text('映像の中の紙や本の 4 隅（1→2→3→4 = 左上→右上→右下→左下）をドラッグ　R：隅をリセット', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('出力の各画素の位置をホモグラフィで映像の位置に写し、その色を取ってくる（逆向きに写すと穴があかない）。' + (H ? 'H の 3 行目 = [' + nf(H[2][0], 1, 3) + ', ' + nf(H[2][1], 1, 3) + ', 1]' : ''), 20, 68);
}

function mousePressed() {
  let sc = corners.map((c) => ({ x: vr.x + c.x * vr.s, y: vr.y + c.y * vr.s }));
  dragging = nearestHandle(sc, mouseX, mouseY, 30);
}
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === '1') { ow = 240; oh = 340; out = createImage(ow, oh); }
  if (key === '2') { ow = 300; oh = 300; out = createImage(ow, oh); }
  if (key === '3') { ow = 360; oh = 240; out = createImage(ow, oh); }
  if (key === 'r' || key === 'R') resetCorners();
}

// ---------- やってみよう ----------
// 1. 名刺・本の表紙・スマホの画面をななめに映して、4 隅を合わせる。文字が読めるようになる？
// 2. 4 隅の順番を 1→2→3→4 でなく回転させると出力はどうなる？ 裏返し（1↔2）にすると？
// 3. 最近傍（x|0）でなく、まわり 4 画素の平均（バイリニア）にすると滑らかになる。重くなる？
// 4. 逆に「正面の絵をななめに貼る」（AR 風）：H の向きを逆にして、映像の上に自分の絵を貼りつけてみよう

// ==================================================
// ここから下は「射影幾何の道具」（同次座標・外積・行列・ホモグラフィ）
// （中身は読まなくても OK。消さないでね）
// ==================================================

// 同次座標の点 [x, y, w]。w = 1 ならふつうの点 (x, y)、w = 0 なら「方向 (x, y) の無限遠点」
function hPt(x, y, w) { return [x, y, w === undefined ? 1 : w]; }
// 外積。2 点 → それを通る直線 [a, b, c]（ax + by + cw = 0）／ 2 直線 → その交点。どちらも同じ式！
function hCross(p, q) {
  return [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
}
// 内積。点と直線で 0 なら「点が直線の上にある」
function hDot(p, q) { return p[0] * q[0] + p[1] * q[1] + p[2] * q[2]; }
// 3 つの点（または直線）の行列式。0 なら共線（共点）
function hDet(p, q, r) { return hDot(p, hCross(q, r)); }
// 長さを 1 にそろえる（表示用。射影的には同じ点・同じ直線）
function hUnit(p) { let m = Math.hypot(p[0], p[1], p[2]) || 1; return [p[0] / m, p[1] / m, p[2] / m]; }
// 無限遠（または画面からはるか遠く）にあるか
function isFar(p) { return Math.abs(p[2]) * 1e5 < Math.hypot(p[0], p[1]); }
// 同次座標 → 画面の点 {x, y}（無限遠なら null）
function toXY(p) { return isFar(p) ? null : { x: p[0] / p[2], y: p[1] / p[2] }; }
// 2 点 {x, y} を通る直線
function lineThrough(a, b) { return hCross(hPt(a.x, a.y), hPt(b.x, b.y)); }
// 1 直線上の 4 点の複比 (P1,P2;P3,P4)。X, Y はその直線上の基準 2 点（無限遠点があっても計算できる）
function crossRatioH(P1, P2, P3, P4, X, Y) {
  let n = hCross(X, Y), nn = hDot(n, n) || 1;
  let lm = (P) => [hDot(hCross(P, Y), n) / nn, hDot(hCross(X, P), n) / nn];
  let [l1, m1] = lm(P1), [l2, m2] = lm(P2), [l3, m3] = lm(P3), [l4, m4] = lm(P4);
  let num = (l1 * m3 - l3 * m1) * (l2 * m4 - l4 * m2), den = (l2 * m3 - l3 * m2) * (l1 * m4 - l4 * m1);
  return Math.abs(den) < 1e-12 ? NaN : num / den;
}

// 直線 [a, b, c] を枠（省略すると画面全体）いっぱいに描く
function drawHLine(l, box) {
  let [x0, y0, x1, y1] = box || [0, 0, width, height], cand = [];
  for (let e of [[1, 0, -x0], [1, 0, -x1], [0, 1, -y0], [0, 1, -y1]]) {
    let p = toXY(hCross(l, e));
    if (p && p.x > x0 - 1 && p.x < x1 + 1 && p.y > y0 - 1 && p.y < y1 + 1) cand.push(p);
  }
  if (cand.length < 2) return;
  let best = null, bd = -1;
  for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
    let d = Math.hypot(cand[i].x - cand[j].x, cand[i].y - cand[j].y);
    if (d > bd) { bd = d; best = [cand[i], cand[j]]; }
  }
  line(best[0].x, best[0].y, best[1].x, best[1].y);
}
// 点を描く。ふつうの点なら丸、無限遠点なら枠のふちに「方向の矢印」（向かい合う 2 か所 = 同じ 1 点）
function drawHPoint(p, r, label, box) {
  let [x0, y0, x1, y1] = box || [0, 0, width, height];
  let q = toXY(p);
  if (q) { circle(q.x, q.y, r); if (label) text(label, q.x + r * 0.7, q.y - r * 0.7); return; }
  let dx = p[0], dy = p[1], m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
  let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (let s of [1, -1]) {
    let ux = dx * s, uy = dy * s, t = Infinity;
    if (ux > 1e-9) t = Math.min(t, (x1 - 30 - cx) / ux); if (ux < -1e-9) t = Math.min(t, (x0 + 30 - cx) / ux);
    if (uy > 1e-9) t = Math.min(t, (y1 - 30 - cy) / uy); if (uy < -1e-9) t = Math.min(t, (y0 + 30 - cy) / uy);
    let x = cx + ux * t, y = cy + uy * t;
    push(); translate(x, y); rotate(Math.atan2(uy, ux));
    line(-r * 2.5, 0, r, 0); line(r, 0, 0, -r * 0.8); line(r, 0, 0, r * 0.8);
    pop();
    if (label) text(label + '∞', x - r * 2, y - r);
  }
}

// 3×3 行列（配列の配列）の道具
function mat3Mul(A, B) {
  let C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}
function mat3Vec(M, v) { return [hDot(M[0], v), hDot(M[1], v), hDot(M[2], v)]; }
function mat3T(M) { return [[M[0][0], M[1][0], M[2][0]], [M[0][1], M[1][1], M[2][1]], [M[0][2], M[1][2], M[2][2]]]; }
function mat3Inv(M) {
  let [[a, b, c], [d, e, f], [g, h, i]] = M;
  let A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  let det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
          [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
          [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]];
}
// ガウスの消去法（部分ピボット）で A x = b を解く。解けなければ null
function solveLinear(A, b) {
  let n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      let f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}
// 4 点の対応 src[i] → dst[i]（{x, y}）からホモグラフィ 3×3 を求める（h33 = 1 に固定、8 本の連立方程式）
function homographyFrom4(src, dst) {
  let A = [], b = [];
  for (let i = 0; i < 4; i++) {
    let x = src[i].x, y = src[i].y, u = dst[i].x, v = dst[i].y;
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  let h = solveLinear(A, b);
  if (!h) return null;
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}
// ホモグラフィで点 {x, y} を写す（無限遠へ飛ぶなら null）
function applyH(H, p) { return toXY(mat3Vec(H, hPt(p.x, p.y))); }
// つかめる点のリスト（{x, y}）からマウスに近いものの番号。半径 r 以内になければ -1
function nearestHandle(list, mx, my, r) {
  let best = -1, bd = r;
  for (let i = 0; i < list.length; i++) {
    let d = Math.hypot(list[i].x - mx, list[i].y - my);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
