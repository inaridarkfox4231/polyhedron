// rayMarching reference: https://www.shadertoy.com/view/XtXGRS
// folding reference: https://www.shadertoy.com/view/XlX3zB

// constant.
#define pi 3.14159
// palette.
const vec3 black = vec3(0.2);
const vec3 skyblue = vec3(0.1, 0.65, 0.9);
const vec3 silver = vec3(0.5);
const vec3 gold = vec3(0.85, 0.67, 0.14);
// for folding.
const vec3 nc5 = vec3(-0.5, -0.809017, 0.309017);
const vec3 pab5 = vec3(0.0, 0.0, 0.809017);
const vec3 pbc5 = vec3(0.5, 0.0, 0.809017);
const vec3 pca5 = vec3(0.0, 0.269672, 0.706011);
const vec3 nab5 = vec3(0.0, 0.0, 1.0);
const vec3 nbc5 = vec3(0.525731, 0.0, 0.850651);
const vec3 nca5 = vec3(0.0, 0.356822, 0.934172);
// for noise.
const vec2 u_10 = vec2(1.0, 0.0);
const vec2 u_01 = vec2(0.0, 1.0);
const vec2 u_11 = vec2(1.0, 1.0);
const vec3 r_vec_30 = vec3(127.1, 311.7, 251.9);
const vec3 r_vec_31 = vec3(269.5, 183.3, 314.3);
const vec3 r_vec_32 = vec3(419.2, 371.9, 218.4);
const vec3 u_100 = vec3(1.0, 0.0, 0.0);
const vec3 u_010 = vec3(0.0, 1.0, 0.0);
const vec3 u_001 = vec3(0.0, 0.0, 1.0);
const vec3 u_110 = vec3(1.0, 1.0, 0.0);
const vec3 u_101 = vec3(1.0, 0.0, 1.0);
const vec3 u_011 = vec3(0.0, 1.0, 1.0);
const vec3 u_111 = vec3(1.0, 1.0, 1.0);
const float r_coeff = 43758.5453123;
const int octaves = 6;
// hsb to rgb.
vec3 getRGB(float h, float s, float b){
  vec3 c = vec3(h, s, b);
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  return c.z * mix(vec3(1.0), rgb, c.y);
}
// rotation.
vec2 rotate(vec2 p, float t){
  return p * cos(t) + vec2(-p.y, p.x) * sin(t);
}
// x axis rotation.
vec3 rotateX(vec3 p, float t){
  p.yz = rotate(p.yz, t);
  return p;
}
// y axis rotation.
vec3 rotateY(vec3 p, float t){
  p.zx = rotate(p.zx, t);
  return p;
}
// z axis rotation.
vec3 rotateZ(vec3 p, float t){
  p.xy = rotate(p.xy, t);
  return p;
}
// fold H3 with counting.
int foldH3Count(inout vec3 p){
  int n = 0;
  float _dot;
  for(int i = 0; i < 5; i++){
    if(p.x < 0.0){ p.x = -p.x; n++; }
    if(p.y < 0.0){ p.y = -p.y; n++; }
    _dot = dot(p, nc5);
    if(_dot < 0.0){ p -= 2.0 * _dot * nc5; n++; }
  }
  return n;
}
vec3 getP5(vec3 u){
  return u.x * pab5 + u.y * pbc5 + u.z * pca5;
}
vec3 getP5(float u1, float u2, float u3){
  return u1 * pab5 + u2 * pbc5 + u3 * pca5;
}
// 3D random vector.(-1.0～1.0)
vec3 random3(vec3 st){
  vec3 v;
  v.x = sin(dot(st, r_vec_30)) * r_coeff;
  v.y = sin(dot(st, r_vec_31)) * r_coeff;
  v.z = sin(dot(st, r_vec_32)) * r_coeff;
  return -1.0 + 2.0 * fract(v); // normalize to -1.0～1.0
}
// simplex noise.
float snoise3(vec3 st){
  vec3 p = st + (st.x + st.y + st.z) / 3.0;
  vec3 f = fract(p);
  vec3 i = floor(p);
  vec3 g0, g1, g2, g3;
  vec4 wt;
  g0 = i;
  g3 = i + u_111;
  if(f.x >= f.y && f.x >= f.z){
    g1 = i + u_100;
    g2 = i + (f.y >= f.z ? u_110 : u_101);
    wt = (f.y >= f.z ? vec4(1.0 - f.x, f.x - f.y, f.y - f.z, f.z) : vec4(1.0 - f.x, f.x - f.z, f.z - f.y, f.y));
  }else if(f.y >= f.x && f.y >= f.z){
    g1 = i + u_010;
    g2 = i + (f.x >= f.z ? u_110 : u_011);
    wt = (f.x >= f.z ? vec4(1.0 - f.y, f.y - f.x, f.x - f.z, f.z) : vec4(1.0 - f.y, f.y - f.z, f.z - f.x, f.x));
  }else{
    g1 = i + u_001;
    g2 = i + (f.x >= f.y ? u_101 : u_011);
    wt = (f.x >= f.y ? vec4(1.0 - f.z, f.z - f.x, f.x - f.y, f.y) : vec4(1.0 - f.z, f.z - f.y, f.y - f.x, f.x));
  }
  float value = 0.0;
  wt = wt * wt * wt * (wt * (wt * 6.0 - 15.0) + 10.0);
  value += wt.x * dot(p - g0, random3(g0));
  value += wt.y * dot(p - g1, random3(g1));
  value += wt.z * dot(p - g2, random3(g2));
  value += wt.w * dot(p - g3, random3(g3));
  return value;
}
// fbm.
float fbm(vec3 st){
  float value = 0.0;
  float amplitude = 0.5;
  for(int i = 0; i < octaves; i++){
    value += amplitude * snoise3(st);
    st *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
// sphere.
float sphere(vec3 p, float r){
  return length(p) - r;
}
// bar. (n:direction, r:radius)
float bar(vec3 p, vec3 n, float r){
  return length(p - dot(p, n) * n) - r;
}
// half open bar.
float halfBar(vec3 p, vec3 n, float r){
  return length(p - min(0.0, dot(p, n)) * n) - r;
}
// update distance.
// 0:min, union.
// 1:max, intersection.
// 2:minus min, difference.
void updateDist(inout vec3 color, inout float dist, vec3 c, float d, int modeId){
  if(d < dist && modeId == 0){ color = c; dist = d; }
  if(d > dist && modeId == 1){ color = c; dist = d; }
  if(-d > dist && modeId == 2){ color = c; dist = -d; }
}
// map function.
vec4 map(vec3 p){
  vec3 color = black;
  float t = 1e20;
  int n = foldH3Count(p);
  float t1 = max(dot(p - pbc5 * 2.2, nca5), dot(p - pbc5 * 2.0, -nca5));
  updateDist(color, t, getRGB(float(n) / 15.0, 1.0, 1.0), t1, 0);
  vec3 guide = getP5(0.0, 0.9, 0.1) * 2.1;
  vec3 v = normalize(cross(pab5 - pbc5, nca5));
  updateDist(color, t, silver, dot(p - guide, v), 1);
  updateDist(color, t, gold, max(dot(p - getP5(0.0, 0.1, 0.9) * 2.1, pbc5 - pca5 + nca5 * 0.1), dot(p - getP5(0.0, 0.05, 0.95) * 2.1, pbc5 - pca5 - nca5 * 0.1)), 0);
  updateDist(color, t, skyblue, sphere(p, 1.0), 0);
  return vec4(color, t);
}
// normal vector.
vec3 calcNormal(vec3 p){
  const vec2 eps = vec2(0.0001, 0.0);
  // mathematical procedure.
  vec3 n;
  n.x = map(p + eps.xyy).w - map(p - eps.xyy).w;
  n.y = map(p + eps.yxy).w - map(p - eps.yxy).w;
  n.z = map(p + eps.yyx).w - map(p - eps.yyx).w;
  return normalize(n);
}
// ray marching.
float march(vec3 ray, vec3 camera){
  const float maxd = 20.0; // searching limit.
  const float precis = 0.001; // precision.
  const int ITERATION = 64; // iteration limit.
  float h = precis * 2.0; // heuristics.

  float t = 0.0; // current distance.

  float result = -1.0;
  for(int i = 0; i < ITERATION; i++){
    if(h < precis || t > maxd){ break; }
    // adding heuristics value.
    h = map(camera + t * ray).w;
    t += h;
  }
  // if t < maxd, it means success(h < precis).
  if(t < maxd){ result = t; }
  return result;
}
// camera move.
void transform(inout vec3 p){
  p = rotateX(p, pi * iTime * 0.3);
  p = rotateY(p, pi * iTime * 0.15);
}
// circles.
void drawSeigaiha(inout vec3 color, in vec2 p, float r, int n){
  float d = length(p);
  if(d > r){ return; }
  float s = mod(floor(d * 2.0 * float(n) / r), 2.0);
  color = getRGB(0.65, s * 0.4, 1.0);
}
// SEIGAI_HA.
vec3 getSeigaihaColor(in vec2 p, float scale){
  p *= scale;
  vec2 q = (mat2(1.0, 1.0, -sqrt(3.0), sqrt(3.0)) / 3.0) * p;
  vec2 i = floor(q);
  vec2 f = fract(q);
  vec2 e1 = vec2(sqrt(3.0) * 0.5, -0.5);
  vec2 e2 = vec2(sqrt(3.0) * 0.5, 0.5);
  // p update.
  p = f.x * e1 + f.y * e2;
  vec2 ul = vec2(0.0);
  vec2 ur = e1 + e2;
  vec2 ct = e1;
  vec2 dl = e1 - e2;
  vec2 dr = 2.0 * e1;
  // step1: draw seigaiha upper.
  // step2: draw seigaiha middle.
  // step3: draw seigaiha lower.
  vec3 color = vec3(f.x, f.y, 1.0);
  drawSeigaiha(color, p - ul, 1.0, 4);
  drawSeigaiha(color, p - ur, 1.0, 4);
  drawSeigaiha(color, p - ct, 1.0, 4);
  drawSeigaiha(color, p - dl, 1.0, 4);
  drawSeigaiha(color, p - dr, 1.0, 4);
  return color;
}
// background.
vec3 getBackground(vec2 p){
  p += vec2(iTime, 0.1 * sin(iTime * pi));
  return getSeigaihaColor(p, 6.0);
}
// main.
void mainImage(out vec4 fragColor, in vec2 fragCoord){
  vec2 p = (fragCoord.xy * 2.0 - iResolution.xy) / min(iResolution.x, iResolution.y);
  vec3 color;
  // ray vector.
  vec3 ray = normalize(vec3(p, -1.8));
  // camera position.
  vec3 camera = vec3(0.0, 0.0, 4.5);
  // light vector.
  vec3 light = normalize(vec3(0.5, 0.8, 3.0));
  // camera rotation.
  transform(ray);
  transform(camera);
  transform(light);
  color = getBackground(p);
  // get ray marching result.
  float t = march(ray, camera);
  // if t > -0.001, it means success. if not, background color.
  if(t > -0.001){
    vec3 pos = camera + t * ray;
    vec3 n = calcNormal(pos);
    // lighting.
    float diff = clamp((dot(n, light) + 0.5) * 0.7, 0.3, 1.0);
    vec3 baseColor = map(pos).xyz;
    baseColor *= diff;
    float nValue = 0.5 + 0.5 * fbm(pos + vec3(0.0, 0.0, iTime));
    vec3 mainColor = baseColor + (vec3(0.9) - baseColor) * smoothstep(0.44, 0.56, nValue);
    // fadeout.
    color = mix(mainColor, color, tanh(t * 0.02));
  }
  fragColor = vec4(color, 1.0);
}
