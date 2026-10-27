# シリーズ21：ロボティクス ─ p5.js コード集

ロボットを「感じて・考えて・動く」機械として組み立てる。アームの運動学、移動ロボットの制御と経路計画、センサーからの自己位置推定、群れまでを 2D シミュレーションで体験するワークショップ（110分）のコード集です。
[p5.js Web Editor](https://editor.p5js.org/) にコピー＆ペーストするだけで動きます。

## 🌐 コード集サイト

**https://r-shibusawa.github.io/p5-interactive-art/series21/**

## 使い方（p5.js Web Editor）

1. https://editor.p5js.org/ を開く
2. `sketch.js` の中身を全部消して（`Ctrl/⌘ + A` → `Delete`）、コードを貼り付ける
3. 左上の ▶（実行）ボタンを押す
4. 🔊 音を使うスケッチ（14）は、実行したらまずキャンバスを1回クリック。コードは一番下の「道具」まで全部コピーする。📷 カメラ（15）はアドレスバーで許可する

## スケッチ一覧

| # | タイトル | 内容 | 操作 | 使うもの |
|---|---|---|---|---|
| 00 | [2 リンクアームの順運動学](sketches/00_forward_kinematics/sketch.js) | 角度 → 手先の位置 | ←→ ↑↓＝関節 W T R | |
| 01 | [逆運動学（解析解）](sketches/01_inverse_kinematics/sketch.js) | 手先 → 角度、ひじ上・ひじ下 | クリック E 1〜3 A | |
| 02 | [多リンクの逆運動学 ─ CCD とヤコビアン転置](sketches/02_ccd_jacobian/sketch.js) | 反復法と収束 | マウス 1/2 L 上下 スペース | |
| 03 | [3 リンクアームで文字を描く](sketches/03_arm_draw_path/sketch.js) | 軌道追従と関節角のグラフ | 1〜4 上下＝速さ スペース C | |
| 04 | [差動二輪ロボットとオドメトリ](sketches/04_diff_drive_odometry/sketch.js) | 車輪速度 → 姿勢、すべりで推定がずれる | ↑↓ ←→ スペース N R | |
| 05 | [ゴールへ向かう ─ go-to-goal と pure pursuit](sketches/05_go_to_goal/sketch.js) | 向きのフィードバック制御、先読み点 | クリック 1/2 上下＝Kp 左右＝Ld C R | |
| 06 | [ポテンシャル法](sketches/06_potential_field/sketch.js) | 引力と斥力、局所解の罠 | クリック G 1/2 上下＝η R | |
| 07 | [グリッド上の A* 経路計画](sketches/07_astar_grid/sketch.js) | open/closed、ヒューリスティックの重み | ドラッグ スペース 上下＝w D E S G 8 | |
| 08 | [RRT ─ ランダムに伸びる木](sketches/08_rrt/sketch.js) | RRT と RRT*（つなぎ直し） | スペース クリック 上下＝偏り S R C | |
| 09 | [距離センサーと障害物回避](sketches/09_lidar_avoidance/sketch.js) | LiDAR、ブライテンベルク、bug 風 | クリック 1/2 G 上下＝ノイズ R | |
| 10 | [パーティクルフィルタによる自己位置推定](sketches/10_particle_filter/sketch.js) | 予測・重みづけ・リサンプリング | ←→＝粒子数 K 上下 スペース R | |
| 11 | [カルマンフィルタで追跡](sketches/11_kalman_tracking/sketch.js) | 等速モデル、不確かさの楕円 | 上下＝観測ノイズ 左右＝Q スペース R | |
| 12 | [ライントレースと PID](sketches/12_line_follow_pid/sketch.js) | 5 センサー、P/PD/PID | ←→＝Kp ↑↓＝Kd I F S 1〜3 R | |
| 13 | [群ロボット（swarm）](sketches/13_swarm/sketch.js) | 群れ・隊形・合意 | クリック 1〜5 上下＝台数 O R | |
| 14 | [ロボットの音](sketches/14_robot_sound/sketch.js) | 関節の速さ → モーター音、衝突 → ノイズ。自由制作のベース | クリック A 1〜3 E C | 🔊 |
| 15 | [カメラで操るアーム](sketches/15_webcam_arm/sketch.js) | 明るい所・選んだ色を追う IK アーム | 映像をクリック B ←→ E | 📷 |

## 授業の流れ（110分の目安）

| 時間 | 内容 | スケッチ |
|---|---|---|
| 0:00 – 0:10 | 導入：ロボット = 感じて・考えて・動く | — |
| 0:10 – 0:30 | STEP 1　アームの運動学 | 00 – 03 |
| 0:30 – 0:45 | STEP 2　移動ロボットの制御 | 04 – 05 |
| 0:45 – 0:50 | 休憩 | — |
| 0:50 – 1:10 | STEP 3　経路計画 | 06 – 08 |
| 1:10 – 1:25 | STEP 4　センサーと自己位置推定 | 09 – 11 |
| 1:25 – 1:45 | STEP 5　制御・群れ・自由制作 | 12 – 14 |
| 1:45 – 1:50 | 発表・まとめ | — |

## 困ったときは

| 症状 | 解決法 |
|---|---|
| 腕が目標に届かない・震える | 届く範囲（ドーナツ）の外。`L1`・`L2` を変えるか、`smooth` / `gain` を小さく |
| ロボットがくるくる回る | ゲイン（`Kp`・`Kd`）が大きすぎる。半分にしてみる。`ω` の上限（`constrain`）も確認 |
| 画面が固まる | 粒子・節・台数を減らす（10 の `N`、08 の `maxNodes`、13 の台数） |
| `startAudio is not defined` | 一番下の「音を鳴らすための道具」までコピーできていない → 全部コピーし直す |
| 音が出ない・カメラが動かない | キャンバスを1回クリック ／ アドレスバーの鍵マークで許可 |

すべて 2D の簡易シミュレーションです。式はロボティクスの教科書（Siegwart『Introduction to Autonomous Mobile Robots』、Thrun『Probabilistic Robotics』など）と同じ形にしてあります。

## ライセンス

MIT License ─ 授業・ワークショップで自由に改変・再利用してください。
