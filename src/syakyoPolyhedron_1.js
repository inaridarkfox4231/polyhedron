// なんかすごい、foldで多面体描けるんだって。調べてみたいなーー

// 写経しましょう。
// https://www.shadertoy.com/view/XlX3zB

// あっちの面判定とは全く異なる機構で作られているようで興味深い・・。

// 気になるコードなので部分的に移植。

// まあでもこれただのモーフィングで、
// どこのタイミングで正多面体とかになるっていうのは特になくて全部通過点になっちゃってるからな・・
// あとどうでもいいけどこの色合いあんま好きじゃない（どうでもいいわい）

// 問題点を整理したい。まず、foldにより一体いくつの領域に分かれているのか？
// なにこれ・・・・
// Consolasにしたら戻った。Consolasばんざい。怖いなぁ・・

#define PI	3.14159265359
#define PI2	( PI * 2.0 )

// 多分表示するかどうかってことだと思うんだよね
// falseにすると表示されない
// これuniformに相当するんだろうなぁ。外部入力的な。
#define DISPLAY_FACES true
#define DISPLAY_SEGMENTS true
#define DISPLAY_VERTICES true

int Type=3; // Typeが謎。

float U=0.,V=0.,W=1.; // U, V, Wって何だろう。初期値は0, 0, 1.


float SRadius=0.03, VRadius=0.07;

vec3 nc,p,pab,pbc,pca;

// pのグローバル汚染が半端ない・・
// なんじゃこりゃ・・・
// グローバルのpはvec3・・ああそうか、in vec2 pってあるから競合しない仕組みなのか。でもやり方が汚いなぁ。

// ここでfoldingに使うplaneとvertexを用意している。

// folding planesというのはncのことね。
void init() {//setup folding planes and vertex
	float t=iTime;
    // あ、Typeここでいじってるんだ・・上のやつは完全にダミーね。どうりでいじっても何も起きないわけだわ。
    // tが40に達したところでループして元に戻る。そこまでは40/3秒ごとに違うパターン、3, 4, 5, 3, 4, 5になる感じ。
    // そして3が正四面体、4が立方体、5が正十二面体に対応している。だからType.
    // それは分かったけどTypeをグローバルにする意味が、無いな・・・・。

		// ややこしいけど、簡単。周期40秒の間に3, 4, 5が等間隔で現れるだけ。
    Type=int(fract(0.025*t)*3.)+3;

    // ではなぜ、3, 4, 5でそれらの立体になるのか？
    // そしてなぜ、U, V, Wをいじるとそれらが・・これいじりかためちゃくちゃだな。。

    // U, V, Wをいじるこのパートをばっさり切り落としたら、
    // 正四面体、立方体、正十二面体が順繰りに現れるプログラムになった。不思議。
    U=0.5*sin(t*1.5)+0.5;
    V=0.5*sin(t*0.8)+0.5;
    W=0.5*sin(t*0.3)+0.5;

    // わかったこと・・ここの操作はめちゃ雑（

		// U, V, Wはよくわかんないけど0.0～1.0であることは分かる。そこだけは分かる。だから、
		// U, V, Wは0.0～1.0で、その範囲内でpがどこにあるか考えようね。
		// ていうか正規化されてる？？pは半径1の球面上。んー。

    float cospin=cos(PI/float(Type)), scospin=sqrt(0.75-cospin*cospin);

  // na = vec3(1., 0., 0.);
  // nb = vec3(0., 1., 0.);
	nc=vec3(-0.5,-cospin,scospin);//3rd folding plane. The two others are xz and yz planes

	// pab = cross(na, nb), pbc = cross(nb, nc), pca = cross(nc, na).
	pab=vec3(0.,0.,1.);
	pbc=vec3(scospin,0.,0.5);//No normalization in order to have 'barycentric' coordinates work evenly
  // pca, ncに直交してるから平面上。わかったのはそこだけ。
	pca=vec3(0.,scospin,cospin);

  // barycentricは重心座標系とかなんかそんな意味だそうです。
  // U, V, Wは重心座標系での座標ですって下に書いてある。

	p=normalize((U*pab+V*pbc+W*pca));
  //U,V and W are the 'barycentric' coordinates (coted barycentric word because I'm not sure if they are really barycentric... have to check)
	pbc=normalize(pbc);	pca=normalize(pca);
  //for slightly better DE. In reality it's not necesary to apply normalization :)
  // 本来初期化は必要ないってどういうこと？？

	// 形状ごとの基本領域の境界点になるようにpab, pbc, pcaを取れば立体の形がイメージしやすくなるはずなのよね。
	// そこまで行きたいわね。
	// あと頂点や辺についてはまあいいかな・・勝手にやりますよって感じ。
}

