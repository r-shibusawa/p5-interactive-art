// ============================================
// 11 表現可能性：ファノ・マトロイドと非ファノ
// 7 点のマトロイド。F_7（ファノ）は 7 本の「直線」（3 点組）を持ち、そのうち 1 本は図では円で描かれる
//   F_7 は GF(2) 上で表現できる（点 = GF(2)^3 のベクトル）が、実数 R 上ではできない（3 つの中点は一直線に乗らない）
//   非ファノ F_7^-（円の直線をなくしたもの）は逆に R で表現できて GF(2) ではできない。体によって「作れる構造」がちがう
// 点をクリック = 選ぶ（階数を両方の体で計算） / F = ファノ ⇄ 非ファノ / 三角形の頂点をドラッグ / C = 選択を消す
// ============================================

let fano = true;                     // ★ true = F_7、false = 非ファノ F_7^-
let corner = [];                     // 三角形の頂点（ドラッグできる）
let pts = [];                        // 7 点 {x, y, bits, name, on}
let lines = [];                      // 直線 = 3 点の番号
let dragI = -1, dragMoved = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  let cx = width * 0.3, cy = height * 0.58, r = min(width, height) * 0.3;
  corner = [0, 1, 2].map((i) => ({ x: cx + r * cos(TWO_PI * i / 3 - HALF_PI), y: cy + r * sin(TWO_PI * i / 3 - HALF_PI) }));
  // GF(2)^3 のベクトル（ビット：A = 100, B = 010, C = 001）
  pts = [{ bits: 4, name: 'A' }, { bits: 2, name: 'B' }, { bits: 1, name: 'C' }, { bits: 6, name: 'D' }, { bits: 3, name: 'E' }, { bits: 5, name: 'F' }, { bits: 7, name: 'G' }];
  for (let p of pts) p.on = false;
  layoutPoints();
  // 直線：GF(2) で a + b = c になる 3 点組（＝ 階数 2）。ファノは 7 本、非ファノは円 {D, E, F} を除く 6 本
  lines = [[0, 1, 3], [1, 2, 4], [0, 2, 5], [0, 4, 6], [1, 5, 6], [2, 3, 6], [3, 4, 5]];
}

// ★ 図の座標：頂点 A, B, C、中点 D = AB, E = BC, F = AC、重心 G
function layoutPoints() {
  let [A, B, C] = corner;
  let mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  let pos = [A, B, C, mid(A, B), mid(B, C), mid(A, C), { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 }];
  pts.forEach((p, i) => { p.x = pos[i].x; p.y = pos[i].y; });
}
function activeLines() { return fano ? lines : lines.slice(0, 6); }
// ★ マトロイドでの独立：3 点以下で、直線をまるごと含まない
function indepInMatroid(sub) {
  if (sub.length > 3) return false;
  return !activeLines().some((L) => L.every((i) => sub.includes(i)));
}
function rankR(sub) { return rankReal(sub.map((i) => [(pts[i].x - width * 0.3) / 100, (pts[i].y - height * 0.58) / 100, 1])); }
function rank2(sub) { return rankGF2(sub.map((i) => pts[i].bits)); }
function matroidRank(sub) {   // 定義から：独立な部分集合の最大の大きさ
  let best = 0;
  for (let m = 0; m < (1 << sub.length); m++) { let s = sub.filter((v, k) => m & (1 << k)); if (indepInMatroid(s)) best = max(best, s.length); }
  return best;
}

