// 导入所有模块的mock配置
import userMock from './modules/user.mock'
import goodsMock from './modules/goods.mock'
import cartMock from './modules/cart.mock'
import orderMock from './modules/order.mock'
import paymentMock from './modules/payment.mock'

// 合并所有mock配置
const mockModules = [
  ...userMock,
  ...goodsMock,
  ...cartMock,
  ...orderMock,
  ...paymentMock
]

// 同时支持开发环境和生产环境
export default mockModules 