// foldという謎の計算。ncがやはりカギを握っている。
// pos = pos - 2 * dot(pos, nc) * nc ならncを法線とする面によるposの鏡映なんだけどね。
// 0.0とminを取っているので、0以上なら何も起こらない。
// ここが重要。つまりncの側にposがあるときは何も起こらないのだ。
// ncと反対側にあるときだけposはncの平面で鏡映される。ncの側にあるときは、不変。

// pos -= 2.0 * min(0.0, dot(pos, n)) * n;
// これが法線ベクトルnによる、そうね、やってることはまさに、fold.
// でも言葉に落としちゃうと正確さが失われるので。

// 1行目はz軸に関する対称移動で、これによりxもyも0以上の領域に落としている。xz平面とyz平面で順繰りに折り返すといってもいい。
// これらの操作も、たとえばxzなら、yが0以上の側にあるときは何もしない。
// まとめると、xz平面、yz平面、nc平面による折り返しをこの順に各5回、15回行っているようです。

// ncってなんぞや。
// 問題点1: ncとは何か。問題点2:なぜfoldでいろいろ楽になるのか。
vec3 fold(vec3 pos) {
	for(int i=0;i<5 /*Type*/;i++){
		pos.xy=abs(pos.xy);//fold about xz and yz planes
		pos-=2.*min(0.,dot(pos,nc))*nc;//fold about nc plane
	}
	return pos;
}

// 3つの面との距離ってあるけど。
// pab, pbc, pcaはどうやら何かしらの平面と関係しているらしい。

// こっちから切り込んでいきたい。
float D2Planes(vec3 pos) {//distance to the 3 faces
	pos-=p; // posの代わりにpからposに向かうベクトルにしている。
  // ここで求めているのは、pを通り、pab, pbc, pcaを法線ベクトルとする平面との距離の最大値。
  // 法線ベクトル側にあるときだけ0以上になる・・たとえば正四面体のひとつの頂点みたいな。

  // ncでfoldしたあとならこのメソッドで面との距離が出るということみたいですね。
  float d0=dot(pos,pab);
	float d1=dot(pos,pbc);
	float d2=dot(pos,pca);
	return max(max(d0,d1),d2);
}

float length2(vec3 p){ return dot(p,p);}

// よく分からないけど三角形のような何かの周囲の辺の情報？
// それだと四角形とか五角形の説明がつかないよ。
float D2Segments(vec3 pos) {
	pos-=p;
  // dla, dlb, dlcが分かんないしこのnc, これがカギを握っているようですね。
	// やっぱりそうだ、ncはna, nb, ncのncだ。naが(1, 0, 0)でnbが(0, 1, 0)だ。それは何となくわかった。
	// 問題はna, nb, ncが何なのかっていうね・・

	// 半直線だ。いや、この場合半円柱、だ。だから0.0とmin取ってるんだ、なるほどね・・
	// たとえば一つ目なら(1, 0, 0)と反対側に伸びてて、だから
	float dla=length2(pos-min(0.,pos.x)*vec3(1.,0.,0.));
	float dlb=length2(pos-min(0.,pos.y)*vec3(0.,1.,0.));
	float dlc=length2(pos-min(0.,dot(pos,nc))*nc);
	// min取ってるので合併。辺の合併。
	return sqrt(min(min(dla,dlb),dlc))-SRadius; // このSRadiusも多分辺となる棒の太さね。
}

