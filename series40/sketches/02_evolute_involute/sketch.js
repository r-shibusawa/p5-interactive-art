// ============================================
// 02 縮閉線（evolute）と伸開線（involute）
// 縮閉線 = 曲線の各点の「曲率中心」（接触円の中心 p + N/κ）をつないだ曲線。法線たちの包絡線にもなる
// 伸開線 = 曲線に巻きつけた糸をピンと張ったままほどくとき、糸の先が描く曲線 q(s) = p(s) − (s − s0) T(s)
//   有名な例：楕円の縮閉線はアステロイド、サイクロイドの伸開線はまたサイクロイド（ホイヘンスの振り子）
// 1〜5 = 曲線（楕円・サイクロイド・円・放物線・心臓形）/ E = 縮閉線 / N = 法線の束 / I = 伸開線 / スペース = 一時停止 / ←→ = 糸をほどく速さ
// ============================================

let curveNo = 1;
let showEvolute = true, showNormals = true, showInvolute = true;
let paused = false, speed = 0.004;      // ★ 糸をほどく速さ
let SC = 1, cx, cy;                      // 画面への拡大率と中心
let samples = [], arcLen = [], s = 0, inv = [];
let names = ['楕円 → アステロイド', 'サイクロイド → サイクロイド', '円 → 円の伸開線（らせん）', '放物線 → 半立方放物線', '心臓形 → 小さい心臓形'];
let tRange = [[0, 2 * Math.PI], [0, 2 * Math.PI], [0, 2 * Math.PI], [-1.6, 1.6], [0, 2 * Math.PI]];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  setCurve(1);
}

// ★ 曲線（数学の座標、y は上向き）
function curveFn(t) {
  if (curveNo === 1) return { x: 2.2 * Math.cos(t), y: 1.2 * Math.sin(t) };
  if (curveNo === 2) return { x: t - Math.sin(t) - Math.PI, y: -(1 - Math.cos(t)) + 1 };
  if (curveNo === 3) return { x: Math.cos(t), y: Math.sin(t) };
  if (curveNo === 4) return { x: t, y: t * t - 1 };
  let r = 1 - Math.cos(t); return { x: r * Math.cos(t) + 0.8, y: r * Math.sin(t) };
}

function setCurve(no) {
  curveNo = no;
  SC = Math.min(width, height) * (no === 2 ? 0.14 : 0.16);
  cx = width * 0.5; cy = height * 0.5 + (no === 2 ? 20 : 0);
  let [t0, t1] = tRange[no - 1], n = 600;
  samples = []; arcLen = [0];
  for (let i = 0; i <= n; i++) {
    let t = t0 + ((t1 - t0) * i) / n, d = (t1 - t0) / n * 0.5;
    let p = curveFn(t), a = curveFn(t - d), b = curveFn(t + d);
    let x1 = (b.x - a.x) / (2 * d), y1 = (b.y - a.y) / (2 * d);
    let x2 = (b.x - 2 * p.x + a.x) / (d * d), y2 = (b.y - 2 * p.y + a.y) / (d * d);
    let sp = Math.hypot(x1, y1) || 1e-9;
    let kappa = (x1 * y2 - y1 * x2) / Math.pow(sp, 3);
    let T = { x: x1 / sp, y: y1 / sp }, N = { x: -T.y, y: T.x };             // 左向きの法線
    let c = Math.abs(kappa) > 1e-6 ? { x: p.x + N.x / kappa, y: p.y + N.y / kappa } : null;
    samples.push({ p, T, N, kappa, c });
    if (i > 0) { let q = samples[i - 1].p; arcLen.push(arcLen[i - 1] + Math.hypot(p.x - q.x, p.y - q.y)); }
  }
  s = 0; inv = [];
}

function toScr(p) { return { x: cx + p.x * SC, y: cy - p.y * SC }; }

