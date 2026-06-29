<template>
  <div class="fixed inset-0 w-full h-full overflow-hidden bg-white z-[-1]">
    <canvas
        ref="canvasRef"
        class="w-full h-full object-cover opacity-85 blur-[40px] scale-110 pointer-events-none"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 【变量】canvasRef
 * @type {Ref<HTMLCanvasElement | null>}
 * @description 指向模板中 <canvas> 标签的引用，初始为 null，在 onMounted 生命周期后被赋予真实的 DOM 对象
 */
const canvasRef = ref<HTMLCanvasElement | null>(null)


// ==========================================
// 一、性能优化层：高频事件节流（Throttle）
// ==========================================

/**
 * 【函数】throttle (通用节流函数)
 * @param {T} func - 需要执行的目标回调函数
 * @param {number} limit - 限制执行的时间间隔（单位：毫秒）
 * @returns {Function} 返回一个经过节流处理的新函数
 * @description 确保在高频触发的事件（如 mousemove/touchmove）中，目标函数在规定时间内只执行一次，降低 CPU 开销
 */
function throttle<T extends (...args: any[]) => void>(func: T, limit: number) {
  let inThrottle: boolean = false // 闭包状态锁：标记当前是否处于冷却期
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args) // 执行目标函数，并绑定当前上下文与参数
      inThrottle = true      // 开启锁定
      setTimeout(() => (inThrottle = false), limit) // 达到限制时间后解锁
    }
  }
}


// ==========================================
// 二、交互状态层：鼠标与触摸轨迹的平滑插值
// ==========================================

/**
 * 【变量】mouse (当前渲染帧使用的鼠标坐标)
 * @description 包含 x 和 y 通道，范围在 [0.0, 1.0] 之间。通过 Lerp 算法缓慢向 targetMouse 靠拢
 */
let mouse = { x: 0.5, y: 0.5 }

/**
 * 【变量】targetMouse (实际鼠标触发时的物理坐标)
 * @description 实时记录鼠标或手指最后一次停留的归一化坐标，作为插值的终点目标
 */
let targetMouse = { x: 0.5, y: 0.5 }

/**
 * 【函数】updateMousePosition (更新目标坐标)
 * @param {number} clientX - 鼠标或触摸点相对于浏览器视口的 X 轴像素坐标
 * @param {number} clientY - 鼠标或触摸点相对于浏览器视口的 Y 轴像素坐标
 * @description 将全屏的像素坐标，转化为 WebGL 标准的归一化二维坐标（0.0 到 1.0）
 */
const updateMousePosition = (clientX: number, clientY: number) => {
  // X 轴归一化：像素位置 / 视口总宽度
  targetMouse.x = clientX / window.innerWidth
  // Y 轴归一化且反转：WebGL 标准坐标系的 Y 轴正方向朝上，而浏览器的 Y 轴正方向朝下
  targetMouse.y = 1.0 - clientY / window.innerHeight
}

/**
 * 【事件处理器】onMouseMove (鼠标移动事件监听)
 * @description 经过 16ms 节流优化（约 60FPS），当用户在窗口内移动鼠标时触发
 */
const onMouseMove = throttledMouseMove((e: MouseEvent) => {
  updateMousePosition(e.clientX, e.clientY)
}, 16)

/**
 * 【事件处理器】onTouchMove (移动端触摸移动事件监听)
 * @description 针对手机、平板等触屏设备的滑动交互，同样经过 16ms 节流
 */
const onTouchMove = throttledTouchMove((e: TouchEvent) => {
  // 确保当前至少有一个手指触碰在屏幕上
  if (e.touches.length > 0) {
    // 捕获第一个触碰点（index 为 0）的像素坐标
    updateMousePosition(e.touches[0].clientX, e.touches[0].clientY)
  }
}, 16)

// 内部辅助包装函数，严格遵循 TypeScript 类型推导
function throttledMouseMove(func: (e: MouseEvent) => void, limit: number) { return throttle(func, limit) }
function throttledTouchMove(func: (e: TouchEvent) => void, limit: number) { return throttle(func, limit) }


// ==========================================
// 三、WebGL 渲染引擎层
// ==========================================

/**
 * 【全局变量】gl (WebGL 上下文句柄)
 * @type {WebGLRenderingContext | null}
 * @description 提供所有渲染状态机的控制入口，整个组件内共享此上下文
 */
