// ============================================
// 04 ホップクロフト＝カープ法
// 03 では増加道を 1 本ずつ見つけていた。ここでは 1 回の「フェーズ」で
// ① 幅優先探索で空いている左の点から層（距離）をつける ② 最短の増加道を、点がかぶらないように何本も同時に見つける ③ まとめて反転
// フェーズの回数は O(√V) で済む → 全体 O(E√V)
// スペース = 1 手 / A = 自動 / 上下 = 点の数 / R = ランダム
// ============================================

let n = 12;
let adj = [], matchL = [], matchR = [];
let distL = [], distR = [];
let paths = [];
let phase = 'bfs';
let phases = 0, augments = 0;
let auto = false, timer = 0;
let message = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomGraph();
}

function randomGraph() {
  adj = [];
  for (let i = 0; i < n; i++) {
    let a = [];
    for (let j = 0; j < n; j++) if (random() < 2.6 / n || abs(i - j) <= 0 && random() < 0.5) a.push(j);
    if (!a.length) a.push(floor(random(n)));
    adj.push(a);
  }
  matchL = new Array(n).fill(-1); matchR = new Array(n).fill(-1);
  // 最初に「欲張り」で少しだけマッチさせておく（こうすると長い増加道が出てくる）
  for (let i = 0; i < n; i++) for (let j of adj[i]) if (matchL[i] < 0 && matchR[j] < 0 && random() < 0.6) { matchL[i] = j; matchR[j] = i; }
  distL = []; distR = []; paths = []; phase = 'bfs'; phases = 0; augments = 0;
  message = 'スペースで、フェーズ 1 の層づけ（幅優先探索）';
}

let maxLayer = Infinity;
function bfsLayers() {
  distL = new Array(n).fill(Infinity); distR = new Array(n).fill(Infinity);
  let q = [];
  for (let i = 0; i < n; i++) if (matchL[i] < 0) { distL[i] = 0; q.push(i); }
  maxLayer = Infinity;
  while (q.length) {
    let i = q.shift();
    if (distL[i] >= maxLayer) continue;
    for (let j of adj[i]) {
      if (matchL[i] === j || distR[j] < Infinity) continue;
      distR[j] = distL[i] + 1;
      let k = matchR[j];
      if (k < 0) maxLayer = min(maxLayer, distR[j]);
      else if (distL[k] === Infinity) { distL[k] = distR[j] + 1; q.push(k); }
    }
  }
  return maxLayer < Infinity;
}

// 層に沿って、点がかぶらない最短の増加道を集める（深さ優先）
function collectPaths() {
  let usedR = new Array(n).fill(false), deadL = new Array(n).fill(false);
  paths = [];
  function dfs(i, acc) {
    for (let j of adj[i]) {
      if (usedR[j] || matchL[i] === j || distR[j] !== distL[i] + 1) continue;
      usedR[j] = true;
      let k = matchR[j];
      if (k < 0) { if (distR[j] === maxLayer) { paths.push([...acc, [i, j]]); return true; } continue; }
      if (!deadL[k] && dfs(k, [...acc, [i, j], [k, j, 'm']])) return true;
    }
    deadL[i] = true;
    return false;
  }
  for (let i = 0; i < n; i++) if (matchL[i] < 0) dfs(i, []);
}

function advance() {
  if (phase === 'bfs') {
    if (!bfsLayers()) { phase = 'done'; auto = false; message = '増加道がもうない → 最大マッチング ' + matchingSize() + ' 組（フェーズ ' + phases + ' 回）'; return; }
    phases++;
    phase = 'paths';
    message = 'フェーズ ' + phases + '：数字 = 層（距離）。最短の増加道の長さ = ' + maxLayer;
  } else if (phase === 'paths') {
    collectPaths();
    phase = 'flip';
    message = '点がかぶらない最短の増加道を ' + paths.length + ' 本、同時に見つけた（色ちがい）';
  } else if (phase === 'flip') {
    for (let p of paths) {
      for (let [i, j, m] of p) if (m) { matchL[i] = -1; matchR[j] = -1; }
      for (let [i, j, m] of p) if (!m) { matchL[i] = j; matchR[j] = i; }
    }
    augments += paths.length;
    message = paths.length + ' 本まとめて反転 → ' + matchingSize() + ' 組。次のフェーズへ';
    paths = []; distL = []; distR = []; phase = 'bfs';
  }
}

function matchingSize() { return matchL.filter((j) => j >= 0).length; }
function lx() { return width * 0.32; }
function rx() { return width * 0.68; }
function yy(i) { return map(i, 0, n - 1, height * 0.15, height * 0.86); }

function draw() {
  background(275, 30, 9);
  if (auto && ++timer % 50 === 0) advance();
  for (let i = 0; i < n; i++) for (let j of adj[i]) {
    let m = matchL[i] === j;
    stroke(m ? color(195, 80, 100) : color(275, 15, 40)); strokeWeight(m ? 6 : 1.5);
    line(lx(), yy(i), rx(), yy(j));
  }
  paths.forEach((p, k) => {
    for (let [i, j, m] of p) {
      stroke((k * 67 + 40) % 360, 85, 100); strokeWeight(5);
      if (m) drawingContext.setLineDash([10, 8]);
      line(lx(), yy(i), rx(), yy(j));
      drawingContext.setLineDash([]);
    }
  });
  noStroke(); textAlign(CENTER, CENTER);
  for (let i = 0; i < n; i++) drawDot(lx(), yy(i), 'L' + i, matchL[i] >= 0, distL[i]);
  for (let j = 0; j < n; j++) drawDot(rx(), yy(j), 'R' + j, matchR[j] >= 0, distR[j]);
  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('スペース：1 手　A：自動　上下：点の数 ' + n + '　R：ランダム', 20, 36);
  textSize(15); fill(0, 0, 65);
  text('青 = マッチング。数字 = 層（空いている左の点からの距離）。点線 = 解消するペア', 20, 62);
  fill(45, 80, 100); textSize(20); text(message, 20, height - 26);
  textAlign(RIGHT, BASELINE); fill(0, 0, 100); textSize(22);
  text('マッチング ' + matchingSize() + ' 組', width - 30, 110);
  fill(0, 0, 75); textSize(17);
  text('フェーズ ' + phases + ' 回', width - 30, 140);
  text('増加道 ' + augments + ' 本', width - 30, 166);
  text('03 の方法なら増加道 1 本 = 1 回', width - 30, 192);
  textAlign(LEFT, BASELINE);
}

function drawDot(x, y, s, on, d) {
  fill(on ? color(195, 60, 95) : color(275, 10, 85));
  circle(x, y, 34);
  fill(0, 0, 10); textSize(12); text(s, x, y);
  if (d !== undefined && d < Infinity) { fill(45, 90, 100); textSize(16); text(d, x + (x < width / 2 ? -34 : 34), y); }
}

function keyPressed() {
  if (key === ' ') advance();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === UP_ARROW) { n = min(20, n + 2); randomGraph(); }
  if (key === DOWN_ARROW) { n = max(4, n - 2); randomGraph(); }
  if (key === 'r' || key === 'R') randomGraph();
}

// ---------- やってみよう ----------
// 1. 点を 20 にして、フェーズ回数と増加道の本数を比べる（フェーズ ≪ 本数）
// 2. フェーズが進むほど、最短の増加道は長くなる（層の数字が大きくなる）
// 3. 最初の「欲張り」マッチ（randomGraph の 0.6）を 0 にすると？
