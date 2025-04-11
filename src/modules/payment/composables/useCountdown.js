import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 倒计时hook
 * @param {number} duration - 倒计时总时长（秒）
 * @param {object} options - 配置选项
 * @param {Function} options.onEnd - 倒计时结束回调
 * @param {Function} options.onChange - 倒计时变化回调
 * @param {boolean} options.autoStart - 是否自动开始倒计时
 * @returns {object} - 倒计时状态和控制方法
 */
export function useCountdown(duration = 60, options = {}) {
  const { onEnd, onChange, autoStart = true } = options
  
  // 剩余时间（秒）
  const remainingTime = ref(duration)
  
  // 计时器引用
  let timer = null
  
  // 格式化后的分钟和秒数
  const minutes = ref('00')
  const seconds = ref('00')
  
  // 倒计时状态
  const isRunning = ref(false)
  const isFinished = ref(false)
  
  /**
   * 更新格式化的时间
   */
  const updateFormattedTime = () => {
    const mins = Math.floor(remainingTime.value / 60)
    const secs = remainingTime.value % 60
    
    minutes.value = mins < 10 ? `0${mins}` : `${mins}`
    seconds.value = secs < 10 ? `0${secs}` : `${secs}`
  }
  
  /**
   * 开始倒计时
   */
  const start = () => {
    if (isRunning.value || isFinished.value) return
    
    isRunning.value = true
    isFinished.value = false
    
    timer = setInterval(() => {
      remainingTime.value--
      
      updateFormattedTime()
      
      // 触发变化回调
      if (onChange) {
        onChange(remainingTime.value)
      }
      
      // 倒计时结束
      if (remainingTime.value <= 0) {
        stop()
        isFinished.value = true
        
        // 触发结束回调
        if (onEnd) {
          onEnd()
        }
      }
    }, 1000)
  }
  
  /**
   * 停止倒计时
   */
  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    isRunning.value = false
  }
  
  /**
   * 重置倒计时
   * @param {number} newDuration - 新的倒计时时长（秒）
   * @param {boolean} autoRestart - 是否自动重新开始
   */
  const reset = (newDuration = duration, autoRestart = false) => {
    stop()
    remainingTime.value = newDuration
    isFinished.value = false
    updateFormattedTime()
    
    if (autoRestart) {
      start()
    }
  }
  
  // 初始化格式化时间
  updateFormattedTime()
  
  // 组件挂载时自动开始倒计时
  onMounted(() => {
    if (autoStart) {
      start()
    }
  })
  
  // 组件卸载时清除定时器
  onUnmounted(() => {
    stop()
  })
  
  return {
    remainingTime,
    minutes,
    seconds,
    isRunning,
    isFinished,
    start,
    stop,
    reset
  }
} 