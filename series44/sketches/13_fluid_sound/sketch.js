// ============================================
// 13 流れを聴く 🔊
// ナヴィエ・ストークス方程式（07 のソルバー）で作った流れの中に「観測点」を置き、音に変える
//   渦が観測点を通りすぎる（渦度が大きくなる）→ ポーンと 1 音。音の高さはその場所の流速で決まる
//   まん中の観測点の流速 → 低く続く音（ドローン）の高さと大きさ
// 風の音、川のせせらぎ、笛の音は、どれも流れの中の渦が作っている（09 の St = fD/U を思い出そう）
// まずクリック（音を出す許可）/ ドラッグ = かき混ぜる / A = 自動でかき混ぜる / D = ドローン
// V = 表示切替 / 上下キー = 粘性 ν / R = やり直し
// ============================================

let nu = 0.005; // ★ 動粘性係数 ν（大きくすると渦がすぐ消えて静かになる）
let dt = 1.0; // 時間刻み
let threshold = 0.05; // ★ 渦と見なす渦度の大きさ（小さいほどよく鳴る）
let scaleNotes = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]; // ★ 音階（半音の数。これはペンタトニック）
let baseFreq = 196; // ★ いちばん低い音 [Hz]
let nProbe = 6; // ★ 観測点の数
let stirPower = 0.2; // ★ 自動のかき混ぜ棒の強さ
let NX = 112, NY;
let W2, u, v, u0, v0, p, dvg, dye, dye0, img;
let probes = [], autoStir = true, drone = true, viewNo = 0, stirT = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  NY = Math.max(16, Math.round(NX * height / width));
  W2 = NX + 2;
  img = createImage(NX, NY);
  restart();
}

function restart() {
  let n = W2 * (NY + 2);
  u = new Float32Array(n); v = new Float32Array(n); u0 = new Float32Array(n); v0 = new Float32Array(n);
  p = new Float32Array(n); dvg = new Float32Array(n); dye = new Float32Array(n); dye0 = new Float32Array(n);
  probes = [];
  for (let k = 0; k < nProbe; k++) { // 観測点を輪のように並べる
    let a = k * 2 * Math.PI / nProbe;
    probes.push({ i: Math.round(NX / 2 + NX * 0.28 * Math.cos(a)), j: Math.round(NY / 2 + NY * 0.3 * Math.sin(a)), armed: true, flash: 0, w: 0, sp: 0 });
  }
}

function stir(ci, cj, fx, fy, amount) {
  for (let j = Math.max(1, Math.floor(cj - 6)); j <= Math.min(NY, cj + 6); j++)
    for (let i = Math.max(1, Math.floor(ci - 6)); i <= Math.min(NX, ci + 6); i++) {
      let w = Math.exp(-((i - ci) * (i - ci) + (j - cj) * (j - cj)) / 9), n = IX(i, j);
      u[n] += fx * w; v[n] += fy * w; dye[n] = Math.min(dye[n] + amount * w, 2);
    }
}

