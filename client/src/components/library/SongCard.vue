<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useAuthStore } from '@/stores/authStore'
  import api from '@/utils/api'

  const props = defineProps<{
    id: string
    title: string
    artist?: string
    coverImage?: string
    bpm?: number
    playCount: number
    creatorId?: number
  }>()

  const emit = defineEmits<{
    deleted: [id: string]
  }>()

  const authStore = useAuthStore()
  const showDeleteConfirm = ref(false)
  const deleting = ref(false)

  const canDelete = computed(() => {
    if (!authStore.isLoggedIn || !props.creatorId) return false
    return props.creatorId === authStore.user?.id || authStore.user?.username ===
  'admin'
  })

  const gradientStyle = computed(() => {
    let hash = 0
    for (let i = 0; i < props.id.length; i++) {
      hash = props.id.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue1 = Math.abs(hash % 60) + 320
    const hue2 = hue1 + 40
    return {
      background: `linear-gradient(135deg, oklch(0.45 0.15 ${hue1}), oklch(0.35 0.12
  ${hue2}))`
    }
  })

  const firstLetter = computed(() => {
    return props.title.charAt(0).toUpperCase()
  })

  async function handleDelete() {
    deleting.value = true
    try {
      await api.delete(`/api/maps/${props.id}`)
      emit('deleted', props.id)
      showDeleteConfirm.value = false
    } catch (err) {
      console.error('Failed to delete song:', err)
      alert('删除失败')
    } finally {
      deleting.value = false
    }
  }

  function cancelDelete() {
    showDeleteConfirm.value = false
  }
  </script>

  <template>
    <div class="song-card-wrapper">
      <router-link :to="`/map/${id}`" class="song-card">
        <div class="cover">
          <img v-if="coverImage" :src="`/uploads/${coverImage}`" :alt="title"
  class="cover-img" />
          <div v-else class="cover-placeholder" :style="gradientStyle">
            <span class="cover-letter">{{ firstLetter }}</span>
          </div>
        </div>
        <div class="info">
          <div class="title">{{ title }}</div>
          <div class="artist" v-if="artist">{{ artist }}</div>
          <div class="meta">
            <span v-if="bpm" class="bpm">&#9835; {{ bpm }}</span>
            <span class="plays">&#9654; {{ playCount }}</span>
          </div>
        </div>
      

      <button
        v-if="canDelete"
        class="delete-btn"
        @click.stop.prevent="showDeleteConfirm = true"
        title="删除歌曲"
      >
        &#128465;
      </button>
    </router-link>
      <div v-if="showDeleteConfirm" class="delete-confirm-overlay" @click.stop>
        <div class="delete-confirm-dialog">
          <p>确定要删除「{{ title }}」吗？</p>
          <p class="delete-warning">此操作不可恢复</p>
          <div class="delete-actions">
            <button class="cancel-btn" @click="cancelDelete"
  :disabled="deleting">取消</button>
            <button class="confirm-delete-btn" @click="handleDelete"
  :disabled="deleting">
              {{ deleting ? '删除中...' : '确认删除' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>

  <style scoped>
  .song-card-wrapper {
    position: relative;
  }

  .song-card {
    position: relative;
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

  .delete-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: oklch(0.2 0.02 280 / 0.8);
    border: 1px solid oklch(0.4 0.02 280 / 0.5);
    color: white;
    font-size: 14px;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  }

  .song-card-wrapper:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    background: oklch(0.55 0.2 25);
    border-color: oklch(0.55 0.2 25);
    transform: scale(1.1);
  }

  .delete-confirm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: oklch(0 0 0 / 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .delete-confirm-dialog {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 360px;
    width: 90%;
    box-shadow: 0 20px 60px oklch(0 0 0 / 0.5);
  }

  .delete-confirm-dialog p {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: var(--text);
  }

  .delete-warning {
    font-size: 0.875rem !important;
    color: oklch(0.6 0.2 25) !important;
    margin-bottom: 1.25rem !important;
  }

  .delete-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .cancel-btn {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .cancel-btn:hover:not(:disabled) {
    border-color: var(--text-muted);
  }

  .confirm-delete-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 8px;
    background: oklch(0.55 0.2 25);
    color: white;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .confirm-delete-btn:hover:not(:disabled) {
    background: oklch(0.5 0.22 25);
    transform: translateY(-1px);
  }

  .confirm-delete-btn:disabled,
  .cancel-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  </style>
