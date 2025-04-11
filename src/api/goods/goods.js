import request from '../../common/utils/request'

/**
 * 商品相关API服务
 */
export const goodsAPI = {
  /**
   * 分页获取商品列表
   * @param {Object} params - 查询参数对象
   * @returns {Promise} - 请求Promise对象
   */
  fetchList: (params) => {
    console.log('调用商品列表API，参数:', JSON.stringify(params))
    
    // 确保排序参数正确传递
    const { sortBy, sortOrder, ...otherParams } = params
    const enhancedParams = { 
      pageSize: 20, 
      ...otherParams
    }
    
    // 只有当明确指定排序参数时才添加
    if (sortBy && sortBy !== 'default') {
      enhancedParams.sortBy = sortBy
      enhancedParams.sortOrder = sortOrder || 'desc'
    }
    
    // 添加时间戳避免缓存
    enhancedParams._t = Date.now()
    
    console.log('处理后的API参数:', JSON.stringify(enhancedParams))
    
    return request({
      url: '/goods/list',
      method: 'get',
      mock: true,
      params: enhancedParams
    }).catch(error => {
      console.error('获取商品列表失败:', error)
      throw error
    })
  },
  
  /**
   * 获取商品详情
   * @param {String|Number} id - 商品ID
   * @returns {Promise} - 请求Promise对象
   */
  fetchDetail: (id) => request({
    url: `/goods/${id}`,
    method: 'get',
    mock: true
  }).catch(error => {
    console.error(`获取商品详情失败 (ID: ${id}):`, error)
    throw error
  }),
  
  /**
   * 获取搜索建议
   * @param {String} keyword - 搜索关键词
   * @returns {Promise} - 请求Promise对象
   */
  getSuggestions: (keyword) => request({
    url: '/goods/suggest',
    method: 'get',
    params: { keyword },
    mock: true
  }).catch(error => {
    console.error('获取搜索建议失败:', error)
    throw error
  })
} 