// 単純な90°のやつ。鏡映群。Z/2Zの3乗。
// foldは単にabsするだけ。ただ点とかは事前に用意しておきたい。

// 全部詰め合わせ。しばらくいいや、めんどくさい・・・
// bodyColorのモーフィングとかするの？うにうに・・・

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
// 座標軸上の1点など
"const vec3 e1 = vec3(1.0, 0.0, 0.0);" +
"const vec3 e2 = vec3(0.0, 1.0, 0.0);" +
"const vec3 e3 = vec3(0.0, 0.0, 1.0);" +
"const vec3 e123 = vec3(1.0, 1.0, 1.0);" +
// グローバル. cornerはGとe123の間のどこか。
// 移行を容易にするために2つ用意する。
// versionは描画方法を指定する。0か1か2.
// 整理すると、
// P1, P2, P3による描画は0と2のとき、
// P123による描画は0のときのみ、
// Q1, Q2, Q3による描画は1のときと2でパリティ0のとき、
// R1, R2, R3による描画は2でパリティ1のとき。
"vec3 V1, V2, V3, G;" +
"vec3 P12, P23, P31, P123, Q12, Q23, Q31, R12, R23, R31;" +
"vec3 corner0, corner1;" +
"int version;" +
"bool verticeFlag;" + // V1, V2, V3を描画するかどうか。
"bool cornerFlag;" + // e123を描画するかどうか。
"bool subCornerFlag;" + // 変形過程でcorner0を描画する場合にONにするフラグ
"vec3 bodyColor;" + // 立体の色について
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
// ここはどっちもvec2で統一できる。
"vec4 getParam(){" +
"  float time = mod(u_time, 48.0);" +
"  float f = fract(time / 3.0);" +
"  verticeFlag = true;" +
"  cornerFlag = false;" +
// e123の描画が確実な場合。ver2の間は場合分けで対応する。
"  if(time > 24.0 && time < 39.0){ cornerFlag = true; }" +
// 逆黄金比。正十二面体、正二十面体双方に現れる。
"  float k = (sqrt(5.0) - 1.0) / 2.0;" +
// 色も決める。RGBで適当に・・
"  bodyColor = turquoise;" +
"  if(time < 3.0){" +
"    return vec4(0.0, 0.0, 0.0, 0.0);" +
"  }else if(time < 6.0){" +
"    bodyColor = mix(turquoise, skyblue, f);" +
"    return vec4(k * f, 0.0, 0.0, 0.0);" +
"  }else if(time < 9.0){" +
"    bodyColor = skyblue;" +
"    return vec4(k, 0.0, 0.0, 0.0);" +
"  }else if(time < 12.0){" +
"    bodyColor = mix(skyblue, blue, f);" +
"    return vec4(k + f * (1.0 - k), 0.0, 0.0, 0.0);" +
"  }else if(time < 15.0){" +
"    bodyColor = blue;" +
"    return vec4(1.0, 0.0, 0.0, 0.0);" +
"  }else if(time < 18.0){" +
"    bodyColor = mix(blue, purple, f);" +
"    return vec4(1.0, 0.0, 0.0, f);" +
"  }else if(time < 21.0){" +
"    bodyColor = purple;" +
"    return vec4(1.0, 0.0, 0.0, 1.0);" +
"  }else if(time < 24.0){" +
"    subCornerFlag = true;" +
"    bodyColor = mix(purple, red, f);" +
"    return vec4(1.0, 0.0, f, 1.0); }" +
"  else if(time < 27.0){" +
"    bodyColor = red;" +
"    verticeFlag = false; return vec4(1.0, 0.0, 1.0, 1.0); }" +
"  else if(time < 30.0){" +
"    bodyColor = mix(red, orange, f);" +
"    return vec4(1.0 + f * (k - 1.0), k * f, 1.0, 1.0);" +
"  }else if(time < 33.0){" +
"    bodyColor = orange;" +
"    return vec4(k, k, 1.0, 1.0);" +
"  }else if(time < 36.0){" +
"    bodyColor = mix(orange, yellow, f);" +
"    return vec4(k * (1.0 - f), k * (1.0 - f), 1.0, 1.0);" +
"  }else if(time < 39.0){" +
"    bodyColor = yellow;" +
"    return vec4(0.0, 0.0, 1.0, 1.0); }" +
"  else if(time < 42.0){" +
"    subCornerFlag = true;" +
"    bodyColor = mix(yellow, green, f);" +
"    return vec4(0.0, 0.0, 1.0 - f, 1.0);" +
"  }else if(time < 45.0){" +
"    bodyColor = green;" +
"    verticeFlag = false; return vec4(0.0, 0.0, 0.0, 1.0); }" +
"  bodyColor = mix(green, turquoise, f);" +
"  return vec4(0.0, 0.0, 0.0, 1.0 - f);" +
"}" +
// グローバルの用意
"void prepareGlobal(){" +
// V1はx=0.0,V2はy=0.0,V3はz=0.0の部分の内側の側面上。すべて第1象限。
// パラメータtは別メソッドで取得する。2秒静止、2秒移動、の繰り返し。
// t=(0.0, 0.0)で星型八面体、(1.0, 0.0)で立方体。(k, k)で正十二面体。
// ただしk = 0.5 * (sqrt(5.0) - 1.0).
"  vec4 t = getParam();" +
//"  t = vec4(0.0, 0.0, 0.0, 0.0);" +
// versionはtのzとwを見て決める。双方0.0:0, 双方1.0:1,他:2.
"  version = 2;" +
"  if(max(t.z, t.w) == 0.0){ version = 0; }" +
"  else if(min(t.z, t.w) == 1.0){ version = 1; }" +
"  V1 = vec3(0.0, t.y + 1.0, t.x);" +
"  V2 = vec3(t.x, 0.0, t.y + 1.0);" +
"  V3 = vec3(t.y + 1.0, t.x, 0.0);" +
"  G = (V1 + V2 + V3) / 3.0;" +
// 今回はe123とV1, V2が作る平面、V2, V3が・・V3, V1が・・って感じ。
"  P12 = normalize(cross(V2 - e3, V1 - e3));" +
"  P23 = normalize(cross(V3 - e1, V2 - e1));" +
"  P31 = normalize(cross(V1 - e2, V3 - e2));" +
"  P123 = normalize(cross(V2 - V1, V3 - V1));" +
// corner0, corner1はパリティに対応する。tの3, 4番目の係数で決める感じ。
"  corner0 = (1.0 - t.z) * G + t.z * e123;" +
"  corner1 = (1.0 - t.w) * G + t.w * e123;" +
"  Q12 = normalize(cross(V1 - corner0, V2 - corner0));" +
"  Q23 = normalize(cross(V2 - corner0, V3 - corner0));" +
"  Q31 = normalize(cross(V3 - corner0, V1 - corner0));" +
"  R12 = normalize(cross(V1 - corner1, V2 - corner1));" +
"  R23 = normalize(cross(V2 - corner1, V3 - corner1));" +
"  R31 = normalize(cross(V3 - corner1, V1 - corner1));" +
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
// 棒。原点からn方向、長さは両方向に無限、rは太さ。
"float bar(vec3 p, vec3 n, float r){" +
"  return length(p - dot(p, n) * n) - r;" +
"}" +
// 半分開いた棒。原点からnと逆方向に、長さ無限大。
// はじっこは丸くなってる。
"float halfBar(vec3 p, vec3 n, float r){" +
"  return length(p - min(0.0, dot(p, n)) * n) - r;" +
"}" +
// map関数。距離の見積もり関数.
// ここでdを更新するときに最後に更新されたオブジェクトのところがどこか
// を調べればオブジェクトごとの色分けができそうね。
// modeを指定してminかmaxか選べるようにしたい。そうすれば、
// 切頂したときに違う色にできる。
// 0のときminで更新、1のときmaxで更新するように変更。
// 2のとき新しい図形でのくりぬき
// これで平面スライスとかできるようになるはず
"void updateDist(inout vec3 color, inout float dist, vec3 c, float d, int modeId){" +
"  if(d < dist && modeId == 0){ color = c; dist = d; }" +
"  if(d > dist && modeId == 1){ color = c; dist = d; }" +
"  if(-d > dist && modeId == 2){ color = c; dist = -d; }" +
"}" +
// mapの返り値をvec4にしてはじめのxyzで色を表現してwで距離を表現する。
"vec4 map(vec3 p){" +
"  vec3 color;" +
"  float parity = sign(p.x) * sign(p.y) * sign(p.z);" +
"  p = abs(p);" +
"  float t = -1.0;" +
"  float face, vertice;" + // 面と頂点の計算用
"  if(version == 0 || version == 2){" +
"    face = max(dot(p - e3, P12), max(dot(p - e1, P23), dot(p - e2, P31)));" +
"    updateDist(color, t, bodyColor, face, 1);" +
"  }" +
"  if(version == 0){" +
"    updateDist(color, t, bodyColor, dot(p - G, P123), 1);" +
"  }" +
"  if(version == 1 || (version == 2 && parity > 0.001)){" +
"    face = max(dot(p - corner0, Q12), max(dot(p - corner0, Q23), dot(p - corner0, Q31)));" +
"    updateDist(color, t, bodyColor, face, 1);" +
"    if(subCornerFlag){" +
"      updateDist(color, t, vec3(0.5), sphere(p - corner0, 0.1), 0);" +
"    }" +
"  }" +
"  if(version == 2 && parity < 0.001){" +
"    face = max(dot(p - corner1, R12), max(dot(p - corner1, R23), dot(p - corner1, R31)));" +
"    updateDist(color, t, bodyColor, face, 1);" +
"    updateDist(color, t, vec3(0.5), sphere(p - corner1, 0.1), 0);" +
"  }" +
// 立方体の時はV1～V3は描画せず、e123のみ描画する。
// 正十二面体のときはV1～V3の他にe123も必要。
// 星型八面体のときもV1～V3の他にe123も必要。
// 正四面体では再びe123のみでOK.
"  if(verticeFlag){" +
"    vertice = min(sphere(p - V1, 0.1), min(sphere(p - V2, 0.1), sphere(p - V3, 0.1)));" +
"    updateDist(color, t, vec3(0.5), vertice, 0);" +
"  }" +
"  if(cornerFlag){" +
"    updateDist(color, t, vec3(0.5), sphere(p - e123, 0.1), 0);" +
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
"void transform(inout vec3 p){" +
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
"  vec3 color = mix(bodyColor, white, 0.5);" +
"  return color * (0.3 + p.y * 0.4);" +
"}" +
// メインコード。
"void main(void){" +
"  vec2 p = (gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);" +
// まずは背景色を取得。
"  vec3 color;" +
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
// 点と面の用意
"  prepareGlobal();" +
// 背景色はbodyColorで設定する。
"  color = getBackground(p);" +
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
  textSize(30);
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
  let u_t = millis() / 1000;
  // t1は要するにmod(u_t, 30.0)でt2はmod(u_t, 6.0)に当たる。
  // t2が3.0付近でほぼalphaが1に近くなるためこのような感じになる。
  // 今回は0.0付近でそうなって欲しいのでちょっといじる。
  let t1 = u_t - floor(u_t / 48.0) * 48.0;
  let t2 = u_t - floor(u_t / 6.0) * 6.0;
  let alpha = 255.0 * pow(t2 - 4.5, 2.0) * 4.0 / 9.0;
  let kindText = "";
  let text_jp = "";
  if(t1 < 4.5 || t1 > 46.5){
    kindText = "octahedron"; text_jp = "正八面体";
  }else if(t1 < 10.5){
    kindText = "icosahedron"; text_jp = "正二十面体";
  }else if(t1 < 16.5){
    kindText = "cuboctahedron"; text_jp = "立方八面体";
  }else if(t1 < 22.5){
    kindText = "medium polyhedron"; text_jp = "中間多面体";
  }else if(t1 < 28.5){
    kindText = "hexahedron"; text_jp = "正六面体";
  }else if(t1 < 34.5){
    kindText = "dodecahedron"; text_jp = "正十二面体";
  }else if(t1 < 40.5){
    kindText = "Stella octangula"; text_jp = "星型八面体";
  }else if(t1 < 46.5){
    kindText = "tetrahedron"; text_jp = "正四面体";
  }
  fill(255, alpha);
  text(kindText, width * 0.5, height * 0.85);
  text(text_jp, width * 0.5, height * 0.935);
}

// 画面外のボタンで切り替えできるといいかも知れない。(MANUAL/AUTO)
function keyTyped(){
  if(keyCode === 32){
    if(isLoop){ isLoop = false; noLoop(); }
    else{ isLoop = true; loop(); }
  }
}
