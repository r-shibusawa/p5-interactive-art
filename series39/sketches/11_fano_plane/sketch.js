// ============================================
// 11 有限射影平面：ファノ平面と位数 3 の射影平面
// 点が 7 つ、直線が 7 本しかない「いちばん小さい射影平面」（ファノ平面）。それでも
//   「どの 2 点も 1 本の直線で結ばれる」「どの 2 直線も 1 点で交わる」（平行線なし）が成り立つ
//   点 = 0 と 1 だけの座標 [x, y, w]（0 以外）、直線も同じ。点が直線の上 ⇔ 内積が偶数。1 本の直線は 3 点を通り、1 つの点を 3 本が通る
//   位数 3（13 点 13 線、各線 4 点）は「差集合 {0, 1, 3, 9} mod 13」で作る
// 1 = ファノ平面（位数 2） / 2 = 位数 3 / 点をクリック = 通る直線を強調、2 点目で共通の直線 / A = 直線を順に光らせる / C = 選択を消す
// ============================================

let q = 2;                      // 位数（2 か 3）
let P = [], Ls = [];            // 点 {x, y, name}、直線 = 点の番号の配列
let sel = [], auto = false;
let checks = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  build();
}

// ★ 平面を作る
function build() {
  P = []; Ls = []; sel = [];
  let c = { x: width * 0.42, y: height * 0.56 }, R = min(width * 0.3, height * 0.36);
  if (q === 2) {
    // GF(2) の 0 でない 3 ベクトル 7 つ。直線 = XOR が 0 になる 3 点の組
    let pos = { '100': [90, 1], '010': [210, 1], '001': [330, 1], '110': [150, 0.5], '011': [270, 0.5], '101': [30, 0.5], '111': [0, 0] };
    let keys = Object.keys(pos);
    for (let k of keys) { let [a, r] = pos[k]; P.push({ x: c.x + R * r * Math.cos((a * Math.PI) / 180), y: c.y - R * r * Math.sin((a * Math.PI) / 180), name: '[' + k.split('').join(',') + ']', v: Number('0b' + k) }); }
    for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) for (let k = j + 1; k < 7; k++) if ((P[i].v ^ P[j].v ^ P[k].v) === 0) Ls.push([i, j, k]);
  } else {
    // 差集合：点 0〜12 を円に並べ、直線 k = {k, k+1, k+3, k+9} mod 13
    for (let i = 0; i < 13; i++) { let a = -Math.PI / 2 + (i * Math.PI * 2) / 13; P.push({ x: c.x + R * Math.cos(a), y: c.y + R * Math.sin(a), name: String(i) }); }
    for (let k = 0; k < 13; k++) Ls.push([k, (k + 1) % 13, (k + 3) % 13, (k + 9) % 13]);
  }
  // 公理の検算（総当たり）
  let n = P.length, pairOK = 0, linePairOK = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Ls.filter((l) => l.includes(i) && l.includes(j)).length === 1) pairOK++;
  for (let a = 0; a < Ls.length; a++) for (let b = a + 1; b < Ls.length; b++) if (Ls[a].filter((i) => Ls[b].includes(i)).length === 1) linePairOK++;
  checks = { n, m: Ls.length, perLine: Ls[0].length, perPoint: Ls.filter((l) => l.includes(0)).length, pairOK, pairs: (n * (n - 1)) / 2, linePairOK, linePairs: (Ls.length * (Ls.length - 1)) / 2 };
}