function draw() {
  background(60, 25, 9);
  let sel = pts.map((p, i) => i).filter((i) => pts[i].on);
  // 直線を描く
  for (let k = 0; k < 7; k++) {
    let L = lines[k], on = k < 6 || fano;
    let hl = sel.length >= 2 && L.every((i) => sel.includes(i));
    stroke(hl ? 50 : 200, hl ? 90 : 40, on ? (hl ? 100 : 70) : 35); strokeWeight(hl ? 5 : on ? 3 : 1.5);
    if (!on) drawingContext.setLineDash([5, 7]);
    if (k === 6) { noFill(); let g = pts[6]; circle(g.x, g.y, dist(g.x, g.y, pts[3].x, pts[3].y) * 2); }   // 中点を通る円
    else { let a = pts[L[0]], b = pts[L[1]]; line(a.x, a.y, b.x, b.y); }   // 直線の両端は最初の 2 点
    drawingContext.setLineDash([]);
  }
  // 点
  for (let i = 0; i < 7; i++) {
    let p = pts[i];
    stroke(0, 0, 100); strokeWeight(2); fill(p.on ? 50 : 60, p.on ? 90 : 40, p.on ? 100 : 80);
    circle(p.x, p.y, p.on ? 30 : 22);
    noStroke(); fill(0, 0, 10); textSize(13); textAlign(CENTER, CENTER); text(p.name, p.x, p.y);
    fill(0, 0, 80); textSize(12); text('(' + [(p.bits >> 2) & 1, (p.bits >> 1) & 1, p.bits & 1].join('') + ')', p.x + (i < 3 ? 0 : 28), p.y + (i < 3 ? -24 : 18));
  }

  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('点をクリック：選ぶ　F：' + (fano ? 'ファノ F_7' : '非ファノ F_7^-') + ' ⇄　三角形の頂点をドラッグ　C：選択を消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('( ) は GF(2)^3 のベクトル。直線 = 3 点が従属（階数 2）。ファノでは中点 D, E, F を通る円も「直線」', 20, 66);

  // 右：表
  let px = width - 460, py = 120;
  noStroke(); fill(0, 0, 100, 8); rect(px - 20, py - 40, 450, height - py - 20, 12);
  fill(50, 80, 100); textSize(24);
  text(fano ? 'ファノ・マトロイド F_7（直線 7 本）' : '非ファノ F_7^-（直線 6 本）', px, py);
  fill(0, 0, 100); textSize(15);
  text('3 点組　　マトロイド　　GF(2) の階数　　R の階数（図から）', px, py + 36);
  let ok2 = true, okR = true;
  // 全部の 3 点組を検査して、体ごとに「マトロイドと一致するか」
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) for (let c = b + 1; c < 7; c++) {
    let s = [a, b, c], want = indepInMatroid(s) ? 3 : 2;
    if (rank2(s) !== want) ok2 = false;
    if (rankR(s) !== want) okR = false;
  }
  for (let k = 0; k < 7; k++) {
    let L = lines[k], isLine = k < 6 || fano, r2 = rank2(L), rR = rankR(L), want = isLine ? 2 : 3;
    let y = py + 62 + k * 24;
    fill(0, 0, 90); text(L.map((i) => pts[i].name).join(' '), px, y);
    fill(isLine ? 50 : 0, isLine ? 70 : 0, 90); text(isLine ? '直線（従属）' : '独立', px + 80, y);
    fill(r2 === want ? 130 : 5, 80, 100); text(r2 + (r2 === want ? ' ✓' : ' ✗'), px + 210, y);
    fill(rR === want ? 130 : 5, 80, 100); text(rR + (rR === want ? ' ✓' : ' ✗'), px + 330, y);
  }
  let y2 = py + 62 + 7 * 24 + 10;
  fill(0, 0, 60); textSize(13); text('（他の 3 点組はすべて独立 = 階数 3。全 35 組を自動検査）', px, y2);
  fill(ok2 ? 130 : 5, 80, 100); textSize(20);
  text('GF(2) で表現' + (ok2 ? 'できる ✓' : 'できない ✗'), px, y2 + 36);
  fill(okR ? 130 : 5, 80, 100);
  text('R で表現' + (okR ? 'できる ✓' : 'できない ✗'), px + 230, y2 + 36);
  fill(0, 0, 70); textSize(14);
  if (fano) { text('GF(2) では D + E = (110) + (011) = (101) = F なので D, E, F は従属。', px, y2 + 66); text('R では三角形の 3 つの中点は一直線に乗らない（どう動かしても）', px, y2 + 86); text('→ F_7 は標数 2 の体でだけ表現できる', px, y2 + 106); }
  else { text('R では図のとおり（頂点を動かしても OK）。GF(2) では D, E, F が勝手に', px, y2 + 66); text('従属になってしまい「独立」にできない', px, y2 + 86); text('→ F_7^- は標数 2 以外の体で表現できる', px, y2 + 106); }
  // 選んだ集合
  fill(0, 0, 100); textSize(17);
  if (sel.length) {
    let mr = matroidRank(sel);
    text('選択 {' + sel.map((i) => pts[i].name).join(', ') + '}：マトロイドの階数 ' + mr + (indepInMatroid(sel) ? '（独立）' : '（従属）'), px, y2 + 146);
    fill(0, 0, 80); textSize(15);
    text('GF(2) の階数 ' + rank2(sel) + (rank2(sel) === mr ? ' ✓' : ' ✗') + '　　R の階数 ' + rankR(sel) + (rankR(sel) === mr ? ' ✓' : ' ✗'), px, y2 + 172);
  } else text('点を 3 つ選んでみよう', px, y2 + 146);
}

