// ============================================
// 06 スケールフリー・ネットワーク（金持ちはますます金持ちに）
// 新しい点が来るたび「すでにつながりの多い点」に優先的につながる（優先的選択）と、
// 少数の「ハブ」と大多数の「末端」ができる。Web、SNS、航空路線、タンパク質の相互作用…
// 自動で成長 / マウス左右 = 速さ / 1 = 優先的選択 / 2 = ランダムにつなぐ（比較） / R でやり直し
// ============================================

let nodes = [], edges = [], deg = [];
let preferential = true;
let maxN = 150;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  nodes = []; edges = []; deg = [];
  for (let i = 0; i < 3; i++) { nodes.push({ x: width * 0.35 + random(-50, 50), y: height * 0.55 + random(-50, 50), vx: 0, vy: 0 }); deg.push(2); }
  edges = [[0, 1], [1, 2], [2, 0]];
}

// ★ 新しい点を 2 本のエッジで追加
function addNode() {
  let i = nodes.length;
  nodes.push({ x: width * 0.35 + random(-200, 200), y: height * 0.55 + random(-200, 200), vx: 0, vy: 0 });
  deg.push(0);
  let targets = new Set();
  while (targets.size < 2) {
    let t;
    if (preferential) {
      // 次数に比例した確率で選ぶ（くじ：次数ぶんの札を入れる）
      let total = deg.slice(0, i).reduce((a, b) => a + b, 0);
      let r = random(total);
      for (t = 0; t < i; t++) { r -= deg[t]; if (r < 0) break; }
      t = min(t, i - 1);
    } else t = floor(random(i));
    targets.add(t);
  }
  for (let t of targets) { edges.push([i, t]); deg[i]++; deg[t]++; }
}

function draw() {
  background(220, 40, 10);
  let speed = floor(map(mouseX, 0, width, 1, 6, true));
  if (nodes.length < maxN && frameCount % max(1, 7 - speed) === 0) addNode();
  forces();

  for (let [a, b] of edges) {
    stroke(0, 0, 40, 60);
    strokeWeight(1);
    line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y);
  }
  let maxDeg = max(...deg);
  for (let i = 0; i < nodes.length; i++) {
    noStroke();
    fill(map(deg[i], 2, maxDeg, 200, 40), 80, 100);
    circle(nodes[i].x, nodes[i].y, 6 + sqrt(deg[i]) * 5);
  }

  // ---- 次数分布（右）----
  let hist = {};
  for (let d of deg) hist[d] = (hist[d] || 0) + 1;
  let rx = width * 0.68, rw = width - rx - 50, base = height * 0.8, top = height * 0.25;
  stroke(0, 0, 30);
  line(rx, base, rx + rw, base);
  line(rx, base, rx, top);
  noStroke();
  // 両対数で描く
  for (let d in hist) {
    let x = map(log(int(d)), log(1), log(max(maxDeg, 2) + 1), rx, rx + rw);
    let y = map(log(hist[d]), 0, log(nodes.length), base, top);
    fill(45, 90, 100);
    circle(x, y, 8);
  }
  fill(0, 0, 60);
  textSize(13);
  text('次数 →（対数）', rx + rw - 90, base + 20);
  text('点の数（対数）', rx, top - 10);
  text(preferential ? '直線に近い = べき乗則（スケールフリー）' : 'まとまった山 = ランダムグラフ', rx, top + 20);

  fill(0, 0, 100);
  textSize(18);
  text((preferential ? '優先的選択：つながりの多い点ほど選ばれやすい' : 'ランダム：どの点も同じ確率') + '（1 / 2）　点 ' + nodes.length + '　最大次数 ' + maxDeg + '　R でやり直し', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('バラバシ＝アルバート（1999）。ハブ（赤）が生まれるのは、新しい点が「人気のある点」を選ぶから。Google の検索結果が上位に集中するのも同じ', 20, 68);
}

function forces() {
  for (let i = 0; i < nodes.length; i++) {
    let fx = (width * 0.35 - nodes[i].x) * 0.003, fy = (height * 0.55 - nodes[i].y) * 0.003;
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      let dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d2 = max(dx * dx + dy * dy, 64);
      fx += (dx / d2) * 400; fy += (dy / d2) * 400;
    }
    nodes[i].vx = (nodes[i].vx + fx) * 0.5; nodes[i].vy = (nodes[i].vy + fy) * 0.5;
  }
  for (let [a, b] of edges) {
    let dx = nodes[b].x - nodes[a].x, dy = nodes[b].y - nodes[a].y, d = max(sqrt(dx * dx + dy * dy), 1);
    let f = (d - 40) * 0.01;
    nodes[a].vx += (dx / d) * f; nodes[a].vy += (dy / d) * f; nodes[b].vx -= (dx / d) * f; nodes[b].vy -= (dy / d) * f;
  }
  for (let nd of nodes) { nd.x += nd.vx; nd.y += nd.vy; }
}

function keyPressed() {
  if (key === '1') { preferential = true; reset(); }
  if (key === '2') { preferential = false; reset(); }
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. 1 と 2 で、右のグラフの形を比べる。優先的選択だけが「直線」になる
// 2. ハブを 1 つ壊すと（エッジを消す）ネットワークはどうなる？ 末端を壊すと？（攻撃への弱さ）
// 3. 新しい点のエッジ数 2 を 1 にすると木（ツリー）になる
