<template>
  <div class="login-container">
    <div class="login-form">
      <el-card class="login-card">
        <template #header>
          <div class="login-header">
            <h2>自习室预约系统</h2>
            <div class="login-mode-toggle">
              <div class="mode-tabs">
                <button
                  :class="['mode-tab', { 'active': loginMode === 'user' }]"
                  @click="switchMode('user')"
                >
                  普通用户
                </button>
                <button
                  :class="['mode-tab', { 'active': loginMode === 'admin' }]"
                  @click="switchMode('admin')"
                >
                  管理员
                </button>
              </div>
              <p>{{ modeDescription }}</p>
            </div>
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

          <!-- 普通用户的忘记密码 -->
          <el-form-item v-if="loginMode === 'user'">
            <div class="form-item-row">
              <el-link type="primary" class="forgot-link" @click="handleForgotPassword">
                忘记密码？
              </el-link>
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
              {{ loading ? '登录中...' : loginButtonText }}
            </el-button>
          </el-form-item>

          <!-- 普通用户的注册选项 -->
          <div v-if="loginMode === 'user'">
            <el-divider>或者</el-divider>

            <el-form-item>
              <el-button size="large" style="width: 100%" @click="goToRegister">
                注册新账户
              </el-button>
            </el-form-item>
          </div>
        </el-form>
      </el-card>
    </div>

    <!-- 底部信息 -->
    <div class="login-footer">
      <p>© 2025 自习室预约系统 - 让学习更高效</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

// 路由
const router = useRouter()

// 登录模式：user(普通用户) / admin(管理员)
const loginMode = ref<'user' | 'admin'>('user')

// 表单引用
const loginFormRef = ref<FormInstance>()

// 加载状态
const loading = ref(false)

// 表单数据
const loginForm = reactive({
  userAccount: '',
  userPassword: ''
})

// 计算属性
const modeDescription = computed(() => {
  return loginMode.value === 'user'
    ? '请登录您的用户账户'
    : '请使用管理员账户登录'
})

const loginButtonText = computed(() => {
  return loginMode.value === 'user' ? '登录' : '管理员登录'
})

// 表单验证规则
const loginRules: FormRules = {
  userAccount: [
    { required: true, message: '请输入账号', trigger: 'blur' },
  ],
  userPassword: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 12, message: '密码长度在 6 到 12 个字符', trigger: 'blur' }
  ]
}

// 切换登录模式
const switchMode = (mode: 'user' | 'admin') => {
  loginMode.value = mode
  // 清空表单
  loginForm.userAccount = ''
  loginForm.userPassword = ''
  if (loginFormRef.value) {
    loginFormRef.value.clearValidate()
  }
}

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return

  // 表单验证
  const valid = await loginFormRef.value.validate()
  if (!valid) return

  loading.value = true

  try {
    // 根据登录模式选择不同的接口
    const endpoint = loginMode.value === 'user' ? '/user/login' : '/admin/login'
    const url = `http://localhost:8080${endpoint}`

    // 发送 POST 请求到后端进行登录验证
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userAccount: loginForm.userAccount,
        userPassword: loginForm.userPassword
      })
    })

    // 解析后端响应
    const result = await response.json()

    if (result.code === 200) {
      // 登录成功，保存用户信息到 sessionStorage
      sessionStorage.setItem('isLoggedIn', 'true')
      sessionStorage.setItem('userAccount', loginForm.userAccount)
      sessionStorage.setItem('loginMode', loginMode.value) // 保存登录模式

      // 保存用户ID和其他信息
      sessionStorage.setItem('userId', result.data.userId)
      sessionStorage.setItem('username', result.data.username)

      // 如果是管理员，保存管理员标识
      if (loginMode.value === 'admin') {
        sessionStorage.setItem('isAdmin', 'true')
      }

      // 保存整个用户对象（可选）
      sessionStorage.setItem('userInfo', JSON.stringify(result.data))

      ElMessage.success(result.message || '登录成功！')

      // 根据登录模式跳转到不同页面
      if (loginMode.value === 'user') {
        router.push('/home')
      } else {
        // 管理员登录后的跳转页面（例如管理后台）
        router.push('/admin/dashboard')
      }
    } else {
      // 登录失败，显示错误信息
      if (result.data && typeof result.data === 'object') {
        // 循环展示每个字段的错误信息
        for (const field in result.data) {
          if (result.data.hasOwnProperty(field)) {
            ElMessage.error(result.data[field])
          }
        }
      } else {
        // 通用错误信息
        const errorMsg = loginMode.value === 'user'
          ? '登录失败，用户名或密码错误'
          : '管理员登录失败，请检查账户权限'
        ElMessage.error(result.message || errorMsg)
      }
    }
  } catch (error) {
    console.error('登录请求失败:', error)
    const errorMsg = loginMode.value === 'user'
      ? '登录失败，请检查网络连接'
      : '管理员登录失败，请检查网络连接'
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}

// 忘记密码处理
const handleForgotPassword = () => {
  ElMessage.info('忘记密码功能正在开发中...')
  // 这里可以跳转到忘记密码页面
  // router.push('/forgot-password')
}

// 注册处理
const goToRegister = () => {
  router.push('/register')
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

.login-mode-toggle {
  margin-top: 10px;
}

.mode-tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}

.mode-tab {
  padding: 8px 20px;
  border: none;
  border-radius: 20px;
  background-color: #f5f7fa;
  color: #909399;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
}

.mode-tab:hover {
  background-color: #e4e7ed;
  transform: translateY(-2px);
}

.mode-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.form-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.forgot-link {
  margin-left: auto; /* 确保链接靠右 */
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

/* 响应式设计 */
@media (max-width: 480px) {
  .login-form {
    max-width: 100%;
    padding: 0 15px;
  }

  .login-card {
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }

  .mode-tabs {
    flex-direction: column;
    gap: 5px;
  }

  .mode-tab {
    width: 100%;
  }
}
</style>
