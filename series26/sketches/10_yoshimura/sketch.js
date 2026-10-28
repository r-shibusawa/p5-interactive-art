// ============================================
// 10 吉村パターンと円筒の座屈（3D）
// 薄い円筒（空き缶）を上から押すと、ある力で突然ダイヤ模様につぶれる（座屈）。その模様が吉村パターン
//   吉村パターンは剛体のままでは折れない：縮めるには面がひずむ（色 = ひずみ）。K でねじれる「クレスリング」
// ←→ = 押す（縮める）/ A = 自動 / K = 吉村 ⇄ クレスリング / ↑↓ = 周りの数 n / W = 線だけ / ドラッグ = 視点
// ============================================

let n = 10;              // ★ 1 周の三角形の数
let rings = 8;           // ★ 段の数
let R0 = 120;            // ★ 円筒の半径（px）
let h0 = 46;             // ★ 1 段の高さ（伸びきったとき）
let t = 0;               // 縮み 0〜1
let auto = true, autoDir = 1;
let kresling = false;
let wire = false;
let mainCam, hudCam, hud;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hudCam = createCamera();
  mainCam = createCamera();
  mainCam.camera(0, -260, 640, 0, 0, 0, 0, 1, 0);
  hud = createGraphics(width, height);
}

// ★ 段 k・番号 i の頂点。返り値 [x, y, z]（y が上下）
function vert(k, i, st) {
  let phi = TWO_PI * i / n + (kresling ? k * st.psi : (k % 2) * PI / n);
  return [st.R * Math.cos(phi), (rings / 2 - k) * st.h, st.R * Math.sin(phi)];
}
// 縮み t のときの形：段の高さ h、半径 R、ねじれ ψ
function shape(t) {
  let h = h0 * (1 - 0.8 * t);
  let w = TWO_PI * R0 / n;                              // 横の辺の長さ（紙のときと同じに保つ）
  let R = w / (2 * Math.sin(PI / n));
  let st = { h, R, psi: 0 };
  if (kresling) {
    // クレスリング：斜めの辺の 1 本の長さを保つように、ねじれ ψ を決める
    let L0 = Math.hypot(h0, 2 * R * Math.sin((TWO_PI / n - PI / n * 0.6) / 2));
    let c = Math.sqrt(Math.max(0, L0 * L0 - h * h)) / (2 * R);
    let d = 2 * Math.asin(Math.min(1, c));
    st.psi = TWO_PI / n - d;
  }
  return st;
}
// 辺の「ひずみ」：今の長さ ÷ 紙のときの長さ − 1
function strain(p, q, len0) { return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) / len0 - 1; }

function draw() {
  background(30, 28, 36);
  if (keyIsDown(RIGHT_ARROW)) { t = min(1, t + 0.006); auto = false; }
  if (keyIsDown(LEFT_ARROW)) { t = max(0, t - 0.006); auto = false; }
  if (auto) { t += 0.004 * autoDir; if (t > 1 || t < 0) { autoDir *= -1; t = constrain(t, 0, 1); } }

  setCamera(mainCam);
  orbitControl();
  ambientLight(100);
  directionalLight(255, 255, 255, -0.3, 0.6, -1);
  directionalLight(120, 120, 150, 0.6, -0.3, 0.5);
  let st = shape(t), st0 = shape(0);
  let maxS = 0;
  if (wire) { noFill(); stroke(240); strokeWeight(1); } else { stroke(40, 30, 30, 140); strokeWeight(1); }
  beginShape(TRIANGLES);
  for (let k = 0; k < rings; k++) {
    for (let i = 0; i < n; i++) {
      let tris = kresling
        ? [[[k, i], [k, i + 1], [k + 1, i]], [[k, i + 1], [k + 1, i + 1], [k + 1, i]]]
        : (k % 2 === 0 ? [[[k, i], [k, i + 1], [k + 1, i]], [[k, i + 1], [k + 1, i + 1], [k + 1, i]]]
                       : [[[k, i], [k, i + 1], [k + 1, i + 1]], [[k, i], [k + 1, i + 1], [k + 1, i]]]);
      for (let tri of tris) {
        let P = tri.map(([kk, ii]) => vert(kk, ii, st)), P0 = tri.map(([kk, ii]) => vert(kk, ii, st0));
        // 3 辺のひずみの最大
        let s = 0;
        for (let e = 0; e < 3; e++) {
          let l0 = Math.hypot(P0[e][0] - P0[(e + 1) % 3][0], P0[e][1] - P0[(e + 1) % 3][1], P0[e][2] - P0[(e + 1) % 3][2]);
          let v = strain(P[e], P[(e + 1) % 3], l0);
          if (Math.abs(v) > Math.abs(s)) s = v;
        }
        maxS = Math.max(maxS, Math.abs(s));
        if (!wire) {
          let m = constrain(Math.abs(s) * 4, 0, 1);
          let base = (k + i) % 2 ? [246, 240, 226] : [235, 225, 205];
          let hot = s < 0 ? [70, 120, 240] : [230, 70, 50];
          fill(lerp(base[0], hot[0], m), lerp(base[1], hot[1], m), lerp(base[2], hot[2], m));
        }
        for (let p of P) vertex(p[0], p[1], p[2]);
      }
    }
  }
  endShape();

  clearDepth();
  setCamera(hudCam);
  drawHud(st, maxS);
  noStroke();
  image(hud, -width / 2, -height / 2, width, height);
}

