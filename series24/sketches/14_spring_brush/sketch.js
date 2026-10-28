// ============================================
// 14 ばね質点ブラシ 🔊
// マウスで描いた線が、おもり（質点）とばねの鎖になって重力で揺れる。床にぶつかると音が鳴る
//   自由制作のベース：ばねの硬さ・重力・色・音の決め方を変えて、自分だけの「動く絵筆」をつくろう
// クリックで音をスタート / ドラッグ = 鎖を描く（点の近くを押すとつかむ）/ B = 描いた線を輪（ぷるぷる）にする / P = 始点を固定
// G = 重力 ON/OFF / T = 残像 / S = 画像を保存 / C = 全部消す
// ============================================

let gravity = 900;         // ★ 重力 [px/s²]
let kSpring = 20000;       // ★ ばねの硬さ
let damping = 0.9995;      // ★ 速度の減衰（1 に近いほど長く揺れる）
let seg = 14;              // ★ 鎖の点の間隔 [px]
let bounce = 0.6;          // ★ 床の反発係数
let MAXP = 1400;           // ★ 点の最大数
let pts = [], springs = [], chains = [];
let drawingChain = null, grabbed = null;
let gravityOn = true, trails = false, pinFirst = true, ring = false;
let hueNow = 0, lastPing = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(240, 30, 8);
  // 最初の見本：垂れ下がる鎖を 4 本
  for (let k = 0; k < 4; k++) {
    hueNow = k * 70;
    let x0 = width * (0.2 + k * 0.2), c = [addPoint(x0, 120, hueNow, true)];
    for (let i = 1; i < 18; i++) { let p = addPoint(x0 + i * seg * 0.9, 120 + i * 4, hueNow + i * 2, false); addSpring(c[i - 1], p); if (i >= 2) addSpring(c[i - 2], p, kSpring * 0.03); c.push(p); }
    for (let p of c) p.len = c.length;
    chains.push(c);
  }
}

function addPoint(x, y, hue, pinned) {
  let p = { x, y, px: x, py: y, hue, pinned, chain: chains.length };
  pts.push(p); return p;
}
function addSpring(a, b, k) { springs.push({ a, b, rest: Math.hypot(a.x - b.x, a.y - b.y), k: k || kSpring }); }

function draw() {
  if (trails) { noStroke(); fill(240, 30, 8, 12); rect(0, 0, width, height); } else background(240, 30, 8);
  let sub = 8, h = 1 / 60 / sub, floorY = height - 30;
  for (let s = 0; s < sub; s++) {
    // ★ ばねの力 F = −k (伸び)。両端の点に逆向きに
    for (let sp of springs) {
      let dx = sp.b.x - sp.a.x, dy = sp.b.y - sp.a.y, d = Math.hypot(dx, dy) || 1e-6;
      let f = sp.k * (d - sp.rest) / d * h * h;
      if (!sp.a.pinned) { sp.a.x += dx * f * 0.5; sp.a.y += dy * f * 0.5; }
      if (!sp.b.pinned) { sp.b.x -= dx * f * 0.5; sp.b.y -= dy * f * 0.5; }
    }
    // ベルレ積分：次の位置 = いま + (いま − 前) × 減衰 + 加速度 × h²
    for (let p of pts) {
      if (p.pinned || p === grabbed) { p.px = p.x; p.py = p.y; continue; }
      let vx = (p.x - p.px) * damping, vy = (p.y - p.py) * damping;
      vx = constrain(vx, -40, 40); vy = constrain(vy, -40, 40);
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + (gravityOn ? gravity : 0) * h * h;
      // 床と壁
      if (p.y > floorY) {
        let impact = vy / h;     // ぶつかる速さ [px/s]
        p.y = floorY; p.py = p.y + vy * bounce;
        if (impact > 250) ping(p, impact);
      }
      if (p.x < 0) { p.x = 0; p.px = p.x + vx * bounce; }
      if (p.x > width) { p.x = width; p.px = p.x + vx * bounce; }
    }
  }
  if (grabbed) { grabbed.x = mouseX; grabbed.y = mouseY; }

  // 描く：ばねは線、点は小さな円（色は鎖ごと）
  strokeWeight(3);
  for (let sp of springs) {
    let stretch = Math.hypot(sp.b.x - sp.a.x, sp.b.y - sp.a.y) / sp.rest;
    stroke(sp.a.hue, 70, constrain(60 + (stretch - 1) * 300, 50, 100), 90);
    line(sp.a.x, sp.a.y, sp.b.x, sp.b.y);
  }
  noStroke();
  for (let p of pts) { fill(p.hue, p.pinned ? 20 : 60, 100); circle(p.x, p.y, p.pinned ? 10 : 6); }
  stroke(0, 0, 30); strokeWeight(2); line(0, floorY, width, floorY);

  noStroke(); fill(0, 0, 100); textSize(18);
  text((audioCtx ? '♪ ' : 'クリックで音をスタート　') + 'ドラッグ：描く・つかむ　B：輪 ' + (ring ? 'ON' : 'OFF') + '　P：始点の固定 ' + (pinFirst ? 'ON' : 'OFF') + '　G：重力 ' + (gravityOn ? 'ON' : 'OFF') + '　T：残像　S：保存　C：消す', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('点 ' + pts.length + ' / ' + MAXP + '　ばね ' + springs.length + '　　床にぶつかると音：短い鎖ほど高い音、速いほど大きい音', 20, 68);
}

function nearest(x, y, r) {
  let best = null, bd = r * r;
  for (let p of pts) { let d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p; } }
  return best;
}

