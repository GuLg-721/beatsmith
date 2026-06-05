<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import AuroraBackground from '@/components/common/AuroraBackground.vue'
import {
  NForm,
  NFormItem,
  NInput,
  NButton,
  NAlert,
} from 'naive-ui'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isLogin = ref(true)
const errorMsg = ref('')
const slideKey = ref(0)

const form = reactive({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度应为 3-20 位', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  nickname: [{ max: 20, message: '昵称最多 20 位', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码至少 8 位', trigger: 'blur' },
    { pattern: /[a-zA-Z]/, message: '密码必须包含字母', trigger: 'blur' },
    { pattern: /[0-9]/, message: '密码必须包含数字', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string) => {
        if (value !== form.password) return new Error('两次密码不一致')
        return true
      },
      trigger: 'blur'
    }
  ]
}

const formRef = ref()

async function handleSubmit() {
  errorMsg.value = ''
  try {
    await formRef.value?.validate()
  } catch { return }

  let result
  if (isLogin.value) {
    result = await authStore.login(form.username, form.password)
  } else {
    result = await authStore.register(form.username, form.password, form.nickname || form.username)
  }

  if (result.success) {
    router.push((route.query.redirect as string) || '/songs')
  } else {
    errorMsg.value = result.message
  }
}

function toggleMode() {
  isLogin.value = !isLogin.value
  slideKey.value++
  errorMsg.value = ''
  form.username = ''
  form.nickname = ''
  form.password = ''
  form.confirmPassword = ''
}
</script>

<template>
  <div class="login-page">
    <AuroraBackground />

    <div class="login-container">
      <div class="card-glow" />
      <div class="login-card">
        <!-- Logo -->
        <div class="logo">
          <span class="logo-icon">⚒️</span>
          <span class="logo-text">BeatSmith</span>
        </div>

        <NAlert v-if="errorMsg" type="error" :title="errorMsg" closable @close="errorMsg = ''" class="error-alert" />

        <Transition :name="isLogin ? 'slide-left' : 'slide-right'" mode="out-in">
          <div :key="slideKey">
            <!-- Login Form -->
            <NForm v-if="isLogin" ref="formRef" :model="form" :rules="rules" @submit.prevent="handleSubmit" :show-label="true">
              <NFormItem path="username" label="用户名">
                <NInput v-model:value="form.username" placeholder="输入用户名" :disabled="authStore.loading" />
              </NFormItem>
              <NFormItem path="password" label="密码">
                <NInput v-model:value="form.password" type="password" show-password-on="click" placeholder="输入密码" :disabled="authStore.loading" />
              </NFormItem>
              <NButton type="primary" block strong :loading="authStore.loading" :disabled="authStore.loading" class="submit-btn" @click="handleSubmit">
                登录
              </NButton>
            </NForm>

            <!-- Register Form -->
            <NForm v-else ref="formRef" :model="form" :rules="rules" @submit.prevent="handleSubmit" :show-label="true">
              <NFormItem path="username" label="用户名">
                <NInput v-model:value="form.username" placeholder="3-20 位，字母数字下划线" :disabled="authStore.loading" />
              </NFormItem>
              <NFormItem path="nickname" label="昵称（可选）">
                <NInput v-model:value="form.nickname" placeholder="显示名称" :disabled="authStore.loading" />
              </NFormItem>
              <NFormItem path="password" label="密码">
                <NInput v-model:value="form.password" type="password" show-password-on="click" placeholder="至少 8 位，字母+数字" :disabled="authStore.loading" />
              </NFormItem>
              <NFormItem path="confirmPassword" label="确认密码">
                <NInput v-model:value="form.confirmPassword" type="password" show-password-on="click" placeholder="再次输入密码" :disabled="authStore.loading" />
              </NFormItem>
              <NButton type="primary" block strong :loading="authStore.loading" :disabled="authStore.loading" class="submit-btn" @click="handleSubmit">
                注册
              </NButton>
            </NForm>
          </div>
        </Transition>

        <div class="toggle">
          <span class="toggle-text">{{ isLogin ? '没有账号？' : '已有账号？' }}</span>
          <button class="toggle-btn" @click="toggleMode" :disabled="authStore.loading">
            {{ isLogin ? '立即注册' : '立即登录' }}
          </button>
        </div>
      </div>

      <router-link to="/" class="back-link">← 返回首页</router-link>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

