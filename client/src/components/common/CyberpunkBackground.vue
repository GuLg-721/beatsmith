<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ reduced?: boolean }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let dataStrings: DataString[] = []

interface DataString {
  x: number
  y: number
  speed: number
  text: string
  opacity: number
}

function randomBinary(length: number): string {
  return Array.from({ length }, () => Math.random() > 0.5 ? '1' : '0').join('')
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  function resize() {
    canvas!.width = window.innerWidth
    canvas!.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  if (!props.reduced) {
    dataStrings = Array.from({ length: 15 }, () => ({
      x: Math.random() * canvas!.width,
      y: Math.random() * canvas!.height,
      speed: Math.random() * 0.5 + 0.3,
      text: randomBinary(8),
      opacity: Math.random() * 0.3 + 0.1
    }))
  }

  let scanY = 0

  function animate() {
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

    const gridSize = props.reduced ? 60 : 40
    ctx!.strokeStyle = 'rgba(252, 238, 9, 0.06)'
    ctx!.lineWidth = 0.5
    for (let x = 0; x < canvas!.width; x += gridSize) {
      ctx!.beginPath()
      ctx!.moveTo(x, 0)
      ctx!.lineTo(x, canvas!.height)
      ctx!.stroke()
    }
    for (let y = 0; y < canvas!.height; y += gridSize) {
      ctx!.beginPath()
      ctx!.moveTo(0, y)
      ctx!.lineTo(canvas!.width, y)
      ctx!.stroke()
    }

    if (!props.reduced) {
      ctx!.fillStyle = 'rgba(0, 212, 255, 0.03)'
      ctx!.fillRect(0, scanY, canvas!.width, 2)
      scanY = (scanY + 1) % canvas!.height
    }

    dataStrings.forEach(ds => {
      ctx!.font = '12px monospace'
      ctx!.fillStyle = `rgba(252, 238, 9, ${ds.opacity})`
      ctx!.fillText(ds.text, ds.x, ds.y)
      ds.y -= ds.speed
      if (ds.y < -20) {
        ds.y = canvas!.height + 20
        ds.x = Math.random() * canvas!.width
        ds.text = randomBinary(8)
      }
    })

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
  <canvas ref="canvasRef" class="cyber-bg" />
</template>

<style scoped>
.cyber-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
