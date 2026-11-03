# シリーズ38：トロピカル幾何学 ─ p5.js コード集

「足し算 = min、掛け算 = +」という奇妙な算数（トロピカル半環）から、折れ線でできた「曲線」が生まれる。トロピカル多項式と曲線、ニュートン多角形との双対性、ベズーの定理、アメーバ、そして max-plus 代数の応用（最短経路・周期スケジュール）までを 2D で体験するワークショップ（110分）のコード集です。
[p5.js Web Editor](https://editor.p5js.org/) にコピー＆ペーストするだけで動きます。

## 🌐 コード集サイト

**https://r-shibusawa.github.io/p5-interactive-art/series38/**

## 使い方（p5.js Web Editor）

1. https://editor.p5js.org/ を開く
2. `sketch.js` の中身を全部消して（`Ctrl/⌘ + A` → `Delete`）、コードを貼り付ける
3. 左上の ▶（実行）ボタンを押す
4. 多くのスケッチは一番下に「トロピカル曲線の道具」があるので、**一番下まで全部**コピーする。🔊 音を使うスケッチ（13）は、実行したらまずキャンバスを1回クリック。📷 カメラ（15）はアドレスバーで許可する

## スケッチ一覧

| # | タイトル | 内容 | 操作 | 使うもの |
|---|---|---|---|---|
| 00 | [トロピカル電卓](sketches/00_tropical_calc/sketch.js) | a ⊕ b = min、a ⊗ b = +。⊕ と ⊗ の表 | ←→＝a ↑↓＝b M マウス | |
| 01 | [一変数トロピカル多項式](sketches/01_tropical_poly1d/sketch.js) | 直線の下包絡線、折れ点 = 根と重複度 | ドラッグ ↑↓＝次数 R 0 | |
| 02 | [トロピカル直線](sketches/02_tropical_line/sketch.js) | 頂点から 3 本の半直線、3 つの領域 | ドラッグ 1〜3 ↑↓ M R | |
| 03 | [2 本の直線は 1 点で交わる](sketches/03_two_lines/sketch.js) | 安定交点とトロピカル・クラメルの公式 | ドラッグ ←→＝ε G R | |
| 04 | [トロピカル 2 次曲線と双対性](sketches/04_tropical_conic/sketch.js) | 高さ → 正則細分 ⇔ 曲線（同じ色が対応） | ドラッグ R 0 S | |
| 05 | [ニュートン多角形の正則細分](sketches/05_newton_subdivision/sketch.js) | 次数 d の曲線、辺の格子長 = 重み、双対グラフ | ↑↓＝d ドラッグ スペース R 0 W | |
| 06 | [トロピカル 3 次曲線と種数](sketches/06_tropical_cubic/sketch.js) | 内部格子点 ⇔ サイクル、smooth 判定 | ドラッグ ↑↓ R 0 G N | |
| 07 | [アメーバと脱量子化](sketches/07_amoeba/sketch.js) | log_t で複素曲線がトロピカル曲線に | ↑↓＝t M T C | |
| 08 | [トロピカル・ベズーの定理](sketches/08_tropical_bezout/sketch.js) | 交点の重みの合計 = d × e | ←→＝d ↑↓＝e R スペース | |
| 09 | [トロピカル行列積 = 最短経路](sketches/09_tropical_matrix_paths/sketch.js) | A^{⊗k} = k 本以下の辺の最短距離 | ドラッグ ↑↓＝k クリック R | |
| 10 | [トロピカル固有値と周期スケジュール](sketches/10_tropical_eigen/sketch.js) | max-plus 系、Karp の最大平均サイクル | ドラッグ スペース ↑↓ R | |
| 11 | [トロピカル凸包](sketches/11_tropical_convex/sketch.js) | 折れ線の線分、ふつうの凸包と比較 | クリック ドラッグ H C R | |
| 12 | [バランス条件](sketches/12_balancing/sketch.js) | 頂点で Σ 重み × 方向 = 0 | クリック ↑↓ R W 0 | |
| 13 | [max-plus のダイヤを聴く](sketches/13_tropical_sound/sketch.js) | 工程の開始時刻が音に。周期 = 固有値。自由制作のベース | クリック Shift 1〜3 ↑↓ R | 🔊 |
| 14 | [トロピカル曲線ブラシ](sketches/14_tropical_brush/sketch.js) | 軌跡 → 係数 → ステンドグラス | ドラッグ ↑↓ 1〜3 S C | |
| 15 | [カメラからトロピカル曲線](sketches/15_webcam_tropical/sketch.js) | 明るさを係数に。暗い物で曲線が動く | ↑↓ I V R | 📷 |

## 授業の流れ（110分の目安）

| 時間 | 内容 | スケッチ |
|---|---|---|
| 0:00 – 0:10 | 導入：足し算が min になる世界 | — |
| 0:10 – 0:30 | STEP 1　トロピカル演算 | 00 – 02 |
| 0:30 – 0:45 | STEP 2　トロピカル曲線 | 03 – 05 |
| 0:45 – 0:50 | 休憩 | — |
| 0:50 – 1:10 | STEP 3　定理と複素との関係 | 06 – 08 |
| 1:10 – 1:25 | STEP 4　max-plus 代数の応用 | 09 – 12 |
| 1:25 – 1:45 | STEP 5　音・ブラシ・自由制作 | 13 – 14 |
| 1:45 – 1:50 | 発表・まとめ | — |

## 困ったときは

| 症状 | 解決法 |
|---|---|
| `tropCurve is not defined` / `makeTerms is not defined` | 一番下の「トロピカル曲線の道具」までコピーできていない → 全部コピーし直す |
| 曲線が出ない・頂点が 0 個 | 係数が全部同じ平面の上（たとえば全部 0）= 細分なし。R でランダムにするか、点を 1 つドラッグ |
| 交点の数が d·e にならない（08） | 一般の位置でない（頂点を通っている）。R でランダムにし直す |
| 画面が重い | 次数 d を下げる（項の数 = (d+1)(d+2)/2）。14・15 は `scale4` を大きく |
| `Identifier 'audioCtx' has already been declared` | 合体で「道具」が 2 つある → 片方を消す |
| 音が出ない・カメラが動かない | キャンバスを1回クリック ／ アドレスバーの鍵マークで許可 |

すべて min 流儀（⊕ = min）で統一しています。max 流儀にしたいときは min → max、∞ → −∞ に置き換え（00・02 は M キーで切替）。式は Maclagan–Sturmfels『Introduction to Tropical Geometry』と同じ形にしてあります。

## ライセンス

MIT License ─ 授業・ワークショップで自由に改変・再利用してください。
