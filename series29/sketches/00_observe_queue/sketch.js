// ============================================
// 00 行列を観察する
// お店に客がランダムにやってきて、窓口で 1 人ずつサービスを受けて帰っていく
//   行列の長さと待ち時間は「平均の到着の速さ λ」と「1 窓口の平均のサービスの速さ μ」で決まる。まずはじっくり眺めよう
// ↑↓ = 時間の速さ / ←→ = 到着の速さ λ / 1・2・3 = 窓口の数 / スペース = 一時停止 / R = リセット
// ============================================

let lambda = 0.8;      // ★ 1 分あたりの平均到着人数
let mu = 1.0;          // ★ 1 つの窓口が 1 分あたりにさばく平均人数
let nDesk = 1;         // 窓口の数
let speed = 2;         // ★ シミュレーションの速さ（1 秒で何分進むか）
let maxLine = 120;     // ★ これ以上並んでいたら入店をあきらめる
let paused = false;
let simT, nextArr;
let people = [];       // 画面に出ている客 {arr, start, end, state, x, y, tx, ty}
let desks = [];        // 窓口ごとにサービス中の客（いなければ null）
let waitLine = [];     // 並んでいる客（先頭が [0]）
let served, sumWait, maxQ, balked, areaN, lenRec;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
}

function resetAll() {
  simT = 0; nextArr = expRand(lambda);
  people = []; waitLine = []; desks = [];
  for (let i = 0; i < nDesk; i++) desks.push(null);
  served = 0; sumWait = 0; maxQ = 0; balked = 0; areaN = 0; lenRec = [];
}

function deskPos(i) { return { x: width * 0.66, y: height * 0.42 + (i - (nDesk - 1) / 2) * 90 }; }
function linePos(i) { return { x: width * 0.58 - i * 28, y: height * 0.42 + (i > 0 ? sin(i * 0.9) * 3 : 0) }; }

// ★ 1 つの事件（到着・サービス終了）ずつ時間を進める
function advance(tEnd) {
  while (true) {
    let tDone = Infinity, di = -1;
    for (let i = 0; i < nDesk; i++) if (desks[i] && desks[i].end < tDone) { tDone = desks[i].end; di = i; }
    let tn = min(nextArr, tDone);
    if (tn > tEnd) break;
    areaN += inSystem() * (tn - simT);
    simT = tn;
    if (nextArr <= tDone) {                                   // 到着
      nextArr = simT + expRand(lambda);
      if (waitLine.length >= maxLine) { balked++; continue; }
      let p = { arr: simT, start: -1, end: -1, state: 'wait', x: -20, y: height * 0.42, tx: 0, ty: 0 };
      people.push(p); waitLine.push(p);
    } else {                                                  // サービス終了
      desks[di].state = 'done'; desks[di] = null; served++;
    }
    // 空いた窓口に先頭の客を入れる
    for (let i = 0; i < nDesk; i++) {
      if (!desks[i] && waitLine.length > 0) {
        let p = waitLine.shift();
        p.start = simT; p.end = simT + expRand(mu); p.state = 'serve'; p.desk = i;
        desks[i] = p; sumWait += p.start - p.arr;
      }
    }
    maxQ = max(maxQ, waitLine.length);
  }
  areaN += inSystem() * (tEnd - simT);
  simT = tEnd;
}
function inSystem() { let n = waitLine.length; for (let d of desks) if (d) n++; return n; }

