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
 * 用户名密码登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @param {string} captcha - 验证码
 * @param {string} captchaId - 验证码ID
 * @returns {Promise} - 返回登录结果
 */
export const loginByPassword = (username, password, captcha, captchaId) => {
  return request({
    url: '/user/login/account',
    method: 'post',
    data: { username, password, captcha, captchaId },
    mock: true,
  }).catch(error => handleRequestError(error, '登录请求失败'))
}

/**
 * 手机短信验证码登录
 * @param {string} mobile - 手机号
 * @param {string} smsCode - 短信验证码
 * @param {string} captcha - 图形验证码
 * @param {string} captchaId - 验证码ID
 * @returns {Promise} - 返回登录结果
 */
export const loginBySMS = (mobile, smsCode, captcha, captchaId) => {
  return request({
    url: '/user/login/sms',
    method: 'post',
    data: { mobile, smsCode, captcha, captchaId },
    mock: true,
  }).catch(error => handleRequestError(error, '短信登录请求失败'))
}

/**
 * 获取图形验证码
 * @returns {Promise} - 返回图形验证码数据，一般为Base64编码的图片
 */
export const getCaptchaImage = () => {
  return request({
    url: '/user/captcha',
    method: 'get',
    mock: true,
  }).catch(error => handleRequestError(error, '获取验证码失败'))
}

/**
 * 验证图形验证码
 * @param {string} captcha - 验证码
 * @param {string} captchaId - 验证码ID
 * @returns {Promise} - 返回验证结果
 */
export const verifyCaptcha = (captcha, captchaId) => {
  return request({
    url: '/user/captcha/verify',
    method: 'post',
    data: { captcha, captchaId },
    mock: true,
  }).catch(error => handleRequestError(error, '验证码验证失败'))
}

/**
 * 用户注册
 * @param {object} userData - 用户注册数据
 * @param {string} userData.username - 用户名
 * @param {string} userData.password - 密码
 * @param {string} userData.mobile - 手机号
 * @param {string} userData.smsCode - 短信验证码
 * @param {string} userData.captcha - 图形验证码
 * @param {string} userData.captchaId - 验证码ID
 * @returns {Promise} - 返回注册结果
 */
export const register = (userData) => {
  return request({
    url: '/user/register',
    method: 'post',
    data: userData,
    mock: true,
  }).catch(error => handleRequestError(error, '注册请求失败'))
}

// 导出API模块
export const authAPI = {
  loginByPassword,
  loginBySMS,
  getCaptchaImage,
  verifyCaptcha,
  register
} 