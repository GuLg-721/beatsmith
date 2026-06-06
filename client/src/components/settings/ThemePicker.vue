<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/authStore'

const authStore = useAuthStore()

const themes = [
  {
    id: 'osu',
    name: 'osu! 霓虹',
    description: '粉紫色霓虹风格',
    primary: '#ff66aa',
    secondary: '#bf00ff'
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    description: '黄蓝科技感',
    primary: '#fcee09',
    secondary: '#00d4ff'
  },
  {
    id: 'valorant',
    name: 'Valorant',
    description: '红黑简约风格',
    primary: '#ff4655',
    secondary: '#bd3944'
  }
]

const currentTheme = ref('osu')

onMounted(() => {
  currentTheme.value = authStore.user?.theme || localStorage.getItem('theme') || 'osu'
})

function selectTheme(themeId: string) {
  currentTheme.value = themeId
  authStore.updateTheme(themeId)
}
</script>

<template>
  <div class="theme-picker">
    <button
      v-for="theme in themes"
      :key="theme.id"
      class="theme-card"
      :class="{ active: currentTheme === theme.id }"
      @click="selectTheme(theme.id)"
    >
      <div class="theme-preview">
        <div class="color-swatch primary" :style="{ background: theme.primary }"></div>
        <div class="color-swatch secondary" :style="{ background: theme.secondary }"></div>
      </div>
      <div class="theme-info">
        <div class="theme-name">{{ theme.name }}</div>
        <div class="theme-desc">{{ theme.description }}</div>
      </div>
      <div v-if="currentTheme === theme.id" class="check-mark">✓</div>
    </button>
  </div>
</template>

<style scoped>
.theme-picker {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.theme-card {
  flex: 1;
  min-width: 150px;
  padding: 1rem;
  border: 2px solid var(--border);
  border-radius: 12px;
  background: var(--bg-surface);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  position: relative;
}

.theme-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.theme-card.active {
  border-color: var(--primary);
  box-shadow: var(--primary-glow);
}

.theme-preview {
  display: flex;
  gap: 0.5rem;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor;
}

.theme-info {
  text-align: center;
}

.theme-name {
  color: var(--text);
  font-weight: 600;
  font-size: 0.95rem;
}

.theme-desc {
  color: var(--text-muted);
  font-size: 0.8rem;
  margin-top: 0.2rem;
}

.check-mark {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary);
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
}
</style>
