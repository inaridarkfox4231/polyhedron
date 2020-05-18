// ボタンで切り替えて様々な立体が表示されるようにする。
// 正多面体5種類と切頂多面体5種類はもちろんのこと、
// 星型やトーラスなど追加できるようにしたい。

// u_figureId; // 描画図形の種類
// u_size // サイズ。変えたいときに、

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
"uniform int u_figureId;" + // 立体の種類
"uniform bool u_gray;" + // グレーバージョン
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
// 定数ベクトルで書き換えたい。（理屈は他のプログラムにちゃんと書いてあるので）
"float dodecahedronOuter(vec3 p, float size){" +
"  size *= ioratio12;" + // 内接球半径
"  float result = abs(dot(p, f12_1)) - size;" +
"  result = max(result, abs(dot(p, f12_2)) - size);" +
"  result = max(result, abs(dot(p, f12_3)) - size);" +
"  result = max(result, abs(dot(p, f12_4)) - size);" +
"  result = max(result, abs(dot(p, f12_5)) - size);" +
"  result = max(result, abs(dot(p, f12_6)) - size);" +
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
// 2のとき新しい図形でのくりぬき
// これで平面スライスとかできるようになるはず
"void updateDist(out vec3 color, out float dist, vec3 c, float d, int modeId){" +
"  if(d < dist && modeId == 0){ color = c; dist = d; }" +
"  if(d > dist && modeId == 1){ color = c; dist = d; }" +
"  if(-d > dist && modeId == 2){ color = c; dist = -d; }" +
"}" +
// 正四面体
"vec4 tetra(vec3 p, float size){" +
"  return vec4(red, tetrahedronOuter(p, size));" +
"}" +
// 正六面体
"vec4 hexa(vec3 p, float size){" +
"  return vec4(yellow, hexahedronOuter(p, size));" +
"}" +
// 正八面体
"vec4 octa(vec3 p, float size){" +
"  return vec4(green, octahedronOuter(p, size));" +
"}" +
// 正十二面体
"vec4 dodeca(vec3 p, float size){" +
"  return vec4(purple, dodecahedronOuter(p, size));" +
"}" +
// 正二十面体
"vec4 icosa(vec3 p, float size){" +
"  return vec4(blue + 0.2, icosahedronOuter(p, size));" +
"}" +
// 切頂多面体。sizeは切り取る前の外接球半径。
// 切頂四面体
"vec4 truncTetra(vec3 p, float size){" +
"  float dist = tetrahedronOuter(p, size);" +
"  vec3 color = mix(red, white, 0.3);" +
"  updateDist(color, dist, red, tetrahedronInner(p, size * coratio4), 1);" +
"  return vec4(color, dist);" +
"}" +
// 切頂六面体
"vec4 truncHexa(vec3 p, float size){" +
"  float dist = hexahedronOuter(p, size);" +
"  vec3 color = mix(yellow, white, 0.3);" +
"  updateDist(color, dist, yellow, octahedronInner(p, size * coratio6), 1);" +
"  return vec4(color, dist);" +
"}" +
// 切頂八面体
"vec4 truncOcta(vec3 p, float size){" +
"  float dist = octahedronOuter(p, size);" +
"  vec3 color = mix(green, white, 0.3);" +
"  updateDist(color, dist, green, hexahedronInner(p, size * coratio8), 1);" +
"  return vec4(color, dist);" +
"}" +
// 切頂十二面体
"vec4 truncDodeca(vec3 p, float size){" +
"  float dist = dodecahedronOuter(p, size);" +
"  vec3 color = mix(purple, white, 0.3);" +
"  updateDist(color, dist, purple, icosahedronInner(p, size * coratio12), 1);" +
"  return vec4(color, dist);" +
"}" +
// 切頂二十面体
"vec4 truncIcosa(vec3 p, float size){" +
"  float dist = icosahedronOuter(p, size);" +
"  vec3 color = mix(blue, white, 0.3);" +
"  updateDist(color, dist, blue, dodecahedronInner(p, size * coratio20), 1);" +
"  return vec4(color, dist);" +
"}" +
// 星型八面体
"vec4 stellaOctangula(vec3 p, float size){" +
"  float dist = tetrahedronOuter(p, size);" +
"  vec3 color = aquamarine + (white - aquamarine) * 0.2;" +
"  updateDist(color, dist, aquamarine * 0.8, tetrahedronOuter(-p, size), 0);" +
"  return vec4(color, dist);" +
"}" +
// 小星型十二面体
// 6つの面対のうちひとつは外側のこり5つは内側っていうのを6つ集めてminで合併する。
// 6つのmaxのうち5つのmaxを取るので出てくるのは最大と2番目だけ。
// だからそれを求めることで計算を高速化している。
"vec4 smallStellaDodeca(vec3 p, float size){" +
"  size *= ioratio12;" + // 内接球半径
// まずここは定数なので定数でやればいいわけで・・ねぇ。
// 正十二面体と同じ定数だからもういっそ定数ベクトル6つでいいと思う。
"  float t[6];" +
"  t[0] = abs(dot(p, f12_1)) - size;" +
"  t[1] = abs(dot(p, f12_2)) - size;" +
"  t[2] = abs(dot(p, f12_3)) - size;" +
"  t[3] = abs(dot(p, f12_4)) - size;" +
"  t[4] = abs(dot(p, f12_5)) - size;" +
"  t[5] = abs(dot(p, f12_6)) - size;" +
"  float t1st = t[0];" +
"  int maxIndex = 0;" +
"  float t2nd = -1e10;" +
"  for(int i = 1; i < 6; i++){" +
"    if(t1st < t[i]){" +
"      t2nd = t1st;" +
"      t1st = t[i];" +
"      maxIndex = i;" +
"    }else if(t2nd < t[i]){" +
"      t2nd = t[i];" +
"    }" +
"  }" +
"  float result = max(-t1st, t2nd);" +
"  for(int i = 0; i < 6; i++){" +
"    if(i == maxIndex){ continue; }" +
"    result = min(result, max(t1st, -t[i]));" +
"  }" +
"  return vec4(skyblue, result);" +
"}" +
// mapの返り値をvec4にしてはじめのxyzで色を表現してwで距離を表現する。
// 0:正四面体, 1:立方体, 2:正八面体, 3:正十二面体, 4:正二十面体.
"vec4 map(vec3 p){" +
"  vec4 v;" +
"  if(u_figureId == 0){ v = tetra(p, 1.0); }" +
"  else if(u_figureId == 1){ v = hexa(p, 1.0); }" +
"  else if(u_figureId == 2){ v = octa(p, 1.0); }" +
"  else if(u_figureId == 3){ v = dodeca(p, 1.0); }" +
"  else if(u_figureId == 4){ v = icosa(p, 1.0); }" +
"  else if(u_figureId == 5){ v = truncTetra(p, 1.0); }" +
"  else if(u_figureId == 6){ v = truncHexa(p, 1.0); }" +
"  else if(u_figureId == 7){ v = truncOcta(p, 1.0); }" +
"  else if(u_figureId == 8){ v = truncDodeca(p, 1.0); }" +
"  else if(u_figureId == 9){ v = truncIcosa(p, 1.0); }" +
"  else if(u_figureId == 10){ v = stellaOctangula(p, 1.0); }" +
"  else if(u_figureId == 11){ v = smallStellaDodeca(p, 1.0); }" +
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
"void transform(out vec3 p){" +
"  if(u_mode == 2){" +
"    p = rotateX(p, -pi * 0.25);" +
"    p = rotateY(p, pi * 0.25);" +
"    return;" +
"  }" + // 停止
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
"  vec3 bgColor;" +
"  if(u_figureId == 0){ bgColor = red; }" +
"  else if(u_figureId == 1){ bgColor = yellow; }" +
"  else if(u_figureId == 2){ bgColor = green; }" +
"  else if(u_figureId == 3){ bgColor = purple; }" +
"  else if(u_figureId == 4){ bgColor = blue; }" +
"  else if(u_figureId == 5){ bgColor = red; }" +
"  else if(u_figureId == 6){ bgColor = yellow; }" +
"  else if(u_figureId == 7){ bgColor = green; }" +
"  else if(u_figureId == 8){ bgColor = purple; }" +
"  else if(u_figureId == 9){ bgColor = blue; }" +
"  else if(u_figureId == 10){ bgColor = aquamarine; }" +
"  else if(u_figureId == 11){ bgColor = skyblue; }" +
"  vec3 color = mix(bgColor, white, 0.5);" +
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
// グレーにする（アイコン用）
"  if(u_gray){ color = vec3(color.x + color.y + color.z) / 3.0; }" +
"  gl_FragColor = vec4(color, 1.0);" +
"}";

