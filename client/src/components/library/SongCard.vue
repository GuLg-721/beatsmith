<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  id: string
  title: string
  artist?: string
  coverImage?: string
  bpm?: number
  playCount: number
}>()

// 基于 ID 生成渐变色
const gradientStyle = computed(() => {
  let hash = 0
  for (let i = 0; i < props.id.length; i++) {
    hash = props.id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue1 = Math.abs(hash % 60) + 320 // 320-380 (洋红-红色)
  const hue2 = hue1 + 40
  return {
    background: `linear-gradient(135deg, oklch(0.45 0.15 ${hue1}), oklch(0.35 0.12 ${hue2}))`
  }
})

const firstLetter = computed(() => {
  return props.title.charAt(0).toUpperCase()
})
</script>

<template>
  <router-link :to="`/map/${id}`" class="song-card">
    <div class="cover">
      <img v-if="coverImage" :src="`/uploads/${coverImage}`" :alt="title" class="cover-img" />
      <div v-else class="cover-placeholder" :style="gradientStyle">
        <span class="cover-letter">{{ firstLetter }}</span>
      </div>
    </div>
    <div class="info">
      <div class="title">{{ title }}</div>
      <div class="artist" v-if="artist">{{ artist }}</div>
      <div class="meta">
        <span v-if="bpm" class="bpm">♫ {{ bpm }}</span>
        <span class="plays">▶ {{ playCount }}</span>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.song-card {
  display: block;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.song-card:hover {
  transform: translateY(-2px);
  border-color: oklch(0.62 0.22 350 / 0.3);
  box-shadow: 0 4px 20px oklch(0 0 0 / 0.3);
}

.cover {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-letter {
  font-size: 2.5rem;
  font-weight: 700;
  color: oklch(1 0 0 / 0.7);
  text-shadow: 0 2px 8px oklch(0 0 0 / 0.3);
}

.info {
  padding: 0.75rem;
}

.title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist {
  font-size: 0.8125rem;
  color: var(--muted);
  margin-top: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: oklch(0.50 0.005 280);
}
</style>