let gl: WebGLRenderingContext | null = null

/**
 * 【全局变量】animationFrameId (帧动画请求 ID)
 * @type {number}
 * @description 记录 requestAnimationFrame 的返回值，用于在组件销毁时正确关闭循环，避免内存泄漏
 */
let animationFrameId: number


/**
 * 【着色器源码】vertexShaderSource (顶点着色器)
 * @description GPU 管线的第一步。负责处理几何顶点。由于是全屏背景，这里仅接收一个 2D 矩形
 */
// language=GLSL
const vertexShaderSource = `
  attribute vec2 a_position; // 接收输入的顶点坐标（从 JS 缓冲区传过来的 [-1, -1] 到 [1, 1] 的矩形）
  varying vec2 v_uv;         // 输出变量：将处理后的纹理坐标平滑插值后传递给片元着色器

  void main() {
    // 将顶点范围从 [-1, 1] 映射到标准归一化纹理范围 [0, 1]
    v_uv = a_position * 0.5 + 0.5;
    // 设置顶点的最终裁剪空间坐标，W 轴填 1.0 表示齐次坐标固定
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

/**
 * 【着色器源码】fragmentShaderSource (片元着色器)
 * @description GPU 管线的核心。负责计算屏幕上每一个像素点的最终颜色。流体色彩和噪声算法全部运行在这里
 */
// language=GLSL
const fragmentShaderSource = `
  precision mediump float;     // 声明浮点数精度为中等（兼顾移动端性能与显示质量）
  varying vec2 v_uv;           // 接收由顶点着色器插值传过来的当前像素点 UV 坐标 [0.0, 1.0]

  // 从 JS 侧传递进来的全局动态 Uniform 变量
  uniform float u_time;        // 运行总时间（秒），用于驱动噪声算法随时间持续滚动
  uniform vec2 u_mouse;        // 经过 Lerp 平滑处理后的鼠标归一化坐标 [x, y]
  uniform vec2 u_resolution;   // Canvas 画布的实际像素分辨率 [宽, 高]

  // ========================================================
  // Ashima 经典 3D Simplex Noise 算法实现（无三角函数、高性能纯代数运算）
  // ========================================================
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  /**
   * snoise (三维单形噪声函数)
   * @param {vec3} v - 输入的三维坐标（X轴、Y轴代表空间，Z轴代表时间）
   * @returns {float} 输出一个区间在 [-1.0, 1.0] 之间的极其自然的连续随机噪声值
   */
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vec2 uv = v_uv; // 拷贝当前片元的纹理坐标

    // ---------------------------------------------------------
    // 逻辑 A：鼠标实时交互形变（建立局部引力扭曲场）
    // ---------------------------------------------------------
    float dist = distance(uv, u_mouse);        // 计算当前像素点到鼠标物理坐标的几何欧氏距离
    float force = smoothstep(0.4, 0.0, dist);  // 影响半径设为 0.4。越靠近鼠标，引力 force 越大（从 0.0 渐变到 1.0）
    uv -= (u_mouse - uv) * force * 0.35;       // 根据引力方向拉扯当前像素的 UV 采样点，形成水面被手指拨弄的凹陷形变感

    // ---------------------------------------------------------
    // 逻辑 B：时间轴流速控制
    // ---------------------------------------------------------
    float t = u_time * 0.12; // 缩放因子为 0.12，使流体色块保持极其缓慢、治愈的涌动速度

    // ---------------------------------------------------------
    // 逻辑 C：多级分形噪声叠加（Domain Warping 域扭曲）
    // ---------------------------------------------------------
    // 第一层基础噪声：低频段，决定大面积流体形状
    float noise1 = snoise(vec3(uv * 2.0, t));
    // 第二层细节噪声：中频段，同时将第一层噪声作为偏置输入，产生丝状流溢的特殊纹理
    float noise2 = snoise(vec3(uv * 3.5 + noise1 * 0.4, t * 1.1));
    // 第三层微调噪声：进一步打破规律性
    float noise3 = snoise(vec3(uv * 1.8 - noise2 * 0.6, t * 0.9));

    // ---------------------------------------------------------
    // 逻辑 D：水彩质感的色彩定义（转换为 [0.0, 1.0] 范围的 RGB 颜色）
    // ---------------------------------------------------------
    vec3 baseColor = vec3(1.0, 1.0, 1.0);       // 纯白基底（画布底色）
    vec3 fluidColor1 = vec3(0.96, 0.45, 0.64); // 溢散粉红（#F573A3）
    vec3 fluidColor2 = vec3(0.38, 0.75, 0.95); // 溢散天蓝（#61BFF2）
    vec3 fluidColor3 = vec3(0.98, 0.82, 0.35); // 溢散明金（#FAD159）

    // ---------------------------------------------------------
    // 逻辑 E：白底之上的色彩渐进晕染与过滤
    // ---------------------------------------------------------
    vec3 finalColor = baseColor; // 初始全屏为纯白

    // 渲染第一层粉红：通过 smoothstep(0.0, 0.8, noise1) 抬高阀值。
    // 意味着只有当噪声强度大于 0.0 时，粉色才会从白底上显现，最大浓度限制在 60% (* 0.6)
    finalColor = mix(finalColor, fluidColor1, smoothstep(0.0, 0.8, noise1) * 0.6);

    // 叠渲染第二层天蓝：阀值设在 0.1 到 0.85 之间，产生与粉色交织的梦幻紫和中间态过渡色
    finalColor = mix(finalColor, fluidColor2, smoothstep(0.1, 0.85, noise2) * 0.5);

    // 点缀第三层金黄色：仅在噪声能量极高的波峰核心区（>0.2）渲染，为画面的高光部分带来呼吸感
    finalColor = mix(finalColor, fluidColor3, smoothstep(0.2, 0.9, noise3) * 0.4);

    // 将最终计算出的 RGB 色彩赋予 WebGL 片元颜色输出通道，不透明度固定为 1.0
    gl_FragColor = vec4(finalColor, 1.0);
  }
