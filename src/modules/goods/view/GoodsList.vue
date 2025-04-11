<template>
  <div class="goods-list-container">
    <!-- 顶部搜索栏 -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索商品"
          class="search-input"
          @keyup.enter="handleSearch"
          @input="debouncedGetSuggestions"
          @focus="handleInputFocus"
          @blur="handleInputBlur"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
        
        <!-- 搜索建议 -->
        <div v-if="showSuggestions && suggestions.length > 0" class="suggestions" tabindex="-1">
          <ul tabindex="-1">
            <li 
              v-for="(item, index) in suggestions" 
              :key="index" 
              @click.stop="selectSuggestion(item, $event)"
              class="suggestion-item"
              tabindex="-1"
            >
              {{ item }}
            </li>
          </ul>
        </div>
        
        <!-- 搜索历史 -->
        <div v-if="showHistory" class="search-history" tabindex="-1">
          <div class="history-header" tabindex="-1">
            <span class="history-title" tabindex="-1">搜索历史</span>
            <span v-if="searchHistory.length > 0" class="clear-btn" tabindex="-1" @click.stop="clearAllHistory($event)">清空</span>
          </div>
          <div v-if="searchHistory.length > 0" class="history-tags" tabindex="-1">
            <div
              v-for="(item, index) in searchHistory"
              :key="index"
              class="history-tag"
              tabindex="-1"
            >
              <span tabindex="-1" @click.stop="useHistoryItem(item, $event)">{{ item }}</span>
              <el-icon class="delete-icon" tabindex="-1" @click.stop="removeHistoryItem(index, $event)"><Close /></el-icon>
            </div>
          </div>
          <div v-else class="empty-history" tabindex="-1">
            暂无搜索历史
          </div>
        </div>
      </div>
    </div>
    
    <!-- 排序选项栏 -->
    <div class="sort-bar">
      <el-radio-group v-model="sortOption" @change="handleSortChange" size="small">
        <el-radio-button label="default">默认</el-radio-button>
        <el-radio-button label="sales">销量优先</el-radio-button>
        <el-radio-button label="price-asc">价格升序</el-radio-button>
        <el-radio-button label="price-desc">价格降序</el-radio-button>
        <el-radio-button label="rating">好评优先</el-radio-button>
      </el-radio-group>
    </div>
    
    <!-- 商品列表展示区域 -->
    <div ref="listWrapper" class="goods-list-wrapper">
      <!-- 骨架屏加载效果 -->
      <template v-if="goodsStore.loading && goodsStore.isEmpty">
        <div class="goods-grid">
          <el-skeleton 
            v-for="i in 10" 
            :key="i" 
            class="goods-card skeleton"
            animated
          >
            <template #template>
              <div class="skeleton-item img"></div>
              <div class="skeleton-item title"></div>
              <div class="skeleton-item price"></div>
              <div class="skeleton-item desc"></div>
            </template>
          </el-skeleton>
        </div>
      </template>
      
      <!-- 商品列表 瀑布流布局 -->
      <div v-else-if="!goodsStore.isEmpty" class="goods-grid" :key="'goods-list-' + sortOption + '-' + Date.now()">
        <div
          v-for="item in goodsStore.goodsList"
          :key="item.id"
          class="goods-card"
          @click="goToDetail(item.id)"
          :style="{ '--item-theme-color': item.themeColor || '#f5f5f5' }"
        >
          <!-- 商品图片 -->
          <div class="goods-img-wrapper" :style="{ backgroundColor: item.themeColor || '#f5f5f5' }">
            <div class="goods-img" :style="{ backgroundColor: item.themeColor || '#f5f5f5' }"></div>
          </div>
          
          <!-- 商品信息 -->
          <div class="goods-info">
            <h3 class="goods-title">{{ item.title }}</h3>
            <p class="price">{{ item.price.toFixed(2) }}</p>
            <div class="goods-meta">
              <span class="sales">月销 {{ item.salesCount }}件</span>
              <span class="rating">
                <el-rate 
                  v-model="item.rating" 
                  disabled 
                  :colors="['#FF9800', '#FF9800', '#FF9800']"
                  :max="5"
                  :score-template="String(item.rating)"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <el-empty 
        v-else-if="!goodsStore.loading && goodsStore.isEmpty"
        description="暂无商品"
      />
      
      <!-- 底部加载状态 -->
      <div v-if="!goodsStore.isEmpty" class="load-more">
        <el-divider v-if="goodsStore.loading && !goodsStore.isEmpty">
          <el-icon class="loading"><Loading /></el-icon> 加载中...
        </el-divider>
        <el-divider v-else-if="!goodsStore.loading && hasMore">
          向下滚动加载更多
        </el-divider>
        <el-divider v-else>没有更多了</el-divider>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Loading, Delete, Timer, Close } from '@element-plus/icons-vue'
