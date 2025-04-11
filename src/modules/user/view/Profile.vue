<template>
  <div class="profile-container">
    <div class="profile-content">
      <el-card class="profile-card">
        <template #header>
          <div class="card-header">
            <h2>个人中心</h2>
          </div>
        </template>
        
        <!-- 选项卡 -->
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <!-- 基本信息选项卡 -->
          <el-tab-pane label="基本信息" name="basic">
            <div class="user-info-form">
              <el-form 
                ref="basicFormRef"
                :model="basicForm"
                :rules="basicRules"
                label-width="100px"
              >
                <!-- 头像上传 -->
                <el-form-item label="头像" prop="avatar">
                  <div class="avatar-uploader">
                    <div v-if="avatarUrl" class="avatar-container" :style="{ backgroundImage: `url(${avatarUrl})` }">
                      <img 
                        :src="avatarUrl" 
                        class="avatar-image" 
                        alt="用户头像"
                        @error="handleImageError"
                        crossorigin="anonymous"
                      />
                      <div class="avatar-debug" v-if="false">
                        <p>头像URL: {{ avatarUrl ? avatarUrl.substring(0, 30) + '...' : '无' }}</p>
                        <p>Store头像: {{ userStore.userInfo.avatar ? userStore.userInfo.avatar.substring(0, 30) + '...' : '无' }}</p>
                      </div>
                    </div>
                    <el-icon v-else class="avatar-placeholder">
                      <User />
                    </el-icon>
                    <div class="avatar-actions">
                      <el-upload
                        :show-file-list="false"
                        :before-upload="beforeAvatarUpload"
                        :http-request="handleAvatarUpload"
                      >
                        <el-button type="primary" size="small">选择图片</el-button>
                      </el-upload>
                    </div>
                    <!-- 隐藏外部调试信息，避免视觉干扰 -->
                    <div class="upload-debug" v-if="false">
                      <p>当前头像URL: {{ avatarUrl ? avatarUrl.substring(0, 30) + '...' : '无' }}</p>
                    </div>
                  </div>
                </el-form-item>
                
                <!-- 昵称 -->
                <el-form-item label="昵称" prop="nickname">
                  <el-input v-model="basicForm.nickname" placeholder="请输入昵称" />
                </el-form-item>
                
                <!-- 手机号 -->
                <el-form-item label="手机号" prop="mobile">
                  <el-input v-model="basicForm.mobile" disabled placeholder="请输入手机号" />
                </el-form-item>
                
                <!-- 邮箱 -->
                <el-form-item label="邮箱" prop="email">
                  <el-input v-model="basicForm.email" placeholder="请输入邮箱" />
                </el-form-item>
                
                <!-- 性别 -->
                <el-form-item label="性别" prop="gender">
                  <el-radio-group v-model="basicForm.gender">
                    <el-radio :label="1">男</el-radio>
                    <el-radio :label="2">女</el-radio>
                    <el-radio :label="0">保密</el-radio>
                  </el-radio-group>
                </el-form-item>
                
                <!-- 生日 -->
                <el-form-item label="生日" prop="birthday">
                  <el-date-picker
                    v-model="basicForm.birthday"
                    type="date"
                    placeholder="选择日期"
                    style="width: 100%"
                  />
                </el-form-item>
                
                <!-- 个人简介 -->
                <el-form-item label="个人简介" prop="bio">
                  <el-input
                    v-model="basicForm.bio"
                    type="textarea"
                    :rows="3"
                    placeholder="请输入个人简介"
                  />
                </el-form-item>
                
                <!-- 操作按钮 -->
                <el-form-item>
                  <el-button type="primary" :loading="loading.basic" @click="saveBasicInfo">保存信息</el-button>
                  <el-button @click="resetBasicForm">重置</el-button>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>
          
          <!-- 收货地址选项卡 -->
          <el-tab-pane label="收货地址" name="address">
            <div class="address-section">
              <address-selector v-model="selectedAddress" />
            </div>
          </el-tab-pane>
          
          <!-- 安全设置选项卡 -->
          <el-tab-pane label="安全设置" name="security">
            <div class="security-form">
              <el-form
                ref="securityFormRef"
                :model="securityForm"
                :rules="securityRules"
                label-width="100px"
              >
                <el-form-item label="原密码" prop="oldPassword">
                  <el-input
                    v-model="securityForm.oldPassword"
                    type="password"
                    placeholder="请输入原密码"
                    show-password
                  />
                </el-form-item>
                
                <el-form-item label="新密码" prop="newPassword">
                  <el-input
                    v-model="securityForm.newPassword"
                    type="password"
                    placeholder="请输入新密码"
                    show-password
                  />
                </el-form-item>
                
                <el-form-item label="确认密码" prop="confirmPassword">
                  <el-input
                    v-model="securityForm.confirmPassword"
                    type="password"
                    placeholder="请确认新密码"
                    show-password
                  />
                </el-form-item>
                
                <el-form-item>
                  <el-button type="primary" :loading="loading.security" @click="changePassword">
                    修改密码
                  </el-button>
                  <el-button @click="resetSecurityForm">重置</el-button>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../store/useUserStore'
