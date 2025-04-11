<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h2>用户登录</h2>
      </div>
      
      <!-- 登录方式切换 -->
      <div class="login-tabs">
        <div 
          :class="['tab-item', activeTab === 'account' ? 'active' : '']" 
          @click="changeTab('account')"
        >
          密码登录
        </div>
        <div 
          :class="['tab-item', activeTab === 'sms' ? 'active' : '']"
          @click="changeTab('sms')"
        >
          短信登录
        </div>
      </div>
      
      <!-- 账号密码登录表单 -->
      <el-form
        v-if="activeTab === 'account'"
        ref="accountFormRef"
        :model="accountForm"
        :rules="accountRules"
        class="login-form"
        @submit.prevent="handleAccountLogin"
      >
        <el-form-item prop="username">
          <el-input 
            v-model="accountForm.username" 
            placeholder="请输入用户名"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input 
            v-model="accountForm.password" 
            placeholder="请输入密码" 
            type="password"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="captcha">
          <div class="captcha-container">
            <el-input 
              v-model="accountForm.captcha" 
              placeholder="请输入4位数字验证码"
              class="captcha-input"
              maxlength="4"
              inputmode="numeric"
              pattern="[0-9]*"
            />
            <div class="captcha-img" @click="refreshCaptcha">
              <img v-if="captchaImg" :src="captchaImg" alt="验证码" />
              <div v-else class="captcha-loading">加载中...</div>
            </div>
          </div>
        </el-form-item>
        
        <div class="form-options">
          <el-checkbox v-model="accountForm.remember">记住我</el-checkbox>
          <a href="javascript:void(0)" class="forget-password">忘记密码?</a>
        </div>
        
        <el-button 
          type="primary" 
          class="login-button"
          :loading="loading"
          @click="handleAccountLogin"
        >
          登录
        </el-button>
      </el-form>
      
      <!-- 短信登录表单 -->
      <el-form
        v-else
        ref="smsFormRef"
        :model="smsForm"
        :rules="smsRules"
        class="login-form"
        @submit.prevent="handleSMSLogin"
      >
        <el-form-item prop="mobile">
          <el-input 
            v-model="smsForm.mobile" 
            placeholder="请输入手机号"
            prefix-icon="Iphone"
          />
        </el-form-item>
        
        <el-form-item prop="smsCode">
          <div class="sms-container">
            <el-input 
              v-model="smsForm.smsCode" 
              placeholder="请输入短信验证码"
              class="sms-input"
            />
            <el-button 
              :disabled="smsCodeTimer > 0" 
              class="sms-button"
              @click="sendSmsCode"
            >
              {{ smsCodeTimer > 0 ? `${smsCodeTimer}秒后重试` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>
        
        <el-form-item prop="captcha">
          <div class="captcha-container">
            <el-input 
              v-model="smsForm.captcha" 
              placeholder="请输入4位数字验证码"
              class="captcha-input"
              maxlength="4"
              inputmode="numeric"
              pattern="[0-9]*"
            />
            <div class="captcha-img" @click="refreshCaptcha">
              <img v-if="captchaImg" :src="captchaImg" alt="验证码" />
              <div v-else class="captcha-loading">加载中...</div>
            </div>
          </div>
        </el-form-item>
        
        <div class="form-options">
          <el-checkbox v-model="smsForm.remember">记住我</el-checkbox>
        </div>
        
        <el-button 
          type="primary" 
          class="login-button"
          :loading="loading"
          @click="handleSMSLogin"
        >
          登录
        </el-button>
      </el-form>
      
      <div class="login-footer">
        <span>还没有账号？</span>
        <router-link to="/register" class="register-link">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/useUserStore'
import { authAPI } from '../../../api/user/auth'

// 路由
const router = useRouter()

// 用户状态
const userStore = useUserStore()

// 加载状态
const loading = ref(false)

// 当前激活的登录方式
const activeTab = ref('account')

// 验证码图片
const captchaImg = ref('')
const captchaId = ref('')

// 表单引用
const accountFormRef = ref(null)
const smsFormRef = ref(null)

// 账号密码登录表单
const accountForm = reactive({
  username: '',
  password: '',
  captcha: '',
  remember: false
})

// 短信登录表单
const smsForm = reactive({
  mobile: '',
  smsCode: '',
  captcha: '',
  remember: false
})

// 短信验证码计时器
const smsCodeTimer = ref(0)
let smsTimerInterval = null

// 账号密码登录表单验证规则
const accountRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为6-20位', trigger: 'blur' },
    { 
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 
      message: '密码需包含大小写字母和数字', 
      trigger: 'blur' 
    }
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { min: 4, max: 4, message: '验证码为4位数字', trigger: 'blur' },
    { pattern: /^\d{4}$/, message: '验证码只能是数字', trigger: 'blur' }
  ]
}

