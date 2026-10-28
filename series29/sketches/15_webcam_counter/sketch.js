// ============================================
// 15 カメラで行列を数える（おまけ）
// カメラの前を横切った人（手・物）を「到着」として数え、到着率 λ をその場で推定する
//   前のフレームとの差（フレーム間差分）が、映像の中の黄色い線のまわりで急に増えたら 1 人と数える
//   集めた到着の間隔が指数分布、10 秒ごとの人数がポアソン分布に近いか確かめる（01 の答え合わせを本物のデータで）
// クリック = 手動で 1 人追加（カメラがなくても遊べる）/ ←→ = 動きのしきい値 / ↑↓ = 線の位置 / R = リセット（カメラの許可が必要）
// ============================================

let cap;
let vw = 160, vh = 120;    // ★ カメラ画像の大きさ（小さいほど速い）
let diffThr = 40;          // ★ 画素の明るさの差がこれ以上なら「動いた」
let bandHalf = 4;          // ★ 線のまわりの帯の半分の幅（画素）
let trigger = 0.12;        // ★ 帯の中で動いた画素の割合がこれを超えたら到着
let cooldown = 0.7;        // ★ 1 回数えたら、これだけ（秒）は数えない
let lineX = 80;
let prevGray = null, motionImg;
let arrivals = [], startT = 0, lastHit = -10, activity = 0, actRec = [];
let binSec = 10;           // ★ 人数を数える区間（秒）

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  motionImg = createImage(vw, vh);
  resetAll();
}
function resetAll() { arrivals = []; startT = millis() / 1000; lastHit = -10; }
function nowSec() { return millis() / 1000 - startT; }
function addArrival() { arrivals.push(nowSec()); }

// ★ フレーム間差分：線のまわりの帯で動いた画素の割合
function detect() {
  if (cap.width === 0) return 0;
  cap.loadPixels();
  let px = cap.pixels;
  if (!px || px.length < vw * vh * 4) return 0;
  let gray = new Float32Array(vw * vh);
  for (let i = 0; i < vw * vh; i++) gray[i] = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
  let moved = 0, total = 0;
  motionImg.loadPixels();
  for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
    let i = x + y * vw;
    let d = prevGray ? Math.abs(gray[i] - prevGray[i]) : 0;
    let m = d > diffThr;
    motionImg.pixels[i * 4] = 255; motionImg.pixels[i * 4 + 1] = 120; motionImg.pixels[i * 4 + 2] = 40; motionImg.pixels[i * 4 + 3] = m ? 200 : 0;
    if (Math.abs(x - lineX) <= bandHalf) { total++; if (m) moved++; }
  }
  motionImg.updatePixels();
  prevGray = gray;
  return moved / max(total, 1);
}

