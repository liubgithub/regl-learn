/*
参考regl的deffer-shading
 */
import fit from 'canvas-fit';
import reglObject from 'regl';
import mat4 from 'gl-mat4';
import orbitCamera from 'canvas-orbit-camera';
import bunny from 'bunny';
import primitiveSphere from 'primitive-sphere';
import normals from 'angle-normals';
import resl from 'resl';


const webglCanvas = document.getElementById('webgl');
//引入要用到的webgl扩展插件
const regl = reglObject({
  canvas: webglCanvas,
  extensions: ['webgl_draw_buffers', 'oes_texture_float']
});

//创建一个可以旋转视角的相机
const camera = orbitCamera(webglCanvas);
window.addEventListener('resize', fit(webglCanvas), false)
//后面点光源灯光需要用到的
const sphereMesh = primitiveSphere(1.0,{
	segments:16
});
var eye = [0.0,-10.0,10.0];
var center = [0.0,0.0,0.0];
var up = [0.0,1.0,0.0];
// 配置初始化相机的参数
camera.lookAt(eye,center,up)
camera.zoom(500.0) // 10.0
//配置帧缓冲对象
const fbo = regl.framebuffer({
  color: [
    regl.texture({type: 'float'}), // 存环境贴图和镜面贴图
    regl.texture({type: 'float'}), // 存法线贴图
    regl.texture({type: 'float'}) // 存位置贴图
  ],
  depth: true
})

//盒子的顶点数据
var boxPosition = [
 [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5], // positive z face.
  [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], // positive x face
  [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], // negative z face
  [-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], // negative x face.
  [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5], // top face
  [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]  // bottom face
]

const boxElements = [
  [2, 1, 0], [2, 0, 3],       // positive z face.
  [6, 5, 4], [6, 4, 7],       // positive x face.
  [10, 9, 8], [10, 8, 11],    // negative z face.
  [14, 13, 12], [14, 12, 15], // negative x face.
  [18, 17, 16], [18, 16, 19], // top face.
  [20, 21, 22], [23, 20, 22]  // bottom face
]

