# シリーズ22：ボロノイ図 ─ p5.js コード集

「いちばん近いのはどれ？」で平面を塗り分ける。ボロノイ図の作り方（垂直二等分線・ドロネー三角形分割・掃引線）、ロイドの緩和と点描画、重みつきボロノイ、最大空円と経路計画、自然の模様、音とカメラまでを体験するワークショップ（110分）のコード集です。
[p5.js Web Editor](https://editor.p5js.org/) にコピー＆ペーストするだけで動きます。

## 🌐 コード集サイト

**https://r-shibusawa.github.io/p5-interactive-art/series22/**

## 使い方（p5.js Web Editor）

1. https://editor.p5js.org/ を開く
2. `sketch.js` の中身を全部消して（`Ctrl/⌘ + A` → `Delete`）、コードを貼り付ける
3. 左上の ▶（実行）ボタンを押す
4. 🔊 音を使うスケッチ（13・14）は、実行したらまずキャンバスを1回クリック。コードは一番下の「道具」まで全部コピーする。📷 カメラ（15）はアドレスバーで許可する

## スケッチ一覧

| # | タイトル | 内容 | 操作 | 使うもの |
|---|---|---|---|---|
| 00 | [最寄りの点で塗り分ける](sketches/00_nearest_site/sketch.js) | いちばん近いサイトの色で塗る、空の円 | クリック ドラッグ D E R C | |
| 01 | [垂直二等分線から作る](sketches/01_bisector_construction/sketch.js) | 半平面を重ねてセルを作る | スペース B ←→ A ドラッグ R | |
| 02 | [距離を変えると形が変わる](sketches/02_distance_metrics/sketch.js) | ユークリッド・マンハッタン・チェビシェフ・ミンコフスキー | 1〜4 ←→＝p ドラッグ R C | |
| 03 | [ドロネー三角形分割（Bowyer–Watson 法）](sketches/03_delaunay_bowyer_watson/sketch.js) | 1 点ずつ入れて作り直す、空の外接円 | スペース A ↑↓ F クリック R | |
| 04 | [双対性：ボロノイとドロネー](sketches/04_duality/sketch.js) | 辺は直交、外心 = ボロノイの頂点 | V D O マウス ドラッグ R | |
| 05 | [フォーチュンのアルゴリズム（掃引線）](sketches/05_fortune_sweep/sketch.js) | 放物線とビーチライン、サイト・円イベント | スペース ↑↓ ←→ P クリック R | |
| 06 | [ロイドの緩和（重心ボロノイ）](sketches/06_lloyd_relaxation/sketch.js) | 重心へ動かすとハチの巣に、エネルギー | スペース N ←→ M R | |
| 07 | [点描画（スティップリング）](sketches/07_stippling/sketch.js) | 暗さで重みをつけた重心ボロノイ | スペース 1〜3 ←→ V D R | |
| 08 | [重みつきボロノイ](sketches/08_weighted_voronoi/sketch.js) | 加法・乗法・パワー図 | 1〜3 ドラッグ Shift+ドラッグ ホイール ↑↓ R E | |
| 09 | [最近点探索と最大空円](sketches/09_largest_empty_circle/sketch.js) | いちばん近い店、新しい店はどこに | マウス スペース N クリック R C | |
| 10 | [自然の中のボロノイ（ウォーリーノイズ）](sketches/10_nature_worley/sketch.js) | キリン・泥のひび・細胞・トンボの羽 | 1〜4 ↑↓ スペース P | |
| 11 | [ボロノイで動く群れと領域](sketches/11_moving_territories/sketch.js) | 動くなわばり、面積の移り変わり、捕食者 | クリック A スペース ↑↓ C R | |
| 12 | [経路計画：ボロノイ辺に沿って](sketches/12_path_planning/sketch.js) | 障害物からいちばん遠い道をダイクストラで | クリック S G ↑↓ スペース V R | |
| 13 | [ボロノイを聞く](sketches/13_voronoi_sound/sketch.js) | セル = 鍵盤、カーソルが入ると鳴る | クリック M 1・2 ↑↓ スペース R | 🔊 |
| 14 | [ボロノイ・ブラシ](sketches/14_voronoi_brush/sketch.js) | なぞってサイトをまく絵筆。自由制作のベース | ドラッグ 1〜4 W L ↑↓ S C | 🔊 |
| 15 | [カメラでボロノイ](sketches/15_webcam_mosaic/sketch.js) | 映像をボロノイのモザイクに。輪郭に多くまく | 1・2 ←→ A E スペース | 📷 |

## 授業の流れ（110分の目安）

| 時間 | 内容 | スケッチ |
|---|---|---|
| 0:00 – 0:10 | 導入：いちばん近いのはどれ？ | — |
| 0:10 – 0:30 | STEP 1　ボロノイ図とは | 00 – 02 |
| 0:30 – 0:45 | STEP 2　ドロネーと速い作り方 | 03 – 05 |
| 0:45 – 0:50 | 休憩 | — |
| 0:50 – 1:10 | STEP 3　形を整える：緩和と重み | 06 – 08 |
| 1:10 – 1:25 | STEP 4　使う：探索・自然・群れ・経路 | 09 – 12 |
| 1:25 – 1:45 | STEP 5　音と絵筆・自由制作 | 13 – 14 |
| 1:45 – 1:50 | 発表・まとめ | — |

## 困ったときは

| 症状 | 解決法 |
|---|---|
| `voronoiCell is not defined` / `delaunay is not defined` | 一番下の「ボロノイ図の道具」までコピーできていない → 全部コピーし直す |
| 画面が固まる・カクカクする | サイトの数を減らす（06 の `nSites`、07 の `nDots`、14 の `maxSites`）か、`res` を大きくする |
| セルが表示されない・1 色だけ | サイトが 0 個か 1 個。クリックで足すか R |
| `startAudio is not defined` | 一番下の「音を鳴らすための道具」までコピーできていない → 全部コピーし直す |
| 音が出ない・カメラが動かない | キャンバスを1回クリック ／ アドレスバーの鍵マークで許可（15 はカメラがなくても作った絵で動く） |

ボロノイ図は O(n²) の半平面の切り取り（`voronoiCell`）と、粗い画素ごとの「最寄り探し」で作っています。速い方法（フォーチュン法 O(n log n)）のしくみは 05 で見られます。参考：de Berg ほか『コンピュータ・ジオメトリ』、Secord「Weighted Voronoi Stippling」(2002)、Worley「A Cellular Texture Basis Function」(1996)。

## ライセンス

MIT License ─ 授業・ワークショップで自由に改変・再利用してください。