/* 外层旋转发光 */
.card-glow {
  position: absolute;
  width: 420px;
  max-width: calc(90vw + 8px);
  height: calc(100% + 8px);
  top: -4px;
  border-radius: 18px;
  background: conic-gradient(
    from 0deg,
    oklch(0.62 0.22 350 / 0.6),
    oklch(0.78 0.15 195 / 0.6),
    oklch(0.55 0.18 280 / 0.6),
    oklch(0.62 0.22 350 / 0.6)
  );
  filter: blur(16px);
  opacity: 0.4;
  animation: glowSpin 4s linear infinite;
  z-index: 0;
}

@keyframes glowSpin {
  to { transform: rotate(360deg); }
}

.login-card {
  position: relative;
  width: 420px;
  max-width: 90vw;
  background: oklch(0.10 0.008 280 / 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid oklch(0.62 0.22 350 / 0.25);
  border-radius: 16px;
  padding: 2.5rem;
  z-index: 1;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.login-card:hover {
  border-color: oklch(0.62 0.22 350 / 0.45);
  box-shadow: 0 0 30px oklch(0.62 0.22 350 / 0.15);
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.logo-icon { font-size: 2rem; }

.logo-text {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.02em;
}

.error-alert { margin-bottom: 1.5rem; }

:deep(.n-form-item-label__text) {
  color: var(--muted) !important;
  font-size: 0.8125rem !important;
}

:deep(.n-input) {
  --n-border: 1px solid oklch(0.22 0.005 280) !important;
  --n-border-hover: 1px solid oklch(0.62 0.22 350 / 0.4) !important;
  --n-border-focus: 1px solid var(--primary) !important;
  --n-color: oklch(0.08 0.005 280) !important;
  --n-text-color: var(--ink) !important;
  --n-placeholder-color: oklch(0.40 0.005 280) !important;
  border-radius: 8px !important;
  transition: all 0.3s ease-out !important;
}

:deep(.n-input:focus-within) {
  box-shadow: 0 0 0 3px oklch(0.62 0.22 350 / 0.1), 0 0 20px oklch(0.62 0.22 350 / 0.12) !important;
}

:deep(.n-button--primary-type) {
  --n-color: var(--primary) !important;
  --n-color-hover: var(--primary-hover) !important;
  --n-border-color: var(--primary) !important;
  --n-border-color-hover: var(--primary-hover) !important;
  --n-text-color: white !important;
  margin-top: 0.5rem;
  height: 44px !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  transition: all 0.3s ease-out !important;
}

:deep(.n-button--primary-type:hover) {
  box-shadow: 0 0 25px oklch(0.62 0.22 350 / 0.35) !important;
  transform: translateY(-1px);
}

:deep(.n-button--primary-type:active) {
  transform: translateY(0);
}

.toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.toggle-text {
  color: oklch(0.50 0.005 280);
  font-size: 0.875rem;
}

.toggle-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  color: var(--accent-hover);
  text-shadow: 0 0 12px oklch(0.78 0.15 195 / 0.5);
}

.back-link {
  color: oklch(0.45 0.005 280);
  font-size: 0.875rem;
  text-decoration: none;
  transition: color 0.2s;
}

.back-link:hover { color: var(--ink); }

/* 滑动切换动画 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(40px);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-40px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-40px);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

@media (prefers-reduced-motion: reduce) {
  .card-glow { animation: none; }
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: opacity 0.2s;
  }
  .slide-left-enter-from,
  .slide-left-leave-to,
  .slide-right-enter-from,
  .slide-right-leave-to {
    transform: none;
  }
}
</style>
