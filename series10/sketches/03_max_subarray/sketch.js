// ============================================
// 03 最大部分配列（分割統治）
// 株価の上がり下がり（毎日の変化）から「いつ買って、いつ売れば一番もうかるか」を探す
// 総当たりは n² 通り。分割統治は「左だけ」「右だけ」「真ん中をまたぐ」の 3 つに分けて n log n
// さらに 1 回なめるだけ（n）のカダンの方法もある
// スペース：再生／停止　→：1 手　1：分割統治　2：カダン　3：総当たり　R：新しいデータ　↑↓ 速さ
// ============================================

let n = 24;              // ★ 日数
let speed = 6;
let d = [], gen, method = 1, playing = true, acc = 0, done = false, ops = 0;
let hl = { lo: -1, hi: -1, a: -1, b: -1, mid: -1 };
let best = { lo: 0, hi: -1, sum: -Infinity };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  newData();
}

function newData() {
  d = [];
  for (let i = 0; i < n; i++) d.push(floor(random(-12, 13)));
  restart();
}

function restart() {
  ops = 0; done = false; best = { lo: 0, hi: -1, sum: -Infinity };
  hl = { lo: -1, hi: -1, a: -1, b: -1, mid: -1 };
  if (d.length === 0) { done = true; return; }
  if (method === 1) gen = (function* () { let r = yield* findMax(0, d.length - 1); best = r; })();
  if (method === 2) gen = kadane();
  if (method === 3) gen = brute();
}

function* findCrossing(lo, mid, hi) {
  let s = 0, leftSum = -Infinity, maxL = mid;
  for (let i = mid; i >= lo; i--) { s += d[i]; ops++; if (s > leftSum) { leftSum = s; maxL = i; } hl = { lo, hi, mid, a: i, b: mid }; yield; }
  s = 0; let rightSum = -Infinity, maxR = mid + 1;
  for (let j = mid + 1; j <= hi; j++) { s += d[j]; ops++; if (s > rightSum) { rightSum = s; maxR = j; } hl = { lo, hi, mid, a: maxL, b: j }; yield; }
  return { lo: maxL, hi: maxR, sum: leftSum + rightSum };
}

// 分割統治：左半分・右半分・真ん中をまたぐ、の 3 つのうち一番大きいもの
function* findMax(lo, hi) {
  if (lo === hi) { ops++; return { lo, hi, sum: d[lo] }; }
  let mid = floor((lo + hi) / 2);
  hl = { lo, hi, mid, a: -1, b: -1 }; yield;
  let L = yield* findMax(lo, mid);
  let R = yield* findMax(mid + 1, hi);
  let C = yield* findCrossing(lo, mid, hi);
  let r = L.sum >= R.sum && L.sum >= C.sum ? L : R.sum >= L.sum && R.sum >= C.sum ? R : C;
  if (r.sum > best.sum) best = r;
  return r;
}

function* kadane() {
  let cur = 0, start = 0;
  for (let i = 0; i < d.length; i++) {
    ops++;
    if (cur <= 0) { cur = d[i]; start = i; } else cur += d[i];   // マイナスを引きずるなら捨てて今日から
    if (cur > best.sum) best = { lo: start, hi: i, sum: cur };
    hl = { lo: -1, hi: -1, mid: -1, a: start, b: i }; yield;
  }
}

function* brute() {
  for (let i = 0; i < d.length; i++) {
    let s = 0;
    for (let j = i; j < d.length; j++) {
      s += d[j]; ops++;
      if (s > best.sum) best = { lo: i, hi: j, sum: s };
      hl = { lo: -1, hi: -1, mid: -1, a: i, b: j }; yield;
    }
  }
}

function advance() { if (done) return; let r = gen.next(); if (r.done) { done = true; hl = { lo: -1, hi: -1, a: -1, b: -1, mid: -1 }; } }

