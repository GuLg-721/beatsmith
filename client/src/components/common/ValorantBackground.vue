<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ reduced?: boolean }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let lines: GeometricLine[] = []

interface GeometricLine {
  x1: number
  y1: number
  x2: number
  y2: number
  opacity: number
  pulseOffset: number
  color: string
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  function resize() {
    canvas!.width = window.innerWidth
    canvas!.height = window.innerHeight
    generateLines()
  }

  function generateLines() {
    const count = props.reduced ? 5 : 12
    lines = Array.from({ length: count }, () => {
      const side = Math.floor(Math.random() * 4)
      const offset = Math.random()
      const angle = (Math.random() - 0.5) * 0.5
      const len = Math.random() * 200 + 100
      let x1: number, y1: number, x2: number, y2: number

      switch (side) {
        case 0:
          x1 = offset * canvas!.width
          y1 = 0
          x2 = x1 + Math.cos(angle) * len
          y2 = Math.sin(angle) * len
          break
        case 1:
          x1 = canvas!.width
          y1 = offset * canvas!.height
          x2 = x1 - Math.cos(angle) * len
          y2 = y1 + Math.sin(angle) * len
          break
        case 2:
          x1 = offset * canvas!.width
          y1 = canvas!.height
          x2 = x1 + Math.cos(angle) * len
          y2 = y1 - Math.sin(angle) * len
          break
        default:
          x1 = 0
          y1 = offset * canvas!.height
          x2 = x1 + Math.cos(angle) * len
          y2 = y1 + Math.sin(angle) * len
      }

      return {
        x1, y1, x2, y2,
        opacity: Math.random() * 0.2 + 0.1,
        pulseOffset: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? '#ff4655' : '#bd3944'
      }
    })
  }

  resize()
  window.addEventListener('resize', resize)

  let time = 0

  function animate() {
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
    time += 0.02

    lines.forEach(line => {
      const pulse = Math.sin(time + line.pulseOffset) * 0.1 + 0.1
      ctx!.beginPath()
      ctx!.moveTo(line.x1, line.y1)
      ctx!.lineTo(line.x2, line.y2)
      const hex = line.color
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${line.opacity + pulse})`
      ctx!.lineWidth = 1.5
      ctx!.stroke()
    })

    const cornerSize = 40
    const cornerOpacity = 0.3
    ctx!.strokeStyle = `rgba(255, 70, 85, ${cornerOpacity})`
    ctx!.lineWidth = 2

    ctx!.beginPath()
    ctx!.moveTo(20, 20 + cornerSize)
    ctx!.lineTo(20, 20)
    ctx!.lineTo(20 + cornerSize, 20)
    ctx!.stroke()

    ctx!.beginPath()
    ctx!.moveTo(canvas!.width - 20 - cornerSize, 20)
    ctx!.lineTo(canvas!.width - 20, 20)
    ctx!.lineTo(canvas!.width - 20, 20 + cornerSize)
    ctx!.stroke()

    ctx!.beginPath()
    ctx!.moveTo(20, canvas!.height - 20 - cornerSize)
    ctx!.lineTo(20, canvas!.height - 20)
    ctx!.lineTo(20 + cornerSize, canvas!.height - 20)
    ctx!.stroke()

    ctx!.beginPath()
    ctx!.moveTo(canvas!.width - 20 - cornerSize, canvas!.height - 20)
    ctx!.lineTo(canvas!.width - 20, canvas!.height - 20)
    ctx!.lineTo(canvas!.width - 20, canvas!.height - 20 - cornerSize)
    ctx!.stroke()

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
  <canvas ref="canvasRef" class="valorant-bg" />
</template>

<style scoped>
.valorant-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
