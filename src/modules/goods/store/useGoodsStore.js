import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { goodsAPI } from '../../../api/goods/goods'

/**
 * 生成模拟商品数据
 * @param {Number} count - 生成数量
 * @returns {Array} - 商品数据数组
 */
const generateMockGoodsList = (count = 10) => {
  return Array(count).fill().map((_, i) => ({
    id: `fallback-${i}`,
    title: `模拟商品 ${i}`,
    price: Math.floor(Math.random() * 1000) + 10,
    imageUrl: `https://via.placeholder.com/300x300?text=Product${i}`,
    salesCount: Math.floor(Math.random() * 1000),
    rating: (Math.random() * 5).toFixed(1)
  }))
}

/**
 * 商品模块状态管理
 */
export const useGoodsStore = defineStore('goods', () => {
  // 状态定义
  const goodsList = ref([])
  const currentPage = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  const loading = ref(false)
  const currentCategory = ref('')
  const totalPages = ref(1) // 改为普通响应式变量
  
  // 商品详情缓存
  const goodsDetailsCache = ref({}) // { id: 商品详情对象 }
  
  // 计算属性
  const isEmpty = computed(() => goodsList.value.length === 0)
  
  /**
   * 加载商品列表
   * @param {Object} params - 查询参数
   * @param {Boolean} params.append - 是否追加模式（用于滚动加载）
   */
  const loadGoodsList = async (params = {}) => {
    try {
      // 合并分页和排序参数
      const queryParams = {
        page: params.page || currentPage.value,
        pageSize: pageSize.value,
        ...params
      }
      
      // 移除append参数，避免传递给API
      const { append, ...apiParams } = queryParams
      
      // 调用API获取数据
      const response = await goodsAPI.fetchList(apiParams)
      
      // 确保数据存在
      const listData = response?.data?.list || []
      
      // 使用Vue的响应式API更新数据
      if (append) {
        // 追加模式：使用push方法确保响应式更新
        goodsList.value.push(...listData)
      } else {
        // 替换模式：直接赋值新数组
        goodsList.value = listData
      }
      
      // 更新总页数
      totalPages.value = Math.ceil((response?.data?.total || 0) / pageSize.value)
      
      // 如果没有数据，使用模拟数据作为后备
      if (goodsList.value.length === 0) {
        goodsList.value = generateMockGoodsList(10)
        totalPages.value = 1
      }
      
      return goodsList.value
    } catch (error) {
      // 发生错误时使用模拟数据
      goodsList.value = generateMockGoodsList(10)
      totalPages.value = 1
      return goodsList.value
    }
  }
  
  /**
   * 获取商品详情（带缓存）
   * @param {String|Number} id - 商品ID
   * @returns {Promise<Object>} - 商品详情
   */
  const getGoodsDetail = async (id) => {
    console.log(`尝试获取商品详情 (ID: ${id})`)
    
    // 每次请求都清除缓存，确保获取新的数据
    delete goodsDetailsCache.value[id]
    
    try {
      loading.value = true
      console.log(`正在请求商品详情API (ID: ${id})`)
      const res = await goodsAPI.fetchDetail(id)
      console.log(`商品详情API响应:`, res)
      
      // 将获取到的商品详情存入缓存
      if (res.data) {
        // 确保数据格式一致
        const formattedData = {
          ...res.data,
          params: Array.isArray(res.data.params) ? res.data.params : [],
          specs: res.data.specs || {},
          skus: Array.isArray(res.data.skus) ? res.data.skus : [],
          images: Array.isArray(res.data.images) ? res.data.images : 
                 (res.data.imageUrl ? [res.data.imageUrl] : [])
        }
        
        goodsDetailsCache.value[id] = formattedData
        console.log(`商品详情已缓存 (ID: ${id})`)
        
        return goodsDetailsCache.value[id]
      } else {
        console.warn(`API返回的商品详情数据为空 (ID: ${id})`)
        
        // 如果API没有返回数据但列表中有该商品，则使用列表中的数据
        const goodsInList = goodsList.value.find(item => item.id === id)
        if (goodsInList) {
          console.log(`使用列表中的商品数据作为详情 (ID: ${id})`)
          goodsDetailsCache.value[id] = {
            ...goodsInList,
            images: [goodsInList.imageUrl],
            description: '商品详情加载失败，请刷新页面重试',
            specs: {},
            skus: [],
            params: [],
            services: ['正品保证']
          }
          return goodsDetailsCache.value[id]
        }
        
        // 没有找到商品，返回空对象
        return null
      }
    } catch (error) {
      console.error(`获取商品详情失败 (ID: ${id}):`, error)
      
      // 如果API请求失败但列表中有该商品，则使用列表中的数据
      const goodsInList = goodsList.value.find(item => item.id === id)
      if (goodsInList) {
        console.log(`使用列表中的商品数据作为详情 (ID: ${id})`)
        goodsDetailsCache.value[id] = {
          ...goodsInList,
          images: [goodsInList.imageUrl],
          description: '商品详情加载失败，请刷新页面重试',
          specs: {},
          skus: [],
          params: [],
          services: ['正品保证']
        }
        return goodsDetailsCache.value[id]
      }
      
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 清除商品详情缓存
   * @param {String|Number} [id] - 商品ID，不传则清除所有缓存
   */
  const clearGoodsCache = (id) => {
    if (id) {
      delete goodsDetailsCache.value[id]
      console.log(`已清除商品 ${id} 的缓存`)
    } else {
      goodsDetailsCache.value = {}
      console.log('已清除所有商品缓存')
    }
  }
  
  /**
   * 更改分页大小
   * @param {Number} size - 每页显示数量
   */
  const changePageSize = (size) => {
    pageSize.value = size
    loadGoodsList({ page: 1 }) // 重置到第一页
  }
  
  /**
   * 下一页
   */
  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      loadGoodsList({ page: currentPage.value + 1 })
    }
  }
  
  /**
   * 上一页
   */
  const prevPage = () => {
    if (currentPage.value > 1) {
      loadGoodsList({ page: currentPage.value - 1 })
    }
  }
  
  /**
   * 跳转到指定页
   * @param {Number} page - 页码
   */
  const goToPage = (page) => {
    const pageNum = Math.min(Math.max(1, page), totalPages.value)
    loadGoodsList({ page: pageNum })
  }
  
  /**
   * 清空商品列表，用于强制刷新
   */
  const clearGoodsList = () => {
    goodsList.value = [] 
    console.log('商品列表已清空，准备重新加载')
  }

  return { 
    // 状态
    goodsList,
    currentPage,
    pageSize,
    total,
    loading,
    currentCategory,
    isEmpty,
    totalPages,
    
    // 商品列表相关方法
    loadGoodsList,
    changePageSize,
    nextPage,
    prevPage,
    goToPage,
    clearGoodsList,
    
    // 商品详情相关方法
    getGoodsDetail,
    clearGoodsCache
  }
})
