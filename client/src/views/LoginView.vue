<script setup lang="ts">
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h2>⚒️ BeatSmith</h2>
      <p>登录</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.login-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  width: 400px;
  text-align: center;
}

h2 {
  color: var(--primary);
  margin-bottom: 0.5rem;
}

p {
  color: var(--muted);
}
</style>
