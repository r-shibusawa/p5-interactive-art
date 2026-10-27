// ============================================
// 09 ナイキスト線図と安定余裕
// 開ループ L(jω) を ω = 0 → ∞ で複素平面に描く。曲線が −1 の点を囲まなければ閉ループは安定
//   ゲイン余裕 GM：位相が −180° のとき、あと何倍ゲインを上げると −1 に届くか（dB）
//   位相余裕 PM：ゲインが 1 のとき、あと何度遅れると −1 に届くか（度）
// 左右キー = K / 1〜2 でプラント / 右はステップ応答
// ============================================

let plant = 1;
let K = 10; // ★ ループゲイン
let num = [1], den = [1];
let curve = [], GM = Infinity, PM = Infinity, wGM = 0, wPM = 0;
let stepResp = [], stable = true;
let names = ['', 'L = K/((s+1)(s+2)(s+3))', 'L = K/(s(s+1)(s+2))'];
let px, py, pw, pH, range = 2.5;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makePlant();
}

function makePlant() {
  if (plant === 1) { num = [1]; den = polyMul([1, 1], polyMul([2, 1], [3, 1])); }
  else { num = [1]; den = polyMul([0, 1], polyMul([1, 1], [2, 1])); }
  updateK();
}

function updateK() {
  // ★ ω を対数で動かして L(jω) を集める
  curve = []; GM = Infinity; PM = Infinity; wGM = 0; wPM = 0;
  let prevPh = null, prevMag = null, prevW = 0;
  for (let i = 0; i <= 600; i++) {
    let w = pow(10, map(i, 0, 600, -2, 3));
    let L = evalTF(polyScale(num, K), den, w);
    let mag = cabs(L), ph = degrees(atan2(L[1], L[0]));
    if (prevPh !== null) { while (ph - prevPh > 180) ph -= 360; while (ph - prevPh < -180) ph += 360; }
    else if (ph > 0) ph -= 360;
    curve.push({ w, re: L[0], im: L[1], mag, ph });
    // 位相 −180° を横切る ω → ゲイン余裕
    if (prevPh !== null && prevPh > -180 && ph <= -180 && wGM === 0) { wGM = w; GM = -20 * Math.log10(max(mag, 1e-12)); }
    // ゲイン 1 を横切る ω → 位相余裕
    if (prevMag !== null && prevMag > 1 && mag <= 1 && wPM === 0) { wPM = w; PM = 180 + ph; }
    prevPh = ph; prevMag = mag; prevW = w;
  }
  let charPoly = polyAdd(den, polyScale(num, K));
  stable = GM > 0 && PM > 0;
  stepResp = stepResponse(polyScale(num, K), charPoly, 10);
}

