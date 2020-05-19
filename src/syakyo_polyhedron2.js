// https://www.shadertoy.com/view/XtXGRS
// すげぇこれ参考にしてるんだ

// 正多面体のモーフィングプログラム
// レイマーチングの復習にもなったから写経してアレンジしてちょいちょいやってみた
// これはもう原型とどめてないですね・・・
// 元ネタのこれ、地味で全然伸びてないのに、これ参考にして作った別のプログラムが伸びてるのなんていうか皮肉すぎる（

#define PI	3.14159265359
#define PI2	( PI * 2.0 )

vec2 rotate(in vec2 p, in float t)
{
  // と思ったら定義してた。
  // (p.x, p.y) → (p.x * cos(t) - p.y * sin(t), p.y * cos(t) + p.x * sin(t)). 回転。
	return p * cos(-t) + vec2(p.y, -p.x) * sin(-t);
}

// 正四面体。
float tetrahedron(in vec3 p) // 4
{
   // vは上向き単位ベクトルね。
    vec3 v = vec3(0.0, 1.0, 0.0);
  // dはpのy成分・・でいいのかな。
    float d = dot(p, (v));
  // vのxy成分・・
    v.xy = rotate(v.xy, 1.91063); // ? // はぁ？？
    // 正確な値：atan2(2√2, -1).

    // まあ、回転してるのは分かるけど・・
    // 1.9だから PI/2 よりは大きいか。(1.57くらい) ということはvは下を向いてるわけだが・・
  // そういうこと。ひとつの頂点に向かう単位ベクトルに書き換えてるわけ。
  // そのあとはそれを各頂点に回してる。
  // つまりやってることは各頂点に向かう単位ベクトルとpの内積のうち一番でっかいのを求めるってことか。
    vce3 q;
    for(float i = 0.0; i < 3.0; i++)
    {
        q = vec3(rotate(v.xz, i * PI2 / 3.0), v.y).xzy; // vを2.0 * PI * i / 3.0 だけy軸周りに回転したもの。
        d = max(d, dot(p, q));
    }

    // vは面に対する法線ベクトルでしたね。なるほど。
    // 面に対する法線ベクトルのなす角度だったか。まあ同じ角度にはなるんだが意味合いが全く違ってくるわけだ。

    // vをいじりつつpとの内積を取り一番大きいものを採用している。
    // vは常に単位ベクトルであり続ける。ということは得られる値はすべて何かしらの半直線へのpの射影であるのね。
    // v → vec3(rotate(v.xz, theta), v.y).xzy はy軸周りのtheta回転（zをxに移す）。
    // そう考えるとdot(p, q)のqはそこまでおどろおどろしいものではない。
    return d;
    // やってることは理解したがそれで距離になるのが・・
    // -0.5してるからこれが0.5になるまでレイをマーチさせてるっぽいな。
    // ああーそうか、平面に垂線おろして、それとの距離の最大値取ってるんだ。なるほどね。
    // 正四面体との距離が最短になる直線を考えるときその点はその面の側にあり、それゆえに内積が最大になる。
    // 凸多面体ならではね・・凹だったら成立しない。
    // や・・
    // 厳密な距離でなくていいのか。これだと各平面への距離だから、複数の面がp側を向いてる場合にそれらの
    // 平方和とかその、頂点との距離でないと・・しかしレイマーチングでは厳密な距離はしばしば必要とされない、らしい。
    // 厳密でなくてもそれが0になるところが表面ならOKで、低く見積もったところで大して問題ではないということなのね。
    // たとえば立方体でレイマするとき場合によっては各頂点との距離が必要になるけどそういうのは不要だと、
    // 平面との距離でいいと。そういうことなのね。

    // intersection法だとこっち向いてる平面すべてに対して交点調べないといけないけどな・・
    // でもあっちはあっちで一瞬で到達できる、レイマしないから、そこは速そうだけどな。どっちがいいのかわからんな。

    // まあ、やってることは立方体と一緒みたいだね・・
}