import { profileAPI } from '../../../api/user/profile'
import AddressSelector from '../../../common/components/AddressSelector.vue'
// 导入本地图像资源作为默认头像
import defaultAvatarImg from '../../../common/assets/images/logo.png'
// 导入User图标
import { User } from '@element-plus/icons-vue'

// 默认头像URL（使用导入的本地图像）
const DEFAULT_AVATAR = defaultAvatarImg

// 用户状态
const userStore = useUserStore()

// 选项卡
const activeTab = ref('basic')

// 加载状态
const loading = reactive({
  basic: false,
  security: false
})

// 表单引用
const basicFormRef = ref(null)
const securityFormRef = ref(null)

// 头像预览URL
const avatarUrl = ref(userStore.userInfo.avatar || localStorage.getItem('userAvatar') || '')

// 选择的地址
// 确保是null或者完整的地址对象，避免传递不完整的对象给地址选择器组件
const selectedAddress = ref(null)

// 地址相关
const addressDialogVisible = ref(false)
const deleteConfirmVisible = ref(false)
const currentAddressId = ref(null)
const dialogTitle = ref('添加收货地址')

// 地址表单
const addressForm = reactive({
  id: '',
  name: '',
  mobile: '',
  region: [],
  address: '',
  isDefault: false
})

// 地址表单验证规则
const addressRules = {
  name: [
    { required: true, message: '请输入收货人姓名', trigger: 'blur' }
  ],
  mobile: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  region: [
    { required: true, message: '请选择所在地区', trigger: 'change' }
  ],
  address: [
    { required: true, message: '请输入详细地址', trigger: 'blur' }
  ]
}

// 基本信息表单
const basicForm = reactive({
  nickname: '',
  mobile: '',
  email: '',
  gender: 1,
  birthday: '',
  bio: ''
})

// 基本信息表单验证规则
const basicRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { pattern: /^[\w.-]+@[\w.-]+\.\w+$/, message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
}

// 安全设置表单
const securityForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 自定义验证新密码
const validateNewPassword = (rule, value, callback) => {
  if (value === securityForm.oldPassword) {
    callback(new Error('新密码不能与原密码相同'))
  } else {
    if (securityForm.confirmPassword !== '') {
      securityFormRef.value.validateField('confirmPassword')
    }
    callback()
  }
}

