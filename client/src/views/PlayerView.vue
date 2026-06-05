<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { useAudioStore } from '@/stores/audioStore'
import { getGradeColor } from '@/utils/grade'
import GameCanvas from '@/components/player/GameCanvas.vue'
import ResultScreen from '@/components/player/ResultScreen.vue'
import { NSpin, NButton } from 'naive-ui'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const audioStore = useAudioStore()

const loading = ref(true)
const mapData = ref<any>(null)

const mapId = computed(() => route.params.mapId as string)

onMounted(async () => {
  try {
    const res = await api.get(`/api/maps/${mapId.value}`)
    mapData.value = res.data.map

    await audioStore.loadAudioUrl(`/uploads/${mapData.value.audioFile}`)

    // 设置默认音量 50%
    audioStore.setVolume(0.5)

    let notes = []
    if (mapData.value.mapData) {
      try {
        const parsed = JSON.parse(mapData.value.mapData)
        notes = parsed.notes || []
      } catch (e) {
        console.error('Failed to parse map data:', e)
      }
    }

    gameStore.initGame(mapId.value, notes)
    loading.value = false
  } catch (err) {
    console.error('Failed to load map:', err)
    loading.value = false
  }
})

function startGame() {
  gameStore.startGame()
  audioStore.play()
}

function togglePause() {
  if (gameStore.state === 'playing') {
    gameStore.pauseGame()
    audioStore.pause()
  } else if (gameStore.state === 'paused') {
    gameStore.resumeGame()
    audioStore.play()
  }
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
      <div class="ready-info">
        <h1>{{ mapData?.title }}</h1>
        <p v-if="mapData?.artist">{{ mapData.artist }}</p>
        <p class="hint">点击开始游戏</p>
      </div>
      <NButton type="primary" size="large" @click="startGame">
        🎮 开始游戏
      </NButton>
      <NButton @click="router.back()" style="margin-top: 1rem">
        返回
      </NButton>
    </div>

    <!-- 游戏中 + 暂停 -->
    <template v-if="gameStore.state === 'playing' || gameStore.state === 'paused'">
      <div class="game-area">
        <!-- HUD -->
        <div class="hud">
          <div class="hud-left">
            <div class="score">{{ gameStore.score.toLocaleString() }}</div>
          </div>
          <div class="hud-center">
            <div class="combo" v-if="gameStore.combo > 1">
              {{ gameStore.combo }}x Combo
            </div>
          </div>
          <div class="hud-right">
            <div class="accuracy">{{ gameStore.accuracy.toFixed(1) }}%</div>
            <div class="grade" :style="{ color: getGradeColor(gameStore.grade) }">
              {{ gameStore.grade }}
            </div>
          </div>
        </div>

        <GameCanvas />

        <!-- 暂停按钮 -->
        <div class="pause-btn" @click="togglePause()">⏸</div>
      </div>

      <!-- 暂停遮罩 -->
      <div v-if="gameStore.state === 'paused'" class="pause-overlay" @click.stop>
        <div class="pause-card" @click.stop>
          <h2>⏸ 暂停</h2>
          <NButton type="primary" @click.stop="togglePause()">继续</NButton>
          <NButton @click.stop="router.back()" style="margin-top: 0.5rem">退出</NButton>
        </div>
      </div>
    </template>

    <!-- 结算画面 -->
    <ResultScreen v-if="gameStore.state === 'result'" />
  </div>
</template>

<style scoped>
.player-page {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}

.loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--muted);
}

.ready-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.ready-info {
  text-align: center;
  margin-bottom: 2rem;
}

.ready-info h1 {
  font-size: 2rem;
  color: var(--ink);
  margin: 0 0 0.5rem;
}

.ready-info p {
  color: var(--muted);
  margin: 0;
}

.hint {
  font-size: 0.875rem;
  color: var(--primary);
  margin-top: 1rem !important;
}

.game-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.hud {
  display: flex;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: oklch(0 0 0 / 0.5);
}

.score {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.combo {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary);
  text-align: center;
}

.accuracy {
  font-size: 1rem;
  color: var(--muted);
  text-align: right;
}

.grade {
  font-size: 1.5rem;
  font-weight: 900;
  text-align: right;
}

.pause-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(0 0 0 / 0.5);
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.25rem;
  transition: background 0.2s;
}

.pause-btn:hover {
  background: oklch(0 0 0 / 0.7);
}

.pause-overlay {
  position: fixed;
  inset: 0;
  background: oklch(0 0 0 / 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.pause-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
}

.pause-card h2 {
  margin: 0 0 1rem;
  color: var(--ink);
}
</style>