float hexahedron(in vec3 p) // 6
{
  // その立方体です。
  // 例によってvはてっぺんベクトル。これそうか、面に対する角度か。
    vec3 v = vec3(0.0, 1.0, 0.0);
    // これで得られる値っていうのは要するにzx平面との絶対距離になるわけで、
    // それを-1.0すれば0.0になるとき表面でしょみたいなやつね。
    float d = abs(dot(p, (v)));
    v.xy = rotate(v.xy, PI / 2.0);
    d = max(d, abs(dot(p, (v))));
    v.xz = rotate(v.xz, PI / 2.0);
    // 各平面に対して同じことをしてmax取ってる。仰々しいけどよく見るboxと同じことやってるんだわね。
    d = max(d, abs(dot(p, (v))));
    return d;
}

float octahedron(in vec3 p) // 8
{
  // 対称性を使えば対面に関しては絶対値で処理を半分にできるのは先程見た通り。
  // 正八面体は面の対が4対あるから処理も4回で済む。
  // まあ、さらに対称性使ってそうだけど・・・・

  // いつものようにてっぺんからスタート。
  // と思ったけどこれ対面ベクトルじゃないな。
  // 最初の処理でどっかの面に置いた後で90°ずつ回転させてる。

  // xz・・ってなってるから同じ、あー分かった、そうか、これ普通のだ。普通のっていうかその、
  // よくみる、頂点が上向いてて・・FFのクリスタル的なやつだ。で、それらに向かう法線ベクトル4つを、
  // y軸周りの90°回転で得ている、最初の処理でそのうちのひとつに到達しているのね。

    vec3 v = vec3(0.0, 1.0, 0.0);
	float a = atan(1.0, sin(PI / 4.0)); // この1/√2はクリスタルの正方形の辺の長さの半分. ていうかatan(√2)じゃんこれ。

	。頂点の高さが1.0だし。
  // 正方形はzx軸を横切るように存在しているから、この回転でひとつの面法線ベクトルに到達できる。
    v.xy = rotate(v.xy, a);
    float d = 1.0;
    for(float i = 0.0; i < 4.0; i++)
    {
      // あとは正四面体の時のように90°ずつ回すことで上側の法線ベクトルはすべて得られる。
      // それに対して立方体の時のように面との絶対距離を取ればOK.
    	d = max(d, abs(dot(p, vec3(rotate(v.xz, i * PI2 / 4.0), v.y).xzy)));
    }
    return d;
    // ちなみにこの操作はこう考えるといいかも。本来計算すべきなのは・・
    // max{ (n1, p), (n2, p), (n3, p), (n4, p), (-n1, p), (-n2, p), (-n3, p), (-n4, p) }
    // なんだけど max{s, -s} = |s|だからまとめちゃえるってわけね（順序に依らないので）。
}

float dodecahedron(in vec3 p) // 12
{
  // さて正十二面体ですが・・（成獣？）
    vec3 v = vec3(0.0, 1.0, 0.0);
    // いきなり面対やってるからてっぺんを向いた面があるんだろ。
    // で、2PI/5ずつ回転させてるからどうもそういうことらしい。
    float d = abs(dot(p, (v)));
    // これでいつものようにひとつの面法線ベクトルに移動してるのね。

		// なんか面のなす角調べたらcosθ = -1/√5 とかなって混乱してる・・PI/3じゃない？じゃあここ何やってるのよ。
		// 違うよ、面のなす角と法線ベクトルのなす角は足して180°だから正確な法線ベクトルのなす角は
		// 1.0 - acos(-1/√5) = 1.1071487177940904 （というかatan(2)ですね）
		// なんですよ。一方でここで用いられている値というのが
		// Math.PI / 3.0 = 1.0471975511965976
		// つまりほぼ0.06くらいしか違わない。近似値なんです。見た目上ほとんど分からないけど。
		// ちなみに面のなす角は隣り合う正五角形で頂点結んで正方形作れば簡単に調べられます。
		// モデル作るのも簡単ですね。それ用にあのプログラム使うのもありか。それ貼り付けて、数字書いて。
		// となるとこれみたくあちこちから見れるようにして・・光源の位置とか・・あるいは立体の方を動かしてもいいけど。

		// atan(2.0)の方がよっぽど簡潔じゃん・・まあ、いいけどさ。
    v.xy = rotate(v.xy, PI2 / 6.0);
    for(float i = 0.0; i < 5.0; i++)
    {
        d = max(d, abs(dot(p, vec3(rotate(v.xz, i * PI2 / 5.0), v.y).xzy)));
    }
    return d;
}

