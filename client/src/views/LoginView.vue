<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import AuroraBackground from '@/components/common/AuroraBackground.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isLogin = ref(true)
const errorMsg = ref('')
const isAnimating = ref(false)

const form = reactive({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: ''
})

const usernameError = ref('')
const passwordError = ref('')
const confirmError = ref('')

function validateUsername() {
  if (!form.username) {
    usernameError.value = '请输入用户名'
    return false
  }
  if (form.username.length < 3 || form.username.length > 20) {
    usernameError.value = '用户名长度应为 3-20 位'
    return false
  }
  if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
    usernameError.value = '只能包含字母、数字和下划线'
    return false
  }
  usernameError.value = ''
  return true
}

function validatePassword() {
  if (!form.password) {
    passwordError.value = '请输入密码'
    return false
  }
  if (form.password.length < 8) {
    passwordError.value = '密码至少 8 位'
    return false
  }
  if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
    passwordError.value = '必须包含字母和数字'
    return false
  }
  passwordError.value = ''
  return true
}

function validateConfirm() {
  if (!isLogin.value && form.confirmPassword !== form.password) {
    confirmError.value = '两次密码不一致'
    return false
  }
  confirmError.value = ''
  return true
}

async function handleSubmit() {
  errorMsg.value = ''
  const uValid = validateUsername()
  const pValid = validatePassword()
  const cValid = validateConfirm()
  if (!uValid || !pValid || !cValid) return

  let result
  if (isLogin.value) {
    result = await authStore.login(form.username, form.password)
  } else {
    result = await authStore.register(form.username, form.password, form.nickname || form.username)
  }

  if (result.success) {
    const redirect = route.query.redirect as string
    router.push(redirect || '/songs')
  } else {
    errorMsg.value = result.message
  }
}

function toggleMode() {
  if (isAnimating.value) return
  isAnimating.value = true
  isLogin.value = !isLogin.value
  errorMsg.value = ''
  form.username = ''
  form.nickname = ''
  form.password = ''
  form.confirmPassword = ''
  usernameError.value = ''
  passwordError.value = ''
  confirmError.value = ''
  setTimeout(() => {
    isAnimating.value = false
  }, 400)
}
</script>

<template>
  <div class="login-page">
    <AuroraBackground />

    <div class="login-container">
      <div class="login-card">
        <!-- 渐变边框 -->
        <div class="card-border" />

        <!-- Logo -->
        <div class="logo">
          <span class="logo-icon">⚒️</span>
          <span class="logo-text">BeatSmith</span>
        </div>

        <!-- Error -->
        <div v-if="errorMsg" class="error-msg">
          <span class="error-icon">⚠</span>
          {{ errorMsg }}
        </div>

        <!-- Form Container with slide animation -->
        <div class="form-viewport">
          <div class="form-slider" :class="{ 'slide-left': !isLogin }">
            <!-- Login Form -->
            <div class="form-panel">
              <div class="field">
                <label class="field-label">用户名</label>
                <input
                  v-model="form.username"
                  type="text"
                  class="neon-input"
                  :class="{ 'input-error': usernameError }"
                  placeholder="输入用户名"
                  :disabled="authStore.loading"
                  @blur="validateUsername"
                />
                <span v-if="usernameError" class="field-error">{{ usernameError }}</span>
              </div>

              <div class="field">
                <label class="field-label">密码</label>
                <input
                  v-model="form.password"
                  type="password"
                  class="neon-input"
                  :class="{ 'input-error': passwordError }"
                  placeholder="输入密码"
                  :disabled="authStore.loading"
                  @blur="validatePassword"
                />
                <span v-if="passwordError" class="field-error">{{ passwordError }}</span>
              </div>

              <button
                class="submit-btn"
                :disabled="authStore.loading"
                @click="handleSubmit"
              >
                <span v-if="authStore.loading" class="spinner" />
                <span v-else>登录</span>
              </button>
            </div>

            <!-- Register Form -->
            <div class="form-panel">
              <div class="field">
                <label class="field-label">用户名</label>
                <input
                  v-model="form.username"
                  type="text"
                  class="neon-input"
                  :class="{ 'input-error': usernameError }"
                  placeholder="3-20 位，字母数字下划线"
                  :disabled="authStore.loading"
                  @blur="validateUsername"
                />
                <span v-if="usernameError" class="field-error">{{ usernameError }}</span>
              </div>

              <div class="field">
                <label class="field-label">昵称（可选）</label>
                <input
                  v-model="form.nickname"
                  type="text"
                  class="neon-input"
                  placeholder="显示名称"
                  :disabled="authStore.loading"
                />
              </div>

              <div class="field">
                <label class="field-label">密码</label>
                <input
                  v-model="form.password"
                  type="password"
                  class="neon-input"
                  :class="{ 'input-error': passwordError }"
                  placeholder="至少 8 位，字母+数字"
                  :disabled="authStore.loading"
                  @blur="validatePassword"
                />
                <span v-if="passwordError" class="field-error">{{ passwordError }}</span>
              </div>

              <div class="field">
                <label class="field-label">确认密码</label>
                <input
                  v-model="form.confirmPassword"
                  type="password"
                  class="neon-input"
                  :class="{ 'input-error': confirmError }"
                  placeholder="再次输入密码"
                  :disabled="authStore.loading"
                  @blur="validateConfirm"
                />
                <span v-if="confirmError" class="field-error">{{ confirmError }}</span>
              </div>

              <button
                class="submit-btn"
                :disabled="authStore.loading"
                @click="handleSubmit"
              >
                <span v-if="authStore.loading" class="spinner" />
                <span v-else>注册</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Toggle -->
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

