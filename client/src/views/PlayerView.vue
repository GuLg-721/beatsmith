<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { useAudioStore } from '@/stores/audioStore'
import { useBgmStore } from '@/stores/bgmStore'
import { getGradeColor } from '@/utils/grade'
import GameCanvas from '@/components/player/GameCanvas.vue'
import ResultScreen from '@/components/player/ResultScreen.vue'
import { NSpin, NButton } from 'naive-ui'
import { motion } from 'motion-v'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const audioStore = useAudioStore()
const bgmStore = useBgmStore()

const loading = ref(true)
const mapData = ref<any>(null)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const mapId = computed(() => route.params.mapId as string)

onMounted(async () => {
  try {
    const res = await api.get(`/api/maps/${mapId.value}`)
    mapData.value = res.data.map
    await audioStore.loadAudioUrl(`/uploads/${mapData.value.audioFile}`)
    audioStore.setVolume(0.5)

    let notes = []
    if (mapData.value.mapData) {
      try { notes = JSON.parse(mapData.value.mapData).notes || [] } catch {}
    }

    gameStore.initGame(mapId.value, notes)
    loading.value = false
  } catch (err) {
    loading.value = false
  }
})

function startGame() {
  bgmStore.pause() // 暂停背景音乐
  gameStore.startGame()
  audioStore.play()
}

function togglePause() {
  if (gameStore.state === 'playing') {
    gameStore.pauseGame()
    audioStore.pause()
  }
}

function resumeGame() {
  // 开始倒计时
  countdown.value = 3
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
      bgmStore.pause() // 确保背景音乐暂停
      gameStore.resumeGame()
      audioStore.play()
    }
  }, 1000)
}
</script>

<template>
  <div class="player-page">
    <!-- 加载中 -->
    <div v-if="loading" class="loading">
      <NSpin size="large" />
      <p>加载中...</p>
    </div>

    <!-- 准备界面 -->
    <div v-else-if="gameStore.state === 'ready'" class="ready-screen">
      <motion.div
        class="ready-content"
        :initial="{ opacity: 0, y: 30 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6 }"
      >
        <h1 class="map-title">{{ mapData?.title }}</h1>
        <p class="map-artist" v-if="mapData?.artist">{{ mapData.artist }}</p>
        <p class="ready-hint">点击开始游戏</p>
        <NButton type="primary" size="large" class="start-btn" @click="startGame">
          🎮 开始游戏
        </NButton>
        <NButton class="back-btn" @click="router.back()">返回</NButton>
      </motion.div>
    </div>

    <!-- 游戏中 -->
    <template v-if="gameStore.state === 'playing' || gameStore.state === 'paused'">
      <GameCanvas />

      <!-- HUD -->
      <div class="hud">
        <div class="hud-left">
          <div class="score-label">SCORE</div>
          <div class="score">{{ gameStore.score.toLocaleString() }}</div>
        </div>
        <div class="hud-center">
          <Transition name="combo-pop">
            <div class="combo" v-if="gameStore.combo > 1" :key="gameStore.combo">
              {{ gameStore.combo }}
              <span class="combo-label">COMBO</span>
            </div>
          </Transition>
        </div>
        <div class="hud-right">
          <div class="accuracy">{{ gameStore.accuracy.toFixed(1) }}%</div>
          <div class="grade-badge" :style="{ color: getGradeColor(gameStore.grade), borderColor: getGradeColor(gameStore.grade) }">
            {{ gameStore.grade }}
          </div>
        </div>
      </div>

      <!-- 暂停按钮（左上角，避开 HUD） -->
      <button v-if="gameStore.state === 'playing'" class="pause-btn" @click="togglePause">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      </button>

      <!-- 暂停遮罩 -->
      <div v-if="gameStore.state === 'paused' && countdown === 0" class="pause-overlay" @click.stop>
        <motion.div
          class="pause-card"
          :initial="{ opacity: 0, scale: 0.9 }"
          :animate="{ opacity: 1, scale: 1 }"
          @click.stop
        >
          <h2>⏸ 暂停</h2>
          <NButton type="primary" size="large" @click.stop="resumeGame">继续游戏</NButton>
          <NButton class="back-btn" @click.stop="router.back()" style="margin-top: 0.75rem">退出</NButton>
        </motion.div>
      </div>

      <!-- 倒计时遮罩 -->
      <div v-if="countdown > 0" class="countdown-overlay" @click.stop>
        <motion.div
          class="countdown-number"
          :key="countdown"
          :initial="{ opacity: 0, scale: 2 }"
          :animate="{ opacity: 1, scale: 1 }"
          :exit="{ opacity: 0, scale: 0.5 }"
          :transition="{ duration: 0.3 }"
        >
          {{ countdown }}
        </motion.div>
      </div>
    </template>

    <!-- 结算画面 -->
    <ResultScreen v-if="gameStore.state === 'result'" />
  </div>
