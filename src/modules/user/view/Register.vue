<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h2>用户注册</h2>
      </div>
      
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        class="login-form"
        @submit.prevent="handleRegister"
      >
        <el-form-item prop="username">
          <el-input 
            v-model="registerForm.username" 
            placeholder="请输入用户名"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="mobile">
          <el-input 
            v-model="registerForm.mobile" 
            placeholder="请输入手机号"
            prefix-icon="Iphone"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input 
            v-model="registerForm.password" 
            placeholder="请输入密码" 
            type="password"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="confirmPassword">
          <el-input 
            v-model="registerForm.confirmPassword" 
            placeholder="请确认密码" 
            type="password"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="smsCode">
          <div class="sms-container">
            <el-input 
              v-model="registerForm.smsCode" 
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
              v-model="registerForm.captcha" 
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
        
        <el-form-item prop="agreement" class="agreement-item">
          <el-checkbox v-model="registerForm.agreement">
            我已阅读并同意<a href="javascript:void(0)" @click="showAgreement">《用户协议》</a>
          </el-checkbox>
        </el-form-item>
        
        <el-button 
          type="primary" 
          class="login-button"
          :loading="loading"
          @click="handleRegister"
        >
          注册
        </el-button>
      </el-form>
      
      <div class="login-type-selector">
        <p>注册成功后使用以下方式登录：</p>
        <el-radio-group v-model="loginType" size="small">
          <el-radio label="account">账号密码登录</el-radio>
          <el-radio label="sms">手机验证码登录</el-radio>
        </el-radio-group>
      </div>
      
      <div class="login-footer">
        <span>已有账号？</span>
        <router-link to="/login" class="register-link">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { authAPI } from '../../../api/user/auth'

// 路由
const router = useRouter()

// 加载状态
const loading = ref(false)

// 验证码图片
const captchaImg = ref('')
const captchaId = ref('')

// 表单引用
const registerFormRef = ref(null)

// 注册表单
const registerForm = reactive({
  username: '',
  mobile: '',
  password: '',
  confirmPassword: '',
  smsCode: '',
  captcha: '',
  agreement: false
})

// 短信验证码计时器
const smsCodeTimer = ref(0)
let smsTimerInterval = null

// 登录类型
const loginType = ref('account')

// 验证两次密码是否一致
const validatePass = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

// 验证用户协议是否勾选
const validateAgreement = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请阅读并同意用户协议'))
  } else {
    callback()
  }
}

// 注册表单验证规则
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20位', trigger: 'blur' }
  ],
  mobile: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
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
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validatePass, trigger: 'blur' }
  ],
  smsCode: [
    { required: true, message: '请输入短信验证码', trigger: 'blur' },
    { min: 6, max: 6, message: '短信验证码为6位数字', trigger: 'blur' }
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { min: 4, max: 4, message: '验证码为4位数字', trigger: 'blur' },
    { pattern: /^\d{4}$/, message: '验证码只能是数字', trigger: 'blur' }
  ],
  agreement: [
    { required: true, message: '请阅读并同意用户协议', trigger: 'change' },
    { validator: validateAgreement, trigger: 'change' }
  ]
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
    await registerFormRef.value.validateField('mobile')
  } catch (error) {
    return
  }
  
  // 验证图形验证码
  if (!registerForm.captcha) {
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

// 显示用户协议
const showAgreement = () => {
  ElMessageBox.alert(
    '本协议是您与电商平台之间的协议，包含您使用本产品所需遵守的条款和条件。请您仔细阅读本协议，您访问或使用本产品即表示您已同意接受本协议的全部内容。如果您不同意本协议的任何内容，请不要注册或使用本产品的服务。',
    '用户协议',
    {
      confirmButtonText: '我已阅读',
      type: 'info',
    }
  )
}

// 处理注册
const handleRegister = async () => {
  if (loading.value) return
  
  try {
    // 表单验证（包含了用户协议验证）
    await registerFormRef.value.validate()
    
    // 设置加载状态
    loading.value = true
    
    // 调用注册接口
    const userData = {
      username: registerForm.username,
      password: registerForm.password,
      mobile: registerForm.mobile,
      smsCode: registerForm.smsCode,
      captcha: registerForm.captcha,
      captchaId: captchaId.value
    }
    
    try {
      await authAPI.register(userData)
      
      // 注册成功
      ElMessage.success('注册成功！正在跳转到登录页...')
      
      // 跳转到登录页，并带上用户名/手机号/密码参数
      setTimeout(() => {
        // 加密处理密码，简单的加密处理，实际生产环境应使用更安全的方式
        const encryptedPassword = btoa(registerForm.password)
        
        // 根据登录类型传递不同的参数
        const loginInfo = {
          username: registerForm.username,
          mobile: registerForm.mobile,
          password: encryptedPassword
        }
        
        router.push({
          path: '/login',
          query: { 
            loginInfo: encodeURIComponent(JSON.stringify(loginInfo)),
            activeTab: loginType.value // 使用用户选择的登录类型
          }
        })
      }, 1500)
    } catch (error) {
      ElMessage.error(error.message || '注册失败，请稍后重试')
      refreshCaptcha()
    }
  } catch (error) {
    ElMessage.error('注册失败，请检查输入信息')
  } finally {
    loading.value = false
  }
}

// 生命周期钩子
onMounted(() => {
  // 获取验证码
  refreshCaptcha()
})
</script>

<style lang="scss">
// 引入登录页专属样式
@use '../style/login.scss' as *;
</style> 