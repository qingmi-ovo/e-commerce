import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { orderAPI } from '../../../api/order/order'
import { ElMessage } from 'element-plus'

/**
 * 订单状态管理
 */
export const useOrderStore = defineStore('order', () => {
  // 状态定义
  const currentOrder = ref(null) // 当前订单
  const orderList = ref([]) // 订单列表
  const loading = ref(false) // 加载状态

  // 计算属性：订单状态文本映射
  const orderStatusText = computed(() => ({
    1: '待付款',
    2: '待发货',
    3: '待收货',
    4: '已完成',
    5: '已取消',
    6: '已关闭'
  }))

  /**
   * 提交订单
   * @param {Array} cartItems - 购物车商品数组
   * @param {Object} address - 收货地址对象
   * @param {Object} options - 订单选项
   * @returns {Promise} - 返回创建的订单信息
   */
  const submitOrder = async (cartItems, address, options = {}) => {
    loading.value = true
    
    try {
      // 将购物车商品格式转换为订单所需格式
      const items = cartItems.map(item => ({
        skuId: item.skuId,
        count: item.count
      }))
      
      // 调用API创建订单
      const res = await orderAPI.createOrder(items, address, options)
      
      // 保存当前订单到状态
      currentOrder.value = res.data
      
      return res.data
    } catch (error) {
      ElMessage.error('创建订单失败，请稍后重试')
      console.error('创建订单失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 获取订单详情
   * @param {String} orderNo - 订单编号
   * @returns {Promise} - 返回订单详情
   */
  const getOrderDetail = async (orderNo) => {
    loading.value = true
    
    try {
      // 调用API获取订单详情
      const res = await orderAPI.fetchOrder(orderNo)
      
      // 更新当前订单状态
      currentOrder.value = res.data
      
      return res.data
    } catch (error) {
      console.error(`获取订单详情失败 (订单号: ${orderNo}):`, error)
      
      // 当API请求失败时，尝试使用当前存储的数据
      if (currentOrder.value?.orderNo === orderNo) {
        console.log('使用当前store中的订单数据')
        return currentOrder.value
      }
      
      ElMessage.error('获取订单详情失败')
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 获取订单列表
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回订单列表数据
   */
  const getOrderList = async (params = {}) => {
    loading.value = true
    
    try {
      const res = await orderAPI.fetchOrderList(params)
      orderList.value = res.data.records || []
      return res.data
    } catch (error) {
      ElMessage.error('获取订单列表失败')
      console.error('获取订单列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 取消订单
   * @param {String} orderNo - 订单编号
   * @returns {Promise} - 返回操作结果
   */
  const cancelOrder = async (orderNo) => {
    loading.value = true
    
    try {
      await orderAPI.cancelOrder(orderNo)
      
      // 更新当前订单状态
      if (currentOrder.value?.orderNo === orderNo) {
        currentOrder.value.status = 5
        currentOrder.value.closeTime = new Date().toISOString()
      }
      
      // 更新订单列表中的订单状态
      const orderIndex = orderList.value.findIndex(o => o.orderNo === orderNo)
      if (orderIndex !== -1) {
        orderList.value[orderIndex].status = 5
        orderList.value[orderIndex].closeTime = new Date().toISOString()
      }
      
      ElMessage.success('订单已取消')
      return true
    } catch (error) {
      ElMessage.error('取消订单失败')
      console.error(`取消订单失败 (订单号: ${orderNo}):`, error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 确认收货
   * @param {String} orderNo - 订单编号
   * @returns {Promise} - 返回操作结果
   */
  const confirmReceipt = async (orderNo) => {
    loading.value = true
    
    try {
      const response = await orderAPI.confirmReceipt(orderNo)
      
      // 更新当前订单状态
      if (currentOrder.value?.orderNo === orderNo) {
        currentOrder.value.status = 4
        currentOrder.value.completeTime = new Date().toISOString()
      }
      
      // 更新订单列表中的订单状态
      const orderIndex = orderList.value.findIndex(o => o.orderNo === orderNo)
      if (orderIndex !== -1) {
        orderList.value[orderIndex].status = 4
        orderList.value[orderIndex].completeTime = new Date().toISOString()
      }
      
      ElMessage.success(response?.message?.includes('本地处理') ? '已在本地确认收货（离线模式）' : '已确认收货')
      return true
    } catch (error) {
      console.error(`确认收货失败 (订单号: ${orderNo}):`, error)
      ElMessage.error('确认收货失败，请稍后重试')
      return false
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 清除当前订单
   */
  const clearCurrentOrder = () => {
    currentOrder.value = null
  }
  
  return { 
    currentOrder, 
    orderList, 
    loading,
    orderStatusText,
    submitOrder,
    getOrderDetail,
    getOrderList,
    cancelOrder,
    confirmReceipt,
    clearCurrentOrder
  }
})
