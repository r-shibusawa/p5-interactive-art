// ============================================
// 09 座屈
// 細長い柱を押すと、つぶれる前に、ある荷重で突然横に曲がる（座屈）
// オイラーの座屈荷重：Pcr = π² E I / (K L)²。端の支え方で有効長さ K L が変わり、強さは最大 16 倍ちがう
// ↑↓（押し続ける）または上下ドラッグ = 荷重 P / ←→ = 柱の長さ L / D = 直径 / R = 荷重を 0 に
// ============================================

let colLen = 1.0;            // ★ 柱の長さ L（m）
let colDia = 10;             // ★ 丸棒の直径 d（mm）
let youngE = 206e9;          // ★ ヤング率（Pa、鋼）
let yieldS = 250e6;          // ★ 降伏応力（Pa）
let imperfect = 0.002;       // ★ 初期不整（最初からあるわずかな曲がり、有効長さに対する比）
let pushP = 100;             // 荷重 P（N）
// ★ 端末条件：名前、有効長さ係数 K、座屈モードの形（u = 0 が下端、1 が上端）
let ends = [
  { title: '両端ピン', K: 1.0, gainW: 1.0, f: (u) => Math.sin(Math.PI * u) },
  { title: '固定–自由', K: 2.0, gainW: 1.0, f: (u) => 1 - Math.cos((Math.PI * u) / 2) },
  { title: '両端固定', K: 0.5, gainW: 2.0, f: (u) => (1 - Math.cos(2 * Math.PI * u)) / 2 },
  { title: '固定–ピン', K: 0.699, gainW: 1.5, f: (u) => (Math.sin(4.4934 * u) - 4.4934 * Math.cos(4.4934 * u) + 4.4934 * (1 - u)) / 6.283 },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function secI() { return (Math.PI * Math.pow(colDia / 1000, 4)) / 64; }       // 断面二次モーメント
function secA() { return (Math.PI * Math.pow(colDia / 1000, 2)) / 4; }        // 断面積
function critical(en) { return (Math.PI * Math.PI * youngE * secI()) / Math.pow(en.K * colLen, 2); }

// ★ 横たわみの大きさ δ：初期不整つきの柱のつり合い Pcr δ (1 + k δ²) = P (δ + e0) を 2 分法で解く
//   P < Pcr ではほぼ 0、Pcr を超えると急に大きくなる（k = π²/8Le² はエラスティカの近似）
function deflection(en) {
  let Le = en.K * colLen, pcr = critical(en), e0 = imperfect * Le, k = (Math.PI * Math.PI) / (8 * Le * Le);
  let lo = 0, hi = Le;
  for (let i = 0; i < 40; i++) {
    let mid = (lo + hi) / 2;
    if (pcr * mid * (1 + k * mid * mid) - pushP * (mid + e0) < 0) lo = mid; else hi = mid;
  }
  return Math.min(lo, (0.25 * colLen) / en.gainW);   // 絵がくずれないように上限をつける
}

function draw() {
  background(212, 45, 13);
  if (keyIsDown(UP_ARROW)) pushP *= 1.02;
  if (keyIsDown(DOWN_ARROW)) pushP /= 1.02;
  pushP = constrain(pushP, 10, 60000);
  let pxPerM = Math.min(330, (height - 300) / colLen);
  let baseY = height - 120, colW = (width * 0.56) / 4;
  let sigma = pushP / secA();
  let crushed = sigma >= yieldS;

  for (let c = 0; c < 4; c++) {
    let en = ends[c], x0 = 50 + colW * (c + 0.5), pcr = critical(en);
    let dlt = deflection(en) * en.gainW, buckled = pushP > pcr;
    // 柱の形：横たわみ w(u) を決め、弧の長さが変わらないように縦方向を縮める
    let n = 60, ds = colLen / n, pts = [[0, 0]], wPrev = 0, hNow = 0;
    for (let i = 1; i <= n; i++) {
      let w = dlt * en.f(i / n), dw = w - wPrev;
      hNow += Math.sqrt(Math.max(ds * ds - dw * dw, 0));
      pts.push([w, hNow]); wPrev = w;
    }
    let topY = baseY - hNow * pxPerM, topX = x0 + pts[n][0] * pxPerM;
    // 下端と上端の支え
    noStroke(); fill(0, 0, 40);
    if (c === 0) triangle(x0, baseY, x0 - 14, baseY + 22, x0 + 14, baseY + 22);
    else rect(x0 - 34, baseY, 68, 18);
    if (c === 0 || c === 3) { rect(topX - 26, topY - 12, 8, 24); rect(topX + 18, topY - 12, 8, 24); }   // 横に動けないガイド
    if (c === 2) rect(topX - 34, topY - 16, 68, 14);
    // 柱
    noFill(); stroke(buckled ? 0 : 200, buckled ? 75 : 50, 100); strokeWeight(constrain(colDia * 0.6, 3, 14));
    beginShape();
    for (let p of pts) vertex(x0 + p[0] * pxPerM, baseY - p[1] * pxPerM);
    endShape();
    // 荷重の矢印
    stroke(50, 90, 100); strokeWeight(3);
    let al = 20 + Math.log10(pushP) * 14, ay = topY - (c === 2 ? 20 : 8);
    line(topX, ay - al, topX, ay); line(topX, ay, topX - 7, ay - 10); line(topX, ay, topX + 7, ay - 10);
    // ラベル
    noStroke(); fill(0, 0, 100); textSize(15);
    text(en.title, x0 - 34, baseY + 44);
    fill(0, 0, 65); textSize(13);
    text('K = ' + en.K + '　Le = ' + nf(en.K * colLen, 1, 2) + ' m', x0 - 60, baseY + 64);
    fill(buckled ? 0 : 140, 70, 100); textSize(14);
    text('Pcr = ' + nf(pcr, 1, 0) + ' N' + (buckled ? '　座屈！' : ''), x0 - 60, baseY + 86);
  }

  // ---- 右：オイラー曲線（細長比 λ = Le / k と 座屈応力 σcr = π²E / λ²）。両対数グラフでは傾き −2 の直線
  let gx = width * 0.64, gy = 150, gw = width - gx - 50, gh = height - gy - 190;
  let rg = colDia / 1000 / 4;                               // 丸棒の断面二次半径 k = d/4
  let X = (l) => gx + ((Math.log10(constrain(l, 20, 1000)) - Math.log10(20)) / (3 - Math.log10(20))) * gw;
  let Y = (sg) => gy + gh - (Math.log10(constrain(sg / 1e6, 1, 1000)) / 3) * gh;
  stroke(0, 0, 45); strokeWeight(1); line(gx, gy, gx, gy + gh); line(gx, gy + gh, gx + gw, gy + gh);
  noFill(); stroke(200, 60, 100); strokeWeight(2.5);
  beginShape();
  for (let l = 20; l <= 1000; l *= 1.1) vertex(X(l), Y((Math.PI * Math.PI * youngE) / (l * l)));
  endShape();
  stroke(320, 60, 100, 80); strokeWeight(1.5); line(gx, Y(yieldS), gx + gw, Y(yieldS));       // 降伏
  stroke(50, 90, 100); line(gx, Y(sigma), gx + gw, Y(sigma));                                 // いまの応力
  noStroke(); textSize(12);
  fill(320, 50, 100); text('降伏応力 σy（短い柱はこちらで決まる）', gx + gw - 230, Y(yieldS) - 6);
  fill(50, 90, 100); text('いまの応力 P/A = ' + nf(sigma / 1e6, 1, 1) + ' MPa', gx + 8, Y(sigma) - 6);
  fill(200, 50, 100); text('オイラー曲線 σcr = π²E / λ²（傾き −2 の直線）', gx + 10, gy + gh - 12);
  fill(0, 0, 60); text('細長比 λ = Le / k（対数）', gx + gw - 150, gy + gh + 34); text('応力（MPa、対数）', gx - 4, gy - 10);
  for (let l of [20, 50, 100, 200, 500, 1000]) text(l, X(l) - 8, gy + gh + 16);
  for (let v of [1, 10, 100, 1000]) text(v, gx - 34, Y(v * 1e6) + 4);
  for (let c = 0; c < 4; c++) {
    let lam = (ends[c].K * colLen) / rg, scr = (Math.PI * Math.PI * youngE) / (lam * lam);
    fill(pushP > critical(ends[c]) ? 0 : 140, 70, 100); circle(X(lam), Y(scr), 12);
    fill(0, 0, 100); text(ends[c].title, X(lam) + 9, Y(scr) - 7);
  }

  // ---- 文字
  noStroke(); fill(0, 0, 100); textSize(18);
  text('↑↓（押し続ける）/ 上下ドラッグ：荷重 P = ' + nf(pushP, 1, 0) + ' N　←→：長さ L = ' + nf(colLen, 1, 1) + ' m　D：直径 ' + colDia + ' mm　R：荷重を戻す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('同じ棒・同じ荷重でも、端の支え方で座屈する順番がちがう。Pcr を超えた瞬間に横たわみが急に大きくなる', 20, 68);
  let ix = width * 0.64, iy = height - 112;
  fill(0, 0, 100, 8); rect(ix - 14, iy - 26, width - ix - 20, 118, 10);
  fill(0, 0, 100); textSize(16);
  text('Pcr = π² E I / (K L)²　　I = π d⁴ / 64', ix, iy);
  fill(0, 0, 70); textSize(14);
  text('I = ' + nf(secI() * 1e12, 1, 0) + ' mm⁴　A = ' + nf(secA() * 1e6, 1, 1) + ' mm²　E = ' + youngE / 1e9 + ' GPa', ix, iy + 26);
  fill(crushed ? 0 : 0, crushed ? 80 : 0, crushed ? 100 : 70);
  text(crushed ? '応力が降伏応力を超えた：座屈する前に材料がつぶれる（短柱）' : '長さ 2 倍 → Pcr は 1/4、直径 2 倍 → Pcr は 16 倍', ix, iy + 52);
  fill(0, 0, 55); textSize(12);
  text('初期不整 ' + imperfect + ' × Le を入れてあるので、Pcr の少し手前から曲がり始める', ix, iy + 76);
}

function mouseDragged() { pushP = constrain(pushP * Math.pow(1.01, mouseY - pmouseY), 10, 60000); }

function keyPressed() {
  if (key === LEFT_ARROW) colLen = constrain(colLen - 0.1, 0.3, 1.5);
  if (key === RIGHT_ARROW) colLen = constrain(colLen + 0.1, 0.3, 1.5);
  if (key === 'd' || key === 'D') colDia = colDia >= 20 ? 6 : colDia + 2;
  if (key === 'r' || key === 'R') pushP = 100;
}

// ---------- やってみよう ----------
// 1. ↑ を押し続けて、座屈する順番を見よう。固定–自由 → 両端ピン → 固定–ピン → 両端固定。Pcr の比は 1 : 4 : 8.2 : 16
// 2. L を半分にすると Pcr は 4 倍。定規を両手で押して、長いときと短く持ったときを比べてみよう
// 3. D で直径を太くする。I は d の 4 乗なので急に強くなる。同じ重さなら中空パイプが有利な理由を考えよう
// 4. L = 0.3 m、d = 20 mm にすると、座屈より先に降伏する（右のグラフで点がピンクの線より上にある）
// 5. imperfect を 0.02 にすると「突然」ではなくなる。現実の柱が Pcr より小さい荷重で設計される理由