// 自定义验证确认密码
const validateConfirmPassword = (rule, value, callback) => {
  if (value !== securityForm.newPassword) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

// 安全设置表单验证规则
const securityRules = {
  oldPassword: [
    { required: true, message: '请输入原密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' },
    { validator: validateNewPassword, trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 头像上传前验证
const beforeAvatarUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('头像必须是图片格式!')
    return false
  }
  
  if (!isLt2M) {
    ElMessage.error('头像大小不能超过 2MB!')
    return false
  }
  
  return true
}

// 处理头像上传
const handleAvatarUpload = async (options) => {
  try {
    const file = options.file
    const formData = new FormData()
    formData.append('avatar', file)
    
    loading.basic = true
    
    console.log('开始上传头像...')
    const result = await profileAPI.uploadAvatar(formData)
    console.log('头像上传成功，服务器返回:', result)
    
    if (result && result.data && result.data.avatarUrl) {
      // 确保avatarUrl有值
      avatarUrl.value = result.data.avatarUrl
      
      // 使用新方法更新用户存储中的头像
      userStore.updateAvatar(result.data.avatarUrl)
      
      // 强制更新头像URL到本地存储
      localStorage.setItem('userAvatar', result.data.avatarUrl)
      
      // 显示成功消息
      ElMessage.success('头像上传成功')
      
      console.log('头像已更新，新URL:', result.data.avatarUrl)
      console.log('avatarUrl变量当前值:', avatarUrl.value)
      console.log('userStore中的头像:', userStore.userInfo.avatar)
      console.log('localStorage中的头像:', localStorage.getItem('userAvatar'))
    } else {
      console.error('服务器返回的头像URL无效:', result)
      ElMessage.error('头像上传失败：服务器返回的数据无效')
    }
  } catch (error) {
    console.error('头像上传异常:', error)
    ElMessage.error('头像上传失败：' + (error.message || '未知错误'))
  } finally {
    loading.basic = false
  }
}

// 保存基本信息
const saveBasicInfo = async () => {
  try {
    await basicFormRef.value.validate()
    
    loading.basic = true
    
    // 准备要更新的个人信息数据
    const profileData = {
      nickname: basicForm.nickname,
      email: basicForm.email,
      gender: basicForm.gender,
      birthday: basicForm.birthday instanceof Date 
        ? basicForm.birthday.toISOString().split('T')[0] // 转换日期格式为YYYY-MM-DD
        : basicForm.birthday,
      bio: basicForm.bio
    }
    
    console.log('准备更新的个人信息:', profileData)
    
    // 调用API更新个人信息
    const result = await profileAPI.updateProfile(profileData)
    console.log('API更新个人信息结果:', result)
    
    // 更新UserStore中的用户信息（包含所有字段，确保数据一致性）
    userStore.updateUserInfo({
      nickname: basicForm.nickname,
      email: basicForm.email,
      gender: basicForm.gender,
      birthday: profileData.birthday, // 使用已格式化的日期
      bio: basicForm.bio
    })
    
    // 强制同步到localStorage（确保存储的格式一致）
    if (basicForm.nickname) localStorage.setItem('userName', basicForm.nickname)
    if (basicForm.email) localStorage.setItem('userEmail', basicForm.email)
    if (basicForm.gender !== undefined) localStorage.setItem('userGender', basicForm.gender.toString())
    if (profileData.birthday) localStorage.setItem('userBirthday', profileData.birthday)
    if (basicForm.bio) localStorage.setItem('userBio', basicForm.bio)
    
    console.log('个人信息已同步到localStorage')
    
    // 验证localStorage中的数据
    console.log('更新后的localStorage数据:', {
      nickname: localStorage.getItem('userName'),
      email: localStorage.getItem('userEmail'),
      gender: localStorage.getItem('userGender'),
      birthday: localStorage.getItem('userBirthday'),
      bio: localStorage.getItem('userBio')
    })
    
    ElMessage.success('个人信息保存成功')
    
    console.log('个人信息已保存，更新后的信息:', {
      nickname: basicForm.nickname,
      email: basicForm.email,
      gender: basicForm.gender,
      birthday: profileData.birthday,
      bio: basicForm.bio
    })
  } catch (error) {
    console.error('保存个人信息失败:', error)
    if (error.message) {
      ElMessage.error('保存失败：' + error.message)
    } else {
      ElMessage.error('保存失败：请检查网络连接')
    }
  } finally {
    loading.basic = false
  }
}

// 重置基本信息表单
const resetBasicForm = () => {
  loadUserProfile()
}

// 加载用户信息
const loadUserProfile = async () => {
  try {
    console.log('开始加载用户信息...')
    console.log('当前localStorage中的个人信息:', {
      nickname: localStorage.getItem('userName'),
      mobile: localStorage.getItem('userMobile'),
      email: localStorage.getItem('userEmail'),
      gender: localStorage.getItem('userGender'),
      birthday: localStorage.getItem('userBirthday'),
      bio: localStorage.getItem('userBio'),
      avatar: localStorage.getItem('userAvatar')
    })
    console.log('当前userStore中的信息:', {
      nickname: userStore.userProfile.nickname,
      mobile: userStore.userProfile.mobile,
      email: userStore.userProfile.email,
      gender: userStore.userProfile.gender,
      birthday: userStore.userProfile.birthday,
      bio: userStore.userProfile.bio,
      avatar: userStore.userProfile.avatar
    })
    
    // 先尝试从localStorage恢复头像，确保即使在网络问题的情况下也能显示上次的头像
    if (localStorage.getItem('userAvatar')) {
      avatarUrl.value = localStorage.getItem('userAvatar')
      console.log('从localStorage恢复头像URL:', avatarUrl.value)
    }
    
    // 优先尝试从API加载数据
    let userData = null
    
    if (userStore.token) {
      try {
        // 从API加载用户数据
        userData = await userStore.loadUserInfo()
        console.log('从服务器加载的用户数据:', userData)
      } catch (error) {
        console.error('从API加载用户信息失败，将使用本地数据:', error)
        userData = null
      }
    }
    
    // 合并数据，优先使用API返回的数据，缺失项使用localStorage的数据
    const nickname = userData?.nickname || 
                     userStore.userProfile.nickname || 
                     localStorage.getItem('userName') || '';
    
    const mobile = userData?.mobile || 
                   userStore.userProfile.mobile || 
                   localStorage.getItem('userMobile') || '';
    
    const email = userData?.email || 
                  userStore.userProfile.email || 
                  localStorage.getItem('userEmail') || '';
    
    const gender = userData?.gender !== undefined ? userData.gender : 
                   userStore.userProfile.gender !== undefined ? userStore.userProfile.gender : 
                   localStorage.getItem('userGender') ? parseInt(localStorage.getItem('userGender')) : 1;
    
    const birthDate = userData?.birthday || 
                      userStore.userProfile.birthday || 
                      localStorage.getItem('userBirthday') || '';
    
    const bio = userData?.bio || 
                userStore.userProfile.bio || 
                localStorage.getItem('userBio') || '';
    
    // 处理生日日期
    const birthday = birthDate ? new Date(birthDate) : '';
    
    // 更新表单数据
    Object.assign(basicForm, {
      nickname,
      mobile,
      email,
      gender,
      birthday,
      bio
    })
    
    // 验证和处理头像
    if (userData && userData.avatar) {
      const verifyAvatar = (url) => {
        return new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            console.log('服务器头像验证成功:', url)
            resolve(true)
          }
          img.onerror = () => {
            console.error('服务器头像无效:', url)
            resolve(false)
          }
          img.crossOrigin = 'anonymous'
          img.src = url
          
          // 设置超时
          setTimeout(() => {
            if (!img.complete) {
              console.warn('服务器头像加载超时')
              resolve(false)
            }
          }, 3000)
        })
      }
      
      const isValid = await verifyAvatar(userData.avatar)
      if (isValid) {
        // 优先使用服务器返回的有效头像URL
        avatarUrl.value = userData.avatar
        // 同时更新localStorage
        localStorage.setItem('userAvatar', userData.avatar)
        console.log('使用服务器返回的头像URL:', avatarUrl.value)
      } else {
        // 如果服务器头像无效，使用localStorage中的头像或默认头像
        const localAvatar = localStorage.getItem('userAvatar')
        if (localAvatar && localAvatar !== userData.avatar) {
          avatarUrl.value = localAvatar
          console.log('使用localStorage中的头像URL:', avatarUrl.value)
        } else {
          avatarUrl.value = DEFAULT_AVATAR
          localStorage.setItem('userAvatar', DEFAULT_AVATAR)
          console.log('使用默认头像替代无效的服务器头像')
        }
      }
    } else if (userStore.userInfo.avatar) {
      // 如果服务器没有返回头像，则使用userStore中的头像
      avatarUrl.value = userStore.userInfo.avatar
      console.log('使用userStore中的头像URL:', avatarUrl.value)
    }
    
    console.log('已加载个人信息:', basicForm);
    
    // 确保个人信息被同步到所有地方
    userStore.updateUserInfo({
      nickname: basicForm.nickname,
      mobile: basicForm.mobile,
      email: basicForm.email,
      gender: basicForm.gender,
      birthday: basicForm.birthday instanceof Date 
        ? basicForm.birthday.toISOString().split('T')[0]
        : basicForm.birthday,
      bio: basicForm.bio,
      avatar: avatarUrl.value
    })
    
    return userData || basicForm
  } catch (error) {
    console.error('加载用户信息失败:', error)
    ElMessage.error('加载用户信息失败：' + (error.message || '未知错误'))
    
    // 即使加载失败，也从localStorage恢复已保存的信息
    if (userStore.token) {
      // 确保使用localStorage中的头像
      if (localStorage.getItem('userAvatar')) {
        avatarUrl.value = localStorage.getItem('userAvatar')
        console.log('加载失败，从localStorage恢复头像:', avatarUrl.value)
      } else {
        // 如果localStorage中没有头像，使用默认头像
        avatarUrl.value = DEFAULT_AVATAR
        userStore.updateAvatar(DEFAULT_AVATAR)
        console.log('加载失败，使用默认头像')
      }
      
      Object.assign(basicForm, {
        nickname: localStorage.getItem('userName') || userStore.userProfile.nickname || '',
        mobile: localStorage.getItem('userMobile') || userStore.userProfile.mobile || '',
        email: localStorage.getItem('userEmail') || userStore.userProfile.email || '',
        gender: localStorage.getItem('userGender') ? parseInt(localStorage.getItem('userGender')) : userStore.userProfile.gender || 1,
        birthday: localStorage.getItem('userBirthday') ? new Date(localStorage.getItem('userBirthday')) : '',
        bio: localStorage.getItem('userBio') || userStore.userProfile.bio || ''
      })
      
      console.log('从本地恢复的个人信息:', basicForm);
    }
    
    return null
  }
}


