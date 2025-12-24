<template>
  <div class="register-container">
    <div class="register-form">
      <h2>用户注册</h2>

      <!-- 注册表单 -->
      <form @submit.prevent="handleSubmit">
        <!-- 用户名 -->
        <div class="form-group">
          <label for="userName">用户名:</label>
          <input
            type="text"
            id="userName"
            v-model="formData.userName"
            placeholder="请输入用户名"
            required
          />
          <div v-if="errors.userName" class="error">{{ errors.userName }}</div>
        </div>

        <!-- 账号/邮箱 -->
        <div class="form-group">
          <label for="userAccount">账号/邮箱:</label>
          <input
            type="email"
            id="userAccount"
            v-model="formData.userAccount"
            placeholder="请输入邮箱作为账号"
            required
          />
          <div v-if="errors.userAccount" class="error">{{ errors.userAccount }}</div>
        </div>

        <!-- 密码 -->
        <div class="form-group">
          <label for="userPassword">密码:</label>
          <input
            type="password"
            id="userPassword"
            v-model="formData.userPassword"
            placeholder="请输入6-12位密码"
            required
            @input="validatePassword"
          />
          <div v-if="errors.userPassword" class="error">{{ errors.userPassword }}</div>
          <div v-if="formData.userPassword && !errors.userPassword" class="password-strength">
            密码强度: {{ getPasswordStrength() }}
          </div>
        </div>

        <!-- 确认密码 -->
        <div class="form-group">
          <label for="confirmPassword">确认密码:</label>
          <input
            type="password"
            id="confirmPassword"
            v-model="confirmPassword"
            placeholder="请再次输入密码"
            required
            @input="validateConfirmPassword"
          />
          <div v-if="errors.confirmPassword" class="error">{{ errors.confirmPassword }}</div>
        </div>

        <!-- 提交按钮 -->
        <button type="submit" :disabled="loading || !isFormValid">
          {{ loading ? '注册中...' : '立即注册' }}
        </button>

        <!-- 登录链接 -->
        <div class="login-link">
          已有账号？<router-link to="/login">立即登录</router-link>
        </div>

        <!-- 消息提示 -->
        <div v-if="message" :class="['message', messageType]">
          {{ message }}
        </div>
      </form>

      <!-- 显示发送的JSON数据（调试用） -->
      <div class="debug-info" v-if="debug">
        <h3>发送的数据：</h3>
        <pre>{{ getRequestData() }}</pre>
        <button @click="debug = !debug">隐藏调试信息</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'

// 使用 Vue Router
const router = useRouter()

// 表单数据
const formData = reactive({
  userName: '',
  userAccount: '',
  userPassword: ''
})

// 状态管理
const confirmPassword = ref('')
const loading = ref(false)
const message = ref('')
const messageType = ref('')
const errors = reactive({})
const debug = ref(false)

// 表单验证
const validateForm = () => {
  // 清空之前的错误
  Object.keys(errors).forEach(key => delete errors[key])

  let isValid = true

  // 用户名验证
  if (!formData.userName.trim()) {
    errors.userName = '用户名不能为空'
    isValid = false
  } else if (formData.userName.length < 2) {
    errors.userName = '用户名至少2个字符'
    isValid = false
  } else if (formData.userName.length > 20) {
    errors.userName = '用户名不能超过20个字符'
    isValid = false
  }

  // 账号验证 - 邮箱格式
  if (!formData.userAccount.trim()) {
    errors.userAccount = '账号不能为空'
    isValid = false
  } else if (!isValidEmail(formData.userAccount)) {
    errors.userAccount = '请输入有效的邮箱地址'
    isValid = false
  }

  // 密码验证 (6-12位)
  if (!formData.userPassword) {
    errors.userPassword = '密码不能为空'
    isValid = false
  } else if (formData.userPassword.length < 6) {
    errors.userPassword = '密码至少6个字符'
    isValid = false
  } else if (formData.userPassword.length > 12) {
    errors.userPassword = '密码不能超过12个字符'
    isValid = false
  }

  // 确认密码验证
  if (!confirmPassword.value) {
    errors.confirmPassword = '请确认密码'
    isValid = false
  } else if (formData.userPassword !== confirmPassword.value) {
    errors.confirmPassword = '两次输入的密码不一致'
    isValid = false
  }

  return isValid
}

