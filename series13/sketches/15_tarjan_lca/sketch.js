// ============================================
// 15 タージャンのオフライン LCA ─ 深さ優先探索 × 互いに素な集合
// 木の 2 点の「いちばん近い共通の祖先（LCA）」を、質問をまとめて 1 回の深さ優先探索で全部答える
// 子を調べ終わるたびに子の集合を親の集合へ UNION し、その集合の ancestor を親にする。質問の相手がもう黒（調べ終わった）なら答え = ancestor[FIND-SET(相手)]
// スペース = 1 歩 / A = 自動再生 / 2 つの節点を順にクリック = 質問を追加 / N = 新しい木 / R = 最初から
// ============================================

let NN = 15;          // ★ 節点の数
let NQ = 5;           // ★ 最初の質問の数
let SPEED = 0.7;      // ★ 自動再生の秒数

let kids = [], par = [], queries = [];
let frames = [], fi = 0, auto = false, timer = 0;
let pos = [], sel = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  newTree();
}

function newTree() {
  kids = Array.from({ length: NN }, () => []); par = [-1];
  for (let v = 1; v < NN; v++) {
    let p;
    do p = floor(random(v)); while (kids[p].length >= 3);
    kids[p].push(v); par[v] = p;
  }
  queries = [];
  while (queries.length < NQ) {
    let a = floor(random(NN)), b = floor(random(NN));
    if (a !== b && !queries.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) queries.push([a, b]);
  }
  build();
}

// LCA(u) を実行して、各段階をコマとして記録
function build() {
  let parent = Array(NN).fill(-1), ancestor = Array(NN).fill(-1), black = Array(NN).fill(false), answers = {};
  frames = []; fi = 0;
  let find = (x) => { while (parent[x] !== x) x = parent[x]; return x; };
  let snap = (u, msg, hiQ) => frames.push({ u, msg, hiQ, parent: [...parent], ancestor: [...ancestor], black: [...black], answers: { ...answers } });
  snap(-1, 'LCA(根) から深さ優先探索を始める', -1);
  (function LCA(u) {
    parent[u] = u; ancestor[u] = u;
    snap(u, `MAKE-SET(${u})、ancestor = ${u}`, -1);
    for (let v of kids[u]) {
      LCA(v);
      let a = find(u), b = find(v);
      parent[b] = a;                              // UNION(u, v)
      ancestor[find(u)] = u;
      snap(u, `子 ${v} を調べ終えた → UNION(${u}, ${v})、その集合の ancestor = ${u}`, -1);
    }
    black[u] = true;
    snap(u, `${u} を黒にする（${u} の部分木は全部調べ終えた）`, -1);
    queries.forEach(([a, b], qi) => {
      let v = a === u ? b : b === u ? a : -1;
      if (v < 0) return;
      if (black[v]) {
        answers[qi] = ancestor[find(v)];
        snap(u, `質問 {${a}, ${b}}：${v} はもう黒 → LCA = ancestor[FIND-SET(${v})] = ${answers[qi]}`, qi);
      } else snap(u, `質問 {${a}, ${b}}：${v} はまだ白 → ${v} を訪れたときに答える`, qi);
    });
  })(0);
  snap(-1, '全部の質問に答えた。全体で O(n + |P|) 回の集合操作', -1);
}

function depthOf(v) { let d = 0; while (par[v] >= 0) { v = par[v]; d++; } return d; }
function leaves(v) { return kids[v].length ? kids[v].reduce((s, c) => s + leaves(c), 0) : 1; }

