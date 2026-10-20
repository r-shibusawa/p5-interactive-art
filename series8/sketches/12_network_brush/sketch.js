// ============================================
// 12 ネットワークを育てる（自由制作のベース）
// クリックで点を置くと、近くの点と自動でつながり、バネで動きながら形をつくる
// つながった瞬間に音が鳴り、次数が大きい点ほど大きく・明るく
// クリック／ドラッグで点を置く / マウスを押したまま：引力 / C で消す / S で保存
// ============================================
// ★ のついた数字を変えて、自分のネットワーク・アートに！

let nodes = [], edges = [];
let linkDist = 110; // ★ この距離より近い点どうしはつながる
let maxLinks = 4; // ★ 1 点あたりの最大のつながり

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function addNode(x, y) {
  let i = nodes.length;
  nodes.push({ x, y, vx: 0, vy: 0, hue: (frameCount * 2) % 360, deg: 0 });
  // ★ 近い点とつなぐ
  let near = nodes.map((p, j) => ({ j, d: dist(x, y, p.x, p.y) })).filter((o) => o.j !== i && o.d < linkDist && nodes[o.j].deg < maxLinks).sort((a, b) => a.d - b.d).slice(0, maxLinks);
  for (let o of near) {
    edges.push([i, o.j]);
    nodes[i].deg++;
    nodes[o.j].deg++;
    playNote(220 * pow(2, (nodes[o.j].deg % 8) * (2 / 12)), 0.12, 0.4); // ★ つながると音
  }
}

function draw() {
  background(230, 40, 8, 50); // ★ 残像

  // ★ 力：反発 ＋ バネ ＋（押している間）マウスへの引力
  for (let i = 0; i < nodes.length; i++) {
    let a = nodes[i], fx = 0, fy = 0;
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      let dx = a.x - nodes[j].x, dy = a.y - nodes[j].y, d2 = max(dx * dx + dy * dy, 64);
      fx += (dx / d2) * 500; fy += (dy / d2) * 500; // ★ 反発の強さ
    }
    if (mouseIsPressed) { fx += (mouseX - a.x) * 0.004; fy += (mouseY - a.y) * 0.004; }
    a.vx = (a.vx + fx) * 0.85; a.vy = (a.vy + fy) * 0.85; // ★ 摩擦
  }
  for (let [i, j] of edges) {
    let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y, d = max(sqrt(dx * dx + dy * dy), 1);
    let f = (d - 70) * 0.02; // ★ バネの自然長 70
    nodes[i].vx += (dx / d) * f; nodes[i].vy += (dy / d) * f; nodes[j].vx -= (dx / d) * f; nodes[j].vy -= (dy / d) * f;
  }
  for (let a of nodes) { a.x = constrain(a.x + a.vx, 10, width - 10); a.y = constrain(a.y + a.vy, 60, height - 10); }

  for (let [i, j] of edges) {
    stroke((nodes[i].hue + nodes[j].hue) / 2, 50, 80, 60);
    strokeWeight(1.5); // ★ 線の太さ
    line(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
  }
  for (let a of nodes) {
    noStroke();
    fill(a.hue, 70, 60 + a.deg * 10);
    circle(a.x, a.y, 8 + a.deg * 4); // ★ 次数で大きさ
  }

  fill(0, 0, 100);
  textSize(16);
  text('クリック・ドラッグで点を置く（近い点と自動でつながる）　押したまま = 引き寄せ　C：消す　S：保存　点 ' + nodes.length + '　線 ' + edges.length, 16, 28);
}

function mousePressed() { startAudio(); if (mouseY > 44) addNode(mouseX, mouseY); }
function mouseDragged() { if (frameCount % 4 === 0 && nodes.length < 300) addNode(mouseX + random(-10, 10), mouseY + random(-10, 10)); }
function keyPressed() {
  if (key === 'c' || key === 'C') { nodes = []; edges = []; }
  if (key === 's' || key === 'S') saveCanvas('network', 'png');
}

// ---------- 自由制作のアイデア ----------
// ・linkDist を大きく／小さく、maxLinks を 2（鎖）や 8（密）に
// ・線を 10 の「音楽グラフ」にして、点を置くたびにメロディが伸びる
// ・11 のマイクで、声で連鎖を走らせる（色が波のように広がる）
// ・06 のように、置いた点が「人気の点」を選んでつながる（ハブができる）


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