function mousePressed() {
  startAudio();
  if (mouseY < 90) return;
  grabbed = nearest(mouseX, mouseY, 16);
  if (grabbed) return;
  if (pts.length >= MAXP) return;
  hueNow = (hueNow + 47) % 360;
  drawingChain = [addPoint(mouseX, mouseY, hueNow, pinFirst && !ring)];
}
function mouseDragged() {
  if (!drawingChain || pts.length >= MAXP) return;
  let last = drawingChain[drawingChain.length - 1];
  if (Math.hypot(mouseX - last.x, mouseY - last.y) >= seg) {
    let p = addPoint(mouseX, mouseY, (hueNow + drawingChain.length * 2) % 360, false);
    addSpring(last, p);
    if (drawingChain.length >= 2) addSpring(drawingChain[drawingChain.length - 2], p, kSpring * 0.03);  // 1 つとばしのばね = 曲げにくさ
    drawingChain.push(p);
  }
}
function mouseReleased() {
  grabbed = null;
  if (!drawingChain) return;
  let c = drawingChain;
  // 輪にする：最後と最初をつなぎ、向かい側どうしもつなぐ（ぷるぷるのゼリー）
  if (ring && c.length > 4) {
    addSpring(c[c.length - 1], c[0]);
    let half = floor(c.length / 2);
    for (let i = 0; i < half; i++) addSpring(c[i], c[i + half], kSpring * 0.05);
  }
  for (let p of c) p.len = c.length;
  chains.push(c);
  drawingChain = null;
}
function keyPressed() {
  startAudio();
  if (key === 'g' || key === 'G') gravityOn = !gravityOn;
  if (key === 't' || key === 'T') trails = !trails;
  if (key === 'p' || key === 'P') pinFirst = !pinFirst;
  if (key === 'b' || key === 'B') ring = !ring;
  if (key === 'c' || key === 'C') { pts = []; springs = []; chains = []; background(240, 30, 8); }
  if (key === 's' || key === 'S') saveCanvas('spring_brush', 'png');
}

// ★ 衝突音：鎖が短いほど高い音、ぶつかる速さで音の大きさ
function ping(p, impact) {
  if (!audioCtx || millis() - lastPing < 40) return;
  lastPing = millis();
  let len = p.len || 10;
  let f = constrain(1600 / sqrt(len), 120, 1600);
  let scaleNotes = [0, 2, 4, 7, 9, 12];                      // ★ ペンタトニック（ずれても気持ちいい音階）
  let midi = round(12 * Math.log2(f / 440) + 69);
  while (!scaleNotes.includes(((midi % 12) + 12) % 12)) midi--;
  pluck(440 * pow(2, (midi - 69) / 12), constrain(impact / 3000, 0.05, 0.4));
}

// ---------- やってみよう ----------
// 1. P を OFF にして長い鎖を描き、床に落とす。ON にすると、カーテンのように垂れ下がる
// 2. B で輪を描くと、ぷるぷるのゼリー。kSpring を小さくするとやわらかく、大きくすると硬くなる
// 3. G で重力を消して、つかんで振り回す。宇宙のひも
// 4. ping の音階（scaleNotes）や音色（pluck の type）を変えて、落とすたびに曲になる作品に


// ==================================================
// ここから下は「音を鳴らすための道具」
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// はじいたような短い音（音の高さ f [Hz]、大きさ vol）
function pluck(f, vol) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(g); g.connect(masterOut);
  o.start(t); o.stop(t + 0.55);
}
