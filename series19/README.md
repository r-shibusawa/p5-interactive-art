# シリーズ19：モルフォロジー（数理モルフォロジー）─ p5.js コード集

画像を「0 と 1 のマス目」として、小さな形（構造要素）で太らせ・やせさせ・削る。膨張・収縮から細線化・距離変換・ウォーターシェッドまで、数理モルフォロジー（Mathematical Morphology）を体験するワークショップ（110分）のコード集です。
[p5.js Web Editor](https://editor.p5js.org/) にコピー＆ペーストするだけで動きます。

## 🌐 コード集サイト

**https://r-shibusawa.github.io/p5-interactive-art/series19/**

## 使い方（p5.js Web Editor）

1. https://editor.p5js.org/ を開く
2. `sketch.js` の中身を全部消して（`Ctrl/⌘ + A` → `Delete`）、コードを貼り付ける
3. 左上の ▶（実行）ボタンを押す
4. 多くのスケッチは一番下に「モルフォロジーの道具」（構造要素・膨張・収縮・距離変換）があります。**一番下まで全部コピー**してください

## スケッチ一覧

| # | タイトル | 内容 | 操作 | 使うもの |
|---|---|---|---|---|
| 00 | [二値画像と構造要素](sketches/00_binary_se/sketch.js) | 入るか・当たるか | ドラッグ 1〜3 左右 E R C | |
| 01 | [膨張](sketches/01_dilation/sketch.js) | A ⊕ B：太る・くっつく | スペース A 1〜3 左右 K D R | |
| 02 | [収縮](sketches/02_erosion/sketch.js) | A ⊖ B：やせる・双対性 | スペース A C 1〜3 左右 K D R | |
| 03 | [オープニングとクロージング](sketches/03_open_close/sketch.js) | ゴミを取る・穴を埋める | 上下＝ノイズ 左右＝SE 1〜3 K スペース | |
| 04 | [境界抽出とヒット・オア・ミス](sketches/04_boundary_hitmiss/sketch.js) | ふち・角・孤立点・端点 | B 1〜4 ドラッグ E R C | |
| 05 | [細線化とスケルトン](sketches/05_thinning/sketch.js) | Zhang–Suen と骨格 | スペース A M 1〜3 ドラッグ R | |
| 06 | [距離変換](sketches/06_distance_transform/sketch.js) | 近い背景までの距離 | 1〜3 上下＝t D ドラッグ E R C | |
| 07 | [グレースケール・モルフォロジー](sketches/07_gray_morphology/sketch.js) | max と min、トップハット | 1〜7 左右 K N マウス上下 | |
| 08 | [モルフォロジー勾配](sketches/08_gradient/sketch.js) | 膨張 − 収縮 = エッジ | 1〜3 4〜6 左右 ドラッグ E C | |
| 09 | [粒度分析](sketches/09_granulometry/sketch.js) | ふるいとパターンスペクトル | 左右＝k 上下 1〜3 スペース | |
| 10 | [ノイズ除去](sketches/10_denoise/sketch.js) | ごま塩ノイズとの勝負 | 1〜4 上下 左右 P スペース | |
| 11 | [再構成と穴埋め](sketches/11_reconstruction/sketch.js) | 測地的膨張 | クリック 1〜3 スペース R | |
| 12 | [ウォーターシェッド](sketches/12_watershed/sketch.js) | 水をためて分ける | スペース 右 1〜2 ドラッグ R N | |
| 13 | [モルフォロジーを聞く](sketches/13_morph_sound/sketch.js) | 面積が音になる | スペース ドラッグ 1〜3 左右 C | 🔊 |
| 14 | [形を育てるブラシ](sketches/14_growth_brush/sketch.js) | 自由制作のベース | ドラッグ 1〜4 上下 スペース M S C | 🔊 |
| 15 | [カメラでモルフォロジー](sketches/15_webcam_morph/sketch.js) | 映像に膨張・収縮、塊を数える | 1〜6 左右 マウス I 上下 | 📷 |

## 授業の流れ（110分の目安）

| 時間 | 内容 | スケッチ |
|---|---|---|
| 0:00 – 0:10 | 導入：形を「太らせる・やせさせる」 | — |
| 0:10 – 0:25 | STEP 1　二値画像・膨張・収縮 | 00 – 02 |
| 0:25 – 0:45 | STEP 2　オープニング・クロージング・境界 | 03 – 05 |
| 0:45 – 0:50 | 休憩 | — |
| 0:50 – 1:10 | STEP 3　距離変換とグレースケール | 06 – 08 |
| 1:10 – 1:25 | STEP 4　応用：粒度・ノイズ・再構成 | 09 – 11 |
| 1:25 – 1:45 | STEP 5　音と自由制作 | 13 – 14 |
| 1:45 – 1:50 | 発表・まとめ | — |

## 困ったときは

| 症状 | 解決法 |
|---|---|
| 画面が固まる・遅い | `cols`, `rows` を小さく（64×48 など）。SE の半径を小さく |
| `makeSE is not defined` / `edtSquared is not defined` | 一番下の「モルフォロジーの道具」までコピーできていない → 全部コピーし直す |
| 形が全部消える・全部埋まる | SE が形より大きい。収縮の回数を減らす、SE の半径を 1 に |
| 文字のお手本が出ない | `textToGrid` の文字サイズを変える。ブラウザのフォントによって太さが変わる |
| 音が出ない・カメラが動かない | キャンバスを1回クリック ／ アドレスバーの鍵マークで許可 |

「モルフォロジーの道具」は構造要素の生成、膨張（max）・収縮（min）、ユークリッド距離変換（Felzenszwalb & Huttenlocher の 1 次元ずつの放物線法）の教育用の簡易実装です。画像の外側は端のマスと同じ値として扱います。

## ライセンス

MIT License ─ 授業・ワークショップで自由に改変・再利用してください。