// VRadiusは頂点にある球の半径ですね。おそらくこのときpは頂点の座標になっている・・？
// pって何だ。
float D2Vertices(vec3 pos) {
	// 単純にpのところに頂点があるらしい。
	return length(pos-p)-VRadius;
}

// 上のを

// polyhedronのメインコード。面は？辺は？頂点は？
// これがmapと同じと考えて構わないみたい。どれかに到達するまで進み続けるのだろう。
// どれか。つまり、面か、辺か、頂点に到達したら終わり、ということだろ。
float Polyhedron(vec3 pos) {
  // その計算を容易にする謎の計算がfoldだそうです。
	pos=fold(pos);
	float d=10000.;
  // D2Planesは面との距離とかそんな意味だろうが・・
	if(DISPLAY_FACES) d=min(d,D2Planes(pos));
  // 面より辺に近づくようならそっち！
	if(DISPLAY_SEGMENTS) d=min(d,D2Segments(pos));
  // 辺より頂点寄りなら、そっち！
	if(DISPLAY_VERTICES)  d=min(d,D2Vertices(pos));
	return d;
  // 返してるのはマーチングのdなんだから、要するにposの面や、辺や、頂点との、距離を出しているんだろ。
  // D2Planes, D2Segments, D2Vertices、全部そういうことだろ。
}

// このgetColorも謎と言えば謎なんだけど。う～ん・・。

vec3 getColor(vec3 pos){//Not optimized.

  // ここは面の色ですね。3種類。
#define Face0Color vec3(.8,0.6,0.);     // これは黄色に当たる。naとnbが作る面がこれ。
#define Face1Color vec3(0.3,0.7,0.2); // これが緑。nbとncが作る面。
#define Face2Color vec3(0.1,0.4,1.); // これが青。ncとnaが作る面。
// これが辺の色で、
#define SegmentsColor vec3(0.4,0.4,0.7);
// これが頂点の色。
#define VerticesColor vec3(1.,.4,.3);

// posをfoldでposに。このfoldが最大の謎ですね（最大の謎）
// 色取得でもfoldしてる。ああそうね、マーチングでも彩色でも色情報取得するのにほぼ同じことしないといけないのよね。
// あっちとその辺は似ているかも。
	pos=fold(pos);

  // d0, d1, d2, df, dv, dsになんかでかい値を設定してそこから・・って感じか。
	float d0=1000.0,d1=1000.0,d2=1000.,df=1000.,dv=1000.,ds=1000.;

  // 面、辺、頂点の順に色を付けていくので、
  // より後者が反映される仕組みですね。で、計算しない場合はスルーですね。

  // 面に色を付ける場合にこの計算をする。
  // pはグローバルなんですがfoldの際にこのpに何かが起きているようで、それを元に、
	if(DISPLAY_FACES){
		d0=dot(pos-p,pab);
		d1=dot(pos-p,pbc);
		d2=dot(pos-p,pca);
		df=max(max(d0,d1),d2);
		// dot(p, pab)はpabを法線ベクトルとしpを通る平面の原点からの距離で
		// dot(pos, pab)-dot(p,pab)と考えると分かりやすいかも。
		// それのMAXを取っているようね。
	}
	if(DISPLAY_SEGMENTS) ds=D2Segments(pos);
	if(DISPLAY_VERTICES) dv=D2Vertices(pos);

  // 要するに到達点が頂点なのか辺なのか面なのかそれを割り出しているんだと思うよ。
	float d=min(df,min(ds,dv));
  // d0なら面の色0でd1なら面の色1でd2なら面の色2でdsなら辺の色でdvなら頂点の色
  // そういうことね。
	vec3 col=Face0Color;
	if(d==df){
		if(d==d1) col=Face1Color;
		if(d==d2) col=Face2Color;
	}else{
		if(d==ds) col=SegmentsColor;
		if(d==dv) col=VerticesColor;
	}
	return col;
}
//-------------------------------------------------
//From https://www.shadertoy.com/view/XtXGRS#
vec2 rotate(in vec2 p, in float t)
{
	return p * cos(-t) + vec2(p.y, -p.x) * sin(-t);
}

