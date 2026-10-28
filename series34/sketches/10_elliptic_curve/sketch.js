// ============================================
// 10 楕円曲線暗号
// 左：実数の楕円曲線 y² = x³ + ax + b。2 点 P, Q を通る直線が曲線と交わる 3 つ目の点を上下反転 → P + Q
// 右：同じ「足し算」を mod p の世界（有限体）でやると点がバラバラに散らばる。
//     k·G（G を k 回足す）は速く計算できるが、k·G から k を求めるのは難しい → 鍵共有（ECDH）に使える
// クリック = 点 P を置く（マウスが Q）/ ↑↓ = a / ←→ = b / 1〜3 = 素数 p / スペース = k·G のアニメ / N = 秘密を選び直す
// ※ 教育用（実際は 256 ビットの p を使う）
// ============================================

let ca = -1, cb = 1;              // ★ 実数の曲線の係数
let Px = -1.2, Psign = 1;         // 点 P（x 座標と上下）
const PS = [31, 97, 251];         // ★ 有限体の素数 p
let pIdx = 1, FA = 2, FB = 3;     // 有限体の曲線 y² = x³ + 2x + 3 (mod p)
let fpPoints = [], G = null, orderG = 0, multiples = [], kShow = 1, anim = true;
let alice = 0, bob = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  buildField();
}

// ---- 実数の曲線：座標変換
function fx(x) { return x * x * x + ca * x + cb; }
function toScreen(x, y, r) { return [r.x + r.w / 2 + x * r.w / 7, r.y + r.h / 2 - y * r.h / 9]; }

