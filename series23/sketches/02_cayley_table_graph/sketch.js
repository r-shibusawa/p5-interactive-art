// ============================================
// 02 ケイリー表とケイリーグラフ
// 群を「表」と「グラフ」で見る。グラフの点 = 元、矢印 = 生成元を掛ける（x → x·g）
//   生成元の矢印だけで全部の点に行ける = 生成元で群がつくれる
// 1 = Zₙ（時計の足し算）/ 2 = Dₙ（二面体群）/ 3 = Z₂×Z₂（クラインの四元群）/ 4 = S₃（3 個の並べかえ）
// ↑↓ = n / 表のマスや点にマウスを乗せる = 掛け算を表示 / G = 生成元の矢印を切りかえ
// ============================================

let groupNo = 2;
let n = 4;               // ★ Zₙ, Dₙ の n
let G;                   // 今の群 { name, els, mul, gens, pos }
let showGen = [true, true];
let hoverCell = null, hoverNode = -1;
const GEN_COLS = [[230, 70, 90], [40, 130, 230]];

function setup() {
  createCanvas(windowWidth, windowHeight);
  build();
}

// 群をつくる：元の名前の配列と、掛け算 mul(i, j) = 「i をしてから j」の番号
function build() {
  if (groupNo === 1) {
    G = { name: 'Z' + sub(n) + '（' + n + ' 時間の時計）', els: [...Array(n).keys()].map(String), mul: (i, j) => (i + j) % n, gens: [1] };
    G.pos = G.els.map((_, i) => ringPos(i, n, 1));
  } else if (groupNo === 2) {
    let els = [];
    for (let f = 0; f < 2; f++) for (let k = 0; k < n; k++) els.push([k, f]);
    let nm = (e) => (e[0] === 0 && !e[1] ? 'e' : (e[0] ? 'r' + (e[0] > 1 ? e[0] : '') : '') + (e[1] ? 's' : ''));
    G = { name: 'D' + sub(n) + '（正 ' + n + ' 角形の対称性）', els: els.map(nm), gens: [1, n] };
    G.mul = (i, j) => { let x = els[i], y = els[j]; return ((((y[0] + (y[1] ? -x[0] : x[0])) % n) + n) % n) + ((x[1] + y[1]) % 2) * n; };
    G.pos = els.map((e, i) => ringPos(e[0], n, e[1] ? 0.5 : 1, e[1]));
  } else if (groupNo === 3) {
    let els = [[0, 0], [1, 0], [0, 1], [1, 1]];
    G = { name: 'Z₂×Z₂（クラインの四元群）', els: els.map((e) => '(' + e + ')'), gens: [1, 2] };
    G.mul = (i, j) => ((els[i][0] + els[j][0]) % 2) + ((els[i][1] + els[j][1]) % 2) * 2;
    G.pos = [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]];
  } else {
    let perms = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [1, 0, 2], [0, 2, 1], [2, 1, 0]];
    let findP = (p) => perms.findIndex((q) => q.join() === p.join());
    G = { name: 'S₃（3 個の並べかえ）', els: perms.map(cycleName), gens: [1, 3] };
    G.mul = (i, j) => findP([0, 1, 2].map((x) => perms[j][perms[i][x]]));   // i をしてから j
    G.pos = perms.map((_, i) => ringPos(i % 3, 3, i < 3 ? 1 : 0.5, i >= 3));
  }
}
function ringPos(k, m, r, inner) { let a = -HALF_PI + (inner ? -1 : 1) * (k * TWO_PI) / m; return [r * cos(a), r * sin(a)]; }
function cycleName(p) {
  let seen = [], out = '';
  for (let i = 0; i < 3; i++) {
    if (seen[i] || p[i] === i) continue;
    let c = [], j = i;
    while (!seen[j]) { seen[j] = true; c.push(j + 1); j = p[j]; }
    out += '(' + c.join(' ') + ')';
  }
  return out || 'e';
}
function sub(k) { return String(k).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[+d]).join(''); }

