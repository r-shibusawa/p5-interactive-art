// ============================================
// 10 ネットワーク待ち行列（ジャクソン網）
// 窓口 A〜D がつながった網。外から A に客が来て、終わると確率で次の窓口へ進むか、外へ出る（戻ってくることもある）
//   各窓口に流れこむ量 λ_i は「流れの式」λ = 外からの到着 + Σ λ_j × (j から i へ行く確率) で決まる
//   ジャクソンの定理：各窓口はそれぞれ M/M/1（L_i = ρ_i/(1−ρ_i)）として計算できる。ρ が最大の窓口 = ボトルネック
// クリック / 1〜4 = 窓口を選ぶ / ↑↓ = その窓口の μ / ←→ = その窓口の行き先の割合 / [ ] = 外からの到着 γ / F = 早送り / R = 測り直す
// ============================================

let gamma = 0.5;            // ★ 外から A への到着率
let nodes = [];
let sel = 0, fast = false;
let simT, nextExt, flying, exits, areaTot, dropped;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  // ★ 窓口：名前・位置（画面に対する割合）・サービス率・行き先 2 つ（-1 = 外へ）・1 つ目へ行く確率
  nodes = [
    { name: 'A 受付', px: 0.15, py: 0.45, mu: 1.6, outs: [1, 2], s: 0.6 },
    { name: 'B 検査', px: 0.42, py: 0.25, mu: 1.0, outs: [3, -1], s: 0.7 },
    { name: 'C 相談', px: 0.42, py: 0.68, mu: 0.8, outs: [3, 0], s: 0.6 },
    { name: 'D 会計', px: 0.7, py: 0.45, mu: 1.5, outs: [-1, 1], s: 0.85 },
  ];
  resetSim();
}
function resetSim() {
  simT = 0; nextExt = expRand(gamma); flying = []; exits = 0; areaTot = 0; dropped = 0;
  for (let n of nodes) { n.q = 0; n.next = Infinity; n.area = 0; n.done = 0; }
}
function pos(n) { return { x: n.px * width, y: 120 + n.py * (height - 220) }; }

// ★ 流れの式を繰り返し代入で解く
function solveFlows() {
  let lam = [gamma, 0, 0, 0];
  for (let it = 0; it < 500; it++) {
    let nw = [gamma, 0, 0, 0];
    for (let j = 0; j < 4; j++) {
      let o = nodes[j].outs, s = nodes[j].s;
      if (o[0] >= 0) nw[o[0]] += lam[j] * s;
      if (o[1] >= 0) nw[o[1]] += lam[j] * (1 - s);
    }
    lam = nw;
  }
  return lam;
}

function arriveAt(i) {
  let n = nodes[i];
  if (n.q >= 400) { dropped++; return; }
  n.q++;
  if (n.q === 1) n.next = simT + expRand(n.mu);
}
function advance(tEnd) {
  while (true) {
    let tn = nextExt, who = -1;
    for (let i = 0; i < 4; i++) if (nodes[i].next < tn) { tn = nodes[i].next; who = i; }
    if (tn > tEnd) break;
    let tot = 0; for (let n of nodes) { n.area += n.q * (tn - simT); tot += n.q; }
    areaTot += tot * (tn - simT); simT = tn;
    if (who < 0) { arriveAt(0); nextExt = simT + expRand(gamma); if (flying.length < 80) flying.push({ a: -1, b: 0, f: 0 }); continue; }
    let n = nodes[who];
    n.q--; n.done++;
    n.next = n.q > 0 ? simT + expRand(n.mu) : Infinity;
    let to = Math.random() < n.s ? n.outs[0] : n.outs[1];
    if (to < 0) exits++; else arriveAt(to);
    if (flying.length < 80) flying.push({ a: who, b: to, f: 0 });
  }
  let dt = tEnd - simT, tot = 0;
  for (let n of nodes) { n.area += n.q * dt; tot += n.q; }
  areaTot += tot * dt; simT = tEnd;
}

