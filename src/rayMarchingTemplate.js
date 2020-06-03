// レイマーチングのテンプレート
// そのうちfoldも追加したいね
// 対称性いろいろ増やすとか
// テクスチャにはどう対応するつもりなのか

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
// 色関連
// 自由に取得するならgetRGBで。
"const vec3 black = vec3(0.2);" +
"const vec3 red = vec3(0.95, 0.3, 0.35);" +
"const vec3 orange = vec3(0.98, 0.49, 0.13);" +
"const vec3 yellow = vec3(0.95, 0.98, 0.2);" +
"const vec3 green = vec3(0.3, 0.9, 0.4);" +
"const vec3 lightgreen = vec3(0.7, 0.9, 0.1);" +
"const vec3 purple = vec3(0.6, 0.3, 0.98);" +
"const vec3 blue = vec3(0.2, 0.25, 0.98);" +
"const vec3 skyblue = vec3(0.1, 0.65, 0.9);" +
"const vec3 white = vec3(1.0);" +
"const vec3 aquamarine = vec3(0.47, 0.98, 0.78);" +
"const vec3 turquoise = vec3(0.25, 0.88, 0.81);" +
"const vec3 coral = vec3(1.0, 0.5, 0.31);" +
"const vec3 limegreen = vec3(0.19, 0.87, 0.19);" +
"const vec3 khaki = vec3(0.94, 0.90, 0.55);" +
"const vec3 navy = vec3(0.0, 0.0, 0.5);" +
"const vec3 silver = vec3(0.5);" +
"const vec3 gold = vec3(0.85, 0.67, 0.14);" +
// fold用
"const vec3 nc3 = vec3(-0.5, -0.5, 0.707106);" +
"const vec3 pab3 = vec3(0.0, 0.0, 0.707106);" +
"const vec3 pbc3 = vec3(0.333333, 0.0, 0.235702);" +
"const vec3 pca3 = vec3(0.0, 1.0, 0.707106);" +
"const vec3 nab3 = vec3(0.0, 0.0, 1.0);" +
"const vec3 nbc3 = vec3(0.816497, 0.0, 0.577350);" +
"const vec3 nca3 = vec3(0.0, 0.816497, 0.577350);" +
"const vec3 nc4 = vec3(-0.5, -0.707106, 0.5);" +
"const vec3 pab4 = vec3(0.0, 0.0, 1.0);" +
"const vec3 pbc4 = vec3(0.5, 0.0, 0.5);" +
"const vec3 pca4 = vec3(0.0, 0.707106, 1.0);" +
"const vec3 nab4 = vec3(0.0, 0.0, 1.0);" +
"const vec3 nbc4 = vec3(0.707106, 0.0, 0.707106);" +
"const vec3 nca4 = vec3(0.0, 0.577350, 0.816497);" +
"const vec3 nc5 = vec3(-0.5, -0.809017, 0.309017);" +
"const vec3 pab5 = vec3(0.0, 0.0, 0.809017);" +
"const vec3 pbc5 = vec3(0.5, 0.0, 0.809017);" +
"const vec3 pca5 = vec3(0.0, 0.269672, 0.706011);" +
"const vec3 nab5 = vec3(0.0, 0.0, 1.0);" +
"const vec3 nbc5 = vec3(0.525731, 0.0, 0.850651);" +
"const vec3 nca5 = vec3(0.0, 0.356822, 0.934172);" +
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
"void foldA3(inout vec3 p){" +
"  for(int i = 0; i < 2; i++){" +
"    p.xy = abs(p.xy);" +
"    p -= 2.0 * min(0.0, dot(p, nc3)) * nc3;" +
"  }" +
"}" +
"int foldA3Count(inout vec3 p){" +
"  int n = 0;" +
"  float _dot;" +
"  for(int i = 0; i < 2; i++){" +
"    if(p.x < 0.0){ p.x = -p.x; n++; }" +
"    if(p.y < 0.0){ p.y = -p.y; n++; }" +
"    _dot = dot(p, nc3);" +
"    if(_dot < 0.0){ p -= 2.0 * _dot * nc3; n++; }" +
"  }" +
"  return n;" +
"}" +
"vec3 getP3(vec3 u){" +
"  return u.x * pab3 + u.y * pbc3 + u.z * pca3;" +
"}" +
"void foldBC3(inout vec3 p){" +
"  for(int i = 0; i < 3; i++){" +
"    p.xy = abs(p.xy);" +
"    p -= 2.0 * min(0.0, dot(p, nc4)) * nc4;" +
"  }" +
"}" +
"int foldBC3Count(inout vec3 p){" +
"  int n = 0;" +
"  float _dot;" +
"  for(int i = 0; i < 3; i++){" +
"    if(p.x < 0.0){ p.x = -p.x; n++; }" +
"    if(p.y < 0.0){ p.y = -p.y; n++; }" +
"    _dot = dot(p, nc4);" +
"    if(_dot < 0.0){ p -= 2.0 * _dot * nc4; n++; }" +
"  }" +
"  return n;" +
"}" +
"vec3 getP4(vec3 u){" +
"  return u.x * pab4 + u.y * pbc4 + u.z * pca4;" +
"}" +
"void foldH3(inout vec3 p){" +
"  for(int i = 0; i < 5; i++){" +
"    p.xy = abs(p.xy);" +
"    p -= 2.0 * min(0.0, dot(p, nc5)) * nc5;" +
"  }" +
"}" +
"int foldH3Count(inout vec3 p){" +
"  int n = 0;" +
"  float _dot;" +
"  for(int i = 0; i < 5; i++){" +
"    if(p.x < 0.0){ p.x = -p.x; n++; }" +
"    if(p.y < 0.0){ p.y = -p.y; n++; }" +
"    _dot = dot(p, nc5);" +
"    if(_dot < 0.0){ p -= 2.0 * _dot * nc5; n++; }" +
"  }" +
"  return n;" +
"}" +
"vec3 getP5(vec3 u){" +
"  return u.x * pab5 + u.y * pbc5 + u.z * pca5;" +
"}" +
// 球。半径r.
// 中心cにしたいならcを引いて代入してね。
"float sphere(vec3 p, float r){" +
"  return length(p) - r;" +
"}" +
// 棒。原点からn方向、長さは両方向に無限、rは太さ。
"float bar(vec3 p, vec3 n, float r){" +
"  return length(p - dot(p, n) * n) - r;" +
"}" +
// 半分開いた棒。原点からnと逆方向に、長さ無限大。
// はじっこは丸くなってる。
"float halfBar(vec3 p, vec3 n, float r){" +
"  return length(p - min(0.0, dot(p, n)) * n) - r;" +
"}" +
// 長さに制限をかける。
"float limitedHalfBar(vec3 p, vec3 n, float r, float limit){" +
"  return length(p - max(-limit, min(0.0, dot(p, n))) * n) - r;" +
"}" +
// 多角柱ってどうやるの
// とりあえず原点からy軸マイナス方向に伸ばしてみる
// limitで長さを制限。
// p入力時にy軸周りで回転させればそういうこともできるけどね・・
"float polygonBar(vec3 p, int n, float r, float limit){" +
"  float t = 0.0;" +
"  float nf = float(n);" +
"  for(float i = 0.0; i < 16.0; i += 1.0){" +
"    if(i == nf){ break; }" +
"    t = max(t, dot(p.zx, vec2(cos(pi * 2.0 * i / nf), sin(pi * 2.0 * i / nf))));" +
"  }" +
"  return max(max(t - r, p.y), -p.y - limit);" +
"}" +
// 立方体
"float cube(vec3 p, float size){" +
"  return max(abs(p.x), max(p.y, p.z)) - size;" +
"}" +
// 簡単な箱
"float box(vec3 p, vec3 a){" +
"  return max(abs(p.x) - a.x, max(abs(p.y) - a.y, abs(p.z) - a.z));" +
"}" +
// map関数。距離の見積もり関数.
// 0:min,合併
// 1:max,共通部分
// 2:minus min,くりぬき
"void updateDist(out vec3 color, out float dist, vec3 c, float d, int modeId){" +
"  if(d < dist && modeId == 0){ color = c; dist = d; }" +
"  if(d > dist && modeId == 1){ color = c; dist = d; }" +
"  if(-d > dist && modeId == 2){ color = c; dist = -d; }" +
"}" +
// mapの返り値をvec4にしてはじめのxyzで色を表現してwで距離を表現する。
"vec4 map(vec3 p){" +
"  vec3 color = blue;" +
"  float t = 1e20;" +
"  for(float x = 0.0; x < 4.0; x += 0.5){" +
"    for(float z = 0.0; z < 4.0; z += 0.5){" +
"      t = min(t, polygonBar(p - vec3(x, 0.0, z), 4, 0.1, 4.0));" +
"    }" +
"  }" +
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
"    angleX = pi * 0.5 * (2.0 * u_mouse.y - 1.0);" +
"    angleY = pi * 4.0 * (2.0 * u_mouse.x - 1.0);" +
"  }" +
"  p = rotateX(p, angleX);" +
"  p = rotateY(p, angleY);" +
"}" +
// 背景色。気分を変えてチェック
"vec3 getBackground(vec2 p){" +
"  vec2 i = floor(p * 10.0);" +
"  vec3 color = mix(navy, white, 0.6 + 0.3 * mod(i.x + i.y, 2.0));" +
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
  createCanvas(640, 480);
  myCanvas = createGraphics(width, height, WEBGL);
  myShader = myCanvas.createShader(vs, fs);
  myCanvas.shader(myShader);
  textSize(40);
  textAlign(CENTER,CENTER);
  mode = MANUAL;
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