function draw() {
  background(30, 35, 11);
  let hot = new Set();                    // 強調する直線
  if (auto) hot.add(Math.floor(frameCount / 40) % Ls.length);
  if (sel.length === 1) Ls.forEach((l, k) => { if (l.includes(sel[0])) hot.add(k); });
  if (sel.length === 2) Ls.forEach((l, k) => { if (l.includes(sel[0]) && l.includes(sel[1])) hot.add(k); });

  for (let k = 0; k < Ls.length; k++) {
    let h = hot.has(k);
    stroke((k * 47) % 360, 60, 100, h ? 100 : hot.size ? 12 : 45); strokeWeight(h ? 5 : 2);
    drawLineSet(Ls[k]);
  }
  noStroke(); textSize(14);
  for (let i = 0; i < P.length; i++) {
    let s = sel.includes(i);
    fill(s ? 45 : 0, s ? 90 : 0, 100); circle(P[i].x, P[i].y, s ? 22 : 16);
    fill(0, 0, 100); text(P[i].name, P[i].x + 12, P[i].y - 10);
  }

  // 数の表
  let px = width - 400, py = 110;
  fill(0, 0, 100, 8); rect(px - 16, py - 30, 390, 230, 10);
  fill(0, 0, 100); textSize(16); text((q === 2 ? 'ファノ平面（位数 2）' : '射影平面（位数 3）') + '　n² + n + 1 = ' + checks.n, px, py);
  fill(0, 0, 85); textSize(14);
  text('点の数 ' + checks.n + '　直線の数 ' + checks.m, px, py + 30);
  text('1 本の直線の上の点 ' + checks.perLine + '　1 点を通る直線 ' + checks.perPoint, px, py + 52);
  text('どの 2 点も 1 直線で結ばれる： ' + checks.pairOK + '/' + checks.pairs + ' 組 ' + (checks.pairOK === checks.pairs ? '✓' : '✗'), px, py + 82);
  text('どの 2 直線も 1 点で交わる： ' + checks.linePairOK + '/' + checks.linePairs + ' 組 ' + (checks.linePairOK === checks.linePairs ? '✓' : '✗'), px, py + 104);
  text('→ 平行線が 1 組もない。点と直線の数が同じ（双対）', px, py + 134);
  text(q === 2 ? '直線 = XOR が 0 になる 3 点。円も「直線」！' : '直線 k = {k, k+1, k+3, k+9} mod 13（差集合）', px, py + 160);
  text(q === 2 ? '座標 [x,y,w] は 0/1、2 倍すると 0 なので「スケール倍」は 1 通り' : '位数 q の平面：点 q²+q+1、各線 q+1 点', px, py + 182);

  fill(0, 0, 100); textSize(18);
  text((sel.length === 0 ? '点をクリック → 通る直線を強調　2 点目 → 共通の直線（必ず 1 本）' : sel.length === 1 ? '点 ' + P[sel[0]].name + ' を通る直線：' + hot.size + ' 本' : '点 ' + P[sel[0]].name + ' と ' + P[sel[1]].name + ' を通る直線：' + hot.size + ' 本') + '　　1/2：位数　A：自動 ' + (auto ? 'ON' : 'off') + '　C：選択を消す', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('ふつうの平面と同じ公理（2 点 → 1 直線、2 直線 → 1 点）を満たす、点が有限個の世界。符号理論・実験計画・ゲーム「ドブル」の設計に使われる', 20, 68);
}

// 直線（点の番号の組）を描く：3 点が本当に一直線ならまっすぐ、そうでなければ 3 点を通る円。4 点以上は閉じた曲線
function drawLineSet(l) {
  let ps = l.map((i) => P[i]);
  noFill();
  if (ps.length === 3) {
    let d = hDet(hPt(ps[0].x, ps[0].y), hPt(ps[1].x, ps[1].y), hPt(ps[2].x, ps[2].y));
    if (Math.abs(d) < 1e-3 * width * width) {
      let far = [0, 1, 2].map((i) => [0, 1, 2].map((j) => dist(ps[i].x, ps[i].y, ps[j].x, ps[j].y)));
      let bi = 0, bj = 1, bd = -1;
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (far[i][j] > bd) { bd = far[i][j]; bi = i; bj = j; }
      let dx = (ps[bj].x - ps[bi].x) / bd, dy = (ps[bj].y - ps[bi].y) / bd;
      line(ps[bi].x - dx * 30, ps[bi].y - dy * 30, ps[bj].x + dx * 30, ps[bj].y + dy * 30);
    } else {
      let cc = circumcenter(ps[0], ps[1], ps[2]);
      if (cc) circle(cc.x, cc.y, 2 * dist(cc.x, cc.y, ps[0].x, ps[0].y));
    }
  } else {
    let cx = ps.reduce((s, p) => s + p.x, 0) / ps.length, cy = ps.reduce((s, p) => s + p.y, 0) / ps.length;
    let srt = [...ps].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
    beginShape();
    let n = srt.length;
    for (let i = 0; i < n; i++) {   // Catmull-Rom スプラインで閉じた曲線に
      let p0 = srt[(i + n - 1) % n], p1 = srt[i], p2 = srt[(i + 1) % n], p3 = srt[(i + 2) % n];
      for (let k = 0; k < 10; k++) {
        let t = k / 10, t2 = t * t, t3 = t2 * t;
        vertex(0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
               0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3));
      }
    }
    endShape(CLOSE);
  }
}
function circumcenter(a, b, c) {
  let d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return null;
  let a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  return { x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d, y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d };
}

function mousePressed() {
  let i = nearestHandle(P, mouseX, mouseY, 26);
  if (i < 0) { sel = []; return; }
  if (sel.includes(i)) sel = sel.filter((k) => k !== i);
  else { if (sel.length >= 2) sel = []; sel.push(i); }
}
function keyPressed() {
  if (key === '1') { q = 2; build(); }
  if (key === '2') { q = 3; build(); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'c' || key === 'C') sel = [];
}

// ---------- やってみよう ----------
// 1. ファノ平面で 2 点を選び、共通の直線が必ず 1 本だけあることを 21 組ぜんぶ試す（表の数と一致する）
// 2. 「円」も直線と同じ資格。点 [1,1,0], [0,1,1], [1,0,1] の XOR が 0 になることを手で確かめよう
// 3. 位数 3 で、1 本の直線（4 点）に含まれない点は 9 個。それらは直線に対してどう「平行」？（平行はない：必ず交わる）
// 4. 位数 4（21 点）の平面を差集合 {0, 1, 4, 14, 16} mod 21 で作ってみよう。位数 6 の平面は存在しない（証明は 1949 年）

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
