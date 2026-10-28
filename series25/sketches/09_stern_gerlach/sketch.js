// ============================================
// 09 シュテルン＝ゲルラッハ実験
// 銀原子のビームを不均一な磁石（SG 装置）に通すと、スピンの向きで「上（+）」「下（−）」の 2 本にだけ分かれる
//   z で + を選んだあと x で測り、もう一度 z で測ると… また半々に分かれる。x を測ったことで z の情報が消える
// 箱をクリック = 軸を z → 45° → x → z / ←→ = 選んだ箱の軸を 15° ずつ / 出口（+ / −）をクリック = 次へ通すほう
// 1〜4 = 例（z ／ z-z ／ z-x ／ z-x-z） / ↑↓ = 原子の数 / C = カウントを消す
// ============================================

let stages = [];            // 各装置 {th: 軸の角度（0 = z, 90 = x）, pass: 1（+）か −1（−）, cnt: [+, −]}
let sel = 0;
let rate = 0.6;             // ★ 1 フレームに出す原子の数（平均）
let atoms = [];
let speed = 7;              // ★ 原子の速さ（px/フレーム）
let finalCnt = [0, 0];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(4);
}

function preset(k) {
  let axes = [[0], [0, 0], [0, 90], [0, 90, 0]][k - 1];
  stages = axes.map((th) => ({ th, pass: 1, cnt: [0, 0] }));
  atoms = []; finalCnt = [0, 0]; sel = 0;
}

// 画面の配置
let cy, ovenX;
function boxX(i) { let sp = (width - 420) / stages.length; return 260 + sp * i + sp * 0.3; }
function portY(s) { return cy - s * 50; }   // + は上、− は下

// ★ 1 個の原子の運命をシミュレーションして、通り道（点の列）を作る
//   スピンの向き s（単位ベクトル）。軸 n で測ると + になる確率 = (1 + s·n) / 2 = cos²(角度の差 / 2)
//   測ったあと s は +n か −n に「収縮」する
function makeAtom() {
  // 炉から出る原子のスピンはばらばらの向き（3D でランダム）
  let u = random(-1, 1), ph = random(TWO_PI);
  let s = { x: sqrt(1 - u * u) * cos(ph), y: sqrt(1 - u * u) * sin(ph), z: u };
  let path = [{ x: ovenX, y: cy }], outcomes = [];
  for (let i = 0; i < stages.length; i++) {
    let th = radians(stages[i].th), n = { x: sin(th), y: 0, z: cos(th) };
    let pPlus = (1 + s.x * n.x + s.y * n.y + s.z * n.z) / 2;
    let out = random() < pPlus ? 1 : -1;
    s = { x: out * n.x, y: out * n.y, z: out * n.z };
    outcomes.push(out);
    let bx = boxX(i);
    path.push({ x: bx - 60, y: cy }, { x: bx + 60, y: cy - out * 22 }, { x: bx + 100, y: portY(out) });
    let last = i === stages.length - 1;
    if (last) { path.push({ x: width - 110, y: cy - out * 110 }); break; }
    if (out !== stages[i].pass) { path.push({ x: bx + 150, y: cy - out * 105 }); break; }   // 止められる
    path.push({ x: boxX(i + 1) - 90, y: cy });
  }
  return { path, seg: 0, f: 0, outcomes };
}