// 邮箱验证函数
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 密码验证函数
const validatePassword = () => {
  if (errors.userPassword) delete errors.userPassword

  if (formData.userPassword) {
    if (formData.userPassword.length < 6) {
      errors.userPassword = '密码至少6个字符'
    } else if (formData.userPassword.length > 12) {
      errors.userPassword = '密码不能超过12个字符'
    }
  }
}

// 确认密码验证函数
const validateConfirmPassword = () => {
  if (errors.confirmPassword) delete errors.confirmPassword

  if (confirmPassword.value && formData.userPassword !== confirmPassword.value) {
    errors.confirmPassword = '两次输入的密码不一致'
  }
}

// 计算密码强度
const getPasswordStrength = () => {
  const password = formData.userPassword
  if (!password) return ''

  let strength = 0
  if (password.length >= 6) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^A-Za-z0-9]/.test(password)) strength++

  const levels = ['弱', '中', '强', '很强']
  return levels[Math.min(strength - 1, 3)] || ''
}

// 表单是否有效
const isFormValid = computed(() => {
  return formData.userName &&
    formData.userAccount &&
    formData.userPassword &&
    confirmPassword.value &&
    !errors.userName &&
    !errors.userAccount &&
    !errors.userPassword &&
    !errors.confirmPassword
})

// 获取请求数据
const getRequestData = () => {
  return {
    userName: formData.userName,
    userAccount: formData.userAccount,
    userPassword: formData.userPassword
  }
}

// 处理表单提交
const handleSubmit = async () => {
  // 验证表单
  if (!validateForm()) {
    message.value = '请正确填写表单信息'
    messageType.value = 'error'
    return
  }

  // 设置加载状态
  loading.value = true
  message.value = ''
  messageType.value = ''

  try {
    // 准备发送的数据 - 只发送必需字段
    const requestData = getRequestData()

    console.log('发送的数据:', requestData)
    console.log('发送到:', '/api/user/register')

    // 发送POST请求到后端
    const response = await fetch('/api/user/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    // 解析响应
    const result = await response.json()
    console.log('响应结果:', result)

    // 处理响应
    if (response.ok) {
      message.value = result.message || '注册成功！正在跳转到登录页面...'
      messageType.value = 'success'

      // 注册成功后延迟1.5秒跳转到登录页面
      setTimeout(() => {
        // 使用Vue Router跳转到登录页面
        router.push('/login')

        // 或者使用编程式导航跳转
        // router.push({ name: 'login' }) // 如果配置了路由名称
      }, 1500)
    } else {
      // 根据后端返回的错误信息显示
      message.value = result.message || `注册失败，状态码: ${response.status}`
      messageType.value = 'error'
    }

  } catch (error) {
    console.error('注册请求失败:', error)
    message.value = '网络错误，请检查连接或服务器是否运行'
    messageType.value = 'error'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-form {
  width: 100%;
  max-width: 450px;
  padding: 40px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 28px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 25px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
  font-size: 14px;
}

input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 15px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

input.error-border {
  border-color: #ff4757;
}

button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}

button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 7px 14px rgba(0, 0, 0, 0.1);
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #666;
}

.login-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.login-link a:hover {
  text-decoration: underline;
}

.error {
  color: #ff4757;
  font-size: 12px;
  margin-top: 5px;
  min-height: 18px;
}

.password-strength {
  color: #666;
  font-size: 12px;
  margin-top: 5px;
  min-height: 18px;
}

.message {
  margin-top: 20px;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
}

.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.debug-info {
  margin-top: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 13px;
}

.debug-info h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #666;
}

.debug-info pre {
  background-color: #e9ecef;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  margin-bottom: 10px;
}

.debug-info button {
  background: #6c757d;
  margin-top: 0;
  padding: 8px 16px;
  font-size: 14px;
}

.debug-info button:hover {
  background: #5a6268;
}
</style>
