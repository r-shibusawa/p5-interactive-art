// ============================================
// 13 複比を聴く
// 直線 l 上の 4 点を O から直線 m に射影する（04 と同じ図）。点の「位置」を音程にすると射影で音は変わるが、
//   「複比」を音程にすると射影しても同じ音 ─ 不変量は「同じ音」として聞こえる
//   スペース：l の 4 点の音 → m の 4 点の音（ちがう） → l の複比の音 と m の複比の音（同じ）
// クリックで音をスタート / スペース = 再生 / H = 複比の音を鳴らし続ける（ドラッグしながら聴く） / 点・O・直線の端をドラッグ / R = リセット
// ============================================

let la, lb, ma, mb, O;
let tt = [0.15, 0.4, 0.55, 0.85];     // ★ l 上の 4 点の位置
let handles = [], dragging = -1;
let seq = [], seqIdx = -1, nextAt = 0; // 再生中の音の列
let hum = false, humTone = null;
let baseF = 220;                       // ★ 音の基準（Hz）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
}
function resetAll() {
  la = { x: width * 0.1, y: height * 0.72 }; lb = { x: width * 0.9, y: height * 0.72 };
  ma = { x: width * 0.18, y: height * 0.42 }; mb = { x: width * 0.82, y: height * 0.22 };
  O = { x: width * 0.5, y: height * 0.1 }; tt = [0.15, 0.4, 0.55, 0.85];
}
function onL(t) { return { x: la.x + (lb.x - la.x) * t, y: la.y + (lb.y - la.y) * t }; }
// ★ 位置 → 音程：直線の端 a からの距離（px）を半音に
function posFreq(d) { return baseF * Math.pow(2, constrain(d / 300, 0, 2.5)); }
// ★ 複比 → 音程：|複比| の対数を半音に（複比が同じなら同じ音）
function crFreq(cr) { return isNaN(cr) ? baseF : baseF * Math.pow(2, constrain(Math.log2(Math.abs(cr) + 1e-6) * 0.5 + 1, 0, 3)); }

