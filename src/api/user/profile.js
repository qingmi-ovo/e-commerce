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
 * 获取用户详情信息
 * @returns {Promise} 返回用户详情数据
 */
export const fetchUserProfile = () => {
  return request({
    url: '/user/profile',
    method: 'get',
    mock: true
  }).catch(error => handleRequestError(error, '获取用户信息失败'))
}

/**
 * 更新用户资料
 * @param {Object} profileData - 用户资料数据
 * @param {string} profileData.nickname - 用户昵称
 * @param {string} profileData.email - 用户邮箱
 * @param {string} profileData.mobile - 用户手机号
 * @param {Object} profileData.address - 用户地址
 * @returns {Promise} 返回更新结果
 */
export const updateProfile = (profileData) => {
  return request({
    url: '/user/profile',
    method: 'put',
    data: profileData,
    mock: true
  }).catch(error => handleRequestError(error, '更新用户资料失败'))
}

/**
 * 上传用户头像
 * @param {FormData} formData - 包含头像文件的表单数据
 * @returns {Promise} 返回上传结果，包含新头像URL
 */
export const uploadAvatar = (formData) => {
  return request({
    url: '/user/avatar',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    mock: true
  }).catch(error => handleRequestError(error, '上传头像失败'))
}

// 导出API模块
export const profileAPI = {
  fetchUserProfile,
  updateProfile,
  uploadAvatar
} 