// 短信登录表单验证规则
const smsRules = {
  mobile: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  smsCode: [
    { required: true, message: '请输入短信验证码', trigger: 'blur' },
    { min: 6, max: 6, message: '短信验证码为6位数字', trigger: 'blur' }
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { min: 4, max: 4, message: '验证码为4位数字', trigger: 'blur' },
    { pattern: /^\d{4}$/, message: '验证码只能是数字', trigger: 'blur' }
  ]
}

// 切换登录方式
const changeTab = (tab) => {
  activeTab.value = tab
}

// 刷新验证码
const refreshCaptcha = async () => {
  try {
    captchaImg.value = '' // 清空当前验证码
    
    // 添加加载状态提示
    const captchaElement = document.querySelector('.captcha-img');
    if (captchaElement) {
      captchaElement.classList.add('loading');
    }
    
    const res = await authAPI.getCaptchaImage()
    
    if (res && res.data && res.data.captchaImg) {
      captchaImg.value = res.data.captchaImg
      captchaId.value = res.data.captchaId || ''
      
      ElMessage({
        message: '验证码已更新',
        type: 'success',
        duration: 1000
      });
    } else {
      ElMessage.error('验证码数据格式不正确')
    }
  } catch (error) {
    // 使用一个固定的验证码用于测试
    captchaImg.value = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAAoCAMAAAA/pq9QAAABI1BMVEX///9JSUlTU1NXV1daWlpbW1tcXFxdXV1eXl5hYWFiYmJkZGRlZWVmZmZnZ2doaGhpaWlqampra2tsbGxtbW1wcHBxcXFycnJ0dHR1dXV2dnZ3d3d4eHh5eXl6enp7e3t9fX1+fn5/f3+EhISFhYWHh4eJiYmKioqLi4uMjIyNjY2Ojo6Pj4+QkJCRkZGSkpKTk5OUlJSVlZWWlpaXl5eYmJiZmZmampqbm5ucnJydnZ2enp6fn5+goKChoaGioqKlpaWnp6epqamrq6usrKytra2urq6vr6+wsLCxsbGzs7O0tLS1tbW4uLi5ubm6urq8vLy9vb2+vr6/v7/AwMDBwcHCwsLDw8PExMTFxcXGxsbHx8fIyMjJycnLy8vQ0NDR0dHS0tLT09PU1NTV1dXt7e3u7u4vTP+kAAAAp0lEQVR42u3SyQGCABQE0AEBAQXc9xXc9wUE+e8oXMBiFHWbd0gnzSQmkUgkkkhs/j8+R82X+drz/XwJQaZ9XcndYkRzvjEk8HMIEQQ5iBLkIEqQgyBBDmIEOQgS5EARMjkIEeQgSpCDKEEOggQ5iBHkIEiQA0HINF9JGhL5b5Bwm0vE1xEiGFNK0yixGHFZzdJoOFvtPMQ2v57htSI+1yfV1UsiU9UPaQsGjdm2DWQAAAAASUVORK5CYII='
    ElMessage({
      message: '使用测试验证码',
      type: 'warning'
    })
  } finally {
    // 移除加载状态
    const captchaElement = document.querySelector('.captcha-img');
    if (captchaElement) {
      captchaElement.classList.remove('loading');
    }
  }
}

