// Q:これは何ですか？
// A:クソコードです。

// foldを2回使う実験というのがコンセプトです。
// 結論から言うと、生のニンジンは誰も食べないということです。
















// 3Dのfoldやってみたい

// H3の対称性でfold2回。
// 使うのは大星型十二面体。
// 後ろの雪はただの背景。

let myShader;

let vs =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(void){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}";

let fs =
"precision mediump float;" +
// uniform.
"uniform vec2 u_resolution;" +
"uniform vec2 u_mouse;" + // -1.0～1.0
"uniform float u_time;" +
"uniform int u_mode;" + // 0でauto, 1でmanual.
// 定数
"const float pi = 3.14159;" +
// グローバル
// まずは基本領域内の点（今回はひとつだけ）と鏡映面の法線ベクトル
// uniquePは使用しない。
"vec3 na;" + // 第一鏡映面(1, 0, 0). yz平面での鏡映。
"vec3 nb;" + // 第二鏡映面(0, 1, 0). xz平面での鏡映。
"vec3 nc;" + // 第三鏡映面。第一、第二とのなす角は60°と180/n°になる。
// 次にそれらが作る面の法線ベクトル。
// 鏡映面の交線ベクトルを外積で作って正規化したもの。
// これを作る前のpab, pbc, pcaは正規化されていなくて、sizeに応じて
// 基本領域の境界を作っており重心座標によりuniquePを決めるのに使う。
// -na, -nb, -ncは左手系を作るので、
// cross(na, nb), cross(nb, nc), cross(nc, na)はこれらの平面の作る
// 立体から外に突き出してることに注意する。
"vec3 pab;" + // na, nb.
"vec3 pbc;" + // nb, nc.
"vec3 pca;" + // nc, na.
// 色関連
// 自由に取得するならgetRGBで。
"const vec3 white = vec3(1.0);" +
"const vec3 red = vec3(0.95, 0.3, 0.35);" +
"const vec3 green = vec3(0.3, 0.9, 0.4);" +
"const vec3 gold = vec3(0.75, 0.57, 0.14);" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getRGB(float h, float s, float b){" +
"  vec3 c = vec3(h, s, b);" +
"  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"  rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"  return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// 双曲線関数
"float tanh(float x){" +
"  return (exp(x) - exp(-x)) / (exp(x) + exp(-x));" +
"}" +
// 初期化処理。gCoordは重心座標(全部足して1ですべて0.0以上)。
// まず正四面体の鏡映群(A3)の場合。
"void initialize(float size){" +
"  float ratio = (1.0 + sqrt(5.0)) * 0.5;" + // 黄金比
"  na = vec3(1.0, 0.0, 0.0);" +
"  nb = vec3(0.0, 1.0, 0.0);" +
"  nc = vec3(-0.5, -ratio * 0.5, (ratio - 1.0) * 0.5);" +
"  pab = vec3(0.0, 0.0, ratio * 0.5) * size;" +
"  pbc = vec3(0.5, 0.0, ratio * 0.5) * size;" +
"  pca = vec3(0.0, ratio / 6.0, (2.0 * ratio + 1.0) / 6.0) * size;" +
"}" +
// 折り畳み処理。A3の場合は3回。
// 具体的にはna, nb, ncのそれぞれについてそれと反対にあるときだけ
// 面で鏡写しにする。
"void fold(inout vec3 p){" +
"  for(int i = 0; i < 5; i++){" +
"    p -= 2.0 * min(0.0, dot(p, na)) * na;" +
"    p -= 2.0 * min(0.0, dot(p, nb)) * nb;" +
"    p -= 2.0 * min(0.0, dot(p, nc)) * nc;" +
"  }" +
"}" +
// pをfoldしつつiterationの回数を返す。
"float countFold(inout vec3 p){" +
"  float n = 0.0;" +
"  float q;" +
"  for(int i = 0; i < 5; i++){" +
"    q = dot(p, na);" +
"    if(q < 0.0){ n += 1.0; p -= 2.0 * q * na; }" +
"    q = dot(p, nb);" +
"    if(q < 0.0){ n += 1.0; p -= 2.0 * q * nb; }" +
"    q = dot(p, nc);" +
"    if(q < 0.0){ n += 1.0; p -= 2.0 * q * nc; }" +
"  }" +
"  return n;" +
"}" +
// ベクトルpのt回転。OK!
"vec2 rotate(vec2 p, float t){" +
"  return p * cos(t) + vec2(-p.y, p.x) * sin(t);" +
"}" +
// x, y, z軸周りの回転をまとめておきたい
// 汎用性を高めるにはvoidで書かない方がよい。こだわり捨ててね。
// x軸周り, yをzに移す回転。
"vec3 rotateX(vec3 p, float t){" +
"  p.yz = rotate(p.yz, t);" +
"  return p;" +
"}" +
// y軸周り、zをxに移す回転。上から見て反時計回り。
"vec3 rotateY(vec3 p, float t){" +
"  p.zx = rotate(p.zx, t);" +
"  return p;" +
"}" +
// z軸周り。xをyに移す回転。
"vec3 rotateZ(vec3 p, float t){" +
"  p.xy = rotate(p.xy, t);" +
"  return p;" +
"}" +
// map関数。距離の見積もり関数.
// ここでdを更新するときに最後に更新されたオブジェクトのところがどこか
// を調べればオブジェクトごとの色分けができそうね。
// modeを指定してminかmaxか選べるようにしたい。そうすれば、
// 切頂したときに違う色にできる。
// 0のときminで更新、1のときmaxで更新するように変更。
// 2のとき新しい図形でのくりぬき
// これで平面スライスとかできるようになるはず
"void updateDist(out vec3 color, out float dist, vec3 c, float d, int modeId){" +
"  if(d < dist && modeId == 0){ color = c; dist = d; }" +
"  if(d > dist && modeId == 1){ color = c; dist = d; }" +
"  if(-d > dist && modeId == 2){ color = c; dist = -d; }" +
"}" +
// mapの返り値をvec4にしてはじめのxyzで色を表現してwで距離を表現する。
"vec4 map(vec3 p){" +
"  vec3 color;" +
"  float n = countFold(p);" +
"  float t = 1e20;" +
"  float k = (sqrt(5.0) + 1.0) / 2.0;" + // 黄金比
"  updateDist(color, t, red, dot(p - pca, vec3(0.0, -0.5 * k, 0.5)), 0);" +
// ちょっと離れたところに同じものを配置する感じ。
"  vec3 c = (pab + pbc + pca) * 0.6;" +
"  p -= c;" +
"  p *= 3.5;" +
"  float m = countFold(p);" +
"  updateDist(color, t, green, dot(p - pca, vec3(0.0, -0.5 * k, 0.5)), 0);" +
"  return vec4(color, t);" +
"}" +
// 法線ベクトルの取得
"vec3 calcNormal(vec3 p){" +
"  const vec2 eps = vec2(0.0001, 0.0);" +
// F(x, y, z) = 0があらわす曲面の、F(x, y, z)が正になる側の
// 法線を取得するための数学的処理。具体的には偏微分、分母はカット。
"  vec3 n;" +
"  n.x = map(p + eps.xyy).w - map(p - eps.xyy).w;" +
"  n.y = map(p + eps.yxy).w - map(p - eps.yxy).w;" +
"  n.z = map(p + eps.yyx).w - map(p - eps.yyx).w;" +
"  return normalize(n);" +
"}" +
// レイマーチングのメインコード
"float march(vec3 ray, vec3 camera){" +
"  const float maxd = 20.0;" + // 限界距離。これ越えたら無いとみなす。
"  const float precis = 0.001;" + // 精度。これより近付いたら到達とみなす。
"  const int ITERATION = 64;" + // マーチングループの回数
"  float h = precis * 2.0;" + // 毎フレームの見積もり関数の値。
// 初期値は0.0で初期化されてほしくないのでそうでない値を与えてる。
// これがprecisを下回れば到達とみなす
"  float t = 0.0;" +
// tはcameraからray方向に進んだ距離の累計。
// 到達ならこれが返る。失敗なら-1.0が返る。つまりresultが返る。
"  float result = -1.0;" +
"  for(int i = 0; i < ITERATION; i++){" +
"    if(h < precis || t > maxd){ break; }" +
// tだけ進んだ位置で見積もり関数の値hを取得し、tに足す。
"    h = map(camera + t * ray).w;" +
"    t += h;" +
"  }" +
// t < maxdなら、h < precisで返ったということなのでマーチング成功。
"  if(t < maxd){ result = t; }" +
"  return result;" +
"}" +
// カメラなどの回転。オート、マニュアル両方用意する
// x軸周り回転のピッチングとy軸周りのヨーイングだけ。
"void transform(out vec3 p){" +
"  if(u_mode == 2){ return; }" + // 停止
"  float angleX = pi * u_time * 0.3;" +
"  float angleY = pi * u_time * 0.15;" +
"  if(u_mode == 1){" +
"    angleX = pi * 0.3 * (2.0 * u_mouse.y - 1.0);" +
"    angleY = pi * 4.0 * (2.0 * u_mouse.x - 1.0);" +
"  }" +
"  p = rotateX(p, angleX);" +
"  p = rotateY(p, angleY);" +
"}" +
// 背景色。とりあえずデフォでいいよ。
"vec3 getBackground(vec2 p){" +
// 金色のグラデーションと雪の簡単なやつ。
"  vec3 color = mix(gold, white, 0.7) * (0.4 + p.y * 0.3);" +
"  float x = floor((p.x + 0.1) / 0.2) * 0.2;" + // -0.1～0.1で0.0, あとは0.2ずつずらして0.1, 0.2, ...
"  float diff = mod(u_time * 0.2, 0.2);" + // 雪を動かす
"  float y = floor((p.y + 0.1 + diff) / 0.2) * 0.2 - diff;" + // なんか知らないけど足して0.1になるように、あとdiffで幅を動かしている。
"  if(mod(x * 5.0, 2.0) < 0.5){ y = floor((p.y + diff) / 0.2) * 0.2 - diff + 0.1; }" + // 乱れる感じを出したい。正方形のグリッドをずらしている。
"  float d = length(p - vec2(x, y));" +
"  color = white + smoothstep(0.03, 0.07, d) * (color - white);" + // smoothstepを使って輪郭をぼかす
"  return color;" +
"}" +
// メインコード。
"void main(void){" +
"  vec2 p = (gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);" +
// まずは背景色を取得。
"  vec3 color = getBackground(p);" +
// ray（目線）を設定。canvasは視点からz軸負方向1.8で。
"  vec3 ray = normalize(vec3(p, -1.8));" +
// camera（カメラ位置）を設定。z軸上、4.5のところ。
"  vec3 camera = vec3(0.0, 0.0, 4.5);" +
// 光源。rayの到達位置から生えるベクトル。気持ちz軸側くらい。
"  vec3 light = normalize(vec3(0.5, 0.8, 3.0));" +
// 目線、カメラ位置、光源をまとめて回転させる。
// ということはキャンバスも動くことになる。
// 今回対象物はその場に固定で、カメラの位置だけ半径4.5の球面上を
// 動かすこととし、光源などもまとめてそれに応じて動かす感じ。
// timeで動かしてるけどマウスでもいいと個人的には思う。
// autoかmanualでtransformする。バリデーションは中でやる。
"  transform(ray);" +
"  transform(camera);" +
"  transform(light);" +
// 初期化処理。
"  initialize(1.2);" +
// マーチングの結果を取得。
"  float t = march(ray, camera);" +
// tはマーチングに失敗すると-1.0が返る仕組みでその場合colorは
// 更新されずそこは背景色が割り当てられる。
// 先に体色を用意しておく。黄色っぽい。
"  if(t > -0.001){" +
"    vec3 pos = camera + t * ray;" + // 表面。
"    vec3 n = calcNormal(pos);" + // 法線取得
// 明るさ。内積の値に応じて0.3を最小とし1.0まで動かす。
"    float diff = clamp((dot(n, light) + 0.5) * 0.7, 0.3, 1.0);" +
"    vec3 baseColor = map(pos).xyz;" + // bodyColor取得。
"    baseColor *= diff;" +
// 遠くでフェードアウトするように調整する
"    color = mix(baseColor, color, tanh(t * 0.02));" +
"  }" +
// 以上。
"  gl_FragColor = vec4(color, 1.0);" +
"}";

let myCanvas;
let isLoop = true;
const AUTO = 0;
const MANUAL = 1;
const FIXED = 2;
// もしくはvec3とかにして具体的に指定して固定するのもありかもね
let mode; // 画面ぐるぐる。マニュアルかオートか。

function setup(){
  createCanvas(640, 640);
  myCanvas = createGraphics(width, height, WEBGL);
  myShader = myCanvas.createShader(vs, fs);
  myCanvas.shader(myShader);
  textSize(40);
  textAlign(CENTER,CENTER);
  mode = AUTO;
}

function draw(){
  myShader.setUniform("u_resolution", [myCanvas.width, myCanvas.height]);
  let mx = constrain(mouseX / myCanvas.width, 0.0, 1.0);
  let my = 1.0 - constrain(mouseY / myCanvas.height, 0.0, 1.0);
  // マウスの値は0～1にしよう・・
  myShader.setUniform("u_mouse", [mx, my]);
  myShader.setUniform("u_time", millis() / 1000);
  myShader.setUniform("u_mode", mode);
  myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
  image(myCanvas, 0, 0);
  showText();
}

function showText(){
  /* なんか書くかも */
}

// 画面外のボタンで切り替えできるといいかも知れない。(MANUAL/AUTO)
function keyTyped(){
  if(keyCode === 32){
    if(isLoop){ isLoop = false; noLoop(); }
    else{ isLoop = true; loop(); }
  }
}
