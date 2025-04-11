import request from '../../common/utils/request'

/**
 * 购物车相关API服务
 */
export const cartAPI = {
  /**
   * 获取购物车列表
   * @returns {Promise} - 请求Promise对象
   */
  fetchCart: () => {
    console.log('请求购物车数据...')
    return request({
      url: '/cart/list',
      method: 'get',
      mock: true
    }).then(response => {
      console.log('购物车数据响应:', response)
      return response
    }).catch(error => {
      console.error('获取购物车列表失败:', error)
      // 返回一些默认数据以避免应用崩溃
      return {
        code: 200,
        message: 'fallback data',
        data: []
      }
    })
  },

  /**
   * 添加商品到购物车
   * @param {String} skuId - 商品SKU ID
   * @param {Number} count - 商品数量
   * @param {String} goodsId - 商品ID
   * @param {Object} goodsDetail - 商品详情信息
   * @param {Object} skuInfo - SKU详情信息
   * @returns {Promise} - 请求Promise对象
   */
  addItem: (skuId, count, goodsId, goodsDetail, skuInfo) => {
    console.log('添加商品到购物车:', { skuId, count, goodsId, goodsDetail, skuInfo })
    return request({
      url: '/cart/add',
      method: 'post',
      data: { skuId, count, goodsId, goodsDetail, skuInfo },
      mock: true
    }).then(response => {
      console.log('添加购物车响应:', response)
      return response
    }).catch(error => {
      console.error('添加商品到购物车失败:', error)
      return {
        code: 500,
        message: '添加失败',
        data: null
      }
    })
  },

  /**
   * 批量更新购物车商品
   * @param {Array<CartItem>} updates - 购物车项更新数组
   * @returns {Promise} - 请求Promise对象
   */
  batchUpdate: (updates) => request({
    url: '/cart/batch',
    method: 'patch',
    data: updates,
    mock: true
  }).catch(error => {
    console.error('批量更新购物车失败:', error)
    throw error
  })
}

/**
 * 购物车项类型定义
 * @typedef {Object} CartItem
 * @property {string} skuId - 商品SKU ID
 * @property {number} count - 商品数量
 * @property {boolean} [selected] - 是否选中，可选
 */ 