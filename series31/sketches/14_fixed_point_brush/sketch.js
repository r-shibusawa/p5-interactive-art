// ============================================
// 14 不動点ブラシ 🔊（自由制作のベース）
// 枠（平行四辺形）1 つ = 縮小写像 1 つ。大きい正方形をその枠へ写す。枠を動かすと、IFS のアトラクタ（05 の不動点）がその場で描き直される
//   自分で描いた線も、枠の写像で何重にも写されてアトラクタに吸い込まれる。カオスゲームの 1 歩ごとに、選ばれた枠の音が鳴る
// クリックで音をスタート / 枠の丸をドラッグ（●＝移動、○＝角）/ 空いた所をドラッグ = 線を描く / N = 枠を足す / X = 枠を消す / 1〜3 = 見本 / ↑↓ = 線を写す深さ / H = 枠を隠す / M = 音 / C = 線を消す / S = 保存
// ============================================

let maps = [];             // {o:[u,v], x:[u,v], y:[u,v]}：単位正方形の (0,0),(1,0),(0,1) の行き先
let strokes = [];          // 描いた線（単位正方形の座標）
let depth = 3;             // ★ 線を何回写すか
let RES = 420;             // ★ アトラクタの解像度
let iterPerFrame = 20000;  // ★ 1 フレームのカオスゲームの回数
let accR, accG, accB, attG;
let px = 0.5, py = 0.5;
let D, bx0, by0;
let grab = null, drawingStroke = false;
let showFrames = true, mute = false;
let nextNote = 0, playhead = { x: 0.5, y: 0.5, m: 0 };
const SCALE = [0, 3, 5, 7, 10, 12];      // ★ 枠ごとの音（短調の五音音階）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  D = min(width * 0.62, height - 140); bx0 = 40; by0 = 100;
  attG = createGraphics(RES, RES); attG.pixelDensity(1);
  accR = new Float32Array(RES * RES); accG = new Float32Array(RES * RES); accB = new Float32Array(RES * RES);
  preset(1);
}
function preset(k) {
  if (k === 1) maps = [{ o: [0, 0], x: [0.5, 0], y: [0, 0.5] }, { o: [0.5, 0], x: [1, 0], y: [0.5, 0.5] }, { o: [0.25, 0.5], x: [0.75, 0.5], y: [0.25, 1] }];
  if (k === 2) maps = [{ o: [0.46, 0], x: [0.54, 0], y: [0.46, 0.45] }, { o: [0.5, 0.35], x: [0.85, 0.6], y: [0.25, 0.7] }, { o: [0.5, 0.35], x: [0.75, 0.0], y: [0.15, 0.6] }, { o: [0.3, 0.45], x: [0.7, 0.45], y: [0.3, 0.85] }];
  if (k === 3) maps = [{ o: [0.15, 0.1], x: [0.85, 0.2], y: [0.05, 0.8] }, { o: [0.75, 0.7], x: [0.95, 0.75], y: [0.7, 0.92] }];
  clearAcc();
}
function clearAcc() { accR.fill(0); accG.fill(0); accB.fill(0); }
// ★ 写像 w_i(u, v) = o + u·(x − o) + v·(y − o)
function wmap(m, u, v) { return [m.o[0] + u * (m.x[0] - m.o[0]) + v * (m.y[0] - m.o[0]), m.o[1] + u * (m.x[1] - m.o[1]) + v * (m.y[1] - m.o[1])]; }
function ratio(m) {
  let a = m.x[0] - m.o[0], c = m.x[1] - m.o[1], b = m.y[0] - m.o[0], d = m.y[1] - m.o[1];
  let s1 = a * a + b * b + c * c + d * d, det = a * d - b * c;
  return Math.sqrt((s1 + Math.sqrt(max(0, s1 * s1 - 4 * det * det))) / 2);
}
function mapHue(i) { return (i * 57 + 190) % 360; }

// カオスゲーム：点をランダムな枠で写し続けて、通った画素を明るくする
function runChaos() {
  if (maps.length === 0) return;
  let cols = maps.map((m, i) => hsbToRgb(mapHue(i), 60, 100));
  for (let k = 0; k < iterPerFrame; k++) {
    let i = floor(Math.random() * maps.length), q = wmap(maps[i], px, py);
    px = q[0]; py = q[1];
    if (!(Math.abs(px) < 3 && Math.abs(py) < 3)) { px = 0.5; py = 0.5; continue; }
    let X = floor(px * RES), Y = floor((1 - py) * RES);
    if (k < 20 || X < 0 || Y < 0 || X >= RES || Y >= RES) continue;
    let p = Y * RES + X, c = cols[i];
    accR[p] += c[0]; accG[p] += c[1]; accB[p] += c[2];
  }
  attG.loadPixels();
  let mx = 1;
  for (let p = 0; p < RES * RES; p += 7) mx = max(mx, accR[p] + accG[p] + accB[p]);
  let sc = 255 / Math.log(1 + mx / 3);
  for (let p = 0; p < RES * RES; p++) {
    let s = accR[p] + accG[p] + accB[p], k = p * 4;
    if (s === 0) { attG.pixels[k] = 14; attG.pixels[k + 1] = 16; attG.pixels[k + 2] = 28; attG.pixels[k + 3] = 255; continue; }
    let L = Math.log(1 + s / 3) * sc / s * 3;
    attG.pixels[k] = min(255, accR[p] * L); attG.pixels[k + 1] = min(255, accG[p] * L); attG.pixels[k + 2] = min(255, accB[p] * L); attG.pixels[k + 3] = 255;
  }
  attG.updatePixels();
}