// 修改密码
const changePassword = async () => {
  try {
    await securityFormRef.value.validate()
    
    loading.security = true
    
    // 模拟修改密码API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('密码修改成功')
    resetSecurityForm()
  } catch (error) {
    if (error.message) {
      ElMessage.error('修改失败：' + error.message)
    }
  } finally {
    loading.security = false
  }
}

// 重置安全设置表单
const resetSecurityForm = () => {
  securityForm.oldPassword = ''
  securityForm.newPassword = ''
  securityForm.confirmPassword = ''
}

// 初始加载时检查头像URL
const validateInitialAvatar = () => {
  if (!avatarUrl.value) {
    console.log('初始化时没有检测到有效的头像URL')
    // 设置默认头像为本地图像
    avatarUrl.value = DEFAULT_AVATAR
    userStore.updateAvatar(DEFAULT_AVATAR)
    return
  }
  
  // 创建一个图片测试元素来验证URL是否可访问
  const img = new Image()
  img.onload = () => {
    console.log('初始头像URL验证成功:', avatarUrl.value)
  }
  img.onerror = () => {
    console.error('初始头像URL无效:', avatarUrl.value)
    // 设置默认头像为本地图像
    avatarUrl.value = DEFAULT_AVATAR
    userStore.updateAvatar(DEFAULT_AVATAR)
    
    // 强制清除所有缓存中可能的无效头像
    if (userStore.userProfile) {
      userStore.userProfile.avatar = DEFAULT_AVATAR
    }
    
    if (userStore.userInfo) {
      userStore.userInfo.avatar = DEFAULT_AVATAR
    }
    
    // 强制写入localStorage
    localStorage.setItem('userAvatar', DEFAULT_AVATAR)
    console.log('已重置头像为默认头像')
  }
  
  // 设置图片加载超时
  setTimeout(() => {
    if (!img.complete) {
      console.warn('头像加载超时:', avatarUrl.value)
      img.src = ''  // 中断加载
      img.onerror()  // 手动触发错误处理
    }
  }, 3000)  // 3秒超时
  
  // 开始加载图片
  img.crossOrigin = 'anonymous'
  img.src = avatarUrl.value
}

