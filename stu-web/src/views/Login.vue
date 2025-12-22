<template>
  <div class="login-container">
    <div class="login-form">
      <el-card class="login-card">
        <template #header>
          <div class="login-header">
            <h2>自习室预约系统</h2>
            <p>请登录您的账户</p>
          </div>
        </template>

        <el-form
          :model="loginForm"
          :rules="loginRules"
          ref="loginFormRef"
          label-position="top"
          @submit.prevent="handleLogin"
        >
          <el-form-item label="账号" prop="userAccount">
            <el-input
              v-model="loginForm.userAccount"
              placeholder="请输入账号"
              size="large"
              :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item label="密码" prop="userPassword">
            <el-input
              v-model="loginForm.userPassword"
              type="password"
              placeholder="请输入密码"
              size="large"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <el-form-item>
            <div class="form-item-row">
              <el-link type="primary" class="forgot-link">忘记密码？</el-link>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              style="width: 100%"
              :loading="loading"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登录' }}
            </el-button>
          </el-form-item>

          <el-divider>或者</el-divider>

          <el-form-item>
            <el-button size="large" style="width: 100%" @click="goToRegister">
              注册新账户
            </el-button>
          </el-form-item>

          <el-form-item>
            <el-button type="text" style="width: 100%; color: #7f8c8d;" @click="goToAdminLogin">
              🔐 管理员登录
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <div class="login-footer">
      <p>© 2025 自习室预约系统 - 让学习更高效</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = reactive({
  userAccount: '',
  userPassword: ''
})

const loginRules: FormRules = {
  userAccount: [
    { required: true, message: '请输入账号', trigger: 'blur' }
  ],
  userPassword: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 12, message: '密码长度在 6 到 12 个字符', trigger: 'blur' }
  ]
}

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return

  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true

  try {
    // 1. 发送登录请求
    const response = await fetch('http://120.46.219.204:8080/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAccount: loginForm.userAccount,
        userPassword: loginForm.userPassword
      })
    })

    const result = await response.json()

    if (result.code === 200) {
      // 2. 登录成功后，获取用户ID
      const userId = await fetchUserId(loginForm.userAccount)

      if (userId) {
        // 保存登录状态和用户信息
        sessionStorage.setItem('isLoggedIn', 'true')
        sessionStorage.setItem('userAccount', loginForm.userAccount)
        sessionStorage.setItem('userId', String(userId))

        ElMessage.success('登录成功！')
        router.push('/home')
      } else {
        ElMessage.error('获取用户信息失败')
      }
    } else {
      ElMessage.error(result.message || '登录失败，用户名或密码错误')
    }
  } catch (error) {
    console.error('登录请求失败:', error)
    ElMessage.error('登录失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 获取用户ID
const fetchUserId = async (userAccount: string): Promise<number | null> => {
  try {
    // 获取所有用户列表
    const response = await fetch('http://120.46.219.204:8080/admin/users')
    const result = await response.json()

    if (result.code === 200 && result.data) {
      // 找到匹配账号的用户
      const user = result.data.find((u: any) => u.userAccount === userAccount)
      if (user) {
        // 保存用户名
        sessionStorage.setItem('userName', user.userName || userAccount)
        return user.userId
      }
    }
    return null
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

const goToRegister = () => {
  router.push('/register')
}

const goToAdminLogin = () => {
  router.push('/admin/login')
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.login-form {
  width: 100%;
  max-width: 400px;
  margin-bottom: 20px;
}

.login-card {
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  padding: 10px 0;
}

.login-header h2 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 24px;
}

.login-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.form-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.forgot-link {
  margin-left: auto;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #2c3e50;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 600;
}

.login-footer {
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

@media (max-width: 480px) {
  .login-form {
    max-width: 100%;
    padding: 0 15px;
  }
}
</style>
