<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ reduced?: boolean }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let lines: GeometricLine[] = []
let glowingTrails: GlowTrail[] = []

interface GeometricLine {
  x1: number
  y1: number
  x2: number
  y2: number
  opacity: number
  pulseOffset: number
  color: string
  width: number
}

interface GlowTrail {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
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
    const count = props.reduced ? 8 : 20
    lines = Array.from({ length: count }, () => {
      const side = Math.floor(Math.random() * 4)
      const offset = Math.random()
      const angle = (Math.random() - 0.5) * 0.6
      const len = Math.random() * 300 + 150
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
        opacity: Math.random() * 0.3 + 0.2,
        pulseOffset: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? '#ff4655' : '#bd3944',
        width: Math.random() * 1.5 + 1
      }
    })
  }

  function spawnTrail() {
    if (props.reduced) return
    const side = Math.floor(Math.random() * 4)
    let x: number, y: number, vx: number, vy: number

    switch (side) {
      case 0: x = Math.random() * canvas!.width; y = 0; vx = (Math.random() - 0.5) * 2; vy = Math.random() * 2 + 1; break
      case 1: x = canvas!.width; y = Math.random() * canvas!.height; vx = -(Math.random() * 2 + 1); vy = (Math.random() - 0.5) * 2; break
      case 2: x = Math.random() * canvas!.width; y = canvas!.height; vx = (Math.random() - 0.5) * 2; vy = -(Math.random() * 2 + 1); break
      default: x = 0; y = Math.random() * canvas!.height; vx = Math.random() * 2 + 1; vy = (Math.random() - 0.5) * 2; break
    }

    glowingTrails.push({
      x, y, vx, vy,
      life: 0,
      maxLife: 60 + Math.random() * 40,
      size: Math.random() * 3 + 2
    })
  }

  resize()
  window.addEventListener('resize', resize)

  let time = 0
  let trailTimer = 0

  function animate() {
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
    time += 0.015
    trailTimer++

    if (trailTimer % 10 === 0) spawnTrail()

    // Draw glowing trails
    glowingTrails.forEach((trail, i) => {
      trail.x += trail.vx
      trail.y += trail.vy
      trail.life++

      const progress = trail.life / trail.maxLife
      const alpha = progress < 0.2 ? progress * 5 : (1 - progress) * 1.25

      // Glow effect
      const gradient = ctx!.createRadialGradient(trail.x, trail.y, 0, trail.x, trail.y, trail.size * 4)
      gradient.addColorStop(0, `rgba(255, 70, 85, ${alpha * 0.8})`)
      gradient.addColorStop(0.5, `rgba(189, 57, 68, ${alpha * 0.4})`)
      gradient.addColorStop(1, `rgba(255, 70, 85, 0)`)
      ctx!.fillStyle = gradient
      ctx!.beginPath()
      ctx!.arc(trail.x, trail.y, trail.size * 4, 0, Math.PI * 2)
      ctx!.fill()

      // Core
      ctx!.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`
      ctx!.beginPath()
      ctx!.arc(trail.x, trail.y, trail.size * 0.5, 0, Math.PI * 2)
      ctx!.fill()
    })

    // Remove dead trails
    glowingTrails = glowingTrails.filter(t => t.life < t.maxLife)

    // Draw geometric lines with glow
    lines.forEach(line => {
      const pulse = Math.sin(time * 2 + line.pulseOffset) * 0.15 + 0.15
      const hex = line.color
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)

      // Outer glow
      ctx!.beginPath()
      ctx!.moveTo(line.x1, line.y1)
      ctx!.lineTo(line.x2, line.y2)
      ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(line.opacity + pulse) * 0.3})`
      ctx!.lineWidth = line.width * 4
      ctx!.lineCap = 'round'
      ctx!.stroke()

      // Middle glow
      ctx!.beginPath()
      ctx!.moveTo(line.x1, line.y1)
      ctx!.lineTo(line.x2, line.y2)
      ctx!.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(line.opacity + pulse) * 0.6})`
      ctx!.lineWidth = line.width * 2
      ctx!.stroke()

      // Core line
      ctx!.beginPath()
      ctx!.moveTo(line.x1, line.y1)
      ctx!.lineTo(line.x2, line.y2)
      ctx!.strokeStyle = `rgba(255, 255, 255, ${(line.opacity + pulse) * 0.5})`
      ctx!.lineWidth = line.width * 0.5
      ctx!.stroke()
    })

    // Draw corner accents with glow
    const cornerSize = 50
    const cornerOffset = 45
    const cornerPulse = Math.sin(time * 1.5) * 0.1 + 0.4

    ctx!.lineCap = 'round'

    // Top-left
    ctx!.beginPath()
    ctx!.moveTo(cornerOffset, cornerOffset + cornerSize)
    ctx!.lineTo(cornerOffset, cornerOffset)
    ctx!.lineTo(cornerOffset + cornerSize, cornerOffset)
    ctx!.strokeStyle = `rgba(255, 70, 85, ${cornerPulse})`
    ctx!.lineWidth = 3
    ctx!.stroke()

    // Top-right
    ctx!.beginPath()
    ctx!.moveTo(canvas!.width - cornerOffset - cornerSize, cornerOffset)
    ctx!.lineTo(canvas!.width - cornerOffset, cornerOffset)
    ctx!.lineTo(canvas!.width - cornerOffset, cornerOffset + cornerSize)
    ctx!.stroke()

    // Bottom-left
    ctx!.beginPath()
    ctx!.moveTo(cornerOffset, canvas!.height - cornerOffset - cornerSize)
    ctx!.lineTo(cornerOffset, canvas!.height - cornerOffset)
    ctx!.lineTo(cornerOffset + cornerSize, canvas!.height - cornerOffset)
    ctx!.stroke()

    // Bottom-right
    ctx!.beginPath()
    ctx!.moveTo(canvas!.width - cornerOffset - cornerSize, canvas!.height - cornerOffset)
    ctx!.lineTo(canvas!.width - cornerOffset, canvas!.height - cornerOffset)
    ctx!.lineTo(canvas!.width - cornerOffset, canvas!.height - cornerOffset - cornerSize)
    ctx!.stroke()

    // Corner glow dots
    const dotSize = 4
    const dotGlow = ctx!.createRadialGradient(cornerOffset, cornerOffset, 0, cornerOffset, cornerOffset, dotSize * 3)
    dotGlow.addColorStop(0, `rgba(255, 70, 85, ${cornerPulse})`)
    dotGlow.addColorStop(1, 'rgba(255, 70, 85, 0)')
    ctx!.fillStyle = dotGlow
    ctx!.beginPath()
    ctx!.arc(25, 25, dotSize * 3, 0, Math.PI * 2)
    ctx!.fill()

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