function draw() {
  background(200, 35, 9);
  if (playing && !done) { acc += speed / 60; while (acc >= 1) { advance(); acc--; } }
  let L = 70, R = width - 70, w = (R - L) / max(1, d.length);
  let midY = height * 0.42, sc = (height * 0.22) / 12;
  // 範囲
  if (hl.lo >= 0) { noStroke(); fill(200, 40, 30, 60); rect(L + hl.lo * w, midY - 13 * sc, (hl.hi - hl.lo + 1) * w, 26 * sc); }
  if (hl.mid >= 0) { stroke(45, 80, 100); strokeWeight(2); line(L + (hl.mid + 1) * w, midY - 14 * sc, L + (hl.mid + 1) * w, midY + 14 * sc); }
  if (best.hi >= best.lo && best.hi >= 0) { noStroke(); fill(140, 70, 60, 50); rect(L + best.lo * w, midY + 14 * sc, (best.hi - best.lo + 1) * w, 10); }
  if (hl.a >= 0) { noStroke(); fill(45, 80, 100, 30); rect(L + min(hl.a, hl.b) * w, midY - 13 * sc, (abs(hl.b - hl.a) + 1) * w, 26 * sc); }
  for (let i = 0; i < d.length; i++) {
    let h = d[i] * sc;
    noStroke();
    let inBest = i >= best.lo && i <= best.hi;
    fill(d[i] >= 0 ? color(140, inBest ? 80 : 45, inBest ? 95 : 70) : color(0, inBest ? 80 : 45, inBest ? 95 : 70));
    rect(L + i * w + 2, midY - max(h, 0), w - 4, abs(h), 3);
    fill(0, 0, 70); textSize(11); textAlign(CENTER, CENTER);
    text(d[i], L + i * w + w / 2, midY + (d[i] >= 0 ? 12 : -12));
  }
  stroke(0, 0, 50); strokeWeight(1); line(L, midY, R, midY);
  // 株価（累積和）
  let p = 0, pts = [0];
  for (let v of d) { p += v; pts.push(p); }
  let py0 = height - 80, psc = (height * 0.22) / max(1, max(pts.map(abs)));
  noFill(); stroke(190, 70, 100); strokeWeight(2.5);
  beginShape();
  for (let i = 0; i < pts.length; i++) vertex(L + i * w, py0 - height * 0.12 - pts[i] * psc * 0.5);
  endShape();
  if (best.hi >= best.lo && best.hi >= 0) {
    noStroke(); fill(140, 80, 100);
    circle(L + best.lo * w, py0 - height * 0.12 - pts[best.lo] * psc * 0.5, 12);
    fill(330, 80, 100);
    circle(L + (best.hi + 1) * w, py0 - height * 0.12 - pts[best.hi + 1] * psc * 0.5, 12);
  }
  noStroke(); fill(0, 0, 60); textSize(13); textAlign(LEFT, BASELINE);
  text('下：株価（毎日の変化を足したもの）。緑の点で買って、ピンクの点で売る', L, height - 30);

  let names = ['', '分割統治 Θ(n log n)', 'カダンの方法 Θ(n)', '総当たり Θ(n²)'];
  fill(0, 0, 100); textSize(22);
  text('最大部分配列　' + names[method] + '　計算 ' + ops + ' 回　いまの最大 ' + (best.sum === -Infinity ? '—' : best.sum) + (done ? '　完成！' : ''), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('スペース：' + (playing ? '停止' : '再生') + '　→：1手　1 分割統治　2 カダン　3 総当たり　R：新しいデータ　↑↓ 速さ ' + speed, 20, 68);
  text('黄色の線 = 真ん中（分割統治は、左だけ・右だけ・真ん中をまたぐ の 3 つの最大を比べる）', 20, 92);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; advance(); }
  if (key === 'r' || key === 'R') newData();
  if (key >= '1' && key <= '3') { method = int(key); restart(); }
  if (key === UP_ARROW) speed = min(240, speed * 2);
  if (key === DOWN_ARROW) speed = max(1, speed / 2);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 3 つの方法で計算回数を比べる。n を 2 倍にすると、それぞれ何倍になる？
// 2. 全部マイナスのデータ（random(-12, 0)）だと答えはどうなる？
// 3. カダンの方法がなぜ正しいのか、「マイナスの和を引きずらない」で説明してみよう
