<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import ParticleBackground from './ParticleBackground.vue'
import OsuBackground from './OsuBackground.vue'
import CyberpunkBackground from './CyberpunkBackground.vue'
import ValorantBackground from './ValorantBackground.vue'

const props = defineProps<{ reduced?: boolean }>()

const authStore = useAuthStore()

const currentTheme = computed(() => authStore.user?.theme || 'osu')
</script>

<template>
  <!-- osu: 首页用 ParticleBackground，其他页面用 OsuBackground -->
  <ParticleBackground v-if="currentTheme === 'osu' && !reduced" />
  <OsuBackground v-else-if="currentTheme === 'osu'" :reduced="true" />
  <CyberpunkBackground v-else-if="currentTheme === 'cyberpunk'" :reduced="reduced" />
  <ValorantBackground v-else-if="currentTheme === 'valorant'" :reduced="reduced" />
</template>
