// ============================================
// 15 プッシュ再ラベル法（発展）
// 道を探すのをやめて、水を「高いところから低いところへ」押し流す
// はじめに s を高さ |V| に持ち上げ、s から出るパイプを満杯にする。各点にたまった水（超過）を
// プッシュ：1 段低い隣へ押し出す / 再ラベル：押し出せないなら自分を持ち上げる（隣の最低 + 1）
// 1：一般のプッシュ再ラベル（ランダムに選ぶ）O(V²E)　2：リラベル・トゥ・フロント（リスト順に排出）O(V³)
// スペース = 1 操作 / A = 自動 / R = 最初から
// ============================================

let names = ['s', 'a', 'b', 'c', 'd', 't'];
let V = 6, Cap, F, h, ex;
let mode = 1;
let L = [], cur = [], nbrs = [], uIdx = 0;
let opLog = [];
let auto = false, timer = 0;
let ops = { push: 0, relabel: 0 };
let shownH = [];
let lastEdge = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  init();
}

function init() {
  Cap = [...Array(V)].map(() => new Array(V).fill(0));
  for (let [u, v, c] of [[0, 1, 10], [0, 2, 12], [1, 2, 3], [1, 3, 9], [1, 4, 4], [2, 4, 11], [4, 3, 5], [3, 5, 15], [4, 5, 9]]) Cap[u][v] = c;
  F = [...Array(V)].map(() => new Array(V).fill(0));
  h = new Array(V).fill(0); ex = new Array(V).fill(0);
  h[0] = V;
  // 前フロー：s から出るパイプを満杯に
  for (let v = 0; v < V; v++) if (Cap[0][v] > 0) { F[0][v] = Cap[0][v]; F[v][0] = -Cap[0][v]; ex[v] += Cap[0][v]; ex[0] -= Cap[0][v]; }
  nbrs = [...Array(V)].map((_, u) => [...Array(V).keys()].filter((v) => v !== u && (Cap[u][v] > 0 || Cap[v][u] > 0)));
  cur = new Array(V).fill(0);
  L = [1, 2, 3, 4]; uIdx = 0;
  opLog = ['初期化：s の高さ = |V| = ' + V + '、s から出るパイプを満杯に'];
  ops = { push: 0, relabel: 0 };
  if (!shownH.length) shownH = h.map((x) => x);
  auto = false; lastEdge = null;
}

function cf(u, v) { return Cap[u][v] - F[u][v]; }

function pushFlow(u, v) {
  let d = min(ex[u], cf(u, v));
  F[u][v] += d; F[v][u] -= d; ex[u] -= d; ex[v] += d;
  ops.push++; lastEdge = [u, v];
  say('プッシュ ' + names[u] + ' → ' + names[v] + '：' + d + ' 流す（' + names[u] + ' の高さ ' + h[u] + ' → ' + h[v] + '）');
}

function relabel(u) {
  let m = Infinity;
  for (let v of nbrs[u]) if (cf(u, v) > 0) m = min(m, h[v]);
  h[u] = 1 + m; ops.relabel++; lastEdge = null;
  say('再ラベル ' + names[u] + '：押し出せる隣の最低の高さ ' + m + ' + 1 = ' + h[u] + ' に持ち上げる');
}

function say(s) { opLog.push(s); if (opLog.length > 8) opLog.shift(); }

function active() { return [1, 2, 3, 4].filter((u) => ex[u] > 0); }

function operate() {
  if (mode === 1) {
    let A = active();
    if (!A.length) return finish();
    let u = random(A);
    let v = nbrs[u].find((w) => cf(u, w) > 0 && h[u] === h[w] + 1);
    if (v !== undefined) pushFlow(u, v); else relabel(u);
  } else {
    // リラベル・トゥ・フロント：リスト L を前から見て、u の超過がなくなるまで排出（DISCHARGE）
    if (uIdx >= L.length) return finish();
    let u = L[uIdx];
    if (ex[u] <= 0) { uIdx++; if (uIdx >= L.length) finish(); return; }
    let v = nbrs[u][cur[u]];
    if (v === undefined) {
      relabel(u); cur[u] = 0;
      // 持ち上げたら u をリストの先頭へ
      L.splice(uIdx, 1); L.unshift(u); uIdx = 0;
      say('　→ ' + names[u] + ' をリストの先頭へ移動');
    } else if (cf(u, v) > 0 && h[u] === h[v] + 1) pushFlow(u, v);
    else cur[u]++;
    if (ex[u] <= 0) uIdx++;
  }
}

function finish() { auto = false; if (!opLog[opLog.length - 1].startsWith('完成')) say('完成！ 超過のある点がない → 最大フロー = ' + ex[5]); }

function nodePos(i) {
  let xs = [0.1, 0.33, 0.33, 0.6, 0.6, 0.83];
  let zs = [0, -1, 1, -1, 1, 0];
  let unit = (height - 260) / (2 * V);
  return { x: width * xs[i], y: height - 90 - shownH[i] * unit + zs[i] * 18, unit };
}

