// ============================================
// 11 声で連鎖を起こす（しきい値モデル）
// 各点は「隣の○割以上が活性化したら自分も活性化」する。声の大きさで中心の点を押すと、連鎖が走る
// 噂・流行・バズ・停電の連鎖、全部このモデル。どこまで広がるかはネットワークの形しだい
// クリックでマイク ON / マウス左右 = しきい値 / R で新しいネットワーク・リセット
// ============================================

let n = 100, nodes = [], adj = [], edges = [];
let active = [];
let threshold = 0.3;
let vol = 0;
let cascadeCount = 0;
let cooldown = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  build();
}

function build() {
  nodes = []; adj = []; edges = []; active = new Array(n).fill(0);
  for (let i = 0; i < n; i++) { nodes.push({ x: random(60, width - 60), y: random(120, height - 40) }); adj.push([]); }
  // 近い点どうしをつなぐ
  for (let i = 0; i < n; i++) {
    let near = nodes.map((p, j) => ({ j, d: dist(nodes[i].x, nodes[i].y, p.x, p.y) })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 4);
    for (let o of near) if (!adj[i].includes(o.j)) { adj[i].push(o.j); adj[o.j].push(i); edges.push([i, o.j]); }
  }
}

function draw() {
  background(220, 40, 10);
  threshold = map(mouseX, 0, width, 0.1, 0.8, true);
  vol = lerp(vol, getMicLevel(), 0.2);

  // ★ 声が大きいとき、マイクの近く（画面中央）の点を活性化する
  if (vol > 0.06 && cooldown <= 0) {
    let cx = width / 2, cy = height / 2 + 40;
    let r = map(vol, 0.06, 0.3, 40, 200, true);
    for (let i = 0; i < n; i++) if (dist(nodes[i].x, nodes[i].y, cx, cy) < r) active[i] = 1;
    cooldown = 20;
  }
  cooldown--;

  // ★ 連鎖：隣の活性化の割合がしきい値を超えたら自分も活性化
  if (frameCount % 10 === 0) {
    let next = active.slice();
    for (let i = 0; i < n; i++) {
      if (active[i] || !adj[i].length) continue;
      let frac = adj[i].filter((nb) => active[nb]).length / adj[i].length;
      if (frac >= threshold) next[i] = 1;
    }
    active = next;
  }
  // ゆっくり元に戻る（連鎖が止まったら）
  if (frameCount % 120 === 0) for (let i = 0; i < n; i++) if (active[i] && random() < 0.15) active[i] = 0;

  for (let [a, b] of edges) {
    stroke(active[a] && active[b] ? 45 : 0, active[a] && active[b] ? 80 : 0, active[a] && active[b] ? 90 : 35);
    strokeWeight(1);
    line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y);
  }
  for (let i = 0; i < n; i++) {
    noStroke();
    fill(active[i] ? 45 : 220, active[i] ? 90 : 30, active[i] ? 100 : 45);
    circle(nodes[i].x, nodes[i].y, active[i] ? 16 : 10);
  }
  // 声の範囲
  noFill();
  stroke(0, 80, 100, 60);
  strokeWeight(2);
  circle(width / 2, height / 2 + 40, map(vol, 0, 0.3, 20, 400, true));

  let cnt = active.filter((a) => a).length;
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text((micReady ? '声を出すと中央の点が活性化 → 連鎖　' : 'クリックしてマイクを ON にしよう　') + 'しきい値 ' + nf(threshold, 1, 2) + '（マウス左右）　活性 ' + cnt + ' / ' + n + '　R でリセット', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('しきい値が低い（0.2）→ 少しの声で全体に広がる。高い（0.6）→ 広がらない。「隣の何割が動いたら自分も動くか」', 20, 68);
}

function mousePressed() { startMic(); }
function keyPressed() { if (key === 'r' || key === 'R') build(); }

// ---------- やってみよう ----------
// 1. しきい値 0.5 で、小さな声と大きな声で連鎖の広がりを比べる（最初の人数が大事）
// 2. R で何回か作り直す。同じしきい値でも、ネットワークの形で広がり方が変わる
// 3. つなぐ数 4 を 8 にすると（密なネットワーク）、連鎖は起きやすい？


// ==================================================
// ここから下は「マイクを使うための道具」です
// ==================================================
let audioCtx, analyser, waveData;
let micReady = false;
function startMic() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    let source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    waveData = new Float32Array(analyser.fftSize);
    micReady = true;
  }).catch((err) => { console.log('マイクが使えません：' + err); audioCtx = null; });
}
function getMicLevel() {
  if (!micReady) return 0;
  analyser.getFloatTimeDomainData(waveData);
  let sum = 0;
  for (let i = 0; i < waveData.length; i++) sum += waveData[i] * waveData[i];
  return Math.sqrt(sum / waveData.length);
}
