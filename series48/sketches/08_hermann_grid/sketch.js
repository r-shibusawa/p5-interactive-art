// ============================================
// 08 ヘルマン格子ときらめき格子 ─ 受容野を計算で確かめる
// 白い道の交差点に、ぼんやり灰色の点が見える（見つめた所は消える）。きらめき格子では白い円の中に黒い点がちらつく
// 目の網膜の細胞は「中心 − まわり」（中心-周辺型の受容野）で反応する。交差点はまわりが明るいぶん反応が弱い
// 右の画像：左の図に DoG フィルタ（ガウスぼかし 2 つの差）を本当にかけた結果。交差点が暗くなっている
// 1・2 = ヘルマン / きらめき / ↑↓ = 道の幅 / ←→ = 受容野の大きさ σ / T またはマウスを押す = 真実（画素の値を表示）
// ============================================

let which = 1;
let N = 6;                    // ★ 黒い四角の数（1 辺）
let streetFrac = 0.22;        // ★ 道の幅（ピッチに対する割合）
let sigmaC = 2.0;             // ★ 受容野の中心の大きさ σ（右の計算用の画素）。まわりは 3 倍
let truthKey = false;
let dogImg, dogVals, RES = 2;  // 右の計算は 2 px を 1 画素にまとめて行う

function setup() {
  createCanvas(windowWidth, windowHeight);
  computeDoG();
  drawScene(false);
  selfTest();
}
function truthOn() { return truthKey || mouseIsPressed; }
function draw() { drawScene(truthOn()); }

function geom() {
  let P = Math.round(Math.min(width * 0.44, height - 170)), pitch = P / (N + 0.5), st = Math.round(pitch * streetFrac);
  return { x0: 30, y0: 100, P, pitch, st, sq: pitch - st, xR: 30 + P + 40 };
}
// 図の明るさ（0〜255）：パネルの中の座標 (x, y) → 値。四角・道・交差点の円
function lumAt(x, y) {
  let g = geom(), off = g.st, u = x - off, v = y - off;
  let iu = Math.floor(u / g.pitch), iv = Math.floor(v / g.pitch), fu = u - iu * g.pitch, fv = v - iv * g.pitch;
  let inSq = iu >= 0 && iv >= 0 && iu < N && iv < N && fu < g.sq && fv < g.sq;
  if (inSq) return 0;
  if (which === 1) return 255;
  // きらめき格子：灰色の道と、交差点の白い円
  let cxu = Math.round(u / g.pitch) * g.pitch - g.st / 2, cyv = Math.round(v / g.pitch) * g.pitch - g.st / 2;
  return Math.hypot(u - cxu, v - cyv) < g.st * 0.62 ? 255 : 110;
}
// 交差点と、道の真ん中（となりの交差点との中点）の位置（パネル内の座標）
function probes() {
  let g = geom(), k = Math.floor(N / 2), cx = g.st + k * g.pitch - g.st / 2;
  return { cross: [cx, cx], street: [cx, cx + g.pitch / 2] };
}

// DoG = 中心のガウスぼかし − まわりのガウスぼかし（重みはどちらも合計 1）
function gaussKernel(s) { let r = Math.ceil(3 * s), k = []; for (let i = -r; i <= r; i++) k.push(Math.exp((-i * i) / (2 * s * s))); let t = k.reduce((a, b) => a + b, 0); return k.map((x) => x / t); }
function blur(src, w, h, k) {
  let r = (k.length - 1) / 2, tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let i = -r; i <= r; i++) s += k[i + r] * src[y * w + constrain(x + i, 0, w - 1)]; tmp[y * w + x] = s; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let i = -r; i <= r; i++) s += k[i + r] * tmp[constrain(y + i, 0, h - 1) * w + x]; out[y * w + x] = s; }
  return out;
}
function computeDoG() {
  let g = geom(), w = Math.floor(g.P / RES), h = w, src = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) src[y * w + x] = lumAt((x + 0.5) * RES, (y + 0.5) * RES);
  let c = blur(src, w, h, gaussKernel(sigmaC)), s = blur(src, w, h, gaussKernel(sigmaC * 3));
  dogVals = { w, h, v: c.map((x, i) => x - s[i]) };
  dogImg = createImage(w, h); dogImg.loadPixels();
  for (let i = 0; i < w * h; i++) { let q = constrain(128 + dogVals.v[i] * 1.6, 0, 255); dogImg.pixels[4 * i] = dogImg.pixels[4 * i + 1] = dogImg.pixels[4 * i + 2] = q; dogImg.pixels[4 * i + 3] = 255; }
  dogImg.updatePixels();
}
function dogAt(p) { let x = Math.floor(p[0] / RES), y = Math.floor(p[1] / RES); return dogVals.v[y * dogVals.w + x]; }

