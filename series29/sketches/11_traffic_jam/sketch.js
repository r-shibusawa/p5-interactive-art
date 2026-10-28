// ============================================
// 11 交通流と渋滞 ─ ナーゲル＝シュレッケンベルク模型
// 1 車線の環状道路をマス目に区切り、車は毎ステップ 4 つのルールで動く（セル・オートマトン）
//   ① 加速 v+1（最大 vmax）② 前の車にぶつからないよう減速　③ 確率 p でなんとなく減速　④ v マス進む
//   事故もボトルネックもないのに、ルール③だけで「自然渋滞（幽霊渋滞）」が生まれ、後ろへ伝わっていく
// ↑↓ = 車の密度 / ←→ = でたらめ減速の確率 p / F = 基本図をまとめて描く / スペース = 一時停止 / R = 並べ直す
// ============================================

let L = 300;               // ★ 道路のマスの数
let vmax = 5;              // ★ 最高速度（マス/ステップ）
let pSlow = 0.25;          // ★ でたらめに減速する確率
let density = 0.15;        // ★ 車の密度（台/マス）
let stepsPerFrame = 1;
let paused = false;
let cars = [], st, row = 0, fd = [], live = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  st = createGraphics(L * 2, 260);
  st.colorMode(HSB, 360, 100, 100, 100);
  st.noStroke();
  resetRoad();
}
function resetRoad() {
  let n = max(1, round(density * L));
  cars = [];
  for (let i = 0; i < n; i++) cars.push({ x: floor(i * L / n), v: 0 });
  st.background(0, 0, 8); row = 0; live = [];
}

// ★ ナーゲル＝シュレッケンベルクの 4 つのルール（cars は位置の順に並んでいる）
function nasch(cs, p) {
  let n = cs.length, moved = 0;
  for (let i = 0; i < n; i++) {
    let me = cs[i], ahead = cs[(i + 1) % n];
    let gap = (ahead.x - me.x - 1 + L) % L;
    if (n === 1) gap = L - 1;
    me.nv = min(me.v + 1, vmax);                 // ① 加速
    me.nv = min(me.nv, gap);                     // ② ぶつからないように
    if (me.nv > 0 && Math.random() < p) me.nv--; // ③ でたらめ減速
  }
  for (let c of cs) { c.v = c.nv; c.x = (c.x + c.v) % L; moved += c.v; }   // ④ 進む
  // 位置の順に並べ直す（環状なので 1 台だけ先頭に回ることがある）
  let k = 0; for (let i = 1; i < n; i++) if (cs[i].x < cs[k].x) k = i;
  if (k > 0) cs.push(...cs.splice(0, k));
  return moved;
}

