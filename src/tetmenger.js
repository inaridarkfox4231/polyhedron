// デバッグ用

// まあ、簡単でしたね・・
// とりあえずボタンで切り替えられるようにする。AUTOとMANUALで。
// FIXEDはどこに固定するか決めておきましょう。そこになる感じで。
// スライダーで切断量を調節できるようにしたい。
// スライダー名はcutとかにして。
// イテレーション、四面体は1～5でスポンジは1～4でいじれるように。
// 四面体・・背景orangeでボディred.
// スポンジ・・背景blueでボディblueで断面skyblue.
// この辺はu_kindが0か1かで場合分けしちゃえばいいので深く考えないで。
// スポンジの方だけスライダー用意してベクトル(1,1,1)の正規化で
// 断面が見れるようにして（スポンジだけでいい）。

// 新しく作るユニフォーム変数は？
// u_kind・・0か1で、テトラを描くかスポンジを描くか。
// それぞれのイテレーションレベル。途中でbreakすれば調整可能。
// u_iter_tetra, u_iter_sponge.
// スポンジ限定で、カットレベル。

// サイズも変えられた方がいいんかな・・うーん。
// FIXEDになったときにサイズ最大にしてcutLevelも0.0にするようにしよう。
// サイズは最大から最小まで動かせるようにする。

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
"uniform int u_mode;" + // 0でauto, 1でmanual, 2でfixed.
"uniform int u_kind;" + // 0で四面体、1でスポンジ
"uniform int u_iter_tetra;" + // 四面体のイテレベル：1～5.
"uniform int u_iter_sponge;" + // スポンジのイテレベル：1～4.
"uniform float u_cutLevel;" + // スポンジをカットする際のレベル、デフォルトで0.0とする。
"uniform float u_sizeFactor;" + // サイズ調整(1.0～0.0)
"uniform bool u_gray;" + // ボタンの画像作成用のグレースケールフィルタを使うかどうか
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
// シェルピンスキーの四面体。
// 仕組み・・sizeは重心と底面との距離。外接球半径はsizeの3倍。
"float tetrahedronIFS(vec3 p, float size){" +
// 面の重心に向かう単位ベクトル
"  vec3 u = vec3(sqrt(6.0) / 3.0, 1.0 / 3.0, sqrt(2.0) / 3.0);" +
"  vec3 e0 = vec3(0.0, -1.0, 0.0);" +
"  vec3 e1 = vec3(0.0, u.y, -2.0 * u.z);" +
"  vec3 e2 = vec3(-u.x, u.y, u.z);" +
"  vec3 e3 = vec3(u.x, u.y, u.z);" +
// 各頂点
"  vec3 c0 = -3.0 * size * e0;" +
"  vec3 c1 = -3.0 * size * e1;" +
"  vec3 c2 = -3.0 * size * e2;" +
"  vec3 c3 = -3.0 * size * e3;" +
// -e0, -e1, -e2, -e3のsize倍で切り取ると4つの正四面体になる。
"  float t, d, dist;" +
"  vec3 c;" +
"  for(int i = 0; i < 6; i++){" +
"    if(i == u_iter_tetra){ break; }" +
// 正四面体との距離
"    t = max(max(dot(p, e0) - size, dot(p, e1) - size), max(dot(p, e2) - size, dot(p, e3) - size));" +
// 正四面体を4分割して、それらとの距離の最小を取る。
"    dist = max(t, dot(p, e0) + size);" +
"    c = c0;" +
"    d = max(t, dot(p, e1) + size);" +
"    if(d < dist){ c = c1; dist = d; }" +
"    d = max(t, dot(p, e2) + size);" +
"    if(d < dist){ c = c2; dist = d; }" +
"    d = max(t, dot(p, e3) + size);" +
"    if(d < dist){ c = c3; dist = d; }" +
// 取れたら最小の正四面体に対して同じことを繰り返す
"    p = c + 2.0 * (p - c);" +
"  }" +
// スケールの分だけdistを2で割って出力とする
"  return dist * pow(2.0, -float(u_iter_tetra - 1));" +
"}" +
// メンガーのスポンジ
// やり方は基本的にカーペットと一緒。カーペットでやったことを
// 3次元に落とすだけでいい。簡単ですね。
"float spongeIFS(vec3 p, float size){" +
"  vec3 e0 = vec3(1.0, 0.0, 0.0);" +
"  vec3 e1 = vec3(0.0, 1.0, 0.0);" +
"  vec3 e2 = vec3(0.0, 0.0, 1.0);" +
// 対称の中心は今回2つだけ。対称性で絞り込む。
"  vec3 c0 = vec3(0.0, size, size);" +
"  vec3 c1 = vec3(size, size, size);" +
"  float t0, t1, t2, dist;" +
// イテレーション
"  for(int i = 0; i < 5; i++){" +
"    if(i == u_iter_sponge){ break; }" +
"    t0 = max(size / 3.0 - max(abs(p.x), abs(p.y)), max(abs(p.x), abs(p.y)) - size);" +
"    t1 = max(size / 3.0 - max(abs(p.y), abs(p.z)), max(abs(p.y), abs(p.z)) - size);" +
"    t2 = max(size / 3.0 - max(abs(p.z), abs(p.x)), max(abs(p.z), abs(p.x)) - size);" +
// 最初の距離を取得する
"    dist = max(max(t0, t1), t2);" +
"    p = abs(p);" + // 4つに絞る
// まずx=zに関して対称なのでそこで折り返す。(s,s,0)が消える。
"    if(p.x > p.z){ p.xz = p.zx; }" +
// 次にy=xで折り返すことで(s,0,s)も消える。
"    if(p.x > p.y){ p.xy = p.yx; }" +
// p.xとsize / 3.0を比較して、p.xが小さければ(0,s,s)で、逆なら
// (s,s,s)で拡大して繰り返す感じ。
"    if(p.x * 3.0 < size){" +
"      p = c0 + (p - c0) * 3.0;" +
"    }else{" +
"      p = c1 + (p - c1) * 3.0;" +
"    }" +
"  }" +
// イテレーション回数-1だけ3で割ると距離になる。
"  return dist * pow(3.0, -float(u_iter_sponge - 1));" +
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
// シェルピンスキーの四面体の処理
"vec4 tetraMap(vec3 p){" +
"  vec3 color = mix(red, white, 0.2);" +
"  float size = 0.4 + u_sizeFactor * 0.4;" +
"  float t = tetrahedronIFS(p + vec3(0.0, size * 0.75, 0.0), size);" + // 0.4～0.8のサイズとその0.75倍だけの位置ずらしって感じ。
"  return vec4(color, t);" +
"}" +
// メンガーのスポンジの処理
"vec4 spongeMap(vec3 p){" +
"  vec3 color = mix(blue, white, 0.2);" +
"  float t = spongeIFS(p, 0.6 + u_sizeFactor);" + // 0.6～1.6で
"  float cut = dot(p, vec3(0.57735)) - u_cutLevel;" +
"  if(cut > t){ t = cut; color = skyblue; }" +
"  return vec4(color, t);" +
"}" +
// mapの返り値をvec4にしてはじめのxyzで色を表現してwで距離を表現する。
"vec4 map(vec3 p){" +
"  if(u_kind == 0){ return tetraMap(p); }" +
"  return spongeMap(p);" +
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
"  if(u_mode == 2){ " +
// FIXEDは(1,1,1)で切り取った断面が見やすいようにします。
"    p = rotateX(p, -pi * 0.25);" +
"    p = rotateY(p, pi * 0.35);" +
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
"  vec3 color;" +
"  if(u_kind == 0){ color = mix(orange, white, 0.5); }else{ color = mix(blue, white, 0.5); }" +
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
"  if(u_gray){ color = vec3(color.x + color.y + color.z) / 3.0; }" + // グレースケールフィルタ（画像作成用）
"  gl_FragColor = vec4(color, 1.0);" +
"}";

