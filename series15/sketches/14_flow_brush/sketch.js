// ============================================
// 14 水路をデザインする（自由制作のベース・音つき）
// 自分でネットワークを描くと、その場で最大フロー（エドモンズ＝カープ法）を計算して水を流す
// 増加道が見つかるたびに、道の点を順に鳴らす（高い位置の点ほど高い音）。黄色に光る線が最小カット = ボトルネック
// 何もないところをクリック = 点 / 点から点へドラッグ = パイプ / パイプにマウスを乗せて上下 = 容量
// D = マウスの下の点・パイプを消す / スペース = 増加道をもう一度鳴らす / C = 全部消す / 1〜3 = お手本
// ============================================

let nodes = [], edges = [];
let dragFrom = -1, pressX = 0, pressY = 0;
let paths = [], flowVal = 0, reach = [];
let particles = [];
let replay = { k: -1, i: 0, t: 0 };
let defaultCap = 5;          // ★ 新しいパイプの容量
let scale = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0, 880.0]; // ★ 音階

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}

function preset(k) {
  nodes = [{ x: 80, y: height / 2, fixed: 's' }, { x: width - 80, y: height / 2, fixed: 't' }];
  edges = [];
  let add = (x, y) => { nodes.push({ x, y }); return nodes.length - 1; };
  let e = (u, v, c) => edges.push({ u, v, c, f: 0 });
  if (k === 1) {
    let a = add(width * 0.3, height * 0.3), b = add(width * 0.3, height * 0.7), c = add(width * 0.6, height * 0.35), d = add(width * 0.6, height * 0.7);
    e(0, a, 8); e(0, b, 6); e(a, c, 5); e(b, a, 3); e(b, d, 6); e(c, d, 2); e(c, 1, 7); e(d, 1, 8);
  } else if (k === 2) {
    // 川の合流と分岐
    let prev = [0];
    for (let col = 1; col <= 4; col++) {
      let cur = [];
      for (let r = 0; r < 3; r++) cur.push(add(width * (0.12 + col * 0.17), height * (0.25 + r * 0.25) + random(-30, 30)));
      for (let p of prev) for (let q of cur) if (random() < 0.6 || prev.length === 1) e(p, q, floor(random(2, 9)));
      prev = cur;
    }
    for (let p of prev) e(p, 1, floor(random(3, 9)));
  } else if (k === 3) {
    // 細い 1 本がボトルネック
    let a = add(width * 0.3, height * 0.3), b = add(width * 0.3, height * 0.7), m = add(width * 0.5, height * 0.5), c = add(width * 0.7, height * 0.3), d = add(width * 0.7, height * 0.7);
    e(0, a, 9); e(0, b, 9); e(a, m, 9); e(b, m, 9); e(m, c, 2); e(m, d, 2); e(c, 1, 9); e(d, 1, 9);
  }
  solve();
}

// エドモンズ＝カープ法で最大フロー。増加道を記録しておく
function solve() {
  for (let e of edges) e.f = 0;
  paths = []; flowVal = 0;
  let guard = 0;
  while (guard++ < 500) {
    let prev = new Array(nodes.length).fill(null), seen = new Array(nodes.length).fill(false), q = [0];
    seen[0] = true;
    while (q.length) {
      let v = q.shift();
      for (let e of edges) {
        if (e.u === v && !seen[e.v] && e.c - e.f > 0) { seen[e.v] = true; prev[e.v] = { e, dir: 1, from: v }; q.push(e.v); }
        if (e.v === v && !seen[e.u] && e.f > 0) { seen[e.u] = true; prev[e.u] = { e, dir: -1, from: v }; q.push(e.u); }
      }
    }
    reach = seen;
    if (!seen[1]) break;
    let p = [], v = 1;
    while (v !== 0) { p.unshift(prev[v]); v = prev[v].from; }
    let b = min(p.map((a) => (a.dir > 0 ? a.e.c - a.e.f : a.e.f)));
    for (let a of p) a.e.f += a.dir * b;
    flowVal += b;
    paths.push({ nodes: [0, ...p.map((a) => (a.dir > 0 ? a.e.v : a.e.u))], amount: b });
  }
  replay = { k: 0, i: 0, t: 0 };
}