function draw() {
  background(260, 25, 10);
  if (keyIsDown(LEFT_ARROW)) speed = Math.max(0.0005, speed * 0.97);
  if (keyIsDown(RIGHT_ARROW)) speed = Math.min(0.03, speed * 1.03);
  if (!paused) { s += speed; if (s > 1) { s = 0; inv = []; } }

  // 法線の束（包絡線として縮閉線が浮かび上がる）
  if (showNormals) {
    stroke(30, 80, 100, 18); strokeWeight(1);
    for (let i = 0; i < samples.length; i += 8) {
      let q = samples[i], L = 1.6;
      let a = toScr({ x: q.p.x - q.N.x * L, y: q.p.y - q.N.y * L }), b = toScr({ x: q.p.x + q.N.x * L, y: q.p.y + q.N.y * L });
      line(a.x, a.y, b.x, b.y);
    }
  }
  // 曲線
  noFill(); stroke(0, 0, 100); strokeWeight(3);
  beginShape(); for (let q of samples) { let v = toScr(q.p); vertex(v.x, v.y); } endShape();
  // 縮閉線（曲率中心の軌跡）
  if (showEvolute) {
    stroke(30, 90, 100); strokeWeight(2.5);
    let run = [];
    let flush = () => { if (run.length > 1) { beginShape(); for (let v of run) vertex(v.x, v.y); endShape(); } run = []; };
    for (let q of samples) { if (!q.c || Math.hypot(q.c.x, q.c.y) > 12) { flush(); continue; } run.push(toScr(q.c)); }
    flush();
  }
  // 現在の点・接触円・曲率中心
  let i = Math.min(samples.length - 1, Math.floor(s * (samples.length - 1)));
  let q = samples[i], pv = toScr(q.p);
  if (q.c && Math.hypot(q.c.x, q.c.y) < 12) {
    let cv = toScr(q.c), r = Math.abs(1 / q.kappa) * SC;
    stroke(30, 90, 100, 50); strokeWeight(1.5); noFill(); circle(cv.x, cv.y, 2 * r);
    line(pv.x, pv.y, cv.x, cv.y);
    noStroke(); fill(30, 90, 100); circle(cv.x, cv.y, 9);
  }
  // 伸開線（糸をほどく）
  if (showInvolute) {
    let L = arcLen[i];                                           // ほどけた糸の長さ = 弧長
    let tip = { x: q.p.x - q.T.x * L, y: q.p.y - q.T.y * L };
    if (!paused || inv.length === 0) inv.push(tip);
    stroke(185, 80, 100); strokeWeight(2.5); noFill();
    beginShape(); for (let v of inv) { let w = toScr(v); vertex(w.x, w.y); } endShape();
    let tv = toScr(tip);
    stroke(0, 0, 100, 70); strokeWeight(1.5); line(pv.x, pv.y, tv.x, tv.y);   // ピンと張った糸（接線）
    noStroke(); fill(185, 80, 100); circle(tv.x, tv.y, 10);
  }
  noStroke(); fill(0, 0, 100); circle(pv.x, pv.y, 11);

  fill(0, 0, 100); textSize(18);
  text('1〜5：曲線（' + names[curveNo - 1] + '）　E：縮閉線 ' + (showEvolute ? 'ON' : 'off') + '　N：法線の束 ' + (showNormals ? 'ON' : 'off') + '　I：伸開線 ' + (showInvolute ? 'ON' : 'off') + '　スペース：' + (paused ? '再開' : '一時停止') + '　←→：速さ', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('白 = 曲線　オレンジ = 縮閉線（曲率中心 p + N/κ の軌跡、法線の包絡線）　水色 = 伸開線（糸の先 q = p − s·T）　糸の長さ = ここまでの弧長 s = ' + nf(arcLen[i], 1, 2), 20, 66);
  text('κ = ' + nf(q.kappa, 1, 3) + '　曲率半径 1/|κ| = ' + (Math.abs(q.kappa) > 1e-6 ? nf(Math.abs(1 / q.kappa), 1, 3) : '∞'), 20, 92);
}

function keyPressed() {
  if (key >= '1' && key <= '5') setCurve(+key);
  if (key === 'e' || key === 'E') showEvolute = !showEvolute;
  if (key === 'n' || key === 'N') showNormals = !showNormals;
  if (key === 'i' || key === 'I') { showInvolute = !showInvolute; inv = []; }
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') { s = 0; inv = []; }
}

// ---------- やってみよう ----------
// 1. 楕円（1）の縮閉線はアステロイド（4 つの尖点）。尖点は楕円のどの点に対応する？（κ が極値をとる点）
// 2. サイクロイド（2）の伸開線が元と同じ形になることを確かめよう。これが「等時性の振り子」の仕組み
// 3. 円（3）の縮閉線は 1 点（中心）。伸開線（らせん）は歯車の歯の形に使われている。なぜ都合がいい？
// 4. curveFn に y = sin x などを足してみよう。縮閉線はどんな形？
// 5. 法線の束 N だけで縮閉線が「見える」のはなぜ？（包絡線）
