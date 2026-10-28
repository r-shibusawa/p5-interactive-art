// ============================================
// 05 正多角形を折る
// 正方形の紙から正三角形・正六角形・正五角形を「折りだけ」でつくる
//   主役は O5（点 A を通り、点 B を直線に乗せる折り）＝「中心 A・半径 |AB| の円」をコンパスなしで使う技
// 1 = 正三角形 / 2 = 正六角形 / 3 = 正五角形 / →／スペース = 次の手順 / ← = 前へ / A = 自動
// ============================================

let shapeNo = 1;
let stepNo = 0;
let anim = 0;              // 今の手順のアニメーション 0〜1
let auto = false, autoT = 0;
let PLANS = {};            // 3 つの折り方（setup で計算）
let px0, py0, PS;

function setup() {
  createCanvas(windowWidth, windowHeight);
  PS = min(width * 0.5, height - 170);
  px0 = 60; py0 = 110;
  buildPlans();
}
function sx(u) { return px0 + u * PS; }
function sy(v) { return py0 + PS - v * PS; }

// ★ 折り方の手順を組み立てる（紙の座標：左下が原点、一辺 1）
function buildPlans() {
  let V = (x) => ({ p: { x, y: 0 }, u: { x: 0, y: 1 } });       // 縦の線 x = 一定
  let Hz = (y) => ({ p: { x: 0, y }, u: { x: 1, y: 0 } });      // 横の線 y = 一定
  // --- 正三角形：下の辺を 1 辺にする
  let A = { x: 0, y: 0 }, B = { x: 1, y: 0 };
  let t1 = o5(A, B, V(0.5), (X) => X.y);
  PLANS[1] = { name: '正三角形', steps: [
    { t: '縦に半分に折って、中心線をつける', items: [{ crease: V(0.5) }] },
    { t: 'O5：左下の角 A を通り、右下の角 B を中心線に乗せて折る → 頂点 T', items: [{ move: [A, B, t1.X], crease: t1.cr }, { pt: t1.X, name: 'T' }] },
    { t: 'AB = AT = BT（どれも紙の一辺）だから正三角形', items: [{ poly: [A, B, t1.X] }] },
  ]};
  // --- 正六角形：中心 O、半径 1/2
  let O = { x: 0.5, y: 0.5 }, E = { x: 1, y: 0.5 }, W = { x: 0, y: 0.5 };
  let h1 = o5(O, E, V(0.75), (X) => X.y), h2 = o5(O, E, V(0.75), (X) => -X.y);
  let h3 = o5(O, W, V(0.25), (X) => X.y), h4 = o5(O, W, V(0.25), (X) => -X.y);
  PLANS[2] = { name: '正六角形', steps: [
    { t: '縦・横に半分に折る → 中心 O と、左右の辺の真ん中 W・E', items: [{ crease: V(0.5) }, { crease: Hz(0.5) }, { pt: O, name: 'O' }, { pt: E, name: 'E' }, { pt: W, name: 'W' }] },
    { t: '左右の辺を中心線に合わせて折る（1/4 の線）', items: [{ crease: V(0.25) }, { crease: V(0.75) }] },
    { t: 'O5：O を通り、E を右の 1/4 線に乗せる（上と下の 2 通り）', items: [{ move: [O, E, h1.X], crease: h1.cr }, { move: [O, E, h2.X], crease: h2.cr }] },
    { t: 'O5：O を通り、W を左の 1/4 線に乗せる', items: [{ move: [O, W, h3.X], crease: h3.cr }, { move: [O, W, h4.X], crease: h4.cr }] },
    { t: '6 点はどれも O から 1/2 で、となりとの間も 1/2 → 正六角形', items: [{ poly: [E, h1.X, h3.X, W, h4.X, h2.X] }] },
  ]};
  // --- 正五角形：黄金比 φ = 1.618… を折りでつくる
  let M = { x: 0.5, y: 0 }, C = { x: 1, y: 1 }, Bq = { x: 1, y: 0 };
  let MC = { p: M, u: nrm(C.x - M.x, C.y - M.y) };
  let p1 = o5(M, Bq, MC, (X) => X.y);                 // |B′C| = (√5 − 1)/2 = 0.618
  let p2 = o5(C, p1.X, Hz(1), (X) => -X.x);            // 上の辺に 0.618 を移す
  let F = p2.X, v1 = { x: F.x / 2, y: 0 }, v2 = { x: 1 - F.x / 2, y: 0 };
  let p3 = o5(v1, v2, V(0), (X) => X.y), p4 = o5(v2, v1, V(1), (X) => X.y);
  let p5 = o5(p3.X, v1, V(0.5), (X) => X.y);
  PLANS[3] = { name: '正五角形', steps: [
    { t: '縦に半分に折って、下の辺の真ん中 M をつくる', items: [{ crease: V(0.5) }, { pt: M, name: 'M' }] },
    { t: 'M と右上の角 C を結ぶ線を折る（長さ √5 / 2）', items: [{ crease: MC }] },
    { t: 'O5：M を通り、右下の角を MC に乗せる → B′。B′C = (√5 − 1)/2 = 0.618…（黄金比）', items: [{ move: [M, Bq, p1.X], crease: p1.cr }, { pt: p1.X, name: 'B′' }] },
    { t: 'O5：C を通り、B′ を上の辺に乗せる → 上の辺に 0.618 の点 F', items: [{ move: [C, p1.X, F], crease: p2.cr }, { pt: F, name: 'F' }] },
    { t: 'F を通る縦線と、さらにその半分の線 → 下の辺に V1・V2（間隔 0.618 = 1 辺）', items: [{ crease: V(F.x) }, { crease: V(v1.x) }, { crease: V(v2.x) }, { pt: v1, name: 'V1' }, { pt: v2, name: 'V2' }] },
    { t: 'O5：V1 を通り V2 を左の辺に、V2 を通り V1 を右の辺に乗せる', items: [{ move: [v1, v2, p3.X], crease: p3.cr }, { move: [v2, v1, p4.X], crease: p4.cr }] },
    { t: 'O5：左の頂点を通り、V1 を中心線に乗せる → てっぺん', items: [{ move: [p3.X, v1, p5.X], crease: p5.cr }] },
    { t: '5 辺とも 0.618、対角線は 1（= φ 倍）→ 正五角形', items: [{ poly: [v1, v2, p4.X, p5.X, p3.X] }] },
  ]};
}

