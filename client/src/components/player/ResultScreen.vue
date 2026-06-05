<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { getGradeColor } from '@/utils/grade'
import { NButton } from 'naive-ui'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const gameStore = useGameStore()
const authStore = useAuthStore()
const router = useRouter()

const result = gameStore.getResult()

async function submitScore() {
  if (!authStore.isLoggedIn || !gameStore.currentMapId) return

  try {
    await api.post(`/api/maps/${gameStore.currentMapId}/scores`, {
      score: result.score,
      maxCombo: result.maxCombo,
      accuracy: result.accuracy,
      grade: result.grade,
      perfect: result.perfect,
      great: result.great,
      good: result.good,
      miss: result.miss
    })
  } catch (err) {
    console.error('Failed to submit score:', err)
  }
}

function retry() {
  gameStore.reset()
  router.go(0) // 刷新页面重新开始
}

function goBack() {
  gameStore.reset()
  router.push(`/map/${gameStore.currentMapId}`)
}
</script>

<template>
  <div class="result-overlay">
    <div class="result-card">
      <h2>🎮 游戏结束</h2>

      <div class="grade-display" :style="{ color: getGradeColor(result.grade) }">
        {{ result.grade }}
      </div>
      <div class="accuracy">{{ result.accuracy.toFixed(2) }}%</div>

      <div class="stats">
        <div class="stat-row">
          <span class="stat-label">分数</span>
          <span class="stat-value">{{ result.score.toLocaleString() }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">最大连击</span>
          <span class="stat-value">{{ result.maxCombo }}</span>
        </div>
      </div>

      <div class="judgments">
        <div class="judgment-item perfect">
          <span class="j-count">{{ result.perfect }}</span>
          <span class="j-label">Perfect</span>
        </div>
        <div class="judgment-item great">
          <span class="j-count">{{ result.great }}</span>
          <span class="j-label">Great</span>
        </div>
        <div class="judgment-item good">
          <span class="j-count">{{ result.good }}</span>
          <span class="j-label">Good</span>
        </div>
        <div class="judgment-item miss">
          <span class="j-count">{{ result.miss }}</span>
          <span class="j-label">Miss</span>
        </div>
      </div>

      <div class="actions">
        <NButton @click="retry">再来一次</NButton>
        <NButton type="primary" @click="goBack">返回详情</NButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-overlay {
  position: fixed;
  inset: 0;
  background: oklch(0 0 0 / 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.result-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2rem;
  width: 400px;
  text-align: center;
}

.result-card h2 {
  margin: 0 0 1rem;
  color: var(--ink);
}

.grade-display {
  font-size: 5rem;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 0 30px currentColor;
}

.accuracy {
  font-size: 1.5rem;
  color: var(--muted);
  margin: 0.5rem 0 1.5rem;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.stat-label {
  color: var(--muted);
}

.stat-value {
  font-weight: 600;
  color: var(--ink);
}

.judgments {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.judgment-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border-radius: 8px;
  background: oklch(0 0 0 / 0.2);
}

.j-count {
  font-size: 1.25rem;
  font-weight: 700;
}

.j-label {
  font-size: 0.6875rem;
  color: var(--muted);
}

.judgment-item.perfect .j-count { color: #ffd700; }
.judgment-item.great .j-count { color: #4a9eff; }
.judgment-item.good .j-count { color: #4caf50; }
.judgment-item.miss .j-count { color: #ff5252; }

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}
</style>
