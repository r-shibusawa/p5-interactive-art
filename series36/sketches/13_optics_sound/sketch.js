// ============================================
// 13 光の反射と屈折を音にする
// 部屋の中に光の粒（光子）を放つ。壁や鏡で反射するたびに音が鳴り、反射の回数で音階が上がる
//   ガラスの板に入ると屈折して遅くなり（速さ c/n）、音色が変わる（三角波 → のこぎり波）
//   使っている式は 00・01 と同じ：反射 d' = d − 2(d·n)n、スネルの法則 n1 sinθ1 = n2 sinθ2
// クリック = 光子を放つ（マウスの位置から中心へ向かって） / A = 自動で放つ / 1〜3 = 音階 / ↑↓ = 速さ / ←→ = ガラスの屈折率 / C = 全部消す
// ============================================

let photons = [];
let maxPhotons = 12;      // ★ 同時にある光子の数
let speed = 6;            // ★ 光の速さ（px/フレーム）
let nGlass = 1.5;         // ★ ガラスの屈折率
let maxBounces = 14;      // ★ この回数反射したら消える
let scaleKind = 0;
let scales = [[0, 2, 4, 7, 9], [0, 2, 3, 5, 7, 8, 10], [0, 4, 7, 11]];   // ペンタ、短調、長七
let autoEmit = false;
let walls = [], glassRect;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  let m = 70;
  // 部屋の壁（4 辺）と斜めの鏡 2 枚
  walls = [
    seg(m, 100, width - m, 100), seg(width - m, 100, width - m, height - m), seg(width - m, height - m, m, height - m), seg(m, height - m, m, 100),
    seg(width * 0.62, 160, width * 0.8, 300), seg(width * 0.2, height - 150, width * 0.38, height - 280),
  ];
  glassRect = { x: width * 0.42, y: height * 0.35, w: 160, h: 300 };
}
function seg(x1, y1, x2, y2) { return { a: { x: x1, y: y1 }, b: { x: x2, y: y2 } }; }
function inGlass(x, y) { return x > glassRect.x && x < glassRect.x + glassRect.w && y > glassRect.y && y < glassRect.y + glassRect.h; }

function emit(x, y, dx, dy) {
  let L = Math.hypot(dx, dy); if (L < 1e-6) return;
  if (photons.length >= maxPhotons) photons.shift();
  photons.push({ x, y, dx: dx / L, dy: dy / L, bounces: 0, trail: [], hue: random(360), inside: inGlass(x, y), life: 1 });
}

// ★ 光子を 1 歩進める。壁・鏡で反射、ガラスの境界で屈折
function stepPhoton(p) {
  let v = speed / (p.inside ? nGlass : 1);
  let nx = p.x + p.dx * v, ny = p.y + p.dy * v;
  // 壁・鏡
  for (let w of walls) {
    let h = raySeg(p.x, p.y, p.dx, p.dy, w.a, w.b);
    if (h && h.t <= v) {
      let ex = w.b.x - w.a.x, ey = w.b.y - w.a.y, L = Math.hypot(ex, ey), wnx = -ey / L, wny = ex / L;
      let dp = p.dx * wnx + p.dy * wny;
      p.x += p.dx * h.t; p.y += p.dy * h.t;
      p.dx -= 2 * dp * wnx; p.dy -= 2 * dp * wny;
      p.bounces++;
      playBounce(p);
      return;
    }
  }
  // ガラスの境界をまたいだ？
  let wasIn = p.inside, nowIn = inGlass(nx, ny);
  if (wasIn !== nowIn) {
    // どの辺をまたいだかで法線を決める（縦の辺なら x 向き、横の辺なら y 向き）
    let g = glassRect;
    let crossX = (p.x < g.x) !== (nx < g.x) || (p.x < g.x + g.w) !== (nx < g.x + g.w);
    let bnx = crossX ? 1 : 0, bny = crossX ? 0 : 1;
    let na = wasIn ? nGlass : 1, nb = wasIn ? 1 : nGlass;
    let d = snellRefract(p.dx, p.dy, bnx, bny, na, nb);
    if (d) { p.dx = d.x; p.dy = d.y; p.inside = nowIn; playRefract(p, nowIn); }
    else { if (crossX) p.dx = -p.dx; else p.dy = -p.dy; p.bounces++; playBounce(p); return; }   // 全反射
  }
  p.x = nx; p.y = ny;
}
function raySeg(px, py, dx, dy, a, b) {
  let ex = b.x - a.x, ey = b.y - a.y, den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-9) return null;
  let t = ((a.x - px) * ey - (a.y - py) * ex) / den, s = ((a.x - px) * dy - (a.y - py) * dx) / den;
  return t > 1e-6 && s >= 0 && s <= 1 ? { t, s } : null;
}
function snellRefract(dx, dy, nx, ny, na, nb) {
  let c = -(dx * nx + dy * ny);
  if (c < 0) { nx = -nx; ny = -ny; c = -c; }
  let r = na / nb, k = 1 - r * r * (1 - c * c);
  if (k < 0) return null;
  let f = r * c - Math.sqrt(k);
  return { x: r * dx + f * nx, y: r * dy + f * ny };
}

