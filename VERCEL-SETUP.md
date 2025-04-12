# 配置GitHub与Vercel自动部署指南

本文档提供了如何将项目从GitHub自动部署到Vercel的步骤，并确保部署的应用使用mock数据。

## 前提条件

1. 拥有一个GitHub账号
2. 拥有一个Vercel账号
3. 将项目代码提交到GitHub仓库

## 步骤1：连接Vercel与GitHub

1. 登录Vercel账号
2. 点击"New Project"
3. 选择"Import Git Repository"
4. 授权Vercel访问你的GitHub账号
5. 选择包含项目的GitHub仓库

## 步骤2：配置Vercel项目

1. 配置构建设置：
   - Framework Preset: Vue.js
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node.js Version: 16.x

2. 添加环境变量(可选，已在.env.production文件中配置)：
   - `VITE_API_BASE_URL`: `/mock`
   - `VITE_ENABLE_MOCK`: `true`

3. 点击"Deploy"开始部署

## 步骤3：配置GitHub Actions自动部署

要使用GitHub Actions自动部署到Vercel，需要在Vercel账户中获取以下信息：

1. Vercel API Token：
   - 前往Vercel设置页面 → Tokens
   - 创建一个新Token，记下其值

2. 获取Vercel Organization ID和Project ID：
   - 在Vercel项目设置页面 → General → Project ID
   - Organization ID可以在Account Settings中找到

3. 在GitHub仓库中添加以下Secrets：
   - `VERCEL_TOKEN`: 你的Vercel API Token
   - `VERCEL_ORG_ID`: 你的Organization ID
   - `VERCEL_PROJECT_ID`: 你的Project ID

设置好上述Secrets后，每次推送到main分支时，GitHub Actions都会自动触发部署流程。

## 确认部署是否使用mock数据

1. 访问已部署的网站
2. 打开浏览器开发者工具，查看网络请求
3. 确认API请求是否带有`/mock`前缀
4. 检查请求响应是否为mock数据

如需禁用mock数据，可修改`public/mock/config.json`文件中的`enableMock`值为`false`。 