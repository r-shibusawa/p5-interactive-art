// ============================================
// 05 無限井戸の固有状態
// 幅 L の箱に閉じこめた粒子：固有関数 ψn(x) = √(2/L) sin(nπx/L)、エネルギー En = n²π²/(2L²) ∝ n²（ħ = m = 1）
//   重ね合わせ ψ(x,t) = Σ cn ψn(x) e^{−iEn t} は、エネルギーの差の速さで左右に揺れる（sloshing）
// 左の準位をクリック = 係数を 0 → 0.5 → 1 / 1〜6 = その準位だけ / G = 局在した波束（30 準位の重ね合わせ） / ↑↓ = 時間の速さ / スペース = 停止 / R = 時刻 0
// ============================================

const NM = 30;              // ★ 使う準位の数
const M = 300;              // 描く点の数
let cRe = new Float64Array(NM + 1), cIm = new Float64Array(NM + 1);
let basis = [];             // basis[n][i] = ψn(xi)（L = 1）
let w1 = 0.5;               // ★ E1 を「1 秒あたりの角度」で（画面の時間の速さ）
let speed = 1, t = 0, running = true;
let xTrace = [];
let pRe = new Float64Array(M), pIm = new Float64Array(M);

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let n = 0; n <= NM; n++) {
    basis[n] = new Float64Array(M);
    for (let i = 0; i < M; i++) basis[n][i] = n === 0 ? 0 : Math.SQRT2 * sin((n * PI * i) / (M - 1));
  }
  cRe[1] = 1; cRe[2] = 1;
  normalizeC();
}

function normalizeC() {
  let s = 0;
  for (let n = 1; n <= NM; n++) s += cRe[n] * cRe[n] + cIm[n] * cIm[n];
  if (s < 1e-12) { cRe[1] = 1; s = 1; }
  for (let n = 1; n <= NM; n++) { cRe[n] /= sqrt(s); cIm[n] /= sqrt(s); }
  t = 0; xTrace = [];
}

// ★ ガウス波束を固有関数で展開：cn = ∫ ψn(x) g(x) dx
function gaussPacket() {
  let x0 = 0.3, s = 0.05, k = 20;
  for (let n = 1; n <= NM; n++) {
    let a = 0, b = 0;
    for (let i = 0; i < M; i++) {
      let x = i / (M - 1), g = exp(-sq(x - x0) / (4 * s * s));
      a += basis[n][i] * g * cos(k * x); b += basis[n][i] * g * sin(k * x);
    }
    cRe[n] = a; cIm[n] = b;
  }
  normalizeC();
}

