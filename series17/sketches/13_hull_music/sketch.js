// ============================================
// 13 凸包を聞く（自由制作のベース）🔊
// 置いた点の凸包を毎フレーム計算し（アンドリューの単調連鎖法 = グレアム走査の仲間）、
// 光の粒が凸包のふちを一周しながら、頂点を通るたびに音を鳴らす。高さ = 頂点の上下の位置
// 中の点は、中心から回るレーダーが通ると小さく鳴る。点を動かすと、形も曲も変わる
// 操作：クリック = 点を置く（最初のクリックで音が出る） / ドラッグ = 動かす
//       C = 全部消す / R = ランダム / S = 音のオン・オフ / 1〜3 = 音階 / ↑↓ = 速さ
// ★ 自由制作：音階・音色・速さ・色・形のルールを変えて、自分の「凸包楽器」をつくろう
// ============================================

let pts = [];
let hull = [];
let scales = {
  1: [0, 2, 4, 7, 9],     // ★ 長調ペンタトニック
  2: [0, 3, 5, 7, 10],    // 短調ペンタトニック
  3: [0, 1, 5, 7, 8],     // 都節音階
};
let scaleNo = 1;
let baseMidi = 57;      // ★ いちばん下の音（MIDI 番号）
let speedPx = 3;        // ★ 光の粒の速さ（1 フレームに何ピクセル）
let wave = 'triangle';  // ★ 音色：'sine' 'triangle' 'square' 'sawtooth'
let soundOn = true;
let head = 0;           // 周の上の位置（ピクセル）
let radar = 0;          // レーダーの角度
let flashes = [];       // 鳴った点の光
let drag = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 12; i++) pts.push(createVector(random(width * 0.2, width * 0.8), random(height * 0.25, height * 0.85)));
}