function draw() {
  background(185, 35, 8);
  // 最小カット側をうっすら
  noStroke();
  for (let i = 0; i < nodes.length; i++) if (reach[i]) { fill(140, 60, 50, 12); circle(nodes[i].x, nodes[i].y, 140); }
  let hov = hoverEdge();
  for (let e of edges) {
    let A = nodes[e.u], B = nodes[e.v];
    let ang = atan2(B.y - A.y, B.x - A.x);
    let ax = A.x + cos(ang) * 22, ay = A.y + sin(ang) * 22, bx = B.x - cos(ang) * 24, by = B.y - sin(ang) * 24;
    let cut = reach[e.u] && !reach[e.v];
    stroke(cut ? color(50, 90, 100, 60 + 40 * sin(frameCount * 0.1)) : color(185, 15, 30)); strokeWeight(3 + e.c * 1.5);
    line(ax, ay, bx, by);
    if (e.f > 0) { stroke(195, 80, 100); strokeWeight(1 + e.f * 1.5); line(ax, ay, bx, by); }
    noStroke(); fill(e === hov ? color(50, 90, 100) : color(0, 0, 80));
    triangle(bx, by, bx - cos(ang - 0.45) * 13, by - sin(ang - 0.45) * 13, bx - cos(ang + 0.45) * 13, by - sin(ang + 0.45) * 13);
    textAlign(CENTER, CENTER); textSize(13);
    text(e.f + '/' + e.c, (ax + bx) / 2 - sin(ang) * 16, (ay + by) / 2 + cos(ang) * 16);
    if (e.f > 0 && random() < e.f * 0.05) particles.push({ e, t: 0 });
  }
  particles = particles.filter((p) => p.t < 1 && edges.includes(p.e));
  for (let p of particles) {
    p.t += 0.01;
    let A = nodes[p.e.u], B = nodes[p.e.v];
    fill(190, 60, 100, 85); circle(lerp(A.x, B.x, p.t), lerp(A.y, B.y, p.t), 5);
  }
  particles = particles.filter((p) => p.t < 1 && edges.includes(p.e));
  // 増加道のリプレイ（音つき）
  if (replay.k >= 0 && replay.k < paths.length) {
    let P = paths[replay.k];
    stroke(50, 90, 100); strokeWeight(4); noFill();
    beginShape(); for (let q = 0; q <= replay.i; q++) vertex(nodes[P.nodes[q]].x, nodes[P.nodes[q]].y); endShape();
    if (++replay.t % 8 === 0) {
      let nd = nodes[P.nodes[replay.i]];
      playNote(scale[constrain(floor(map(nd.y, height, 0, 0, scale.length)), 0, scale.length - 1)], 0.25, 0.3, 'triangle');
      replay.i++;
      if (replay.i >= P.nodes.length) { replay.k++; replay.i = 0; }
    }
  }
  if (dragFrom >= 0) { stroke(50, 90, 100); strokeWeight(2); line(nodes[dragFrom].x, nodes[dragFrom].y, mouseX, mouseY); }
  noStroke();
  nodes.forEach((n, i) => {
    fill(n.fixed === 's' ? color(140, 70, 85) : n.fixed === 't' ? color(20, 75, 95) : color(185, 15, 85));
    circle(n.x, n.y, 40);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(15); text(n.fixed || i, n.x, n.y);
  });
  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('クリック：点　ドラッグ：パイプ　パイプに乗せて上下：容量　D：消す　スペース：増加道を鳴らす　C：全部消す　1〜3：お手本', 20, 36);
  textSize(15); fill(0, 0, 65);
  text('黄色く光るパイプ = 最小カット（ここを太くしないと、全体は増えない）。新しいパイプの容量 ' + defaultCap, 20, 62);
  fill(0, 0, 100); textSize(28); text('最大フロー ' + flowVal, 20, height - 30);
  fill(0, 0, 70); textSize(16); text('増加道 ' + paths.length + ' 本', 240, height - 32);
}

function nodeAt(x, y) { return nodes.findIndex((n) => dist(x, y, n.x, n.y) < 24); }

function hoverEdge() {
  let best = null, bd = 12;
  for (let e of edges) {
    let A = nodes[e.u], B = nodes[e.v], dx = B.x - A.x, dy = B.y - A.y;
    let t = constrain(((mouseX - A.x) * dx + (mouseY - A.y) * dy) / (dx * dx + dy * dy), 0, 1);
    let d = dist(mouseX, mouseY, A.x + t * dx, A.y + t * dy);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function mousePressed() { startAudio(); dragFrom = nodeAt(mouseX, mouseY); pressX = mouseX; pressY = mouseY; }

function mouseReleased() {
  let moved = dist(mouseX, mouseY, pressX, pressY) > 8;
  if (dragFrom >= 0 && moved) {
    let to = nodeAt(mouseX, mouseY);
    if (to >= 0 && to !== dragFrom && to !== 0 && dragFrom !== 1 && !edges.some((e) => (e.u === dragFrom && e.v === to) || (e.u === to && e.v === dragFrom))) { edges.push({ u: dragFrom, v: to, c: defaultCap, f: 0 }); solve(); }
    else if (to < 0 && !nodes[dragFrom].fixed) { nodes[dragFrom].x = mouseX; nodes[dragFrom].y = mouseY; }
  } else if (dragFrom < 0 && !moved && mouseY > 80 && !hoverEdge()) nodes.push({ x: mouseX, y: mouseY });
  dragFrom = -1;
}

function keyPressed() {
  startAudio();
  let e = hoverEdge();
  if (key === UP_ARROW) { if (e) { e.c = min(20, e.c + 1); solve(); } else defaultCap = min(20, defaultCap + 1); }
  if (key === DOWN_ARROW) { if (e) { e.c = max(1, e.c - 1); solve(); } else defaultCap = max(1, defaultCap - 1); }
  if (key === 'd' || key === 'D') {
    let i = nodeAt(mouseX, mouseY);
    if (i >= 2) {
      edges = edges.filter((x) => x.u !== i && x.v !== i).map((x) => ({ ...x, u: x.u > i ? x.u - 1 : x.u, v: x.v > i ? x.v - 1 : x.v }));
      nodes.splice(i, 1); solve();
    } else if (e) { edges.splice(edges.indexOf(e), 1); solve(); }
  }
  if (key === ' ') replay = { k: 0, i: 0, t: 0 };
  if (key === 'c' || key === 'C') { nodes = nodes.slice(0, 2); edges = []; solve(); }
  if (key >= '1' && key <= '3') preset(int(key));
}

// ---------- やってみよう ----------
// 1. 最大フローを 20 にするネットワークを、パイプの容量の合計がなるべく小さくなるように作る
// 2. 黄色い最小カットのパイプを 1 本太くすると、最大フローはいくつ増える？ 別のパイプなら？
// 3. 音階 scale を変えたり、増加道の量 amount で音の長さを変えたりして「水路の曲」を作る


// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function playNote(freqHz, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp); amp.connect(masterOut); osc.start(t); osc.stop(t + duration + 0.05);
}