function draw() {
  background(200, 30, 10);
  if (running) t += (deltaTime / 1000) * speed;

  // ψ(x, t) = Σ cn ψn(x) e^{−i n² w1 t}
  pRe.fill(0); pIm.fill(0);
  for (let n = 1; n <= NM; n++) {
    if (cRe[n] === 0 && cIm[n] === 0) continue;
    let th = -n * n * w1 * t, c = cos(th), s = sin(th);
    let ar = cRe[n] * c - cIm[n] * s, ai = cRe[n] * s + cIm[n] * c;
    let bn = basis[n];
    for (let i = 0; i < M; i++) { pRe[i] += ar * bn[i]; pIm[i] += ai * bn[i]; }
  }
  let mx = 0, pmax = 0, pr = [];
  for (let i = 0; i < M; i++) { let p = pRe[i] * pRe[i] + pIm[i] * pIm[i]; pr.push(p); mx += (i / (M - 1)) * p / (M - 1); pmax = max(pmax, p); }
  if (running) { xTrace.push(mx); if (xTrace.length > 600) xTrace.shift(); }

  // --- 左：エネルギー準位 ---
  let lx = 40, lw = 240, lb = height - 60, eU = (height - 240) / 36;
  stroke(0, 0, 60); strokeWeight(2); line(lx, lb, lx, 120); line(lx + lw, lb, lx + lw, 120); line(lx, lb, lx + lw, lb);
  for (let n = 1; n <= 6; n++) {
    let y = lb - n * n * eU, a2 = cRe[n] * cRe[n] + cIm[n] * cIm[n];
    stroke(0, 0, 100, 30); strokeWeight(1); line(lx, y, lx + lw, y);
    noFill(); stroke(n * 50, 70, 100, 40 + a2 * 60); strokeWeight(2);
    beginShape(); for (let i = 0; i < M; i += 6) vertex(lx + (i / (M - 1)) * lw, y - basis[n][i] * 12); endShape();
    noStroke(); fill(n * 50, 70, 100); circle(lx + lw + 26, y, 6 + a2 * 30);
    fill(0, 0, 80); textSize(13); text('n=' + n + '  E=' + n * n + 'E1', lx + lw + 46, y + 5);
  }
  noStroke(); fill(0, 0, 70); textSize(14); text('準位をクリック（丸 = |cn|²）', lx, 110);

  // --- 右：|ψ(x,t)|² ---
  let mx0 = 480, mw = width - mx0 - 40, mb = height * 0.62, mh = height * 0.4;
  stroke(0, 0, 60); strokeWeight(3); line(mx0, mb, mx0, mb - mh); line(mx0 + mw, mb, mx0 + mw, mb - mh);
  strokeWeight(mw / M + 0.8);
  let hs = mh / max(pmax, 1);
  for (let i = 0; i < M; i++) {
    stroke(((atan2(pIm[i], pRe[i]) + PI) / TWO_PI) * 360, 75, 100);
    line(mx0 + (i / (M - 1)) * mw, mb, mx0 + (i / (M - 1)) * mw, mb - pr[i] * hs);
  }
  stroke(0, 0, 50); strokeWeight(1); line(mx0, mb, mx0 + mw, mb);
  stroke(55, 90, 100); strokeWeight(2); line(mx0 + mx * mw, mb + 4, mx0 + mx * mw, mb + 18);
  // ⟨x⟩(t) のグラフ（揺れの速さ = エネルギー差）
  let gy = height - 40, gh = height * 0.22;
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(mx0, gy - gh, mw, gh);
  stroke(55, 90, 100); strokeWeight(2); beginShape();
  for (let i = 0; i < xTrace.length; i++) vertex(mx0 + (i / 600) * mw, gy - xTrace[i] * gh);
  endShape();
  noStroke(); fill(0, 0, 70); textSize(14); text('⟨x⟩ の時間変化（上 = 右の壁）', mx0, gy - gh - 8);

  let tRev = TWO_PI / w1;
  fill(0, 0, 100); textSize(18);
  text('クリック/1〜6：準位　G：波束　↑↓ 速さ × ' + nf(speed, 1, 2) + '　スペース：' + (running ? '動' : '止') + '　R：t = 0　　t = ' + nf(t, 1, 1) + '（復活の周期 ' + nf(tRev, 1, 1) + '）', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('1 つの準位だけなら |ψ|² は動かない（定常状態）。2 つ混ぜると E2 − E1 = 3E1 の速さで揺れる。波束は崩れても周期 2π/E1 で元に戻る（量子リバイバル）', 20, 68);
}

function mousePressed() {
  let lx = 40, lw = 240, lb = height - 60, eU = (height - 240) / 36;
  if (mouseX < lx - 10 || mouseX > lx + lw + 120) return;
  for (let n = 1; n <= 6; n++) {
    if (abs(mouseY - (lb - n * n * eU)) < max(8, eU * 1.2)) {
      let a = sqrt(cRe[n] * cRe[n] + cIm[n] * cIm[n]);
      // いまの比率を保ったまま n 番目だけ 0 → 0.5 → 1 → 0（その後で正規化）
      let next = a < 0.25 ? 0.5 : a < 0.75 ? 1 : 0;
      for (let m = 7; m <= NM; m++) { cRe[m] = 0; cIm[m] = 0; }
      cRe[n] = next; cIm[n] = 0;
      normalizeC();
      return;
    }
  }
}

function keyPressed() {
  if (key >= '1' && key <= '6') { cRe.fill(0); cIm.fill(0); cRe[int(key)] = 1; normalizeC(); }
  if (key === 'g' || key === 'G') gaussPacket();
  if (key === UP_ARROW) speed = min(8, speed * 1.5);
  if (key === DOWN_ARROW) speed = max(0.1, speed / 1.5);
  if (key === ' ') running = !running;
  if (key === 'r' || key === 'R') { t = 0; xTrace = []; }
}

// ---------- やってみよう ----------
// 1. n = 1 と 2 を混ぜたときと、1 と 3 を混ぜたときで ⟨x⟩ は揺れる？（偶奇が同じだと ⟨x⟩ は真ん中のまま）
// 2. 揺れの周期を測って 2π / ((m² − n²) w1) と比べよう
// 3. G の波束は 復活の周期の半分で鏡に映した位置に、1/4 で 2 つに分かれて現れる（分数リバイバル）。止めて確かめよう
// 4. gaussPacket の k を 0 や 40 にすると、使われる準位（丸の大きさ）はどう変わる？