function draw() {
  background(230, 30, 10);
  px = width * 0.05; py = height * 0.16; pw = width * 0.42; pH = height * 0.7;
  // ---- 複素平面
  noStroke(); fill(0, 0, 14); rect(px, py, pw, pH, 6);
  stroke(0, 0, 30); strokeWeight(1);
  line(nx(0), py, nx(0), py + pH); line(px, ny(0), px + pw, ny(0));
  noFill(); stroke(0, 0, 40); circle(nx(0), ny(0), 2 * (nx(1) - nx(0))); // 単位円
  // 曲線（ω > 0 を実線、ω < 0 を鏡写しの点線）
  for (let pass = 0; pass < 2; pass++) {
    stroke(200, 70, 100, pass === 0 ? 100 : 35); strokeWeight(pass === 0 ? 2.5 : 1.5); noFill();
    beginShape();
    for (let c of curve) {
      let re = constrain(c.re, -range * 3, range * 3), im = constrain(pass === 0 ? c.im : -c.im, -range * 3, range * 3);
      vertex(nx(re), ny(im));
    }
    endShape();
  }
  // 向きの矢印（ω が増える向き）
  let mid = curve[floor(curve.length * 0.4)];
  noStroke(); fill(200, 70, 100); if (mid) circle(nx(constrain(mid.re, -range * 3, range * 3)), ny(constrain(mid.im, -range * 3, range * 3)), 8);
  // −1 の点
  stroke(0, 80, 100); strokeWeight(3);
  line(nx(-1) - 8, ny(0) - 8, nx(-1) + 8, ny(0) + 8); line(nx(-1) - 8, ny(0) + 8, nx(-1) + 8, ny(0) - 8);
  noStroke(); fill(0, 80, 100); textSize(14); text('−1', nx(-1) - 10, ny(0) + 24);
  // 余裕の印
  if (wGM > 0) {
    let c = curve.find((q) => q.w >= wGM);
    stroke(45, 90, 100); strokeWeight(3); line(nx(-1), ny(0), nx(c.re), ny(0));
    noStroke(); fill(45, 90, 100); circle(nx(c.re), ny(0), 10);
    text('GM', nx(c.re) + 8, ny(0) - 10);
  }
  if (wPM > 0) {
    let c = curve.find((q) => q.w >= wPM);
    stroke(300, 60, 100); strokeWeight(2); line(nx(0), ny(0), nx(c.re), ny(c.im));
    noStroke(); fill(300, 60, 100); circle(nx(c.re), ny(c.im), 10);
    text('PM', nx(c.re) + 8, ny(c.im) + 18);
  }
  noStroke(); fill(0, 0, 70); textSize(13);
  text('ナイキスト線図 L(jω)　実線 ω > 0、点線 ω < 0　灰色の円 = |L| = 1', px + 8, py + 18);

  // ---- ステップ応答
  let gx = width * 0.52, gy = height * 0.2, gw = width * 0.44, gh = height * 0.4;
  let peakAbs = 2;
  for (let v of stepResp) peakAbs = max(peakAbs, abs(v));
  peakAbs = min(peakAbs, 20);
  noStroke(); fill(0, 0, 14); rect(gx, gy, gw, gh, 6);
  stroke(0, 0, 30); strokeWeight(1);
  line(gx, map(0, -peakAbs, peakAbs, gy + gh, gy), gx + gw, map(0, -peakAbs, peakAbs, gy + gh, gy));
  stroke(45, 90, 100, 60); line(gx, map(1, -peakAbs, peakAbs, gy + gh, gy), gx + gw, map(1, -peakAbs, peakAbs, gy + gh, gy));
  stroke(stable ? 120 : 0, 80, 100); strokeWeight(2.5); noFill();
  beginShape();
  for (let i = 0; i < stepResp.length; i++) vertex(map(i, 0, stepResp.length - 1, gx, gx + gw), map(constrain(stepResp[i], -peakAbs, peakAbs), -peakAbs, peakAbs, gy + gh, gy));
  endShape();
  noStroke(); fill(0, 0, 70); textSize(13);
  text('閉ループのステップ応答（0〜10 秒）　縦 ±' + nf(peakAbs, 1, 1), gx + 8, gy + 18);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('K = ' + nf(K, 1, 2) + '（左右キー）　' + names[plant] + '（1〜2）　' + (stable ? '安定' : '不安定！'), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('ゲイン余裕 GM = ' + (isFinite(GM) ? nf(GM, 1, 1) + ' dB（ω = ' + nf(wGM, 1, 2) + '）' : '∞') + '　位相余裕 PM = ' + (isFinite(PM) ? nf(PM, 1, 1) + '°（ω = ' + nf(wPM, 1, 2) + '）' : '∞') + '　目安：GM > 6 dB、PM > 30〜60° なら安心', 20, 68);
  fill(0, 0, 60);
  text('余裕が小さいほどステップ応答はゆれる。モデルのずれ（遅れ・ゲインの誤差）に耐えられる「のりしろ」が安定余裕', gx, gy + gh + 30);
  text('−1 を囲む = 開ループが安定なら、閉ループは不安定（ナイキストの安定判別）。07 のボード線図と同じ情報を 1 枚の絵で', gx, gy + gh + 54);
}

function nx(re) { return map(re, -range, range, px, px + pw); }
function ny(im) { return map(im, -range * (pH / pw), range * (pH / pw), py + pH, py); }

function keyPressed() {
  if (key === RIGHT_ARROW) { K = min(K * 1.15, 500); updateK(); }
  if (key === LEFT_ARROW) { K = max(K / 1.15, 0.1); updateK(); }
  if (key === '1' || key === '2') { plant = int(key); makePlant(); }
}

// ---------- やってみよう ----------
// 1. K を上げて GM が 0 dB になる瞬間（K ≈ 60）、曲線が −1 を通る。ステップ応答はどうなっている？
// 2. PM が 60° くらいになる K を探す。応答はゆれる？ 30° では？
// 3. プラント 2（積分器）は ω → 0 で曲線が無限遠へ。K = 6 で限界になることを確かめる
// 4. 自分で den に (0.1s + 1) をかける（小さな遅れを追加）。余裕はどれだけ減る？


// ==================================================
// ここから下は「複素数・多項式・応答の道具」です
// ==================================================
function cmul(a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }
function cdiv(a, b) { let d = b[0] * b[0] + b[1] * b[1] + 1e-30; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }
function cabs(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1]); }
function polyMul(a, b) {
  let out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return out;
}
function polyAdd(a, b) { let out = []; for (let i = 0; i < max(a.length, b.length); i++) out.push((a[i] || 0) + (b[i] || 0)); return out; }
function polyScale(a, k) { return a.map((v) => v * k); }
function polyEvalC(c, s) {
  let acc = [0, 0];
  for (let i = c.length - 1; i >= 0; i--) acc = [cmul(acc, s)[0] + c[i], cmul(acc, s)[1]];
  return acc;
}
function evalTF(num, den, w) { return cdiv(polyEvalC(num, [0, w]), polyEvalC(den, [0, w])); }
// ステップ応答：伝達関数 b(s)/a(s)（可制御正準形で積分、T 秒）
function stepResponse(b, a, T) {
  let n = a.length - 1, an = a[n];
  let z = new Array(n).fill(0), out = [];
  let h = 0.002, steps = round(T / h), every = max(1, floor(steps / 500));
  for (let k = 0; k < steps; k++) {
    let top = 1;
    for (let i = 0; i < n; i++) top -= a[i] * z[i];
    top /= an;
    for (let i = 0; i < n - 1; i++) z[i] += z[i + 1] * h;
    z[n - 1] += top * h;
    let y = 0;
    for (let i = 0; i < n && i < b.length; i++) y += b[i] * z[i];
    for (let i = 0; i < n; i++) z[i] = constrain(z[i], -1e6, 1e6);
    if (k % every === 0) out.push(constrain(y, -1e6, 1e6));
  }
  return out;
}
