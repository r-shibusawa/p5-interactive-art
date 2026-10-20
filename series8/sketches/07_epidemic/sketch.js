// ============================================
// 07 ネットワーク上の感染シミュレーション（SIR モデル）
// S（未感染）→ I（感染中）→ R（回復・免疫）。感染者の隣は確率 β でうつる
// つながり方で流行の広がり方が全然ちがう。点をクリックすると「ワクチン」（最初から R）
// マウス左右 = 感染率 β / 1 = 格子 / 2 = ランダム / 3 = ハブあり / スペースで開始 / クリック = ワクチン
// ============================================

let n = 120, nodes = [], adj = [];
let state = []; // 0 = S, 1 = I, 2 = R
let beta = 0.1, gamma = 0.05;
let running = false;
let history = [];
let topology = 2;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  build();
}

function build() {
  nodes = []; adj = []; state = new Array(n).fill(0); history = []; running = false;
  for (let i = 0; i < n; i++) adj.push([]);
  let link = (a, b) => { if (a !== b && !adj[a].includes(b)) { adj[a].push(b); adj[b].push(a); } };
  if (topology === 1) {
    let cols = 12;
    for (let i = 0; i < n; i++) nodes.push({ x: map(i % cols, 0, cols - 1, 100, width * 0.6), y: map(floor(i / cols), 0, ceil(n / cols) - 1, 130, height - 60) });
    for (let i = 0; i < n; i++) { if (i % cols < cols - 1) link(i, i + 1); if (i + cols < n) link(i, i + cols); }
  } else {
    for (let i = 0; i < n; i++) nodes.push({ x: random(100, width * 0.6), y: random(130, height - 60) });
    if (topology === 2) {
      for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) link(i, floor(random(n)));
    } else {
      // ハブあり：優先的選択で成長
      let deg = new Array(n).fill(0);
      link(0, 1); deg[0] = deg[1] = 1;
      for (let i = 2; i < n; i++) {
        for (let k = 0; k < 2; k++) {
          let total = deg.slice(0, i).reduce((a, b) => a + b, 0), r = random(total), t;
          for (t = 0; t < i; t++) { r -= deg[t]; if (r < 0) break; }
          t = min(t, i - 1); link(i, t); deg[i]++; deg[t]++;
        }
      }
    }
  }
  state[floor(random(n))] = 1; // 最初の感染者
}

function draw() {
  background(220, 40, 10);
  beta = map(mouseX, 0, width, 0.02, 0.4, true);

  // ★ 1 ステップ：感染者の隣に確率 β でうつす。感染者は確率 γ で回復
  if (running && frameCount % 6 === 0) {
    let next = state.slice();
    for (let i = 0; i < n; i++) {
      if (state[i] === 1) {
        for (let nb of adj[i]) if (state[nb] === 0 && random() < beta) next[nb] = 1;
        if (random() < gamma) next[i] = 2;
      }
    }
    state = next;
    let c = [0, 0, 0];
    for (let s of state) c[s]++;
    history.push(c);
    if (c[1] === 0) running = false;
  }

  for (let i = 0; i < n; i++) for (let j of adj[i]) if (j > i) { stroke(0, 0, 35); strokeWeight(1); line(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y); }
  for (let i = 0; i < n; i++) {
    noStroke();
    fill([200, 0, 120][state[i]], state[i] === 0 ? 30 : 80, state[i] === 0 ? 60 : 100);
    circle(nodes[i].x, nodes[i].y, state[i] === 1 ? 16 : 11);
  }

  // ---- 右：S/I/R の推移 ----
  let gx = width * 0.68, gw = width - gx - 40, gy = height * 0.25, gh = height * 0.5;
  stroke(0, 0, 30);
  line(gx, gy + gh, gx + gw, gy + gh);
  for (let s = 0; s < 3; s++) {
    noFill();
    stroke([200, 0, 120][s], 80, 100);
    strokeWeight(2.5);
    beginShape();
    for (let t = 0; t < history.length; t++) vertex(gx + (t / 200) * gw, gy + gh - (history[t][s] / n) * gh);
    endShape();
  }
  noStroke();
  textSize(14);
  fill(200, 30, 80); text('S 未感染', gx, gy - 10);
  fill(0, 80, 100); text('I 感染中', gx + 90, gy - 10);
  fill(120, 80, 100); text('R 回復', gx + 180, gy - 10);
  let c = [0, 0, 0];
  for (let s of state) c[s]++;
  fill(0, 0, 70);
  text('S ' + c[0] + '　I ' + c[1] + '　R ' + c[2] + '　最終的に感染した割合 ' + nf((100 * (c[1] + c[2])) / n, 1, 0) + ' %', gx, gy + gh + 24);

  fill(0, 0, 100);
  textSize(18);
  text('感染率 β = ' + nf(beta, 1, 2) + '（マウス左右）　1：格子　2：ランダム　3：ハブあり　スペースで' + (running ? '停止' : '開始') + '　点をクリック = ワクチン', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('ハブのあるネットワークは少ない β でも大流行する。ハブにワクチンを打つと止まりやすい（誰にワクチンを打つかの問題）', 20, 68);
}

function mousePressed() {
  for (let i = 0; i < n; i++) if (dist(mouseX, mouseY, nodes[i].x, nodes[i].y) < 12 && state[i] === 0) state[i] = 2;
}
function keyPressed() {
  if (key === ' ') running = !running;
  if (key >= '1' && key <= '3') { topology = int(key); build(); }
  if (key === 'r' || key === 'R') build();
}

// ---------- やってみよう ----------
// 1. 同じ β で 1・2・3 を比べる。最終的に感染した割合は？
// 2. ハブあり（3）で、いちばん線の多い点にワクチンを打ってから開始すると？
// 3. 回復率 γ を上げる（早く治る）と、流行の山はどう変わる？
