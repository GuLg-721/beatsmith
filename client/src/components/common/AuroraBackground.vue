<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let mouseX = 0
let mouseY = 0

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  hue: number
  life: number
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let width = 0
  let height = 0
  let time = 0
  let particles: Particle[] = []

  function resize() {
    width = canvas!.width = window.innerWidth
    height = canvas!.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  function onMouseMove(e: MouseEvent) {
    mouseX = e.clientX
    mouseY = e.clientY
  }
  window.addEventListener('mousemove', onMouseMove)

  // 生成粒子
  function spawnParticle(): Particle {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.5 - 0.1,
      radius: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      hue: [350, 280, 220, 195, 320][Math.floor(Math.random() * 5)],
      life: 0
    }
  }

  // 初始化粒子
  for (let i = 0; i < 60; i++) {
    particles.push(spawnParticle())
  }

  // 极光色彩
  const auroraColors = [
    { h: 350, s: 70, l: 50 },
    { h: 280, s: 60, l: 45 },
    { h: 220, s: 55, l: 40 },
    { h: 195, s: 65, l: 50 },
    { h: 320, s: 50, l: 45 },
  ]

  function animate() {
    time += 0.004

    // 深色背景
    ctx!.fillStyle = 'rgb(6, 6, 12)'
    ctx!.fillRect(0, 0, width, height)

    // 绘制网格线（科技感）
    ctx!.strokeStyle = 'rgba(100, 60, 180, 0.06)'
    ctx!.lineWidth = 0.5
    const gridSize = 60
    const gridOffset = (time * 20) % gridSize

    for (let x = -gridSize + gridOffset; x < width + gridSize; x += gridSize) {
      ctx!.beginPath()
      ctx!.moveTo(x, 0)
      ctx!.lineTo(x, height)
      ctx!.stroke()
    }
    for (let y = -gridSize + gridOffset; y < height + gridSize; y += gridSize) {
      ctx!.beginPath()
      ctx!.moveTo(0, y)
      ctx!.lineTo(width, y)
      ctx!.stroke()
    }

    // 绘制极光层
    for (let i = 0; i < auroraColors.length; i++) {
      const color = auroraColors[i]
      const y = height * 0.35 + Math.sin(time + i * 1.2) * height * 0.15
      const amplitude = height * 0.12

      ctx!.beginPath()
      ctx!.moveTo(0, y)

      for (let x = 0; x <= width; x += 15) {
        const wave1 = Math.sin(x * 0.004 + time + i) * amplitude
        const wave2 = Math.sin(x * 0.008 + time * 1.5 + i * 0.5) * amplitude * 0.4
        const wave3 = Math.cos(x * 0.002 + time * 0.8 + i * 2) * amplitude * 0.3
        ctx!.lineTo(x, y + wave1 + wave2 + wave3)
      }

      ctx!.lineTo(width, height)
      ctx!.lineTo(0, height)
      ctx!.closePath()

      const gradient = ctx!.createLinearGradient(0, y - amplitude, 0, y + amplitude * 3)
      const h = color.h + Math.sin(time * 0.5 + i) * 15
      gradient.addColorStop(0, `hsla(${h}, ${color.s}%, ${color.l}%, 0)`)
      gradient.addColorStop(0.2, `hsla(${h}, ${color.s}%, ${color.l}%, 0.1)`)
      gradient.addColorStop(0.5, `hsla(${h}, ${color.s}%, ${color.l}%, 0.05)`)
      gradient.addColorStop(1, `hsla(${h}, ${color.s}%, ${color.l}%, 0)`)

      ctx!.fillStyle = gradient
      ctx!.fill()
    }

    // 更新和绘制粒子
    particles.forEach((p, i) => {
      p.life += 0.01

      // 鼠标引力
      const dx = mouseX - p.x
      const dy = mouseY - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 180) {
        const force = (180 - dist) / 180 * 0.015
        p.vx += dx * force * 0.008
        p.vy += dy * force * 0.008
      }

      p.x += p.vx
      p.y += p.vy

      // 边界处理
      if (p.y < -10 || p.x < -10 || p.x > width + 10) {
        particles[i] = spawnParticle()
        particles[i].y = height + 10
      }

      // 绘制粒子
      const alpha = p.opacity * (1 - p.life * 0.3)
      if (alpha > 0) {
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx!.fillStyle = `hsla(${p.hue}, 70%, 60%, ${alpha})`
        ctx!.fill()
      }
    })

    // 扫描线效果
    const scanY = (time * 80) % height
    const scanGradient = ctx!.createLinearGradient(0, scanY - 2, 0, scanY + 2)
    scanGradient.addColorStop(0, 'rgba(100, 60, 220, 0)')
    scanGradient.addColorStop(0.5, 'rgba(100, 60, 220, 0.06)')
    scanGradient.addColorStop(1, 'rgba(100, 60, 220, 0)')
    ctx!.fillStyle = scanGradient
    ctx!.fillRect(0, scanY - 2, width, 4)

    animationId = requestAnimationFrame(animate)
  }

  animate()

  onUnmounted(() => {
    if (animationId) cancelAnimationFrame(animationId)
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMouseMove)
  })
})
</script>

<template>
  <canvas ref="canvasRef" class="aurora-canvas" />
</template>

<style scoped>
.aurora-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
