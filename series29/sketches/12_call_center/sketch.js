// ============================================
// 12 コールセンターの人員計画（応用）
// 9 時〜18 時のコールセンター。電話の数は時間で変わる（昼前と午後にピーク）。1 本の通話は平均 4 分
//   待たされすぎた客は電話を切る（あきらめ）。オペレーターを増やせば人件費、減らせば待ち時間とクレームのコスト
//   1 = 1 日同じ人数　2 = 平方根の法則 c = a + β√a（a = λ/μ = その時間に必要な平均人数）　3 = 自分で決める（棒をクリック）
// 1〜3 = 方針 / ←→ = 人数（1）または β（2）/ クリック・ドラッグ = 時間ごとの人数（3）/ ↑↓ = 速さ / スペース = 一時停止 / R = 1 日をやり直す
// ============================================

let meanCall = 4;          // ★ 平均通話時間（分）
let patience = 5;          // ★ 平均でこれだけ待つと電話を切る（分）
let wage = 2000;           // ★ オペレーター 1 人 1 時間の人件費（円）
let waitCost = 40;         // ★ 待たせた 1 分あたりのコスト（円）
let abandonCost = 500;     // ★ 切られた電話 1 本のコスト（円）
let policy = 2, fixedC = 12, beta = 1.0;
let custom = [8, 12, 16, 12, 9, 12, 15, 13, 9];
let speed = 16;            // ★ 1 秒で進む分
let paused = false;
let T, nextArr, agents, q, staff, rec, res, days = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetDay();
}
// ★ 時刻 t（分、0 = 9:00）の到着率（1 分あたり）
function lamAt(t) {
  let h = 9 + t / 60;
  return 1.2 + 2.6 * Math.exp(-sq((h - 11) / 1.1)) + 2.0 * Math.exp(-sq((h - 15) / 1.4));
}
function loadAt(hr) { let s = 0; for (let k = 0; k < 6; k++) s += lamAt(hr * 60 + k * 10 + 5); return s / 6 * meanCall; }   // a = λ/μ
function plan() {
  let out = [];
  for (let h = 0; h < 9; h++) {
    if (policy === 1) out.push(fixedC);
    else if (policy === 2) { let a = loadAt(h); out.push(ceil(a + beta * Math.sqrt(a))); }   // ★ 平方根の法則
    else out.push(custom[h]);
  }
  return out;
}
function resetDay() {
  T = 0; staff = plan(); nextArr = nextArrival(0);
  agents = []; q = []; rec = []; res = { calls: 0, served: 0, ab: 0, sumW: 0, hourW: new Array(9).fill(0), hourN: new Array(9).fill(0), done: false };
}
// 時間で変わるポアソン到着（間引き法：最大の率で候補を出し、確率 λ(t)/λmax で採用）
function nextArrival(t) {
  let lmax = 6;
  while (true) { t += expRand(lmax); if (t >= 540 || Math.random() < lamAt(t) / lmax) return t; }
}
function startCalls() {
  let c = staff[min(8, floor(T / 60))];
  while (agents.length < c && q.length) {
    let p = q.shift(), w = T - p.arr, h = min(8, floor(p.arr / 60));
    res.sumW += w; res.served++; res.hourW[h] += w; res.hourN[h]++;
    agents.push(T + expRand(1 / meanCall));
  }
}
function advance(tEnd) {
  tEnd = min(tEnd, 540);
  while (true) {
    let tA = nextArr < 540 ? nextArr : Infinity;
    let tD = Infinity, di = -1; for (let i = 0; i < agents.length; i++) if (agents[i] < tD) { tD = agents[i]; di = i; }
    let tB = Infinity, bi = -1; for (let i = 0; i < q.length; i++) if (q[i].give < tB) { tB = q[i].give; bi = i; }
    let tH = (floor(T / 60) + 1) * 60;
    let tn = min(tA, tD, tB, tH);
    if (tn > tEnd) break;
    T = tn;
    if (tn === tD) agents.splice(di, 1);
    else if (tn === tB) { let p = q.splice(bi, 1)[0]; res.ab++; let h = min(8, floor(p.arr / 60)); res.hourW[h] += T - p.arr; res.hourN[h]++; res.sumW += T - p.arr; }
    else if (tn === tA) { res.calls++; q.push({ arr: T, give: T + expRand(1 / patience) }); nextArr = nextArrival(T); }
    startCalls();
  }
  T = tEnd;
  if (T >= 540 && !res.done) {   // 1 日の終わり：残った客は待ち時間だけ数える
    for (let p of q) res.sumW += 540 - p.arr;
    res.done = true;
    let c = cost();
    days.unshift({ pol: ['', '一定 ' + fixedC + ' 人', '平方根 β=' + nf(beta, 1, 1), '自分で'][policy], sh: c.staffH, w: res.sumW / max(res.served + res.ab, 1), ab: res.ab / max(res.calls, 1), tot: c.tot });
    if (days.length > 6) days.pop();
  }
}
function cost() {
  let staffH = 0; for (let s of staff) staffH += s;
  let a = staffH * wage, b = res.sumW * waitCost, c = res.ab * abandonCost;
  return { staffH, a, b, c, tot: a + b + c };
}