function draw() {
  background(30, 35, 11);
  if (dragging >= 0) {
    if (dragging < 4) { let vx = lb.x - la.x, vy = lb.y - la.y, L2 = vx * vx + vy * vy || 1; tt[dragging] = constrain(((mouseX - la.x) * vx + (mouseY - la.y) * vy) / L2, -0.3, 1.3); }
    else { handles[dragging].x = mouseX; handles[dragging].y = mouseY; }
  }
  let P = tt.map(onL), m = lineThrough(ma, mb), l = lineThrough(la, lb);
  let Pp = P.map((p) => hCross(lineThrough(O, p), m)), Q = Pp.map(toXY);
  let crL = crossRatioH(...P.map((p) => hPt(p.x, p.y)), hPt(la.x, la.y), hPt(lb.x, lb.y));
  let crM = crossRatioH(...Pp, hPt(ma.x, ma.y), hPt(mb.x, mb.y));
  let fL = P.map((p) => posFreq(dist(la.x, la.y, p.x, p.y)));
  let fM = Q.map((q) => (q ? posFreq(dist(ma.x, ma.y, q.x, q.y)) : baseF * 8));

  // 再生
  if (seqIdx >= 0 && millis() >= nextAt) {
    if (seqIdx < seq.length) { playTone(seq[seqIdx].f, seq[seqIdx].dur); nextAt = millis() + seq[seqIdx].dur * 1000 + 80; seqIdx++; }
    else seqIdx = -1;
  }
  if (hum && audioCtx) { if (!humTone) humTone = startTone(crFreq(crL), 0.12, 'triangle'); humTone.o.frequency.setTargetAtTime(crFreq(crL), audioCtx.currentTime, 0.03); }
  else if (humTone) { stopTone(humTone); humTone = null; }

  // 図
  stroke(200, 60, 95, 70); strokeWeight(2); drawHLine(l);
  stroke(15, 75, 95, 70); drawHLine(m);
  stroke(45, 80, 100, 35); strokeWeight(1);
  for (let p of P) { let d = { x: p.x - O.x, y: p.y - O.y }; line(O.x, O.y, p.x + d.x * 3, p.y + d.y * 3); }
  noStroke(); textSize(16);
  let nm = ['A', 'B', 'C', 'D'], cur = seqIdx > 0 ? seq[seqIdx - 1] : null;
  for (let i = 0; i < 4; i++) {
    let on = cur && cur.who === 'l' && cur.i === i;
    fill(200, 60, 100); circle(P[i].x, P[i].y, on ? 26 : 14); fill(0, 0, 100); text(nm[i], P[i].x - 5, P[i].y + 28);
    on = cur && cur.who === 'm' && cur.i === i;
    fill(15, 75, 100); stroke(15, 75, 100); strokeWeight(2); drawHPoint(Pp[i], on ? 26 : 14, nm[i] + "'"); noStroke();
  }
  fill(45, 90, 100); circle(O.x, O.y, 16); fill(0, 0, 100); text('O', O.x + 12, O.y - 8);
  fill(0, 0, 60); for (let h of [la, lb, ma, mb]) circle(h.x, h.y, 8);

  // 音の列（ピアノロール風）
  let bx = width - 470, by = 110, bw = 440, bh = 130;
  fill(0, 0, 100, 8); rect(bx - 16, by - 30, bw + 32, bh + 50, 10);
  fill(0, 0, 100); textSize(14); text('音程（高さ = 音の高さ）：　l 上の A B C D　　m 上の A\' B\' C\' D\'　　複比 l / m', bx, by - 8);
  let allF = [...fL.map((f, i) => ({ f, who: 'l', i })), ...fM.map((f, i) => ({ f, who: 'm', i })), { f: crFreq(crL), who: 'cr', i: 0 }, { f: crFreq(crM), who: 'cr', i: 1 }];
  for (let k = 0; k < allF.length; k++) {
    let a = allF[k], x = bx + k * 44 + (k >= 4 ? 10 : 0) + (k >= 8 ? 10 : 0), hgt = constrain(Math.log2(a.f / baseF) / 3, 0, 1) * bh;
    let on = cur && cur.who === a.who && cur.i === a.i;
    fill(a.who === 'l' ? 200 : a.who === 'm' ? 15 : 45, 70, on ? 100 : 70); rect(x, by + bh - hgt, 32, hgt, 4);
    fill(0, 0, 100); textSize(11); text(nf(a.f, 1, 0), x, by + bh + 14);
  }

  fill(0, 0, 100); textSize(18);
  text((audioCtx ? '♪ ' : 'クリックで音をスタート　') + 'スペース：再生　H：複比の音 ' + (hum ? 'ON' : 'off') + '　　複比 l = ' + fmt(crL) + '　m = ' + fmt(crM) + '　→ 音 ' + nf(crFreq(crL), 1, 0) + ' Hz / ' + nf(crFreq(crM), 1, 0) + ' Hz（同じ）', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('点・O・直線の端をドラッグ。位置の音（青・赤）は射影で変わる、複比の音（黄）は変わらない。H を ON にして D を動かすと音程がなめらかに変わる', 20, 68);
}
function fmt(v) { return isNaN(v) ? '—' : Math.abs(v) > 1e4 ? '∞' : nf(v, 1, 3); }

function mousePressed() {
  startAudio();
  handles = [...tt.map(onL), O, la, lb, ma, mb];
  dragging = nearestHandle(handles, mouseX, mouseY, 26);
}
function mouseReleased() { dragging = -1; }
function keyPressed() {
  startAudio();
  if (key === ' ') {
    let P = tt.map(onL), m = lineThrough(ma, mb);
    let Pp = P.map((p) => hCross(lineThrough(O, p), m)), Q = Pp.map(toXY);
    let crL = crossRatioH(...P.map((p) => hPt(p.x, p.y)), hPt(la.x, la.y), hPt(lb.x, lb.y));
    let crM = crossRatioH(...Pp, hPt(ma.x, ma.y), hPt(mb.x, mb.y));
    seq = [];
    for (let i = 0; i < 4; i++) seq.push({ f: posFreq(dist(la.x, la.y, P[i].x, P[i].y)), dur: 0.25, who: 'l', i });
    for (let i = 0; i < 4; i++) seq.push({ f: Q[i] ? posFreq(dist(ma.x, ma.y, Q[i].x, Q[i].y)) : baseF * 8, dur: 0.25, who: 'm', i });
    seq.push({ f: crFreq(crL), dur: 0.6, who: 'cr', i: 0 }); seq.push({ f: crFreq(crM), dur: 0.6, who: 'cr', i: 1 });
    seqIdx = 0; nextAt = millis() + 300;
  }
  if (key === 'h' || key === 'H') hum = !hum;
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. O を動かすと青の音は変わらず赤の音だけ変わる。黄は両方変わらない。なぜ青は変わらない？
// 2. crFreq を「複比そのもの × 100 Hz」に変えてみる。複比が負のときはどうする？
// 3. 4 点の順番を変えた複比（1−λ, 1/λ…）を和音にして鳴らす（6 種類の値）
// 4. 調和列点（複比 −1、09）のとき決まった音が鳴る「調和アラーム」を作ろう

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

// ==================================================
// ここから下は「音を鳴らすための道具」（Web Audio）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createGain(); masterOut.gain.value = 0.5;
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 1 音を鳴らす（周波数 f Hz、長さ dur 秒）
function playTone(f, dur) {
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
  o.type = 'triangle'; o.frequency.value = constrain(f, 40, 4000);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterOut); o.start(t); o.stop(t + dur + 0.05);
}
// 鳴らしっぱなしの音
function startTone(f, vol, type) {
  if (!audioCtx) return null;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'sine'; o.frequency.value = constrain(f, 40, 4000);
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(vol, audioCtx.currentTime + 0.05);
  o.connect(g); g.connect(masterOut); o.start();
  return { o, g };
}
function stopTone(t) {
  if (!t) return;
  t.g.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.05);
  t.o.stop(audioCtx.currentTime + 0.3);
}
