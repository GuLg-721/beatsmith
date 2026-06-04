<script setup lang="ts">
</script>

<template>
  <div class="home">
    <h1>⚒️ BeatSmith</h1>
    <p>节拍铁匠</p>
    <router-link to="/songs">开始锻造</router-link>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
}

h1 {
  font-size: 4rem;
  font-weight: 700;
  color: var(--primary);
  text-shadow: 0 0 30px oklch(0.62 0.22 350 / 0.5);
}

p {
  font-size: 1.25rem;
  color: var(--muted);
}

a {
  margin-top: 2rem;
  padding: 0.75rem 2rem;
  background: var(--primary);
  color: white;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all 0.2s;
}

a:hover {
  background: var(--primary-hover);
  box-shadow: var(--glow-primary);
}
</style>
