import fit from 'canvas-fit';
import reglObject from 'regl';
import mat4 from 'gl-mat4';
import bunny from 'bunny';
import normals from 'angle-normals';
import orbitCamera from 'canvas-orbit-camera';

//获取canvas对象
const webglCanvas = document.getElementById('webgl');
//初始化regl对象
const regl = reglObject({
  canvas: webglCanvas,
  extensions: 'oes_texture_float'//引入浮点纹理插件
});


window.addEventListener('resize', fit(webglCanvas), false);

//初始化相机并配置相关参数
const camera = orbitCamera(webglCanvas);
var eye = [0.0,28.0,28.0];
var center = [0.0,0.0,0.0];
var up = [0.0,1.0,0.0];
camera.lookAt(eye,center,up);
camera.zoom(10.0); // 10.0

//灯光的位置
const lightPos = [0.0, 12.0,3.0];
//阴影贴图分辨率
var SHADOW_RES = 2048;

//创建帧缓冲
const fbo = regl.framebuffer({
  color: regl.texture({
    width: SHADOW_RES,
    height: SHADOW_RES,
    wrap: 'clamp',
    type: 'float'
  }),
  depth: true
});

//箱子的顶点数据
var cubePosition = [
               [1.0, 1.0, 1.0], [-1.0, 1.0, 1.0], [-1.0, -1.0, 1.0], [1.0, -1.0, 1.0], // v0-v1-v2-v3 front
               [1.0, 1.0, 1.0], [1.0, -1.0, 1.0], [1.0, -1.0, -1.0], [1.0, 1.0, -1.0], // v0-v3-v4-v5 right
               [1.0, 1.0, 1.0], [1.0, 1.0, -1.0], [-1.0, 1.0, -1.0], [-1.0, 1.0, 1.0], // v0-v5-v6-v1 up
               [-1.0, 1.0, 1.0], [-1.0, 1.0, -1.0], [-1.0, -1.0, -1.0], [-1.0, -1.0, 1.0], // v1-v6-v7-v2 left
               [-1.0, -1.0, -1.0], [1.0, -1.0, -1.0], [1.0, -1.0, 1.0], [-1.0, -1.0, 1.0], // v7-v4-v3-v2 down
               [1.0, -1.0, -1.0], [-1.0, -1.0, -1.0],[-1.0, 1.0, -1.0], [1.0, 1.0, -1.0]  // v4-v7-v6-v5 back
                   ];

var cubeUv = [
               [1.0, 1.0], [0.0, 1.0], [0.0, 0.0], [1.0, 0.0],    // v0-v1-v2-v3 front
               [0.0, 1.0], [0.0, 0.0], [1.0, 0.0], [1.0, 1.0],    // v0-v3-v4-v5 right
               [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0],    // v0-v5-v6-v1 up
               [1.0, 1.0], [0.0, 1.0], [0.0, 0.0], [1.0, 0.0],    // v1-v6-v7-v2 left
               [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0],    // v7-v4-v3-v2 down
               [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]     // v4-v7-v6-v5 back
             ];

const cubeElements = [
              [0, 1, 2], [0, 2, 3],    // front
              [4, 5, 6], [4, 6, 7],    // right
              [8, 9, 10], [8, 10, 11],    // up
              [12, 13, 14], [12, 14, 15],    // left
              [16, 17, 18], [16, 18, 19],    // down
              [20, 21, 22], [20, 22, 23]     // back
            ];
const cubeNormals =[
            [0.0, 0.0, 1.0], [0.0, 0.0, 1.0], [0.0, 0.0, 1.0], [0.0, 0.0, 1.0],  // v0-v1-v2-v3 front
            [1.0, 0.0, 0.0], [1.0, 0.0, 0.0], [1.0, 0.0, 0.0], [1.0, 0.0, 0.0],  // v0-v3-v4-v5 right
            [0.0, 1.0, 0.0], [0.0, 1.0, 0.0], [0.0, 1.0, 0.0], [0.0, 1.0, 0.0],  // v0-v5-v6-v1 up
            [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0],  // v1-v6-v7-v2 left
            [0.0, -1.0, 0.0], [0.0, -1.0, 0.0], [0.0, -1.0, 0.0], [0.0, -1.0, 0.0],  // v7-v4-v3-v2 down
            [0.0, 0.0, -1.0], [0.0, 0.0, -1.0], [0.0, 0.0, -1.0], [0.0, 0.0, -1.0]   // v4-v7-v6-v5 back
            ];
//地板的顶点数据
var planeVertices = [[3.0, 0, 2.5], [-3.0, 0, 2.5], [-3.0, 0, -2.5], [3.0, 0, -2.5]];    // v0-v1-v2-v3
var planeNormals = [[0.0, 0.0, 1.0],[0.0, 0.0, 1.0],[0.0, 0.0, 1.0],[0.0, 0.0, 1.0]];
var planeTexCoords = [[0.0, 1.0],[0.0, 0.0],[1.0, 0.0],[1.0, 1.0]];
var planeIndices = [[0, 1, 2], [0, 2, 3]];

