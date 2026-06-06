<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const props = defineProps<{
  modelValue: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const songs = ref<any[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get('/api/maps', { params: { limit: 100 } })
    songs.value = res.data.maps
  } catch (err) {
    console.error('Failed to fetch songs:', err)
  } finally {
    loading.value = false
  }
})

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value || null)
}
</script>

<template>
  <div class="song-selector">
    <label class="selector-label">选择歌曲</label>
    <select
      class="selector-select"
      :value="modelValue"
      @change="handleChange"
      :disabled="loading"
    >
      <option value="">-- 选择一首歌曲 --</option>
      <option
        v-for="song in songs"
        :key="song.id"
        :value="song.id"
      >
        {{ song.title }} - {{ song.artist || 'Unknown' }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.song-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.selector-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.selector-select {
  padding: 0.7rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text);
  font-size: 0.95rem;
  cursor: pointer;
  transition: border-color 0.2s;
}

.selector-select:focus {
  outline: none;
  border-color: var(--primary);
}

.selector-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
