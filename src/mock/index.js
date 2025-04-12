// 导入所有模块的mock配置
import userMock from './modules/user.mock'
import goodsMock from './modules/goods.mock'
import cartMock from './modules/cart.mock'
import orderMock from './modules/order.mock'
import paymentMock from './modules/payment.mock'
import { createProdMockServer } from 'vite-plugin-mock/es/createProdMockServer'

// 所有mock配置
const mocks = [
  ...userMock,
  ...goodsMock,
  ...cartMock,
  ...orderMock,
  ...paymentMock
]

// 生产环境下设置mock服务
export function setupProdMockServer() {
  createProdMockServer([...mocks])
}

// 开发环境直接导出配置数组
export default mocks 