function draw() {
  background(18, 20, 28);
  let N = G.els.length;
  // 表
  let x0 = 30, y0 = 110;
  let cs = min((width * 0.46) / (N + 1), (height - 180) / (N + 1));
  hoverCell = null;
  textAlign(CENTER, CENTER);
  for (let i = -1; i < N; i++) for (let j = -1; j < N; j++) {
    let x = x0 + (j + 1) * cs, y = y0 + (i + 1) * cs;
    if (i < 0 && j < 0) continue;
    if (i < 0 || j < 0) { fill(200); noStroke(); textSize(min(18, cs * 0.34)); text(G.els[i < 0 ? j : i], x + cs / 2, y + cs / 2); continue; }
    let p = G.mul(i, j);
    let over = mouseX > x && mouseX < x + cs && mouseY > y && mouseY < y + cs;
    if (over) hoverCell = [i, j];
    colorMode(HSB); fill((p * 360) / N, 55, over ? 100 : 80); colorMode(RGB);
    stroke(18, 20, 28); strokeWeight(1.5);
    rect(x, y, cs, cs, 3);
    noStroke(); fill(15); textSize(min(18, cs * 0.34));
    text(G.els[p], x + cs / 2, y + cs / 2);
  }
  textAlign(LEFT, BASELINE);

  // グラフ
  let gx = width * 0.74, gy = height * 0.52, gr = min(width * 0.2, height * 0.32);
  hoverNode = -1;
  for (let i = 0; i < N; i++) if (dist(mouseX, mouseY, gx + G.pos[i][0] * gr, gy + G.pos[i][1] * gr) < 24) hoverNode = i;
  let focus = hoverCell ? hoverCell[0] : hoverNode;
  G.gens.forEach((gi, c) => {
    if (!showGen[c]) return;
    for (let i = 0; i < N; i++) {
      let j = G.mul(i, gi);
      let a = [gx + G.pos[i][0] * gr, gy + G.pos[i][1] * gr], b = [gx + G.pos[j][0] * gr, gy + G.pos[j][1] * gr];
      let al = focus < 0 || focus === i ? 230 : 50;
      arrow(a, b, GEN_COLS[c], al, G.mul(j, gi) === i);
    }
  });
  // 掛け算の経路（表のマスに乗せたとき：i → i·j）
  if (hoverCell) {
    let [i, j] = hoverCell, p = G.mul(i, j);
    stroke(255, 220, 90); strokeWeight(5); noFill();
    line(gx + G.pos[i][0] * gr, gy + G.pos[i][1] * gr, gx + G.pos[p][0] * gr, gy + G.pos[p][1] * gr);
  }
  for (let i = 0; i < N; i++) {
    let x = gx + G.pos[i][0] * gr, y = gy + G.pos[i][1] * gr;
    colorMode(HSB); fill((i * 360) / N, 55, 85); colorMode(RGB);
    stroke(hoverCell && (hoverCell[0] === i || G.mul(...hoverCell) === i) ? 255 : 18); strokeWeight(3);
    circle(x, y, 40);
    noStroke(); fill(15); textAlign(CENTER, CENTER); textSize(14);
    text(G.els[i], x, y);
    textAlign(LEFT, BASELINE);
  }

  // 文字
  noStroke(); fill(255); textSize(18);
  text('1：Zₙ　2：Dₙ　3：Z₂×Z₂　4：S₃　↑↓：n = ' + n + '　G：矢印の切りかえ　マウス：表のマスや点に乗せる', 20, 36);
  fill(170); textSize(15);
  text(G.name + '　位数 ' + N + '　｜　表の行 a・列 b = 「a をしてから b」。色が同じ = 同じ元', 20, 62);
  let gy2 = height - 60;
  G.gens.forEach((gi, c) => {
    fill(...GEN_COLS[c]); textSize(16);
    text('━▶ ·' + G.els[gi] + (showGen[c] ? '' : '（非表示）'), width * 0.56 + c * 170, gy2);
  });
  fill(255); textSize(20);
  if (hoverCell) text(G.els[hoverCell[0]] + ' · ' + G.els[hoverCell[1]] + ' = ' + G.els[G.mul(...hoverCell)], width * 0.56, 110);
  else if (hoverNode >= 0) text('点 ' + G.els[hoverNode] + ' から出る矢印 = ' + G.els[hoverNode] + '·生成元', width * 0.56, 110);
  fill(170); textSize(14);
  let comm = true;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (G.mul(i, j) !== G.mul(j, i)) comm = false;
  text(comm ? '可換（表が対角線で対称）' : '非可換（表が対角線で対称でない）', width * 0.56, 136);
}

// 矢印（両向きなら線だけ）
function arrow(a, b, c, al, both) {
  let ang = atan2(b[1] - a[1], b[0] - a[0]), d = dist(a[0], a[1], b[0], b[1]);
  if (d < 1) return;
  let off = both ? 0 : 6;                      // 行きと帰りが重ならないように少しずらす
  let ox = -sin(ang) * off, oy = cos(ang) * off;
  let s = [a[0] + cos(ang) * 22 + ox, a[1] + sin(ang) * 22 + oy], e = [b[0] - cos(ang) * 22 + ox, b[1] - sin(ang) * 22 + oy];
  stroke(c[0], c[1], c[2], al); strokeWeight(3);
  line(s[0], s[1], e[0], e[1]);
  if (both) return;
  noStroke(); fill(c[0], c[1], c[2], al);
  triangle(e[0], e[1], e[0] - 13 * cos(ang - 0.4), e[1] - 13 * sin(ang - 0.4), e[0] - 13 * cos(ang + 0.4), e[1] - 13 * sin(ang + 0.4));
}

function keyPressed() {
  if (key >= '1' && key <= '4' && key.length === 1) { groupNo = +key; build(); }
  if (key === UP_ARROW) { n = min(n + 1, 10); build(); }
  if (key === DOWN_ARROW) { n = max(n - 1, 2); build(); }
  if (key === 'g' || key === 'G') {
    showGen = showGen[0] && showGen[1] ? [true, false] : showGen[0] ? [false, true] : [true, true];
  }
  return false;
}

// ---------- やってみよう ----------
// 1. Z₆ と S₃ はどちらも位数 6。表を比べると？（Z₆ は可換、S₃ は非可換 → 違う群）
// 2. D₃ と S₃ のグラフの形を比べよう。同じ形 = 同型（三角形の対称性 = 3 頂点の並べかえ）
// 3. Z₄ と Z₂×Z₂ はどちらも位数 4。何が違う？（表の対角線：a·a）
// 4. G で生成元を 1 つだけにすると、Dₙ では全部の点に行けない（回転だけの輪）
// 5. Zₙ の生成元を 1 から 2 に変えると？（n が偶数だと半分にしか行けない）gens を書きかえよう
