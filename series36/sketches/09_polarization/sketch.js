// ============================================
// 09 偏光とマリュスの法則
// 光は横波。偏光板は「ある向きの振動」だけを通す
//   偏光板を 2 枚重ねたときの透過する強さ：  I = I0 cos²θ   （θ = 2 枚の向きの差）   ← マリュスの法則
//   90° で真っ暗。でも間に 45° の 3 枚目を入れると光が通る！（通すたびに向きが変わる）
// 偏光板の上でドラッグ = 回す / 1〜3 = 偏光板を選ぶ、←→ = 選んだ板を回す / I = 3 枚目を入れる・抜く / A = 自動で回す / R = リセット
// ============================================

let pol = [{ th: 0 }, { th: 90 }, { th: 45 }];   // 偏光板の向き（度）：[0] 1 枚目、[1] 2 枚目、[2] 真ん中の 3 枚目
let useThird = false;
let selected = 1;
let autoRot = false;
let dragIdx = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// 画面上の偏光板の位置（順番どおり）
function stations() {
  let y = height * 0.42;
  let list = [{ idx: 0, x: width * 0.3 }];
  if (useThird) list.push({ idx: 2, x: width * 0.5 });
  list.push({ idx: 1, x: width * (useThird ? 0.7 : 0.62) });
  return list.map((s) => ({ ...s, y }));
}

// ★ 各段の光の強さと偏光の向きを計算（マリュスの法則を順に適用）
function propagate() {
  let st = stations();
  let out = [{ I: 1, th: null }];                 // 偏光板の前：強さ 1、無偏光
  let I = 0.5, th = pol[st[0].idx].th;            // 1 枚目：無偏光の半分が通る
  out.push({ I, th });
  for (let k = 1; k < st.length; k++) {
    let t2 = pol[st[k].idx].th;
    let dth = radians(t2 - th);
    I *= Math.cos(dth) * Math.cos(dth);
    th = t2;
    out.push({ I, th });
  }
  return { st, out };
}

