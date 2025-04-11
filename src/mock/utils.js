/**
 * 从公共工具导入并重新导出格式化函数
 * 这样做是为了保持兼容性，避免破坏现有代码
 */
import { param2Obj, formatTime } from '../common/utils/format'

export { param2Obj, formatTime } 