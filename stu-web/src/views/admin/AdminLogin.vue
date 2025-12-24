<template>
  <div class="admin-login-container">
    <div class="login-form">
      <el-card class="login-card">
        <template #header>
          <div class="login-header">
            <h2>🔐 管理员登录</h2>
            <p>自习室预约系统 - 管理后台</p>
          </div>
        </template>

        <el-form
          :model="loginForm"
          :rules="loginRules"
          ref="loginFormRef"
          label-position="top"
          @submit.prevent="handleLogin"
        >
          <el-form-item label="管理员账号" prop="adminAccount">
            <el-input
              v-model="loginForm.adminAccount"
              placeholder="请输入管理员账号"
              size="large"
              :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item label="密码" prop="adminPassword">
            <el-input
              v-model="loginForm.adminPassword"
              type="password"
              placeholder="请输入密码"
              size="large"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              style="width: 100%"
              :loading="loading"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登录管理后台' }}
            </el-button>
          </el-form-item>

          <el-divider />

          <el-form-item>
            <el-button size="large" style="width: 100%" @click="goToUserLogin">
              返回用户登录
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 底部信息 -->
    <div class="login-footer">
      <p>© 2025 自习室预约系统 - 管理后台</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

// 路由
const router = useRouter()

// 表单引用
const loginFormRef = ref<FormInstance>()

// 加载状态
const loading = ref(false)

// 表单数据
const loginForm = reactive({
  adminAccount: '',
  adminPassword: ''
})

// 表单验证规则
const loginRules: FormRules = {
  adminAccount: [
    { required: true, message: '请输入管理员账号', trigger: 'blur' }
  ],
  adminPassword: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return

  // 表单验证
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true

  try {
    // 发送 POST 请求到后端进行登录验证
    const response = await fetch('http://120.46.219.204:8080/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adminAccount: loginForm.adminAccount,
        adminPassword: loginForm.adminPassword
      })
    })

    // 解析后端响应
    const result = await response.json()

    if (result.code === 200) {
      // 登录成功，保存状态
      sessionStorage.setItem('isAdminLoggedIn', 'true')
      sessionStorage.setItem('adminAccount', loginForm.adminAccount)
      if (result.data) {
        sessionStorage.setItem('adminId', result.data.adminId)
        sessionStorage.setItem('adminName', result.data.adminName || loginForm.adminAccount)
      }

      ElMessage.success('登录成功！')
      router.push('/admin/dashboard')
    } else {
      ElMessage.error(result.message || '登录失败，账号或密码错误')
    }
  } catch (error) {
    console.error('登录请求失败:', error)
    ElMessage.error('登录失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 返回用户登录
const goToUserLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.admin-login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1e3a5f 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.login-form {
  width: 100%;
  max-width: 420px;
  margin-bottom: 20px;
}

.login-card {
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  padding: 10px 0;
}

.login-header h2 {
  margin: 0 0 8px 0;
  color: #1e3a5f;
  font-size: 24px;
}

.login-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #2c3e50;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  border: none;
  border-radius: 8px;
  font-weight: 600;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #2d5a87 0%, #3d7ab7 100%);
}

:deep(.el-button:not(.el-button--primary)) {
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
}
</style>
