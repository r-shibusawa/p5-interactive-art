// ============================================
// 12 毛玉の定理（3D）
// 球に生えた毛を、どうとかしても（連続な向きのそろえ方 ＝ ベクトル場）必ずどこかに「つむじ」（向きが決まらない点）ができる
//   ドーナツ（トーラス）なら、つむじなしで全部とかせる。つむじの「回り方の数」（指数）の合計 ＝ オイラー標数（球 2、トーラス 0）
// 1 = 東向きの風 / 2 = 北から南へ / 3 = つむじ 1 つ / 4 = ランダムにとかす（もう一度押すと別の向き） / T = トーラス / スペース = 流れる粒 / ドラッグ = 視点
// ============================================

let fieldNo = 1, onTorus = false;
let hairs = [];              // 球の上の点
let nHair = 900;             // ★ 毛の本数
let hairLen = 0.16;          // ★ 毛の長さ（半径 = 1）
let phases = [];
let zeros = [];
let parts = [], flow = true;
let rotX = -0.4, rotY = 0;
let hud, Rs;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hud = createGraphics(width, height);
  Rs = min(width, height) * 0.3;
  let ga = Math.PI * (3 - Math.sqrt(5));     // フィボナッチ球面：ほぼ等間隔の点
  for (let i = 0; i < nHair; i++) {
    let y = 1 - (2 * (i + 0.5)) / nHair, r = Math.sqrt(1 - y * y), a = i * ga;
    hairs.push([r * Math.cos(a), y, r * Math.sin(a)]);
  }
  randomPhases(); findZeros(); resetParts();
}
function randomPhases() { phases = []; for (let i = 0; i < 9; i++) phases.push(Math.random() * 6.283); }

// ★ 球面上のベクトル場：点 p（|p| = 1）での毛の向き（接ベクトル）
function field(p) {
  let [x, y, z] = p;
  if (fieldNo === 1) return [z, 0, -x];                         // 縦軸のまわりに回る風
  if (fieldNo === 2) return tangent(p, [0, 1, 0]);             // 上（北）から下（南）へ
  if (fieldNo === 3) {                                          // 平面の一様な流れを球にのせる（下の極の 1 点だけがつむじ）
    let k = 1 + y, X = x / (k || 1e-9), Z = z / (k || 1e-9), r2 = X * X + Z * Z, d = (1 + r2) * (1 + r2);
    if (k < 1e-6) return [0, 0, 0];
    return [(2 * (1 + r2 - 2 * X * X)) / d, (-4 * X) / d, (-4 * X * Z) / d].map((v) => v * 2);
  }
  let ph = phases;                                              // なめらかなランダムの風を球に射影
  let F = [Math.sin(2 * y + ph[0]) + Math.sin(3 * z + ph[1]) + 0.6 * Math.cos(x + ph[2]),
           Math.sin(2 * z + ph[3]) + Math.sin(3 * x + ph[4]) + 0.6 * Math.cos(y + ph[5]),
           Math.sin(2 * x + ph[6]) + Math.sin(3 * y + ph[7]) + 0.6 * Math.cos(z + ph[8])];
  return tangent(p, F);
}
function tangent(p, F) { let d = F[0] * p[0] + F[1] * p[1] + F[2] * p[2]; return [F[0] - d * p[0], F[1] - d * p[1], F[2] - d * p[2]]; }