function draw() {
  background(30, 20, 13);
  if (!paused) advance(simT + speed / 60);
  if (frameCount % 3 === 0 && !paused) { lenRec.push(waitLine.length); if (lenRec.length > width - 80) lenRec.shift(); }

  // 店（床と窓口）
  noStroke();
  fill(30, 15, 20); rect(40, height * 0.2, width * 0.75, height * 0.44, 16);
  for (let i = 0; i < nDesk; i++) {
    let d = deskPos(i);
    fill(200, 50, desks[i] ? 70 : 35); rect(d.x, d.y - 32, 46, 64, 8);
    fill(0, 0, 100); textSize(13); textAlign(CENTER, CENTER); text('窓口' + (i + 1), d.x + 23, d.y + 44); textAlign(LEFT, BASELINE);
    if (desks[i]) {  // 残りのサービス時間のバー
      let p = desks[i], f = constrain((simT - p.start) / max(p.end - p.start, 1e-6), 0, 1);
      fill(0, 0, 100, 25); rect(d.x + 52, d.y - 30, 8, 60, 3);
      fill(140, 70, 95); rect(d.x + 52, d.y + 30 - 60 * f, 8, 60 * f, 3);
    }
  }
  // 客の目標位置を決めて、なめらかに動かす
  for (let i = 0; i < waitLine.length; i++) { let q = linePos(i); waitLine[i].tx = q.x; waitLine[i].ty = q.y; }
  for (let p of people) {
    if (p.state === 'serve') { let d = deskPos(p.desk); p.tx = d.x - 22; p.ty = d.y; }
    if (p.state === 'done') { p.tx = width + 40; p.ty = height * 0.42; }
    p.x += (p.tx - p.x) * 0.25; p.y += (p.ty - p.y) * 0.25;
    let w = (p.start < 0 ? simT : p.start) - p.arr;           // 待った時間で色を変える
    fill(constrain(140 - w * 25, 0, 140), 70, 95, p.state === 'done' ? 50 : 100);
    circle(p.x, p.y, 20);
  }
  people = people.filter((p) => !(p.state === 'done' && p.x > width + 20));

  // 行列の長さの時間変化
  let gy = height - 40, gh = height * 0.22;
  stroke(0, 0, 100, 20); line(40, gy, width - 40, gy);
  noFill(); stroke(30, 80, 100); strokeWeight(2);
  beginShape();
  for (let i = 0; i < lenRec.length; i++) vertex(40 + i, gy - min(lenRec[i] * 6, gh));
  endShape();
  noStroke(); fill(0, 0, 70); textSize(13); text('行列の長さ（並んでいる人数）の変化', 44, gy - gh - 6);

  // 数字のパネル
  let px = width * 0.8 + 10, py = height * 0.24;
  let rho = lambda / (nDesk * mu);
  fill(0, 0, 100); textSize(16);
  let rows = ['経過時間  ' + nf(simT, 1, 1) + ' 分', '並んでいる  ' + waitLine.length + ' 人', '店内（並び＋窓口）  ' + inSystem() + ' 人',
    '平均の店内人数  ' + nf(areaN / max(simT, 1e-6), 1, 2) + ' 人', 'サービス済み  ' + served + ' 人', '平均の待ち時間  ' + nf(sumWait / max(served + nBusy(), 1), 1, 2) + ' 分',
    '最大の行列  ' + maxQ + ' 人', 'あきらめた  ' + balked + ' 人', '', '混み具合 ρ = λ/(cμ) = ' + nf(rho, 1, 2)];
  for (let i = 0; i < rows.length; i++) { if (i === 9) fill(rho >= 1 ? color(0, 80, 100) : color(45, 90, 100)); text(rows[i], px, py + i * 26); }

  fill(0, 0, 100); textSize(18);
  text('λ = ' + nf(lambda, 1, 2) + ' 人/分（←→）　μ = ' + mu + ' 人/分　窓口 ' + nDesk + '（1〜3）　速さ ×' + speed + '（↑↓）　' + (paused ? '一時停止中（スペース）' : 'スペース：一時停止') + '　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('緑 = 来たばかり、赤 = 長く待っている。λ が μ に近づくと、平均ではさばけるはずなのに行列が伸び縮みする → これが待ち行列理論のテーマ', 20, 68);
}
function nBusy() { let n = 0; for (let d of desks) if (d) n++; return n; }

function keyPressed() {
  if (key === UP_ARROW) speed = min(32, speed * 2);
  if (key === DOWN_ARROW) speed = max(0.25, speed / 2);
  if (key === RIGHT_ARROW) lambda = min(3, lambda + 0.1);
  if (key === LEFT_ARROW) lambda = max(0.1, lambda - 0.1);
  if (key === '1' || key === '2' || key === '3') { nDesk = int(key); resetAll(); }
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') resetAll();
  lambda = round(lambda * 10) / 10;
}

// ---------- やってみよう ----------
// 1. λ = 0.5, 0.8, 0.95 で 5 分ずつ眺める。平均の待ち時間はどう変わる？（予想 → 03 で式と比べる）
// 2. λ を 1.2 にすると μ = 1 を超える。窓口 1 つでは行列はどうなる？ 2 を押して窓口を増やすと？
// 3. μ を 2 にして窓口 1 つと、μ = 1 で窓口 2 つはどちらが空いている？（06 で答え合わせ）
// 4. expRand(mu) を 1 / mu（いつも同じ時間）に変えると行列はどう変わる？（08 のテーマ）

// ==================================================
// ここから下は「道具」
// ==================================================
// 平均 1/rate の指数分布の乱数（次の到着までの時間など）
function expRand(rate) { return -Math.log(1 - Math.random()) / rate; }
