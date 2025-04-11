<template>
  <header class="layout-header">
    <div class="container header-container">
      <div class="logo">
        <router-link to="/">
          <h1>电商平台</h1>
        </router-link>
      </div>
      <nav class="nav-menu">
        <ul class="nav-list">
          <li class="nav-item">
            <router-link to="/" active-class="active" exact>首页</router-link>
          </li>
          <li class="nav-item">
            <router-link to="/goods" active-class="active">商品列表</router-link>
          </li>
          <li class="nav-item">
            <router-link to="/cart" active-class="active">购物车</router-link>
          </li>
          <!-- 未登录显示登录按钮 -->
          <li v-if="!userStore.isLoggedIn()" class="nav-item">
            <router-link to="/login" active-class="active">登录/注册</router-link>
          </li>
          <!-- 已登录显示用户信息 -->
          <li v-else class="nav-item user-dropdown">
            <el-dropdown trigger="click" @command="handleCommand">
              <div class="user-info">
                <el-avatar 
                  :size="32" 
                  :src="userStore.userInfo.avatar" 
                  class="user-avatar"
                >
                  <!-- 头像加载失败显示用户首字母 -->
                  <span>{{ userStore.userInfo.name.charAt(0).toUpperCase() }}</span>
                </el-avatar>
                <span class="username">{{ userStore.userInfo.name }}</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '../../modules/user/store/useUserStore'
import { ElMessageBox, ElMessage } from 'element-plus'

// 路由
const router = useRouter()

// 用户状态
const userStore = useUserStore()

// 处理下拉菜单命令
const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      ElMessageBox.confirm(
        '确定要退出登录吗？',
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      ).then(() => {
        userStore.logout()
        ElMessage.success('已退出登录')
        router.push('/login')
      }).catch(() => {})
      break
  }
}
</script>

<style lang="scss" scoped>
.layout-header {
  height: var(--header-height);
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.logo {
  h1 {
    font-size: 20px;
    font-weight: bold;
    color: var(--primary-color);
  }
}

.nav-menu {
  .nav-list {
    display: flex;
    list-style: none;
    align-items: center;
    
    .nav-item {
      margin-left: 20px;
      
      a {
        display: inline-block;
        padding: 5px 0;
        color: var(--text-regular);
        position: relative;
        transition: color 0.3s;
        
        &::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          width: 0;
          height: 2px;
          background-color: var(--primary-color);
          transition: width 0.3s;
        }
        
        &:hover, &.active {
          color: var(--primary-color);
          
          &::after {
            width: 100%;
          }
        }
      }
      
      &.user-dropdown {
        .user-info {
          display: flex;
          align-items: center;
          cursor: pointer;
          padding: 2px 8px;
          border-radius: 16px;
          transition: background-color 0.3s;
          
          &:hover {
            background-color: #f5f5f5;
          }
          
          .user-avatar {
            margin-right: 8px;
            background-color: var(--primary-color);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .username {
            max-width: 80px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .nav-menu {
    .nav-list {
      .nav-item {
        margin-left: 10px;
        
        &.user-dropdown .username {
          display: none;
        }
      }
    }
  }
}
</style> 