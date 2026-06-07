<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let particles: Particle[] = []
let mouseX = 0
let mouseY = 0
let backgroundCanvas: HTMLCanvasElement | null = null

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  hue: number
}

function createBackgroundCanvas(width: number, height: number): HTMLCanvasElement {
  const bgCanvas = document.createElement('canvas')
  bgCanvas.width = width
  bgCanvas.height = height
  const bgCtx = bgCanvas.getContext('2d')
  if (bgCtx) {
    const gradient = bgCtx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#070707')
    gradient.addColorStop(0.5, '#0a0a0a')
    gradient.addColorStop(1, '#070707')
    bgCtx.fillStyle = gradient
    bgCtx.fillRect(0, 0, width, height)
  }
  return bgCanvas
}

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 设置画布大小
  function resize() {
    canvas!.width = window.innerWidth
    canvas!.height = window.innerHeight
    backgroundCanvas = createBackgroundCanvas(canvas!.width, canvas!.height)
  }
  resize()
  window.addEventListener('resize', resize)

  // 初始化粒子
  const particleCount = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000))
  particles = Array.from({ length: particleCount }, () => createParticle(canvas!))

  // 鼠标移动
  function onMouseMove(e: MouseEvent) {
    mouseX = e.clientX
    mouseY = e.clientY
  }
  window.addEventListener('mousemove', onMouseMove)

  // 动画循环
  function animate() {
    // 清除画布并绘制静态背景
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
    if (backgroundCanvas) {
      ctx!.drawImage(backgroundCanvas, 0, 0)
    }

    // 更新和绘制粒子
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      // 鼠标引力
      const dx = mouseX - p.x
      const dy = mouseY - p.y
      const distSq = dx * dx + dy * dy
      if (distSq < 40000) {
        const dist = Math.sqrt(distSq)
        const force = (200 - dist) / 200 * 0.02
        p.vx += dx * force * 0.01
        p.vy += dy * force * 0.01
      }

      // 更新位置
      p.x += p.vx
      p.y += p.vy

      // 边界反弹
      if (p.x < 0 || p.x > canvas!.width) p.vx *= -1
      if (p.y < 0 || p.y > canvas!.height) p.vy *= -1

      // 限制在画布内
      p.x = Math.max(0, Math.min(canvas!.width, p.x))
      p.y = Math.max(0, Math.min(canvas!.height, p.y))

      // 绘制粒子
      ctx!.beginPath()
      ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx!.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.opacity})`
      ctx!.fill()

      // 绘制连线
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j]
        const dx2 = p.x - p2.x
        const dy2 = p.y - p2.y
        const dist2Sq = dx2 * dx2 + dy2 * dy2

        if (dist2Sq < 22500) {
          const dist2 = Math.sqrt(dist2Sq)
          const alpha = (1 - dist2 / 150) * 0.15
          ctx!.strokeStyle = `hsla(${(p.hue + p2.hue) / 2}, 70%, 55%, ${alpha})`
          ctx!.lineWidth = 0.5
          ctx!.beginPath()
          ctx!.moveTo(p.x, p.y)
          ctx!.lineTo(p2.x, p2.y)
          ctx!.stroke()
        }
      }
    }

    animationId = requestAnimationFrame(animate)
  }

  animate()

  // 清理函数
  onUnmounted(() => {
    if (animationId) cancelAnimationFrame(animationId)
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMouseMove)
  })
}

function createParticle(canvas: HTMLCanvasElement): Particle {
  // 霓虹色相：洋红(350)、青(195)、蓝(240) 之间
  const hues = [350, 195, 240, 320, 180]
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    radius: Math.random() * 2 + 1,
    opacity: Math.random() * 0.5 + 0.3,
    hue: hues[Math.floor(Math.random() * hues.length)]
  }
}

onMounted(() => {
  initCanvas()
})
</script>

<template>
  <canvas ref="canvasRef" class="particle-canvas" />
</template>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
