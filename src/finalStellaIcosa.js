// 完全二十面体のコードだけ抜き出したもの。もっと削るつもり。

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
// 正十二面体の面対ベクトル（6つ）
"const vec3 f12_1 = vec3(-0.60706, 0.79465, 0.0);" +
"const vec3 f12_2 = vec3(-0.98225, -0.18759, 0.0);" +
"const vec3 f12_3 = vec3(0.30353, 0.79465, 0.52573);" +
"const vec3 f12_4 = vec3(0.30353, 0.79465, -0.52573);" +
"const vec3 f12_5 = vec3(0.49112, -0.18759, 0.85065);" +
"const vec3 f12_6 = vec3(0.49112, -0.18759, -0.85065);" +
// 正二十面体の面対ベクトル（10個）
// 内側5個のあと外側5個、一つの面はx軸負方向。
"const vec3 f20_1 = vec3(-0.60706, 0.79465, 0.0);" +
"const vec3 f20_2 = vec3(-0.18759, 0.79465, 0.57735);" +
"const vec3 f20_3 = vec3(0.49112, 0.79465, 0.35682);" +
"const vec3 f20_4 = vec3(0.49112, 0.79465, -0.35682);" +
"const vec3 f20_5 = vec3(-0.18759, 0.79465, -0.57735);" +
"const vec3 f20_6 = vec3(-0.98225, 0.18759, 0.0);" +
"const vec3 f20_7 = vec3(-0.30353, 0.18759, 0.93417);" +
"const vec3 f20_8 = vec3(0.79465, 0.18759, 0.57735);" +
"const vec3 f20_9 = vec3(0.79465, 0.18759, -0.57735);" +
"const vec3 f20_10 = vec3(-0.30353, 0.18759, -0.93417);" +
// 正二十面体の頂点ベクトル。ひとつはx軸側。atan(2)だけ倒して回す。
"const vec3 v20_1 = vec3(0.0, 1.0, 0.0);" +
"const vec3 v20_2 = vec3(0.89443, 0.44721, 0.0);" +
"const vec3 v20_3 = vec3(0.27639, 0.44721, -0.85065);" +
"const vec3 v20_4 = vec3(-0.72361, 0.44721, -0.52573);" +
"const vec3 v20_5 = vec3(-0.72361, 0.44721, 0.52573);" +
"const vec3 v20_6 = vec3(0.27639, 0.44721, 0.85065);" +
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
// 完全二十面体(final stellation of the icosahedron)
"vec4 finalStellaIcosa(vec3 p, float size){" +
"  float d1 = size;" + // 頂点ベクトル、三角錐の底面
"  float d2 = size * 0.41947;" + // 三角錐の側面を作る距離
// 側面を作る距離は正十二面体の方から比を算出している。
// 要は底面側と側面側の原点からの距離の比が分かればいいので。
// どうやって側面を割り出したかは内緒。
"  float v1 = abs(dot(p, v20_1)) - d1;" +
"  float v2 = abs(dot(p, v20_2)) - d1;" +
"  float v3 = abs(dot(p, v20_3)) - d1;" +
"  float v4 = abs(dot(p, v20_4)) - d1;" +
"  float v5 = abs(dot(p, v20_5)) - d1;" +
"  float v6 = abs(dot(p, v20_6)) - d1;" +
"  float f1 = abs(dot(p, f20_1)) - d2;" +
"  float f2 = abs(dot(p, f20_2)) - d2;" +
"  float f3 = abs(dot(p, f20_3)) - d2;" +
"  float f4 = abs(dot(p, f20_4)) - d2;" +
"  float f5 = abs(dot(p, f20_5)) - d2;" +
"  float f6 = abs(dot(p, f20_6)) - d2;" +
"  float f7 = abs(dot(p, f20_7)) - d2;" +
"  float f8 = abs(dot(p, f20_8)) - d2;" +
"  float f9 = abs(dot(p, f20_9)) - d2;" +
"  float f10 = abs(dot(p, f20_10)) - d2;" +
// ユニットごとに違う色にするには、組の境目ごとに更新したら色替えとでもすればいいかも
"  float result = max(-v2, max(f6, max(f7, f10)));" + // 頂点1組
"  result = min(result, max(-v3, max(f7, max(f8, f6))));" +
"  result = min(result, max(-v4, max(f8, max(f9, f7))));" +
"  result = min(result, max(-v5, max(f9, max(f10, f8))));" +
"  result = min(result, max(-v6, max(f10, max(f6, f9))));" +
"  result = min(result, max(-v5, max(f2, max(f5, f10))));" + // 頂点2組
"  result = min(result, max(-v3, max(f10, max(f2, f1))));" +
"  result = min(result, max(-v1, max(f1, max(f10, f7))));" +
"  result = min(result, max(-v6, max(f7, max(f1, f5))));" +
"  result = min(result, max(-v4, max(f5, max(f7, f2))));" +
"  result = min(result, max(-v5, max(f1, max(f8, f3))));" + // 頂点3組
"  result = min(result, max(-v6, max(f3, max(f1, f6))));" +
"  result = min(result, max(-v4, max(f6, max(f3, f2))));" +
"  result = min(result, max(-v1, max(f2, max(f6, f8))));" +
"  result = min(result, max(-v2, max(f8, max(f2, f1))));" +
"  result = min(result, max(-v1, max(f3, max(f7, f9))));" + // 頂点4組
"  result = min(result, max(-v3, max(f9, max(f3, f2))));" +
"  result = min(result, max(-v6, max(f2, max(f9, f4))));" +
"  result = min(result, max(-v2, max(f4, max(f2, f7))));" +
"  result = min(result, max(-v5, max(f7, max(f4, f3))));" +
"  result = min(result, max(-v1, max(f4, max(f8, f10))));" + // 頂点5組
"  result = min(result, max(-v4, max(f10, max(f4, f3))));" +
"  result = min(result, max(-v2, max(f3, max(f10, f5))));" +
"  result = min(result, max(-v3, max(f5, max(f3, f8))));" +
"  result = min(result, max(-v6, max(f8, max(f5, f4))));" +
"  result = min(result, max(-v2, max(f9, max(f1, f5))));" + // 頂点6組
"  result = min(result, max(-v1, max(f5, max(f9, f6))));" +
"  result = min(result, max(-v5, max(f6, max(f5, f4))));" +
"  result = min(result, max(-v3, max(f4, max(f6, f1))));" +
"  result = min(result, max(-v4, max(f1, max(f4, f9))));" +
"  return vec4(0.0, 0.0, 0.0, result);" +
"}" +
// finalStellaIcosa限定
// 先っちょに銀の球付けたいね
"vec4 map(vec3 p){" +
"  vec4 v = finalStellaIcosa(p, 0.5);" +
"  return v; " +
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
// 今回FIXEDは廃止。
"void transform(out vec3 p){" +
// AUTO MODE.
"  float angleX = pi * u_time * 0.3;" +
"  float angleY = pi * u_time * 0.15;" +
"  if(u_mode == 1){" + // MANUAL MODE.
"    angleX = pi * (2.0 * u_mouse.y - 1.0);" +
"    angleY = pi * 4.0 * (2.0 * u_mouse.x - 1.0);" +
"  }" +
"  p = rotateX(p, angleX);" +
"  p = rotateY(p, angleY);" +
"}" +
// 背景色。とりあえずデフォでいいよ。
"vec3 getBackground(vec2 p){" +
// まあこれだと空間がぐるぐるしてる感じがないからなー・・
// 体の色に合わせて変えてみるやつやってみました。
"  vec3 color = mix(vec3(0.7), white, 0.5);" +
"  return color * (0.4 + p.y * 0.3);" +
"}" +
// メインコード。
"void main(void){" +
"  vec2 p = (gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);" +
"  p.y -= 0.1;" +
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
"    float hue = (atan(pos.z, pos.x) + pi) * 0.5 / pi;" +
"    float saturation = 1.0 - atan(length(pos.xz), pos.y) / pi + 0.4;" +
"    float brightness = length(pos);" +
"    vec3 baseColor = getRGB(hue, saturation, brightness);" +
"    baseColor *= diff;" +
// 遠くでフェードアウトするように調整する
"    color = mix(baseColor, color, tanh(t * 0.1));" +
"  }" +
// 以上。
"  gl_FragColor = vec4(color, 1.0);" +
"}";