</template>

<style scoped>
.player-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #080810;
  position: relative;
}

.loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--muted);
}

.ready-screen {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #0d0520, #060610);
}

.ready-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.map-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

.map-artist {
  font-size: 1.125rem;
  color: var(--muted);
  margin: 0;
}

.ready-hint {
  font-size: 0.875rem;
  color: var(--primary);
  margin: 0.5rem 0 1rem;
}

.start-btn {
  font-size: 1.125rem !important;
  padding: 0.75rem 3rem !important;
  border-radius: 12px !important;
}

.back-btn {
  background: transparent !important;
  border: 1px solid var(--border) !important;
  color: var(--muted) !important;
}

/* HUD */
.hud {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  padding-left: 4rem;
  background: linear-gradient(180deg, oklch(0.06 0.01 280 / 0.95), transparent);
  z-index: 10;
  pointer-events: none;
}

.hud-left, .hud-right { min-width: 120px; }
.hud-right { text-align: right; }

.score-label, .combo-label {
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  color: oklch(0.50 0.005 280);
}

.score {
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.combo {
  font-size: 3rem;
  font-weight: 900;
  color: var(--primary);
  text-align: center;
  line-height: 1;
  text-shadow: 0 0 30px oklch(0.62 0.22 350 / 0.6);
}

.combo-enter-active { transition: all 0.15s ease-out; }
.combo-leave-active { transition: all 0.1s ease-in; }
.combo-enter-from { opacity: 0; transform: scale(1.4); }
.combo-leave-to { opacity: 0; transform: scale(0.7); }

.accuracy {
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  font-variant-numeric: tabular-nums;
}

.grade-badge {
  display: inline-block;
  font-size: 1.25rem;
  font-weight: 900;
  border: 2px solid;
  border-radius: 6px;
  padding: 0.125rem 0.5rem;
  margin-top: 0.25rem;
}

/* 暂停按钮 */
.pause-btn {
  position: fixed;
  top: 0.75rem;
  left: 1.5rem;
  z-index: 20;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(0.15 0.01 280 / 0.7);
  border: 1px solid oklch(0.30 0.01 280);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.pause-btn:hover {
  background: oklch(0.20 0.01 280 / 0.9);
  border-color: var(--primary);
}

/* 暂停遮罩 */
.pause-overlay {
  position: fixed;
  inset: 0;
  background: oklch(0 0 0 / 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.pause-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2.5rem;
  text-align: center;
  min-width: 280px;
}

.pause-card h2 {
  margin: 0 0 1.5rem;
  color: var(--ink);
  font-size: 1.5rem;
}

/* 倒计时 */
.countdown-overlay {
  position: fixed;
  inset: 0;
  background: oklch(0 0 0 / 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.countdown-number {
  font-size: 8rem;
  font-weight: 900;
  color: var(--primary);
  text-shadow: 0 0 60px oklch(0.62 0.22 350 / 0.6);
}
</style>
