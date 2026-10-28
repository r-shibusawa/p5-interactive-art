// ============================================
// 05 プロジェクト管理 PERT/CPM
// 家を建てる作業には「これが終わらないと始められない」順序がある。全体は最短で何日？ どの作業が遅れると全体が遅れる？
//   前から：最早開始 ES・最早終了 EF ／ 後ろから：最遅開始 LS・最遅終了 LF ／ 余裕 = LS − ES。余裕 0 の作業の列がクリティカルパス
// クリック = 作業を選ぶ / ↑↓ = 選んだ作業の日数 / M = 日数がばらつくときのシミュレーション（PERT）/ R = 元に戻す
// ============================================

let acts = [                           // ★ 作業：名前、日数、前の作業
  { id: 'A', name: '基礎', d: 4, pre: [] },
  { id: 'B', name: '骨組み', d: 6, pre: ['A'] },
  { id: 'C', name: '屋根', d: 4, pre: ['B'] },
  { id: 'D', name: '電気配線', d: 3, pre: ['B'] },
  { id: 'E', name: '水道配管', d: 5, pre: ['B'] },
  { id: 'F', name: '内装', d: 6, pre: ['D', 'E'] },
  { id: 'G', name: '外壁', d: 5, pre: ['C'] },
  { id: 'H', name: '庭', d: 3, pre: ['A'] },
  { id: 'I', name: '検査・引き渡し', d: 2, pre: ['F', 'G', 'H'] },
];
let d0 = acts.map(a => a.d);
let selected = 4;
let simSpans = [], critCount = [], simRuns = 0;
let deadline = 30;                     // ★ 納期（日）
let nodePos = [];                      // 箱の位置（クリック判定用）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  critCount = acts.map(() => 0);
}

// ★ CPM：前から ES/EF、後ろから LS/LF を計算（acts は前の作業が先に並んでいる）
function cpm(dur) {
  let idx = {}; acts.forEach((a, i) => idx[a.id] = i);
  let ES = [], EF = [], LS = [], LF = [];
  for (let i = 0; i < acts.length; i++) {
    ES[i] = 0; for (let p of acts[i].pre) ES[i] = max(ES[i], EF[idx[p]]);
    EF[i] = ES[i] + dur[i];
  }
  let T = max(EF);
  for (let i = acts.length - 1; i >= 0; i--) {
    LF[i] = T;
    for (let j = 0; j < acts.length; j++) if (acts[j].pre.includes(acts[i].id)) LF[i] = min(LF[i], LS[j]);
    LS[i] = LF[i] - dur[i];
  }
  return { ES, EF, LS, LF, T };
}
// 作業の段（前の作業の段 + 1）で横の位置を決める
function levels() {
  let lv = [], idx = {}; acts.forEach((a, i) => idx[a.id] = i);
  for (let i = 0; i < acts.length; i++) { lv[i] = 0; for (let p of acts[i].pre) lv[i] = max(lv[i], lv[idx[p]] + 1); }
  return lv;
}
// ★ PERT のシミュレーション：各作業の日数を「楽観 0.7 倍 〜 最可能 〜 悲観 1.8 倍」の三角分布でばらつかせて 1 回分の工期
function simulateOnce() {
  let dur = acts.map(a => triangular(a.d * 0.7, a.d, a.d * 1.8));
  let r = cpm(dur);
  simSpans.push(r.T); simRuns++;
  for (let i = 0; i < acts.length; i++) if (r.LS[i] - r.ES[i] < 1e-6) critCount[i]++;
  if (simSpans.length > 4000) simSpans.shift();
}

