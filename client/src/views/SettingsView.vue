<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import AvatarPicker from '../components/settings/AvatarPicker.vue'
import PasswordForm from '../components/settings/PasswordForm.vue'
import ThemePicker from '../components/settings/ThemePicker.vue'
import ThemeBackground from '@/components/common/ThemeBackground.vue'

const router = useRouter()
const authStore = useAuthStore()

const nickname = ref('')
const saving = ref(false)
const nicknameError = ref('')
const nicknameSuccess = ref('')

onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  nickname.value = authStore.user?.nickname || ''
})

async function saveNickname() {
  nicknameError.value = ''
  nicknameSuccess.value = ''

  if (nickname.value.length < 2 || nickname.value.length > 20) {
    nicknameError.value = '昵称长度应为 2-20 位'
    return
  }

  if (!/^[a-zA-Z0-9一-龥_]+$/.test(nickname.value)) {
    nicknameError.value = '昵称只能包含字母、数字、中文和下划线'
    return
  }

  saving.value = true
  try {
    await authStore.updateProfile(nickname.value)
    nicknameSuccess.value = '昵称修改成功！'
  } catch (err) {
    nicknameError.value = err instanceof Error ? err.message : '修改失败'
  } finally {
    saving.value = false
  }
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <div class="settings-page">
    <ThemeBackground :reduced="true" />
    <nav class="top-nav">
      <button class="back-btn" @click="goBack">← 返回</button>
      <span class="nav-title">⚙️ 设置</span>
    </nav>

    <!-- 个人信息卡片 -->
    <div class="settings-card">
      <h2 class="card-title">👤 个人信息</h2>
      <AvatarPicker />
      <div class="nickname-section">
        <div class="form-group">
          <label>昵称</label>
          <input
            v-model="nickname"
            type="text"
            placeholder="请输入昵称"
            maxlength="20"
          />
        </div>
        <div v-if="nicknameError" class="message error">{{ nicknameError }}</div>
        <div v-if="nicknameSuccess" class="message success">{{ nicknameSuccess }}</div>
        <button class="save-btn" @click="saveNickname" :disabled="saving">
          {{ saving ? '保存中...' : '💾 保存' }}
        </button>
      </div>
    </div>

    <!-- 修改密码卡片 -->
    <div class="settings-card">
      <h2 class="card-title">🔒 修改密码</h2>
      <PasswordForm />
    </div>

    <!-- 主题配色卡片 -->
    <div class="settings-card">
      <h2 class="card-title">🎨 主题配色</h2>
      <ThemePicker />
    </div>
  </div>
</template>

<style scoped>
.top-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.back-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.back-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.nav-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary);
}

.settings-page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.settings-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  transition: border-color 0.2s;
}

.settings-card:hover {
  border-color: var(--border-glow);
}

.card-title {
  color: var(--text);
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid var(--border);
}

.nickname-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.form-group input {
  padding: 0.7rem 1rem;
  border: 1px solid var(--input-border, var(--border));
  border-radius: 8px;
  background: var(--input-bg, var(--bg-surface));
  color: var(--text);
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--input-focus, var(--primary));
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
}

.form-group input::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}

.message {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.message.error {
  background: rgba(255, 68, 102, 0.15);
  color: var(--error);
  border: 1px solid rgba(255, 68, 102, 0.3);
}

.message.success {
  background: rgba(0, 255, 136, 0.15);
  color: var(--success);
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.save-btn {
  align-self: flex-start;
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: #000;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--primary-glow);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
