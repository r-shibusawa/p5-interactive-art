// ============================================
// 12 熱機関（オットーサイクルとカルノーサイクル）
// 気体を「圧縮 → 加熱 → 膨張 → 冷却」と 1 周させると、p–V 線図で囲んだ面積のぶんだけ仕事が取り出せる
// オットー（ガソリンエンジン）：効率 η = 1 − 1 / ε^(κ−1)。カルノー（理想の上限）：η = 1 − Tc / Th
// 1 = オットー / 2 = カルノー / ←→ = 圧縮比（カルノーは等温膨張の比）/ ↑↓ = 高温側の温度 / L = 対数目盛 / スペース = 止める
// ============================================

let cycleId = 1;              // 1 オットー / 2 カルノー
let compRatio = 8;            // ★ オットーの圧縮比 ε
let ottoTmax = 2000;          // ★ オットーの最高温度（K）
let isoRatio = 2.5;           // ★ カルノーの等温膨張の体積比
let carnotTh = 600;           // ★ カルノーの高温熱源（K）
const KAPPA = 1.4;            // 比熱比 κ（空気）
const T_LOW = 300, NR = 100 / 300;   // 低温側 300 K、気体の量（V = 1 で 100 kPa になるように）
let cyc = [];                 // 1 周ぶんの状態 { v, p, t, heat }
let info = {};                // 仕事・熱・効率
let pos = 0, playing = true, logAxes = false;
let runSpeed = 1.2;           // ★ アニメーションの速さ

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buildCycle();
}

// ★ サイクルを 4 つの行程（各 60 点）で作る。p V = nR T、断熱変化は T V^(κ−1) = 一定
function buildCycle() {
  cyc = [];
  let n = 60, g = KAPPA - 1;
  let put = (v, t, heat) => cyc.push({ v, t, p: (NR * t) / v, heat });
  let ease = (u) => (1 - Math.cos(Math.PI * u)) / 2;                   // ピストンの動きをなめらかに
  if (cycleId === 1) {
    let v2 = 1 / compRatio, t2 = T_LOW * Math.pow(compRatio, g), t3 = Math.max(ottoTmax, t2 + 100), t4 = t3 * Math.pow(compRatio, -g);
    for (let i = 0; i < n; i++) { let v = 1 + (v2 - 1) * ease(i / n); put(v, T_LOW * Math.pow(1 / v, g), 0); }          // 1→2 断熱圧縮
    for (let i = 0; i < n; i++) put(v2, t2 + (t3 - t2) * (i / n), 1);                                                    // 2→3 等積加熱（燃焼）
    for (let i = 0; i < n; i++) { let v = v2 + (1 - v2) * ease(i / n); put(v, t3 * Math.pow(v2 / v, g), 0); }           // 3→4 断熱膨張
    for (let i = 0; i < n; i++) put(1, t4 + (T_LOW - t4) * (i / n), -1);                                                 // 4→1 等積冷却（排気）
    let cv = NR / g, qin = cv * (t3 - t2);
    info = { qin, etaFormula: 1 - Math.pow(compRatio, -g), tHigh: t3, names: ['断熱圧縮', '等積加熱（燃焼）', '断熱膨張（仕事）', '等積冷却（排気）'] };
  } else {
    let k = Math.pow(carnotTh / T_LOW, 1 / g), va = 1 / (isoRatio * k), vb = isoRatio * va, vd = va * k;
    for (let i = 0; i < n; i++) put(va + (vb - va) * ease(i / n), carnotTh, 1);                                          // a→b 等温膨張（吸熱）
    for (let i = 0; i < n; i++) { let v = vb + (1 - vb) * ease(i / n); put(v, carnotTh * Math.pow(vb / v, g), 0); }      // b→c 断熱膨張
    for (let i = 0; i < n; i++) put(1 + (vd - 1) * ease(i / n), T_LOW, -1);                                              // c→d 等温圧縮（放熱）
    for (let i = 0; i < n; i++) { let v = vd + (va - vd) * ease(i / n); put(v, T_LOW * Math.pow(vd / v, g), 0); }        // d→a 断熱圧縮
    info = { qin: NR * carnotTh * Math.log(isoRatio), etaFormula: 1 - T_LOW / carnotTh, tHigh: carnotTh, names: ['等温膨張（吸熱）', '断熱膨張', '等温圧縮（放熱）', '断熱圧縮'] };
  }
  // 仕事 = 囲んだ面積 ∮p dV（台形公式）
  let w = 0;
  for (let i = 0; i < cyc.length; i++) { let a = cyc[i], b = cyc[(i + 1) % cyc.length]; w += ((a.p + b.p) / 2) * (b.v - a.v); }
  info.work = w; info.etaArea = w / info.qin;
  pos = pos % cyc.length;
}