let myCanvas;
let isLoop = true;
const AUTO = 0;
const MANUAL = 1;
const FIXED = 2;
// もしくはvec3とかにして具体的に指定して固定するのもありかもね
const TETRAHEDRON = 0;
const MENGERSPONGE = 1;

let myConfig;

function setup(){
  createCanvas(640, 640);
  myCanvas = createGraphics(640, 480, WEBGL);
  myShader = myCanvas.createShader(vs, fs);
  myCanvas.shader(myShader);
  textSize(40);
  textAlign(CENTER,CENTER);
  //mode = FIXED;

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
// コンフィグ関連のユニフォームのセットとかそういうのまとめといたほうがいいと思って。
// FIXEDではcutLevelを0.0にしてsizeFactorを1.0にする感じで。

class Config{
	constructor(){
		this.board = createGraphics(myCanvas.width, 160);
		this.mode = FIXED; // AUTO/MANUAL/FIXED
		this.kind = TETRAHEDRON; // tetrahedron/mengersponge
		this.iter_tetra = 3; // イテレーション
		this.iter_sponge = 3;
		this.cutLevel = 3.0; // 切断面
		this.sizeFactor = 0.6; // 最大・・最小で0.0で、セットするときに計算する感じ。
		this.createButtons();
	}
	getModeButtonImages(){
		// モードボタンの画像を取得する感じ。
		let imgs = {};
		imgs.tetraActive = createGraphics(60, 45);
		imgs.tetraNonActive = createGraphics(60, 45);
		imgs.spongeActive = createGraphics(60, 45);
		imgs.spongeNonActive = createGraphics(60, 45);
	  myShader.setUniform("u_resolution", [myCanvas.width, myCanvas.height]);
		this.setParameter();
		myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
		imgs.tetraActive.image(myCanvas, 0, 0, 60, 45, 0, 0, myCanvas.width, myCanvas.height);
		myShader.setUniform("u_gray", true);
		myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
		imgs.tetraNonActive.image(myCanvas, 0, 0, 60, 45, 0, 0, myCanvas.width, myCanvas.height);
		myShader.setUniform("u_gray", false);
		myShader.setUniform("u_kind", MENGERSPONGE);
		myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
		imgs.spongeActive.image(myCanvas, 0, 0, 60, 45, 0, 0, myCanvas.width, myCanvas.height);
		myShader.setUniform("u_gray", true);
		myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
		imgs.spongeNonActive.image(myCanvas, 0, 0, 60, 45, 0, 0, myCanvas.width, myCanvas.height);
		return imgs;
	}
	createButtons(){
		// モードボタン
		this.modeButtonSet = new UniqueButtonSet();
		// モードボタンの画像を取得する
		const buttonImages = this.getModeButtonImages();
		this.modeButtonSet.addNormalButton(10, 24, 60, 45, buttonImages.tetraActive, buttonImages.tetraNonActive);
		this.modeButtonSet.addNormalButton(10, 91, 60, 45, buttonImages.spongeActive, buttonImages.spongeNonActive);
		this.modeButtonSet.initialize(0, myCanvas.height);
		this.modeButtonSet.setValue([TETRAHEDRON, MENGERSPONGE]);
	}
	setProperty(propName, value){
		this[propName] = value;
	}
	setParameter(){
    myShader.setUniform("u_mode", this.mode);
	  myShader.setUniform("u_kind", this.kind);
	  myShader.setUniform("u_iter_tetra", this.iter_tetra);
	  myShader.setUniform("u_iter_sponge", this.iter_sponge);
	  myShader.setUniform("u_cutLevel", this.cutLevel);
	  myShader.setUniform("u_sizeFactor", this.sizeFactor);
	}
	update(){
		this.kind = this.modeButtonSet.getValue();
	  this.setParameter();
		myShader.setUniform("u_gray", false);
	}
	drawConfig(){
		this.board.background(160);
		this.modeButtonSet.draw(this.board);
	}
	draw(){
		this.drawConfig();
		image(this.board, 0, myCanvas.height);
    fill(255);
	  const kindText = (this.kind === TETRAHEDRON ? "Sierpinski tetrahedron" : "Menger sponge");
    text(kindText, myCanvas.width * 0.5, myCanvas.height * 0.9);
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

// ボタン関連（スライダーものちのち）
function mousePressed(){
	myConfig.modeButtonSet.activate();
}

// 画面外のボタンで切り替えできるといいかも知れない。(MANUAL/AUTO)
function keyTyped(){
  if(keyCode === 32){
    if(isLoop){ isLoop = false; noLoop(); }
    else{ isLoop = true; loop(); }
  }
}