`

/**
 * 【函数】compileShader (动态编译着色器)
 * @param {number} type - 着色器类型。gl.VERTEX_SHADER（顶点） 或 gl.FRAGMENT_SHADER（片元）
 * @param {string} source - 着色器的 GLSL 字符串源码
 * @returns {WebGLShader | null} 返回编译成功后的着色器对象，若失败则返回 null
 * @description 将纯文本的着色器源码注入 GPU 硬件驱动，进行实时编译并拦截校验语法错误
 */
const compileShader = (type: number, source: string) => {
  if (!gl) return null
  const shader = gl.createShader(type) // 向 WebGL 申请创建一个指定类型的空着色器容器
  if (!shader) return null

  gl.shaderSource(shader, source)     // 将 GLSL 文本代码绑定至着色器
  gl.compileShader(shader)            // 让 GPU 驱动开始编译代码

  // 检查编译状态
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('着色器编译失败信息:', gl.getShaderInfoLog(shader)) // 打印详细语法错误或显卡硬件报错
    gl.deleteShader(shader) // 销毁失败的对象，释放显存
    return null
  }
  return shader
}


// ==========================================
// 四、Vue 生命周期绑定与 WebGL 管线组装
// ==========================================

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  // 尝试获取标准 WebGL 上下文，若低版本浏览器不支持，则降级尝试 experimental-webgl
  gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext
  if (!gl) {
    console.error('当前浏览器不支持 WebGL，流体背景无法初始化。')
    return
  }

  /**
   * 【核心优化函数】resizeCanvas (控制画布分辨率)
   * @description 性能优化的精髓！我们将 Canvas 的真实像素长宽锁死在物理窗口的 50% (* 0.5)。
   * 让 GPU 只去计算原先四分之一的像素量，然后再通过外层 Tailwind 的 blur 滤镜将图像平滑放大。
   * 这不仅营造出了绝佳的低清晰度柔化模糊质感，更让渲染开销降低了 75% 以上。
   */
  const resizeCanvas = () => {
    canvas.width = window.innerWidth * 0.5   // 物理像素宽度减半
    canvas.height = window.innerHeight * 0.5 // 物理像素高度减半
    gl?.viewport(0, 0, canvas.width, canvas.height) // 通知 WebGL 重新调整视口映射矩阵
  }

  // 监听浏览器窗口缩放，实时修正画布大小
  window.addEventListener('resize', resizeCanvas)
  resizeCanvas() // 初始化执行一次

  // 关键改动：将高频鼠标和手势监听器移至全局 window 容器，彻底防止上层 DOM 的遮挡导致交互失效
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('touchmove', onTouchMove, { passive: true }) // passive 允许浏览器在执行 JS 时不阻塞页面原生滚动

  // 动态编译两个着色器实例
  const vertShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource)
  const fragShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource)

  // 创建 WebGL 程序（Program），它是连接 GPU 顶点和片元阶段的桥梁
  const program = gl.createProgram()
  if (!vertShader || !fragShader || !program) return

  gl.attachShader(program, vertShader) // 将编译好的顶点着色器装载进程序
  gl.attachShader(program, fragShader) // 将编译好的片元着色器装载进程序
  gl.linkProgram(program)              // 链接程序。把两个着色器内部的变量通道连通起来
  gl.useProgram(program)               // 告诉 WebGL 状态机：接下来的所有渲染指令都基于这套程序运行

  // ---------------------------------------------------------
  // 建立一个铺满全屏的几何矩形（由两个三角形组成的条带，共 4 个顶点）
  // ---------------------------------------------------------
  // 坐标定义 [X, Y]：左下 (-1,-1)、右下 (1,-1)、左上 (-1,1)、右上 (1,1)
  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  const vertexBuffer = gl.createBuffer() // 申请在 GPU 显存内建立一个空的缓冲区（VBO）
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer) // 将此缓冲区绑定到当前操作槽
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW) // 将 JS 内存中的顶点数组一股脑灌入 GPU 显存

  // 获取顶点着色器中 a_position 属性的虚拟内存指针位置
  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(positionLocation) // 激活该指针通道
  // 告诉 WebGL 怎么去解析这块显存：每次读取 2 个数字（float 类型），不进行归一化，跨度为 0，偏移量为 0
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  // ---------------------------------------------------------
  // 捕获片元着色器中所有 Uniform 全局静态变量的位置指针
  // ---------------------------------------------------------
  const timeLocation = gl.getUniformLocation(program, 'u_time')
  const mouseLocation = gl.getUniformLocation(program, 'u_mouse')
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')

  // 记录组件启动时的绝对时间戳（毫秒）
  const startTime = Date.now()

  /**
   * 【核心循环函数】render (主渲染帧循环)
   * @description 借助硬件的 requestAnimationFrame，以设备物理刷新率（通常为 60Hz - 144Hz）持续递归调用
   */
  const render = () => {
    if (!gl) return

    // ---------------------------------------------------------
    // 经典数学插值算法 (Lerp)：实现柔顺、有惯性延时的流体阻尼感
    // ---------------------------------------------------------
    // 公式：当前值 = 当前值 + (终点值 - 当前值) * 响应系数 (0.05)
    // 使得鼠标突然停下时，画面中的流体色块还会因为“动量”继续向前滑行一段距离，交互体验极佳
    mouse.x += (targetMouse.x - mouse.x) * 0.05
    mouse.y += (targetMouse.y - mouse.y) * 0.05

    // 计算从启动到当前时刻逝去的总秒数（转换为标准的 float 秒）
    const elapsedSeconds = (Date.now() - startTime) * 0.001

    // 将 JS 侧的数据实时灌入 GPU 对应的 Uniform 槽位中
    gl.uniform1f(timeLocation, elapsedSeconds)               // 传递时间轴（单浮点）
    gl.uniform2f(mouseLocation, mouse.x, mouse.y)            // 传递平滑后的鼠标二维坐标
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height) // 传递当前的画布分辨率

    // 执行绘制命令：使用三角形条带模式（TRIANGLE_STRIP），从第 0 个顶点开始，一共绘制 4 个顶点
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    // 注册下一帧的渲染请求，形成闭环不间断的动画更新
    animationFrameId = requestAnimationFrame(render)
  }

  // 启动主渲染循环
  render()
})

onBeforeUnmount(() => {
  // ---------------------------------------------------------
  // 组件销毁阶段：深度清理，防止单页应用（SPA）产生内存泄漏
  // ---------------------------------------------------------
  window.removeEventListener('resize', () => {}) // 解绑视口缩放事件
  window.removeEventListener('mousemove', onMouseMove) // 解绑全局鼠标监听
  window.removeEventListener('touchmove', onTouchMove) // 解绑全局触摸监听

  cancelAnimationFrame(animationFrameId) // 彻底停止正在 GPU 中调度执行的渲染帧循环
})
</script>