// 在组件挂载前验证头像
validateInitialAvatar()

// 处理选项卡切换
const handleTabChange = (tab) => {
  console.log('切换到选项卡:', tab);
  activeTab.value = tab;
  
  // 如果切换到地址选项卡，确保不要自动调用编辑功能
  // 原有的自动编辑地址代码可能在这里，请删除它
  // 正确的方式是：只有用户点击编辑按钮时才编辑地址
}

// 生命周期钩子
onMounted(async () => {
  console.log('Profile组件已挂载')
  console.log('初始化时的用户信息状态:', {
    'localStorage中的头像': localStorage.getItem('userAvatar'),
    'localStorage中的昵称': localStorage.getItem('userName'),
    'localStorage中的邮箱': localStorage.getItem('userEmail'),
    'localStorage中的性别': localStorage.getItem('userGender'),
    'localStorage中的生日': localStorage.getItem('userBirthday'),
    'localStorage中的简介': localStorage.getItem('userBio'),
    'userStore中的头像': userStore.userInfo.avatar,
    'userStore中的昵称': userStore.userInfo.name,
    'avatarUrl变量': avatarUrl.value
  })

  try {
    // 加载用户数据
    const userData = await loadUserProfile()
    console.log('已完成用户个人信息加载，结果:', userData ? '成功' : '失败')
    
    // 再次确认头像URL是否已正确设置
    if (!avatarUrl.value) {
      if (localStorage.getItem('userAvatar')) {
        avatarUrl.value = localStorage.getItem('userAvatar')
        console.log('从localStorage重新设置头像:', avatarUrl.value)
      } else if (userStore.userInfo.avatar) {
        avatarUrl.value = userStore.userInfo.avatar
        console.log('从userStore重新设置头像:', avatarUrl.value)
      }
    }
    
    // 确保localStorage中的用户信息与表单数据一致
    if (basicForm.nickname) localStorage.setItem('userName', basicForm.nickname)
    if (basicForm.email) localStorage.setItem('userEmail', basicForm.email)
    if (basicForm.gender !== undefined) localStorage.setItem('userGender', basicForm.gender.toString())
    if (basicForm.birthday) {
      const formattedDate = basicForm.birthday instanceof Date 
        ? basicForm.birthday.toISOString().split('T')[0]
        : basicForm.birthday
      localStorage.setItem('userBirthday', formattedDate)
    }
    if (basicForm.bio) localStorage.setItem('userBio', basicForm.bio)
    
    // 加载收货地址
    await userStore.loadAddresses()
    
    // 确认同步完成后的状态
    console.log('组件挂载完成后的用户信息状态:', {
      'localStorage中的头像': localStorage.getItem('userAvatar'),
      'localStorage中的昵称': localStorage.getItem('userName'),
      'localStorage中的邮箱': localStorage.getItem('userEmail'),
      'localStorage中的性别': localStorage.getItem('userGender'),
      'localStorage中的生日': localStorage.getItem('userBirthday'),
      'localStorage中的简介': localStorage.getItem('userBio'),
      '表单中的昵称': basicForm.nickname,
      '表单中的邮箱': basicForm.email,
      '表单中的性别': basicForm.gender,
      '表单中的生日': basicForm.birthday,
      '表单中的简介': basicForm.bio
    })
  } catch (error) {
    console.error('组件挂载时出错:', error)
    ElMessage.error('加载个人信息失败，请刷新页面重试')
    
    // 即使加载失败，也尝试从localStorage恢复基本信息
    if (localStorage.getItem('userName')) {
      basicForm.nickname = localStorage.getItem('userName')
    }
    if (localStorage.getItem('userEmail')) {
      basicForm.email = localStorage.getItem('userEmail')
    }
    if (localStorage.getItem('userGender')) {
      basicForm.gender = parseInt(localStorage.getItem('userGender'))
    }
    if (localStorage.getItem('userBirthday')) {
      basicForm.birthday = new Date(localStorage.getItem('userBirthday'))
    }
    if (localStorage.getItem('userBio')) {
      basicForm.bio = localStorage.getItem('userBio')
    }
  } finally {
    console.log('组件挂载完成，最终头像URL:', avatarUrl.value)
  }
})