import { useGoodsStore } from '../store/useGoodsStore'
import { goodsAPI } from '../../../api/goods/goods'
import { searchAPI } from '../../../api/goods/search'
import debounce from 'lodash/debounce'
import { ElMessage } from 'element-plus'

// 路由
const router = useRouter()

// 商品Store
const goodsStore = useGoodsStore()

// 搜索相关
const searchKeyword = ref('')
const suggestions = ref([])
const showSuggestions = ref(false)
const hideTimeout = ref(null)
const searchHistory = ref([])
const showHistory = ref(false)

// 排序相关
const sortOption = ref('default')
const sortParams = computed(() => {
  // 根据当前排序选项返回对应的排序参数
  switch(sortOption.value) {
    case 'sales':
      return { sortBy: 'sales', sortOrder: 'desc' }
    case 'price-asc':
      return { sortBy: 'price', sortOrder: 'asc' }
    case 'price-desc':
      return { sortBy: 'price', sortOrder: 'desc' }
    case 'rating':
      return { sortBy: 'rating', sortOrder: 'desc' }
    default:
      return { sortBy: 'default', sortOrder: 'desc' }
  }
})

// 列表容器
const listWrapper = ref(null)

// 分页和加载相关
const hasMore = computed(() => goodsStore.currentPage < goodsStore.totalPages)
const loading = computed(() => goodsStore.loading)

// 商品详情跳转
const goToDetail = (id) => {
  
  // 清除之前的商品详情缓存，确保加载新的商品
  goodsStore.clearGoodsCache() // 清除所有缓存，确保干净的环境
  
  // 添加加载反馈，避免用户感觉延迟
  ElMessage({
    message: '正在加载商品详情...',
    type: 'info',
    duration: 1000
  })
  
  // 使用push而不是replace，确保能返回列表页
  router.push({
    path: `/goods/${id}`,
    // 添加时间戳作为查询参数，确保即使ID相同也会刷新
    query: { _t: Date.now() }
  })
}

// 获取搜索建议（防抖）
const debouncedGetSuggestions = debounce(async () => {
  if (searchKeyword.value.trim().length > 0) {
    try {
      const res = await goodsAPI.getSuggestions(searchKeyword.value)
      suggestions.value = res.data || []
      showSuggestions.value = suggestions.value.length > 0
      
      // 如果没有搜索建议但有搜索历史，则显示搜索历史
      if (!showSuggestions.value && searchHistory.value.length > 0) {
        showHistory.value = true
      } else {
        showHistory.value = false
      }
    } catch (error) {
      // 显示搜索历史
      showHistory.value = searchHistory.value.length > 0
    }
  } else {
    suggestions.value = []
    showSuggestions.value = false
    // 当输入为空时，显示搜索历史
    showHistory.value = searchHistory.value.length > 0
  }
}, 300)

// 选择搜索建议
const selectSuggestion = (suggestion, event) => {
  // 阻止事件冒泡
  if (event) {
    event.stopPropagation();
  }
  
  // 清除延迟隐藏的定时器
  if (hideTimeout.value) {
    window.clearTimeout(hideTimeout.value);
    hideTimeout.value = null;
  }
  
  searchKeyword.value = suggestion;
  showSuggestions.value = false; // 立即隐藏搜索建议
  handleSearch();
}

// 执行搜索
const handleSearch = async () => {
  // 清除延迟隐藏的定时器
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
  
  if (searchKeyword.value.trim().length > 0) {
    showSuggestions.value = false // 立即隐藏搜索建议
    showHistory.value = false // 隐藏历史记录
    
    // 保存搜索历史
    try {
      await searchAPI.saveHistory(searchKeyword.value.trim())
      // 刷新搜索历史
      await fetchSearchHistory()
    } catch (error) {
      // 忽略错误
    }
    
    // 加载商品列表
    goodsStore.loadGoodsList({ 
      keyword: searchKeyword.value,
      page: 1,
      ...sortParams.value 
    })
  }
}

// 使用搜索历史记录
const useHistoryItem = (keyword, event) => {
  // 阻止事件冒泡
  if (event) {
    event.stopPropagation();
  }
  
  // 如果有定时器，清除它
  if (hideTimeout.value) {
    window.clearTimeout(hideTimeout.value);
    hideTimeout.value = null;
  }
  
  searchKeyword.value = keyword;
  showHistory.value = false;
  handleSearch();
}

