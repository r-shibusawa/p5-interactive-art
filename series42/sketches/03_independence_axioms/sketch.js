// ============================================
// 03 独立集合の公理
// 台集合 E = {a, b, c, d}（E キーで 5 要素）の部分集合をハッセ図に並べる（下 = 空集合、上 = 全体）
//   クリックで「独立」にしたい集合を指定すると、マトロイドの 3 つの公理を自動で検査する
//   (I1) 空集合は独立　(I2) 独立集合の部分集合は独立　(I3) 交換公理：|A| < |B| なら B の要素を 1 つ A に足して独立にできる
// クリック = 独立／従属を切替 / 1〜5 = 見本（U2,4・グラフ・I2 違反・I3 違反・自由） / E = 4 要素 ⇄ 5 要素 / C = 空集合だけ
// ============================================

let nElem = 4;                       // ★ 台集合の要素数（4 か 5）
let indep = [];                      // indep[mask] = その部分集合が独立か
let names = 'abcde';
let pos = [];                        // 各部分集合の画面位置
let badI2 = [];                      // (I2) 違反のペア [A, B]
let badI3 = null;                    // (I3) 違反のペア [A, B]
let hover = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  preset(1);
}

function bitCount(m) { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; }
function setName(m) { let s = ''; for (let i = 0; i < nElem; i++) if (m & (1 << i)) s += names[i]; return s || '∅'; }

function layout() {
  pos = [];
  let N = 1 << nElem, top = 110, bottom = height - 60;
  let perLevel = new Array(nElem + 1).fill(0), idx = new Array(nElem + 1).fill(0);
  for (let m = 0; m < N; m++) perLevel[bitCount(m)]++;
  // 同じ大きさの集合を左から辞書順に並べる
  let order = [...Array(N).keys()].sort((p, q) => bitCount(p) - bitCount(q) || setName(p).localeCompare(setName(q)));
  let usable = width - 440;
  for (let m of order) {
    let k = bitCount(m), n = perLevel[k];
    let y = map(k, 0, nElem, bottom, top);
    let x = 40 + usable * (n === 1 ? 0.5 : (idx[k] + 0.5) / n);
    pos[m] = { x, y }; idx[k]++;
  }
}

// ★ 見本の独立集合族
function preset(k) {
  let N = 1 << nElem;
  indep = new Array(N).fill(false);
  for (let m = 0; m < N; m++) {
    let c = bitCount(m);
    if (k === 1) indep[m] = c <= 2;                                    // U_{2,n}：2 個までなら何でも独立
    if (k === 2) indep[m] = (m & 7) !== 7 && c <= 3;                   // グラフ：a,b,c が三角形、d（,e）はぶら下がり
    if (k === 3) indep[m] = c <= 1 || m === 3 || m === 7;              // ab と abc は独立なのに ac, bc が従属 → (I2) 違反
    if (k === 4) indep[m] = c <= 1 || m === 3 || m === 12;             // ab と cd だけ → {a} と cd で (I3) 違反
    if (k === 5) indep[m] = true;                                      // 自由マトロイド
  }
  layout(); check();
}

// ★ 3 つの公理を検査する
function check() {
  let N = 1 << nElem;
  badI2 = []; badI3 = null;
  for (let a = 0; a < N; a++) {
    if (!indep[a]) continue;
    for (let i = 0; i < nElem; i++) if ((a & (1 << i)) && !indep[a & ~(1 << i)]) badI2.push([a, a & ~(1 << i)]);
  }
  for (let a = 0; a < N && !badI3; a++) {
    if (!indep[a]) continue;
    for (let b = 0; b < N && !badI3; b++) {
      if (!indep[b] || bitCount(b) <= bitCount(a)) continue;
      let ok = false;
      for (let i = 0; i < nElem; i++) if ((b & (1 << i)) && !(a & (1 << i)) && indep[a | (1 << i)]) ok = true;
      if (!ok) badI3 = [a, b];
    }
  }
}

