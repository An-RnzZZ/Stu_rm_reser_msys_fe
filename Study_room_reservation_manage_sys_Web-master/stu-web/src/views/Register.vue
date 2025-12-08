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
            type="text"
            id="userAccount"
            v-model="formData.userAccount"
            placeholder="请输入账号或邮箱"
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
            placeholder="请输入密码"
            required
          />
          <div v-if="errors.userPassword" class="error">{{ errors.userPassword }}</div>
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
          />
          <div v-if="errors.confirmPassword" class="error">{{ errors.confirmPassword }}</div>
        </div>

        <!-- 邮箱（可选） -->
        <div class="form-group">
          <label for="userEmail">邮箱（可选）:</label>
          <input
            type="email"
            id="userEmail"
            v-model="formData.userEmail"
            placeholder="请输入邮箱"
          />
        </div>

        <!-- 手机号（可选） -->
        <div class="form-group">
          <label for="userPhone">手机号（可选）:</label>
          <input
            type="tel"
            id="userPhone"
            v-model="formData.userPhone"
            placeholder="请输入手机号"
          />
        </div>

        <!-- 提交按钮 -->
        <button type="submit" :disabled="loading">
          {{ loading ? '注册中...' : '立即注册' }}
        </button>

        <!-- 消息提示 -->
        <div v-if="message" :class="['message', messageType]">
          {{ message }}
        </div>
      </form>

      <!-- 显示发送的JSON数据（调试用） -->
      <div class="debug-info" v-if="debug">
        <h3>发送的数据：</h3>
        <pre>{{ formData }}</pre>
        <button @click="debug = !debug">隐藏调试信息</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

// 表单数据
const formData = reactive({
  userName: '',
  userAccount: '',
  userPassword: '',
  userEmail: '',
  userPhone: ''
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
  }

  // 账号验证
  if (!formData.userAccount.trim()) {
    errors.userAccount = '账号不能为空'
    isValid = false
  } else if (formData.userAccount.length < 3) {
    errors.userAccount = '账号至少3个字符'
    isValid = false
  }

  // 密码验证
  if (!formData.userPassword) {
    errors.userPassword = '密码不能为空'
    isValid = false
  } else if (formData.userPassword.length < 6) {
    errors.userPassword = '密码至少6个字符'
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

// 处理表单提交
const handleSubmit = async () => {
  // 验证表单
  if (!validateForm()) {
    return
  }

  // 设置加载状态
  loading.value = true
  message.value = ''
  messageType.value = ''

  try {
    // 准备发送的数据
    const requestData = {
      userName: formData.userName,
      userAccount: formData.userAccount,
      userPassword: formData.userPassword,
      userEmail: formData.userEmail || null,  // 如果为空则发送null
      userPhone: formData.userPhone || null   // 如果为空则发送null
    }

    // 移除空值字段（可选）
    Object.keys(requestData).forEach(key => {
      if (requestData[key] === null || requestData[key] === '') {
        delete requestData[key]
      }
    })

    console.log('发送的数据:', requestData)

    // 发送POST请求到后端
    const response = await fetch('http://localhost:8080/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    // 解析响应
    const result = await response.json()

    // 处理响应
    if (response.ok) {
      message.value = result.message || '注册成功！'
      messageType.value = 'success'

      // 注册成功后的操作
      setTimeout(() => {
        // 跳转到登录页面或首页
        console.log('注册成功，跳转到登录页面')
        // router.push('/login')
      }, 1500)
    } else {
      message.value = result.message || '注册失败，请重试'
      messageType.value = 'error'
    }

  } catch (error) {
    console.error('注册请求失败:', error)
    message.value = '网络错误，请检查连接'
    messageType.value = 'error'
  } finally {
    loading.value = false
  }
}

// 实时显示表单数据（调试用）
const formDataJson = computed(() => {
  return JSON.stringify(formData, null, 2)
})
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.register-form {
  width: 100%;
  max-width: 400px;
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #555;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: #007bff;
}

button {
  width: 100%;
  padding: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error {
  color: #dc3545;
  font-size: 12px;
  margin-top: 5px;
}

.message {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}

.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.debug-info {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.debug-info h3 {
  margin-top: 0;
}

.debug-info pre {
  background-color: #e9ecef;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}
</style>
