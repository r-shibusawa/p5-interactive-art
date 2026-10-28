// ============================================
// 15 カメラ映像で施設配置（おまけ）
// カメラに映った明るい点（スマホのライト、白い紙）や選んだ色の場所を「お客さんがいる所」とみなして、拠点をリアルタイムに置き直す
//   拠点は「自分に一番近いお客さんたち」の距離の合計が最小になる位置（ワイスフェルト法）へ少しずつ動く → 11 の p メディアンの連続版
// ↑↓ = 拠点の数 / ←→ = しきい値 / B = 明るい所モード / 映像をクリック = その色を追う / V = 映像の表示 / （カメラがないときはマウスの通った所がお客さん）
// ============================================

let cap;
let vw = 160, vh = 120;                // ★ カメラ画像の大きさ（小さいほど速い）
let stepPx = 4;                        // ★ 何画素おきに調べるか
let P = 3;                             // ★ 拠点の数
let thr = 200;                         // ★ 明るさのしきい値（0〜255）
let colorThr = 70;
let mode = 'bright';                   // 'bright' か 'color'
let pick = [255, 0, 0];
let showVideo = true;
let demand = [];                       // お客さん { x, y, w }（0〜1 の座標）
let fac = [];                          // 拠点 { x, y }（0〜1 の座標）
let trail = [];                        // マウスの通った所（カメラがないとき）
let usingMouse = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  for (let k = 0; k < P; k++) fac.push({ x: random(0.2, 0.8), y: random(0.2, 0.8) });
}
function area() { let h = height - 150, w = h * 4 / 3; if (w > width * 0.68) { w = width * 0.68; h = w * 3 / 4; } return { x: 30, y: 110, w, h }; }

// ★ カメラ画像からお客さんの点を集める
function findDemand() {
  let pts = [];
  if (cap.width === 0) return pts;
  cap.loadPixels();
  if (cap.pixels.length < vw * vh * 4) return pts;
  let px = cap.pixels;
  for (let y = 0; y < vh; y += stepPx) for (let x = 0; x < vw; x += stepPx) {
    let i = (x + y * vw) * 4, r = px[i], g = px[i + 1], b = px[i + 2];
    if (mode === 'bright') { let br = (r + g + b) / 3; if (br > thr) pts.push({ x: x / vw, y: y / vh, w: (br - thr) / (255 - thr + 1) + 0.2 }); }
    else { let dc = abs(r - pick[0]) + abs(g - pick[1]) + abs(b - pick[2]); if (dc < colorThr) pts.push({ x: x / vw, y: y / vh, w: 1 }); }
  }
  return pts;
}

// ★ ワイスフェルト法の 1 回：各拠点を「担当するお客さんの重みつき・距離で割った平均」へ動かす
function updateFacilities() {
  let groups = fac.map(() => []);
  for (let p of demand) {
    let b = 0, bd = Infinity;
    for (let k = 0; k < fac.length; k++) { let dd = (p.x - fac[k].x) ** 2 + (p.y - fac[k].y) ** 2; if (dd < bd) { bd = dd; b = k; } }
    groups[b].push(p);
  }
  for (let k = 0; k < fac.length; k++) {
    let g = groups[k];
    if (!g.length) {                                   // 担当がいない拠点は、一番遠いお客さんの所へワープ
      let far = null, fd = -1;
      for (let p of demand) { let m = Infinity; for (let f of fac) m = min(m, (p.x - f.x) ** 2 + (p.y - f.y) ** 2); if (m > fd) { fd = m; far = p; } }
      if (far) { fac[k].x = far.x; fac[k].y = far.y; }
      continue;
    }
    let sx = 0, sy = 0, sw = 0;
    for (let p of g) { let d = max(0.005, Math.hypot(p.x - fac[k].x, p.y - fac[k].y)), w = p.w / d; sx += w * p.x; sy += w * p.y; sw += w; }
    fac[k].x = lerp(fac[k].x, sx / sw, 0.3); fac[k].y = lerp(fac[k].y, sy / sw, 0.3);
  }
  return groups;
}