let myCanvas;
let isLoop = true;
const AUTO = 0; // 自動回転
const MANUAL = 1; // 手動回転

function setup(){
  createCanvas(480, 560);
  myCanvas = createGraphics(480, 560, WEBGL);
  myShader = myCanvas.createShader(vs, fs);
  myCanvas.shader(myShader);
  textSize(24);
  textAlign(CENTER,CENTER);
}

function draw(){
  myShader.setUniform("u_resolution", [myCanvas.width, myCanvas.height]);
  let mx = constrain(mouseX / myCanvas.width, 0.0, 1.0);
  let my = 1.0 - constrain(mouseY / myCanvas.height, 0.0, 1.0);
  // マウスの値は0～1にしよう・・
  myShader.setUniform("u_mouse", [mx, my]);
  myShader.setUniform("u_time", millis() / 1000);
	myShader.setUniform("u_mode", AUTO);
  myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
  image(myCanvas, 0, 0);
	fill(255);
	text("Final stellation of the icosahedron", width * 0.5, height * 0.93);
}

// -------------------------------------------------------------------------------------------------------------------- //
// Interaction.

// 画面外のボタンで切り替えできるといいかも知れない。(MANUAL/AUTO)
function keyTyped(){
  if(keyCode === 32){
    if(isLoop){ isLoop = false; noLoop(); }
    else{ isLoop = true; loop(); }
  }
}
