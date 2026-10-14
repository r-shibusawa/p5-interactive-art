// ============================================
// 02 お絵かきツール
// ドラッグで線を描く / C キーで消す / S キーで保存
// ============================================

function setup() {
  createCanvas(windowWidth, windowHeight); // 画面いっぱいのキャンバス
  background(20);
}

function draw() {
  // background() を draw の中に書かないので、描いた線が残り続ける

  if (mouseIsPressed) {
    stroke(255); // 線の色（白）
    strokeWeight(8); // 線の太さ
    // pmouseX, pmouseY = 1フレーム前のマウス位置
    line(pmouseX, pmouseY, mouseX, mouseY);
  }
}

// キーが押されたときに1回だけ呼ばれる
function keyPressed() {
  if (key === 'c' || key === 'C') {
    background(20); // 全部消す
  }
  if (key === 's' || key === 'S') {
    saveCanvas('my-drawing', 'png'); // 画像として保存
  }
}

// ---------- やってみよう ----------
// 1. stroke( ) を stroke(random(255), random(255), random(255)) にすると？
// 2. strokeWeight を mouseY / 20 にすると、高さで太さが変わる
// 3. line の代わりに circle(mouseX, mouseY, 20) にすると？