function draw() {
  background(210, 30, 9);
  if (auto) { timer += deltaTime / 1000; if (timer > SPEED && fi < frames.length - 1) { timer = 0; fi++; } }
  let F = frames[fi];
  // 配置
  let W = width - 380, u = min(70, W / leaves(0)), maxD = max(...Array.from({ length: NN }, (_, v) => depthOf(v)));
  let LH = min(90, (height - 260) / max(1, maxD)), tg = [];
  (function place(v, left, d) {
    let cx;
    if (!kids[v].length) cx = left + u / 2;
    else { let cs = []; for (let c of kids[v]) { cs.push(place(c, left, d + 1)); left += leaves(c) * u; } cx = (cs[0] + cs[cs.length - 1]) / 2; }
    tg[v] = { x: cx, y: 160 + d * LH };
    return cx;
  })(0, 30 + (W - leaves(0) * u) / 2, 0);
  for (let v = 0; v < NN; v++) {
    if (!pos[v]) pos[v] = { ...tg[v] };
    pos[v].x = lerp(pos[v].x, tg[v].x, 0.15); pos[v].y = lerp(pos[v].y, tg[v].y, 0.15);
  }
  let find = (x) => { while (F.parent[x] !== x) x = F.parent[x]; return x; };

  // 辺
  stroke(210, 20, 45); strokeWeight(2);
  for (let v = 1; v < NN; v++) line(pos[v].x, pos[v].y, pos[par[v]].x, pos[par[v]].y);
  // 質問の弧
  noFill();
  queries.forEach(([a, b], qi) => {
    let ans = F.answers[qi], on = F.hiQ === qi;
    stroke(ans !== undefined ? color(50, 85, 100, 80) : on ? color(0, 0, 100) : color(210, 30, 70, 60));
    strokeWeight(on ? 3 : 2); drawingContext.setLineDash([6, 6]);
    let mx = (pos[a].x + pos[b].x) / 2, my = min(pos[a].y, pos[b].y) - 60 - qi * 8;
    bezier(pos[a].x, pos[a].y, mx, my, mx, my, pos[b].x, pos[b].y);
    drawingContext.setLineDash([]);
  });
  // 節点
  let d = constrain(u * 0.6, 22, 40);
  textAlign(CENTER, CENTER);
  for (let v = 0; v < NN; v++) {
    let p = pos[v], inSet = F.parent[v] >= 0, rt = inSet ? find(v) : -1, hue = (rt * 53) % 360;
    let isAnc = inSet && F.ancestor[rt] === v;
    noStroke();
    if (isAnc) { fill(hue, 70, 90, 30); circle(p.x, p.y, d * 1.8); }
    fill(inSet ? color(hue, 55, 75) : color(210, 10, 30));
    stroke(F.u === v ? color(50, 90, 100) : F.black[v] ? color(0, 0, 0) : color(0, 0, 90)); strokeWeight(F.u === v ? 4 : F.black[v] ? 4 : 1);
    if (sel === v) { stroke(0, 0, 100); strokeWeight(4); }
    circle(p.x, p.y, d);
    noStroke(); fill(0, 0, 10); textSize(d * 0.42); text(v, p.x, p.y);
    let hasAns = Object.entries(F.answers).filter(([qi, a]) => a === v);
    if (hasAns.length) { fill(50, 90, 100); textSize(12); text('LCA', p.x, p.y + d / 2 + 10); }
  }

  // パネル
  let px = width - 330;
  textAlign(LEFT, TOP); noStroke(); fill(0, 0, 100); textSize(16); text('質問 P と答え', px, 150);
  textSize(15);
  queries.forEach(([a, b], qi) => {
    let ans = F.answers[qi];
    fill(F.hiQ === qi ? color(50, 90, 100) : color(0, 0, 85));
    text(`{${a}, ${b}} → ${ans === undefined ? '?' : 'LCA = ' + ans}`, px, 180 + qi * 26);
  });
  fill(0, 0, 70); textSize(13);
  text('色 = 集合（同じ色は同じ集合）\nうすい輪 = その集合の ancestor\n黒い縁 = 調べ終えた（BLACK）\n黄色い縁 = いま調べている節点', px, 200 + queries.length * 26);

  fill(0, 0, 100); textSize(26); textAlign(LEFT, TOP); text('タージャンのオフライン LCA', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`コマ ${fi + 1} / ${frames.length}`, 24, 56);
  fill(50, 80, 100); textSize(17); text(F.msg, 24, 86);
  fill(0, 0, 60); textSize(14);
  text(`スペース = 1 歩 / A = 自動再生${auto ? '（ON）' : ''} / 2 つの節点を順にクリック = 質問を追加 / N = 新しい木 / R = 最初から`, 24, height - 30);
}

function mousePressed() {
  for (let v = 0; v < NN; v++) if (pos[v] && dist(mouseX, mouseY, pos[v].x, pos[v].y) < 20) {
    if (sel < 0) sel = v;
    else { if (sel !== v) { queries.push([sel, v]); if (queries.length > 9) queries.shift(); build(); } sel = -1; }
    return;
  }
  sel = -1;
}

function keyPressed() {
  if (key === ' ') { if (fi < frames.length - 1) fi++; return false; }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'n' || key === 'N') { pos = []; newTree(); }
  if (key === 'r' || key === 'R') { fi = 0; }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
