# p5.js でつくるインタラクティブアート ─ コード集

インタラクティブアートのワークショップ・授業で使うサンプルコード集です。
[p5.js Web Editor](https://editor.p5js.org/) にコピー＆ペーストするだけで動きます。

## 🌐 コード集サイト（おすすめ）

**https://r-shibusawa.github.io/p5-interactive-art/**

「コードをコピー」ボタンでコピー → エディタに貼り付け → ▶ で実行。
「動かしてみる」でお手本の動きも確認できます。

## 📦 まとめてダウンロード

緑の **Code** ボタン → **Download ZIP**
または [ここをクリック](https://github.com/r-shibusawa/p5-interactive-art/archive/refs/heads/main.zip)

## 使い方（p5.js Web Editor）

1. https://editor.p5js.org/ を開く
2. `sketch.js` の中身を全部消して（`Ctrl/⌘ + A` → `Delete`）、コードを貼り付ける
3. 左上の ▶（実行）ボタンを押す
4. 🔊 音を使うスケッチは、実行したらまずキャンバスを1回クリック（ブラウザはクリックするまで音を出せない決まりです）
5. 🎤 マイク・📷 カメラを使うスケッチは、ブラウザの許可ダイアログで「許可」を選ぶ

## スケッチ一覧

| # | タイトル | 内容 | 使うもの |
|---|---|---|---|
| 00 | [はじめてのスケッチ](sketches/00_hello/sketch.js) | マウスに円がついてくる | |
| 01 | [図形と色でキャラクター](sketches/01_shapes_face/sketch.js) | 目がマウスを追うロボット | |
| 02 | [お絵かきツール](sketches/02_mouse_paint/sketch.js) | ドラッグで描く・C で消す・S で保存 | |
| 03 | [レインボーブラシ](sketches/03_rainbow_brush/sketch.js) | 色が変わる＆速いと太くなる筆 | |
| 04 | [万華鏡ペイント](sketches/04_kaleidoscope/sketch.js) | 描いた線が回転・反転してコピー | |
| 05 | [ジェネラティブアート](sketches/05_generative/sketch.js) | クリックで新しい作品が生まれる | |
| 06 | [花火（パーティクル）](sketches/06_fireworks/sketch.js) | クリックした場所で爆発 | |
| 07 | [音の出るボール](sketches/07_sound_balls/sketch.js) | 跳ねるたびにメロディが鳴る | 🔊 |
| 08 | [テルミン](sketches/08_theremin/sketch.js) | マウスで演奏する電子楽器 | 🔊 |
| 09 | [キーボードピアノ](sketches/09_key_piano/sketch.js) | A〜K キーでドレミ＋光の波紋 | 🔊 |
| 10 | [マイク・ビジュアライザー](sketches/10_mic_visualizer/sketch.js) | 声や音楽に反応する光の輪 | 🔊🎤 |
| 11 | [声で動くモンスター](sketches/11_voice_monster/sketch.js) | 大声を出すと怒り出す！ | 🔊🎤 |
| 12 | [Webカメラ・ドットアート](sketches/12_webcam_mosaic/sketch.js) | カメラ映像を丸の集まりに | 📷 |
| 13 | [音に反応するパーティクル](sketches/13_sound_particles/sketch.js) | 自由制作のベース | 🔊🎤 |
| 14 | [ライブコーディング・スタジオ](sketches/14_livecoding/sketch.js) | コードを書きかえながら音楽と映像を演奏 | 🔊 |
| 15 | [Teachable Machine 連携](sketches/15_teachable_machine/sketch.js) | 自分で学習させた AI の分類結果で色・音が変わる | 📷🤖 |

## 🎛 ライブコーディング

`14_livecoding` は、**演奏を止めずに**コードを書きかえて音楽と映像を変えていく「スタジオ」です。

1. `sketches/14_livecoding/sketch.js` を Web Editor の sketch.js に貼って ▶
2. 左の黒い入力欄に、下のレシピを貼り付けて **Ctrl + Enter**（Mac は **⌘ + Enter**）
3. 書きかえて Ctrl + Enter → 音が止まらずに切りかわる / **Ctrl + .** で全部止める / **Esc** で入力欄を隠す

| # | レシピ | 内容 |
|---|---|---|
| L01 | [はじめてのビート](livecoding/01_first_beat.js) | `x` と `.` でリズムをつくる |
| L02 | [ドラムパターン](livecoding/02_drum_patterns.js) | kick / snare / hat / clap とポリリズム |
| L03 | [ベースライン](livecoding/03_bassline.js) | synth で音階を鳴らす・音色を変える |
| L04 | [メロディとランダム](livecoding/04_melody.js) | `?` でランダムなメロディ、パッドを重ねる |
| L05 | [映像を自分で書く](livecoding/05_my_visual.js) | `visual(v => …)` で音に反応する映像 |
| L06 | [回転する光](livecoding/06_visual_recipes.js) | HSB と rotate の映像レシピ |
| L07 | [ビルドアップ → ドロップ](livecoding/07_build_and_drop.js) | 少しずつ足して盛り上げる展開 |
| L08 | [フルセット](livecoding/08_full_set.js) | 音楽と映像がそろったお手本 |

使える命令：`bpm(120)` / `drum('kick', 'x...x...')` / `synth('bass', 'C2 . G1 .', { wave, cutoff, len, vol })` / `scene('pulse' | 'grid' | 'tunnel' | 'wave')` / `visual(v => { … })` / `hush()`

## 🤖 Teachable Machine 連携

1. [Teachable Machine](https://teachablemachine.withgoogle.com/) で「画像プロジェクト」→「標準の画像モデル」
2. クラスを 2〜4 つ作り、ウェブカメラで撮影して学習
3. 「モデルをエクスポート」→「アップロード」→ 共有リンクをコピー
4. `15_teachable_machine/sketch.js` の `MODEL_URL` に貼って ▶
5. クラスが変わった瞬間の動きは `onLabelChange()` を改造

各フォルダの `index.html` をブラウザで開くと、パソコン上でも動かせます（インターネット接続が必要。マイク・カメラは Web Editor かコード集サイトで使ってください）。

## 困ったときは

| 症状 | 解決法 |
|---|---|
| 何も表示されない | 下のコンソールに赤いエラーが出ていないか確認。コピーし忘れ・貼り付けミスが多い |
| `startAudio is not defined` など | ファイルの一番下にある「音を鳴らすための道具」までコピーできていない → 全部コピーし直す |
| 音が出ない | 一度キャンバスをクリックする / PC の音量・ミュートを確認 |
| マイク・カメラが動かない | アドレスバー左の鍵マークから許可を「オン」にして再実行 |

## 音のしくみについて

音を使うスケッチ（07〜11, 13〜15）は、p5.sound ライブラリではなく、ブラウザに最初から入っている **Web Audio API** を使っています。
各ファイルの一番下に「音を鳴らすための道具」（`playNote()`, `getMicLevel()` など）がまとめてあるので、p5.js のバージョン（1.x / 2.x）や設定に関係なく動きます。

## ライセンス

MIT License ─ 授業・ワークショップで自由に改変・再利用してください。