function mousePressed() {
  dragI = -1; dragMoved = false;
  for (let i = 0; i < 3; i++) if (dist(mouseX, mouseY, corner[i].x, corner[i].y) < 18) dragI = i;
}
function mouseDragged() { if (dragI >= 0) { corner[dragI].x = constrain(mouseX, 20, width - 480); corner[dragI].y = constrain(mouseY, 90, height - 20); layoutPoints(); dragMoved = true; } }
function mouseReleased() {
  if (!dragMoved) for (let p of pts) if (dist(mouseX, mouseY, p.x, p.y) < 18) { p.on = !p.on; break; }
  dragI = -1;
}
function keyPressed() {
  if (key === 'f' || key === 'F') fano = !fano;
  if (key === 'c' || key === 'C') for (let p of pts) p.on = false;
}

// ---------- やってみよう ----------
// 1. ファノで D, E, F を選ぶ：GF(2) では階数 2、R では 3。これが「R で表現できない」理由そのもの
// 2. 非ファノで頂点をドラッグして三角形をつぶしてみる。どこまでなら R の表に ✓ が並ぶ？（3 点が一直線に乗ると壊れる）
// 3. 4 点を選ぶと必ず従属（階数 3 のマトロイド）。基は何個ある？（独立な 3 点組の数 = 35 − 直線の数）
// 4. GF(3)（0, 1, 2 の世界）ではどちらが表現できる？ rankGF2 を mod 3 の消去法に書きかえて試す

// ==================================================
// ここから下は「マトロイドの道具」（実数と GF(2) の階数）
// ==================================================
function rankReal(rows) {
  let a = rows.map((r) => r.slice());
  let m = a.length, n = m ? a[0].length : 0, rank = 0;
  for (let c = 0; c < n && rank < m; c++) {
    let p = rank;
    for (let i = rank + 1; i < m; i++) if (Math.abs(a[i][c]) > Math.abs(a[p][c])) p = i;
    if (Math.abs(a[p][c]) < 1e-6) continue;
    [a[rank], a[p]] = [a[p], a[rank]];
    for (let i = 0; i < m; i++) {
      if (i === rank) continue;
      let f = a[i][c] / a[rank][c];
      for (let j = c; j < n; j++) a[i][j] -= f * a[rank][j];
    }
    rank++;
  }
  return rank;
}
function rankGF2(vecsBits) {
  let basis = [], r = 0;
  for (let v of vecsBits) {
    for (let b of basis) v = Math.min(v, v ^ b);
    if (v) { basis.push(v); basis.sort((p, q) => q - p); r++; }
  }
  return r;
}
