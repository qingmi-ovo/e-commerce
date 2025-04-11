import request from '../../common/utils/request'

/**
 * 搜索相关API接口
 * 
 * 请求体格式：
 * interface Criteria {
 *   keyword: string;
 *   minPrice?: number;
 *   maxPrice?: number;
 *   sortBy?: 'price' | 'sales';
 * }
 */
export const searchAPI = {
  /**
   * 复合搜索（关键词+筛选条件）
   * @param {Object} criteria - 搜索条件对象
   * @param {String} criteria.keyword - 搜索关键词
   * @param {Number} [criteria.minPrice] - 最低价格
   * @param {Number} [criteria.maxPrice] - 最高价格
   * @param {String} [criteria.sortBy] - 排序字段，可选值：price、sales
   * @returns {Promise} - 请求Promise对象
   */
  advancedSearch: (criteria) => request({
    url: '/goods/search',
    method: 'post',
    data: criteria,
    mock: true
  }).catch(error => {
    console.error('高级搜索失败:', error)
    throw error
  }),
  
  /**
   * 获取搜索历史记录
   * @returns {Promise} - 请求Promise对象
   */
  getHistory: () => request({
    url: '/search/history',
    method: 'get',
    mock: true
  }).catch(error => {
    console.error('获取搜索历史记录失败:', error)
    throw error
  }),
  
  /**
   * 保存搜索关键词到历史记录
   * @param {String} keyword - 搜索关键词
   * @returns {Promise} - 请求Promise对象
   */
  saveHistory: (keyword) => request({
    url: '/search/history/save',
    method: 'post',
    data: { keyword },
    mock: true
  }).catch(error => {
    console.error('保存搜索历史记录失败:', error)
    throw error
  }),
  
  /**
   * 删除单条搜索历史记录
   * @param {String} keyword - 要删除的搜索关键词
   * @returns {Promise} - 请求Promise对象
   */
  removeHistoryItem: (keyword) => request({
    url: '/search/history/remove',
    method: 'post',
    data: { keyword },
    mock: true
  }).catch(error => {
    console.error('删除搜索历史记录项失败:', error)
    throw error
  }),
  
  /**
   * 清空搜索历史记录
   * @returns {Promise} - 请求Promise对象
   */
  clearHistory: () => request({
    url: '/search/history/clear',
    method: 'post',
    mock: true
  }).catch(error => {
    console.error('清空搜索历史记录失败:', error)
    throw error
  })
} 