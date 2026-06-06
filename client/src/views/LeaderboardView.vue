<script setup lang="ts">
import ThemeBackground from '@/components/common/ThemeBackground.vue'
</script>

<template>
  <div class="leaderboard-page">
    <ThemeBackground :reduced="true" />
    <div class="content">
      <h1>🏆 排行榜</h1>
      <p>全局总分 + 单曲排行</p>
    </div>
  </div>
</template>

<style scoped>
.leaderboard-page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 2rem;
}

.content {
  position: relative;
  z-index: 1;
}

h1 {
  color: var(--primary);
  margin-bottom: 1rem;
}

p {
  color: var(--muted);
}
</style>