function sx(u) { return bx0 + u * D; }
function sy(v) { return by0 + (1 - v) * D; }

function draw() {
  background(230, 30, 11);
  runChaos();
  image(attG, bx0, by0, D, D);
  noFill(); stroke(0, 0, 40); strokeWeight(1); rect(bx0, by0, D, D);
  drawStrokes();
  if (showFrames) drawFrames();
  // 音：カオスゲームを 1 歩ずつゆっくり進めて、選ばれた枠の音を鳴らす
  if (!mute && audioCtx && millis() > nextNote && maps.length > 0) {
    let i = floor(Math.random() * maps.length), q = wmap(maps[i], playhead.x, playhead.y);
    if (abs(q[0]) < 3 && abs(q[1]) < 3) playhead = { x: q[0], y: q[1], m: i }; else playhead = { x: 0.5, y: 0.5, m: i };
    playNote(220 * Math.pow(2, (SCALE[i % SCALE.length] + 12 * floor(playhead.y * 2)) / 12), constrain(playhead.x * 2 - 1, -1, 1));
    nextNote = millis() + 160;
  }
  noStroke(); fill(mapHue(playhead.m), 40, 100); circle(sx(playhead.x), sy(playhead.y), 12);

  // 右の説明
  let tx = bx0 + D + 40;
  fill(0, 0, 100); textSize(16);
  text('枠の数 ' + maps.length + '　線を写す深さ ' + depth, tx, 130);
  textSize(15);
  for (let i = 0; i < maps.length; i++) {
    let r = ratio(maps[i]);
    fill(mapHue(i), 60, 100); text('枠 ' + (i + 1) + '：縮小率 ' + nf(r, 1, 2) + (r >= 1 ? '　← 1 以上！縮小でない' : ''), tx, 164 + i * 24);
  }
  fill(0, 0, 70); textSize(14);
  let lines = ['● をドラッグ：枠ごと動かす', '○ をドラッグ：角を動かす（回転・伸縮・ゆがみ）', '空いた所をドラッグ：線を描く（白）',
    '線は「全部の枠で写す」を ' + depth + ' 回くり返して描かれる', '→ 深さを上げるとアトラクタの形に吸い込まれる', '',
    'お題：木・雪の結晶・らせん・自分の名前の頭文字', '縮小率が全部 1 未満なら、形は必ず 1 つに決まる'];
  for (let i = 0; i < lines.length; i++) text(lines[i], tx, 164 + maps.length * 24 + 20 + i * 22);

  noStroke(); fill(0, 0, 100); textSize(18);
  text((audioCtx ? (mute ? '音：off' : '♪ 鳴っています') : 'クリックで音をスタート') + '　N：枠を足す　X：枠を消す　1〜3：見本　↑↓：深さ　H：枠　M：音　C：線を消す　S：保存', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('アトラクタ = すべての枠で写しても変わらない図形（ハッチンソン作用素の不動点）。色 = 最後に使われた枠', 20, 68);
}

function drawFrames() {
  for (let i = 0; i < maps.length; i++) {
    let m = maps[i], c4 = [m.o, m.x, [m.x[0] + m.y[0] - m.o[0], m.x[1] + m.y[1] - m.o[1]], m.y];
    let bad = ratio(m) >= 1;
    stroke(bad ? 0 : mapHue(i), bad ? 90 : 60, 100); strokeWeight(2); noFill();
    beginShape(); for (let p of c4) vertex(sx(p[0]), sy(p[1])); endShape(CLOSE);
    // 向きがわかるように、元の正方形の「下の辺」を太く
    strokeWeight(5); line(sx(m.o[0]), sy(m.o[1]), sx(m.x[0]), sy(m.x[1]));
    noStroke(); fill(mapHue(i), 60, 100); circle(sx(m.o[0]), sy(m.o[1]), 14);
    noFill(); stroke(mapHue(i), 60, 100); strokeWeight(2); circle(sx(m.x[0]), sy(m.x[1]), 12); circle(sx(m.y[0]), sy(m.y[1]), 12);
  }
}
// 線をすべての合成写像で写して描く（深さ depth まで、多すぎるときは打ち切り）
function drawStrokes() {
  if (strokes.length === 0) return;
  let mats = [null];
  for (let d = 0; d < depth && maps.length > 0; d++) {
    if (mats.length * maps.length > 400) break;
    let nx = [];
    for (let M of mats) for (let m of maps) nx.push(M ? { o: wmap(M, m.o[0], m.o[1]), x: wmap(M, m.x[0], m.x[1]), y: wmap(M, m.y[0], m.y[1]) } : m);
    mats = nx;
  }
  noFill(); stroke(0, 0, 100, max(12, 90 / Math.sqrt(mats.length))); strokeWeight(1.5);
  for (let M of mats) for (let s of strokes) {
    if (s.length < 2) continue;
    let st = max(1, floor(s.length / 40));
    beginShape();
    for (let i = 0; i < s.length; i += st) { let q = M ? wmap(M, s[i][0], s[i][1]) : s[i]; vertex(sx(q[0]), sy(q[1])); }
    endShape();
  }
  if (depth > 0) { stroke(0, 0, 100, 40); strokeWeight(1); for (let s of strokes) { if (s.length < 2) continue; beginShape(); for (let p of s) vertex(sx(p[0]), sy(p[1])); endShape(); } }
}

function mousePressed() {
  startAudio();
  grab = null;
  let u = (mouseX - bx0) / D, v = 1 - (mouseY - by0) / D;
  if (showFrames) for (let i = maps.length - 1; i >= 0 && !grab; i--) {
    let m = maps[i];
    for (let k of ['x', 'y', 'o']) if (dist(mouseX, mouseY, sx(m[k][0]), sy(m[k][1])) < 12) { grab = { m, k }; break; }
  }
  if (!grab && u >= 0 && u <= 1 && v >= 0 && v <= 1) { strokes.push([[u, v]]); drawingStroke = true; }
}
function mouseDragged() {
  let u = (mouseX - bx0) / D, v = 1 - (mouseY - by0) / D;
  if (grab) {
    let m = grab.m;
    if (grab.k === 'o') { let du = u - m.o[0], dv = v - m.o[1]; for (let k of ['o', 'x', 'y']) { m[k][0] += du; m[k][1] += dv; } }
    else { m[grab.k][0] = u; m[grab.k][1] = v; }
    clearAcc();
  } else if (drawingStroke) {
    let s = strokes[strokes.length - 1], l = s[s.length - 1];
    if (dist(u, v, l[0], l[1]) > 0.005 && s.length < 300) s.push([constrain(u, 0, 1), constrain(v, 0, 1)]);
  }
}
function mouseReleased() { grab = null; drawingStroke = false; }
function keyPressed() {
  startAudio();
  if (key >= '1' && key <= '3') preset(int(key));
  if ((key === 'n' || key === 'N') && maps.length < 6) {
    let cu = random(0.2, 0.6), cv = random(0.2, 0.6);
    maps.push({ o: [cu, cv], x: [cu + 0.3, cv + 0.05], y: [cu - 0.05, cv + 0.3] }); clearAcc();
  }
  if ((key === 'x' || key === 'X') && maps.length > 1) { maps.pop(); clearAcc(); }
  if (key === UP_ARROW) depth = min(6, depth + 1);
  if (key === DOWN_ARROW) depth = max(0, depth - 1);
  if (key === 'h' || key === 'H') showFrames = !showFrames;
  if (key === 'm' || key === 'M') mute = !mute;
  if (key === 'c' || key === 'C') strokes = [];
  if (key === 's' || key === 'S') saveCanvas('fixed_point_brush', 'png');
}

// ---------- やってみよう ----------
// 1. 見本 1（シェルピンスキー）の上の枠を少し回すだけで、形がどう変わる？ 3 つの枠を全部同じ向きに回すと？
// 2. 枠の ○ を外へ引っぱって縮小率を 1 より大きくすると、アトラクタはどうなる？（赤い警告）
// 3. 線で顔を描いて深さを 0 → 6 と上げよう。どの絵から始めても最後は同じ形 = 不動点
// 4. SCALE や playNote の音色を変えて、形ごとに違う音楽にしよう。枠が多い形ほど音の種類も増える

// ==================================================
// ここから下は「道具」（色・音）
// ==================================================
function hsbToRgb(h, s, b) {
  s /= 100; b /= 100;
  let kf = (k) => (k + h / 60) % 6;
  let fc = (k) => b * (1 - s * Math.max(0, Math.min(kf(k), 4 - kf(k), 1)));
  return [255 * fc(5), 255 * fc(3), 255 * fc(1)];
}
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 短い音（f Hz、pan = −1 左 〜 1 右）
function playNote(f, pan) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain(), p = audioCtx.createStereoPanner();
  o.type = 'sine'; o.frequency.value = constrain(f, 50, 3000);
  p.pan.value = constrain(pan, -1, 1);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(g); g.connect(p); p.connect(masterOut);
  o.start(t); o.stop(t + 0.45);
}
