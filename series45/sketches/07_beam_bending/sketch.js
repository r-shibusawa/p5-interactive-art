// ============================================
// 07 はりの曲げ
// 荷重 → せん断力 V → 曲げモーメント M → たわみ y。順に積分していく（オイラー・ベルヌーイのはり理論：EI y'' = M）
// 断面二次モーメント I = b h³ / 12。高さ h を 2 倍にすると、たわみは 1/8 になる
// 矢印をドラッグ = 荷重の位置と大きさ / はりをクリック = 荷重を足す / T = 単純支持 ⇄ 片持ち / ←→ = 幅 b / ↑↓ = 高さ h / E = 材料 / C = 荷重を 1 つに
// ============================================

let beamLen = 2.0;              // ★ はりの長さ（m）
let secB = 30, secH = 50;       // ★ 断面の幅 b と高さ h（mm）
let supportId = 0;              // 0 単純支持 / 1 片持ち
let matList = [['鋼', 206e9], ['アルミ', 70e9], ['木材（スギ）', 7e9]], matId = 0;   // ★ 材料とヤング率（Pa）
let loads = [{ a: 1.2, p: 1000 }];   // 荷重：位置 a（m）、大きさ p（N、下向きが正）
let grabId = -1;
const NB = 400;                 // はりを分ける数
let bx = 0, bw = 0, by = 0;     // はりの絵の左端・幅・高さ位置

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// ★ 数値積分で V, M, たわみ角, たわみ を求める
function solveBeam() {
  let dx = beamLen / NB, EI = matList[matId][1] * ((secB / 1000) * Math.pow(secH / 1000, 3)) / 12;
  let sumP = 0, sumPa = 0;
  for (let q of loads) { sumP += q.p; sumPa += q.p * q.a; }
  let RA, RB = 0, MA = 0;
  if (supportId === 0) { RB = sumPa / beamLen; RA = sumP - RB; }       // 単純支持：モーメントのつり合い
  else { RA = sumP; MA = -sumPa; }                                     // 片持ち：壁が力とモーメントを受ける
  let V = [], M = [MA], slope = [0], y = [0];
  let shearAt = (x) => { let v = RA; for (let q of loads) if (q.a < x) v -= q.p; return v; };
  for (let i = 0; i <= NB; i++) V.push(shearAt(i * dx + 1e-9));
  for (let i = 1; i <= NB; i++) M.push(M[i - 1] + shearAt((i - 0.5) * dx) * dx);                 // M = ∫V dx
  for (let i = 1; i <= NB; i++) slope.push(slope[i - 1] + ((M[i - 1] + M[i]) / 2 / EI) * dx);    // θ = ∫M/EI dx
  for (let i = 1; i <= NB; i++) y.push(y[i - 1] + ((slope[i - 1] + slope[i]) / 2) * dx);         // y = ∫θ dx
  if (supportId === 0) { let yEnd = y[NB]; for (let i = 0; i <= NB; i++) y[i] -= (yEnd * i) / NB; }   // 両端で y = 0 になるように
  return { V, M, y, RA, RB, MA, EI };
}

