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
          <el-form-item label="账号" prop="Account">
            <el-input
              v-model="loginForm.userAccount"
              placeholder="请输入账号"
              size="large"
              :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item label="密码" prop="Password">
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

        </el-form>
      </el-card>
    </div>

    <!-- 底部信息 -->
    <div class="login-footer">
      <p>© 2025 自习室预约系统 - 让学习更高效</p>
    </div>
  </div>
</template>

<style scoped>
.form-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.forgot-link {
  margin-left: auto; /* 确保链接靠右 */
}
</style>

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
  userAccount: '',
  userPassword: ''
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

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return

  // 表单验证
  const valid = await loginFormRef.value.validate()
  if (!valid) return

  loading.value = true

  try {
    // 发送 POST 请求到后端进行登录验证
    const response = await fetch('http://localhost:8080/user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userAccount: loginForm.userAccount,
        userPassword: loginForm.userPassword
      })
    });

    // 解析后端响应
    const result = await response.json();

    if (result.code === 200) {
      // 登录成功，保存状态，跳转到首页
      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('userAccount', loginForm.userAccount);

      ElMessage.success(result.message || '登录成功！');
      router.push('/home');
    } else {
      // 登录失败，显示错误信息
      if (result.data && typeof result.data === 'object') {
        // 循环展示每个字段的错误信息
        for (const field in result.data) {
          if (result.data.hasOwnProperty(field)) {
            ElMessage.error(result.data[field]); // 显示每个字段的错误信息
          }
        }
      } else {
        // 通用错误信息
        ElMessage.error(result.message || '登录失败，用户名或密码错误');
      }
    }
  } catch (error) {
    console.error('登录请求失败:', error);
    ElMessage.error('登录失败，请检查网络连接');
  } finally {
    loading.value = false;
  }

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
}
</style>
