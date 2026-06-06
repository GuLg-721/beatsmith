<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../stores/authStore'

const authStore = useAuthStore()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function handleSubmit() {
  error.value = ''
  success.value = ''

  if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
    error.value = '请填写所有字段'
    return
  }

  if (newPassword.value.length < 8) {
    error.value = '新密码长度至少 8 位'
    return
  }

  if (!/[a-zA-Z]/.test(newPassword.value) || !/[0-9]/.test(newPassword.value)) {
    error.value = '新密码必须包含字母和数字'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  try {
    await authStore.updatePassword(oldPassword.value, newPassword.value)
    success.value = '密码修改成功！'
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : '修改失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="password-form" @submit.prevent="handleSubmit">
    <div class="form-group">
      <label>当前密码</label>
      <input
        v-model="oldPassword"
        type="password"
        placeholder="请输入当前密码"
        autocomplete="current-password"
      />
    </div>

    <div class="form-group">
      <label>新密码</label>
      <input
        v-model="newPassword"
        type="password"
        placeholder="请输入新密码（至少8位，包含字母和数字）"
        autocomplete="new-password"
      />
    </div>

    <div class="form-group">
      <label>确认新密码</label>
      <input
        v-model="confirmPassword"
        type="password"
        placeholder="请再次输入新密码"
        autocomplete="new-password"
      />
    </div>

    <div v-if="error" class="message error">{{ error }}</div>
    <div v-if="success" class="message success">{{ success }}</div>

    <button type="submit" class="save-btn" :disabled="loading">
      {{ loading ? '保存中...' : '💾 保存' }}
    </button>
  </form>
</template>

<style scoped>
.password-form {
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
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
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