// 图片加载错误处理
const handleImageError = () => {
  console.error('头像图片加载失败:', avatarUrl.value)
  // 使用导入的本地图像资源作为默认头像
  console.log('使用本地默认头像替代:', DEFAULT_AVATAR)
  
  // 如果头像URL不是默认头像，才需要替换
  if (avatarUrl.value !== DEFAULT_AVATAR) {
    // 立即触发UI更新
    avatarUrl.value = DEFAULT_AVATAR
    
    // 也同步更新到UserStore
    userStore.updateAvatar(DEFAULT_AVATAR)
    
    // 强制写入localStorage，确保下次加载正确
    localStorage.setItem('userAvatar', DEFAULT_AVATAR)
    
    console.log('头像已更新为默认头像')
    
    // 强制清除所有缓存中可能的无效头像
    if (userStore.userProfile && userStore.userProfile.avatar !== DEFAULT_AVATAR) {
      userStore.userProfile.avatar = DEFAULT_AVATAR
      console.log('已更新userProfile中的头像')
    }
    
    if (userStore.userInfo && userStore.userInfo.avatar !== DEFAULT_AVATAR) {
      userStore.userInfo.avatar = DEFAULT_AVATAR
      console.log('已更新userInfo中的头像')
    }
  }
}
</script>