function draw() {
  background(230, 40, 8);
  if (autoRot) pol[1].th = (pol[1].th + 0.6) % 360;
  let { st, out } = propagate();
  let y = st[0].y, r = 78;

  // 光の帯（強さで明るさ、偏光の向きを小さな線で描く）
  let xs = [60, ...st.map((s) => s.x), width - 60];
  for (let k = 0; k < out.length; k++) {
    let x0 = xs[k], x1 = xs[k + 1];
    let I = out[k].I;
    noStroke(); fill(50, 30, 100, 10 + 70 * I);
    rect(x0, y - 26, x1 - x0, 52);
    // 振動の向き
    stroke(50, 60, 100, 20 + 80 * I); strokeWeight(2);
    for (let x = x0 + 30; x < x1 - 20; x += 36) {
      if (out[k].th === null) { for (let a = 0; a < 180; a += 45) line(x - 14 * Math.cos(radians(a)), y - 14 * Math.sin(radians(a)), x + 14 * Math.cos(radians(a)), y + 14 * Math.sin(radians(a))); }
      else { let a = radians(out[k].th); line(x - 16 * Math.cos(a), y - 16 * Math.sin(a), x + 16 * Math.cos(a), y + 16 * Math.sin(a)); }
    }
    noStroke(); fill(0, 0, 100); textSize(16);
    text('I = ' + nf(I, 1, 3), (x0 + x1) / 2 - 36, y + 60);
  }

  // 偏光板
  for (let s of st) {
    let p = pol[s.idx];
    let sel = s.idx === selected;
    noStroke(); fill(200, 50, 60, 70); circle(s.x, s.y, r * 2);
    stroke(200, 20, 100, 60); strokeWeight(1);
    for (let k = -3; k <= 3; k++) {                       // 通す向きの縞
      let off = k * 20, a = radians(p.th);
      let L = Math.sqrt(Math.max(0, r * r - off * off));
      line(s.x - L * Math.cos(a) - off * Math.sin(a), s.y - L * Math.sin(a) + off * Math.cos(a), s.x + L * Math.cos(a) - off * Math.sin(a), s.y + L * Math.sin(a) + off * Math.cos(a));
    }
    noFill(); stroke(sel ? 45 : 0, sel ? 90 : 0, 100); strokeWeight(sel ? 4 : 2); circle(s.x, s.y, r * 2);
    noStroke(); fill(0, 0, 100); textSize(16);
    text('偏光板 ' + (s.idx + 1) + '　' + nf(((p.th % 360) + 360) % 360, 1, 0) + '°', s.x - 50, s.y - r - 14);
  }

  // 透過率のグラフ：θ（2 枚の差）に対する cos²θ、現在の点
  let gx = 80, gy = height - 60, gw = width - 160, gh = 150;
  noStroke(); fill(0, 0, 100, 6); rect(gx - 10, gy - gh - 10, gw + 20, gh + 20, 10);
  noFill(); stroke(170, 60, 100); strokeWeight(2);
  beginShape();
  for (let th = 0; th <= 180; th += 2) vertex(gx + th / 180 * gw, gy - Math.cos(radians(th)) ** 2 * gh);
  endShape();
  let dth = Math.abs(((pol[1].th - pol[0].th) % 180 + 180) % 180);
  let Inow = out[out.length - 1].I / 0.5;
  stroke(0, 0, 100, 40); line(gx + dth / 180 * gw, gy, gx + dth / 180 * gw, gy - gh);
  noStroke(); fill(45, 90, 100); circle(gx + dth / 180 * gw, gy - Inow * gh, 12);
  fill(0, 0, 70); textSize(13);
  text('0°', gx, gy + 16); text('90°', gx + gw / 2 - 10, gy + 16); text('180°', gx + gw - 30, gy + 16);
  text('水色 = cos²θ（1 枚目と 2 枚目の差 θ）　黄 = いまの透過率 ' + nf(Inow, 1, 3) + (useThird ? '（3 枚目のおかげで曲線から外れる）' : ''), gx + 10, gy - gh + 6);

  fill(0, 0, 100); textSize(18);
  text('1〜3：偏光板を選ぶ（いま ' + (selected + 1) + '）　←→：回す　I：3 枚目 ' + (useThird ? 'あり' : 'なし') + '　A：自動回転 ' + (autoRot ? 'ON' : 'off') + '　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('偏光板の上でドラッグしても回せる。1 枚目で半分に、2 枚目で cos²θ 倍。2 枚を 90° にして暗くしてから、I で 45° の板を間に入れてみよう', 20, 68);
}

function mousePressed() {
  for (let s of stations()) if (Math.hypot(mouseX - s.x, mouseY - s.y) < 90) { dragIdx = s.idx; selected = s.idx; }
}
function mouseDragged() {
  if (dragIdx < 0) return;
  let s = stations().find((q) => q.idx === dragIdx);
  pol[dragIdx].th = degrees(Math.atan2(mouseY - s.y, mouseX - s.x));
}
function mouseReleased() { dragIdx = -1; }
function keyPressed() {
  if (key === '1') selected = 0;
  if (key === '2') selected = 1;
  if (key === '3') { useThird = true; selected = 2; }
  if (key === LEFT_ARROW) pol[selected].th -= 3;
  if (key === RIGHT_ARROW) pol[selected].th += 3;
  if (key === 'i' || key === 'I') useThird = !useThird;
  if (key === 'a' || key === 'A') autoRot = !autoRot;
  if (key === 'r' || key === 'R') { pol = [{ th: 0 }, { th: 90 }, { th: 45 }]; useThird = false; autoRot = false; }
}

// ---------- やってみよう ----------
// 1. 2 枚を 90° にして真っ暗にする。I で 3 枚目を入れて 45° に回すと、どれくらい光が戻る？（0.5 × cos²45° × cos²45° = 0.125）
// 2. 3 枚目を 0°、90° にすると光は通らない。通るのは「間の角度」のときだけ。なぜ？
// 3. 板を 10 枚にして 9° ずつ回したら、どれくらい通る？（propagate を改造して計算）
// 4. 液晶ディスプレイは「偏光板 2 枚 + 向きを変える液晶」。スマホの画面を偏光サングラスごしに回して見てみよう
