/**
 * thu-epiphany 客户端配置
 *
 * ⚠️ 重要：本文件包含你的访问令牌。
 * 不要公开分享此文件或包含此文件的文件夹。
 *
 * 如需更换令牌，修改下面的 TOKEN 值即可。
 */

module.exports = {
  // API 服务端地址（域名就绪后取消下行注释，注释掉 fallback）
  // api_base: "https://api.你的域名.com",  // 域名就绪后启用

  // 本地开发/备用地址
  api_base: "http://localhost:18999",

  // 🎫 你的访问令牌
  token: "sk_fox_YOUR_TOKEN_HERE",

  // 你的默认显示名称（选填，提交时标记来源）
  default_from: "@你",
};