function draw() {
  background(200, 30, 9);
  let N = 1 << nElem;
  let okI1 = indep[0], okI2 = badI2.length === 0, okI3 = badI3 === null;
  // ハッセ図の線（1 要素ちがい）
  for (let m = 0; m < N; m++) for (let i = 0; i < nElem; i++) {
    if (m & (1 << i)) continue;
    let up = m | (1 << i), both = indep[m] && indep[up];
    let bad = badI2.some(([a, b]) => a === up && b === m);
    stroke(bad ? 5 : both ? 130 : 0, bad || both ? 80 : 0, bad ? 100 : both ? 80 : 30, bad || both ? 90 : 60);
    strokeWeight(bad ? 4 : both ? 3 : 1);
    line(pos[m].x, pos[m].y, pos[up].x, pos[up].y);
  }
  if (badI3) {
    stroke(35, 90, 100); strokeWeight(3); drawingContext.setLineDash([8, 8]);
    line(pos[badI3[0]].x, pos[badI3[0]].y, pos[badI3[1]].x, pos[badI3[1]].y);
    drawingContext.setLineDash([]);
  }
  // 集合
  textAlign(CENTER, CENTER);
  for (let m = 0; m < N; m++) {
    let p = pos[m], on = indep[m];
    let bad = (m === 0 && !on) || badI2.some(([a, b]) => b === m) || (badI3 && (badI3[0] === m || badI3[1] === m));
    stroke(bad ? (badI3 && (badI3[0] === m || badI3[1] === m) && !badI2.some(([a, b]) => b === m) ? 35 : 5) : 0, bad ? 90 : 0, bad ? 100 : 60); strokeWeight(bad ? 4 : 1.5);
    fill(on ? 130 : 0, on ? 70 : 0, on ? 75 : 22);
    let w = 26 + 10 * max(1, bitCount(m));
    rect(p.x - w / 2, p.y - 15, w, 30, 15);
    noStroke(); fill(0, 0, on ? 10 : 70); textSize(15); text(setName(m), p.x, p.y);
    if (m === hover) { noFill(); stroke(0, 0, 100); strokeWeight(2); rect(p.x - w / 2 - 4, p.y - 19, w + 8, 38, 19); }
  }

  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('クリック：独立 ⇄ 従属　1〜5：見本（U2,4 ／ グラフ ／ I2 違反 ／ I3 違反 ／ 自由）　E：要素数 ' + nElem + '　C：空集合だけ', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('緑 = 独立集合。緑どうしをつなぐ線が「下に閉じている」ことを目で確かめよう。赤線 = (I2) 違反、オレンジ破線 = (I3) 違反のペア', 20, 66);

  // 判定パネル
  let px = width - 380, py = 120;
  noStroke(); fill(0, 0, 100, 8); rect(px - 20, py - 40, 365, 330, 12);
  let all = okI1 && okI2 && okI3;
  fill(all ? 130 : 5, 80, 100); textSize(28);
  text(all ? 'マトロイド！ ✓' : 'マトロイドではない ✗', px, py);
  textSize(18);
  fill(okI1 ? 130 : 5, 70, 100); text((okI1 ? '✓' : '✗') + ' (I1) 空集合 ∅ は独立', px, py + 44);
  fill(okI2 ? 130 : 5, 70, 100); text((okI2 ? '✓' : '✗') + ' (I2) 独立集合の部分集合は独立', px, py + 72);
  if (!okI2) { fill(0, 0, 70); textSize(15); text('　' + setName(badI2[0][0]) + ' が独立なのに ' + setName(badI2[0][1]) + ' が従属（他 ' + (badI2.length - 1) + ' 件）', px, py + 94); }
  fill(okI3 ? 130 : 5, 70, 100); textSize(18); text((okI3 ? '✓' : '✗') + ' (I3) 交換公理', px, py + 124);
  fill(0, 0, 70); textSize(15);
  if (okI3) text('　|A| < |B| なら、B の要素を 1 つ A に足せる', px, py + 146);
  else text('　A = ' + setName(badI3[0]) + '、B = ' + setName(badI3[1]) + '：B のどれを A に足しても従属', px, py + 146);
  // 基の大きさ
  let maxSize = 0; for (let m = 0; m < N; m++) if (indep[m]) maxSize = max(maxSize, bitCount(m));
  let bases = [], maximal = [];
  for (let m = 0; m < N; m++) if (indep[m]) {
    let isMax = true; for (let i = 0; i < nElem; i++) if (!(m & (1 << i)) && indep[m | (1 << i)]) isMax = false;
    if (isMax) { maximal.push(m); if (bitCount(m) === maxSize) bases.push(m); }
  }
  fill(0, 0, 100); textSize(17);
  text('階数（最大の独立集合の大きさ）= ' + maxSize + '　基の数 = ' + bases.length, px, py + 190);
  fill(0, 0, 70); textSize(15);
  text('極大な独立集合：' + maximal.map(setName).join(', '), px, py + 214);
  text(maximal.length === bases.length ? '極大 = 最大。マトロイドなら必ずこうなる' : '大きさのちがう極大集合がある → (I3) が壊れている証拠', px, py + 236);
  text('独立集合の数 = ' + indep.filter((v) => v).length + ' / ' + N, px, py + 262);
}

function nearest(mx, my) {
  for (let m = 0; m < (1 << nElem); m++) if (abs(mx - pos[m].x) < 30 && abs(my - pos[m].y) < 16) return m;
  return -1;
}
function mouseMoved() { hover = nearest(mouseX, mouseY); }
function mousePressed() { let m = nearest(mouseX, mouseY); if (m >= 0) { indep[m] = !indep[m]; check(); } }
function keyPressed() {
  if (key >= '1' && key <= '5') preset(+key);
  if (key === 'e' || key === 'E') { nElem = nElem === 4 ? 5 : 4; preset(1); }
  if (key === 'c' || key === 'C') { indep = new Array(1 << nElem).fill(false); indep[0] = true; check(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }

// ---------- やってみよう ----------
// 1. 見本 1（U2,4）から ab を従属にする。どの公理が壊れる？ ab と ac を両方従属にすると？
// 2. 空集合だけ（C）から、公理を壊さずに 1 つずつ独立集合を増やして「自分のマトロイド」を作る
// 3. 見本 4 は (I1)(I2) は OK なのに (I3) が壊れている。極大な独立集合の大きさがそろわないのを確認
// 4. 01 のグラフで「どの辺集合が森か」を思い出して、見本 2 がどんなグラフか絵に描いてみよう