// 显现数据
var boxNormal = [
  // side faces
  [0.0, 0.0, +1.0], [0.0, 0.0, +1.0], [0.0, 0.0, +1.0], [0.0, 0.0, +1.0],
  [+1.0, 0.0, 0.0], [+1.0, 0.0, 0.0], [+1.0, 0.0, 0.0], [+1.0, 0.0, 0.0],
  [0.0, 0.0, -1.0], [0.0, 0.0, -1.0], [0.0, 0.0, -1.0], [0.0, 0.0, -1.0],
  [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0],
  // top
  [0.0, +1.0, 0.0], [0.0, +1.0, 0.0], [0.0, +1.0, 0.0], [0.0, +1.0, 0.0],
  // bottom
  [0.0, -1.0, 0.0], [0.0, -1.0, 0.0], [0.0, -1.0, 0.0], [0.0, -1.0, 0.0]
];
//纹理坐标数据
var cubeUv = [
  [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // positive z face.
  [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // positive x face.
  [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // negative z face.
  [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // negative x face.
  [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], // top face
  [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]  // bottom face
];
//两张纹理图像
var isLoaded = 0;
var image1 = new Image();
image1.src = 'images/container2.png';
var imageTexture1 = null;
image1.onload = function () {
   imageTexture1 = regl.texture(image1);
   isLoaded++;
};
var imageTexture2 = null;
var image2 = new Image();
image2.src = 'images/container2_specular.png';
image2.onload = function () {
   imageTexture2 = regl.texture(image2);
   isLoaded++;
};

// 真是场景的view和project矩阵,按照regl的写法来
const globalScope = regl({
  uniforms: {
    view: () => camera.view(),
    projection: ({viewportWidth, viewportHeight}) =>
      mat4.perspective([],
                       Math.PI / 4,
                       viewportWidth / viewportHeight,
                       0.01,
                       2000)
    }
})

//GBuffer对象
const outputGBuffer = regl({
  frag: `
#extension GL_EXT_draw_buffers : require
  precision mediump float;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 v_texUV;
  uniform vec3 color;
  uniform float isCube;

  uniform sampler2D texture_diffuse1;
  uniform sampler2D texture_specular1;
  void main () {
    // just output geometry data.
    if(isCube==1.0)
      gl_FragData[0] = vec4(texture2D(texture_diffuse1, v_texUV).rgb,texture2D(texture_specular1, v_texUV).a);
    else 
      gl_FragData[0] = vec4(color, 1.0);
    gl_FragData[1] = vec4(vNormal, 0.0);
    gl_FragData[2] = vec4(vPosition, 0.0);
  }`,
  vert: `
  precision mediump float;
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 texUV;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 v_texUV;
  uniform mat4 projection, view, model;
  void main() {
    vNormal = normal;
    vec4 worldSpacePosition = model * vec4(position, 1);
    vPosition = worldSpacePosition.xyz;
    gl_Position = projection * view * worldSpacePosition;
    v_texUV = texUV;
  }`,
  framebuffer: fbo
})

// 定向光
const drawDirectionalLight = regl({
  frag: `
  precision mediump float;
  varying vec2 uv;
  uniform sampler2D albedoTex, normalTex;
  uniform vec3 ambientLight;
  uniform vec3 diffuseLight;
  uniform vec3 lightDir;
  void main() {
    vec3 albedo = texture2D(albedoTex, uv).xyz;
    vec3 n = texture2D(normalTex, uv).xyz;
    vec3 ambient = ambientLight * albedo;
    vec3 diffuse = diffuseLight * albedo * clamp(dot(n, lightDir) , 0.0, 1.0 );
    gl_FragColor = vec4(ambient + diffuse, 1.0);
  }`,
  vert: `
  precision mediump float;
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = 0.5 * (position + 1.0);
    gl_Position = vec4(position, 0, 1);
  }`,
  attributes: {
    // 作为一张四边形贴图绘制出去
    position: [ -4, -4, 4, -4, 0, 4 ]
  },
  uniforms: {
    albedoTex: fbo.color[0],
    normalTex: fbo.color[1],
    ambientLight: [0.3, 0.3, 0.3],
    diffuseLight: [0.7, 0.7, 0.7],
    lightDir: [0.39, 0.87, 0.29]
  },
  depth: { enable: false },
  count: 3
});

const drawPointLight = regl({
  depth: { enable: false },
  frag: `
  precision mediump float;
  varying vec2 uv;
  varying vec4 vPosition;
  uniform vec3 ambientLight;
  uniform vec3 diffuseLight;
  uniform vec3 viewPos;
  uniform float lightRadius;
  uniform vec3 lightPosition;
  uniform sampler2D albedoTex, normalTex, positionTex;
  void main() {
    //根据gl_Position算深度贴图的x,y坐标，用于接下来的采样操作
    vec2 uv = (vPosition.xy / vPosition.w ) * 0.5 + 0.5;
    vec3 albedo = texture2D(albedoTex, uv).xyz;
    vec3 specularLight = diffuseLight;
    float Specular = texture2D(albedoTex, uv).a;
    vec3 n = texture2D(normalTex, uv).xyz;
    vec4 position = texture2D(positionTex, uv);
    vec3 toLightVector = position.xyz - lightPosition;//lightDir
    vec3 viewDir  = normalize(viewPos - vec3(position));
    float lightDist = length(toLightVector);
    vec3 l = -toLightVector / ( lightDist );
    // fake z-test
    float ztest = step(0.0, lightRadius - lightDist );
    float attenuation = (1.0 - lightDist / lightRadius);
    vec3 ambient = ambientLight * albedo;//环境光
    vec3 diffuse = diffuseLight * albedo * clamp( dot(n, l ), 0.0, 1.0 );//漫反射
    vec3 halfwayDir = normalize(-toLightVector + viewDir);  
    float spec = pow(max(dot(n, halfwayDir), 0.0),16.0);
    vec3 specular = specularLight * spec * Specular;//高光
    gl_FragColor = vec4((diffuse+ambient+specular)* ztest* attenuation,1.0);
  }`,

  vert: `
  precision mediump float;
  uniform mat4 projection, view, model;
  attribute vec3 position;
  varying vec4 vPosition;
  void main() {
    vec4 pos = projection * view * model * vec4(position, 1);
    vPosition = pos;
    gl_Position = pos;
  }`,
  uniforms: {
    albedoTex: fbo.color[0],
    normalTex: fbo.color[1],
    positionTex: fbo.color[2],
    ambientLight: regl.prop('ambientLight'),
    diffuseLight: regl.prop('diffuseLight'),
    lightPosition: regl.prop('translate'),
    lightRadius: regl.prop('radius'),
    viewPos:eye,
    model: (_, props, batchId) => {
      var m = mat4.identity([])

      mat4.translate(m, m, props.translate)

      var r = props.radius
      mat4.scale(m, m, [r, r, r])

      return m
    }
  },
  attributes: {
    position: () => sphereMesh.positions,//将球作为灯光在地面形成的效果绘制，所以是球的顶点数据
    normal: () => sphereMesh.normals
  },
  elements: () => sphereMesh.cells,
  //混合模式
  blend: {
    enable: true,
    func: {
      src: 'one',
      dst: 'one'
    }
  },
  cull: {
    enable: true
  },
  //画球的背面，那么球呗平面截取的部分正好是个圆，比较符合灯光的效果
  frontFace: 'cw'
})


function Mesh (elements, position, normal, texUV) {
  this.elements = elements;
  this.position = position;
  this.normal = normal;
  this.texUV = texUV;
}

Mesh.prototype.draw = regl({
  uniforms: {
    model: (_, props, batchId) => {
      //创建模型矩阵
      var m = mat4.identity([])
      mat4.translate(m, m, props.translate)
      var s = props.scale

      if (typeof s === 'number') {
        mat4.scale(m, m, [s, s, s])
      } else {
        mat4.scale(m, m, s)
      }

      if (typeof props.yRotate !== 'undefined') {
        mat4.rotateY(m, m, props.yRotate)
      }

      return m
    },
    isCube:regl.prop('isCube'),
    color: regl.prop('color'),
    texture_diffuse1:()=> {
        return imageTexture1;
    },
    texture_specular1:()=> {
        return imageTexture2;
    }
  },
  attributes: {
    position: regl.this('position'),
    normal: regl.this('normal'),
    texUV:regl.this('texUV')
  },
  elements: regl.this('elements'),
  cull: {
    enable: true
  }
})

var boxMesh = new Mesh(boxElements, boxPosition, boxNormal, cubeUv);

var drawGeometry = () => {
  var S = 800 ;// 平面的长宽
  var T = 0.1; // 平面的高度
  var C = [0.45, 0.45, 0.45] ;//平面的颜色
  
  var boxes = [];
  var N_BOX = 5; // 箱子的个数

  function negMod (x, n) {  
    return ((x % n) + n) % n
  }

  var x;
  var z;

  //按照某种算法，设置箱子的个数和位置
  for (x = -N_BOX; x <= +N_BOX; x++) {
    for (z = -N_BOX; z <= +N_BOX; z++) {
      var xs = x / (N_BOX + 1)
      var zs = z / (N_BOX + 1)

      // 随机颜色
      var c = [
        ((Math.abs(3 * x + 5 * z + 100) % 10) / 10) * 0.64,
        ((Math.abs(64 * x + x * z + 23) % 13) / 13) * 0.67,
        ((Math.abs(143 * x * z + x * z * z + 19) % 11) / 11) * 0.65
      ]

      var A = S / 20
      var xd = (negMod(z * z * 231 + x * x * 343, 24) / 24) * 0.97 * A
      var zd = (negMod(z * x * 198 + x * x * z * 24, 25) / 25) * 0.987 * A

      // 缩放
      var s = ((Math.abs(3024 * z + 5239 * x + 1321) % 50) / 50) * 3.4 + 10.0
      //旋转
      var r = ((Math.abs(9422 * z * x + 3731 * x * x + 2321) % 200) / 200) * 2 * Math.PI

      // 平移
      var t = [xs * S / 2.0 + xd, 10.0, zs * S / 2.0 + zd]

      boxes.push({scale: s, translate: t, color: c, yRotate: r,isCube:1.0})
    }
  }

  //
  // 开始绘制我们场景中的物体
  //

  boxMesh.draw(boxes);//100个箱子
  boxMesh.draw({scale: [S, T, S], translate: [0.0, 0.0, 0], color: C, isCube:0.0});//地面
}


var drawPointLights = (tick) => {
  //存放光源
  var pointLights = []

  //一种使光球看起来效果很好且很逼真的算法，维基百科上有相关介绍
  function makeRose (args) {
    var N = args.N // 点的数量.
    var n = args.n // 
    var d = args.d // 
    var v = args.v // 
    var R = args.R // 
    var s = args.s // 
    var seed = args.seed // 随机速度

    for (var j = 0; j < N; ++j) {
      var theta = s * 2 * Math.PI * i * (1.0 / (N))
      theta += tick * 0.01

      var i = j + seed

      var a = 0.8

      var r = ((Math.abs(23232 * i * i + 100212) % 255) / 255) * 0.8452
      var g = ((Math.abs(32278 * i + 213) % 255) / 255) * 0.8523
      var b = ((Math.abs(3112 * i * i * i + 2137 + i) % 255) / 255) * 0.8523

      var rad = ((Math.abs(3112 * i * i * i + 2137 + i * i + 232 * i) % 255) / 255) * 0.9 * 30.0 + 30.0
      var k = n / d
      pointLights.push({radius: rad, translate:
                        [R * Math.cos(k * theta * v) * Math.cos(theta * v), 20.9, R * Math.cos(k * theta * v) * Math.sin(theta * v)],
                        ambientLight: [a * r, a * g, a * b], diffuseLight: [r, g, b]})
    }
  }

  // We make the point lights move on rose curves. This looks rather cool.
  // https://en.wikipedia.org/wiki/Rose_(mathematics)
  makeRose({N: 10, n: 3, d: 1, v: 0.4, R: 300, seed: 0, s: 1});
  makeRose({N: 20, n: 7, d: 4, v: 0.6, R: 350, seed: 3000, s: 1});
  makeRose({N: 20, n: 10, d: 6, v: 0.7, R: 350, seed: 30000, s: 1});
  makeRose({N: 40, n: 7, d: 9, v: 0.7, R: 450, seed: 60000, s: 10});

  //
  //绘制所有光球
  //
  drawPointLight(pointLights);
}

regl.frame(({tick, viewportWidth, viewportHeight}) => {
  fbo.resize(viewportWidth, viewportHeight);

  globalScope(() => {
    // 开始进行延迟着色，先进行几何阶段的绘制(gbuffer)，然后将绘制的结果作为一张贴图绘制到真实场景中(lightBuffer)
    outputGBuffer(() => {
      regl.clear({
        color: [0, 0, 0, 255],
        depth: 1
      });
      //确保图像加载完成后才开始绘制几何对象
      if(isLoaded==2) {
        drawGeometry();
      }
    });
    drawDirectionalLight();
    drawPointLights(tick);
  })

  camera.tick();
})