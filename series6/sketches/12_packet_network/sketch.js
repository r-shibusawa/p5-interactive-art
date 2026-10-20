// ============================================
// 12 パケット・ネットワーク（自由制作のベース）
// メッセージを小さな「パケット」に分けて、中継点をたどって送る
// 途中で失われたら、受信側が気づいて再送を頼む（ARQ）。インターネットの基本
// クリックで送信 / マウス左右 = パケットが失われる確率 / 1〜3 でルートの数
// ============================================
// ★ のついた数字を変えて、自分のネットワークをつくろう！

let nodes = [];
let links = [];
let packets = [];
let lossRate = 0.1;
let message = 'HELLO';
let delivered = {};
let stats = { sent: 0, lost: 0, ok: 0 };
let routes = 2;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buildNetwork();
}

function buildNetwork() {
  nodes = [{ x: 100, y: height / 2, name: '送信' }];
  for (let r = 0; r < routes; r++) {
    for (let k = 1; k <= 3; k++) {
      nodes.push({ x: map(k, 0, 4, 100, width - 100), y: height / 2 + (r - (routes - 1) / 2) * 180 + random(-30, 30), name: '' });
    }
  }
  nodes.push({ x: width - 100, y: height / 2, name: '受信' });
  links = [];
  for (let r = 0; r < routes; r++) {
    let base = 1 + r * 3;
    links.push([0, base], [base, base + 1], [base + 1, base + 2], [base + 2, nodes.length - 1]);
  }
  delivered = {};
}

function draw() {
  background(230, 40, 10);
  lossRate = map(mouseX, 0, width, 0, 0.5, true);

  // ---- 回線とノード ----
  for (let [a, b] of links) {
    stroke(0, 0, 35);
    strokeWeight(3);
    line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y);
  }
  for (let n of nodes) {
    noStroke();
    fill(n.name ? 45 : 170, 70, 90);
    circle(n.x, n.y, n.name ? 50 : 28);
    fill(0, 0, 10);
    textAlign(CENTER, CENTER);
    textSize(13);
    text(n.name, n.x, n.y);
    textAlign(LEFT, BASELINE);
  }

  // ---- パケットを動かす ----
  for (let i = packets.length - 1; i >= 0; i--) {
    let p = packets[i];
    p.t += 0.03; // ★ 速さ
    if (p.t >= 1) {
      p.t = 0;
      p.hop++;
      // ★ 回線を通るたびに、確率 lossRate で失われる
      if (random() < lossRate) {
        stats.lost++;
        packets.splice(i, 1);
        // 受信側は番号の抜けに気づいて再送を頼む（少し遅れて）
        setTimeout(() => sendPacket(p.index, p.ch), 600);
        continue;
      }
      if (p.hop >= p.path.length - 1) {
        delivered[p.index] = p.ch;
        stats.ok++;
        playBeep(600 + p.index * 80);
        packets.splice(i, 1);
        continue;
      }
    }
    let a = nodes[p.path[p.hop]], b = nodes[p.path[p.hop + 1]];
    if (!a || !b) { packets.splice(i, 1); continue; }
    let x = lerp(a.x, b.x, p.t), y = lerp(a.y, b.y, p.t);
    noStroke();
    fill(p.hue, 80, 100);
    rect(x - 16, y - 12, 32, 24, 5);
    fill(0, 0, 10);
    textAlign(CENTER, CENTER);
    textSize(13);
    text(p.index + ':' + p.ch, x, y);
    textAlign(LEFT, BASELINE);
  }

  // ---- 受信した文字（番号順に並べる）----
  let out = '';
  for (let i = 0; i < message.length; i++) out += delivered[i] !== undefined ? delivered[i] : '_';
  noStroke();
  fill(0, 0, 100);
  textSize(48);
  text(out, width / 2 - 100, height - 60);
  textSize(18);
  text('クリックで "' + message + '" を送信　消失率 ' + nf(lossRate, 1, 2) + '（マウス左右）　1〜3：ルート数　送信 ' + stats.sent + '　消失 ' + stats.lost + '　到着 ' + stats.ok, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('各パケットに番号をつけるので、順番がばらばらに届いても・消えても、元のメッセージに戻せる', 20, 68);
}

function sendPacket(index, ch) {
  let r = floor(random(routes)); // ★ ルートをランダムに選ぶ
  let base = 1 + r * 3;
  packets.push({ index, ch, path: [0, base, base + 1, base + 2, nodes.length - 1], hop: 0, t: 0, hue: (index * 60) % 360 });
  stats.sent++;
}

function mousePressed() {
  startAudio();
  if (mouseY < 80) return;
  delivered = {};
  stats = { sent: 0, lost: 0, ok: 0 };
  for (let i = 0; i < message.length; i++) setTimeout(() => sendPacket(i, message[i]), i * 250);
}
function keyPressed() {
  if (key >= '1' && key <= '3') {
    routes = int(key);
    packets = []; // 飛んでいるパケットは捨てる（ネットワークが変わるので）
    buildNetwork();
  }
}

// ---------- 自由制作のアイデア ----------
// ・message を自分の言葉に。長いメッセージは何パケットになる？
// ・ノードをクリックで「故障」させて、ルートが切れたときの動きを見る
// ・パケットの色や形を、06 のハミング符号で守られているかどうかで変える
// ・音：到着のたびに鳴るビープを、文字ごとの音階にする


// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx;
function startAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  audioCtx.resume();
}
function playBeep(f) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.frequency.value = f;
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(t);
  o.stop(t + 0.2);
}