function draw() {
  background(34, 32, 40);
  let plan = PLANS[shapeNo];
  if (auto) { autoT++; if (autoT % 110 === 0) next(true); }
  anim = min(1, anim + 0.02);

  noStroke(); fill(246, 240, 226); rect(px0, py0, PS, PS);
  for (let i = 0; i <= stepNo; i++) {
    let now = i === stepNo;
    for (let it of plan.steps[i].items) {
      if (it.crease) {
        let seg = clipSquare(it.crease);
        if (seg) {
          stroke(now ? color(255, 170, 30) : color(150, 140, 130)); strokeWeight(now ? 2.5 : 1.5);
          drawingContext.setLineDash([8, 6]); line(sx(seg[0].x), sy(seg[0].y), sx(seg[1].x), sy(seg[1].y)); drawingContext.setLineDash([]);
        }
      }
      if (it.move) {
        // B が A のまわりの円をたどって X へ（O5 = コンパスの代わり）
        let [Ac, Bp, X] = it.move;
        let r = dist(Ac.x, Ac.y, Bp.x, Bp.y), a0 = atan2(Bp.y - Ac.y, Bp.x - Ac.x), a1 = atan2(X.y - Ac.y, X.x - Ac.x);
        let da = atan2(sin(a1 - a0), cos(a1 - a0)), t = now ? anim : 1;
        noFill(); stroke(80, 120, 220, now ? 200 : 70); strokeWeight(1.5);
        beginShape();
        for (let k = 0; k <= 30; k++) { let a = a0 + da * t * k / 30; vertex(sx(Ac.x + r * cos(a)), sy(Ac.y + r * sin(a))); }
        endShape();
        noStroke(); fill(80, 120, 220);
        circle(sx(Ac.x + r * cos(a0 + da * t)), sy(Ac.y + r * sin(a0 + da * t)), now ? 12 : 7);
        fill(40); circle(sx(Ac.x), sy(Ac.y), 7);
      }
      if (it.poly) {
        let t = now ? anim : 1;
        fill(226, 84, 72, 170 * t); stroke(170, 40, 40); strokeWeight(3);
        beginShape(); for (let p of it.poly) vertex(sx(p.x), sy(p.y)); endShape(CLOSE);
      }
      if (it.pt) { noStroke(); fill(30); circle(sx(it.pt.x), sy(it.pt.y), 9); textSize(15); text(it.name, sx(it.pt.x) + 8, sy(it.pt.y) + (it.pt.y > 0.9 ? 20 : -8)); }
    }
  }

  // 説明
  let tx = px0 + PS + 60;
  noStroke(); fill(255); textSize(18);
  text('1：正三角形　2：正六角形　3：正五角形　→／スペース：次へ　←：戻る　A：自動 ' + (auto ? 'ON' : 'off'), 20, 40);
  fill(170); textSize(15);
  text('青い弧 = O5 の折りで点が動く道すじ。折り目の上の点を中心に、点がコンパスのように回って直線に乗る', 20, 68);
  fill(255, 190, 40); textSize(30); text(plan.name + '　手順 ' + (stepNo + 1) + ' / ' + plan.steps.length, tx, py0 + 30);
  textSize(16);
  let y = py0 + 70;
  plan.steps.forEach((s, i) => { fill(i === stepNo ? 255 : i < stepNo ? 160 : 90); text((i + 1) + '. ' + s.t, tx, y, width - tx - 30, 60); y += 58; });
  let last = plan.steps[plan.steps.length - 1].items[0].poly;
  if (stepNo === plan.steps.length - 1) {
    let sides = last.map((p, i) => { let q = last[(i + 1) % last.length]; return dist(p.x, p.y, q.x, q.y); });
    fill(255, 190, 40); textSize(17);
    text('辺の長さ：' + sides.map((v) => nf(v, 1, 4)).join('  '), tx, y + 10, width - tx - 30);
    text('内角：' + nf(180 - 360 / last.length, 1, 0) + '°（' + last.length + ' 角形）', tx, y + 60);
  }
}