float icosahedron(in vec3 p) // 20
{
  // 正二十面体も10回やってるから10対でやるんだろうけど。
  // 5対ずつ分けて計算しているのね。
  // 頂点(0.0, 1.0, 0.0)に集まる5つの三角形を回るのがおそらくv1でその周りの5つに対応するのがv2なんだろう。
  // それにしても2倍なのね、きちんと座標調べてみよう・・
  // しかしこれ10回か・・レイマは64回だし、・・まあ知らんけど。
    vec3 v = vec3(0.0, 1.0, 0.0);
    float n =  0.69; // ?
		// 0.69ってPI/4(～0.78)よりちょっと小さいからその2倍も90°よりちょっと小さくなるわね。

		// 修正した。
		// 頂点方向のベクトルと最初の面法線ベクトル、および第二面法線ベクトルとのそれぞれのなす角を修正した。
		// 最初が acos(tan(0.3 * pi) / sqrt(3.0)) = 0.6523581397843682 で
		// 次が atan(2.0 / sqrt(5.0)) = 0.7297276562269663 です。
		// これらの数字で書き換えた。0.69とその2倍ではなくて。
		// 和を取るとほぼ一致してるんですよね・・だから単純に2で割ってその値を採用しているのでしょう。
		vec3 v1 = vec3(rotate(v.xy, n), v.z);
    vec3 v2 = vec3(rotate(v.xy, n * 2.0), v.z);
    float d = 1.0;
    for(float i = 0.0; i < 5.0; i++)
    {
    	d = max(d, abs(dot(p, vec3(rotate(v1.xz, i * PI2 / 5.0), v1.y).xzy)));
    	d = max(d, abs(dot(p, vec3(rotate(v2.xz, i * PI2 / 5.0), v2.y).xzy)));
    }
    return d;
		// お疲れさまでした。今回はあまり苦にならなかったですね。
		// そのうちメンガーやりたいな。。
}


float map(in vec3 p)
{
  // map関数ね。
  // というわけでモーフィングですね。0.5とか1.0は半径・・どうなってるんだろ。
  // 表面との距離を取ってるのは間違いなさそうなんだけど。
    float t = mod(iTime * 0.5, 15.0);
    if (t < 3.0)  return mix(tetrahedron(p) - 0.5, hexahedron(p)  -1.0, smoothstep( 1.0,  2.0, t));
    if (t < 6.0)  return mix(hexahedron(p)  - 1.0, octahedron(p)  -1.0, smoothstep( 4.0,  5.0, t));
    if (t < 9.0)  return mix(octahedron(p)  - 1.0, dodecahedron(p)-1.0, smoothstep( 7.0,  8.0, t));
    if (t < 12.0) return mix(dodecahedron(p)- 1.0, icosahedron(p) -1.0, smoothstep(10.0, 11.0, t));
    if (t < 15.0) return mix(icosahedron(p) - 1.0, tetrahedron(p) -0.5, smoothstep(13.0, 14.0, t));
    return 1.0;
}

vec3 calcNormal(in vec3 p)
{
	const vec2 e = vec2(0.0001, 0.0); // エプシロン
  // まああれ、F(x, y, z) = 0であらわされる曲面上の点における法線ベクトルを出すいつもの手法。
  // 問題はmapの中身がね・・
	return normalize(vec3(
		map(p + e.xyy) - map(p - e.xyy),
		map(p + e.yxy) - map(p - e.yxy),
		map(p + e.yyx) - map(p - e.yyx)));
}