float map(in vec3 p)
{
    //return length(p)-1.;

    // length(p) - 1.は半径1.0の球面なんだけど、これは半径1.0の球面とPolyhedron(p)とをmixさせていますね。
    // それで丸っこくなっているようです。
    // for fun（遊び心）とはそういうことかと。

    // 1.0にするとPolyhedronが直接出てくるし線もまっすぐになる。
    // つまり謎なのはPolyhedronとinitです。
	return mix(length(p)-1.,Polyhedron(p),0.8);//just for fun
}

// 法線の取得もあれと同じだね。まあ、そう書いてあるからね。
vec3 calcNormal(in vec3 p)
{
	const vec2 e = vec2(0.0001, 0.0);
	return normalize(vec3(
		map(p + e.xyy) - map(p - e.xyy),
		map(p + e.yxy) - map(p - e.yxy),
		map(p + e.yyx) - map(p - e.yyx)));
}

// マーチング。うん、一緒。
float march(in vec3 ro, in vec3 rd)
{
	const float maxd = 5.0;
	const float precis = 0.001;
    float h = precis * 2.0;
    float t = 0.0;
	float res = -1.0;
    for(int i = 0; i < 64; i++)
    {
        if(h < precis || t > maxd) break;

        // このmapが謎・・
	    h = map(ro + rd * t);
        t += h;
    }
    if(t < maxd) res = t;
    return res;
}

// 多分あっちと同じ。
vec3 transform(in vec3 p)
{
  // x軸周りの回転（縦振り）のあとy軸周りの回転（ぐるぐる）してる感じ。
    p.yz = rotate(p.yz, iTime * 0.2 + (iMouse.y-0.5*iResolution.y)*PI2/360.);
    p.zx = rotate(p.zx, iTime * 0.125 + (0.5*iResolution.x-iMouse.x)*PI2/360.);
    return p;
}


// いつものようにメインコードから見ていきましょう。はいがんばろー
// そんなたくさんやらないけどね・・寝たいし。
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
  // いつものようにpは縦で-1.0～1.0に落としているようです。
	vec2 p = (2.0 * fragCoord.xy - iResolution.xy) / iResolution.y;

  // colは最終的に色が返る。デフォは0.3～0.4のグラデーションのようです。
	vec3 col = vec3(0.3 + p.y * 0.1);

  // あー、この辺あのコードとそっくりだな・・rayですね。
  vec3 rd = normalize(vec3(p, -1.8));

  // これがカメラ位置。2.5だけ離れていますね。
	vec3 ro = vec3(0.0, 0.0, 2.5);

  // ライトベクトルもそっくり、というかまんまかな・・
  vec3 li = normalize(vec3(0.5, 0.8, 3.0));

  // トランスフォーム。同じ。
  ro = transform(ro);
	rd = transform(rd);
	li = transform(li);

  // このinitが最初の謎。何をしているのか。
    init();

  // そのあとしれっとマーチング。
    float t = march(ro, rd);
    if(t > -0.001)
    {
        vec3 pos = ro + t * rd;
        vec3 n = calcNormal(pos);
        // ライティング。
		float dif = clamp(dot(n, li), 0.0, 1.0);
        col = getColor(pos) * dif;
        col = pow(col, vec3(0.8));
	}
   	fragColor = vec4(col, 1.0);
}

// 短いコードなのに全部の正多面体網羅しててすげぇなこれ。どうなってるの。。。