function draw() {
  // ---- 外力：マウスと、自動のかき混ぜ棒（8 の字に動く）
  if (mouseIsPressed) stir(mouseX / width * NX + 1, mouseY / height * NY + 1, constrain((mouseX - pmouseX) / width * NX * 0.5, -4, 4), constrain((mouseY - pmouseY) / height * NY * 0.5, -4, 4), 0.8);
  if (autoStir) {
    stirT += 0.02;
    let sx = NX * (0.5 + 0.36 * Math.sin(stirT)), sy = NY * (0.5 + 0.34 * Math.sin(2 * stirT + 0.6));
    let vx = 0.36 * NX * 0.02 * Math.cos(stirT), vy = 0.34 * NY * 0.04 * Math.cos(2 * stirT + 0.6); // 棒の速度
    stir(sx, sy, vx * stirPower, vy * stirPower, 0.25);
  }
  stepVelocity();
  dye0.set(dye); advect(0, dye, dye0, u, v);
  for (let k = 0; k < dye.length; k++) dye[k] *= 0.995;

  render();
  image(img, 0, 0, width, height);

  // ---- ★ 観測点：渦度 ω と流速を読み、音にする
  for (let k = 0; k < probes.length; k++) {
    let q = probes[k], n = IX(q.i, q.j);
    q.w = 0.5 * (v[n + 1] - v[n - 1] - u[n + W2] + u[n - W2]);
    q.sp = Math.hypot(u[n], v[n]);
    if (q.armed && Math.abs(q.w) > threshold) { // 渦が来た！
      let note = scaleNotes[Math.floor(constrain(q.sp * 6, 0, 0.999) * scaleNotes.length)]; // 速いほど高い音
      pluck(baseFreq * Math.pow(2, note / 12), constrain(Math.abs(q.w) * 4, 0.15, 0.6), (q.i / NX) * 2 - 1, q.w > 0);
      q.armed = false; q.flash = 1;
    }
    if (Math.abs(q.w) < threshold * 0.5) q.armed = true; // 渦が去ったら次を待つ
    q.flash *= 0.92;
    let x = (q.i - 0.5) / NX * width, y = (q.j - 0.5) / NY * height;
    noFill(); stroke(42, 80, 100, 50 + 50 * q.flash); strokeWeight(2 + 4 * q.flash);
    circle(x, y, 22 + 50 * q.flash);
    stroke(42, 80, 100); strokeWeight(2);
    line(x, y, x + constrain(u[n] * 60, -50, 50), y + constrain(v[n] * 60, -50, 50)); // そこでの流速
  }
  // まん中の流速 → ドローン
  let c = IX(Math.round(NX / 2), Math.round(NY / 2)), cs = Math.hypot(u[c], v[c]);
  setDrone(drone ? 55 + cs * 400 : 0, drone ? constrain(cs * 1.5, 0, 0.25) : 0);
  noFill(); stroke(185, 70, 100); strokeWeight(2);
  circle(width / 2, height / 2, 16 + cs * 200);

  noStroke(); fill(215, 60, 8, 78); rect(0, 0, width, 100);
  fill(0, 0, 100); textSize(18);
  text((audioCtx ? '' : '▶ まずクリックして音を出す　') + 'ドラッグ = かき混ぜる　A = 自動 ' + (autoStir ? 'ON' : 'OFF') + '　D = ドローン ' + (drone ? 'ON' : 'OFF') + '　V = 表示（' + (viewNo ? '染料' : '渦度') + '）　ν = ' + nf(nu, 1, 4) + '（上下キー）　R', 20, 38);
  fill(0, 0, 80); textSize(15);
  text('ナヴィエ・ストークス方程式　∂u/∂t + (u·∇)u = −∇p/ρ + ν∇²u ,  ∇·u = 0　の解を聴く', 20, 66);
  fill(0, 0, 65);
  text('黄 ○ = 観測点（渦が通ると鳴る。赤い渦と青い渦で音色がちがう）　水色 ○ = まん中の流速（ドローンの高さ ' + nf(55 + cs * 400, 1, 0) + ' Hz）', 20, 90);
}

function mousePressed() { startAudio(); }

function keyPressed() {
  startAudio();
  if (key === 'a' || key === 'A') autoStir = !autoStir;
  if (key === 'd' || key === 'D') drone = !drone;
  if (key === 'v' || key === 'V') viewNo = 1 - viewNo;
  if (key === UP_ARROW) nu = Math.min(nu * 2, 0.32);
  if (key === DOWN_ARROW) nu = Math.max(nu / 2, 0.00125);
  if (key === 'r' || key === 'R') restart();
}

// ---------- やってみよう ----------
// 1. A で自動を止め、自分でゆっくり・すばやくかき混ぜる。鳴り方（数・高さ）はどう変わる？
// 2. ν を上げる（上キー）。渦がすぐ消えて静かになる。はちみつの中は静か？
// 3. threshold を 0.02 にするとにぎやかに、0.15 にすると強い渦だけが鳴る
// 4. scaleNotes を [0, 3, 5, 6, 7, 10, 12]（ブルース）や [0, 2, 3, 7, 8, 12]（日本の音階）に変える
// 5. nProbe を 12 にして、渦が輪をひとまわりするとメロディーになるようにしてみよう
// 6. 音の高さを「流速」ではなく「観測点の番号 k」で決めると？（note = scaleNotes[k]）