function draw() {
  background(60, 20, 11);
  activity = detect();
  let t = nowSec();
  if (activity > trigger && t - lastHit > cooldown) { addArrival(); lastHit = t; }
  actRec.push(activity); if (actRec.length > 300) actRec.shift();

  // ---- 映像
  let vx = 30, vy = 100, s = min((width * 0.42) / vw, (height * 0.42) / vh), w = vw * s, h = vh * s;
  if (cap.width > 0) { image(cap, vx, vy, w, h); image(motionImg, vx, vy, w, h); }
  else { noStroke(); fill(0, 0, 25); rect(vx, vy, w, h); fill(0, 0, 70); textSize(15); text('カメラ待ち… クリックで手動で数えられます', vx + 20, vy + h / 2); }
  let flash = t - lastHit < 0.3;
  stroke(flash ? color(0, 80, 100) : color(55, 90, 100)); strokeWeight(flash ? 5 : 2);
  line(vx + lineX * s, vy, vx + lineX * s, vy + h);
  noStroke(); fill(55, 90, 100, 15); rect(vx + (lineX - bandHalf) * s, vy, bandHalf * 2 * s, h);
  // 動きの量
  let ay = vy + h + 70;
  stroke(0, 0, 100, 30); strokeWeight(1); line(vx, ay, vx + w, ay);
  stroke(0, 70, 100, 60); let ty = ay - trigger * 200; line(vx, ty, vx + w, ty);
  noFill(); stroke(30, 80, 100); strokeWeight(1.5);
  beginShape(); for (let i = 0; i < actRec.length; i++) vertex(vx + i / 300 * w, ay - min(actRec[i], 0.3) * 200); endShape();
  noStroke(); fill(0, 0, 60); textSize(12); text('線のまわりの動きの量（赤い線を超えると 1 人）', vx, ay + 16);

  // ---- 推定
  let n = arrivals.length, T = max(t, 1e-3);
  let lamAll = n / T * 60;
  let recent = arrivals.filter((a) => a > t - 30).length;
  let gaps = []; for (let i = 1; i < n; i++) gaps.push(arrivals[i] - arrivals[i - 1]);
  let mg = 0; for (let g of gaps) mg += g; mg /= max(gaps.length, 1);
  let sd = 0; for (let g of gaps) sd += (g - mg) * (g - mg); sd = Math.sqrt(sd / max(gaps.length - 1, 1));
  let rx = width * 0.5, ry = 120;
  fill(0, 0, 100); textSize(22); text('数えた到着  ' + n + ' 人', rx, ry);
  textSize(16);
  text('到着率 λ ≒ ' + nf(lamAll, 1, 1) + ' 人/分（全体）　±' + nf(Math.sqrt(n) / T * 60, 1, 1), rx, ry + 30);
  text('最近 30 秒  ' + nf(recent * 2, 1, 0) + ' 人/分', rx, ry + 56);
  text('間隔の平均 ' + nf(mg, 1, 2) + ' 秒　変動係数 ' + (gaps.length > 2 ? nf(sd / max(mg, 1e-6), 1, 2) : '—') + '（ポアソンなら ≒ 1、規則的なら 0 に近い）', rx, ry + 82);

  // 間隔のヒストグラム vs 指数分布
  let gx = rx, gy = height * 0.62, gw = width * 0.44, gh = height * 0.2, nb = 12, xmax = max(4, mg * 4);
  let bins = new Array(nb).fill(0); for (let g of gaps) bins[min(nb - 1, floor(g / xmax * nb))]++;
  let lam = 1 / max(mg, 1e-6), bw = xmax / nb;
  let peak = lam * 1.2; for (let b of bins) peak = max(peak, b / max(gaps.length, 1) / bw);
  stroke(0, 0, 100, 30); strokeWeight(1); line(gx, gy, gx + gw, gy);
  noStroke(); fill(190, 60, 90, 70);
  for (let i = 0; i < nb; i++) { let hh = bins[i] / max(gaps.length, 1) / bw / peak * gh; rect(gx + i * gw / nb + 1, gy - hh, gw / nb - 2, hh); }
  if (gaps.length > 1) { noFill(); stroke(45, 90, 100); strokeWeight(2); beginShape(); for (let i = 0; i <= 50; i++) { let x = xmax * i / 50; vertex(gx + gw * i / 50, gy - lam * Math.exp(-lam * x) / peak * gh); } endShape(); }
  noStroke(); fill(0, 0, 60); textSize(12); text('到着の間隔（0〜' + nf(xmax, 1, 1) + ' 秒）と指数分布（黄）', gx, gy - gh - 6);

  // 区間ごとの人数 vs ポアソン
  let nBin = floor(t / binSec), cnt = new Array(nBin).fill(0);
  for (let a of arrivals) { let b = floor(a / binSec); if (b < nBin) cnt[b]++; }
  let m = lamAll / 60 * binSec, kmax = 10, freq = new Array(kmax + 1).fill(0);
  for (let c of cnt) freq[min(c, kmax)]++;
  let px = rx, py = height - 40, pw = gw, ph = height * 0.16, cw = pw / (kmax + 1);
  let pmf = [Math.exp(-m)]; for (let k = 1; k <= kmax; k++) pmf.push(pmf[k - 1] * m / k);
  stroke(0, 0, 100, 30); line(px, py, px + pw, py);
  noStroke();
  for (let k = 0; k <= kmax; k++) {
    let f = freq[k] / max(nBin, 1);
    fill(320, 50, 90, 70); rect(px + k * cw + 2, py - f * ph * 2, cw - 4, f * ph * 2);
    fill(45, 90, 100); circle(px + k * cw + cw / 2, py - min(pmf[k], 0.5) * ph * 2, 8);
    fill(0, 0, 60); textSize(11); textAlign(CENTER); text(k, px + k * cw + cw / 2, py + 13); textAlign(LEFT);
  }
  text(binSec + ' 秒ごとの人数（ピンク、区間 ' + nBin + ' 個）とポアソン分布（黄）', px, py - ph - 6);

  fill(0, 0, 100); textSize(18);
  text((cap.width > 0 ? 'カメラ OK' : 'カメラなし') + '　クリック：手動で 1 人　しきい値 ' + diffThr + '（←→）　線の位置（↑↓）　R：リセット　経過 ' + nf(t, 1, 0) + ' 秒', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('みんなで勝手なタイミングで手を横切らせると、間隔はほぼ指数分布に。メトロノームに合わせると変動係数が 0 に近づく（ポアソンではない）', 20, 68);
}

function mousePressed() { addArrival(); }
function keyPressed() {
  if (key === RIGHT_ARROW) diffThr = min(120, diffThr + 5);
  if (key === LEFT_ARROW) diffThr = max(10, diffThr - 5);
  if (key === UP_ARROW) lineX = min(vw - bandHalf - 1, lineX + 8);
  if (key === DOWN_ARROW) lineX = max(bandHalf, lineX - 8);
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. 2 分間、教室のみんなが好きなときに手を横切らせる。λ と変動係数を記録する
// 2. 手拍子に合わせて規則的に横切らせると、ヒストグラムの形はどう変わる？
// 3. 推定した λ を 03 の M/M/1 に入れて「窓口が 1 分に何人さばければ、平均の行列が 2 人以下か」を計算する
// 4. 線を 2 本にして、左→右と右→左を区別して数える（入店と退店）。店内人数 = 入 − 出 が数えられる
