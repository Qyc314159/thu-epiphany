# thu-epiphany 学习圈系统 — 部署使用手册

> 版本 1.0 | 最后更新 2026-05-17
>
> 让任何组织都能部署自己的 AI 驱动学习圈，实现灵感共享、协作研究、文献推荐。

---

## 目录

1. [架构概述](#1-架构概述)
2. [前置准备](#2-前置准备)
3. [飞书端配置](#3-飞书端配置)
4. [服务端部署](#4-服务端部署)
5. [客户端配置](#5-客户端配置)
6. [令牌管理](#6-令牌管理)
7. [文献搜索系统](#7-文献搜索系统)
8. [域名与外网访问](#8-域名与外网访问)
9. [维护指南](#9-维护指南)
10. [常见故障排查](#10-常见故障排查)
11. [经验教训 🎯](#11-经验教训)

---

## 1. 架构概述

```
                    ┌──────────────────────────────────────┐
                    │          外部 Agent（参与者）         │
                    │  仅持有令牌，无需飞书凭据             │
                    └──────────────┬───────────────────────┘
                                   │
                            POST /api/inspiration
                          Authorization: Bearer ***
                                   │
                                   ▼
                    ┌──────────────────────────────────────┐
                    │   Cloudflare Tunnel（可选）           │
                    │   域名 → localhost                    │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │   🦊 学习圈服务端（管理员设备上）      │
                    │   Node.js HTTP 服务                   │
                    │                                     │
                    │   1. 校验令牌                         │
                    │   2. 格式化灵感                       │
                    │   3. 写入飞书文档                     │
                    │   4. 通知管理员                       │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │   飞书共享文档                        │
                    │   💡 灵感池 / 📚 文献追踪           │
                    └──────────────────────────────────────┘
```

### 核心设计原则

| 原则 | 说明 |
|------|------|
| **零信任** | 参与者的令牌只能提交灵感，不能修改框架、不能读取凭据 |
| **本地优先** | 所有飞书 Bot 凭据在管理员设备上，不委托给任何第三方 |
| **无状态** | 服务端不存用户数据，令牌即身份 |
| **低依赖** | 仅依赖 Node.js 内置模块 + 飞书 SDK |

---

## 2. 前置准备

### 硬件要求

| 项目 | 要求 |
|------|------|
| 操作系统 | macOS / Linux / Windows（需 Node.js） |
| 运行设备 | 一台常开或可计划开机的电脑（服务端） |
| 网络 | 能访问飞书 API + 能启动 HTTP 服务 |

### 软件要求

- Node.js v18+
- 飞书账号（管理员 + 参与者）
- （可选）域名 + Cloudflare 账号（用于外网访问）

---

## 3. 飞书端配置

### 3.1 创建飞书 Bot 应用

1. 打开 [飞书开放平台](https://open.feishu.cn/app)
2. 点击「创建应用」→ 输入名称 → 创建
3. 在「权限管理」添加以下权限：
   - `docx:document` — 读写文档
   - `docx:document:readonly` — 查看文档
   - `docx:document.block:convert` — 文档块转换
   - `drive:drive` — 云空间全量访问
   - `im:message` — 发送消息通知
4. 在「安全设置」配置 IP 白名单（可选）
5. **发布版本**让权限生效（重要！）

### 3.2 创建共享文档

1. 新建飞书文档
2. 使用 `doc-template/TEMPLATE.md` 的内容填充文档
3. 将你的 Bot 添加为文档协作者（编辑权限）
4. 从 URL 中提取 `doc_token`

### 3.3 获取必要 ID

| ID | 获取方式 |
|----|---------|
| APP_ID | 飞书开放平台 → 应用凭证 |
| APP_SECRET | 飞书开放平台 → 应用凭证 |
| DOC_TOKEN | 文档 URL 中提取 |
| USER_OPEN_ID | 向 Bot 发消息，通过事件回调获取（或查飞书管理后台） |

> **⚠️ 经验教训：** APP_SECRET 是 Bot 的根密钥。永远不要发给任何人，包括参与学习圈的成员。

---

## 4. 服务端部署

### 4.1 安装

```bash
# 1. 复制产品文件夹到目标机器
cp -r thu-epiphany-product /path/to/your/deploy/
cd /path/to/your/deploy/server

# 2. 安装依赖
npm install @larksuiteoapi/node-sdk

# 3. 创建配置文件
cp config.example.js config.js
# 编辑 config.js 填入你的实际值
```

### 4.2 配置

编辑 `server/config.js`，填入从飞书获取的信息：

```javascript
module.exports = {
  feishu: {
    app_id: "cli_xxxxxxxxxxxxxxxxxx",
    app_secret: "xxxxxxxxxxxxxxxxxxxxxxxx",
  },
  doc_token: "xxxxxxxxxxxxxxxxxxxxxxxx",
  inspiration_pool_block_id: "doxcnxxxxxxxxxxxxxxxxxxxx",
  notify_user_open_id: "ou_xxxxxxxxxxxxxxxxxxxxxxxxx",
  bot_at_id: "cli_xxxxxxxxxxxxxxxxxx",
  port: 18999,
};
```

> **⚠️ 经验教训：** `inspiration_pool_block_id` 的获取是新手最容易卡住的地方。文档中 H2 标题的 block_id 无法直接从 URL 获得，需要调用 API 扫描。启动服务器后访问 `GET /api/scan-blocks` 即可列出所有 H2 区块。

### 4.3 启动

```bash
# 直接启动
node server.js

# 或使用管理脚本
bash manage.sh start

# 其他命令
bash manage.sh stop     # 停止
bash manage.sh status   # 查看状态
bash manage.sh restart  # 重启
```

启动后访问 `http://localhost:18999/` 确认欢迎页正常显示。

### 4.4 验证

```bash
# 检查健康状态
curl http://localhost:18999/api/health

# 提交测试灵感
curl -X POST http://localhost:18999/api/inspiration \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer sk_fox_dev_local' \
  -d '{"title":"测试","thoughts":"这是测试灵感"}'
```

---

## 5. 客户端配置

### 5.1 生成令牌

```bash
cd server
node token.js generate "你的学习圈名称" "给新成员"
# → sk_fox_xxxxxxxx...  将此令牌发给新成员
```

### 5.2 编辑客户端配置

发给新成员的 `client-skill/scripts/config.js`：

```javascript
module.exports = {
  api_base: "http://管理员IP:18999",  // 或 https://api.域名.com
  token: "sk_fox_xxxxxxxx...",         // 管理员给的令牌
  default_from: "@你的用户名",         // 你自己改
};
```

### 5.3 新成员操作

1. 将 `client-skill` 文件夹复制到自己的 OpenClaw workspace
2. 编辑 `config.js` 填入令牌和用户名
3. 让 agent 阅读 `SKILL.md` 内化规则
4. 开始提交灵感：

```bash
node scripts/submit.js \
  --title "Rust async" \
  --thoughts "今天搞懂了 Send bound..."
```

---

## 6. 令牌管理

### 6.1 基本命令

```bash
# 生成新令牌
node token.js generate "组名" "备注"

# 列出所有令牌
node token.js list

# 吊销令牌
node token.js revoke sk_fox_xxxx...

# 验证令牌
node token.js validate sk_fox_xxxx...
```

### 6.2 令牌安全策略

| 策略 | 说明 |
|------|------|
| **最小权限** | 令牌只能提交灵感，不能读取/修改/删除 |
| **可吊销** | 成员退出或令牌泄露，随时吊销 |
| **分组隔离** | 不同圈子用不同令牌，互不影响 |
| **不暴露凭据** | 持令牌者永远拿不到管理员 Bot 的 APP_SECRET |

### 6.3 令牌生命周期

```
生成 → 分发（私信发给成员）→ 使用 → 吊销（成员退出时）
```

> **⚠️ 经验教训：** 令牌只在生成时显示一次。务必让接收者立即保存。如果丢失，只能重新生成。

---

## 7. 文献搜索系统

### 7.1 功能

每天定时扫描灵感池中的新灵感，通过 CrossRef + arXiv API 搜索相关学术文献，将结果保存到本地。

### 7.2 配置

在 `config.js` 中配置：

```javascript
literature: {
  max_results_per_query: 3,     // 每条灵感搜索篇数
  max_queries_per_run: 10,      // 每次运行最多处理条数
  daily_schedule: "0 12 * * *", // Cron 表达式（每天12:00）
}
```

### 7.3 手动运行

```bash
node literature-search.js           # 增量扫描
node literature-search.js --force   # 强制全部重新扫描
node literature-search.js --dry-run # 仅查看，不搜索
```

### 7.4 API 说明

| API | 覆盖范围 | 费用 | 使用限制 |
|-----|---------|------|---------|
| CrossRef | 全球学术期刊，1.5 亿+ | 免费 | 无认证限制 |
| arXiv | CS/数学/物理预印本 | 免费 | 无认证限制 |

> **⚠️ 经验教训：** 对于编程/技术类主题，学术论文可能不够直接相关。CrossRef 搜索中文关键词时，同音词可能导致不相关结果（如搜索「异步」会匹配到「异步电动机」）。建议在关键词中加入英文技术术语。

---

## 8. 域名与外网访问

### 8.1 为什么要域名

默认服务只能在管理员本机访问（`localhost:18999`）。要让外部成员提交灵感，需要：

```
外部成员 → 域名 → Cloudflare Tunnel → localhost:18999
```

### 8.2 步骤

1. **买域名**（如阿里云、Namesilo、Cloudflare）
2. **DNS 托管到 Cloudflare**（免费）
   - 注册 [Cloudflare.com](https://cloudflare.com)
   - 添加域名 → 改 NS 记录到 Cloudflare
   - 等待 DNS 传播（1-24 小时）

3. **安装 Cloudflare Tunnel**

```bash
# macOS
brew install cloudflared

# 登录
cloudflared tunnel login

# 创建隧道
cloudflared tunnel create learning-circle

# 路由 DNS
cloudflared tunnel route dns learning-circle api.你的域名.com

# 创建配置文件 ~/.cloudflared/config.yml
# tunnel: <tunnel-id>
# credentials-file: /path/to/credentials.json
# ingress:
#   - hostname: api.你的域名.com
#     service: http://localhost:18999
#   - service: http_status:404

# 启动
cloudflared tunnel run learning-circle
```

4. **更新客户端配置**
```javascript
// config.js
api_base: "https://api.你的域名.com",
```

> **⚠️ 经验教训：** 
> - 如果你在中国内地，用 Cloudflare Tunnel 不需要 ICP 备案（服务器不在中国内地）
> - 如果使用 Clash 等代理，TUN 模式可能导致 Tunnel 连接失败。关闭 TUN 或配置绕过规则
> - Tunnel 免费版不限流量，适合此场景

---

## 9. 维护指南

### 每日维护

```bash
# 检查服务状态
bash manage.sh status

# 查看日志
tail -f /tmp/inspiration-server.log
```

### 成员管理

```bash
# 新成员加入
node token.js generate "学习圈名" "给 Alice"
# → 生成令牌 → 修改 client-skill/config.js → 发给对方

# 成员退出
node token.js revoke sk_fox_xxx...
```

### 数据安全

| 操作 | 命令 |
|------|------|
| 备份令牌数据库 | `cp tokens.json tokens.json.bak` |
| 恢复令牌数据库 | `cp tokens.json.bak tokens.json` |
| 重置状态（文献扫描） | `rm -f data/literature-state.json` |

---

## 10. 常见故障排查

### 10.1 服务端启动失败

| 现象 | 原因 | 解决 |
|------|------|------|
| `Cannot find module '@larksuiteoapi/node-sdk'` | 依赖未安装 | `npm install @larksuiteoapi/node-sdk` |
| `凭据文件中缺少 APP_ID` | config.js 未正确配置 | 检查 config.js 中的 feishu 配置 |
| `EADDRINUSE` | 端口被占用 | 改 port 或 `kill` 占用进程 |

### 10.2 飞书写入失败

| 错误码 | 原因 | 解决 |
|--------|------|------|
| 1770001 | 参数错误 | 检查 block_id 是否正确，确认文档存在 |
| 1770002 | 无权限 | Bot 未被添加为文档协作者，或权限未发布 |
| 99991663 | 频率限制 | 每秒最多 3 次请求，加延迟 |

### 10.3 令牌相关问题

| 现象 | 原因 | 解决 |
|------|------|------|
| 返回 401 | 令牌无效/已吊销 | `node token.js list` 检查状态 |
| `TOKEN_NOT_FOUND` | 令牌不存在 | 检查 tokens.json 文件是否存在 |
| `TOKEN_REVOKED` | 令牌已吊销 | 生成新令牌 |

### 10.4 文献搜索问题

| 现象 | 原因 | 解决 |
|------|------|------|
| 搜索结果不相关 | 关键词提取不准确 | 改进灵感标题，增加具体技术术语 |
| arXiv 超时 | 网络问题 | 检查代理配置，或关闭 TUN 模式 |
| 无结果 | 无新灵感 | 正常现象，有新增灵感才会搜索 |

---

## 11. 经验教训 🎯

> 以下是在真实部署中积累的经验。**建议所有新部署者先读一遍。**

### 11.1 飞书 API 踩坑

| 教训 | 详情 |
|------|------|
| **Divider 不可创建** | 飞书 API 的 `documentBlockChildren.create` 不支持创建 divider（分隔线）块。尝试创建会返回 400 错误。解决方案：不使用分隔线 |
| **索引参数** | `index` 参数在新版 SDK 中可能导致 400 错误。省略 `index` 即可默认追加到末尾 |
| **权限必须发布** | 添加权限后需要「发布版本」才能生效，否则 API 调用会返回 无权限 |
| **频率限制 3 QPS** | 飞书文档 API 每秒最多 3 次请求。批量操作需要加延迟 |

### 11.2 网络与代理

| 教训 | 详情 |
|------|------|
| **Clash TUN 冲突** | TUN 模式 + Docker 容器 HTTPS = SSL 握手失败。关闭 TUN 或配置代理绕过 |
| **Docker 内 HTTPS** | 容器内出站需配 `http://host.docker.internal:7899` 代理（当 TUN 关闭时） |
| **Cloudflare Tunnel 稳定** | Tunnel 免费版不限流量，比 ngrok 更稳定，适合长期运行 |

### 11.3 关键词搜索

| 教训 | 详情 |
|------|------|
| **用户名污染关键词** | 标题中的 `@用户名` 和 emoji 会污染搜索关键词。已在代码中过滤，但提交者 agent 尽量使用简洁标题 |
| **中文同音词问题** | CrossRef 搜索中文时，同音词会导致不相关结果。建议在灵感关键词中加入英文术语 |
| **arXiv 更适合 CS** | 编程技术类主题建议用 arXiv（预印本），CrossRef 更适合传统学术出版物 |

### 11.4 安全

| 教训 | 详情 |
|------|------|
| **令牌文件权限** | tokens.json 必须设为 600（仅 owner 可读写），防止其他进程读取 |
| **.env 文件安全** | 凭据文件同样设 600 权限，不要版本控制 |
| **令牌不可逆** | 令牌只在生成时显示一次。确认对方已保存后再关闭 |
| **APP_SECRET 永不出设备** | 外部成员只需 APP_ID + 令牌，永远不需要拿到管理员 Bot 的 APP_SECRET |

### 11.5 日常运营

| 教训 | 详情 |
|------|------|
| **服务端需要常开** | 成员提交灵感依赖服务端在线。建议部署在常开设备或低配云服务器 |
| **cron 任务依赖环境** | 文献扫描的 cron 任务需要服务端运行在正确的时区（建议 Asia/Shanghai） |
| **备份令牌数据库** | tokens.json 虽小但极重要。备份到安全位置。丢失后所有令牌作废 |

---

## 附录 A：文件清单

```
thu-epiphany-product/
│
├── README.md                    ← 项目简介
├── MANUAL.md                    ← 本文档
│
├── server/                      ← 服务端（管理员部署）
│   ├── config.example.js        ← 配置模板（复制为 config.js）
│   ├── server.js                ← 主服务
│   ├── token.js                 ← 令牌管理 CLI
│   ├── literature-search.js     ← 文献搜索
│   ├── manage.sh                ← 管理脚本
│   └── data/                    ← 运行时数据（自动创建）
│       ├── inspirations.jsonl
│       ├── literature-state.json
│       └── literature-results.jsonl
│
├── client-skill/                ← 客户端（发给参与者）
│   ├── SKILL.md                 ← 操作手册
│   └── scripts/
│       ├── config.example.js    ← 配置模板（填入令牌后使用）
│       └── submit.js            ← 提交脚本
│
└── doc-template/                ← 文档模板
    ├── TEMPLATE.md              ← 飞书文档内容模板
    └── create-doc-guide.md      ← 创建指南
```

## 附录 B：快速启动（5 分钟上手）

```
1. 飞书创建 Bot → 添加权限 → 发布          (3 min)
2. 创建飞书文档 → 粘贴 TEMPLATE.md          (1 min)
3. 复制 config.example.js → 填入凭据        (1 min)
4. node server.js → 访问 localhost:18999    (10 sec)
5. token.js generate → 发给朋友 → 对方提交  (30 sec)
```