//避免图片因异步加载而造成绘制的时候拿不到数据,用isLoad做标记
var isLoaded = 0;
var image1 = new Image();
image1.src = 'images/container2.png';
var imageTexture1 = null;
image1.onload = function () {
   imageTexture1 = regl.texture(image1);
   isLoaded++;
};
var image2 = new Image();
image2.src = 'images/wood.png';
var imageTexture2 = null;
image2.onload = function () {
   imageTexture2 = regl.texture(image2);
   isLoaded++;
};

//全局的mvp矩阵
const globalScope = regl({
  uniforms: {
    lightDir: lightPos,
    lightView: (context) => {
      return mat4.lookAt([], lightPos, [0.0, 0.0, 0.0], [0.0, 1.0, 0.0])
    },
    lightProjection: mat4.ortho([], -25, 25, -20, 20, -25, 25)//定向光源
  }
})

//从光源处看整个场景，获取这一状态下的深度贴图，记录深度信息，供正常绘制过程中判断片元是否处于阴影中
const drawFromLight = regl({
  frag:`
    #ifdef GL_ES
          precision mediump float;
          #endif
          vec4 pack (float depth) {
            // 当光源与照射物间距离变远,z值会增大,而1个分量的8位已经不够存储深度值,所以扩充使用4个分量共32位进行存储
            // 使用rgba 4字节共32位来存储z值,1个字节精度为1/256
            const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
            const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
            // gl_FragCoord:片元的坐标,fract():返回数值的小数部分
            vec4 rgbaDepth = fract(depth * bitShift); //计算每个点的z值 
            rgbaDepth -= rgbaDepth.gbaa * bitMask; // Cut off the value which do not fit in 8 bits
            return rgbaDepth;
          }
          void main() {
            gl_FragColor = pack(gl_FragCoord.z); // Write the z-value in R
          }
  `,
  vert: `
  precision mediump float;
  attribute vec3 position;
  uniform mat4 lightProjection, lightView, model;
  varying vec3 vPosition;
  void main() {
    /*vec4 p = lightProjection * lightView * model * vec4(position, 1.0);
    gl_Position = p;
    vPosition = p.xyz;*/
    gl_Position = lightProjection * lightView * model * vec4(position, 1.0);
  }`,
  framebuffer: fbo
})

//从眼睛所处的位置绘制场景
const drawFromEye = regl({
  uniforms: {
    view: () => camera.view(),
    projection: ({viewportWidth, viewportHeight}) =>
      mat4.perspective([],
                       Math.PI / 4,
                       viewportWidth / viewportHeight,
                       0.01,
                       2000),
    shadowMap: fbo
  },
  vert:`  attribute vec3 position;
          attribute vec3 normal;
          attribute vec2 uv;
          uniform mat4 projection, view, model;
          uniform mat4 lightProjection, lightView;
          uniform mat4 normalMatrix;
          varying vec4 v_PositionFromLight;
          varying vec3 v_Position;
          varying vec3 v_Normal;
          varying vec2 v_texCoord;
          void main() {
            //gl_Position = u_MvpMatrix * a_Position;
            gl_Position = projection * view * model * vec4(position,1.0);
            vec4 v1 = normalMatrix*vec4(normal,1.0);
            v_Normal = normalize(vec3(v1));
            v_Position = vec3(model * vec4(position,1.0));
            v_PositionFromLight = lightProjection * lightView * model * vec4(position,1.0);
            v_texCoord = uv;
          }`,
  frag:`#ifdef GL_ES
            precision mediump float;
           #endif
            uniform sampler2D shadowMap;
            uniform vec3 u_lightPosition;
            uniform vec3 u_viewPosition;
            uniform vec3 u_lightColor;
            uniform vec3 u_ambientColor;
            varying vec4 v_PositionFromLight;
            varying vec3 v_Position;
            varying vec3 v_Normal;
            varying vec2 v_texCoord;

            uniform sampler2D tex;
            /**
            *释放深度值z
            */
            float unpack(const in vec4 rgbaDepth){
              const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
              float depth = dot(rgbaDepth, bitShift);
              return depth;
            }
            void main() {
               vec3 normal = normalize(v_Normal);
               vec3 lightDirection = normalize(u_lightPosition -v_Position.xyz);
               float cosTheta = max(dot(lightDirection, normal), 0.0);
              // 计算环境光亮度
              vec3 ambient = u_ambientColor * texture2D(tex,v_texCoord).rgb;
              //计算漫反射光

              vec3 diffuse = vec3(0.5,0.5,0.5) * cosTheta * texture2D(tex, v_texCoord).rgb;
              /**
                * 高光部分
              */
             float shininess =8.0;
             vec3 specularColor =vec3(1.0, 1.0, 1.0);//镜面反射光颜色
             vec3 viewDirection = normalize(u_viewPosition-v_Position.xyz);// 反射方向

             // phong 冯氏模型 高光部分更加集中
             //vec3 reflectionDirection = reflect(-lightDirection, normal);
             //float specularWeighting = pow(max(dot(reflectionDirection, viewDirection), 0.0), shininess);

              // Blinn-Phong 冯布林模型 高光过渡更加自然
               vec3 halfwayDir = normalize(lightDirection + viewDirection);
               float specularWeighting = pow(max(dot(normal, halfwayDir), 0.0), shininess);

              // 计算镜面高光亮度
              vec3 specular = specularColor.rgb * specularWeighting;
              //gl_FragColor = vec4((spotLight + ambient + specular), v_color.a);
              // 消除马赫带
               //float bias = 1.0/1023.0;
               float bias = max(0.05 * (1.0 - dot(normal, lightDirection)), 0.0005);
               //z要转换到0,1范围内
               vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;
               float shadows = 0.0;
               float opacity = 0.7;
               float texelSize = 1.0/2048.0;
               vec4 rgbaDepth;
               //PCF重采样
               for(float y=-1.5; y <= 1.5; y+=1.0){
                  for(float x=-1.5; x <=1.5; x += 1.0){
                     rgbaDepth = texture2D(shadowMap, shadowCoord.xy+vec2(x,y)*texelSize);
                     shadows += shadowCoord.z-bias > unpack(rgbaDepth) ? 1.0 : 0.0;
                  }
                }
                shadows = shadows/12.0;
                //在超过1.0后，阴影为0
                if(shadowCoord.z > 1.0)
                   shadows = 1.0;
                float visibility = min(opacity+(1.0-shadows), 1.0);
                specular=visibility < 1.0 ? vec3(0.0, 0.0, 0.0): specular;// 阴影处没有高光
                gl_FragColor = vec4((diffuse +ambient +specular) * visibility, 1.0);
            }
          `
});