function draw() {
  background(14, 16, 26);
  noStroke();
  fill(240);
  textSize(18);
  text('楕円曲線　クリック P・マウス Q　↑↓ a = ' + nf(ca, 1, 2) + '　←→ b = ' + nf(cb, 1, 2) + '　｜　1〜3 p = ' + PS[pIdx] + '　スペース k·G　N 秘密', 24, 34);
  fill(150);
  textSize(14);
  text('教育用：小さな p なので k·G から k は総当たりですぐ分かる', 24, 56);

  // ================= 左：実数 =================
  let L = { x: 20, y: 80, w: width * 0.46, h: height - 110 };
  fill(22, 26, 40);
  rect(L.x, L.y, L.w, L.h, 10);
  stroke(60, 70, 100);
  let o = toScreen(0, 0, L);
  line(L.x, o[1], L.x + L.w, o[1]);
  line(o[0], L.y, o[0], L.y + L.h);
  // 曲線（上と下の枝）
  stroke(120, 200, 255);
  strokeWeight(2.5);
  noFill();
  for (let sgn of [1, -1]) {
    let prev = null;
    for (let i = 0; i <= 700; i++) {
      let x = -3.5 + 7 * i / 700, v = fx(x);
      if (v < 0) { prev = null; continue; }
      let s = toScreen(x, sgn * Math.sqrt(v), L);
      if (prev && abs(s[1] - prev[1]) < 200) line(prev[0], prev[1], s[0], s[1]);
      prev = s;
    }
  }
  // P と Q
  let P = curvePoint(Px, Psign);
  let qx = (mouseX - L.x - L.w / 2) / (L.w / 7), qs = mouseY < o[1] ? 1 : -1;
  let Q = curvePoint(qx, qs);
  noStroke();
  if (P && Q) {
    let R = addReal(P, Q);
    if (R) {
      let a1 = toScreen(P.x, P.y, L), r1 = toScreen(R.x, -R.y, L), r2 = toScreen(R.x, R.y, L);
      // 直線を画面いっぱいに伸ばす
      let lam = R.lam;
      let e1 = toScreen(-3.5, P.y + lam * (-3.5 - P.x), L), e2 = toScreen(3.5, P.y + lam * (3.5 - P.x), L);
      stroke(255, 200, 90, 160); strokeWeight(1.5);
      line(e1[0], e1[1], e2[0], e2[1]);
      stroke(255, 120, 200, 200);
      drawingContext.setLineDash([6, 6]);
      line(r1[0], r1[1], r2[0], r2[1]);
      drawingContext.setLineDash([]);
      noStroke();
      fill(255, 200, 90); circle(r1[0], r1[1], 10);
      fill(255, 120, 200); circle(r2[0], r2[1], 16);
      fill(255, 120, 200); textSize(16); text('P + Q', r2[0] + 10, r2[1] - 8);
      fill(170); textSize(13); text('3 つ目の交点', r1[0] + 10, r1[1] + 16);
    }
  }
  if (P) { let s = toScreen(P.x, P.y, L); fill(120, 230, 150); circle(s[0], s[1], 14); textSize(16); text('P', s[0] + 10, s[1] - 8); }
  if (Q) { let s = toScreen(Q.x, Q.y, L); fill(255, 255, 255); circle(s[0], s[1], 12); textSize(16); text('Q', s[0] + 10, s[1] - 8); }
  fill(200);
  textSize(15);
  text('y² = x³ ' + (ca < 0 ? '− ' : '+ ') + nf(abs(ca), 1, 2) + 'x ' + (cb < 0 ? '− ' : '+ ') + nf(abs(cb), 1, 2), L.x + 14, L.y + 24);
  if (4 * ca * ca * ca + 27 * cb * cb === 0) { fill(255, 110, 110); text('とがった点がある（特異）→ 暗号には使えない', L.x + 14, L.y + 46); }

  // ================= 右：mod p =================
  if (anim && frameCount % 20 === 0) kShow = kShow % orderG + 1;
  let p = PS[pIdx];
  let Rr = { x: width * 0.5, y: 80, w: width * 0.48, h: height * 0.62 };
  fill(22, 26, 40);
  rect(Rr.x, Rr.y, Rr.w, Rr.h, 10);
  let cs = min((Rr.w - 30) / p, (Rr.h - 30) / p);
  let gx = (x) => Rr.x + 15 + x * cs + cs / 2, gy = (y) => Rr.y + Rr.h - 15 - y * cs - cs / 2;
  fill(110, 130, 180);
  for (let q of fpPoints) circle(gx(q.x), gy(q.y), max(3, cs * 0.6));
  // k·G の軌跡
  stroke(255, 200, 90, 120);
  strokeWeight(1);
  for (let k = 1; k < kShow && k < multiples.length; k++) {
    let a1 = multiples[k - 1], b1 = multiples[k];
    if (a1 && b1) line(gx(a1.x), gy(a1.y), gx(b1.x), gy(b1.y));
  }
  noStroke();
  let cur = multiples[kShow - 1];
  if (cur) { fill(255, 200, 90); circle(gx(cur.x), gy(cur.y), max(8, cs * 1.4)); }
  fill(120, 230, 150); circle(gx(G.x), gy(G.y), max(8, cs * 1.2));
  let A = multiples[alice - 1], B = multiples[bob - 1], S = multiples[(alice * bob) % orderG - 1];
  if (A) { fill(255, 140, 160); circle(gx(A.x), gy(A.y), max(10, cs * 1.5)); }
  if (B) { fill(130, 180, 255); circle(gx(B.x), gy(B.y), max(10, cs * 1.5)); }
  if (S) { noFill(); stroke(255); strokeWeight(2); circle(gx(S.x), gy(S.y), max(16, cs * 2.4)); noStroke(); }

  let ty = Rr.y + Rr.h + 28;
  fill(200);
  textSize(15);
  text('y² = x³ + 2x + 3 (mod ' + p + ')　点の数 ' + (fpPoints.length + 1) + '（無限遠点を含む）　G = (' + G.x + ', ' + G.y + ')　位数 ' + orderG, Rr.x, ty);
  fill(255, 200, 90);
  text(kShow + '·G = ' + (cur ? '(' + cur.x + ', ' + cur.y + ')' : '無限遠点 O') + '　← 規則正しく足しているのにバラバラに飛ぶ', Rr.x, ty + 26);
  fill(255, 140, 160);
  text('アリス 秘密 a = ' + alice + '　公開 A = a·G = ' + ptStr(A), Rr.x, ty + 56);
  fill(130, 180, 255);
  text('ボブ　 秘密 b = ' + bob + '　公開 B = b·G = ' + ptStr(B), Rr.x, ty + 80);
  fill(240);
  text('共有：a·B = b·A = (ab)·G = ' + ptStr(S) + '（白い丸）', Rr.x, ty + 106);
}

function ptStr(q) { return q ? '(' + q.x + ', ' + q.y + ')' : 'O'; }