function drawScene(truth) {
  background(which === 1 ? 255 : 110);
  let g = geom(), pr = probes();
  noStroke(); fill(0);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) rect(Math.round(g.x0 + g.st + i * g.pitch), Math.round(g.y0 + g.st + j * g.pitch), Math.round(g.sq), Math.round(g.sq));
  if (which === 2) { fill(255); for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) circle(g.x0 + g.st + i * g.pitch - g.st / 2, g.y0 + g.st + j * g.pitch - g.st / 2, g.st * 1.24); }
  image(dogImg, g.xR, g.y0, g.P, g.P);
  let rc = dogAt(pr.cross), rs = dogAt(pr.street);
  for (let [p, col] of [[pr.cross, [230, 40, 40]], [pr.street, [40, 110, 230]]]) {
    noFill(); stroke(col); strokeWeight(2);
    circle(g.xR + p[0], g.y0 + p[1], 18);
    if (truth) circle(g.x0 + p[0], g.y0 + p[1], 18);
  }
  noStroke(); fill(240); rect(0, 0, width, 72); rect(0, height - 60, width, 60);
  fill(20); textSize(18); textAlign(LEFT, BASELINE);
  text('1・2：' + (which === 1 ? 'ヘルマン格子' : 'きらめき格子') + '　↑↓：道の幅 ' + g.st + ' px　←→：受容野 σ = ' + sigmaC.toFixed(1) + '（まわり ' + (3 * sigmaC).toFixed(1) + '）　T：真実', 20, 30);
  fill(60); textSize(15);
  text('右 = 左の図に DoG フィルタをかけた「網膜の反応」。赤 = 交差点 ' + rc.toFixed(1) + '、青 = 道の真ん中 ' + rs.toFixed(1) + '　→ 交差点のほうが ' + (rs - rc).toFixed(1) + ' 弱い', 20, 56);
  if (truth) {
    loadPixels();
    let a = readPix(g.x0 + pr.cross[0], g.y0 + pr.cross[1]), b = readPix(g.x0 + pr.street[0], g.y0 + pr.street[1]);
    fill(20); text('左の図の本当の画素：交差点 (' + a.join(',') + ')　道の真ん中 (' + b.join(',') + ')　→ 同じ白', 20, height - 36);
  }
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(30, 130, 60) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function keyPressed() {
  if (key === '1' || key === '2') { which = +key; computeDoG(); }
  if (key === UP_ARROW) { streetFrac = Math.min(0.5, streetFrac + 0.03); computeDoG(); }
  if (key === DOWN_ARROW) { streetFrac = Math.max(0.07, streetFrac - 0.03); computeDoG(); }
  if (key === RIGHT_ARROW) { sigmaC = Math.min(8, sigmaC + 0.5); computeDoG(); }
  if (key === LEFT_ARROW) { sigmaC = Math.max(0.5, sigmaC - 0.5); computeDoG(); }
  if (key === 't' || key === 'T') truthKey = !truthKey;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); computeDoG(); }

// ---------- やってみよう ----------
// 1. 道を太く（↑）すると灰色の点は弱くなる？ 右の「交差点 − 道」の差も小さくなる？
// 2. σ を道の幅にくらべて大きく・小さくすると、右の画像の交差点の暗さはどう変わる？
// 3. 交差点を 1 つ見つめると、そこだけ点が消える。目の中心（中心窩）は受容野が小さいから
// 4. きらめき格子（2）の黒い点は、DoG でも説明できる？ できない部分もある（研究中）
// 5. N を 12 にして、四角を細かくしよう


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}

// ---- 自己テスト：交差点と道が本当に同じ白か（画素）、DoG の計算が正しいか
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond }), keep = which, g = geom(), pr = probes();
  which = 1; computeDoG(); drawScene(false); loadPixels();
  let a = readPix(g.x0 + pr.cross[0], g.y0 + pr.cross[1]), b = readPix(g.x0 + pr.street[0], g.y0 + pr.street[1]);
  ok('ヘルマン：交差点 (' + a.join(',') + ') と道の真ん中 (' + b.join(',') + ') は同じ白 255', a.join() === b.join() && a.every((v) => v === 255));
  ok('画面の図と計算用の図（lumAt）が同じ：交差点・道・四角の中', lumAt(...pr.cross) === 255 && lumAt(...pr.street) === 255 && lumAt(g.st + g.sq / 2, g.st + g.sq / 2) === 0);
  ok('ガウスの重みの合計は 1（中心・まわり）', Math.abs(gaussKernel(2).reduce((s, x) => s + x, 0) - 1) < 1e-6 && Math.abs(gaussKernel(6).reduce((s, x) => s + x, 0) - 1) < 1e-6);
  let flat = new Float32Array(400).fill(200), d0 = blur(flat, 20, 20, gaussKernel(1.5)).map((x, i) => x - blur(flat, 20, 20, gaussKernel(4.5))[i]);
  ok('一様な面の DoG は 0（明るさそのものには反応しない）', d0.every((x) => Math.abs(x) < 1e-3));
  ok('DoG の反応：交差点 ' + dogAt(pr.cross).toFixed(1) + ' < 道の真ん中 ' + dogAt(pr.street).toFixed(1), dogAt(pr.cross) < dogAt(pr.street));
  which = 2; computeDoG(); drawScene(false); loadPixels();
  let c = readPix(g.x0 + pr.cross[0], g.y0 + pr.cross[1]), s = readPix(g.x0 + pr.street[0], g.y0 + pr.street[1]);
  ok('きらめき：交差点の円は白 ' + c[0] + '、道は灰色 ' + s[0] + '（黒い点はどこにも描いていない）', c[0] === 255 && s[0] === 110);
  which = keep; computeDoG(); drawScene(false);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