let myCanvas;
let isLoop = true;
const AUTO = 0; // 自動回転
const MANUAL = 1; // 手動回転
const FIXED = 2; // 特定の場所から見る感じ
// もしくはvec3とかにして具体的に指定して固定するのもありかもね

const figureName = ["tetrahedron", "hexahedron", "octahedron", "dodecahedron", "icosahedron", "truncated tetrahedron", "truncated hexahedron",
                    "truncated octahedron", "truncated dodecahedron", "truncated icosahedron", "Stella Octangula", "small stellated dodecahedron"];

let myConfig;

function setup(){
  createCanvas(800, 480);
  myCanvas = createGraphics(480, 480, WEBGL);
  myShader = myCanvas.createShader(vs, fs);
  myCanvas.shader(myShader);
  textSize(40);
  textAlign(CENTER,CENTER);
	myConfig = new Config();
}

function draw(){
  myShader.setUniform("u_resolution", [myCanvas.width, myCanvas.height]);
  let mx = constrain(mouseX / myCanvas.width, 0.0, 1.0);
  let my = 1.0 - constrain(mouseY / myCanvas.height, 0.0, 1.0);
  // マウスの値は0～1にしよう・・
  myShader.setUniform("u_mouse", [mx, my]);
  myShader.setUniform("u_time", millis() / 1000);
	myConfig.update();
  myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
  image(myCanvas, 0, 0);
	myConfig.draw();
}

