// polyhedron morphing.
// octahedron, icosahedron, cuboctahedron, medium polyhedron,
// hexahedron, dodecahedron, Stella octangula, tetrahedron.
// reference: raymarching:https://www.shadertoy.com/view/XtXGRS
// thanks!

const float pi = 3.14159;
// color palette.
const vec3 black = vec3(0.2);
const vec3 red = vec3(0.95, 0.3, 0.35);
const vec3 orange = vec3(0.98, 0.49, 0.13);
const vec3 yellow = vec3(0.95, 0.98, 0.2);
const vec3 green = vec3(0.3, 0.9, 0.4);
const vec3 lightgreen = vec3(0.7, 0.9, 0.1);
const vec3 purple = vec3(0.6, 0.3, 0.98);
const vec3 blue = vec3(0.2, 0.25, 0.98);
const vec3 skyblue = vec3(0.1, 0.65, 0.9);
const vec3 white = vec3(1.0);
const vec3 aquamarine = vec3(0.47, 0.98, 0.78);
const vec3 turquoise = vec3(0.25, 0.88, 0.81);
const vec3 coral = vec3(1.0, 0.5, 0.31);
const vec3 limegreen = vec3(0.19, 0.87, 0.19);
const vec3 khaki = vec3(0.94, 0.90, 0.55);
const vec3 navy = vec3(0.0, 0.0, 0.5);
const vec3 silver = vec3(0.5);
// points on axis.
const vec3 e1 = vec3(1.0, 0.0, 0.0);
const vec3 e2 = vec3(0.0, 1.0, 0.0);
const vec3 e3 = vec3(0.0, 0.0, 1.0);
const vec3 e123 = vec3(1.0, 1.0, 1.0);
// global points and faces.
vec3 V1, V2, V3, G;
vec3 P12, P23, P31, P123, Q12, Q23, Q31, R12, R23, R31;
vec3 corner0, corner1;
// drawing flags.
int version;
bool verticeFlag; // true: draw V1, V2, V3.
bool cornerFlag; // true: draw e123.
bool subCornerFlag; // true: draw corner0 while expanding.
// for bodyColor.
vec3 bodyColor;
// get parameter and set flags and bodyColor.
vec4 getParam(){
  float time = mod(iTime, 48.0);
  float f = fract(time / 3.0);
  verticeFlag = true;
  cornerFlag = false;
  subCornerFlag = false;
// in ver1 and ver2, draw e123.
  if(time > 24.0 && time < 39.0){ cornerFlag = true; }
// golden ratio - 1.0
  float k = (sqrt(5.0) - 1.0) / 2.0;
// 色も決める。RGBで適当に・・
  bodyColor = turquoise;
  if(time < 3.0){
    return vec4(0.0, 0.0, 0.0, 0.0); // octahedron.
  }else if(time < 6.0){
    bodyColor = mix(turquoise, skyblue, f);
    return vec4(k * f, 0.0, 0.0, 0.0);
  }else if(time < 9.0){
    bodyColor = skyblue;
    return vec4(k, 0.0, 0.0, 0.0); // icosahedron.
  }else if(time < 12.0){
    bodyColor = mix(skyblue, blue, f);
    return vec4(k + f * (1.0 - k), 0.0, 0.0, 0.0);
  }else if(time < 15.0){
    bodyColor = blue;
    return vec4(1.0, 0.0, 0.0, 0.0); // cuboctahedron.
  }else if(time < 18.0){
    bodyColor = mix(blue, purple, f);
    return vec4(1.0, 0.0, 0.0, f);
  }else if(time < 21.0){
    bodyColor = purple;
    return vec4(1.0, 0.0, 0.0, 1.0); // medium polyhedron.
  }else if(time < 24.0){
    subCornerFlag = true; // preparate for hexahedron, need more vertices.
    bodyColor = mix(purple, red, f);
    return vec4(1.0, 0.0, f, 1.0);
  }else if(time < 27.0){
    bodyColor = red;
    verticeFlag = false; return vec4(1.0, 0.0, 1.0, 1.0); } // hexahedron.
  else if(time < 30.0){
    bodyColor = mix(red, orange, f);
    return vec4(1.0 + f * (k - 1.0), k * f, 1.0, 1.0);
  }else if(time < 33.0){
    bodyColor = orange;
    return vec4(k, k, 1.0, 1.0); // dodecahedron.
  }else if(time < 36.0){
    bodyColor = mix(orange, yellow, f);
    return vec4(k * (1.0 - f), k * (1.0 - f), 1.0, 1.0);
  }else if(time < 39.0){
    bodyColor = yellow;
    return vec4(0.0, 0.0, 1.0, 1.0); } // Stella octangula.
  else if(time < 42.0){
    subCornerFlag = true; // preparate for tetrahedron, need more vertices.
    bodyColor = mix(yellow, green, f);
    return vec4(0.0, 0.0, 1.0 - f, 1.0);
  }else if(time < 45.0){
    bodyColor = green;
    verticeFlag = false; return vec4(0.0, 0.0, 0.0, 1.0); } // tetrahedron.
  bodyColor = mix(green, turquoise, f);
  return vec4(0.0, 0.0, 0.0, 1.0 - f);
}
// set global properties.
void prepareGlobal(){
  vec4 t = getParam();
  // set version.
  version = 2;
  if(max(t.z, t.w) == 0.0){ version = 0; }
  else if(min(t.z, t.w) == 1.0){ version = 1; }
  // set vertices.
  V1 = vec3(0.0, t.y + 1.0, t.x);
  V2 = vec3(t.x, 0.0, t.y + 1.0);
  V3 = vec3(t.y + 1.0, t.x, 0.0);
  G = (V1 + V2 + V3) / 3.0;
  // prepare faces.
  P12 = normalize(cross(V2 - e3, V1 - e3));
  P23 = normalize(cross(V3 - e1, V2 - e1));
  P31 = normalize(cross(V1 - e2, V3 - e2));
  P123 = normalize(cross(V2 - V1, V3 - V1));
  corner0 = (1.0 - t.z) * G + t.z * e123;
  corner1 = (1.0 - t.w) * G + t.w * e123;
  Q12 = normalize(cross(V1 - corner0, V2 - corner0));
  Q23 = normalize(cross(V2 - corner0, V3 - corner0));
  Q31 = normalize(cross(V3 - corner0, V1 - corner0));
  R12 = normalize(cross(V1 - corner1, V2 - corner1));
  R23 = normalize(cross(V2 - corner1, V3 - corner1));
  R31 = normalize(cross(V3 - corner1, V1 - corner1));
}
// rotation function for camera work.
vec2 rotate(vec2 p, float t){
  return p * cos(t) + vec2(-p.y, p.x) * sin(t);
}
vec3 rotateX(vec3 p, float t){
  p.yz = rotate(p.yz, t);
  return p;
}
vec3 rotateY(vec3 p, float t){
  p.zx = rotate(p.zx, t);
  return p;
}
vec3 rotateZ(vec3 p, float t){
  p.xy = rotate(p.xy, t);
  return p;
}
// sphere. (for vertices)
float sphere(vec3 p, float r){
  return length(p) - r;
}
// bar. (not use)
float bar(vec3 p, vec3 n, float r){
  return length(p - dot(p, n) * n) - r;
}
// halfBar. (not use)
float halfBar(vec3 p, vec3 n, float r){
  return length(p - min(0.0, dot(p, n)) * n) - r;
}
// drawing utility.
// 0: min(union)
// 1: max(intersection)
// 2: minus max(difference)
void updateDist(inout vec3 color, inout float dist, vec3 c, float d, int modeId){
  if(d < dist && modeId == 0){ color = c; dist = d; }
  if(d > dist && modeId == 1){ color = c; dist = d; }
  if(-d > dist && modeId == 2){ color = c; dist = -d; }
}
// map function.
vec4 map(in vec3 p){
  vec3 color;
  float parity = sign(p.x) * sign(p.y) * sign(p.z);
  p = abs(p);
  float t = -1.0;
  float face, vertice; // for calculate.
  if(version == 0 || version == 2){
    face = max(dot(p - e3, P12), max(dot(p - e1, P23), dot(p - e2, P31)));
    updateDist(color, t, bodyColor, face, 1);
  }
  if(version == 0){
    updateDist(color, t, bodyColor, dot(p - G, P123), 1);
  }
  if(version == 1 || (version == 2 && parity > 0.001)){
    face = max(dot(p - corner0, Q12), max(dot(p - corner0, Q23), dot(p - corner0, Q31)));
    updateDist(color, t, bodyColor, face, 1);
    if(subCornerFlag){
      updateDist(color, t, silver, sphere(p - corner0, 0.1), 0);
    }
  }
  if(version == 2 && parity < 0.001){
    face = max(dot(p - corner1, R12), max(dot(p - corner1, R23), dot(p - corner1, R31)));
    updateDist(color, t, bodyColor, face, 1);
    updateDist(color, t, silver, sphere(p - corner1, 0.1), 0);
  }
  if(verticeFlag){
    vertice = min(sphere(p - V1, 0.1), min(sphere(p - V2, 0.1), sphere(p - V3, 0.1)));
    updateDist(color, t, silver, vertice, 0);
  }
  if(cornerFlag){
    updateDist(color, t, silver, sphere(p - e123, 0.1), 0);
  }
  return vec4(color, t);
}
// get normal vector. (mathematical method)
vec3 calcNormal(vec3 p){
  const vec2 eps = vec2(0.0001, 0.0);
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
  float angleX = pi * iTime * 0.3;
  float angleY = pi * iTime * 0.15;
  p = rotateX(p, angleX);
  p = rotateY(p, angleY);
}
// 背景色。とりあえずデフォでいいよ。
vec3 getBackground(vec2 p){
// まあこれだと空間がぐるぐるしてる感じがないからなー・・
// 体の色に合わせて変えてみるやつやってみました。
  vec3 color = mix(bodyColor, white, 0.5);
  return color * (0.3 + p.y * 0.4);
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
  // preparation.
  prepareGlobal();
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
    // fadeout effect.
    color = mix(baseColor, color, tanh(t * 0.02));
  }
  fragColor = vec4(color, 1.0);
}