// ==================================================
// ここから下は「流れを解く道具」「色をつける道具」「音を鳴らすための道具」です（全部コピーすること）
// ==================================================
// ---- 流体ソルバー（07 と同じ。ナヴィエ・ストークス方程式を 粘性 → 移流 → 圧力 の順に解く）
function IX(i, j) { return i + W2 * j; }
function stepVelocity() {
  if (nu > 0) { u0.set(u); v0.set(v); diffuse(1, u, u0, nu); diffuse(2, v, v0, nu); } // 粘性 ν∇²u
  u0.set(u); v0.set(v);
  advect(1, u, u0, u0, v0); advect(2, v, v0, u0, v0); // 移流 −(u·∇)u
  project(); // 圧力 −∇p と ∇·u = 0
  for (let k = 0; k < u.length; k++) {
    if (!(Math.abs(u[k]) < 20)) u[k] = constrain(u[k] || 0, -20, 20);
    if (!(Math.abs(v[k]) < 20)) v[k] = constrain(v[k] || 0, -20, 20);
  }
}
function diffuse(b, x, x0, k) { let a = dt * k; linSolve(b, x, x0, a, 1 + 4 * a, 10); }
function advect(b, d, d0, uu, vv) {
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j);
    let x = constrain(i - dt * uu[n], 0.5, NX + 0.5), y = constrain(j - dt * vv[n], 0.5, NY + 0.5);
    let i0 = Math.floor(x), j0 = Math.floor(y), s = x - i0, t = y - j0, m = IX(i0, j0);
    d[n] = (1 - s) * ((1 - t) * d0[m] + t * d0[m + W2]) + s * ((1 - t) * d0[m + 1] + t * d0[m + 1 + W2]);
  }
  setBnd(b, d);
}
function project() {
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j);
    dvg[n] = -0.5 * (u[n + 1] - u[n - 1] + v[n + W2] - v[n - W2]);
  }
  setBnd(0, dvg);
  linSolve(0, p, dvg, 1, 4, 25);
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j);
    u[n] -= 0.5 * (p[n + 1] - p[n - 1]);
    v[n] -= 0.5 * (p[n + W2] - p[n - W2]);
  }
  setBnd(1, u); setBnd(2, v);
}
function linSolve(b, x, x0, a, c, iters) {
  let ic = 1 / c;
  for (let k = 0; k < iters; k++) {
    for (let j = 1; j <= NY; j++) {
      let r = j * W2;
      for (let i = 1; i <= NX; i++) { let n = r + i; x[n] = (x0[n] + a * (x[n - 1] + x[n + 1] + x[n - W2] + x[n + W2])) * ic; }
    }
    setBnd(b, x);
  }
}
function setBnd(b, x) {
  for (let i = 1; i <= NX; i++) {
    x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
    x[IX(i, NY + 1)] = b === 2 ? -x[IX(i, NY)] : x[IX(i, NY)];
  }
  for (let j = 0; j <= NY + 1; j++) {
    x[IX(0, j)] = b === 1 ? -x[IX(1, j)] : x[IX(1, j)];
    x[IX(NX + 1, j)] = b === 1 ? -x[IX(NX, j)] : x[IX(NX, j)];
  }
}
function render() {
  img.loadPixels();
  let px = img.pixels;
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j), k = ((i - 1) + (j - 1) * NX) * 4, r, g, b;
    if (viewNo === 1) { let d = Math.min(dye[n], 1.6); r = 8 + 150 * d * d * 0.6; g = 16 + 190 * d; b = 34 + 220 * d; }
    else {
      let s = -0.5 * (v[n + 1] - v[n - 1] - u[n + W2] + u[n - W2]) * 7, a = Math.min(Math.abs(s), 1);
      r = 8 + (s > 0 ? 247 : 20) * a; g = 16 + (s > 0 ? 110 : 200) * a; b = 34 + (s > 0 ? 70 : 221) * a;
    }
    px[k] = r; px[k + 1] = g; px[k + 2] = b; px[k + 3] = 255;
  }
  img.updatePixels();
}

// ---- 音（Web Audio）
let audioCtx, masterOut, droneOsc, droneGain;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createGain(); masterOut.gain.value = 0.6;
    masterOut.connect(audioCtx.destination);
    droneOsc = audioCtx.createOscillator(); droneOsc.type = 'sawtooth';
    let lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
    droneGain = audioCtx.createGain(); droneGain.gain.value = 0;
    droneOsc.connect(lp); lp.connect(droneGain); droneGain.connect(masterOut);
    droneOsc.start();
  }
  audioCtx.resume();
}
// 1 音鳴らす：freq [Hz]、vol（0〜1）、pan（−1 = 左 〜 1 = 右）、soft = やわらかい音色
function pluck(freq, vol, pan, soft) {
  if (!audioCtx) return;
  let t0 = audioCtx.currentTime, osc = audioCtx.createOscillator(), g = audioCtx.createGain();
  osc.type = soft ? 'sine' : 'triangle'; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.001), t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + (soft ? 1.2 : 0.7));
  let out = g;
  if (audioCtx.createStereoPanner) { out = audioCtx.createStereoPanner(); out.pan.value = constrain(pan, -1, 1); g.connect(out); }
  osc.connect(g); out.connect(masterOut);
  osc.start(t0); osc.stop(t0 + 1.3);
}
// 続く音（ドローン）の高さと大きさをなめらかに変える
function setDrone(freq, vol) {
  if (!audioCtx) return;
  droneOsc.frequency.setTargetAtTime(constrain(freq, 30, 2000), audioCtx.currentTime, 0.1);
  droneGain.gain.setTargetAtTime(constrain(vol, 0, 0.4), audioCtx.currentTime, 0.1);
}