// -------------------------------------------------------------------------------------------------------------------- //
// Config.

class Config{
	constructor(){
		this.board = createGraphics(320, 480);
		this.board.colorMode(HSB, 100);
		this.board.noStroke();
		this.mode = AUTO;
		this.figureId = 0;
		this.offSetX = 480;
		this.offSetY = 0;
		this.createButtons();
	}
  setProperty(propName, value){
    this[propName] = value;
  }
	getButtonImage(){
		// ボタンの画像を作る。辞書を返す。{active:[], nonActive:[]}でいずれも配列。
    let imgs = {};
    imgs.active = [];
    imgs.nonActive = [];
    const w = 50;
    const h = 50;
    myShader.setUniform("u_resolution", [myCanvas.width, myCanvas.height]);
    myShader.setUniform("u_mode", FIXED);
    for(let i = 0; i < 12; i++){
      myShader.setUniform("u_figureId", i);
      myShader.setUniform("u_gray", false);
      myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
      let grActive = createGraphics(w, h);
      grActive.image(myCanvas, 0, 0, w, h, 0, 0, myCanvas.width, myCanvas.height);
      imgs.active.push(grActive);
      myShader.setUniform("u_gray", true);
      myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
      let grNonActive = createGraphics(w, h);
      grNonActive.image(myCanvas, 0, 0, w, h, 0, 0, myCanvas.width, myCanvas.height);
      imgs.nonActive.push(grNonActive);
    }
    return imgs;
	}
	createButtons(){
		// ボタンを作る
		// グレーモードを使って2つのグラフィックを用意してそれらを使ってノーマルボタンを作る。
    this.figureButtonSet = new UniqueButtonSet();
    let imgs = this.getButtonImage();
    for(let i = 0; i < 5; i++){
      this.figureButtonSet.addNormalButton(11 + 62 * i, 60, 50, 50, imgs.active[i], imgs.nonActive[i]);
    }
    for(let i = 0; i < 5; i++){
      this.figureButtonSet.addNormalButton(11 + 62 * i, 122, 50, 50, imgs.active[i + 5], imgs.nonActive[i + 5]);
    }
    this.figureButtonSet.addNormalButton(11, 184, 50, 50, imgs.active[10], imgs.nonActive[10]);
    this.figureButtonSet.addNormalButton(73, 184, 50, 50, imgs.active[11], imgs.nonActive[11]);
    this.figureButtonSet.initialize(this.offSetX, this.offSetY);
	}
	drawFigureName(){
		fill(255);
		textSize(30);
		textAlign(CENTER, CENTER);
		text(figureName[this.figureId], myCanvas.width * 0.5, myCanvas.height * 0.85);
	}
	drawConfig(){
		// myCanvas上の説明テキストもここで書く
		let gr = this.board;
		gr.fill(55, 30, 100);
		gr.rect(0, 0, 320, 480);
    this.figureButtonSet.draw(gr);
    this.drawFigureName();
	}
	setParameter(){
		myShader.setUniform("u_mode", this.mode);
		myShader.setUniform("u_figureId", this.figureId);
	}
	update(){
    this.setProperty("figureId", this.figureButtonSet.getActiveButtonId());
		this.setParameter();
		myShader.setUniform("u_gray", false);
	}
  activate(){
    this.figureButtonSet.activate();
  }
	draw(){
		this.drawConfig();
		image(this.board, this.offSetX, this.offSetY);
	}
}

