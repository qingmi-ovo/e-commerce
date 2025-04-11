import request from '../../common/utils/request'

/**
 * 通用请求错误处理
 * @param {Error} error - 错误对象
 * @param {string} message - 自定义错误消息
 * @returns {Promise} - 返回被拒绝的Promise
 */
const handleRequestError = (error, message = '网络异常') => {
  console.error(`${message}:`, error)
  return Promise.reject({ code: 500, msg: message })
}

/**
 * 获取用户收货地址列表
 * @returns {Promise} 返回地址列表数据
 */
export const fetchAddressList = () => {
  return request({
    url: '/user/address',
    method: 'get',
    mock: true
  }).catch(error => handleRequestError(error, '获取地址列表失败'))
}

/**
 * 添加收货地址
 * @param {Object} addressData - 地址信息
 * @returns {Promise} 返回添加结果
 */
export const addAddress = (addressData) => {
  return request({
    url: '/user/address',
    method: 'post',
    data: addressData,
    mock: true
  }).catch(error => handleRequestError(error, '添加地址失败'))
}

/**
 * 更新收货地址
 * @param {string} id - 地址ID
 * @param {Object} addressData - 地址信息
 * @returns {Promise} 返回更新结果
 */
export const updateAddress = (id, addressData) => {
  return request({
    url: `/user/address/${id}`,
    method: 'put',
    data: addressData,
    mock: true
  }).catch(error => handleRequestError(error, '更新地址失败'))
}

/**
 * 删除收货地址
 * @param {string} id - 地址ID
 * @returns {Promise} 返回删除结果
 */
export const deleteAddress = (id) => {
  return request({
    url: `/user/address/${id}`,
    method: 'delete',
    mock: true
  }).catch(error => handleRequestError(error, '删除地址失败'))
}

/**
 * 设置默认收货地址
 * @param {string} id - 地址ID
 * @returns {Promise} 返回设置结果
 */
export const setDefaultAddress = (id) => {
  return request({
    url: `/user/address/${id}/default`,
    method: 'put',
    mock: true
  }).catch(error => handleRequestError(error, '设置默认地址失败'))
}

// 导出API模块
export const addressAPI = {
  fetchAddressList,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} 