function draw() {
  background(225, 30, 12);
  let A = area();
  let pts = findDemand();
  if (pts.length >= 3) { demand = pts.slice(0, 600); usingMouse = false; }
  else {
    usingMouse = true;
    if (mouseX > A.x && mouseX < A.x + A.w && mouseY > A.y && mouseY < A.y + A.h && (mouseX !== pmouseX || mouseY !== pmouseY))
      trail.push({ x: (mouseX - A.x) / A.w + random(-0.01, 0.01), y: (mouseY - A.y) / A.h + random(-0.01, 0.01), w: 1 });
    if (trail.length > 300) trail.shift();
    demand = trail;
  }
  let groups = demand.length ? updateFacilities() : fac.map(() => []);

  // 映像
  if (showVideo && cap.width > 0) { tint(0, 0, 100, 45); image(cap, A.x, A.y, A.w, A.h); noTint(); }
  else { noStroke(); fill(225, 25, 16); rect(A.x, A.y, A.w, A.h); }
  noFill(); stroke(0, 0, 100, 30); strokeWeight(1); rect(A.x, A.y, A.w, A.h);
  // お客さんと担当の線
  let total = 0;
  for (let k = 0; k < fac.length; k++) {
    let hu = (k * 67 + 30) % 360, fx = A.x + fac[k].x * A.w, fy = A.y + fac[k].y * A.h;
    for (let p of groups[k]) {
      let x = A.x + p.x * A.w, y = A.y + p.y * A.h;
      stroke(hu, 60, 100, 25); strokeWeight(1); line(x, y, fx, fy);
      noStroke(); fill(hu, 50, 100, 80); circle(x, y, 3 + p.w * 4);
      total += p.w * Math.hypot(p.x - fac[k].x, p.y - fac[k].y);
    }
  }
  for (let k = 0; k < fac.length; k++) {
    let fx = A.x + fac[k].x * A.w, fy = A.y + fac[k].y * A.h;
    fill((k * 67 + 30) % 360, 80, 100); stroke(0, 0, 100); strokeWeight(2); rect(fx - 12, fy - 12, 24, 24, 5);
    noStroke(); fill(0, 0, 10); textSize(13); textAlign(CENTER, CENTER); text(k + 1, fx, fy); textAlign(LEFT, BASELINE);
  }

  // 右：説明
  let rx = A.x + A.w + 40;
  fill(0, 0, 100); textSize(18); text(usingMouse ? 'マウスモード' : (mode === 'bright' ? '明るい所モード' : '色モード'), rx, 130);
  fill(0, 0, 80); textSize(14);
  let lines = [
    'お客さん ' + demand.length + ' 点　拠点 ' + P,
    '距離の合計（重みつき）' + nf(total, 1, 2),
    mode === 'bright' ? '明るさのしきい値 ' + thr : '色の近さのしきい値 ' + colorThr,
    cap.width > 0 ? 'カメラ OK' : 'カメラ待ち…（許可が必要）',
    '',
    usingMouse ? '映像の上でマウスを動かすと、' : 'ライトや白い紙を動かすと',
    usingMouse ? '通った所がお客さんになる' : '拠点が追いかけて配置し直す',
    '',
    '担当がいなくなった拠点は',
    '一番遠いお客さんの所へワープする',
    '（局所解から抜けるための工夫）',
  ];
  lines.forEach((s, i) => text(s, rx, 166 + i * 24));
  if (mode === 'color') { colorMode(RGB); fill(pick[0], pick[1], pick[2]); rect(rx, 450, 50, 30, 4); colorMode(HSB, 360, 100, 100, 100); fill(0, 0, 80); text('追う色', rx + 60, 470); }

  fill(0, 0, 100); textSize(18);
  text('↑↓ 拠点の数 ' + P + '　←→ しきい値　B：明るい所　映像をクリック：その色を追う　V：映像 ' + (showVideo ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('□ = 拠点。映像の中のお客さんに合わせて、拠点が「みんなに近い場所」へ動き続ける（カメラの許可が必要。なければマウス）', 20, 68);
}

function mousePressed() {
  let A = area();
  if (cap.width > 0 && mouseX > A.x && mouseX < A.x + A.w && mouseY > A.y && mouseY < A.y + A.h) {
    let ix = constrain(floor((mouseX - A.x) / A.w * vw), 0, vw - 1), iy = constrain(floor((mouseY - A.y) / A.h * vh), 0, vh - 1);
    cap.loadPixels();
    let i = (ix + iy * vw) * 4;
    if (cap.pixels.length > i + 2) { pick = [cap.pixels[i], cap.pixels[i + 1], cap.pixels[i + 2]]; mode = 'color'; }
  }
}
function keyPressed() {
  if (key === UP_ARROW && P < 8) { P++; fac.push({ x: random(0.2, 0.8), y: random(0.2, 0.8) }); }
  if (key === DOWN_ARROW && P > 1) { P--; fac.pop(); }
  if (key === RIGHT_ARROW) { if (mode === 'bright') thr = min(250, thr + 5); else colorThr = min(250, colorThr + 10); }
  if (key === LEFT_ARROW) { if (mode === 'bright') thr = max(50, thr - 5); else colorThr = max(10, colorThr - 10); }
  if (key === 'b' || key === 'B') mode = 'bright';
  if (key === 'v' || key === 'V') showVideo = !showVideo;
}

// ---------- やってみよう ----------
// 1. ライトを 2 つ（スマホ 2 台）映して、拠点 2 つがそれぞれを担当するか見よう
// 2. 拠点の動きを Weiszfeld（距離の合計）から「平均」（k-means：距離の 2 乗の合計）に変えると、置き場所はどう変わる？
// 3. 最大被覆（11 の 2）のように「半径 R 以内に入る点の数」を最大にする動き方を考えよう
// 4. 拠点が動いたときに音を鳴らす（14 の道具をコピー）と、インスタレーション作品になる
