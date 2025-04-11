import { createProdMockServer } from 'vite-plugin-mock/es/createProdMockServer'

// 导入所有mock配置
import mockModules from './index.js'

/**
 * 生产环境Mock服务器设置
 * 该函数将被vite.config.js中的injectCode选项调用
 */
export function setupProdMockServer() {
  // 创建生产环境Mock服务
  createProdMockServer([...mockModules])
  
  console.log('生产环境Mock服务已启用')
  console.log(`已加载 ${mockModules.length} 个Mock API`)
} 