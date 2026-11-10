// ============================================
// 11 点渦の力学
// 渦を「強さ Γ をもつ 1 点」で表す。点渦は自分では動かず、ほかの渦が作る流れに流される
//   渦 j が距離 r の所に作る速さ = Γ_j / (2π r)（向きは渦のまわりを回る向き）
// 粘性のない流体では渦は消えない（ヘルムホルツの渦定理）ので、渦どうしの追いかけっこが続く
//   同じ向きの 2 つ → たがいのまわりを回る　　逆向きの 2 つ（渦対）→ 並んでまっすぐ進む
//   渦対が 2 組 → 後ろの組が前の組をくぐり抜ける「蛙飛び」（煙の輪でも起きる）
// クリック = 渦を置く / 1 = ＋（反時計回り）・2 = −（時計回り）/ 3〜6 = お手本 / スペース = 停止 / C = 消す
// ============================================

let GAM = 40000; // ★ 渦の強さ Γ [px²/秒]
let core = 12; // ★ 渦の芯の大きさ [px]（近づきすぎたとき速さが無限大にならないように）
let nTracer = 1400; // ★ 流れを見る粒の数
let signNow = 1, paused = false;
let vort = [], dots = [], presetName = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < nTracer; i++) dots.push({ x: Math.random() * width, y: Math.random() * height });
  preset(5);
  background(215, 60, 10);
}

function preset(n) {
  let cx = width / 2, cy = height / 2 + 30;
  vort = [];
  if (n === 3) { vort.push({ x: cx - 70, y: cy, g: 1 }, { x: cx + 70, y: cy, g: 1 }); presetName = '同じ向きの 2 つ：重心のまわりを回り続ける'; }
  if (n === 4) { vort.push({ x: cx - 300, y: cy - 55, g: 1 }, { x: cx - 300, y: cy + 55, g: -1 }); presetName = '渦対（逆向きの 2 つ）：おたがいを同じ向きへ流し、並んで直進する'; }
  if (n === 5) { for (let k = 0; k < 2; k++) vort.push({ x: cx - 380 + k * 110, y: cy - 70, g: 1 }, { x: cx - 380 + k * 110, y: cy + 70, g: -1 }); presetName = '蛙飛び：後ろの渦対がせまく・速くなって、前の渦対の間をくぐり抜ける'; }
  if (n === 6) { for (let k = 0; k < 5; k++) vort.push({ x: cx - 400 + k * 200, y: cy - 28, g: 1 }, { x: cx - 300 + k * 200, y: cy + 28, g: -1 }); presetName = 'カルマン渦列（09）の点渦モデル：千鳥に並んだ 2 列がそろって流れる'; }
}

// ★ 場所 (x, y) での流れの速度：すべての点渦が作る速度の足し算（skip 番の渦は自分なので除く）
function velocityAt(x, y, skip) {
  let vx = 0, vy = 0;
  for (let k = 0; k < vort.length; k++) {
    if (k === skip) continue;
    let w = vort[k], dx = x - w.x, dy = y - w.y, s = w.g * GAM / (2 * Math.PI * (dx * dx + dy * dy + core * core));
    vx += s * dy; vy -= s * dx; // 画面では y が下向きなので、g = +1 が反時計回りに見える
  }
  return [vx, vy];
}

// 渦を dt だけ進める（4 次のルンゲ・クッタ法：長く回してもずれにくい）
function moveVortices(dt) {
  let base = vort.map((w) => [w.x, w.y]), sum = vort.map(() => [0, 0]);
  let wts = [1, 2, 2, 1], offs = [0.5, 0.5, 1];
  for (let stage = 0; stage < 4; stage++) {
    let vel = vort.map((w, k) => velocityAt(w.x, w.y, k));
    for (let k = 0; k < vort.length; k++) {
      sum[k][0] += wts[stage] * vel[k][0]; sum[k][1] += wts[stage] * vel[k][1];
      if (stage < 3) { vort[k].x = base[k][0] + offs[stage] * dt * vel[k][0]; vort[k].y = base[k][1] + offs[stage] * dt * vel[k][1]; }
    }
  }
  for (let k = 0; k < vort.length; k++) {
    vort[k].x = (base[k][0] + dt * sum[k][0] / 6 + width) % width; // 画面の端から出たら反対側へ
    vort[k].y = (base[k][1] + dt * sum[k][1] / 6 + height) % height;
  }
}

