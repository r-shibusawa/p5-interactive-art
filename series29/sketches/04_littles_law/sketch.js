// ============================================
// 04 リトルの法則 L = λW
// どんな待ち行列でも「平均の系内人数 L = 到着率 λ × 平均の滞在時間 W」が成り立つ
//   窓口の数・サービス時間の分布・並び方に関係なし。下の「滞在の帯」の面積 = N(t) のグラフの面積 だから
//   毎回ちがう待ち行列をつくって L と λW を測り、右の散布図に打っていく
// N = 新しい待ち行列 / F = 20 回まとめて測る / ↑↓ = 時間の速さ / R = 散布図を消す
// ============================================

let runT = 300;            // ★ 1 回の測定の長さ
let speed = 30;            // ★ 1 秒で進む時間
let showSpan = 30;         // 下の帯に表示する時間
let cfg, sim, pts = [];
let distNames = ['指数', '一定', '一様'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  newRun();
}

// ★ でたらめな待ち行列を 1 つつくる
function newRun() {
  let c = floor(random(1, 4));
  let rho = random(0.3, 0.92);
  cfg = { c, dist: floor(random(3)), mu: random(0.5, 2) };
  cfg.lam = rho * c * cfg.mu;
  sim = { t: 0, nextArr: expRand(cfg.lam), desk: new Array(c).fill(null), q: [], area: 0, nArr: 0, nDone: 0, sumW: 0, stays: [], rec: [] };
}
function serviceTime() {
  let m = 1 / cfg.mu;
  if (cfg.dist === 0) return expRand(cfg.mu);
  if (cfg.dist === 1) return m;
  return random(0, 2 * m);
}
function nIn() { let n = sim.q.length; for (let d of sim.desk) if (d) n++; return n; }

function advance(tEnd) {
  while (true) {
    let tD = Infinity, di = -1;
    for (let i = 0; i < cfg.c; i++) if (sim.desk[i] && sim.desk[i].end < tD) { tD = sim.desk[i].end; di = i; }
    let tn = min(sim.nextArr, tD);
    if (tn > tEnd) break;
    sim.area += nIn() * (tn - sim.t); sim.t = tn;
    if (sim.nextArr <= tD) {
      let p = { arr: sim.t, end: 0, dep: -1 };
      sim.q.push(p); sim.stays.push(p); sim.nArr++;
      sim.nextArr = sim.t + expRand(cfg.lam);
    } else {
      let p = sim.desk[di]; p.dep = sim.t; sim.desk[di] = null; sim.nDone++; sim.sumW += p.dep - p.arr;
    }
    for (let i = 0; i < cfg.c; i++) if (!sim.desk[i] && sim.q.length) { let p = sim.q.shift(); p.end = sim.t + serviceTime(); sim.desk[i] = p; }
  }
  sim.area += nIn() * (tEnd - sim.t); sim.t = tEnd;
  while (sim.stays.length && sim.stays[0].dep >= 0 && sim.stays[0].dep < sim.t - showSpan) sim.stays.shift();
}
function finishRun() {
  let L = sim.area / sim.t, lamHat = sim.nArr / sim.t, W = sim.sumW / max(sim.nDone, 1);
  pts.push({ L, lw: lamHat * W, hue: [190, 45, 320][cfg.dist] });
  if (pts.length > 400) pts.shift();
  newRun();
}