// -------------------------------------------------------------------------------------------------------------------- //
// ButtonGraphic.

// colorIdやめてbuttonColorを渡すように仕様変更
function createColorButtonGraphic(w, h, buttonColor, paleRatio = 0.0, innerText = ""){
  let gr = createGraphics(w, h);
	gr.rectMode(CENTER);
	gr.noStroke();
	const edgeLength = min(w, h) * 0.1;
	// paleRatioで未選択の場合に色が薄くなるようにする。
  const baseColor = lerpColor(buttonColor, color(255), paleRatio);
  // 薄い部分
	gr.fill(lerpColor(baseColor, color(255), 0.3));
	gr.rect(w / 2, h / 2, w, h);
  // 濃い部分
	gr.fill(lerpColor(baseColor, color(0), 0.3));
	gr.rect(w / 2 + edgeLength * 0.5, h / 2 + edgeLength * 0.5, w - edgeLength, h - edgeLength);
  // 本体。必要なら文字を記述する。
	gr.fill(baseColor);
	gr.rect(w / 2, h / 2, w - edgeLength * 2, h - edgeLength * 2);

	if(innerText === ""){ return gr; }
	gr.fill(0);
	gr.textSize(h / 2);
	gr.textAlign(CENTER, CENTER);
	gr.text(innerText, w / 2, h / 2);
	return gr;
}

// -------------------------------------------------------------------------------------------------------------------- //
// Button.

class Button{
	constructor(left, top, w, h){
		this.left = left;
		this.top = top;
		this.w = w;
		this.h = h;
		this.active = false;
	}
	setOffSet(offSetX, offSetY){
    // ボードの位置を記録することにより、マウス位置の問題が生じないようにする。
    // 基本的に、ボードの左上座標を使う。
		this.offSetX = offSetX;
		this.offSetY = offSetY;
	}
	activate(){
		this.active = true;
	}
	inActivate(){
		this.active = false;
	}
	hit(){
		// クリック位置がボタンに触れてるかどうかをこれで判定する。
		const x = mouseX - this.offSetX;
		const y = mouseY - this.offSetY;
		return this.left < x && x < this.left + this.w && this.top < y && y < this.top + this.h;
	}
	draw(gr){
		// activeなときとactiveでないときで描画の仕方を変えるんだけどその指定の仕方で別クラスにする。
	}
}

// Buttonを2種類作る。
// 今まで通りのパレットのやつはColorButtonで背景選択用のやつはNormalButtonでこれはactiveなときとそうでない時の
// それぞれの画像を用意して持たせる。だからそこだけ変える。
// 廃止しません。ごめんね！
// あ、そうか、ColorButtonの定義を変えちゃえばいいんだ。constructorで作っちゃえばいい。その際paleRatioも指定しちゃおう。
// colorIdやめてbuttonColorを渡すように仕様変更
class ColorButton extends Button{
	constructor(left, top, w, h, buttonColor, innerText = ""){
		super(left, top, w, h);
		this.activeGraphic = createColorButtonGraphic(w, h, buttonColor, 0.0, innerText);
		this.inActiveGraphic = createColorButtonGraphic(w, h, buttonColor, 0.7, innerText);
	}
	draw(gr){
		// 画像は大きさを変えずにそのまま使う（文字のサイズとか変わっちゃうのでサムネ方式では駄目）
		if(this.active){
			gr.image(this.activeGraphic, this.left, this.top);
		}else{
			gr.image(this.inActiveGraphic, this.left, this.top);
		}
	}
}