function draw() {
  // 前のフレームをうすく残して、粒の軌跡（尾）を見せる
  noStroke(); fill(215, 60, 10, 14); rect(0, 0, width, height);
  let dt = paused ? 0 : 1 / 60;
  for (let s = 0; s < 4; s++) moveVortices(dt / 4);

  // ---- 流れに乗る粒
  fill(190, 40, 100, 80);
  for (let q of dots) {
    let v = velocityAt(q.x, q.y, -1);
    let v2 = velocityAt(q.x + v[0] * dt / 2, q.y + v[1] * dt / 2, -1);
    q.x += v2[0] * dt; q.y += v2[1] * dt;
    if (q.x < 0 || q.x > width || q.y < 0 || q.y > height || Math.random() < 0.002) { q.x = Math.random() * width; q.y = Math.random() * height; }
    rect(q.x, q.y, 2, 2);
  }

  // ---- 点渦
  textAlign(CENTER, CENTER); textSize(16);
  for (let w of vort) {
    fill(w.g > 0 ? 12 : 195, 75, 100); stroke(0, 0, 100); strokeWeight(1.5);
    circle(w.x, w.y, 22);
    noStroke(); fill(0, 0, 10); text(w.g > 0 ? '↺' : '↻', w.x, w.y);
  }
  textAlign(LEFT, BASELINE);

  // ---- 保存される量：渦どうしのエネルギー H と、渦の重心
  let H = 0, sg = 0, mx = 0, my = 0;
  for (let a = 0; a < vort.length; a++) {
    sg += vort[a].g; mx += vort[a].g * vort[a].x; my += vort[a].g * vort[a].y;
    for (let b = a + 1; b < vort.length; b++) H -= vort[a].g * vort[b].g * Math.log(Math.hypot(vort[a].x - vort[b].x, vort[a].y - vort[b].y) + 1) / (2 * Math.PI);
  }
  noStroke(); fill(215, 60, 10); rect(0, 0, width, 104);
  fill(0, 0, 100); textSize(18);
  text('クリック = 渦を置く（いま：' + (signNow > 0 ? '＋ 反時計回り' : '− 時計回り') + '、1・2 で切替）　3〜6 = お手本　スペース = ' + (paused ? '再生' : '停止') + '　C = 消す', 20, 40);
  fill(42, 70, 100); textSize(15);
  text(presetName, 20, 68);
  fill(0, 0, 65);
  text('渦 ' + vort.length + ' 個　Γ の合計 ' + sg + '　エネルギー H = −Σ Γᵢ Γⱼ ln rᵢⱼ / 2π = ' + nf(H, 1, 3) + '（端をまたがなければ一定）' + (sg !== 0 ? '　重心 (' + nf(mx / sg, 1, 0) + ', ' + nf(my / sg, 1, 0) + ')' : ''), 20, 92);
}

function mousePressed() {
  if (mouseY < 104 || vort.length >= 16) return;
  vort.push({ x: mouseX, y: mouseY, g: signNow });
  presetName = '自分で置いた渦。＋ と − をまぜて置いてみよう';
}

function keyPressed() {
  if (key === '1') signNow = 1;
  if (key === '2') signNow = -1;
  if (key >= '3' && key <= '6') preset(Number(key));
  if (key === 'c' || key === 'C') { vort = []; presetName = '渦なし。クリックで置こう'; }
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. 3：同じ向きの 2 つ。回る速さは距離でどう変わる？（C で消して、近く・遠くに置き直す）
// 2. 4：渦対。進む速さは Γ / (2π × 間かく)。間かくをせまくすると速くなる。確かめよう
// 3. 5：蛙飛び。前の組が広がって遅くなり、後ろの組が縮んで速くなる。何回くり返す？
// 4. 3 つの渦を三角形に置く。4 つ以上をでたらめに置くと動きは予測できなくなる（カオス）
// 5. 6：渦列。1 つだけ渦を足して列を乱すと、どのくらい持ちこたえる？
// 6. 強さがちがう渦を作ろう：mousePressed で g: signNow * 2 にすると 2 倍の渦になる
