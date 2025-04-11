/**
 * 将URL查询字符串转换为对象
 * @param {string} url - 包含查询参数的URL
 * @returns {object} - 解析后的参数对象
 */
export function param2Obj(url) {
  const search = decodeURIComponent(url.split('?')[1]).replace(/\+/g, ' ')
  if (!search) {
    return {}
  }
  const obj = {}
  const searchArr = search.split('&')
  searchArr.forEach(v => {
    const index = v.indexOf('=')
    if (index !== -1) {
      const name = v.substring(0, index)
      const val = v.substring(index + 1, v.length)
      obj[name] = val
    }
  })
  return obj
}

/**
 * 格式化时间
 * @param {Date|string} time - 时间对象或时间字符串
 * @param {string} format - 格式化模板
 * @returns {string} - 格式化后的时间字符串
 */
export function formatTime(time, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!time) return ''
  
  let date
  if (typeof time === 'object') {
    date = time
  } else {
    if (typeof time === 'string') {
      if (/^[0-9]+$/.test(time)) {
        time = parseInt(time)
      } else {
        time = time.replace(/-/g, '/')
      }
    }
    if (typeof time === 'number' && time.toString().length === 10) {
      time = time * 1000
    }
    date = new Date(time)
  }
  
  const formatObj = {
    YYYY: date.getFullYear(),
    MM: date.getMonth() + 1,
    DD: date.getDate(),
    HH: date.getHours(),
    mm: date.getMinutes(),
    ss: date.getSeconds(),
    A: date.getHours() < 12 ? 'AM' : 'PM'
  }
  
  return format.replace(/(YYYY|MM|DD|HH|mm|ss|A)/g, (result) => {
    let value = formatObj[result]
    if (result === 'A') return value
    if (result === 'YYYY') return value.toString()
    if (value < 10) {
      value = '0' + value
    }
    return value || 0
  })
} 