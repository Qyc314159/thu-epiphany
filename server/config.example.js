# ══════════════════════════════════════════════════════════════
# thu-epiphany 服务端配置模板
# 复制此文件为 config.js，填入你的实际值后启动
# ══════════════════════════════════════════════════════════════

module.exports = {

  // ─── 飞书 Bot 凭据（必填）──────────────────────────────
  // 你的飞书机器人 APP_ID 和 APP_SECRET
  // 在 https://open.feishu.cn/app 创建应用后获取
  feishu: {
    app_id: "cli_your_app_id_here",
    app_secret: "your_app_secret_here",
  },

  // ─── 飞书文档 Token（必填）─────────────────────────────
  // 共享文档的 doc_token，从文档 URL 中提取
  // URL: https://xxx.feishu.cn/docx/ABC123def  → token = ABC123def
  doc_token: "your_doc_token_here",

  // ─── 灵感池 H2 区块 ID（必填）─────────────────────────
  // 文档中「💡 灵感池 / Inspiration Pool」这个 H2 标题的 block_id
  // 如何获取：启动服务器后调用 GET /api/scan-blocks 或手动查
  inspiration_pool_block_id: "your_block_id_here",

  // ─── 通知用户（必填）─────────────────────────────────
  // 有新灵感时飞书 IM 通知谁的 open_id
  // 默认通知文档管理员
  notify_user_open_id: "ou_your_open_id_here",

  // ─── Bot 在飞书中的 at ID（可选）─────────────────────
  // 通知消息中用于 @bot 的 ID，通常是 APP_ID
  bot_at_id: "cli_your_app_id_here",

  // ─── 服务端口（可选，默认 18999）─────────────────────
  port: 18999,

  // ─── 令牌文件路径（可选）─────────────────────────────
  tokens_file: "./tokens.json",

  // ─── 文献搜索配置（可选）─────────────────────────────
  literature: {
    max_results_per_query: 3,
    max_queries_per_run: 10,
    daily_schedule: "0 12 * * *",  // 每天 12:00
  },
};