function draw() {
  background(260, 25, 10);
  cy = height * 0.55; ovenX = 90;
  let n = floor(rate) + (random() < rate % 1 ? 1 : 0);
  for (let i = 0; i < n && atoms.length < 500; i++) atoms.push(makeAtom());

  // ビームの道（うすく）
  stroke(0, 0, 100, 10); strokeWeight(14); noFill();
  // 炉
  noStroke(); fill(15, 70, 70); rect(ovenX - 50, cy - 30, 50, 60, 6);
  fill(0, 0, 100); textSize(13); text('炉', ovenX - 34, cy + 50);

  // 装置
  for (let i = 0; i < stages.length; i++) {
    let st = stages[i], bx = boxX(i), last = i === stages.length - 1;
    fill(i === sel ? 200 : 230, 40, i === sel ? 55 : 35); stroke(i === sel ? color(55, 80, 100) : color(0, 0, 50)); strokeWeight(2);
    rect(bx - 60, cy - 45, 120, 90, 8);
    // 軸の向き（矢印）
    let th = radians(st.th);
    stroke(55, 90, 100); strokeWeight(4);
    line(bx - 28 * sin(th), cy + 28 * cos(th), bx + 28 * sin(th), cy - 28 * cos(th));
    noStroke(); fill(55, 90, 100); circle(bx + 28 * sin(th), cy - 28 * cos(th), 10);
    fill(0, 0, 100); textSize(15); textAlign(CENTER);
    text(st.th === 0 ? 'z' : st.th === 90 ? 'x' : st.th + '°', bx, cy - 55);
    // 出口と通すほう
    for (let s of [1, -1]) {
      let passOK = last || st.pass === s;
      fill(passOK ? color(120, 70, 90) : color(0, 70, 80));
      circle(bx + 100, portY(s), 22);
      fill(0, 0, 10); textSize(14); text(s > 0 ? '+' : '−', bx + 100, portY(s) + 5);
      if (!passOK) { fill(0, 0, 40); rect(bx + 140, cy - s * 105 - 14, 14, 28); }
      fill(0, 0, 100); textSize(13);
      text(st.cnt[s > 0 ? 0 : 1], bx + 100, portY(s) - s * 22 + (s > 0 ? 0 : 10));
    }
    let tot = st.cnt[0] + st.cnt[1];
    fill(0, 0, 70); textSize(13);
    text(tot ? '+ ' + nf((100 * st.cnt[0]) / tot, 1, 0) + '%' : '', bx, cy + 68);
    textAlign(LEFT);
  }
  // 最後のスクリーン
  fill(0, 0, 25); rect(width - 120, cy - 150, 24, 300);
  fill(0, 0, 100); textSize(15);
  text('+ ' + finalCnt[0], width - 90, cy - 105); text('− ' + finalCnt[1], width - 90, cy + 118);

  // 原子を動かす
  noStroke(); fill(190, 60, 100);
  for (let a of atoms) {
    let p = a.path[a.seg], q = a.path[a.seg + 1];
    let d = max(1, dist(p.x, p.y, q.x, q.y));
    a.f += speed / d;
    if (a.f >= 1) { a.f = 0; a.seg++; }
    if (a.seg >= a.path.length - 1) { a.done = true; continue; }
    p = a.path[a.seg]; q = a.path[a.seg + 1];
    circle(lerp(p.x, q.x, a.f), lerp(p.y, q.y, a.f), 5);
  }
  for (let a of atoms) if (a.done) {           // 着いた原子を数える
    a.outcomes.forEach((o, i) => { if (stages[i]) stages[i].cnt[o > 0 ? 0 : 1]++; });
    if (a.outcomes.length === stages.length) finalCnt[a.outcomes[a.outcomes.length - 1] > 0 ? 0 : 1]++;
  }
  atoms = atoms.filter((a) => !a.done);

  fill(0, 0, 100); textSize(18);
  text('箱をクリック：軸　←→：選んだ箱を 15°　出口クリック：通すほう　1〜4：例　↑↓ 原子 ' + nf(rate, 1, 2) + '/フレーム　C：消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('z で + を選んだ原子を z で測ると 100% +。でも間に x をはさむと最後の z は 50% / 50%。角度の差 Δ なら P(+) = cos²(Δ/2)', 20, 68);
  // 理論の確率
  let txt = '理論：';
  for (let i = 1; i < stages.length; i++) {
    let d = radians(stages[i].th - stages[i - 1].th), p = stages[i - 1].pass > 0 ? sq(cos(d / 2)) : sq(sin(d / 2));
    txt += '  ' + (i + 1) + ' 台目の + = cos²(Δ/2) = ' + nf(p * 100, 1, 0) + '%';
  }
  text(stages.length > 1 ? txt : '理論：1 台目はいつも 50% / 50%（スピンはばらばら）', 20, height - 30);
}

function mousePressed() {
  for (let i = 0; i < stages.length; i++) {
    let bx = boxX(i);
    for (let s of [1, -1]) if (dist(mouseX, mouseY, bx + 100, portY(s)) < 16 && i < stages.length - 1) { stages[i].pass = s; clearCounts(); return; }
    if (abs(mouseX - bx) < 60 && abs(mouseY - cy) < 45) {
      sel = i;
      let order = [0, 45, 90];
      let k = order.indexOf(stages[i].th);
      stages[i].th = order[(k + 1) % 3];
      clearCounts();
      return;
    }
  }
}
function clearCounts() { for (let st of stages) st.cnt = [0, 0]; finalCnt = [0, 0]; atoms = []; }

function keyPressed() {
  if (key >= '1' && key <= '4') preset(int(key));
  if (key === UP_ARROW) rate = min(5, rate * 1.5);
  if (key === DOWN_ARROW) rate = max(0.05, rate / 1.5);
  if (key === RIGHT_ARROW && stages[sel]) { stages[sel].th = (stages[sel].th + 15) % 360; clearCounts(); }
  if (key === LEFT_ARROW && stages[sel]) { stages[sel].th = (stages[sel].th + 345) % 360; clearCounts(); }
  if (key === 'c' || key === 'C') clearCounts();
}

// ---------- やってみよう ----------
// 1. 2（z-z）で 2 台目は 100% +。2 台目の軸を 15° ずつ回して、+ の割合が cos²(Δ/2) になるか確かめよう
// 2. 4（z-x-z）の 2 台目の出口を − に変えても、最後は半々？
// 3. 2 台目の軸を 180° にすると？（z の下向き = 「−z で +」）
// 4. 装置を 4 台以上に増やして（preset に配列を足す）、少しずつ回した軸を並べると、スピンを止めずに 90° 回せる？（量子ゼノン効果）