// 2つの画像を用意してactiveに応じて切り替える。
// ボール選択とモード選択は薄い色にしたい感じ。ここには書かないけど。
// 背景選択の方ではサムネイルのようにして使う。
class NormalButton extends Button{
	constructor(left, top, w, h, activeGraphic, inActiveGraphic){
		super(left, top, w, h);
		this.activeGraphic = activeGraphic;
		this.inActiveGraphic = inActiveGraphic;
	}
	draw(gr){
		// 信じられない、AREA_WIDTHとかになってた。再利用できないじゃん。
		if(this.active){
			gr.image(this.activeGraphic, this.left, this.top, this.w, this.h,
				       0, 0, this.activeGraphic.width, this.inActiveGraphic.height);
		}else{
			gr.image(this.inActiveGraphic, this.left, this.top, this.w, this.h,
				       0, 0, this.activeGraphic.width, this.inActiveGraphic.height);
		}
	}
}

// ボタンを集めただけ。配列。
class ButtonSet{
	constructor(){
		this.buttons = [];
		this.size = 0; // ボタンの個数
		//this.activeButtonId = 0;
	}
	initialize(offSetX, offSetY){
	  /* 初期化 */
		for(let btn of this.buttons){
			btn.setOffSet(offSetX, offSetY);
		}
	}
	addColorButton(left, top, w, h, buttonColor, innerText = ""){
		// ColorButtonを追加する
		this.buttons.push(new ColorButton(left, top, w, h, buttonColor, innerText));
		this.size++;
	}
	addNormalButton(left, top, w, h, activeGraphic, inActiveGraphic){
		// NormalButtonを追加する
		this.buttons.push(new NormalButton(left, top, w, h, activeGraphic, inActiveGraphic));
		this.size++;
	}
	getTargetButtonId(){
		// クリック位置がボタンにヒットするならそれのidを返すがなければ-1を返す。
    for(let i = 0; i < this.size; i++){
			if(this.buttons[i].hit()){ return i; }
		}
		return -1;
	}
	activate(){ /* ボタンのactivate関連処理 */ }
	draw(gr){
		// ボタンが多い場合に・・表示工夫したり必要なんかな。
		for(let btn of this.buttons){ btn.draw(gr); }
	}
}

// 一度にひとつのボタンしかアクティブにならないボタンセット
// なので、具体的な値を取得できるように改良する。
class UniqueButtonSet extends ButtonSet{
	constructor(initialActiveButtonId = 0){
		super();
		this.activeButtonId = initialActiveButtonId;  // 最初にアクティブになっているボタンのid（デフォは0）
    this.buttonValueDict = [];
	}
	initialize(offSetX, offSetY){
		super.initialize(offSetX, offSetY);
		this.buttons[this.activeButtonId].activate();
	}
  setValue(valueArray){
    // 値を設定する感じ
    this.buttonValueDict = valueArray;
  }
	getActiveButtonId(){
		// activeなボタンのidは一意なのでそれを返す。
		return this.activeButtonId;
	}
  getValue(){
    // 具体的な値が欲しい場合はこっち
    return this.buttonValueDict[this.activeButtonId];
  }
	activate(){
    // クリック位置がボタンにヒットする場合に、それをactivateして、それ以外をinActivateする感じ。
		const targetButtonId = this.getTargetButtonId();
		if(targetButtonId < 0){ return; }
    this.buttons[this.activeButtonId].inActivate();
		this.activeButtonId = targetButtonId;
		this.buttons[this.activeButtonId].activate();
	}
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

function mousePressed(){
  myConfig.activate();
}
