// ============================================
// 11 イジング模型 ─ 小さな磁石（スピン ↑↓）の集まりが、温度を下げると突然そろう（相転移）
// エネルギー E = −J Σ(となり同士の積) − h Σ s。メトロポリス法：1 つのスピンを反転してみて、
// E が下がれば必ず、上がるなら確率 e^(−ΔE/kT) で受け入れる（市松模様の順に、全部を 1 回ずつ = 1 スイープ）
// 臨界温度 Tc = 2/ln(1 + √2) ≈ 2.269（オンサーガーの厳密解、J = k = 1）の近くで、ゆらぎがとても大きくなる
// ← → 温度 / 下のバーをクリック・ドラッグ / ↑↓ 外部磁場 h / スペース 一時停止 / 1 全部 ↑ / R ばらばら / A 温度をゆっくり下げる / C 記録を消す
// ============================================

const LSIZE = 128;                         // ★ 1 辺のスピンの数
const SWEEPS = 2;                      // ★ 1 コマのスイープ数
const TC = 2 / Math.log(1 + Math.SQRT2);
let spin, img, temp = 2.0, hField = 0, paused = false, scan = false, logM = [], rec = {}, tableT = -1, tableH = 99, acc = new Float64Array(10), framesAtT = 0;

function setup() { createCanvas(windowWidth, windowHeight); pixelDensity(1); img = createImage(LSIZE, LSIZE); selfTest(); seedRng(11); spin = makeSpins(LSIZE, 'random'); }
function makeSpins(n, how) { let s = new Int8Array(n * n); for (let i = 0; i < n * n; i++) s[i] = how === 'up' ? 1 : rnd() < 0.5 ? 1 : -1; return s; }
// 受け入れる確率の表：となり 4 つの和 nb（−4〜4）と自分 s から ΔE = 2s(nb + h)
function makeTable(t, h) { let a = new Float64Array(10); for (let k = 0; k < 5; k++) for (let si = 0; si < 2; si++) { let nb = 2 * k - 4, s = si ? 1 : -1, dE = 2 * s * (nb + h); a[2 * k + si] = dE <= 0 ? 1 : Math.exp(-dE / t); } return a; }
function sweep(s, n, a) {              // 市松模様の 2 色ずつ更新（周期境界）
  for (let p = 0; p < 2; p++) for (let y = 0; y < n; y++) {
    let up = ((y - 1 + n) % n) * n, dn = ((y + 1) % n) * n, row = y * n;
    for (let x = (y + p) % 2; x < n; x += 2) {
      let i = row + x, nb = s[row + ((x + 1) % n)] + s[row + ((x - 1 + n) % n)] + s[up + x] + s[dn + x];
      let pa = a[2 * ((nb + 4) / 2) + (s[i] > 0 ? 1 : 0)];
      if (pa >= 1 || rnd() < pa) s[i] = -s[i];
    }
  }
}
function magnet(s) { let m = 0; for (let v of s) m += v; return m / s.length; }
function energyPer(s, n, h) { let e = 0; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let i = y * n + x; e -= s[i] * (s[y * n + ((x + 1) % n)] + s[((y + 1) % n) * n + x]) + h * s[i]; } return e / (n * n); }
function onsagerM(t) { return t < TC ? Math.pow(1 - Math.pow(Math.sinh(2 / t), -4), 1 / 8) : 0; }   // 自発磁化の厳密解

