<script setup lang="ts">
const props = defineProps<{
  rankings: any[]
  type: 'total' | 'plays' | 'grades'
}>()

function formatScore(score: number): string {
  if (score === undefined || score === null) return "0";
  if (score === undefined || score === null) return "0";
  return score.toLocaleString()
}

function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'SSS': '#ff66aa', 'SS': '#bf00ff', 'S': '#00d4ff',
    'A': '#00ff88', 'B': '#fcee09', 'C': '#ff6600', 'D': '#ff4466'
  }
  return colors[grade] || '#888888'
}
</script>

<template>
  <div class="rank-list">
    <div
      v-for="player in rankings"
      :key="player.userId"
      class="rank-item"
    >
      <span class="rank-num">{{ player.rank }}</span>
      <span class="player-name">{{ player.nickname || player.username }}</span>

      <div v-if="type === 'total'" class="rank-stats">
        <span class="grade-badge" :style="{ color: getGradeColor(player.bestGrade), borderColor: getGradeColor(player.bestGrade) }">
          {{ player.bestGrade }}
        </span>
        <span class="score">{{ formatScore(player.totalScore) }}</span>
      </div>

      <div v-else-if="type === 'plays'" class="rank-stats">
        <span class="accuracy">{{ player.avgAccuracy }}%</span>
        <span class="score">{{ player.playCount }} 次</span>
      </div>

      <div v-else-if="type === 'grades'" class="rank-stats grades">
        <span v-if="player.sss > 0" class="mini-grade sss">{{ player.sss }}SSS</span>
        <span v-if="player.ss > 0" class="mini-grade ss">{{ player.ss }}SS</span>
        <span v-if="player.s > 0" class="mini-grade s">{{ player.s }}S</span>
      </div>
    </div>

    <div v-if="rankings.length === 0" class="empty-state">
      <p>暂无数据</p>
    </div>
  </div>
</template>

<style scoped>
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rank-item {
  display: flex;
  align-items: center;
  padding: 0.8rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: border-color 0.2s, transform 0.2s;
}

.rank-item:hover {
  border-color: var(--primary);
  transform: translateX(4px);
}

.rank-num {
  width: 40px;
  font-weight: 600;
  color: var(--text-muted);
}

.player-name {
  flex: 1;
  font-weight: 500;
  color: var(--text);
}

.rank-stats {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.grade-badge {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border: 1px solid;
  border-radius: 4px;
}

.score {
  font-weight: 600;
  color: var(--primary);
  min-width: 80px;
  text-align: right;
}

.accuracy {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.grades {
  gap: 0.4rem;
}

.mini-grade {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}

.mini-grade.sss { color: #ff66aa; background: rgba(255, 102, 170, 0.15); }
.mini-grade.ss { color: #bf00ff; background: rgba(191, 0, 255, 0.15); }
.mini-grade.s { color: #00d4ff; background: rgba(0, 212, 255, 0.15); }

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}
</style>