function next(loop) {
  let n = PLANS[shapeNo].steps.length;
  if (stepNo < n - 1) stepNo++; else if (loop) { shapeNo = shapeNo % 3 + 1; stepNo = 0; }
  anim = 0;
}
function keyPressed() {
  if (key >= '1' && key <= '3') { shapeNo = int(key); stepNo = 0; anim = 0; }
  if (key === RIGHT_ARROW || key === ' ') next(false);
  if (key === LEFT_ARROW) { stepNo = max(0, stepNo - 1); anim = 1; }
  if (key === 'a' || key === 'A') { auto = !auto; autoT = 0; }
}

// ---------- やってみよう ----------
// 1. 正三角形の手順を本物の紙で。分度器で 60° になっているか測ろう
// 2. 正六角形の手順をまねして、正六角形の中に正三角形を 2 つ（六芒星）描き足してみよう
// 3. 正五角形の手順 3 で出てくる 0.618… は黄金比 φ の逆数。φ = 1 / 0.618… = 1.618… を確かめよう
// 4. 正八角形はどう折る？（ヒント：45° の折りは「辺を対角線に重ねる」O3 でできる）


// ==================================================
// ここから下は「折り紙の幾何の道具」（紙の座標：一辺 1）
// ==================================================
function nrm(x, y) { let l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }
function bisector(a, b) { return { p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, u: nrm(-(b.y - a.y), b.x - a.x) }; }
function sdist(q, L) { return (q.x - L.p.x) * -L.u.y + (q.y - L.p.y) * L.u.x; }
// O5：点 A を通り、点 B を直線 L に乗せる折り。2 つの解から pick の値が大きい方を選ぶ
function o5(A, B, L, pick) {
  let r = Math.hypot(B.x - A.x, B.y - A.y);
  let t0 = (A.x - L.p.x) * L.u.x + (A.y - L.p.y) * L.u.y, d = sdist(A, L);
  let hh = Math.sqrt(Math.max(0, r * r - d * d));
  let cands = [-hh, hh].map((s) => ({ x: L.p.x + L.u.x * (t0 + s), y: L.p.y + L.u.y * (t0 + s) }));
  let X = pick(cands[0]) >= pick(cands[1]) ? cands[0] : cands[1];
  return { X, cr: bisector(B, X) };
}
function clipSquare(L) {
  let sq = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], r = [];
  for (let i = 0; i < 4; i++) {
    let p = sq[i], q = sq[(i + 1) % 4], s1 = sdist(p, L), s2 = sdist(q, L);
    if (s1 * s2 <= 0 && s1 !== s2) { let t = s1 / (s1 - s2); r.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }); }
  }
  return r.length >= 2 ? r : null;
}
