import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cartAPI } from '../../../api/cart/cart'
import { ElMessage } from 'element-plus'

/**
 * 购物车状态管理
 */
export const useCartStore = defineStore('cart', () => {
  // 状态定义
  const items = ref([]) // 购物车商品列表
  const selectedIds = ref(new Set()) // 选中的商品ID集合
  const loading = ref(false) // 加载状态
  
  /**
   * 商品总数量
   */
  const totalCount = computed(() => items.value.reduce((sum, item) => sum + item.count, 0))
  
  /**
   * 选中商品总价
   */
  const totalPrice = computed(() => {
    return items.value
      .filter(item => selectedIds.value.has(item.skuId) && !item.isInvalid)
      .reduce((sum, item) => sum + item.price * item.count, 0)
  })
  
  /**
   * 选中商品数量
   */
  const selectedCount = computed(() => {
    return items.value
      .filter(item => selectedIds.value.has(item.skuId) && !item.isInvalid)
      .reduce((sum, item) => sum + item.count, 0)
  })
  
  /**
   * 选中的商品列表
   */
  const selectedItems = computed(() => {
    return items.value.filter(item => selectedIds.value.has(item.skuId) && !item.isInvalid)
  })
  
  /**
   * 是否全选状态
   */
  const isAllSelected = computed(() => {
    // 过滤掉失效商品
    const validItems = items.value.filter(item => !item.isInvalid)
    if (validItems.length === 0) return false
    
    // 检查所有有效商品是否都被选中
    return validItems.every(item => selectedIds.value.has(item.skuId))
  })
  
  /**
   * 切换商品选中状态
   * @param {String} skuId - 商品SKU ID
   */
  const toggleSelect = (skuId) => {
    // 检查商品是否失效
    const item = items.value.find(item => item.skuId === skuId)
    if (item && item.isInvalid) return
    
    // 切换选中状态
    if (selectedIds.value.has(skuId)) {
      selectedIds.value.delete(skuId)
    } else {
      selectedIds.value.add(skuId)
    }
  }
  
  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    if (isAllSelected.value) {
      // 已全选则取消全选
      selectedIds.value.clear()
    } else {
      // 未全选则全选（只选择有效商品）
      items.value
        .filter(item => !item.isInvalid)
        .forEach(item => {
          selectedIds.value.add(item.skuId)
        })
    }
  }
  
  /**
   * 增加商品数量
   * @param {String} skuId - 商品SKU ID
   * @param {Number} delta - 变化量，默认为1
   */
  const increaseCount = (skuId, delta = 1) => {
    const item = items.value.find(item => item.skuId === skuId)
    if (!item) return
    
    // 检查库存限制
    if (item.count + delta > item.stock) {
      ElMessage.warning(`商品数量不能超过库存(${item.stock})`)
      return
    }
    
    // 更新数量
    item.count += delta
    
    // 同步到服务器
    cartAPI.batchUpdate([{ skuId, count: item.count }])
      .catch(() => {
        // 请求失败时回滚
        item.count -= delta
        ElMessage.error('更新购物车失败')
      })
  }
  
  /**
   * 减少商品数量
   * @param {String} skuId - 商品SKU ID
   * @param {Number} delta - 变化量，默认为1
   */
  const decreaseCount = (skuId, delta = 1) => {
    const item = items.value.find(item => item.skuId === skuId)
    if (!item) return
    
    // 检查最小数量限制
    if (item.count - delta < 1) {
      ElMessage.warning('商品数量不能小于1，如需删除请使用移除功能')
      return
    }
    
    // 更新数量
    item.count -= delta
    
    // 同步到服务器
    cartAPI.batchUpdate([{ skuId, count: item.count }])
      .catch(() => {
        // 请求失败时回滚
        item.count += delta
        ElMessage.error('更新购物车失败')
      })
  }
  
  /**
   * 移除购物车商品
   * @param {String} skuId - 商品SKU ID
   */
  const removeItem = (skuId) => {
    const index = items.value.findIndex(item => item.skuId === skuId)
    if (index === -1) return
    
    // 从本地状态删除
    const removedItem = items.value.splice(index, 1)[0]
    
    // 如果商品已选中，从选中集合中删除
    if (selectedIds.value.has(skuId)) {
      selectedIds.value.delete(skuId)
    }
    
    // 同步到服务器
    cartAPI.batchUpdate([{ skuId, count: 0 }])
      .catch(() => {
        // 请求失败时回滚
        items.value.splice(index, 0, removedItem)
        if (removedItem.selected) {
          selectedIds.value.add(skuId)
        }
        ElMessage.error('移除商品失败')
      })
  }
  
  /**
   * 标记商品为失效
   * @param {String} skuId - 商品SKU ID
   */
  const markAsInvalid = (skuId) => {
    const item = items.value.find(item => item.skuId === skuId)
    if (!item) return
    
    // 标记为失效
    item.isInvalid = true
    
    // 如果商品已选中，从选中集合中删除
    if (selectedIds.value.has(skuId)) {
      selectedIds.value.delete(skuId)
    }
  }
  
  /**
   * 从服务器获取购物车数据
   */
  const fetchCart = async () => {
    loading.value = true
    
    try {
      console.log('获取购物车数据...')
      const response = await cartAPI.fetchCart()
      console.log('购物车数据响应:', response)
      
      if (response.code === 200 && response.data) {
        items.value = response.data.map(item => ({
          ...item,
          // 确保每个商品都有isInvalid字段
          isInvalid: item.isInvalid || false,
          // 确保规格信息格式正确
          specs: item.specs || {}
        }))
        
        // 输出调试信息，查看获取到的商品数据
        console.log('获取到的购物车商品:', items.value)
        
        // 初始化选中状态
        selectedIds.value.clear()
        items.value
          .filter(item => item.selected && !item.isInvalid)
          .forEach(item => {
            selectedIds.value.add(item.skuId)
          })
          
        return items.value  
      }
      return []
    } catch (error) {
      console.error('获取购物车数据失败:', error)
      ElMessage.error('获取购物车数据失败')
      return []
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 清空失效商品
   */
  const clearInvalidItems = () => {
    const invalidItems = items.value.filter(item => item.isInvalid)
    
    // 批量移除
    invalidItems.forEach(item => {
      const index = items.value.findIndex(i => i.skuId === item.skuId)
      if (index !== -1) {
        items.value.splice(index, 1)
      }
    })
    
    // 同步到服务器
    if (invalidItems.length > 0) {
      cartAPI.batchUpdate(invalidItems.map(item => ({ 
        skuId: item.skuId, 
        count: 0 
      })))
        .catch(() => {
          ElMessage.error('清空失效商品失败')
          // 此处可以考虑重新获取购物车数据进行回滚
          fetchCart()
        })
    }
  }
  
  /**
   * 移除选中的商品（用于结算后清空购物车中已购买的商品）
   */
  const removeSelectedItems = () => {
    const selectedItemIds = Array.from(selectedIds.value)
    
    // 批量删除
    selectedItemIds.forEach(skuId => {
      removeItem(skuId)
    })
    
    // 清空选中状态
    selectedIds.value.clear()
  }
  
  /**
   * 批量移除购物车商品
   * @param {Array<string>} skuIds - 商品SKU ID数组
   */
  const removeItems = (skuIds) => {
    if (!skuIds || !Array.isArray(skuIds) || skuIds.length === 0) {
      console.warn('移除购物车商品: 无效的skuIds参数', skuIds)
      return
    }
    
    // 批量删除
    skuIds.forEach(skuId => {
      if (skuId) removeItem(skuId)
    })
  }
  
  return { 
    // 状态
    items, 
    selectedIds, 
    loading,
    
    // 计算属性
    totalCount, 
    totalPrice, 
    selectedCount,
    isAllSelected,
    selectedItems,
    
    // 方法
    toggleSelect,
    toggleSelectAll,
    increaseCount,
    decreaseCount,
    removeItem,
    removeItems,
    markAsInvalid,
    fetchCart,
    clearInvalidItems,
    removeSelectedItems
  }
})
