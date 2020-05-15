// レイマーチングの新しいテンプレート
// 球、トーラスなど

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
// 内外半径比・・内接球半径を外接球半径で割った値。
// 1.0より小さくなる。
"const float ioratio4 = 0.33333;" + // 1.0 / 3.0
"const float ioratio6 = 0.57735;" + // 1.0 / sqrt(3.0)
"const float ioratio8 = 0.57735;" + // 上に同じ
// 以下の値：2√(25 + 11√5) / ((√30)(1 + √5)).
"const float ioratio12 = 0.79465;" +
"const float ioratio20 = 0.79465;" + // 上に同じ。
// カット比・・切り取り半径を外接球半径で割った値。
"const float coratio4 = 0.55556;" + // 5/9
"const float coratio6 = 0.80474;" + // (1 + √2)/3
"const float coratio8 = 0.66667;" + // 2/3
"const float coratio12 = 0.92962;" + // (5 + 4√5)/15
"const float coratio20 = 0.81574;" + // (10 + √5)/15
// 角度定数、隣接する頂点と面重心のベクトルのなす角。
"const float ang_vf_4 = 1.23096;" + // acos(1/3)
"const float ang_vf_6 = 0.95532;" + // atan(√2)
"const float ang_vf_8 = 0.95532;" + // atan(√2)
"const float ang_vf1_12 = 0.65236;" + // atan(3-√5)
"const float ang_vf2_12 = 1.75951;" + // atan2(3+√5, -1)
"const float ang_vf1_20 = 0.65236;" + // atan(3-√5)
"const float ang_vf2_20 = 1.38208;" + // atan(3+√5)
// 色関連
// 自由に取得するならgetRGBで。
"const vec3 black = vec3(0.2);" +
"const vec3 red = vec3(0.95, 0.3, 0.35);" +
"const vec3 yellow = vec3(0.95, 0.98, 0.2);" +
"const vec3 green = vec3(0.3, 0.9, 0.4);" +
"const vec3 purple = vec3(0.6, 0.3, 0.98);" +
"const vec3 blue = vec3(0.2, 0.25, 0.98);" +
"const vec3 skyblue = vec3(0.1, 0.65, 0.9);" +
"const vec3 white = vec3(1.0);" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getRGB(float h, float s, float b){" +
"  vec3 c = vec3(h, s, b);" +
"  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"  rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"  return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// 双曲線関数
"float cosh(float x){" +
"  return 0.5 * (exp(x) + exp(-x));" +
"}" +
"float sinh(float x){" +
"  return 0.5 * (exp(x) - exp(-x));" +
"}" +
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
// 球。半径r.
// 中心cにしたいならcを引いて代入してね。
"float sphere(vec3 p, float r){" +
"  return length(p) - r;" +
"}" +
// 棒。原点からn方向、長さ無限、rは太さ。
"float bar(vec3 p, vec3 n, float r){" +
"  return length(p - dot(p, n) * n) - r;" +
"}" +
// 棒。aからb. 順不同。rは太さ。
// 半空間でぶったぎるだけ
"float finiteBar(vec3 p, vec3 a, vec3 b, float r){" +
"  vec3 n = normalize(b - a);" +
"  float t = length(p - a - dot(p - a, n) * n) - r;" +
"  return max(t, max(dot(p - a, a - b), dot(p - b, b - a)));" +
"}" +
// いよいよ多面体。
// 多面体描画の基本原理は、半空間描画。
// dot(p, dir) - rを使うと原点からdir方向にrのとこの平面の原点側全体
// になるからこれらのmaxを取ることで描画しているわけ。
// また、max(dot(p, dir), dot(p, -dir)) = abs(dot(p, dir))なので、
// 対称性を使えば計算量を半分にできる。
// なお、sizeはすべて外接球の半径とする。
"float tetrahedronOuter(vec3 p, float size){" +
"  size *= ioratio4;" + // 内接球半径を出す
"  vec3 dir = vec3(0.0, 1.0, 0.0);" + // 頂点ベクトル
"  float result = dot(p, -dir) - size;" + // 底面
"  dir = rotateZ(dir, ang_vf_4);" + // ひとつの面へ
"  vec3 q;" +
// 3つの面は120°対称で存在する
"  for(int i = 0; i < 3; i++){" +
"    q = rotateY(dir, pi * float(i) * 2.0 / 3.0);" +
"    result = max(result, dot(p, q) - size);" +
"  }" +
"  return result;" +
"}" +
// 正六面体（立方体）。
// 面の対が3つなのでabsを使って省略する。
// これも頂点から。
"float hexahedronOuter(vec3 p, float size){" +
"  size *= ioratio6;" + // 内接球半径
"  vec3 dir = vec3(0.0, 1.0, 0.0);" + // 頂点ベクトル
"  dir = rotateZ(dir, ang_vf_6);" +
"  vec3 q;" +
"  float result = 0.0;" +
"  for(int i = 0; i < 3; i++){" +
"    q = rotateY(dir, pi * float(i) * 2.0 / 3.0);" +
"    result = max(result, abs(dot(p, q)) - size);" +
"  }" +
"  return result;" +
"}" +
// 正八面体。
// もともと頂点ベース。
"float octahedronOuter(vec3 p, float size){" +
"  size *= ioratio8;" + // 内接球半径
"  vec3 dir = vec3(0.0, 1.0, 0.0);" +
// 回転角はatan(√2)で出る。
"  dir = rotateZ(dir, ang_vf_8);" +
"  float result = 0.0;" +
"  vec3 q;" +
"  for(int i = 0; i < 4; i++){" +
"    q = rotateY(dir, pi * float(i) * 0.5);" +
"    result = max(result, abs(dot(p, q)) - size);" +
"  }" +
"  return result;" +
"}" +
// 正十二面体。
// 頂点ベースに書き換える。
"float dodecahedronOuter(vec3 p, float size){" +
"  size *= ioratio12;" + // 内接球半径
"  vec3 dir = vec3(0.0, 1.0, 0.0);" +
"  vec3 dir1 = rotateZ(dir, ang_vf1_12);" + // 頂点周りの3つ(120°)
"  vec3 dir2 = rotateZ(dir, ang_vf2_12);" + // さらにその周りの3対(60°)
"  float result = 0.0;" +
"  vec3 q;" +
"  for(int i = 0; i < 3; i++){" +
"    q = rotateY(dir1, pi * float(i) * 2.0 / 3.0);" +
"    result = max(result, abs(dot(p, q)) - size);" +
"    q = rotateY(dir2, pi * float(i) * 2.0 / 3.0);" +
"    result = max(result, abs(dot(p, q)) - size);" +
"  }" +
"  return result;" +
"}" +
// 正二十面体。
// こちらはもともと頂点ベース
"float icosahedronOuter(vec3 p, float size){" +
"  size *= ioratio20;" +
"  vec3 dir = vec3(0.0, 1.0, 0.0);" +
"  vec3 dir1 = rotateZ(dir, ang_vf1_20);" +
"  vec3 dir2 = rotateZ(dir, ang_vf2_20);" +
"  vec3 q;" +
"  float result = 0.0;" +
"  for(int i = 0; i < 5; i++){" +
"    q = rotateY(dir1, pi * float(i) * 0.4);" +
"    result = max(result, abs(dot(p, q)) - size);" +
"    q = rotateY(dir2, pi * float(i) * 0.4);" +
"    result = max(result, abs(dot(p, q)) - size);" +
"  }" +
"  return result;" +
"}" +
// 面ベースで書き直して重ね合わせた方が圧倒的に楽なのでそうする。
// 仕組み。長いので上に。
"float tetrahedronInner(vec3 p, float size){" +
"  p.xz = -p.xz;" +
"  p = rotateZ(p, ang_vf_4);" +
"  return tetrahedronOuter(p, size / ioratio4);" +
"}" +
// 正六面体。
"float hexahedronInner(vec3 p, float size){" +
"  p.xz = -p.xz;" +
"  p = rotateZ(p, ang_vf_6);" +
"  return hexahedronOuter(p, size / ioratio6);" +
"}" +
// 正八面体。
"float octahedronInner(vec3 p, float size){" +
"  p.xz = -p.xz;" +
"  p = rotateZ(p, ang_vf_8);" +
"  return octahedronOuter(p, size / ioratio8);" +
"}" +
// 正十二面体。
"float dodecahedronInner(vec3 p, float size){" +
"  p.xz = -p.xz;" +
"  p = rotateZ(p, ang_vf1_12);" +
"  return dodecahedronOuter(p, size / ioratio12);" +
"}" +
// 正二十面体。
"float icosahedronInner(vec3 p, float size){" +
"  p.xz = -p.xz;" +
"  p = rotateZ(p, ang_vf1_20);" +
"  return icosahedronOuter(p, size / ioratio20);" +
"}" +
// トーラス
"float torus(vec3 p, float a, float b){" +
"  return sqrt(dot(p, p) + dot(a, a) - 2.0 * a * length(p.xz)) - b;" +
"}" +
// map関数。距離の見積もり関数.
// ここでdを更新するときに最後に更新されたオブジェクトのところがどこか
// を調べればオブジェクトごとの色分けができそうね。
// modeを指定してminかmaxか選べるようにしたい。そうすれば、
// 切頂したときに違う色にできる。
// 0のときminで更新、1のときmaxで更新するように変更。
"void updateDist(out vec3 color, out float dist, vec3 c, float d, int modeId){" +
"  if(d < dist && modeId == 0){ color = c; dist = d; }" +
"  if(d > dist && modeId == 1){ color = c; dist = d; }" +
"}" +
// mapの返り値をvec4にしてはじめのxyzで色を表現してwで距離を表現する。
"vec4 map(vec3 p){" +
"  vec3 color = skyblue;" +
"  float t = sphere(p - vec3(1.0, 0.0, 0.0), 0.1);" +
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
// まあこれだと空間がぐるぐるしてる感じがないからなー・・
// 体の色に合わせて変えてみるやつやってみました。
"  vec3 color = mix(blue, white, 0.5);" +
"  return color * (0.4 + p.y * 0.3);" +
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
"    color = mix(baseColor, color, tanh(t * 0.1));" +
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
  mode = AUTO;
}

function draw(){
  myShader.setUniform("u_resolution", [width, height]);
  let mx = constrain(mouseX / width, 0.0, 1.0);
  let my = 1.0 - constrain(mouseY / height, 0.0, 1.0);
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