function draw() {
  background(225, 30, 12);
  if (simRuns > 0 && simRuns < 3000) for (let k = 0; k < 40; k++) simulateOnce();
  let r = cpm(acts.map(a => a.d));
  let lv = levels(), maxLv = max(lv);
  let byLv = {}; acts.forEach((a, i) => (byLv[lv[i]] = byLv[lv[i]] || []).push(i));
  let nx = 80, nw = width - 160, ny = 110, nh = height * 0.42;
  let pos = acts.map((a, i) => {
    let col = byLv[lv[i]], k = col.indexOf(i);
    return { x: nx + lv[i] / max(1, maxLv) * nw, y: ny + (k + 1) / (col.length + 1) * nh };
  });
  let crit = acts.map((a, i) => r.LS[i] - r.ES[i] < 1e-6);
  let idx = {}; acts.forEach((a, i) => idx[a.id] = i);

  // 矢印（前の作業 → 次の作業）
  for (let i = 0; i < acts.length; i++) for (let p of acts[i].pre) {
    let j = idx[p], c = crit[i] && crit[j] && abs(r.EF[j] - r.ES[i]) < 1e-6;
    stroke(c ? color(0, 80, 100) : color(0, 0, 100, 30)); strokeWeight(c ? 4 : 2);
    arrow(pos[j].x + 60, pos[j].y, pos[i].x - 60, pos[i].y);
  }
  // 作業の箱：ES EF / LS LF
  textAlign(CENTER, CENTER);
  for (let i = 0; i < acts.length; i++) {
    let p = pos[i], a = acts[i];
    stroke(i === selected ? color(50, 90, 100) : crit[i] ? color(0, 80, 100) : color(0, 0, 50)); strokeWeight(i === selected ? 4 : 2);
    fill(crit[i] ? color(0, 50, 35) : color(220, 30, 25));
    rect(p.x - 60, p.y - 38, 120, 76, 8);
    noStroke(); fill(0, 0, 100); textSize(15); text(a.id + ' ' + a.name, p.x, p.y - 20);
    textSize(13); fill(50, 70, 100); text(a.d + ' 日', p.x, p.y);
    fill(0, 0, 70); textSize(11);
    text('ES ' + r.ES[i] + ' / EF ' + r.EF[i], p.x, p.y + 15);
    text('LS ' + r.LS[i] + ' / LF ' + r.LF[i], p.x, p.y + 28);
  }
  textAlign(LEFT, BASELINE);

  // ガントチャート（余裕 = 薄い部分）
  let gx = 200, gy = ny + nh + 40, gw = width * 0.55 - gx, rowH = min(22, (height - gy - 40) / acts.length), T = r.T;
  let unit = gw / max(T, deadline + 2);
  for (let i = 0; i < acts.length; i++) {
    let y = gy + i * rowH;
    fill(0, 0, 80); textSize(13); text(acts[i].id + ' ' + acts[i].name, 40, y + rowH * 0.7);
    fill(crit[i] ? color(0, 75, 95) : color(200, 60, 85)); rect(gx + r.ES[i] * unit, y + 2, acts[i].d * unit, rowH - 5, 3);
    if (!crit[i]) { fill(200, 40, 85, 30); rect(gx + r.EF[i] * unit, y + 2, (r.LF[i] - r.EF[i]) * unit, rowH - 5, 3); fill(0, 0, 60); textSize(11); text('余裕 ' + (r.LS[i] - r.ES[i]), gx + r.LF[i] * unit + 4, y + rowH * 0.7); }
  }
  stroke(50, 90, 100); strokeWeight(2); line(gx + T * unit, gy - 10, gx + T * unit, gy + acts.length * rowH);
  stroke(0, 0, 100, 60); drawingContext.setLineDash([5, 5]); line(gx + deadline * unit, gy - 10, gx + deadline * unit, gy + acts.length * rowH); drawingContext.setLineDash([]);
  noStroke(); fill(50, 90, 100); textSize(13); text('工期 ' + T + ' 日', gx + T * unit + 4, gy - 12);
  fill(0, 0, 80); text('納期 ' + deadline, gx + deadline * unit + 4, gy + acts.length * rowH + 14);

  // 右下：シミュレーション（M）
  let hx = width * 0.6, hw = width - hx - 40, hy = gy, hh = height - hy - 90;
  fill(0, 0, 90); textSize(15); text('PERT シミュレーション（M）：日数がばらつくと工期は？', hx, hy - 12);
  if (simSpans.length) {
    let lo = floor(min(simSpans)), hi = ceil(max(simSpans)), nb = max(1, hi - lo), cnt = new Array(nb + 1).fill(0);
    for (let s of simSpans) cnt[floor(s - lo)]++;
    let cm = max(cnt), late = simSpans.filter(s => s > deadline).length;
    for (let b = 0; b <= nb; b++) {
      let h = cnt[b] / cm * (hh - 60);
      fill(lo + b + 1 > deadline ? color(0, 70, 90) : color(140, 50, 80)); rect(hx + b * hw / (nb + 1), hy + hh - 60 - h, hw / (nb + 1) - 2, h);
    }
    fill(0, 0, 60); textSize(11); text(lo + ' 日', hx, hy + hh - 46); textAlign(RIGHT); text(hi + ' 日', hx + hw, hy + hh - 46); textAlign(LEFT);
    fill(0, 0, 85); textSize(13);
    text(simRuns + ' 回　平均 ' + nf(simSpans.reduce((a, b) => a + b, 0) / simSpans.length, 1, 1) + ' 日（CPM では ' + T + ' 日）　納期 ' + deadline + ' 日に遅れる確率 ' + nf(100 * late / simSpans.length, 1, 1) + '%', hx, hy + hh - 26);
    let s = 'クリティカルになった割合：';
    for (let i = 0; i < acts.length; i++) s += acts[i].id + ' ' + round(100 * critCount[i] / simRuns) + '%' + (i === 4 ? '\n' : '  ');
    text(s, hx, hy + hh - 6);
  } else { fill(0, 0, 55); textSize(13); text('M を押すと、各作業の日数をランダムにして 3000 回の工期を調べる', hx, hy + 20); }

  fill(0, 0, 100); textSize(18);
  text('クリック：作業を選ぶ　↑↓：' + acts[selected].id + ' ' + acts[selected].name + ' の日数 ' + acts[selected].d + '　←→：納期 ' + deadline + '　M：シミュレーション　R：元に戻す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('工期 ' + T + ' 日。赤 = クリティカルパス（余裕 0）。赤い作業を 1 日縮めると工期も縮む。青い作業は余裕の分だけ遅れても平気', 20, 68);

  nodePos = pos;
}

function mousePressed() {
  let pos = nodePos;
  for (let i = 0; i < pos.length; i++) if (abs(mouseX - pos[i].x) < 60 && abs(mouseY - pos[i].y) < 38) { selected = i; acts[i].d = min(20, acts[i].d + 1); resetSim(); }
}
function resetSim() { simSpans = []; critCount = acts.map(() => 0); simRuns = 0; }
function keyPressed() {
  if (key === UP_ARROW) { acts[selected].d = min(20, acts[selected].d + 1); resetSim(); }
  if (key === DOWN_ARROW) { acts[selected].d = max(1, acts[selected].d - 1); resetSim(); }
  if (key === RIGHT_ARROW) deadline = min(60, deadline + 1);
  if (key === LEFT_ARROW) deadline = max(5, deadline - 1);
  if (key === 'm' || key === 'M') { resetSim(); simulateOnce(); }
  if (key === 'r' || key === 'R') { acts.forEach((a, i) => a.d = d0[i]); resetSim(); }
}

// ---------- やってみよう ----------
// 1. 青い作業（余裕あり）を ↑ で伸ばしていくと、何日でクリティカルパスが入れ替わる？
// 2. 予算で 1 つだけ 2 日縮められるなら、どの作業を縮める？ 縮めても工期が変わらない作業は？
// 3. M のシミュレーション：平均の工期は CPM の工期より長くなる。なぜ？（合流点で「遅いほう」を待つから）
// 4. 作業を足そう（例：{ id: 'J', name: '家具搬入', d: 2, pre: ['F'] } を I の前に）。pre の順番に注意


// ==================================================
// ここから下は「道具」（矢印・三角分布）
// ==================================================
function arrow(x1, y1, x2, y2) {
  line(x1, y1, x2, y2);
  let a = atan2(y2 - y1, x2 - x1);
  line(x2, y2, x2 - 10 * cos(a - 0.4), y2 - 10 * sin(a - 0.4));
  line(x2, y2, x2 - 10 * cos(a + 0.4), y2 - 10 * sin(a + 0.4));
}
// 三角分布（最小 lo、最頻 md、最大 hi）の乱数
function triangular(lo, md, hi) {
  let u = Math.random(), f = (md - lo) / (hi - lo);
  return u < f ? lo + Math.sqrt(u * (hi - lo) * (md - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - md));
}
