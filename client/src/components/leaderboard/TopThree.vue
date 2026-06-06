<script setup lang="ts">
const props = defineProps<{
  rankings: any[]
  type: 'total' | 'plays' | 'grades'
}>()

const medals = ['🥇', '🥈', '🥉']

function formatScore(score: number): string {
  return score.toLocaleString()
}
</script>

<template>
  <div class="top-three">
    <div
      v-for="(player, index) in rankings.slice(0, 3)"
      :key="player.userId"
      class="podium-item"
      :class="{ first: index === 0, second: index === 1, third: index === 2 }"
    >
      <div class="medal">{{ medals[index] }}</div>
      <div class="player-name">{{ player.nickname || player.username }}</div>

      <div v-if="type === 'total'" class="player-stat">
        <span class="stat-value">{{ formatScore(player.totalScore) }}</span>
        <span class="stat-label">总分</span>
      </div>

      <div v-else-if="type === 'plays'" class="player-stat">
        <span class="stat-value">{{ player.playCount }}</span>
        <span class="stat-label">游玩次数</span>
      </div>

      <div v-else-if="type === 'grades'" class="player-stat grades">
        <div class="grade-badges">
          <span v-if="player.sss > 0" class="grade sss">SSS×{{ player.sss }}</span>
          <span v-if="player.ss > 0" class="grade ss">SS×{{ player.ss }}</span>
          <span v-if="player.s > 0" class="grade s">S×{{ player.s }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-three {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 1.5rem;
  padding: 2rem 1rem;
  margin-bottom: 1.5rem;
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.2rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  min-width: 120px;
  transition: transform 0.2s, border-color 0.2s;
}

.podium-item:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
}

.podium-item.first {
  transform: translateY(-10px);
  border-color: rgba(255, 215, 0, 0.5);
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.1), var(--bg-card));
}

.podium-item.first:hover {
  transform: translateY(-14px);
}

.podium-item.second {
  border-color: rgba(192, 192, 192, 0.4);
  background: linear-gradient(180deg, rgba(192, 192, 192, 0.08), var(--bg-card));
}

.podium-item.third {
  border-color: rgba(205, 127, 50, 0.4);
  background: linear-gradient(180deg, rgba(205, 127, 50, 0.08), var(--bg-card));
}

.medal {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.player-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
  text-align: center;
}

.player-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.grade-badges {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.grade {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.grade.sss { color: #ff66aa; background: rgba(255, 102, 170, 0.15); }
.grade.ss { color: #bf00ff; background: rgba(191, 0, 255, 0.15); }
.grade.s { color: #00d4ff; background: rgba(0, 212, 255, 0.15); }
</style>
