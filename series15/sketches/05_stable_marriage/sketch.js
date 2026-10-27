// ============================================
// 05 安定マッチング（ゲール＝シャプレー法）
// 左の人（申し込む側）と右の人（受ける側）がそれぞれ好きな順番を持っている
// 空いている人が、まだ断られていない中で一番好きな相手に申し込む。受ける側は今の相手より好きなら乗りかえる
// 終わると「おたがい今の相手より好き同士」のペア（ブロッキングペア）が 1 つもない = 安定
// スペース = 1 手 / A = 自動 / S = 申し込む側を入れかえ / 上下 = 人数 / R = 好みをランダム
// ============================================

let n = 6;
let prefP = [], prefQ = [];   // prefP[i] = 申し込む側 i の好きな順、prefQ[j] = 受ける側 j の好きな順
let rankQ = [];
let next = [], partnerP = [], partnerQ = [];
let proposals = 0;
let last = null;              // {i, j, ok, dumped}
let auto = false, timer = 0;
let swapped = false;
let namesA = 'ABCDEFGHIJ', namesB = '①②③④⑤⑥⑦⑧⑨⑩';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomPrefs();
}

function shuffled() { let a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { let k = floor(random(i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; }

function randomPrefs() {
  prefP = []; prefQ = [];
  for (let i = 0; i < n; i++) { prefP.push(shuffled()); prefQ.push(shuffled()); }
  swapped = false;
  restart();
}

function restart() {
  rankQ = prefQ.map((p) => { let r = []; p.forEach((x, k) => (r[x] = k)); return r; });
  next = new Array(n).fill(0); partnerP = new Array(n).fill(-1); partnerQ = new Array(n).fill(-1);
  proposals = 0; last = null;
}

function proposeOnce() {
  let i = partnerP.findIndex((p, k) => p < 0 && next[k] < n);
  if (i < 0) { auto = false; return; }
  let j = prefP[i][next[i]++];
  proposals++;
  let cur = partnerQ[j];
  if (cur < 0) { partnerQ[j] = i; partnerP[i] = j; last = { i, j, ok: true }; }
  else if (rankQ[j][i] < rankQ[j][cur]) { partnerP[cur] = -1; partnerQ[j] = i; partnerP[i] = j; last = { i, j, ok: true, dumped: cur }; }
  else last = { i, j, ok: false };
}

function finished() { return partnerP.every((p) => p >= 0); }

// ブロッキングペアを数える：i は今の相手より j が好き、j も今の相手より i が好き
function blocking() {
  let out = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (partnerP[i] === j || partnerP[i] < 0 || partnerQ[j] < 0) continue;
    if (prefP[i].indexOf(j) < prefP[i].indexOf(partnerP[i]) && rankQ[j][i] < rankQ[j][partnerQ[j]]) out.push([i, j]);
  }
  return out;
}

function satisfaction(side) {
  let s = 0;
  for (let i = 0; i < n; i++) s += side === 'P' ? (partnerP[i] >= 0 ? prefP[i].indexOf(partnerP[i]) + 1 : 0) : (partnerQ[i] >= 0 ? rankQ[i][partnerQ[i]] + 1 : 0);
  return s;
}

function py(i) { return map(i, 0, n - 1, height * 0.2, height * 0.82); }

function draw() {
  background(330, 25, 10);
  if (auto && ++timer % 30 === 0) proposeOnce();
  let ax = width * 0.38, bx = width * 0.62;
  // ペアの線
  for (let i = 0; i < n; i++) if (partnerP[i] >= 0) { stroke(330, 70, 100); strokeWeight(6); line(ax, py(i), bx, py(partnerP[i])); }
  if (last) { stroke(last.ok ? color(140, 70, 95) : color(0, 0, 60)); strokeWeight(3); drawingContext.setLineDash([8, 6]); line(ax, py(last.i), bx, py(last.j)); drawingContext.setLineDash([]); }
  let bl = finished() ? blocking() : [];
  for (let [i, j] of bl) { stroke(0, 90, 100); strokeWeight(3); line(ax, py(i), bx, py(j)); }
  noStroke(); textAlign(CENTER, CENTER);
  let A = swapped ? namesB : namesA, B = swapped ? namesA : namesB;
  for (let i = 0; i < n; i++) {
    fill(partnerP[i] >= 0 ? color(200, 50, 95) : color(0, 0, 70)); circle(ax, py(i), 44);
    fill(0, 0, 10); textSize(18); text(A[i], ax, py(i));
    // 好きな順のチップ（断られたものは暗く）
    for (let k = 0; k < n; k++) {
      let j = prefP[i][k], x = ax - 60 - (n - k) * 30;
      fill(k < next[i] && partnerP[i] !== j ? color(0, 0, 25) : partnerP[i] === j ? color(330, 70, 100) : color(30, 20, 85));
      rect(x - 13, py(i) - 13, 26, 26, 5);
      fill(0, 0, 10); textSize(14); text(B[j], x, py(i));
    }
    let j = i;
    fill(partnerQ[j] >= 0 ? color(30, 60, 95) : color(0, 0, 70)); circle(bx, py(j), 44);
    fill(0, 0, 10); textSize(18); text(B[j], bx, py(j));
    for (let k = 0; k < n; k++) {
      let p = prefQ[j][k], x = bx + 60 + k * 30;
      fill(partnerQ[j] === p ? color(330, 70, 100) : color(200, 15, 85));
      rect(x - 13, py(j) - 13, 26, 26, 5);
      fill(0, 0, 10); textSize(14); text(A[p], x, py(j));
    }
  }
  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('スペース：1 手　A：自動　S：申し込む側を入れかえ　上下：人数 ' + n + '　R：好みをランダム', 20, 36);
  textSize(15); fill(0, 0, 65);
  text('チップ = 好きな順（左ほど好き）。暗いチップ = 断られた相手。桃色 = 今の相手', 20, 62);
  let msg;
  if (finished()) msg = '完成！ 申し込み ' + proposals + ' 回（最大 n² = ' + n * n + '）。ブロッキングペア ' + bl.length + ' 組 → ' + (bl.length ? '不安定' : '安定');
  else if (!last) msg = 'スペースで、空いている左の人が申し込む';
  else msg = A[last.i] + ' → ' + B[last.j] + '：' + (last.ok ? 'OK' + (last.dumped !== undefined ? '（' + A[last.dumped] + ' は振られて空きに）' : '') : 'ごめんなさい（今の相手の方が好き）');
  fill(45, 80, 100); textSize(20); text(msg, 20, height - 56);
  fill(0, 0, 80); textSize(16);
  text('相手の順位の合計（小さいほど満足）　申し込む側 ' + satisfaction('P') + '　受ける側 ' + satisfaction('Q') + '　→ 申し込む側が得をする', 20, height - 24);
}

function keyPressed() {
  if (key === ' ') proposeOnce();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 's' || key === 'S') { [prefP, prefQ] = [prefQ, prefP]; swapped = !swapped; restart(); }
  if (key === UP_ARROW) { n = min(10, n + 1); randomPrefs(); }
  if (key === DOWN_ARROW) { n = max(3, n - 1); randomPrefs(); }
  if (key === 'r' || key === 'R') randomPrefs();
}

// ---------- やってみよう ----------
// 1. S で申し込む側を入れかえる。結果のペアと「満足度」はどう変わる？（申し込む側に最適な安定マッチング）
// 2. 申し込む順番（findIndex でいちばん上の人から）を変えても、結果は同じになる
// 3. 研修医と病院のマッチング、学校の選択制で実際に使われている（2012 年ノーベル経済学賞）
