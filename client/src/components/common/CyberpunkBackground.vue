<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ reduced?: boolean }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let dataStrings: DataString[] = []
let distortions: Distortion[] = []

interface DataString {
  x: number
  y: number
  speed: number
  text: string
  opacity: number
}

interface Distortion {
  x: number
  y: number
  radius: number
  strength: number
  life: number
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
    dataStrings = Array.from({ length: 20 }, () => ({
      x: Math.random() * canvas!.width,
      y: Math.random() * canvas!.height,
      speed: Math.random() * 0.8 + 0.3,
      text: randomBinary(8),
      opacity: Math.random() * 0.4 + 0.15
    }))
  }

  let scanY = 0
  let time = 0

  function animate() {
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
    time += 0.02

    // Draw grid with perspective effect
    const gridSize = props.reduced ? 60 : 40
    ctx!.strokeStyle = 'rgba(252, 238, 9, 0.12)'
    ctx!.lineWidth = 0.5

    // Vertical lines
    for (let x = 0; x < canvas!.width; x += gridSize) {
      ctx!.beginPath()
      ctx!.moveTo(x, 0)
      ctx!.lineTo(x, canvas!.height)
      ctx!.stroke()
    }

    // Horizontal lines with wave effect
    for (let y = 0; y < canvas!.height; y += gridSize) {
      ctx!.beginPath()
      for (let x = 0; x <= canvas!.width; x += 5) {
        const wave = Math.sin((x + time * 50) * 0.01) * 2
        if (x === 0) {
          ctx!.moveTo(x, y + wave)
        } else {
          ctx!.lineTo(x, y + wave)
        }
      }
      ctx!.stroke()
    }

    // Draw scanline with wave distortion
    if (!props.reduced) {
      // Main scanline
      ctx!.beginPath()
      for (let x = 0; x <= canvas!.width; x += 3) {
        const wave = Math.sin((x + time * 100) * 0.02) * 8
        const glitch = Math.random() > 0.98 ? (Math.random() - 0.5) * 20 : 0
        if (x === 0) {
          ctx!.moveTo(x, scanY + wave + glitch)
        } else {
          ctx!.lineTo(x, scanY + wave + glitch)
        }
      }
      ctx!.strokeStyle = 'rgba(0, 212, 255, 0.6)'
      ctx!.lineWidth = 2
      ctx!.stroke()

      // Scanline glow
      ctx!.beginPath()
      for (let x = 0; x <= canvas!.width; x += 3) {
        const wave = Math.sin((x + time * 100) * 0.02) * 8
        if (x === 0) {
          ctx!.moveTo(x, scanY + wave)
        } else {
          ctx!.lineTo(x, scanY + wave)
        }
      }
      ctx!.strokeStyle = 'rgba(0, 212, 255, 0.15)'
      ctx!.lineWidth = 12
      ctx!.stroke()

      // Scanline core (bright)
      ctx!.beginPath()
      for (let x = 0; x <= canvas!.width; x += 3) {
        const wave = Math.sin((x + time * 100) * 0.02) * 8
        if (x === 0) {
          ctx!.moveTo(x, scanY + wave)
        } else {
          ctx!.lineTo(x, scanY + wave)
        }
      }
      ctx!.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx!.lineWidth = 1
      ctx!.stroke()

      // Spawn distortions near scanline
      if (Math.random() > 0.9) {
        distortions.push({
          x: Math.random() * canvas!.width,
          y: scanY + (Math.random() - 0.5) * 30,
          radius: Math.random() * 30 + 10,
          strength: Math.random() * 0.5 + 0.3,
          life: 0
        })
      }

      scanY = (scanY + 1.5) % canvas!.height
    }

    // Draw distortions
    distortions.forEach((d, i) => {
      d.life++
      const alpha = Math.max(0, 1 - d.life / 30)

      // Distortion ring
      ctx!.beginPath()
      ctx!.arc(d.x, d.y, d.radius + d.life * 2, 0, Math.PI * 2)
      ctx!.strokeStyle = `rgba(0, 212, 255, ${alpha * 0.3})`
      ctx!.lineWidth = 2
      ctx!.stroke()

      // Inner glow
      const gradient = ctx!.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.radius)
      gradient.addColorStop(0, `rgba(0, 212, 255, ${alpha * 0.2})`)
      gradient.addColorStop(1, 'rgba(0, 212, 255, 0)')
      ctx!.fillStyle = gradient
      ctx!.beginPath()
      ctx!.arc(d.x, d.y, d.radius, 0, Math.PI * 2)
      ctx!.fill()
    })

    // Remove dead distortions
    distortions = distortions.filter(d => d.life < 30)

    // Draw data strings
    dataStrings.forEach(ds => {
      ctx!.font = '13px monospace'
      ctx!.fillStyle = `rgba(252, 238, 9, ${ds.opacity})`
      ctx!.fillText(ds.text, ds.x, ds.y)
      ds.y -= ds.speed
      if (ds.y < -20) {
        ds.y = canvas!.height + 20
        ds.x = Math.random() * canvas!.width
        ds.text = randomBinary(8)
      }
    })

    // Draw corner brackets
    const bracketSize = 60
    const bracketOffset = 50
    const bracketPulse = Math.sin(time) * 0.1 + 0.5

    ctx!.strokeStyle = `rgba(252, 238, 9, ${bracketPulse})`
    ctx!.lineWidth = 2
    ctx!.lineCap = 'square'

    // Top-left
    ctx!.beginPath()
    ctx!.moveTo(bracketOffset, bracketOffset + bracketSize)
    ctx!.lineTo(bracketOffset, bracketOffset)
    ctx!.lineTo(bracketOffset + bracketSize, bracketOffset)
    ctx!.stroke()

    // Top-right
    ctx!.beginPath()
    ctx!.moveTo(canvas!.width - bracketOffset - bracketSize, bracketOffset)
    ctx!.lineTo(canvas!.width - bracketOffset, bracketOffset)
    ctx!.lineTo(canvas!.width - bracketOffset, bracketOffset + bracketSize)
    ctx!.stroke()

    // Bottom-left
    ctx!.beginPath()
    ctx!.moveTo(bracketOffset, canvas!.height - bracketOffset - bracketSize)
    ctx!.lineTo(bracketOffset, canvas!.height - bracketOffset)
    ctx!.lineTo(bracketOffset + bracketSize, canvas!.height - bracketOffset)
    ctx!.stroke()

    // Bottom-right
    ctx!.beginPath()
    ctx!.moveTo(canvas!.width - bracketOffset - bracketSize, canvas!.height - bracketOffset)
    ctx!.lineTo(canvas!.width - bracketOffset, canvas!.height - bracketOffset)
    ctx!.lineTo(canvas!.width - bracketOffset, canvas!.height - bracketOffset - bracketSize)
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