// 実数の曲線上の点（x で y² < 0 なら null）
function curvePoint(x, sgn) { let v = fx(x); return v < 0 ? null : { x, y: sgn * Math.sqrt(v) }; }
// ★ 実数の点の足し算（P = Q なら接線）
function addReal(P, Q) {
  let lam;
  if (abs(P.x - Q.x) < 1e-6) { if (abs(P.y + Q.y) < 1e-6) return null; lam = (3 * P.x * P.x + ca) / (2 * P.y); }
  else lam = (Q.y - P.y) / (Q.x - P.x);
  if (!isFinite(lam) || abs(lam) > 1e4) return null;
  let x3 = lam * lam - P.x - Q.x;
  return { x: x3, y: lam * (P.x - x3) - P.y, lam };
}

// ---- 有限体
function buildField() {
  let p = PS[pIdx];
  fpPoints = [];
  for (let x = 0; x < p; x++) for (let y = 0; y < p; y++) if ((y * y - (x * x * x + FA * x + FB)) % p === 0) fpPoints.push({ x, y });
  // いちばん位数の大きい点を G に
  orderG = 0;
  for (let q of fpPoints) {
    let k = 1, cur = q;
    while (cur && k < 1000) { cur = addFp(cur, q, p); k++; }
    if (k > orderG) { orderG = k; G = q; }
  }
  multiples = [G];
  for (let k = 2; k <= orderG; k++) multiples.push(addFp(multiples[k - 2], G, p));
  kShow = 1;
  newSecrets();
}
function newSecrets() { alice = 2 + floor(random(orderG - 3)); bob = 2 + floor(random(orderG - 3)); }

function mousePressed() {
  let L = { x: 20, y: 80, w: width * 0.46, h: height - 110 };
  if (mouseX > L.x && mouseX < L.x + L.w) {
    let x = (mouseX - L.x - L.w / 2) / (L.w / 7);
    if (fx(x) >= 0) { Px = x; Psign = mouseY < L.y + L.h / 2 ? 1 : -1; }
  }
}

function keyPressed() {
  if (key === UP_ARROW) ca = min(2, ca + 0.25);
  if (key === DOWN_ARROW) ca = max(-3, ca - 0.25);
  if (key === RIGHT_ARROW) cb = min(3, cb + 0.25);
  if (key === LEFT_ARROW) cb = max(-3, cb - 0.25);
  if (key === '1' || key === '2' || key === '3') { pIdx = int(key) - 1; buildField(); }
  if (key === ' ') anim = !anim;
  if (key === 'n' || key === 'N') newSecrets();
  if (fx(Px) < 0) { for (let x = -3.5; x < 3.5; x += 0.05) if (fx(x) >= 0) { Px = x; break; } }
  return false;
}

// ---------- やってみよう ----------
// 1. Q を P に近づけると直線は接線になる（P + P = 2P）。真上・真下に並べると？（無限遠点 O）
// 2. a = −3, b = 2 にすると曲線にとがった点ができる（特異）。4a³ + 27b² = 0 を確かめよう
// 3. p = 251 で k·G の軌跡を見ると、次の点が予測できない。だから k を逆算するのは難しい
// 4. 同じ安全さに必要な鍵の長さ：RSA 3072 ビット ≒ 楕円曲線 256 ビット。スマホや IC カードで使われる理由

// ==================================================
// ここから下は「道具」（mod p の点の足し算）
// ==================================================
function modP(v, p) { return ((v % p) + p) % p; }
function inv(v, p) { let r = 1, x = modP(v, p), e = p - 2; while (e > 0) { if (e & 1) r = (r * x) % p; x = (x * x) % p; e >>= 1; } return r; }
function addFp(P, Q, p) {          // null = 無限遠点 O
  if (!P) return Q; if (!Q) return P;
  let lam;
  if (P.x === Q.x) {
    if (modP(P.y + Q.y, p) === 0) return null;
    lam = modP((3 * P.x * P.x + FA) * inv(2 * P.y, p), p);
  } else lam = modP((Q.y - P.y) * inv(Q.x - P.x, p), p);
  let x3 = modP(lam * lam - P.x - Q.x, p);
  return { x: x3, y: modP(lam * (P.x - x3) - P.y, p) };
}