function draw() {
  background(20, 20, 26);
  if (scan && frameCount % 150 === 0) { temp = Math.round((temp - 0.05) * 100) / 100; if (temp < 1.5) { temp = 1.5; scan = false; } }
  if (tableT !== temp || tableH !== hField) { acc = makeTable(temp, hField); tableT = temp; tableH = hField; framesAtT = 0; }
  if (!paused) {
    for (let k = 0; k < SWEEPS; k++) sweep(spin, LSIZE, acc);
    framesAtT++;
    let m = magnet(spin), e = energyPer(spin, LSIZE, hField);
    logM.push([m, e]); if (logM.length > 300) logM.shift();
    if (framesAtT > 40 && hField === 0) {   // 温度ごとに |m| と m² の平均を記録
      let key2 = temp.toFixed(2), r = rec[key2] || (rec[key2] = { n: 0, am: 0, m2: 0 });
      r.n++; r.am += Math.abs(m); r.m2 += m * m;
    }
  }
  // ---- スピンの絵
  img.loadPixels();
  for (let i = 0; i < LSIZE * LSIZE; i++) { let o = 4 * i, up = spin[i] > 0; img.pixels[o] = up ? 255 : 40; img.pixels[o + 1] = up ? 150 : 90; img.pixels[o + 2] = up ? 70 : 200; img.pixels[o + 3] = 255; }
  img.updatePixels();
  let sz = Math.min(width * 0.45, height - 210), ox = 20, oy = 110;
  noSmooth(); image(img, ox, oy, sz, sz); smooth();
  // 温度のバー
  let sy = oy + sz + 26; noStroke(); fill(60); rect(ox, sy, sz, 10, 5);
  let tx = ox + ((temp - 0.5) / 4.5) * sz; fill(255, 210, 120); circle(tx, sy + 5, 18);
  stroke(255, 120, 120); strokeWeight(2); let tcx = ox + ((TC - 0.5) / 4.5) * sz; line(tcx, sy - 6, tcx, sy + 16);
  if (mouseIsPressed && mouseY > sy - 15 && mouseY < sy + 25 && mouseX >= ox && mouseX <= ox + sz) temp = Math.round(clampv(0.5 + ((mouseX - ox) / sz) * 4.5, 0.5, 5) * 100) / 100;

  // ---- グラフ 1：m(t) と E/N
  let gx = ox + sz + 70, gw = width - gx - 30, gh = (height - 290) / 2;
  let g1 = { x: gx, y: 120, w: gw, h: gh, x0: 0, x1: 300, y0: -2.1, y1: 1.05 };
  plotAxes(g1, '時間 →', '磁化 m（橙）とエネルギー E/N（青）', [], [-2, -1, 0, 1]);
  stroke(255, 160, 80); strokeWeight(2); polyline(logM.map((v, k) => [gX(g1, k), gY(g1, v[0])]));
  stroke(110, 170, 255); polyline(logM.map((v, k) => [gX(g1, k), gY(g1, v[1])]));
  // ---- グラフ 2：温度ごとの |m| と、ゆらぎ（帯磁率）
  let g2 = { x: gx, y: g1.y + gh + 80, w: gw, h: gh, x0: 1, x1: 4, y0: 0, y1: 1.05 };
  plotAxes(g2, '温度 kT/J', '|m| の平均（点）とオンサーガーの厳密解（線）', [1, 2, TC, 3, 4].map((v) => +v.toFixed(3)), [0, 0.5, 1]);
  stroke(130, 200, 255); strokeWeight(2); polyline(Array.from({ length: 301 }, (_, k) => { let t = 1 + (k / 300) * 3; return [gX(g2, t), gY(g2, onsagerM(t))]; }));
  stroke(255, 120, 120, 120); strokeWeight(1); line(gX(g2, TC), g2.y, gX(g2, TC), g2.y + g2.h);
  let chiMax = 1e-9; for (let k in rec) { let r = rec[k]; chiMax = Math.max(chiMax, (LSIZE * LSIZE * (r.m2 / r.n - (r.am / r.n) ** 2)) / +k); }
  noStroke();
  for (let k in rec) {
    let r = rec[k], t = +k, am = r.am / r.n, chi = (LSIZE * LSIZE * (r.m2 / r.n - am * am)) / t;
    fill(255, 160, 80); circle(gX(g2, t), gY(g2, am), 7); fill(200, 130, 255); circle(gX(g2, t), gY(g2, (chi / chiMax) * 0.95), 5);
  }
  fill(200, 130, 255); textSize(13); text('紫 = 帯磁率 χ = N(⟨m²⟩ − ⟨|m|⟩²)/T（最大を 1 に）', g2.x + 8, g2.y + 16);

  // ---- 文字
  let m = logM.length ? logM[logM.length - 1][0] : 0;
  fill(240); textSize(18); textAlign(LEFT, BASELINE);
  text('イジング模型 ' + LSIZE + ' × ' + LSIZE + '　温度 kT/J = ' + temp.toFixed(2) + (temp < TC ? '（Tc より低い：そろう）' : '（Tc より高い：ばらばら）') + '　外部磁場 h = ' + hField.toFixed(2) + '　磁化 m = ' + m.toFixed(3), 20, 36);
  fill(175); textSize(15);
  text('← → 温度　バーをドラッグ　↑↓ 磁場　スペース 停止　1 全部 ↑　R ばらばら　A ゆっくり冷やす ' + (scan ? '中' : '') + '　C 記録を消す　（赤い線 = Tc ≈ ' + TC.toFixed(3) + '）', 20, 62);
  text('オレンジ = ↑ スピン、青 = ↓ スピン。Tc の近くでは、いろいろな大きさのかたまりが現れては消える', 20, 86);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === RIGHT_ARROW) temp = Math.min(5, Math.round((temp + 0.05) * 100) / 100);
  if (key === LEFT_ARROW) temp = Math.max(0.5, Math.round((temp - 0.05) * 100) / 100);
  if (key === UP_ARROW) hField = Math.min(1, Math.round((hField + 0.05) * 100) / 100);
  if (key === DOWN_ARROW) hField = Math.max(-1, Math.round((hField - 0.05) * 100) / 100);
  if (key === ' ') paused = !paused;
  if (key === '1') spin = makeSpins(LSIZE, 'up');
  if (key === 'r' || key === 'R') spin = makeSpins(LSIZE, 'random');
  if (key === 'a' || key === 'A') { scan = !scan; if (scan) { temp = 3.5; spin = makeSpins(LSIZE, 'random'); } }
  if (key === 'c' || key === 'C') rec = {};
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(111);
  let n = 32, s = makeSpins(n, 'up');
  check('全部 ↑ のエネルギー E/N = −2J、市松模様は +2J', near(energyPer(s, n, 0), -2) && near(energyPer(new Int8Array(n * n).map((_, i) => ((i % n) + Math.floor(i / n)) % 2 ? 1 : -1), n, 0), 2));
  let a = makeTable(1.7, 0);
  check('詳細つり合い：受け入れの確率の比 = e^(−ΔE/kT)（ΔE = 4, 8）', near(a[2 * 3 + 1] / a[2 * 1 + 1], Math.exp(-4 / 1.7), 1e-12) && near(a[2 * 4 + 1], Math.exp(-8 / 1.7), 1e-12) && a[2 * 0 + 1] === 1);
  let z = makeTable(0.01, 0); for (let k = 0; k < 50; k++) sweep(s, n, z);
  check('kT → 0：全部 ↑ の基底状態のまま（m = 1）', magnet(s) === 1);
  let hot = makeSpins(n, 'up'), th = makeTable(10, 0), am = 0; for (let k = 0; k < 400; k++) { sweep(hot, n, th); if (k >= 100) am += Math.abs(magnet(hot)) / 300; }
  check('kT = 10（高温）：⟨|m|⟩ = ' + am.toFixed(3) + ' は小さい（< 0.1）', am < 0.1);
  check('オンサーガー：Tc = 2/ln(1 + √2) = 2.2692、M(kT = 2) = 0.9113', near(TC, 2.26919, 1e-5) && near(onsagerM(2), 0.91132, 1e-4));
  let c = makeSpins(n, 'up'), tc = makeTable(1.8, 0), mc = 0; for (let k = 0; k < 400; k++) { sweep(c, n, tc); if (k >= 100) mc += Math.abs(magnet(c)) / 300; }
  check('kT = 1.8 のメトロポリス法の ⟨|m|⟩ = ' + mc.toFixed(3) + ' ≈ 厳密解 ' + onsagerM(1.8).toFixed(3) + '（±0.03）', Math.abs(mc - onsagerM(1.8)) < 0.03);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. R でばらばらにして、温度 1.5 にしよう。かたまり（磁区）がだんだん大きくなる様子を見よう
// 2. A でゆっくり冷やすと、Tc ≈ 2.27 のあたりで |m| が急に立ち上がる。点は厳密解の線に乗る？
// 3. 紫の点（帯磁率 = ゆらぎ）は、どの温度でいちばん大きい？
// 4. Tc より低い温度で ↑↓ の磁場をかけると、向きがそろって反転する？（ヒステリシス）
// 5. LSIZE を 32 にすると、Tc の近くのふるまいはどう変わる？（有限の大きさの効果）


// ==================================================
// ここから下は「熱力学の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。シミュレーションと自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logx, logy }
function gX(g, v) { let t = g.logx ? (Math.log(v) - Math.log(g.x0)) / (Math.log(g.x1) - Math.log(g.x0)) : (v - g.x0) / (g.x1 - g.x0); return g.x + clampv(t, -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log(v) - Math.log(g.y0)) / (Math.log(g.y1) - Math.log(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(t, -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