// 删除单个搜索历史
const removeHistoryItem = async (index, event) => {
  // 阻止事件冒泡，防止触发父元素的点击事件和输入框的blur事件
  if (event) {
    event.stopPropagation();
  }
  
  // 如果有定时器，清除它，防止历史面板自动关闭
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value);
    hideTimeout.value = null;
  }
  
  try {
    const keyword = searchHistory.value[index]
    
    // 调用后端API删除该记录
    await searchAPI.removeHistoryItem(keyword)
    
    // 更新前端显示
    searchHistory.value.splice(index, 1)
  } catch (error) {
    // 即使后端删除失败，也从前端移除
    searchHistory.value.splice(index, 1)
  }
}

// 清空所有搜索历史
const clearAllHistory = async () => {
  try {
    // 调用后端API清空历史记录
    await searchAPI.clearHistory()
    
    // 清空前端显示
    searchHistory.value = []
    showHistory.value = false
  } catch (error) {
    // 即使后端请求失败，也清空前端显示
    searchHistory.value = []
    showHistory.value = false
  }
}

// 排序变更
const handleSortChange = async (option) => {
  // 保存旧的选项，用于比较
  const oldOption = sortOption.value
  
  // 设置新的排序选项
  sortOption.value = option
  
  // 直接使用计算属性获取排序参数
  const { sortBy, sortOrder } = sortParams.value
  
  try {
    // 清空商品列表以确保视图更新
    goodsStore.clearGoodsList()
    
    // 重置页码并强制重新加载数据
    goodsStore.currentPage = 1
    
    // 重新加载数据
    await goodsStore.loadGoodsList({
      page: 1,
      pageSize: 20,
      keyword: searchKeyword.value,
      sortBy,
      sortOrder,
      append: false,
      // 添加时间戳，确保不使用缓存结果
      _t: Date.now()
    })
    
    // 强制渲染DOM - 等待DOM更新
    await nextTick()
    
    // 显示排序已更新的提示
    ElMessage({
      message: '商品已重新排序',
      type: 'success',
      duration: 1500
    })
  } catch (error) {
    ElMessage.error('排序失败，请重试')
    
    // 如果失败，恢复之前的排序选项
    sortOption.value = oldOption
  }
}

// 监听滚动事件
const handleScroll = () => {
  if (loading.value || !hasMore.value) return
  
  const scrollHeight = document.documentElement.scrollHeight
  const scrollTop = document.documentElement.scrollTop
  const clientHeight = document.documentElement.clientHeight
  
  // 当滚动到距离底部 100px 时触发加载
  if (scrollHeight - scrollTop - clientHeight < 100) {
    loadMore()
  }
}

// 加载更多
const loadMore = async () => {
  if (loading.value || !hasMore.value) return
  
  try {
    await goodsStore.loadGoodsList({ 
      page: goodsStore.currentPage + 1,
      keyword: searchKeyword.value,
      ...sortParams.value,
      append: true // 添加 append 参数，表示追加模式
    })
  } catch (error) {
    // 忽略错误
  }
}

// 处理输入框失焦
const handleInputBlur = (event) => {
  // 只有当点击的不是搜索相关组件时，才设置延迟关闭
  // 这是作为兜底方案，主要由handleOutsideClick处理关闭
  if (!event.relatedTarget || 
      (!event.relatedTarget.closest('.search-history') && 
       !event.relatedTarget.closest('.search-input') &&
       !event.relatedTarget.closest('.suggestions'))) {
    
    hideTimeout.value = window.setTimeout(() => {
      showSuggestions.value = false
      showHistory.value = false
    }, 200)
  } else if (hideTimeout.value) {
    // 如果点击的是相关组件，取消关闭定时器
    window.clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
}

// 处理输入框获取焦点
const handleInputFocus = () => {
  if (searchKeyword.value.trim() === '') {
    // 当输入为空时，显示搜索历史
    showHistory.value = searchHistory.value.length > 0
    showSuggestions.value = false
  } else {
    // 当有输入内容时，优先显示搜索建议
    showSuggestions.value = suggestions.value.length > 0
    // 如果没有搜索建议但有搜索历史，则显示搜索历史
    if (!showSuggestions.value && searchHistory.value.length > 0) {
      showHistory.value = true
    } else {
      showHistory.value = false
    }
  }
}

// 获取搜索历史
const fetchSearchHistory = async () => {
  try {
    const res = await searchAPI.getHistory()
    
    // 确保后端返回的数据格式正确
    if (res && res.data) {
      if (Array.isArray(res.data)) {
        searchHistory.value = res.data
      } else if (res.data.list && Array.isArray(res.data.list)) {
        searchHistory.value = res.data.list
      } else {
        searchHistory.value = []
      }
    } else {
      searchHistory.value = []
    }
  } catch (error) {
    searchHistory.value = []
  }
}

// 监听搜索关键词变化
watch(searchKeyword, (newVal) => {
  if (newVal.trim() === '' && document.activeElement === document.querySelector('.search-input input')) {
    // 当搜索框内容被清空且搜索框处于焦点状态时，显示搜索历史
    if (searchHistory.value.length > 0) {
      showHistory.value = true
      showSuggestions.value = false
    }
  }
})

// 生命周期钩子
onMounted(async () => {
  // 检查URL中是否有搜索关键词
  const urlParams = new URLSearchParams(window.location.search)
  const keywordFromUrl = urlParams.get('keyword')
  
  // 加载搜索历史
  await fetchSearchHistory()
  
  // 添加全局滚动监听和点击事件
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('mousedown', handleOutsideClick)
  
  // 根据URL参数决定加载方式
  if (keywordFromUrl) {
    searchKeyword.value = keywordFromUrl
    handleSearch()
  } else {
    await goodsStore.loadGoodsList()
  }
})

// 组件卸载前清理事件监听
onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('mousedown', handleOutsideClick)
  
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value)
    hideTimeout.value = null
  }
})