// ★ 反射の回数 → 音の高さ（音階を上っていく）
function playBounce(p) {
  let sc = scales[scaleKind];
  let degree = p.bounces - 1;
  let semi = sc[degree % sc.length] + 12 * Math.floor(degree / sc.length);
  let freq = 220 * Math.pow(2, semi / 12);
  ping(Math.min(3000, freq), 0.18, p.inside ? 'sawtooth' : 'triangle', 0.35);
  p.flash = 12;
}
function playRefract(p, entering) { ping(entering ? 180 : 360, 0.12, 'sine', 0.5); }

function draw() {
  background(230, 40, 7);
  if (autoEmit && frameCount % 40 === 0) emit(random(120, width - 120), random(140, height - 120), random(-1, 1), random(-1, 1));
  // ガラス
  noStroke(); fill(190, 50, 70, 25); rect(glassRect.x, glassRect.y, glassRect.w, glassRect.h);
  noFill(); stroke(190, 50, 100, 60); strokeWeight(2); rect(glassRect.x, glassRect.y, glassRect.w, glassRect.h);
  // 壁・鏡
  stroke(0, 0, 80); strokeWeight(4);
  for (let w of walls) line(w.a.x, w.a.y, w.b.x, w.b.y);

  // 光子
  for (let p of photons) {
    for (let k = 0; k < 2; k++) stepPhoton(p);
    p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 90) p.trail.shift();
    if (p.bounces >= maxBounces) p.life -= 0.02;
    if (p.flash > 0) p.flash--;
    noFill(); stroke(p.hue, 70, 100, 50 * p.life); strokeWeight(2);
    beginShape(); for (let q of p.trail) vertex(q.x, q.y); endShape();
    noStroke(); fill(p.hue, 50, 100, 100 * p.life); circle(p.x, p.y, 10 + (p.flash || 0));
    fill(0, 0, 100, 80 * p.life); textSize(12); text(p.bounces, p.x + 10, p.y - 8);
  }
  photons = photons.filter((p) => p.life > 0 && p.x > -50 && p.x < width + 50 && p.y > -50 && p.y < height + 50);

  fill(0, 0, 100); textSize(18);
  text('クリック：光子を放つ　A：自動 ' + (autoEmit ? 'ON' : 'off') + '　音階 ' + ['ペンタトニック', '短調', '長七の和音'][scaleKind] + '（1〜3）　速さ ' + speed + '（↑↓）　ガラス n = ' + nf(nGlass, 1, 2) + '（←→）　C：消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('反射するたびに音階が 1 つ上がる（数字 = 反射の回数）。ガラスの中では遅くなり音色が変わる。' + maxBounces + ' 回で消える。最初に 1 回クリックして音を ON', 20, 68);
}

function mousePressed() {
  startAudio();
  emit(mouseX, mouseY, width / 2 - mouseX + random(-80, 80), height / 2 - mouseY + random(-80, 80));
}
function keyPressed() {
  startAudio();
  if (key === 'a' || key === 'A') autoEmit = !autoEmit;
  if (key === '1' || key === '2' || key === '3') scaleKind = Number(key) - 1;
  if (key === UP_ARROW) speed = Math.min(16, speed + 1);
  if (key === DOWN_ARROW) speed = Math.max(1, speed - 1);
  if (key === RIGHT_ARROW) nGlass = Math.min(2.5, nGlass + 0.1);
  if (key === LEFT_ARROW) nGlass = Math.max(1.0, nGlass - 0.1);
  if (key === 'c' || key === 'C') photons = [];
}

// ---------- やってみよう ----------
// 1. 鏡の角に向けて放つと、短い間隔で反射して速いフレーズになる。部屋の形で曲が変わる
// 2. ガラスの屈折率を 2.5 にすると、中で全反射して閉じ込められることがある（光ファイバー）
// 3. 音の高さを「反射の回数」でなく「進んだ距離」や「入射角」で決めてみよう
// 4. walls に鏡を足して、自分だけの「音の部屋」をつくろう。自由制作のベースに

// ==================================================
// ここから下は「音を鳴らすための道具」（短い音をポンと鳴らす）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  if (audioCtx.state !== 'running') audioCtx.resume();
}
function ping(freq, vol, type, dur) {
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  let t0 = audioCtx.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(masterOut); o.start(t0); o.stop(t0 + dur + 0.05);
}
