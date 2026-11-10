// ============================================
// 06 応力–ひずみ線図（引張試験）
// 試験片を引っ張って「応力 σ = 力 / 断面積」と「ひずみ ε = 伸び / 元の長さ」の関係を描く
// 弾性域（戻る）→ 降伏 → 加工硬化 → 最大荷重 → くびれ → 破断。途中で戻すと永久ひずみが残る
// ドラッグ（左右）= 引っ張る・戻す / 1〜3 = 材料（軟鋼・アルミ合金・ゴム）/ Z = 弾性域を拡大 / R = 新しい試験片
// ============================================

// ★ 材料の表：E ヤング率（MPa）、sy 降伏応力、plateau 降伏棚の終わり、eu・su 最大応力のひずみと値、ef・sf 破断
let materials = [
  { title: '軟鋼（SS400 相当）', hue: 205, E: 206000, sy: 250, plateau: 0.02, eu: 0.2, su: 420, ef: 0.34, sf: 330 },
  { title: 'アルミ合金（A6061-T6 相当）', hue: 45, E: 69000, sy: 275, plateau: 0, eu: 0.09, su: 310, ef: 0.15, sf: 270 },
  { title: 'ゴム（超弾性）', hue: 330, E: 3, rubber: true, ef: 5, eu: 5 },
];
let matId = 0;
let strain = 0, strainMax = 0, broken = false;
let trace = [];                 // 描いてきた (ε, σ) の点
let workDone = 0, lastE = 0, lastS = 0;
let zoomElastic = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetTest();
}
function resetTest() { strain = 0; strainMax = 0; broken = false; trace = [{ e: 0, s: 0 }]; workDone = 0; lastE = 0; lastS = 0; }

// ★ 一方向に引っ張り続けたときの曲線（包絡線）
function envelope(mt, e) {
  if (mt.rubber) { let lam = 1 + e; return (mt.E / 3) * (lam - 1 / (lam * lam)); }   // ネオフック：σ = G(λ − 1/λ²)
  let ey = mt.sy / mt.E;
  if (e <= ey) return mt.E * e;                                   // 弾性域：フックの法則 σ = Eε
  if (e <= mt.plateau) return mt.sy;                              // 降伏棚
  let e0 = Math.max(ey, mt.plateau);
  if (e <= mt.eu) { let u = (mt.eu - e) / (mt.eu - e0); return mt.su - (mt.su - mt.sy) * u * u; }   // 加工硬化
  let u = (e - mt.eu) / (mt.ef - mt.eu);
  return mt.su - (mt.su - mt.sf) * u * u;                         // くびれ（公称応力は下がる）
}
// ★ いまの応力：これまでの最大ひずみより手前なら、傾き E の直線で除荷・再負荷
function stressAt(mt, e) {
  if (broken) return 0;
  if (mt.rubber || e >= strainMax) return envelope(mt, e);
  return Math.max(envelope(mt, strainMax) - mt.E * (strainMax - e), 0);
}