function draw() {
  background(212, 45, 13);
  bx = 100; bw = width - 560; by = 190;
  let sol = solveBeam();
  let X = (x) => bx + (x / beamLen) * bw;
  let vMax = 1, mMax = 1, yMax = 1e-9, iy = 0;
  for (let i = 0; i <= NB; i++) {
    vMax = Math.max(vMax, Math.abs(sol.V[i])); mMax = Math.max(mMax, Math.abs(sol.M[i]));
    if (Math.abs(sol.y[i]) > yMax) { yMax = Math.abs(sol.y[i]); iy = i; }
  }
  let pxPerM = Math.min(8000, 60 / yMax);          // たわみの拡大（最大でも 60 px）

  // ---- はりと支点
  noStroke(); fill(0, 0, 40);
  if (supportId === 0) {
    triangle(X(0), by + 8, X(0) - 14, by + 32, X(0) + 14, by + 32);
    triangle(X(beamLen), by + 8, X(beamLen) - 14, by + 32, X(beamLen) + 14, by + 32);
    circle(X(beamLen) - 8, by + 37, 9); circle(X(beamLen) + 8, by + 37, 9);
  } else {
    rect(X(0) - 26, by - 60, 26, 120);
    stroke(0, 0, 60); strokeWeight(1);
    for (let k = -60; k < 60; k += 12) line(X(0) - 26, by + k + 12, X(0), by + k);
  }
  stroke(0, 0, 50, 50); strokeWeight(1); line(X(0), by, X(beamLen), by);      // 変形前
  noFill(); stroke(matId === 2 ? 30 : 200, 50, 95); strokeWeight(constrain(secH / 5, 4, 22));
  beginShape();
  for (let i = 0; i <= NB; i += 4) vertex(X((i * beamLen) / NB), by - sol.y[i] * pxPerM);
  endShape();
  // 荷重の矢印
  for (let k = 0; k < loads.length; k++) {
    let q = loads[k], x = X(q.a), yb = by - sol.y[Math.round((q.a / beamLen) * NB)] * pxPerM;
    let lenA = q.p / 12, tip = yb - (q.p >= 0 ? 12 : -12), tail = tip - lenA - (q.p >= 0 ? 10 : -10);
    stroke(0, 80, 100); strokeWeight(4);
    line(x, tail, x, tip);
    let sg = q.p >= 0 ? 1 : -1;
    line(x, tip, x - 8, tip - 12 * sg); line(x, tip, x + 8, tip - 12 * sg);
    noStroke(); fill(0, 80, 100); circle(x, tail, 14);
    fill(0, 0, 100); textSize(13); text(nf(q.p, 1, 0) + ' N', x + 12, tail + 4);
  }
  // 反力
  noStroke(); fill(140, 60, 100); textSize(13);
  text('R = ' + nf(sol.RA, 1, 0) + ' N', X(0) - 40, by + 62);
  if (supportId === 0) text('R = ' + nf(sol.RB, 1, 0) + ' N', X(beamLen) - 40, by + 62);
  else text('M = ' + nf(sol.MA, 1, 0) + ' N·m', X(0) - 40, by + 80);

  // ---- せん断力図（SFD）と曲げモーメント図（BMD）
  let rowsD = [['せん断力図 V', sol.V, vMax, 190, ' N'], ['曲げモーメント図 M', sol.M, mMax, 320, ' N·m']];
  for (let r = 0; r < 2; r++) {
    let y0 = by + 190 + r * 150, amp = 52, arr = rowsD[r][1], peak = rowsD[r][2];
    fill(rowsD[r][3], 60, 90, 30); stroke(rowsD[r][3], 60, 100); strokeWeight(2);
    beginShape();
    vertex(X(0), y0);
    for (let i = 0; i <= NB; i += 2) vertex(X((i * beamLen) / NB), y0 - (arr[i] / peak) * amp * (r === 1 ? -1 : 1));   // M は下向きを正（引張側）に描く
    vertex(X(beamLen), y0);
    endShape(CLOSE);
    stroke(0, 0, 50); strokeWeight(1); line(X(0), y0, X(beamLen), y0);
    noStroke(); fill(rowsD[r][3], 40, 100); textSize(14);
    text(rowsD[r][0] + '　最大 ' + nf(peak, 1, 0) + rowsD[r][4], X(0), y0 - amp - 12);
  }

  // ---- 数値
  let Isec = (secB * Math.pow(secH, 3)) / 12;                          // mm⁴
  let sigMax = (mMax * 1000 * (secH / 2)) / Isec;                      // 曲げ応力 σ = M (h/2) / I（MPa）
  noStroke(); fill(0, 0, 100); textSize(18);
  text('矢印の●をドラッグ：荷重　はりをクリック：荷重を足す　T：' + (supportId === 0 ? '単純支持' : '片持ち') + '　←→：b　↑↓：h　E：' + matList[matId][0] + '　C：荷重 1 つ', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('荷重 → V → M → たわみ角 → たわみ と 4 回積分する。たわみの絵は拡大表示（実際は最大 ' + nf(yMax * 1000, 1, 2) + ' mm）', 20, 68);
  let ix = width - 420, iy0 = 130;
  fill(0, 0, 100, 8); rect(ix - 16, iy0 - 30, 410, 400, 10);
  fill(0, 0, 100); textSize(16);
  text('EI y″ = M(x)　　dM/dx = V', ix, iy0);
  text('断面二次モーメント I = b h³ / 12', ix, iy0 + 28);
  fill(35, 90, 100);
  text('b = ' + secB + ' mm　h = ' + secH + ' mm　I = ' + nf(Isec / 1e4, 1, 1) + ' cm⁴', ix, iy0 + 56);
  fill(190, 70, 100);
  text('最大たわみ = ' + nf(yMax * 1000, 1, 2) + ' mm（x = ' + nf((iy * beamLen) / NB, 1, 2) + ' m）', ix, iy0 + 90);
  fill(320, 60, 100);
  text('最大曲げ応力 σ = M(h/2)/I = ' + nf(sigMax, 1, 1) + ' MPa', ix, iy0 + 116);
  if (loads.length === 1) {
    // 公式との答え合わせ（荷重点のたわみ）
    let q = loads[0], a = q.a, b = beamLen - a;
    let formula = supportId === 0 ? (q.p * a * a * b * b) / (3 * sol.EI * beamLen) : (q.p * a * a * a) / (3 * sol.EI);
    let numeric = -sol.y[Math.round((a / beamLen) * NB)];
    fill(0, 0, 70); textSize(13);
    text('公式（荷重点）：' + (supportId === 0 ? 'P a² b² / (3 E I L)' : 'P a³ / (3 E I)') + ' = ' + nf(formula * 1000, 1, 3) + ' mm', ix, iy0 + 146);
    text('数値積分：' + nf(numeric * 1000, 1, 3) + ' mm', ix, iy0 + 166);
  }
  // 断面の絵
  let cs = 1.6, cxs = ix + 190, cys = iy0 + 280;
  stroke(0, 0, 100, 70); strokeWeight(1); fill(matId === 2 ? 30 : 200, 45, 80);
  rect(cxs - (secB * cs) / 2, cys - (secH * cs) / 2, secB * cs, secH * cs);
  stroke(0, 0, 100, 50); line(cxs - 80, cys, cxs + 80, cys);          // 中立軸
  noStroke(); fill(0, 0, 60); textSize(12);
  text('中立軸', cxs + 86, cys + 4); text('断面', ix, cys + 4);
}

function mousePressed() {
  grabId = -1;
  for (let k = 0; k < loads.length; k++) {
    let x = bx + (loads[k].a / beamLen) * bw;
    if (Math.abs(mouseX - x) < 20 && mouseY < by + 80 && mouseY > 90) grabId = k;
  }
  if (grabId < 0 && mouseX > bx && mouseX < bx + bw && Math.abs(mouseY - by) < 30 && loads.length < 5) {
    loads.push({ a: ((mouseX - bx) / bw) * beamLen, p: 600 });
    grabId = loads.length - 1;
  }
}
function mouseDragged() {
  if (grabId < 0) return;
  loads[grabId].a = constrain(((mouseX - bx) / bw) * beamLen, 0.02, beamLen);
  loads[grabId].p = constrain((by - 22 - mouseY) * 12, -1500, 1500);
}
function mouseReleased() { grabId = -1; }

function keyPressed() {
  if (key === 't' || key === 'T') supportId = 1 - supportId;
  if (key === LEFT_ARROW) secB = constrain(secB - 5, 10, 80);
  if (key === RIGHT_ARROW) secB = constrain(secB + 5, 10, 80);
  if (key === UP_ARROW) secH = constrain(secH + 5, 10, 100);
  if (key === DOWN_ARROW) secH = constrain(secH - 5, 10, 100);
  if (key === 'e' || key === 'E') matId = (matId + 1) % matList.length;
  if (key === 'c' || key === 'C') loads = [{ a: beamLen * 0.6, p: 1000 }];
}

// ---------- やってみよう ----------
// 1. h を 50 → 100 にすると、たわみは 1/8、応力は 1/4。b を 2 倍にした場合と比べよう（板は立てて使う）
// 2. 単純支持で荷重を中央に置くと最大。公式 PL³/48EI と一致するか電卓で確かめよう
// 3. T で片持ちに。モーメント図は壁で最大になる。飛び込み台の付け根が太い理由
// 4. 荷重を 2 つにして、中央部の せん断力を 0（モーメント一定＝純曲げ）にしよう。4 点曲げ試験の形
// 5. b と h を入れ替えただけの断面（30×50 と 50×30）で、たわみは何倍ちがう？