// ★ 凸包（単調連鎖法）：x で並べて、下側と上側を「左に曲がる」だけ残して作る
function turn(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
function convexHull(P) {
  if (P.length < 3) return P.map((p, i) => i);
  let idx = [...P.keys()].sort((a, b) => P[a].x - P[b].x || P[a].y - P[b].y);
  let lower = [], upper = [];
  for (let i of idx) { while (lower.length >= 2 && turn(P[lower[lower.length - 2]], P[lower[lower.length - 1]], P[i]) <= 0) lower.pop(); lower.push(i); }
  for (let i of idx.slice().reverse()) { while (upper.length >= 2 && turn(P[upper[upper.length - 2]], P[upper[upper.length - 1]], P[i]) <= 0) upper.pop(); upper.push(i); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function pitchOf(p) {
  let sc = scales[scaleNo];
  let k = floor(map(p.y, height, 0, 0, sc.length * 3));   // 上にあるほど高い音
  k = constrain(k, 0, sc.length * 3 - 1);
  return baseMidi + 12 * floor(k / sc.length) + sc[k % sc.length];
}

function draw() {
  background(250, 50, 8, 35);   // 少し残像を残す
  hull = convexHull(pts);

  // 凸包の面
  if (hull.length >= 3) {
    noStroke(); fill(290, 50, 60, 12);
    beginShape(); for (let i of hull) vertex(pts[i].x, pts[i].y); endShape(CLOSE);
    stroke(290, 40, 100, 80); strokeWeight(2); noFill();
    beginShape(); for (let i of hull) vertex(pts[i].x, pts[i].y); endShape(CLOSE);
  }

  // 光の粒がふちを進む
  if (hull.length >= 2) {
    let lens = hull.map((i, k) => p5.Vector.dist(pts[i], pts[hull[(k + 1) % hull.length]]));
    let total = lens.reduce((a, b) => a + b, 0);
    let before = head % max(total, 1);
    head += speedPx;
    let after = head % max(total, 1);
    // 頂点を通過したら鳴らす
    let acc = 0;
    for (let k = 0; k < hull.length; k++) {
      let vPos = acc;   // 頂点 k の周上の位置
      let crossed = before <= after ? before < vPos && vPos <= after : vPos > before || vPos <= after;
      if (crossed) ring(hull[k], 0.28, 0.5);
      acc += lens[k];
    }
    // 粒の位置
    acc = 0;
    for (let k = 0; k < hull.length; k++) {
      if (after <= acc + lens[k]) {
        let a = pts[hull[k]], b = pts[hull[(k + 1) % hull.length]];
        let t = (after - acc) / max(lens[k], 1e-6);
        noStroke(); fill(50, 60, 100); circle(lerp(a.x, b.x, t), lerp(a.y, b.y, t), 16);
        fill(50, 60, 100, 25); circle(lerp(a.x, b.x, t), lerp(a.y, b.y, t), 40);
        break;
      }
      acc += lens[k];
    }
  }

  // レーダー：中の点を小さく鳴らす
  if (hull.length >= 3) {
    let c = createVector(0, 0); for (let i of hull) c.add(pts[i]); c.div(hull.length);
    let prev = radar; radar = (radar + 0.02) % TWO_PI;
    stroke(170, 60, 100, 30); strokeWeight(1);
    line(c.x, c.y, c.x + cos(radar) * 2000, c.y + sin(radar) * 2000);
    pts.forEach((p, i) => {
      if (hull.includes(i)) return;
      let a = (atan2(p.y - c.y, p.x - c.x) + TWO_PI) % TWO_PI;
      if ((prev < radar && prev < a && a <= radar) || (prev > radar && (a > prev || a <= radar))) ring(i, 0.08, 0.25);
    });
  }

  // 点と光
  pts.forEach((p, i) => {
    noStroke();
    fill(hull.includes(i) ? color(290, 50, 100) : color(170, 50, 90));
    circle(p.x, p.y, hull.includes(i) ? 14 : 9);
  });
  flashes = flashes.filter((f) => f.life > 0);
  for (let f of flashes) { noFill(); stroke(f.h, 60, 100, f.life); strokeWeight(2); circle(f.x, f.y, 110 - f.life); f.life -= 3; }

  noStroke(); fill(0, 0, 95); textAlign(LEFT, TOP); textSize(22);
  text('凸包を聞く', 30, 24);
  fill(0, 0, 65); textSize(14);
  text(`クリック 置く   ドラッグ 動かす   C 消す   R ランダム   S 音 ${soundOn ? 'ON' : 'OFF'}   1〜3 音階（${['', '長調', '短調', '都節'][scaleNo]}）   ↑↓ 速さ   点 ${pts.length} / 凸包の頂点 ${hull.length}`, 30, 56);
  if (!audioCtx) { fill(50, 60, 100); text('まずキャンバスをクリックすると音が出ます', 30, 80); }
}

function ring(i, vol, dur) {
  let p = pts[i];
  let m = pitchOf(p);
  if (soundOn) playNote(440 * pow(2, (m - 69) / 12), vol, dur, hull.includes(i) ? wave : 'sine');
  flashes.push({ x: p.x, y: p.y, h: hull.includes(i) ? 290 : 170, life: 100 });
}

function mousePressed() {
  startAudio();
  drag = -1;
  pts.forEach((p, i) => { if (dist(mouseX, mouseY, p.x, p.y) < 12) drag = i; });
  if (drag < 0 && mouseY > 90) pts.push(createVector(mouseX, mouseY));
}
function mouseDragged() { if (drag >= 0) { pts[drag].x = mouseX; pts[drag].y = mouseY; } }
function mouseReleased() { drag = -1; }

function keyPressed() {
  if (key === 'c' || key === 'C') pts = [];
  if (key === 'r' || key === 'R') { pts = []; for (let i = 0; i < 14; i++) pts.push(createVector(random(width * 0.15, width * 0.85), random(height * 0.25, height * 0.9))); }
  if (key === 's' || key === 'S') soundOn = !soundOn;
  if ('123'.includes(key)) scaleNo = Number(key);
  if (key === UP_ARROW) { speedPx = min(speedPx + 1, 20); return false; }
  if (key === DOWN_ARROW) { speedPx = max(speedPx - 1, 1); return false; }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

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
