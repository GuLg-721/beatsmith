<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import OsuBackground from './OsuBackground.vue'
import CyberpunkBackground from './CyberpunkBackground.vue'
import ValorantBackground from './ValorantBackground.vue'

const props = defineProps<{ reduced?: boolean }>()

const authStore = useAuthStore()

const currentTheme = computed(() => authStore.user?.theme || 'osu')
</script>

<template>
  <OsuBackground v-if="currentTheme === 'osu'" :reduced="reduced" />
  <CyberpunkBackground v-else-if="currentTheme === 'cyberpunk'" :reduced="reduced" />
  <ValorantBackground v-else-if="currentTheme === 'valorant'" :reduced="reduced" />
</template>