// 处理点击搜索历史面板外部
const handleOutsideClick = (event) => {
  // 如果点击了历史面板或搜索框，不处理
  if (event.target.closest('.search-history') || 
      event.target.closest('.search-input') ||
      event.target.closest('.suggestions')) {
    return
  }
  
  // 点击了其他区域，关闭搜索历史和搜索建议
  showHistory.value = false
  showSuggestions.value = false
}
</script>

<style scoped>
.goods-list-container {
  width: 100%;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 20px;
}

.search-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: #fff;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-input-wrapper {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}

.search-input { width: 100%; }

/* 搜索建议和历史相关样式 */
.suggestions, .search-history {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-top: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.search-history { padding: 16px; }

.suggestion-item {
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.suggestion-item:hover { background-color: #f5f7fa; }

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.history-title {
  font-size: 14px;
  color: #606266;
}

.clear-btn {
  color: #909399;
  cursor: pointer;
  font-size: 14px;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-tag {
  display: flex;
  align-items: center;
  background-color: #f5f7fa;
  padding: 4px 12px;
  border-radius: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.history-tag:hover { background-color: #e4e7ed; }

.delete-icon {
  margin-left: 4px;
  font-size: 12px;
  color: #909399;
}

.empty-history {
  text-align: center;
  color: #909399;
  padding: 20px 0;
}

.sort-bar {
  background-color: #fff;
  padding: 12px 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.goods-list-wrapper {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 8px 0;
}

.goods-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  position: relative;
}

.goods-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1), 0 0 0 1px var(--item-theme-color, #f5f5f5);
}

.goods-card::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: var(--item-theme-color, #f5f5f5);
  transition: height 0.3s;
}

.goods-card:hover::before {
  height: 6px;
}

.goods-img-wrapper {
  position: relative;
  width: 100%;
  padding-top: 100%;
  overflow: hidden;
  background-color: #f5f5f5; /* 默认背景色 */
  transition: background-color 0.3s;
}

.goods-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: transform 0.3s;
}

.goods-card:hover .goods-img { 
  transform: scale(1.05); 
  opacity: 0.9;
}

.goods-info { 
  padding: 12px; 
  background: linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,1) 20%);
}

.goods-title {
  margin: 0;
  font-size: 14px;
  color: #303133;
  line-height: 1.4;
  height: 40px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.price {
  margin: 8px 0;
  color: #f56c6c;
  font-size: 18px;
  font-weight: bold;
}

.goods-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.sales { color: #909399; }

.rating {
  display: flex;
  align-items: center;
  gap: 4px;
}

.load-more {
  margin-top: 20px;
  text-align: center;
}

.loading { animation: rotate 1s linear infinite; }

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 骨架屏样式 */
.skeleton {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.skeleton-item {
  background: #f2f2f2;
  border-radius: 4px;
}

.skeleton-item.img {
  width: 100%;
  height: 200px;
}

.skeleton-item.title {
  width: 80%;
  height: 20px;
  margin: 12px;
}

.skeleton-item.price {
  width: 40%;
  height: 24px;
  margin: 0 12px;
}

.skeleton-item.desc {
  width: 60%;
  height: 16px;
  margin: 8px 12px;
}
</style>