function draw() {
  background(280, 20, 12);
  let target = min(runT, sim.t + speed / 60);
  advance(target);
  sim.rec.push({ t: sim.t, n: nIn() });
  while (sim.rec.length && sim.rec[0].t < sim.t - showSpan) sim.rec.shift();
  if (sim.t >= runT) finishRun();

  // ---- 左上：N(t)
  let gx = 40, gw = width * 0.55, gy = height * 0.42, gh = height * 0.24;
  let X = (t) => gx + (t - (sim.t - showSpan)) / showSpan * gw;
  let top = 4; for (let r of sim.rec) top = max(top, r.n);
  stroke(0, 0, 100, 30); strokeWeight(1); line(gx, gy, gx + gw, gy);
  noStroke(); fill(30, 80, 100, 50);
  beginShape(); vertex(X(sim.rec[0].t), gy);
  for (let i = 0; i < sim.rec.length; i++) { let r = sim.rec[i]; vertex(X(r.t), gy - r.n / top * gh); if (i + 1 < sim.rec.length) vertex(X(sim.rec[i + 1].t), gy - r.n / top * gh); }
  vertex(X(sim.t), gy); endShape(CLOSE);
  fill(0, 0, 60); textSize(13); text('系内人数 N(t)（オレンジの面積 = 人 × 時間）', gx, gy - gh - 8);

  // ---- 左下：一人ひとりの滞在の帯（到着 → 退出）
  let by = gy + 30, bh = height - by - 40, rowH = max(3, min(10, bh / max(sim.stays.length, 1)));
  for (let i = 0; i < sim.stays.length; i++) {
    let p = sim.stays[i], a = max(p.arr, sim.t - showSpan), e = p.dep >= 0 ? p.dep : sim.t;
    let y = by + (i * rowH) % bh;
    fill(p.dep >= 0 ? color(190, 60, 90) : color(30, 80, 100)); rect(X(a), y, max(1, X(e) - X(a)), rowH - 1);
  }
  fill(0, 0, 60); textSize(13); text('一人ひとりの滞在（帯の長さ = その人の W）。帯の長さの合計 = 上の面積', gx, by - 6);

  // ---- 右：散布図 L vs λW
  let px = width * 0.64, py = height - 70, ps = min(width * 0.32, height - 320);
  let vmax = 10;
  stroke(0, 0, 100, 40); strokeWeight(1); line(px, py, px + ps, py); line(px, py, px, py - ps);
  stroke(45, 90, 100, 70); strokeWeight(2); line(px, py, px + ps, py - ps);
  noStroke();
  for (let p of pts) { fill(p.hue, 70, 100, 80); circle(px + min(p.lw, vmax) / vmax * ps, py - min(p.L, vmax) / vmax * ps, 9); }
  fill(0, 0, 60); textSize(13);
  text('横 = λW（到着率 × 平均の滞在時間）　縦 = L（平均の系内人数）', px, py - ps - 10);
  text('0', px - 4, py + 16); text('' + vmax, px + ps - 10, py + 16);
  text('色 = サービス時間の分布　水色：指数　黄：一定　ピンク：一様', px, py + 34);

  // ---- 今の待ち行列
  let L = sim.area / max(sim.t, 1e-9), lamHat = sim.nArr / max(sim.t, 1e-9), W = sim.sumW / max(sim.nDone, 1);
  fill(0, 0, 100); textSize(16);
  let tx = px, ty = 120;
  text('いまの待ち行列：窓口 ' + cfg.c + ' つ、サービス時間 ' + distNames[cfg.dist] + '（平均 ' + nf(1 / cfg.mu, 1, 2) + '）', tx, ty);
  text('測定 ' + nf(sim.t, 1, 0) + ' / ' + runT, tx, ty + 26);
  fill(45, 90, 100);
  text('L = ' + nf(L, 1, 3) + '　　λ = ' + nf(lamHat, 1, 3) + '　　W = ' + nf(W, 1, 3), tx, ty + 52);
  text('λW = ' + nf(lamHat * W, 1, 3), tx, ty + 78);
  fill(0, 0, 100); text('測った待ち行列 ' + pts.length + ' 個', tx, ty + 104);

  fill(0, 0, 100); textSize(18);
  text('N：新しい待ち行列　F：20 回まとめて測る　速さ ×' + speed + '（↑↓）　R：散布図を消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('どんな待ち行列でも点は黄色の対角線 L = λW の上に並ぶ。測りにくい W を、数えやすい L と λ から求められる（逆も）', 20, 68);
}

function keyPressed() {
  if (key === 'n' || key === 'N') newRun();
  if (key === 'f' || key === 'F') for (let k = 0; k < 20; k++) { advance(runT); finishRun(); }
  if (key === UP_ARROW) speed = min(600, speed * 2);
  if (key === DOWN_ARROW) speed = max(2, speed / 2);
  if (key === 'r' || key === 'R') pts = [];
}

// ---------- やってみよう ----------
// 1. F を何回か押す。点が対角線から外れるのはどんなとき？（runT を 50 にすると？）
// 2. ラーメン屋に平均 6 人並んでいて、1 分に 2 人来る。平均何分待つ？（W = L/λ）
// 3. serviceTime の分布を変えても対角線から外れないことを確かめる（例：random(0, 4 * m) * random()）
// 4. 大学の在籍者 4000 人、毎年 1000 人入学。平均の在籍年数は？ リトルの法則は「流れ」があればどこでも使える

// ==================================================
// ここから下は「道具」
// ==================================================
function expRand(rate) { return -Math.log(1 - Math.random()) / rate; }