function draw() {
  background(212, 45, 13);
  let mt = materials[matId];
  let sigma = stressAt(mt, strain);
  let sPeak = mt.rubber ? envelope(mt, mt.ef) : mt.su;
  let ey = mt.rubber ? 0 : mt.sy / mt.E;
  let plastic = mt.rubber || broken ? 0 : Math.max(strainMax - envelope(mt, strainMax) / mt.E, 0);   // 永久ひずみ

  // ---- 試験片（上）：ひずみに合わせて伸び、細くなる
  let sx = 120, sy0 = 150, len0 = Math.min(width * 0.32, 360);
  let stretch = mt.rubber ? strain * 0.35 : strain * 1.2;         // 絵の上での伸び（見やすく誇張）
  let len = len0 * (1 + stretch);
  let necking = !mt.rubber && strainMax > mt.eu ? constrain((strainMax - mt.eu) / (mt.ef - mt.eu), 0, 1) : 0;
  let wide = 34 / Math.sqrt(1 + (mt.rubber ? strain * 0.6 : strain));
  noStroke(); fill(0, 0, 45);
  rect(sx - 50, sy0 - 34, 50, 68, 4);                             // 固定側のつかみ
  let gapB = broken ? 14 : 0;
  rect(sx + len + gapB, sy0 - 34, 50, 68, 4);                     // 動く側のつかみ
  fill(mt.hue, 45, 85);
  for (let half = 0; half < 2; half++) {
    beginShape();
    for (let i = 0; i <= 20; i++) {
      let u = i / 20, x = half === 0 ? sx + (len / 2) * u : sx + len + gapB - (len / 2) * u;
      vertex(x, sy0 - (wide / 2) * (1 - 0.6 * necking * Math.exp(-Math.pow((1 - u) * 5, 2))));
    }
    for (let i = 20; i >= 0; i--) {
      let u = i / 20, x = half === 0 ? sx + (len / 2) * u : sx + len + gapB - (len / 2) * u;
      vertex(x, sy0 + (wide / 2) * (1 - 0.6 * necking * Math.exp(-Math.pow((1 - u) * 5, 2))));
    }
    endShape(CLOSE);
  }
  // 力の矢印
  let fx = sx + len + gapB + 50, fl = (sigma / sPeak) * 90;
  stroke(0, 80, 100); strokeWeight(4);
  if (fl > 2) { line(fx, sy0, fx + fl, sy0); line(fx + fl, sy0, fx + fl - 10, sy0 - 7); line(fx + fl, sy0, fx + fl - 10, sy0 + 7); }
  noStroke(); fill(0, 0, 100); textSize(14);
  text(mt.title, sx - 50, sy0 - 48);
  fill(0, 0, 60);
  text(broken ? '破断！ R で新しい試験片' : '← ドラッグで引っ張る・戻す →', sx - 50, sy0 + 62);

  // ---- 線図（下）
  let gx = 90, gy = 250, gw = width - 520, gh = height - gy - 70;
  let eMax = zoomElastic && !mt.rubber ? 0.01 : mt.ef * 1.08;
  let sMax = sPeak * 1.15;
  let X = (e) => gx + (e / eMax) * gw, Y = (s) => gy + gh - (s / sMax) * gh;
  stroke(0, 0, 45); strokeWeight(1);
  line(gx, gy, gx, gy + gh); line(gx, gy + gh, gx + gw, gy + gh);
  noStroke(); fill(0, 0, 60); textSize(12);
  for (let i = 0; i <= 5; i++) {
    text(nf((eMax * i) / 5 * 100, 1, eMax < 0.05 ? 2 : 0) + '%', X((eMax * i) / 5) - 10, gy + gh + 18);
    text(nf((sMax * i) / 5, 1, mt.rubber ? 1 : 0), gx - 46, Y((sMax * i) / 5) + 4);
  }
  text('ひずみ ε', gx + gw - 50, gy + gh + 40); text('応力 σ（MPa）', gx - 46, gy - 12);
  // 包絡線（うすく）
  noFill(); stroke(mt.hue, 30, 70, 40); strokeWeight(1.5);
  beginShape();
  for (let i = 0; i <= 300; i++) { let e = (Math.min(eMax, mt.ef) * i) / 300; vertex(X(e), Y(envelope(mt, e))); }
  endShape();
  // たどってきた線
  stroke(mt.hue, 60, 100); strokeWeight(3);
  let shown = trace.filter((p) => p.e <= eMax);
  if (shown.length > 1) {
    beginShape();
    for (let p of shown) vertex(X(p.e), Y(p.s));
    endShape();
  }
  if (!mt.rubber) {
    stroke(0, 0, 100, 35); strokeWeight(1);
    line(X(0), Y(mt.sy), X(Math.min(eMax, mt.ef)), Y(mt.sy));
    noStroke(); fill(0, 0, 75); textSize(12);
    text('降伏 σy = ' + mt.sy, X(Math.min(eMax, mt.ef)) - 110, Y(mt.sy) - 6);
    if (!zoomElastic) text('引張強さ σu = ' + mt.su, X(mt.eu) - 50, Y(mt.su) - 10);
  }
  if (strain <= eMax) { noStroke(); fill(0, 0, 100); circle(X(strain), Y(sigma), 12); }

  // ---- 数値
  noStroke(); fill(0, 0, 100); textSize(18);
  text('ドラッグ：引っ張る　1〜3：材料　Z：弾性域の拡大 ' + (zoomElastic ? 'ON' : 'off') + '　R：新しい試験片', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('降伏するまでは戻せば元どおり（弾性）。降伏を超えてから戻すと、傾き E の直線で下がり、永久ひずみが残る（塑性）', 20, 68);
  let ix = width - 400, iy = 270;
  fill(0, 0, 100, 8); rect(ix - 16, iy - 30, 390, 250, 10);
  fill(0, 0, 100); textSize(16);
  text('フックの法則：σ = E ε', ix, iy);
  text('ヤング率 E = ' + (mt.rubber ? mt.E + ' MPa' : mt.E / 1000 + ' GPa'), ix, iy + 28);
  fill(35, 90, 100);
  text('ひずみ ε = ' + nf(strain * 100, 1, 2) + ' %', ix, iy + 62);
  text('応力 σ = ' + nf(sigma, 1, mt.rubber ? 2 : 0) + ' MPa', ix, iy + 88);
  fill(190, 70, 100);
  text('永久ひずみ = ' + nf(plastic * 100, 1, 2) + ' %', ix, iy + 122);
  text('吸収したエネルギー = ' + nf(workDone, 1, 1) + ' MJ/m³', ix, iy + 148);
  fill(0, 0, 60); textSize(13);
  let stage = broken ? '破断' : mt.rubber ? '超弾性（戻せば元どおり）' : strain < strainMax - 1e-6 ? '除荷・再負荷（弾性）' : strain <= ey ? '弾性域' : strain <= mt.plateau ? '降伏棚' : strain <= mt.eu ? '加工硬化' : 'くびれ';
  text('いまの段階：' + stage, ix, iy + 180);
  text('エネルギー = 曲線の下の面積 ∫σ dε（じん性）', ix, iy + 202);
}

function mouseDragged() {
  if (broken) return;
  let mt = materials[matId];
  let range = mt.ef * 1.05;
  // 戻せるのは力が 0 になるところ（永久ひずみ）まで。それ以上戻すと試験片がたるむだけ
  let slack = mt.rubber ? 0 : Math.max(strainMax - envelope(mt, strainMax) / mt.E, 0);
  strain = constrain(strain + ((mouseX - pmouseX) / (width * 0.5)) * range * (zoomElastic && !mt.rubber ? 0.03 : 1), slack, range);
  // 細かく分けて進める（速くドラッグしても線が飛ばないように）
  let last = trace[trace.length - 1], n = Math.max(1, Math.ceil(Math.abs(strain - last.e) / (range / 400)));
  for (let i = 1; i <= n; i++) {
    let e = last.e + ((strain - last.e) * i) / n;
    let s = stressAt(mt, e);
    if (e > strainMax) strainMax = e;
    workDone += ((s + lastS) / 2) * (e - lastE);                  // 台形公式で ∫σ dε
    lastE = e; lastS = s;
    trace.push({ e, s });
    if (e >= mt.ef) { broken = true; trace.push({ e, s: 0 }); strain = e; break; }
  }
  if (trace.length > 4000) trace.splice(0, trace.length - 4000);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { matId = Number(key) - 1; resetTest(); }
  if (key === 'z' || key === 'Z') zoomElastic = !zoomElastic;
  if (key === 'r' || key === 'R') resetTest();
}

// ---------- やってみよう ----------
// 1. 軟鋼を 5% まで引っ張ってから戻そう。戻りの線は最初の直線と平行。横軸と交わる点が永久ひずみ
// 2. もう一度引っ張ると、前より高い応力まで弾性のまま（加工硬化）。針金を曲げ伸ばしすると硬くなる理由
// 3. Z で拡大して弾性域を見よう。軟鋼は 0.12% で降伏する。1 m の棒なら何 mm 伸びたところ？
// 4. 軟鋼とアルミを破断まで引っ張り、吸収したエネルギー（面積）を比べよう。ねばり強いのは？
// 5. materials に「鋳鉄（E 100000、ほとんど伸びずに破断：ef 0.005）」を足そう。もろい材料の線図はどんな形？