// いつものレイマーチング。基本中の基本なのでがっちり押さえましょう。
float march(in vec3 ro, in vec3 rd)
{
  // このmaxdは閾値ですね。これに達するまでは進み続ける。達しなかったらレイマ失敗で-1.0が返る。
	const float maxd = 50.0;
  // このprecis（精度）より小さくなるところで表面到達とみなす。
  // 精度に達しないままループが終了したらとか考えない。64回もやるなら終わるでしょ。
	const float precis = 0.001;
  // hの初期値はprecisの2倍、これは最初の1手でいきなり終わらないようにテキトーにprecisより大きいのを設定しているだけだと思う。
    float h = precis * 2.0;
  // ro（視点）からrd（レイベクトル）に沿ってtだけ進んだ場所がレイの先端。
    float t = 0.0;
    // resultですね。この値でレイが到達したかどうか判定するようです。
	float res = -1.0;
  // マーチングループは64回ですね。
    for(int i = 0; i < 64; i++)
    {
      // 十分に表面に近い時に抜けます。レイ飛ばしが失敗しても抜けます。
        if(h < precis || t > maxd) break;
        // map関数でレイの先端と表面との距離を調べていますね！
	    h = map(ro + rd * t);
      // その距離だけ進みますね。レイマーチングなので。
        t += h;
    }
    if(t < maxd) res = t;
    return res;
}

vec3 transform(in vec3 p)
{
  // 視点の回転。rotateはベクトルへの回転操作。上の方で定義してる。

  // 一つ目はx軸周りの周りの回転でカメラの位置がy軸をz軸に移す方向に動いてるからそういうことでしょう。
    p.yz = rotate(p.yz, iTime * 0.8);
  // 二つ目はy軸周りの、つまり横回転ね。カメラはz軸をx軸に移す方向に動いているのでそういうことですね。
    p.zx = rotate(p.zx, iTime * 0.5);
  // で、カメラを動かしたらレイを飛ばす方向も同じように動かさないといけないし・・
  // つまりキャンバスといっしょに動くのね。で、光の当たり具合も変化しているので常に明るい面が見える仕組みですね。
  // そうするべきかな・・あっちも。暗くなっちゃうのはよくないよね。
  // つまり対象を動かすのではなくカメラを動かすから関数が簡単になるわけですね。

  // で、動かすタイミングをずらすことで変化をつけていますね。
    return p;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
  // ここは-1.0～1.0に正規化しているらしい。
	vec2 p = (2.0 * fragCoord.xy - iResolution.xy) / iResolution.y;
  // 背景の灰色ですね
	vec3 col = vec3(0.1 + p.y * 0.15);
  // z軸負方向、視点から1.8離れたところにキャンバスがある。そこに投影している。
  // rdは視点からピクセルに向かうベクトルの正規化。レイベクトルですね。
   	vec3 rd = normalize(vec3(p, -1.8));
  // 視点の場所。z軸正方向に4.5のところにあるらしい。
	vec3 ro = vec3(0.0, 0.0, 4.5);
  // 多分光のベクトル・・でしょうね。名前からして。いじったらライティング変わったから。
    vec3 li = normalize(vec3(0.5, 0.8, 3.0));
  // 視点の位置、レイベクトル、光をそれぞれ変換しているのだけどわかんね。
    ro = transform(ro);
	rd = transform(rd);
	li = transform(li);
  // マーチングを施し、結果を取得。
    float t = march(ro, rd);
  // マーチングに失敗すると-1.0が返る仕組みになってる。そうでない場合は限りなく、
  // その表面にあると保証できる、閾値が決まっててその値に達しない限りレイは進み続けるようになってるみたいだから。
    if(t > -0.001)
    {
        vec3 pos = ro + t * rd;
        // 法線の計算は距離関数の偏微分（いつものように）
        vec3 n = calcNormal(pos);
        // ライティング。liは表面から突き出た単位ベクトルでしょう。それと法線との内積に0.5を加えて-0.5～1.5の値にし、
        // 0.7倍することで-0.35～1.0くらいにしているみたい。それを0.3と1.0の間に制限してる。要は0.3～1.0にしてるのね。
		float dif = clamp((dot(n, li) + 0.5) * 0.7, 0.3, 1.0);
    // それを若干黄色っぽい値に掛ける。結構シンプルにできてるのね。
        col = vec3(0.95, 0.9, 0.7) * dif;
    }
    // というわけで問題はtransformとmapに集約される。
   	fragColor = vec4(col, 1.0);
}