<style lang="scss" scoped>
:root {
  --primary-color: #FF5000;
}

.profile-container {
  padding: 20px;
}

.profile-content {
  max-width: 960px;
  margin: 0 auto;
}

.profile-card {
  margin-bottom: 20px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }
  }
}

// 基本信息
.user-info-form {
  padding: 10px 0;
}

.avatar-uploader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  
  .avatar-container {
    position: relative;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    overflow: hidden;
    border: 1px solid #eee;
    background-color: #f5f5f5;
    background-size: cover;
    background-position: center;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1; // 确保图片在顶层
  }
  
  .avatar-placeholder {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background-color: #f5f5f5;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 40px;
    color: #ddd;
    border: 1px solid #eee;
  }
  
  .avatar-actions {
    margin-top: 8px;
  }
  
  .avatar-debug, .upload-debug {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0,0,0,0.7);
    color: white;
    font-size: 8px;
    padding: 4px;
    z-index: 2;
  }
  
  .upload-debug {
    position: relative;
    margin-top: 8px;
    font-size: 10px;
    color: #333;
    background: #f5f5f5;
    padding: 4px;
    border-radius: 4px;
  }
}

// 地址管理
.address-section {
  margin-bottom: 20px;
}

.address-actions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.address-actions-header h3 {
  margin: 0;
  font-size: 18px;
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.address-item {
  position: relative;
  
  &.default-address {
    border-color: var(--primary-color);
    border-width: 1px;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      border-width: 20px;
      border-style: solid;
      border-color: var(--primary-color) var(--primary-color) transparent transparent;
    }
  }
  
  &.local-address {
    border-left: 3px solid #e6a23c; // 为本地地址添加侧边标识
    
    .address-title {
      .name::after {
        content: '(本地)';
        color: #e6a23c;
        font-size: 12px;
        margin-left: 4px;
        opacity: 0.7;
      }
    }
  }
}

.address-content {
  display: flex;
  justify-content: space-between;
}

.address-info {
  flex: 1;
  
  .address-title {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    
    .name {
      font-weight: bold;
      margin-right: 10px;
    }
    
    .mobile {
      color: #666;
      margin-right: 10px;
    }
  }
  
  .address-detail {
    color: #666;
    line-height: 1.5;
  }
}

.address-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

// 响应式布局
@media (max-width: 768px) {
  .address-content {
    flex-direction: column;
  }
  
  .address-actions {
    margin-top: 10px;
    flex-direction: row;
    justify-content: flex-end;
  }
}

.address-dialog {
  // 内容溢出时显示滚动条
  .el-dialog__body {
    max-height: 60vh;
    overflow-y: auto;
  }
  
  // 级联选择器设置
  .el-cascader {
    width: 100%;
    
    // 确保弹出菜单有足够空间和正确显示
    .el-cascader__dropdown {
      z-index: 3000; // 提高z-index确保不被遮挡
    }
  }
}
</style>