// つむじ（|v| がとても小さい所）を探し、まわりを 1 周したときの毛の回転数（指数）を数える
function findZeros() {
  zeros = [];
  if (onTorus) return;
  let NA = 36, NB = 72, mag = [], P = [], vmax = 0;
  for (let i = 0; i <= NA; i++) { mag.push([]); P.push([]); for (let j = 0; j < NB; j++) {
    let th = (i / NA) * Math.PI, ph = (j / NB) * 2 * Math.PI, p = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
    let m = Math.hypot(...field(p)); mag[i].push(m); P[i].push(p); vmax = Math.max(vmax, m);
  } }
  for (let i = 0; i <= NA; i++) for (let j = 0; j < NB; j++) {
    let m = mag[i][j], isMin = m < vmax * 0.1;
    for (let di = -1; di <= 1 && isMin; di++) for (let dj = -1; dj <= 1; dj++) {
      let ii = i + di; if (ii < 0 || ii > NA || (di === 0 && dj === 0)) continue;
      if (mag[ii][(j + dj + NB) % NB] < m) { isMin = false; break; }
    }
    if (!isMin) continue;
    let p = P[i][j];
    if (zeros.some((z) => Math.hypot(z.p[0] - p[0], z.p[1] - p[1], z.p[2] - p[2]) < 0.3)) continue;
    let idx = indexAt(p);
    if (idx !== 0) zeros.push({ p, idx });   // 指数 0 は「弱いだけの所」なので除く
  }
}
function indexAt(p0) {
  let e1 = normalize3(cross3(p0, Math.abs(p0[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), e2 = cross3(p0, e1), sum = 0, prev = null;
  for (let k = 0; k <= 64; k++) {
    let t = (k / 64) * 2 * Math.PI, q = normalize3(p0.map((x, i) => x + 0.2 * (Math.cos(t) * e1[i] + Math.sin(t) * e2[i])));
    let v = field(q), a = Math.atan2(dot3(v, e2), dot3(v, e1));
    if (prev !== null) { let d = a - prev; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; sum += d; }
    prev = a;
  }
  return Math.round(sum / (2 * Math.PI));
}

// トーラス上の点と、ぐるっと回る向きの場（つむじなし）
function torusPt(u, v) { return [(1 + 0.4 * Math.cos(v)) * Math.cos(u), 0.4 * Math.sin(v), (1 + 0.4 * Math.cos(v)) * Math.sin(u)]; }

function resetParts() { parts = []; for (let i = 0; i < 160; i++) parts.push({ u: Math.random() * 6.283, v: Math.random() * 6.283, p: hairs[floor(Math.random() * nHair)].slice(), life: Math.random() * 200 }); }

function draw() {
  background(16, 20, 26);
  if (mouseIsPressed) { rotY += movedX * 0.01; rotX = constrain(rotX - movedY * 0.01, -1.5, 1.5); } else rotY += 0.003;
  push();
  rotateX(rotX); rotateY(rotY);
  ambientLight(100); directionalLight(255, 255, 255, 0.3, 0.6, -0.7);
  noStroke(); fill(70, 60, 90);
  if (onTorus) drawTorusHair(); else {
    sphere(Rs * 0.99, 32, 24);
    let vmax = 0, vs = hairs.map((p) => { let v = field(p), m = Math.hypot(...v); vmax = Math.max(vmax, m); return v; });
    strokeWeight(2);
    beginShape(LINES);
    hairs.forEach((p, i) => {
      let v = vs[i], m = Math.hypot(...v), s = Math.min(1, (m / vmax) * 2.5), L = (hairLen * s) / (m || 1);
      stroke(255, 120 + 120 * s, 60 + 100 * (1 - s));
      vertex(p[0] * Rs, p[1] * Rs, p[2] * Rs);
      vertex((p[0] * 1.04 + v[0] * L) * Rs, (p[1] * 1.04 + v[1] * L) * Rs, (p[2] * 1.04 + v[2] * L) * Rs);
    });
    endShape();
    // 流れる粒
    if (flow) { strokeWeight(6); stroke(120, 230, 255); beginShape(POINTS);
      for (let q of parts) {
        let v = field(q.p), m = Math.hypot(...v) || 1;
        q.p = normalize3(q.p.map((x, i) => x + (v[i] / m) * 0.012 * Math.min(1, (m / vmax) * 3)));
        if (--q.life < 0) { q.p = hairs[floor(Math.random() * nHair)].slice(); q.life = 200; }
        vertex(q.p[0] * Rs * 1.05, q.p[1] * Rs * 1.05, q.p[2] * Rs * 1.05);
      }
      endShape(); }
    noStroke(); fill(255, 60, 60);
    for (let z of zeros) { push(); translate(z.p[0] * Rs * 1.03, z.p[1] * Rs * 1.03, z.p[2] * Rs * 1.03); sphere(10); pop(); }
  }
  pop();
  drawHud();
  drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT);
  image(hud, -width / 2, -height / 2);
}

function drawTorusHair() {
  let S = Rs * 0.85;
  push(); rotateX(HALF_PI); torus(S, S * 0.4 * 0.98, 48, 24); pop();
  strokeWeight(2); stroke(255, 220, 120);
  beginShape(LINES);
  for (let i = 0; i < 64; i++) for (let j = 0; j < 16; j++) {
    let u = (i / 64) * 2 * Math.PI, v = (j / 16) * 2 * Math.PI, a = torusPt(u, v), b = torusPt(u + 0.1, v);
    let n = [Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u)];
    vertex(...a.map((x, k) => (x + n[k] * 0.02) * S)); vertex(...b.map((x, k) => (x + n[k] * 0.06) * S));
  }
  endShape();
  if (flow) { strokeWeight(6); stroke(120, 230, 255); beginShape(POINTS);
    for (let q of parts) { q.u += 0.01; q.v += 0.002; let a = torusPt(q.u, q.v), n = [Math.cos(q.v) * Math.cos(q.u), Math.sin(q.v), Math.cos(q.v) * Math.sin(q.u)]; vertex(...a.map((x, k) => (x + n[k] * 0.05) * S)); }
    endShape(); }
}

function drawHud() {
  hud.clear(); hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('1：東向きの風　2：北から南へ　3：つむじ 1 つ　4：ランダム（もう一度で別の向き）　T：トーラス　スペース：流れる粒　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('毛の長さ = 流れの強さ。短くて暗い所 = つむじ（赤い玉）。トーラスでは東西方向にそろえれば全部とかせる', 20, 68);
  let y0 = height - 120;
  hud.fill(255, 230, 120); hud.textSize(26);
  if (onTorus) { hud.text('トーラス：つむじ 0 個（χ = 0）', 20, y0); }
  else {
    let sum = zeros.reduce((a, z) => a + z.idx, 0);
    hud.text('球面：つむじ ' + zeros.length + ' 個　指数 ' + zeros.map((z) => (z.idx > 0 ? '+' : '') + z.idx).join(', ') + '　合計 ' + sum, 20, y0);
    hud.fill(255); hud.textSize(17);
    hud.text('どの場でも指数の合計は 2 ＝ 球のオイラー標数 χ（ポアンカレ・ホップの定理）。だから 0 個にはできない', 20, y0 + 36);
  }
  hud.fill(170); hud.textSize(15);
  hud.text('地球の風：どこかに必ず無風の点（台風の目のような所）がある。つむじが 1 つしかない髪型は 3 のタイプ', 20, y0 + 66);
}

function keyPressed() {
  if ('1234'.includes(key) && key.length === 1) { if (key === '4' && fieldNo === 4) randomPhases(); fieldNo = int(key); onTorus = false; findZeros(); }
  if (key === 't' || key === 'T') { onTorus = !onTorus; findZeros(); }
  if (key === ' ') flow = !flow;
}

// ---------- やってみよう ----------
// 1. 4 を何回も押して、つむじの数と指数を記録しよう。合計はいつも 2？
// 2. field() に自分の場（たとえば [y, -x, 0] を tangent で球にのせる）を足して、つむじを探そう
// 3. つむじ 1 つ（3）の指数は +2。毛の流れをよく見て、1 周で毛が何回まわるか数えよう
// 4. トーラスに「穴のまわりを回る」場（v の向き）を足すと、斜めにとかせる。torusPt を使って描いてみよう


// ==================================================
// ここから下は「3 次元ベクトルの道具」
// ==================================================
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function normalize3(a) { let m = Math.hypot(...a) || 1; return a.map((x) => x / m); }