function draw() {
  background(100, 15, 10);
  if (!paused) for (let s = 0; s < stepsPerFrame; s++) {
    let moved = nasch(cars, pSlow);
    live.push(moved / L); if (live.length > 200) live.shift();
    // 時空図に 1 行書く（横 = 道路の位置、縦 = 時間）
    st.fill(0, 0, 8); st.rect(0, row, L * 2, 1);
    for (let c of cars) { st.fill(c.v / vmax * 120, 90, 100); st.rect(c.x * 2, row, 2, 1); }
    row = (row + 1) % st.height;
  }

  // ---- 環状道路
  let cx = width * 0.2, cy = height * 0.52, R = min(width * 0.16, height * 0.32);
  noFill(); stroke(0, 0, 30); strokeWeight(22); circle(cx, cy, R * 2);
  noStroke();
  for (let c of cars) {
    let a = c.x / L * TWO_PI - HALF_PI;
    fill(c.v / vmax * 120, 90, 100);
    push(); translate(cx + R * cos(a), cy + R * sin(a)); rotate(a + HALF_PI); rect(-4, -6, 8, 12, 2); pop();
  }
  fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(15);
  text(cars.length + ' 台\n平均速度 ' + nf(avgV(), 1, 2), cx, cy); textAlign(LEFT, BASELINE);
  fill(0, 0, 60); textSize(13); text('色：赤 = 止まっている、緑 = 最高速度', cx - R, cy + R + 36);

  // ---- 時空図
  let sx = width * 0.42, sy = 110, sw = width * 0.55, sh = height * 0.42;
  let h1 = st.height - row;
  image(st, sx, sy, sw, sh * h1 / st.height, 0, row, st.width, h1);
  if (row > 0) image(st, sx, sy + sh * h1 / st.height, sw, sh * row / st.height, 0, 0, st.width, row);
  noStroke(); fill(0, 0, 60); textSize(13);
  text('時空図：横 = 道路の位置、下へ行くほど新しい時刻。赤い帯 = 渋滞。右下から左下へ伸びる → 渋滞は車と逆向きに進む', sx, sy + sh + 18);

  // ---- 基本図（密度と流量）
  let px = sx, py = height - 50, pw = sw * 0.6, ph = height - sy - sh - 110;
  stroke(0, 0, 100, 30); strokeWeight(1); line(px, py, px + pw, py); line(px, py, px, py - ph);
  let qmax = 0.7;
  noStroke();
  for (let f of fd) { fill(190, 60, 100, 80); circle(px + f.d * pw, py - f.q / qmax * ph, 7); }
  let q = 0; for (let v of live) q += v; q /= max(live.length, 1);
  fill(45, 90, 100); circle(px + (cars.length / L) * pw, py - q / qmax * ph, 14);
  fill(0, 0, 60); textSize(13);
  text('基本図：横 = 密度（0〜1 台/マス）、縦 = 流量（1 ステップに 1 マスを通る台数）。黄 = いま、水色 = F で測った点', px, py - ph - 8);
  fill(0, 0, 100); textSize(15);
  text('いまの流量 ' + nf(q, 1, 3) + '　密度 ' + nf(cars.length / L, 1, 3), px + pw + 20, py - ph + 20);
  text('流量 = 密度 × 平均速度', px + pw + 20, py - ph + 46);
  fill(0, 0, 60); textSize(13);
  text('左の上り坂 = 自由流（混むほど流れる）', px + pw + 20, py - ph + 76);
  text('右の下り坂 = 渋滞流（混むほど流れない）', px + pw + 20, py - ph + 96);
  text('てっぺん = いちばんたくさん流れる密度', px + pw + 20, py - ph + 116);

  fill(0, 0, 100); textSize(18);
  text('密度 ' + nf(density, 1, 2) + '（↑↓）　でたらめ減速 p = ' + nf(pSlow, 1, 2) + '（←→）　F：基本図を描く　スペース：一時停止　R：並べ直す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('密度 0.1 くらいまでは全員が最高速度。0.15 を超えると、だれかがブレーキを踏んだ影響が後ろへ連鎖して止まる車が出る', 20, 68);
}
function avgV() { let s = 0; for (let c of cars) s += c.v; return s / max(cars.length, 1); }

// ★ いろいろな密度で別にシミュレーションして基本図の点を集める
function sweep() {
  fd = [];
  for (let d = 0.02; d < 0.95; d += 0.03) {
    let n = round(d * L), cs = [];
    for (let i = 0; i < n; i++) cs.push({ x: floor(i * L / n), v: 0 });
    for (let s = 0; s < 150; s++) nasch(cs, pSlow);
    let m = 0; for (let s = 0; s < 150; s++) m += nasch(cs, pSlow);
    fd.push({ d: n / L, q: m / 150 / L });
  }
}

function keyPressed() {
  if (key === UP_ARROW) { density = min(0.9, density + 0.03); resetRoad(); }
  if (key === DOWN_ARROW) { density = max(0.01, density - 0.03); resetRoad(); }
  if (key === RIGHT_ARROW) pSlow = min(0.8, pSlow + 0.05);
  if (key === LEFT_ARROW) pSlow = max(0, pSlow - 0.05);
  pSlow = round(pSlow * 100) / 100; density = round(density * 100) / 100;
  if (key === 'f' || key === 'F') sweep();
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') resetRoad();
}

// ---------- やってみよう ----------
// 1. p = 0 にすると渋滞は消える？ 密度を 0.2 → 0.3 と上げたときの時空図を見る
// 2. F で基本図を描き、流量が最大になる密度を読む。高速道路の「流入制限」はここに保つため
// 3. ルール③で、止まっている車だけ減速確率を大きくする（スロースタート）と、渋滞が長く残るか試す
// 4. 待ち行列として見る：渋滞の先頭は「窓口」、そこから出ていく率が流量。待ち行列の長さ = 渋滞の長さ