// 发送短信验证码
const sendSmsCode = async () => {
  // 验证手机号
  try {
    await smsFormRef.value.validateField('mobile')
  } catch (error) {
    return
  }
  
  // 验证图形验证码
  if (!smsForm.captcha) {
    ElMessage.warning('请先输入图形验证码')
    return
  }
  
  // 模拟发送短信验证码
  ElMessage.success('验证码已发送，请注意查收')
  
  // 开始倒计时
  smsCodeTimer.value = 60
  
  // 启动定时器
  smsTimerInterval = setInterval(() => {
    smsCodeTimer.value--
    if (smsCodeTimer.value <= 0) {
      clearInterval(smsTimerInterval)
    }
  }, 1000)
}

// 处理账号密码登录
const handleAccountLogin = async () => {
  if (loading.value) return
  
  try {
    // 表单验证
    await accountFormRef.value.validate()
    
    // 设置加载状态
    loading.value = true
    
    // 调用登录接口
    await userStore.login({
      username: accountForm.username,
      password: accountForm.password,
      captcha: accountForm.captcha,
      captchaId: captchaId.value
    })
    
    // 登录成功
    ElMessage.success('登录成功')
    
    // 检查是否有重定向路径
    const redirectPath = router.currentRoute.value.query.redirect || '/'
    router.push(redirectPath)
  } catch (error) {
    ElMessage.error(error.message || '登录失败，请检查用户名和密码')
    
    // 刷新验证码
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

// 处理短信登录
const handleSMSLogin = async () => {
  if (loading.value) return
  
  try {
    // 表单验证
    await smsFormRef.value.validate()
    
    // 设置加载状态
    loading.value = true
    
    // 调用登录接口
    await userStore.login({
      mobile: smsForm.mobile,
      smsCode: smsForm.smsCode,
      captcha: smsForm.captcha,
      captchaId: captchaId.value
    })
    
    // 登录成功
    ElMessage.success('登录成功')
    
    // 检查是否有重定向路径
    const redirectPath = router.currentRoute.value.query.redirect || '/'
    router.push(redirectPath)
  } catch (error) {
    ElMessage.error(error.message || '登录失败，请检查手机号和验证码')
    
    // 刷新验证码
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

// 生命周期钩子
onMounted(() => {
  // 获取验证码
  refreshCaptcha()
  
  // 如果已经登录，则重定向到首页
  if (userStore.isLoggedIn()) {
    router.push('/')
    return
  }
  
  // 检查是否从注册页面跳转过来，带有用户信息
  const loginInfoParam = router.currentRoute.value.query.loginInfo
  const activeTabParam = router.currentRoute.value.query.activeTab
  
  if (loginInfoParam) {
    try {
      // 解析传过来的用户信息
      const loginInfo = JSON.parse(decodeURIComponent(loginInfoParam))
      
      // 根据activeTab参数切换登录方式
      if (activeTabParam) {
        activeTab.value = activeTabParam
      }
      
      // 填充表单
      if (activeTab.value === 'account' && loginInfo.username) {
        accountForm.username = loginInfo.username
        
        // 如果有密码，解密并填充
        if (loginInfo.password) {
          try {
            accountForm.password = atob(loginInfo.password)
          } catch (e) {
            console.error('密码解析失败:', e)
          }
        }
      } else if (activeTab.value === 'sms' && loginInfo.mobile) {
        smsForm.mobile = loginInfo.mobile
      }
      
      // 显示提示信息
      ElMessage({
        message: '您的登录信息已自动填充，请点击登录按钮完成登录',
        type: 'info',
        duration: 3000
      })
      
      // 自动聚焦到验证码输入框
      setTimeout(() => {
        const captchaInput = document.querySelector(activeTab.value === 'account' 
          ? '.login-form .captcha-input input' 
          : '.login-form .captcha-input input')
        
        if (captchaInput) {
          captchaInput.focus()
        }
      }, 500)
    } catch (error) {
      console.error('解析登录信息失败:', error)
    }
  }
})
</script>

<style lang="scss">
// 引入登录页专属样式
@use '../style/login.scss' as *;
</style>