//将所有需要绘制的物体当成mesh进行绘制，构造函数传入attributes数据
var Mesh = function(elements, position, normal, uv,texture){
    this.elements = elements;
    this.position = position;
    this.normal = normal;
    this.uv = uv;
    this.tex = texture;
};

//绘制函数
Mesh.prototype.draw = regl({
  uniforms: {
    model: (_, props, batchId) => {
      //初始化一个矩阵
      var m = mat4.identity([])  
      mat4.translate(m, m, props.translate)
      var s = props.scale
      mat4.scale(m, m, [s, s, s]);
      mat4.rotateX(m,m,props.rotate[0]);
      mat4.rotateY(m,m,props.rotate[1]);
      mat4.rotateY(m,m,props.rotate[2]);
      
      return m
    },
    normalMatrix:(_, props, batchId)=>{
      //初始化一个矩阵
      var m = mat4.identity([])
      mat4.translate(m, m, props.translate)
      var s = props.scale
      mat4.scale(m, m, [s, s, s]);
      mat4.rotateX(m,m,props.rotate[0]);
      mat4.rotateY(m,m,props.rotate[1]);
      mat4.rotateY(m,m,props.rotate[2]);
      mat4.invert(m,m);
      mat4.transpose(m,m);
      return m;
    },
    u_ambientColor: [0.3,0.3,0.3],
    u_lightColor:[1.0,1.0,1.0],
    u_lightPosition:lightPos,
    u_viewPosition:eye,

    tex: regl.this('tex')
  },
  attributes: {
    position: regl.this('position'),
    normal: regl.this('normal'),
    uv:regl.this('uv')
  },
  elements: regl.this('elements'),
  cull: {
    enable: true
  }
});

//构建箱子和地板对象
var cube = new Mesh(cubeElements,cubePosition,cubeNormals,cubeUv);
var plane = new Mesh(planeIndices,planeVertices,planeNormals,planeTexCoords);

regl.frame(({tick}) => {
  var drawScene = () => {
    regl.clear({
      color: [0, 0, 0, 255],
      depth: 1
    })
    if(isLoaded == 2){
      cube.tex = imageTexture1;
      plane.tex = imageTexture2;
      //绘制箱子和地板
      cube.draw({scale: 1.0, translate: [0.0, 3.0, 0],rotate:[0,0,0]});
      cube.draw({scale: 0.5, translate: [2.0, 15.0, 0],rotate:[45,0,0]});
      cube.draw({scale: 1.5, translate: [-5.0, 3.0, 3],rotate:[0,0,45]});
      cube.draw({scale: 2.0, translate: [4.0, 10.0, -3.0],rotate:[60,0,45]});
      plane.draw({scale: 8.0, translate: [0.0, 0.0, 0.0],rotate:[180,0,0]});
    }
  };

  globalScope(() => {
    drawFromLight(drawScene);
    drawFromEye(drawScene);
  });
  camera.tick();
});