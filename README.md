# 电商平台项目

这是一个基于Vue 3 + Vite构建的电商平台前端项目，使用了Pinia进行状态管理，ElementPlus作为UI组件库。项目采用模拟数据进行开发和演示，无需后端API支持。

## 技术栈

- Vue 3
- Vite
- Pinia
- Vue Router
- ElementPlus
- Sass
- MockJS (模拟数据)

## 功能模块

- 用户认证（登录/注册）
- 商品浏览和搜索
- 商品详情
- 购物车
- 订单管理
- 支付流程
- 个人中心

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产环境构建与部署

```bash
# 构建项目
npm run build

# 预览构建结果
npm run preview
```

## 部署说明

1. 执行 `npm run build` 命令，生成的静态文件将位于 `dist` 目录
2. 将 `dist` 目录下的所有文件部署到任意静态文件服务器
3. 配置服务器的基本路径，如果不是部署在根目录，需要相应修改 `vite.config.js` 中的 `base` 配置

### Nginx配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
}
```

## 项目特点

- 完全使用模拟数据，无需后端API支持
- 响应式设计，适配各种屏幕尺寸
- 模块化结构，易于扩展和维护
- 使用最新的Vue 3生态系统
- 包含完整的电商流程演示

## 模拟数据说明

项目使用MockJS和vite-plugin-mock实现模拟数据功能，所有API请求均由前端拦截并返回模拟数据。生产环境下模拟数据同样有效，便于演示使用。

- 模拟数据文件位于 `src/mock` 目录下
- 在`vite.config.js`中配置了生产环境和开发环境的mock支持
- 主要模拟了用户、商品、购物车、订单、支付等相关接口 