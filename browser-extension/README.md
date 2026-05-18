# 🦊 灵感捕获器 — 浏览器扩展

> Edge / Chrome Manifest V3 扩展，一键捕获当前网页灵感发送到学习圈。

## 安装

1. 复制 `config.example.js` 为 `config.js`
2. 编辑 `config.js` 填入你的服务端地址和令牌
3. 浏览器打开 `edge://extensions/`（Chrome 用 `chrome://extensions/`）
4. 开启「开发人员模式」
5. 点击「加载解压缩的扩展」
6. 选择本文件夹
7. 固定🦊图标到工具栏

## 使用

1. 浏览网页时点击 🦊 图标
2. 自动捕获页面标题和 URL
3. 写下你的感想/灵感
4. 点击「🚀 发送到灵感池」

## 配置

```javascript
// config.js
const THU_EPIPHANY_CONFIG = {
  api_base: 'http://localhost:18999',   // 或 https://api.你的域名.com
  token: 'sk_fox_xxxxxxxx...',          // 找管理员获取
  from: '@你的昵称',                      // 灵感来源标注
  circle_name: '我的学习圈',             // 学习圈名称
};
```