function draw() {
  background(212, 45, 13);
  if (playing) pos = (pos + runSpeed) % cyc.length;
  let i0 = Math.floor(pos), fr = pos - i0, a = cyc[i0], b = cyc[(i0 + 1) % cyc.length];
  let now = { v: lerp(a.v, b.v, fr), p: lerp(a.p, b.p, fr), t: lerp(a.t, b.t, fr), heat: a.heat };
  let stroke4 = Math.floor(i0 / 60);

  // ---- 左：シリンダーとピストン
  let cx0 = 70, cyl = height * 0.42, cylLen = width * 0.3, bore = 130;
  let px = cx0 + now.v * cylLen;
  let hot = constrain((now.t - T_LOW) / (info.tHigh - T_LOW), 0, 1);
  noStroke(); fill(lerp(220, 0, hot), 70, lerp(45, 100, hot), 85);
  rect(cx0, cyl - bore / 2, px - cx0, bore);                                 // 気体（温度で色が変わる）
  fill(0, 0, 35);
  rect(cx0 - 14, cyl - bore / 2 - 12, cylLen + 80, 12); rect(cx0 - 14, cyl + bore / 2, cylLen + 80, 12); rect(cx0 - 14, cyl - bore / 2 - 12, 14, bore + 24);
  fill(40, 15, 85); rect(px, cyl - bore / 2, 30, bore, 3);                    // ピストン
  stroke(0, 0, 70); strokeWeight(8); line(px + 30, cyl, px + 150, cyl);
  // 熱の出入り
  noStroke(); textSize(15);
  if (now.heat > 0) { fill(10, 85, 100); text(cycleId === 1 ? '🔥 点火・燃焼（熱が入る）' : '🔥 高温熱源から吸熱', cx0, cyl - bore / 2 - 26); }
  if (now.heat < 0) { fill(210, 60, 100); text(cycleId === 1 ? '❄ 排気（熱を捨てる）' : '❄ 低温熱源へ放熱', cx0, cyl - bore / 2 - 26); }
  fill(0, 0, 100); textSize(15);
  text('行程 ' + (stroke4 + 1) + '：' + info.names[stroke4], cx0, cyl + bore / 2 + 40);
  fill(0, 0, 70); textSize(14);
  text('V = ' + nf(now.v, 1, 3) + '　p = ' + nf(now.p, 1, 0) + ' kPa　T = ' + nf(now.t, 1, 0) + ' K', cx0, cyl + bore / 2 + 64);

  // ---- 右：p–V 線図
  let gx = width * 0.5, gw = width - gx - 60, gy = 130, gh = height - gy - 190;
  let pTop = 0, pLow = 1e9, vLow = 1;
  for (let s of cyc) { pTop = Math.max(pTop, s.p); pLow = Math.min(pLow, s.p); vLow = Math.min(vLow, s.v); }
  let X, Y;
  if (logAxes) {
    let lv0 = Math.log10(vLow * 0.8), lv1 = Math.log10(1.2), lp0 = Math.log10(pLow * 0.7), lp1 = Math.log10(pTop * 1.3);
    X = (v) => gx + ((Math.log10(v) - lv0) / (lv1 - lv0)) * gw; Y = (p) => gy + gh - ((Math.log10(p) - lp0) / (lp1 - lp0)) * gh;
  } else {
    X = (v) => gx + (v / 1.08) * gw; Y = (p) => gy + gh - (p / (pTop * 1.08)) * gh;
  }
  stroke(0, 0, 45); strokeWeight(1); line(gx, gy, gx, gy + gh); line(gx, gy + gh, gx + gw, gy + gh);
  fill(35, 80, 100, 22); stroke(0, 0, 100, 40); strokeWeight(1);
  beginShape(); for (let s of cyc) vertex(X(s.v), Y(s.p)); endShape(CLOSE);            // 囲んだ面積 = 仕事
  noFill(); strokeWeight(3);
  for (let k = 0; k < 4; k++) {
    stroke(cyc[k * 60].heat > 0 ? 10 : cyc[k * 60].heat < 0 ? 210 : 0, cyc[k * 60].heat === 0 ? 0 : 75, 100);
    beginShape();
    for (let i = k * 60; i <= k * 60 + 60; i++) { let s = cyc[i % cyc.length]; vertex(X(s.v), Y(s.p)); }
    endShape();
  }
  noStroke(); fill(0, 0, 100); circle(X(now.v), Y(now.p), 14);
  textSize(13);
  for (let k = 0; k < 4; k++) { let s = cyc[k * 60]; fill(0, 0, 100); text(cycleId === 1 ? k + 1 : 'abcd'[k], X(s.v) + 8, Y(s.p) - 8); }
  fill(0, 0, 60); textSize(12);
  text('体積 V' + (logAxes ? '（対数）' : ''), gx + gw * 0.5, gy + gh + 20); text('圧力 p（kPa）' + (logAxes ? '（対数）' : ''), gx - 10, gy - 10);
  text(nf(pTop, 1, 0), gx - 44, Y(pTop) + 4); text('1.0', X(1) - 8, gy + gh + 20); text(nf(vLow, 1, 3), X(vLow) - 12, gy + gh + 20);
  fill(0, 0, 70); text('赤＝熱が入る、青＝熱を捨てる、白＝断熱。橙の面積＝1 周の仕事', gx, gy + gh + 44);

  // ---- 文字
  noStroke(); fill(0, 0, 100); textSize(18);
  let ctl = cycleId === 1 ? '←→：圧縮比 ε = ' + compRatio + '　↑↓：最高温度 ' + ottoTmax + ' K' : '←→：等温膨張の比 ' + nf(isoRatio, 1, 1) + '　↑↓：高温熱源 Th = ' + carnotTh + ' K';
  text('1：オットー　2：カルノー（いま ' + (cycleId === 1 ? 'オットー' : 'カルノー') + '）　' + ctl + '　L：対数目盛　スペース：' + (playing ? '止める' : '動かす'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('熱 Q を入れて仕事 W を取り出し、残りは捨てる。効率 η = W / Q入。捨てる熱を 0 にはできない（熱力学第二法則）', 20, 68);
  let ix = 56, iy = height - 150;
  fill(0, 0, 100, 8); rect(ix - 14, iy - 26, width * 0.4, 142, 10);
  fill(0, 0, 100); textSize(16);
  text(cycleId === 1 ? 'オットー：η = 1 − 1 / ε^(κ−1)　（κ = 1.4）' : 'カルノー：η = 1 − Tc / Th　（Tc = 300 K）', ix, iy);
  fill(35, 90, 100);
  text('式の効率 = ' + nf(info.etaFormula * 100, 1, 1) + ' %　　面積から = ' + nf(info.etaArea * 100, 1, 1) + ' %', ix, iy + 28);
  fill(190, 70, 100);
  text('Q入 = ' + nf(info.qin, 1, 1) + '　W = ∮p dV = ' + nf(info.work, 1, 1) + '　Q捨 = ' + nf(info.qin - info.work, 1, 1) + '（kPa·V）', ix, iy + 56);
  fill(0, 0, 60); textSize(13);
  let carnotLimit = 1 - T_LOW / info.tHigh;
  text('同じ温度範囲（' + T_LOW + ' K 〜 ' + nf(info.tHigh, 1, 0) + ' K）でのカルノー効率（上限）= ' + nf(carnotLimit * 100, 1, 1) + ' %', ix, iy + 82);
  text(cycleId === 2 ? 'カルノーは効率は最高だが、面積（1 周の仕事）は細くて小さい。L で対数目盛にすると形が見える' : '圧縮比を上げると効率は上がるが、ノッキング（異常燃焼）が起きるので限界がある', ix, iy + 102);
}

function keyPressed() {
  if (key === '1' || key === '2') cycleId = Number(key);
  if (key === LEFT_ARROW) { if (cycleId === 1) compRatio = constrain(compRatio - 1, 3, 16); else isoRatio = constrain(isoRatio - 0.5, 1.5, 5); }
  if (key === RIGHT_ARROW) { if (cycleId === 1) compRatio = constrain(compRatio + 1, 3, 16); else isoRatio = constrain(isoRatio + 0.5, 1.5, 5); }
  if (key === UP_ARROW) { if (cycleId === 1) ottoTmax = constrain(ottoTmax + 200, 1200, 3000); else carnotTh = constrain(carnotTh + 100, 400, 1200); }
  if (key === DOWN_ARROW) { if (cycleId === 1) ottoTmax = constrain(ottoTmax - 200, 1200, 3000); else carnotTh = constrain(carnotTh - 100, 400, 1200); }
  if (key === 'l' || key === 'L') logAxes = !logAxes;
  if (key === ' ') playing = !playing;
  buildCycle();
}

// ---------- やってみよう ----------
// 1. オットーで圧縮比を 4 → 12 と上げ、効率を表にしよう。式 1 − 1/ε^0.4 と面積からの値は一致する？
// 2. オットーの最高温度を変えても効率は変わらない（圧縮比だけで決まる）。変わるのは何？（1 周の仕事）
// 3. カルノーで Th を 400 → 1200 K に。効率は上がるが、L を押さないと線図がつぶれて見えない。体積比はいくつ？
// 4. オットーの効率は、同じ温度範囲のカルノー効率より必ず低い。差が生まれるのはどの行程？
// 5. ディーゼルサイクル（加熱を等圧で行う）を 3 番目として作ってみよう。2→3 を「p 一定で V が増える」に変える