function draw() {
  background(185, 25, 11);
  advance(simT + (fast ? 120 : 6) / 60);
  let lam = solveFlows();
  let rhos = lam.map((l, i) => l / nodes[i].mu);
  let bott = rhos.indexOf(max(...rhos));

  // ---- 矢印（行き先と確率）
  for (let i = 0; i < 4; i++) {
    let n = nodes[i], a = pos(n);
    for (let k = 0; k < 2; k++) {
      let p = k === 0 ? n.s : 1 - n.s, to = n.outs[k];
      let b = to < 0 ? { x: width * 0.9, y: a.y - 60 } : pos(nodes[to]);
      let bend = to >= 0 && nodes[to].outs.includes(i) ? 30 : 0;
      drawArrow(a, b, p, bend, to < 0 ? '外へ' : '');
    }
  }
  let e = pos(nodes[0]); drawArrow({ x: 20, y: e.y }, e, 1, 0, '');
  // ---- 移動中の客（見た目だけ）
  noStroke();
  for (let f of flying) {
    f.f += 0.05;
    let a = f.a < 0 ? { x: 20, y: e.y } : pos(nodes[f.a]);
    let b = f.b < 0 ? { x: width * 0.9, y: a.y - 60 } : pos(nodes[f.b]);
    fill(45, 80, 100); circle(lerp(a.x, b.x, f.f), lerp(a.y, b.y, f.f), 7);
  }
  flying = flying.filter((f) => f.f < 1);
  // ---- 窓口
  for (let i = 0; i < 4; i++) {
    let n = nodes[i], p = pos(n), r = rhos[i];
    if (i === bott) { fill(0, 80, 100, 25 + 15 * sin(frameCount * 0.1)); circle(p.x, p.y, 150); }
    stroke(i === sel ? color(45, 90, 100) : color(0, 0, 100, 50)); strokeWeight(i === sel ? 4 : 2);
    fill(r >= 1 ? color(0, 70, 60) : color(200 - r * 160, 60, 55)); circle(p.x, p.y, 112);
    noStroke(); fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(16); text(n.name, p.x, p.y - 22);
    textSize(12);
    text('μ=' + nf(n.mu, 1, 1) + ' λ=' + nf(lam[i], 1, 2), p.x, p.y);
    text('ρ = ' + nf(r, 1, 2), p.x, p.y + 18);
    textAlign(LEFT, BASELINE);
    for (let k = 0; k < min(n.q, 30); k++) { fill(30, 80, 100); circle(p.x - 50 + (k % 10) * 11, p.y + 62 + floor(k / 10) * 11, 8); }
    let Lm = n.area / max(simT, 1e-9), Lt = r < 1 ? r / (1 - r) : Infinity;
    fill(0, 0, 70); textSize(12); text('L 測定 ' + nf(Lm, 1, 2) + ' / 理論 ' + (Lt === Infinity ? '∞' : nf(Lt, 1, 2)), p.x - 60, p.y + 108);
  }

  // ---- 全体
  let Ltot = 0, stable = true;
  for (let r of rhos) { if (r >= 1) stable = false; else Ltot += r / (1 - r); }
  let tx = width * 0.78, ty = height * 0.7;
  fill(0, 0, 100); textSize(16);
  text('スループット（外へ出る率）', tx, ty); text('測定 ' + nf(exits / max(simT, 1e-9), 1, 3) + '　（安定なら = γ = ' + gamma + '）', tx, ty + 22);
  text('網の中の平均人数 L', tx, ty + 52); text('測定 ' + nf(areaTot / max(simT, 1e-9), 1, 2) + '　理論 ' + (stable ? nf(Ltot, 1, 2) : '∞'), tx, ty + 74);
  text('平均の滞在時間 W = L / γ', tx, ty + 104); text('理論 ' + (stable ? nf(Ltot / gamma, 1, 2) : '∞'), tx, ty + 126);
  fill(0, 80, 100); text('ボトルネック：' + nodes[bott].name + (stable ? '' : '　→ ρ ≥ 1 で行列が伸び続ける！'), tx, ty + 156);
  if (dropped) { fill(0, 0, 60); textSize(12); text('あふれて消えた客 ' + dropped, tx, ty + 178); }

  fill(0, 0, 100); textSize(18);
  text('選択：' + nodes[sel].name + '（クリック / 1〜4）　μ ↑↓　行き先の割合 ←→　γ = ' + nf(gamma, 1, 2) + '（[ ]）　F：早送り ' + (fast ? 'ON' : 'off') + '　R：測り直す　時間 ' + nf(simT, 1, 0), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('赤く光る窓口がボトルネック。ほかの窓口を速くしても全体はほとんど良くならない。戻りの矢印（C→A、D→B）があると流れが何倍にもなる', 20, 68);
}

function drawArrow(a, b, p, bend, lab) {
  let dx = b.x - a.x, dy = b.y - a.y, d = max(Math.hypot(dx, dy), 1), ux = dx / d, uy = dy / d;
  let sx = a.x + ux * 52 - uy * bend * 0.3, sy = a.y + uy * 52 + ux * bend * 0.3;
  let ex = b.x - ux * 56 - uy * bend * 0.3, ey = b.y - uy * 56 + ux * bend * 0.3;
  stroke(0, 0, 100, 25 + p * 60); strokeWeight(1 + p * 5); line(sx, sy, ex, ey);
  noStroke(); fill(0, 0, 100, 25 + p * 60);
  triangle(ex + ux * 6, ey + uy * 6, ex - ux * 10 - uy * 7, ey - uy * 10 + ux * 7, ex - ux * 10 + uy * 7, ey - uy * 10 - ux * 7);
  if (p < 1) { fill(45, 80, 100); textSize(14); text(nf(p, 1, 2) + (lab ? ' ' + lab : ''), (sx + ex) / 2 - uy * 14, (sy + ey) / 2 + ux * 14); }
}

function mousePressed() {
  for (let i = 0; i < 4; i++) { let p = pos(nodes[i]); if (Math.hypot(mouseX - p.x, mouseY - p.y) < 50) sel = i; }
}
function keyPressed() {
  let n = nodes[sel];
  if (key >= '1' && key <= '4') sel = int(key) - 1;
  if (key === UP_ARROW) n.mu = min(5, n.mu + 0.1);
  if (key === DOWN_ARROW) n.mu = max(0.2, n.mu - 0.1);
  if (key === RIGHT_ARROW) n.s = min(0.95, n.s + 0.05);
  if (key === LEFT_ARROW) n.s = max(0.05, n.s - 0.05);
  if (key === ']') gamma = min(3, gamma + 0.05);
  if (key === '[') gamma = max(0.05, gamma - 0.05);
  if (key === 'f' || key === 'F') fast = !fast;
  n.mu = round(n.mu * 10) / 10; n.s = round(n.s * 100) / 100; gamma = round(gamma * 100) / 100;
  if (key === 'r' || key === 'R' || key === ']' || key === '[' || key === UP_ARROW || key === DOWN_ARROW || key === LEFT_ARROW || key === RIGHT_ARROW) resetSim();
}

// ---------- やってみよう ----------
// 1. ボトルネックの μ だけを上げる（↑）。全体の W はどれだけ減る？ ボトルネックでない窓口を上げた場合と比べる
// 2. C の戻り（C → A）の割合を増やす（C を選んで ←）。A の λ が γ より大きくなるのはなぜ？
// 3. γ（]）を上げていき、最初に ρ = 1 を超える窓口を予想してから確かめる
// 4. 窓口を 5 つに増やして、自分の大学の「履修登録の流れ」や「病院の流れ」をつくってみる

// ==================================================
// ここから下は「道具」
// ==================================================
function expRand(rate) { return -Math.log(1 - Math.random()) / rate; }