function draw() {
  background(250, 30, 9);
  if (auto && ++timer % 25 === 0) operate();
  for (let i = 0; i < V; i++) shownH[i] = lerp(shownH[i], h[i], 0.12);
  let unit = (height - 260) / (2 * V);
  // 高さの目盛り
  for (let k = 0; k <= 2 * V; k++) {
    let y = height - 90 - k * unit;
    stroke(250, 20, k === V ? 40 : 20); strokeWeight(1); line(40, y, width - 340, y);
    noStroke(); fill(0, 0, 50); textSize(11); textAlign(RIGHT, CENTER); text(k, 34, y);
  }
  // パイプ
  for (let u = 0; u < V; u++) for (let v = 0; v < V; v++) if (Cap[u][v] > 0) {
    let A = nodePos(u), B = nodePos(v);
    let ang = atan2(B.y - A.y, B.x - A.x);
    let ax = A.x + cos(ang) * 26, ay = A.y + sin(ang) * 26, bx = B.x - cos(ang) * 28, by = B.y - sin(ang) * 28;
    let hot = lastEdge && ((lastEdge[0] === u && lastEdge[1] === v) || (lastEdge[0] === v && lastEdge[1] === u));
    stroke(250, 15, 32); strokeWeight(3 + Cap[u][v] * 0.4); line(ax, ay, bx, by);
    if (F[u][v] > 0) { stroke(hot ? color(50, 90, 100) : color(195, 80, 95)); strokeWeight(1 + F[u][v] * 0.4); line(ax, ay, bx, by); }
    noStroke(); fill(0, 0, 85);
    triangle(bx, by, bx - cos(ang - 0.45) * 13, by - sin(ang - 0.45) * 13, bx - cos(ang + 0.45) * 13, by - sin(ang + 0.45) * 13);
    textAlign(CENTER, CENTER); textSize(13);
    text(max(0, F[u][v]) + '/' + Cap[u][v], (ax + bx) / 2 - sin(ang) * 15, (ay + by) / 2 + cos(ang) * 15);
  }
  // 点（高さ = 縦の位置）、超過 = 水のかたまり
  for (let i = 0; i < V; i++) {
    let p = nodePos(i);
    let isCur = mode === 2 && L[uIdx] === i;
    if (ex[i] > 0 && i !== 0 && i !== 5) { fill(195, 80, 100, 50); noStroke(); circle(p.x, p.y, 50 + ex[i] * 3); }
    stroke(isCur ? color(50, 90, 100) : color(0, 0, 0, 0)); strokeWeight(4);
    fill(i === 0 ? color(140, 70, 85) : i === 5 ? color(20, 75, 95) : color(250, 12, 88));
    circle(p.x, p.y, 46);
    noStroke(); fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(15); text(names[i], p.x, p.y);
    fill(0, 0, 85); textSize(12); text('h=' + h[i] + (i !== 0 ? '  e=' + ex[i] : ''), p.x, p.y + 36);
  }
  // 右のパネル
  let px = width - 320;
  textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(20);
  text(mode === 1 ? '1：一般のプッシュ再ラベル' : '2：リラベル・トゥ・フロント', px, 110);
  fill(0, 0, 80); textSize(16);
  text('プッシュ ' + ops.push + ' 回　再ラベル ' + ops.relabel + ' 回', px, 140);
  text('t に届いた量 ' + ex[5], px, 166);
  if (mode === 2) {
    text('リスト L：', px, 204);
    L.forEach((u, k) => { fill(k === uIdx ? color(50, 90, 100) : color(0, 0, 80)); text(names[u], px + 80 + k * 46, 204); });
    fill(0, 0, 65); textSize(13);
    if (L[uIdx] !== undefined) { let u = L[uIdx]; text(names[u] + ' の隣リスト：' + nbrs[u].map((v, k) => (k === cur[u] ? '[' + names[v] + ']' : names[v])).join(' '), px, 228); }
  }
  fill(0, 0, 75); textSize(13);
  opLog.forEach((s, k) => text(s, px, 270 + k * 40, 310, 40));
  fill(0, 0, 100); textSize(18);
  text('スペース：1 操作　A：自動　1：一般　2：リラベル・トゥ・フロント　R：最初から', 20, 36);
  textSize(15); fill(0, 0, 65);
  text('縦の位置 = 高さ h。水は「ちょうど 1 段低い」隣にしか流れない。行き場のない水は s まで戻る（高さ |V| を超えて持ち上がる）', 20, 62);
}

function keyPressed() {
  if (key === ' ') operate();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === '1' || key === '2') { mode = int(key); init(); }
  if (key === 'r' || key === 'R') init();
}

// ---------- やってみよう ----------
// 1. 1 と 2 で、プッシュと再ラベルの回数を比べる（どちらも最大フローは 21）
// 2. 途中で水が s に押し戻されるのはどんなとき？（s の高さ 6 を超えた点から）
// 3. 高さが 2|V| − 1 を超えないことが、計算が必ず終わる理由になっている
