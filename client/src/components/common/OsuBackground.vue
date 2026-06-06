<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ reduced?: boolean }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let particles: Particle[] = []
let mouseX = 0
let mouseY = 0

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
}

function createParticle(canvas: HTMLCanvasElement): Particle {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * (props.reduced ? 0.2 : 0.5),
    vy: (Math.random() - 0.5) * (props.reduced ? 0.2 : 0.5),
    radius: Math.random() * 2 + 1,
    opacity: Math.random() * 0.4 + 0.2
  }
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

  const count = props.reduced ? 20 : (Math.min(50, Math.floor((canvas.width * canvas.height) / 20000)))
  particles = Array.from({ length: count }, () => createParticle(canvas!))

  function onMouseMove(e: MouseEvent) {
    if (!props.reduced) {
      mouseX = e.clientX
      mouseY = e.clientY
    }
  }
  window.addEventListener('mousemove', onMouseMove)

  function animate() {
    ctx!.fillStyle = 'rgba(10, 10, 26, 0.12)'
    ctx!.fillRect(0, 0, canvas!.width, canvas!.height)

    particles.forEach((p, i) => {
      if (!props.reduced) {
        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 200) {
          const force = (200 - dist) / 200 * 0.02
          p.vx += dx * force * 0.01
          p.vy += dy * force * 0.01
        }
      }

      p.x += p.vx
      p.y += p.vy

      if (p.x < 0 || p.x > canvas!.width) p.vx *= -1
      if (p.y < 0 || p.y > canvas!.height) p.vy *= -1
      p.x = Math.max(0, Math.min(canvas!.width, p.x))
      p.y = Math.max(0, Math.min(canvas!.height, p.y))

      ctx!.beginPath()
      ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx!.fillStyle = `rgba(255, 102, 170, ${p.opacity})`
      ctx!.fill()

      if (!props.reduced) {
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx2 = p.x - p2.x
          const dy2 = p.y - p2.y
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
          if (dist2 < 120) {
            ctx!.beginPath()
            ctx!.moveTo(p.x, p.y)
            ctx!.lineTo(p2.x, p2.y)
            ctx!.strokeStyle = `rgba(191, 0, 255, ${(1 - dist2 / 120) * 0.15})`
            ctx!.lineWidth = 0.5
            ctx!.stroke()
          }
        }
      }
    })

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
  <canvas ref="canvasRef" class="osu-bg" />
</template>

<style scoped>
.osu-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