.login-card {
  position: relative;
  width: 400px;
  max-width: 90vw;
  background: oklch(0.10 0.008 280 / 0.9);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 16px;
  padding: 2.5rem;
  overflow: visible;
}

/* 渐变边框 - 用伪元素实现 */
.card-border {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  pointer-events: none;
  z-index: 1;
}

.card-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1.5px;
  background: conic-gradient(
    from var(--border-angle, 0deg),
    oklch(0.62 0.22 350),
    oklch(0.78 0.15 195),
    oklch(0.55 0.18 280),
    oklch(0.62 0.22 350)
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: rotateBorder 4s linear infinite;
}

@property --border-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes rotateBorder {
  to {
    --border-angle: 360deg;
  }
}

/* 外层发光 */
.card-border::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 18px;
  background: conic-gradient(
    from var(--border-angle, 0deg),
    oklch(0.62 0.22 350 / 0.4),
    oklch(0.78 0.15 195 / 0.4),
    oklch(0.55 0.18 280 / 0.4),
    oklch(0.62 0.22 350 / 0.4)
  );
  filter: blur(12px);
  z-index: -1;
  animation: rotateBorder 4s linear infinite;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  position: relative;
  z-index: 2;
}

.logo-icon {
  font-size: 2rem;
}

.logo-text {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.02em;
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  background: oklch(0.65 0.22 25 / 0.15);
  border: 1px solid oklch(0.65 0.22 25 / 0.3);
  border-radius: 8px;
  color: oklch(0.75 0.18 25);
  font-size: 0.875rem;
  position: relative;
  z-index: 2;
}

.error-icon {
  font-size: 1rem;
}

/* 表单滑动容器 */
.form-viewport {
  overflow: hidden;
  position: relative;
  z-index: 2;
}

.form-slider {
  display: flex;
  width: 200%;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.form-slider.slide-left {
  transform: translateX(-50%);
}

.form-panel {
  width: 50%;
  flex-shrink: 0;
}

.field {
  margin-bottom: 1.25rem;
}

.field-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: oklch(0.60 0.005 280);
  margin-bottom: 0.5rem;
}

.neon-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: oklch(0.08 0.005 280);
  border: 1px solid oklch(0.22 0.005 280);
  border-radius: 8px;
  color: var(--ink);
  font-size: 0.9375rem;
  font-family: inherit;
  outline: none;
  transition: all 0.3s ease-out;
  box-sizing: border-box;
}

.neon-input::placeholder {
  color: oklch(0.40 0.005 280);
}

.neon-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px oklch(0.62 0.22 350 / 0.12), 0 0 20px oklch(0.62 0.22 350 / 0.1);
}

.neon-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-error {
  border-color: oklch(0.65 0.22 25) !important;
  box-shadow: 0 0 0 3px oklch(0.65 0.22 25 / 0.12) !important;
}

.field-error {
  display: block;
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: oklch(0.75 0.18 25);
}

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.5rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s ease-out;
  position: relative;
  overflow: hidden;
}

.submit-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent, oklch(1 0 0 / 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  box-shadow: 0 0 25px oklch(0.62 0.22 350 / 0.35);
  transform: translateY(-1px);
}

.submit-btn:hover:not(:disabled)::before {
  opacity: 1;
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  position: relative;
  z-index: 2;
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
  position: relative;
  z-index: 2;
}

.back-link:hover {
  color: var(--ink);
}

@media (prefers-reduced-motion: reduce) {
  .card-border::before,
  .card-border::after {
    animation: none;
  }

  .form-slider {
    transition: opacity 0.2s;
  }
}
</style>