function drawHud(st, maxS) {
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('←→：押す　A：自動 ' + (auto ? 'ON' : 'off') + '　K：' + (kresling ? 'クレスリング（ねじれ）' : '吉村パターン（ダイヤ）') + '　↑↓：n = ' + n + '　W：線だけ　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('色が濃いほど、紙が伸び縮みしないと形がつくれない場所（赤 = 伸び、青 = 縮み）。紙はほとんど伸びないので、本物は「パチン」と飛び移る', 20, 68);
  hud.fill(255, 190, 40); hud.textSize(20);
  hud.text('高さ ' + nf(100 * st.h / h0, 1, 0) + '%　　ひずみの最大 ' + nf(maxS * 100, 1, 1) + '%', 20, 110);
  if (kresling) { hud.fill(220); hud.textSize(16); hud.text('1 段あたりのねじれ ' + nf(degrees(st.psi), 1, 1) + '°', 20, 138); }
  // 展開図（左下）
  let ox = 30, oy = height - 230, cw = 260, ch = 170, cols = n, rws = 4;
  hud.fill(246, 240, 226); hud.rect(ox, oy, cw, ch);
  hud.strokeWeight(1.5);
  let dx = cw / cols, dy = ch / rws;
  for (let k = 0; k <= rws; k++) { hud.stroke(230, 70, 50); hud.line(ox, oy + k * dy, ox + cw, oy + k * dy); }
  hud.stroke(60, 110, 230);
  for (let k = 0; k < rws; k++) for (let i = 0; i <= cols; i++) {
    let x0 = ox + i * dx, y0 = oy + k * dy;
    if (kresling) { let sh = dx * 0.4; if (i > 0) { hud.line(x0, y0, x0 - sh, y0 + dy); hud.line(x0 - dx, y0, x0 - sh, y0 + dy); } }
    else if (i < cols) {
      // ジグザグ：上の点と下の点を交互に結ぶ
      let xt = ox + i * dx + (k % 2 ? dx / 2 : 0), xb = ox + i * dx + (k % 2 ? 0 : dx / 2);
      hud.line(xt, y0, xb, y0 + dy);
      if (xt + dx <= ox + cw + 0.5) hud.line(xb, y0 + dy, xt + dx, y0);
    }
  }
  hud.noStroke(); hud.fill(200); hud.textSize(13);
  hud.text('展開図（赤 = 山、青 = 谷）。丸めて端どうしをつなぐと筒になる', ox, oy + ch + 22);
  // 押す力のイメージ
  let gx = width - 330, gy = height - 70, gw = 280, gh = 150;
  hud.fill(0, 0, 0, 120); hud.rect(gx - 30, gy - gh - 40, gw + 50, gh + 80, 8);
  hud.stroke(120); hud.strokeWeight(1); hud.line(gx, gy, gx + gw, gy); hud.line(gx, gy, gx, gy - gh);
  hud.noFill(); hud.stroke(255, 190, 40); hud.strokeWeight(2.5);
  hud.beginShape();
  for (let k = 0; k <= 100; k++) hud.vertex(gx + gw * k / 100, gy - gh * forceShape(k / 100));
  hud.endShape();
  hud.noStroke(); hud.fill(255); hud.circle(gx + gw * t, gy - gh * forceShape(t), 10);
  hud.fill(200); hud.textSize(13);
  hud.text('押す力（イメージ）', gx - 20, gy - gh - 16); hud.text('縮み →', gx + gw - 40, gy + 18);
  hud.text('座屈：力が急に落ちる', gx + 60, gy - gh * 0.95);
}
// 円筒を押したときの力（実験でよく見る形を簡単にしたもの）
function forceShape(x) { return x < 0.08 ? x / 0.08 : 0.3 + 0.08 * Math.sin(x * 40) * (1 - x) + 0.2 * x * x; }

function keyPressed() {
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'k' || key === 'K') kresling = !kresling;
  if (key === 'w' || key === 'W') wire = !wire;
  if (key === UP_ARROW) n = min(16, n + 1);
  if (key === DOWN_ARROW) n = max(5, n - 1);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); hud = createGraphics(width, height); }

// ---------- やってみよう ----------
// 1. 吉村パターンとクレスリングで、同じだけ縮めたときのひずみの最大を比べよう。どちらが紙にやさしい？
// 2. n を 6 と 16 にすると、ひずみはどう変わる？ 空き缶の座屈模様の数と見比べよう
// 3. 紙で吉村パターンの筒を折って、上から押してみよう。「パチン」と縮む瞬間がある（双安定）
// 4. クレスリングは押すとねじれる。ストローや折りたたみボトル、ロボットの関節に使われている
