<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let width = 0
  let height = 0
  let time = 0

  function resize() {
    width = canvas!.width = window.innerWidth
    height = canvas!.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  // 极光色彩
  const auroraColors = [
    { h: 350, s: 70, l: 50 },  // 洋红
    { h: 280, s: 60, l: 45 },  // 紫
    { h: 220, s: 55, l: 40 },  // 蓝
    { h: 195, s: 65, l: 50 },  // 青
    { h: 320, s: 50, l: 45 },  // 粉紫
  ]

  function animate() {
    time += 0.003

    // 深色背景
    ctx!.fillStyle = 'rgb(7, 7, 12)'
    ctx!.fillRect(0, 0, width, height)

    // 绘制极光层
    for (let i = 0; i < auroraColors.length; i++) {
      const color = auroraColors[i]
      const y = height * 0.3 + Math.sin(time + i * 1.2) * height * 0.2
      const amplitude = height * 0.15

      ctx!.beginPath()
      ctx!.moveTo(0, y)

      // 贝塞尔曲线形成波浪
      for (let x = 0; x <= width; x += 20) {
        const wave1 = Math.sin(x * 0.003 + time + i) * amplitude
        const wave2 = Math.sin(x * 0.007 + time * 1.3 + i * 0.5) * amplitude * 0.5
        const wave3 = Math.sin(x * 0.001 + time * 0.7 + i * 2) * amplitude * 0.3
        ctx!.lineTo(x, y + wave1 + wave2 + wave3)
      }

      ctx!.lineTo(width, height)
      ctx!.lineTo(0, height)
      ctx!.closePath()

      // 极光渐变
      const gradient = ctx!.createLinearGradient(0, y - amplitude, 0, y + amplitude * 3)
      const h = color.h + Math.sin(time * 0.5 + i) * 10
      gradient.addColorStop(0, `hsla(${h}, ${color.s}%, ${color.l}%, 0)`)
      gradient.addColorStop(0.3, `hsla(${h}, ${color.s}%, ${color.l}%, 0.08)`)
      gradient.addColorStop(0.6, `hsla(${h}, ${color.s}%, ${color.l}%, 0.04)`)
      gradient.addColorStop(1, `hsla(${h}, ${color.s}%, ${color.l}%, 0)`)

      ctx!.fillStyle = gradient
      ctx!.fill()
    }

    // 微弱的星星点缀
    const starCount = 30
    for (let i = 0; i < starCount; i++) {
      const seed = i * 137.508
      const x = (seed * 7.31) % width
      const y = (seed * 3.17) % height
      const twinkle = Math.sin(time * 2 + seed) * 0.5 + 0.5
      const alpha = twinkle * 0.3 + 0.05

      ctx!.beginPath()
      ctx!.arc(x, y, 0.8, 0, Math.PI * 2)
      ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx!.fill()
    }

    animationId = requestAnimationFrame(animate)
  }

  animate()

  onUnmounted(() => {
    if (animationId) cancelAnimationFrame(animationId)
    window.removeEventListener('resize', resize)
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