function draw() {
  background(25, 25, 12);
  if (!paused) advance(T + speed / 60);
  if (floor(T) > rec.length - 1 && T < 540) rec.push(q.length);

  let gx = 70, gw = width * 0.6, gy = height * 0.48, gh = height * 0.32, cmax = 26;
  let X = (t) => gx + t / 540 * gw, Y = (c) => gy - c / cmax * gh;
  // 人数の棒
  noStroke();
  for (let h = 0; h < 9; h++) { fill(policy === 3 ? color(200, 50, 70) : color(200, 40, 50)); rect(X(h * 60) + 2, Y(staff[h]), gw / 9 - 4, gy - Y(staff[h]), 4); fill(0, 0, 100); textSize(13); textAlign(CENTER); text(staff[h], X(h * 60 + 30), Y(staff[h]) - 6); text((9 + h) + '時', X(h * 60 + 30), gy + 16); textAlign(LEFT); }
  // 必要な平均人数 a(t)
  noFill(); stroke(45, 90, 100); strokeWeight(3);
  beginShape(); for (let t = 0; t <= 540; t += 5) vertex(X(t), Y(lamAt(t) * meanCall)); endShape();
  stroke(0, 0, 100); strokeWeight(2); line(X(T), gy, X(T), gy - gh);
  noStroke(); fill(0, 0, 60); textSize(13);
  text('青い棒 = オペレーターの人数　黄 = 必要な平均人数 a = λ(t) × 平均通話時間（棒が黄より低いと ρ > 1）', gx, gy - gh - 8);

  // 行列の長さ
  let ly = height - 50, lh = height * 0.2;
  stroke(0, 0, 100, 30); strokeWeight(1); line(gx, ly, gx + gw, ly);
  noFill(); stroke(30, 80, 100); strokeWeight(2);
  beginShape(); for (let i = 0; i < rec.length; i++) vertex(X(i), ly - min(rec[i] / 30, 1) * lh); endShape();
  noStroke();
  for (let h = 0; h < 9; h++) if (res.hourN[h] > 0) { let w = res.hourW[h] / max(res.hourN[h], 1); fill(0, 70, 100, 50); rect(X(h * 60) + 10, ly - min(w / 5, 1) * lh, gw / 9 - 20, min(w / 5, 1) * lh); }
  fill(0, 0, 60); textSize(13); text('オレンジ = 待っている電話の数（最大 30）　赤い棒 = その時間の平均の待ち時間（最大 5 分）', gx, ly - lh - 8);

  // 結果
  let c = cost(), tx = width * 0.7, ty = 120;
  let hh = 9 + floor(T / 60), mm = floor(T % 60);
  fill(0, 0, 100); textSize(20); text('いま ' + hh + ':' + nf(mm, 2) + (res.done ? '　（1 日終了）' : ''), tx, ty);
  textSize(16);
  let rows = ['かかってきた電話  ' + res.calls, 'つながった  ' + res.served + '　　切られた  ' + res.ab + '（' + nf(res.ab / max(res.calls, 1) * 100, 1, 1) + '%）',
    '平均の待ち時間  ' + nf(res.sumW / max(res.served + res.ab, 1), 1, 2) + ' 分', '話し中のオペレーター  ' + agents.length + ' / ' + staff[min(8, floor(T / 60))],
    '', '人件費  ' + c.staffH + ' 人時 × ' + wage + ' = ' + c.a.toLocaleString() + ' 円', '待たせたコスト  ' + c.b.toFixed(0) + ' 円', 'あきらめのコスト  ' + c.c.toLocaleString() + ' 円'];
  for (let i = 0; i < rows.length; i++) text(rows[i], tx, ty + 32 + i * 24);
  fill(45, 90, 100); textSize(18); text('合計  ' + Math.round(c.tot).toLocaleString() + ' 円', tx, ty + 32 + rows.length * 24 + 6);
  // これまでの日
  fill(0, 0, 60); textSize(13);
  let dy = ty + 300; text('これまでの日：方針 / 人時 / 平均待ち / 切られた / 合計', tx, dy);
  for (let i = 0; i < days.length; i++) { let d = days[i]; fill(0, 0, i === 0 ? 100 : 70); text(d.pol + ' / ' + d.sh + ' / ' + nf(d.w, 1, 2) + '分 / ' + nf(d.ab * 100, 1, 1) + '% / ' + Math.round(d.tot).toLocaleString() + '円', tx, dy + 22 + i * 20); }

  fill(0, 0, 100); textSize(18);
  text('方針 ' + policy + '：' + ['', '1 日同じ ' + fixedC + ' 人（←→）', '平方根の法則 β = ' + nf(beta, 1, 1) + '（←→）', '自分で決める（棒をクリック・ドラッグ）'][policy] + '　速さ ×' + speed + '（↑↓）　スペース：一時停止　R：やり直す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('方針を変えたら R で 1 日やり直して、右下の表で合計コストを比べよう。ピークに合わせて人を動かすと、同じ人時でもずっと待たせない', 20, 68);
}

function editBar() {
  if (policy !== 3) return;
  let gx = 70, gw = width * 0.6, gy = height * 0.48, gh = height * 0.32;
  if (mouseX < gx || mouseX > gx + gw || mouseY < gy - gh - 20 || mouseY > gy + 10) return;
  let h = constrain(floor((mouseX - gx) / (gw / 9)), 0, 8);
  custom[h] = constrain(round((gy - mouseY) / gh * 26), 1, 26);
  staff = plan();
}
function mousePressed() { editBar(); }
function mouseDragged() { editBar(); }
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { policy = int(key); staff = plan(); }
  if (key === RIGHT_ARROW) { if (policy === 1) fixedC = min(26, fixedC + 1); if (policy === 2) beta = min(3, beta + 0.1); staff = plan(); }
  if (key === LEFT_ARROW) { if (policy === 1) fixedC = max(1, fixedC - 1); if (policy === 2) beta = max(-1, beta - 0.1); staff = plan(); }
  beta = round(beta * 10) / 10;
  if (key === UP_ARROW) speed = min(256, speed * 2);
  if (key === DOWN_ARROW) speed = max(1, speed / 2);
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') resetDay();
}

// ---------- やってみよう ----------
// 1. 方針 1 で、合計コストが最小になる人数を探す（毎回 R）。何人のとき？
// 2. 方針 2 で β を 0, 0.5, 1, 2 と変えて比べる。同じ人時なら方針 1 より安くなる？
// 3. waitCost を 10 円（待たせても気にしない会社）と 200 円（高級ホテル）にすると、最適な β はどう動く？
// 4. 方針 3 で自分の計画をつくって、方針 2 に勝てるか挑戦。ヒント：a(t) は 1 時間の途中でも変わる

// ==================================================
// ここから下は「道具」
// ==================================================
function expRand(rate) { return -Math.log(1 - Math.random()) / rate; }
