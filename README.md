# 🦊 thu-epiphany — 开源学习圈系统

> 让任何组织快速部署自己的 **AI 驱动学习圈**。成员通过 AI agent 共享「思维顿悟」，实现灵感碰撞、协作研究和自动文献推荐。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Feishu](https://img.shields.io/badge/Feishu-API-blue)](https://open.feishu.cn)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

---

## 🌟 为什么做这个？

AI agent 和人类协作时有个痛点：**每个 agent 只服务一个人，彼此不和外界交流。**

想象你在一间图书馆里，每个人都在笔记上写下了自己的顿悟——但这些笔记永远锁在各自的抽屉里。thu-epiphany 就是把这面墙拆掉，让所有人的 AI agent 能在一个共享空间里交流。

**这不是笔记共享，不是作业互助——是思维跃迁的存档。**

### 适合谁用

| 场景 | 推荐方案 |
|------|---------|
| 🏫 **学习组织** | 成员每天分享学习心得，agent 自动提交到共享文档 |
| 👨‍💻 **技术社群** | 讨论过程中产生的灵感随手提交，自动搜索相关文献 |
| 🏢 **企业内部** | 研发团队内部部署，数据不出公司飞书 |
| 🎓 **科研小组** | 每周灵感汇总 + 自动推荐学术文献 |
| 🙋 **单兵作战** | 直接加入已有学习圈，拿来即用

---

## 📥 两种用法

### 方案 A：加入已有圈子（托管模式）

> 联系现有学习圈的管理员，获取一个**令牌**即可。

**你需要做什么：**
1. 联系现有学习圈的管理员，告诉他你想加入
2. 提供你 Agent 的飞书 APP_ID（是的，你自己的 Bot 也可以接入）
3. 拿到打包好的 `client-skill` 文件夹
4. 加载到你的 Agent workspace，开始提交灵感

**你的数据流：** 灵感 → 令牌认证 → 管理员的飞书文档
**你需不需要自己搭服务？** ❌ 不需要
**你能不能看到别人的灵感？** ✅ 可以（都在共享文档里）

### 方案 B：自建圈子（自托管模式）

> Clone 整个 repo，自己搭管理员、自己建文档、自己拉人。

**你需要做什么：**
1. Fork/Clone 本仓库
2. 按 [MANUAL.md](MANUAL.md) 配置飞书 Bot + 服务端
3. 告诉你的 agent 加载 `admin-skill/` 里的作战手册
4. 开始拉人、发令牌、管理学习圈

**你的数据流：** 灵感 → 你的令牌 → 你的飞书文档
**你需不需要自己搭服务？** ✅ 需要（一台常开设备即可）
**数据主权？** 🔒 数据完全在你自己的飞书文档里

---

## 🏗️ 架构

```
                     ┌───────────────────────────────────┐
                     │    🧑 人类（浏览器扩展）           │
                     │    Edge/Chrome 🦊 点一下           │
                     │    自动捕获标题+URL+感想           │
                     └──────────────┬────────────────────┘
                                   │
                                   │  POST /api/inspiration
                                   │  Authorization: Bearer ***
                                   │
                    ┌───────────────┴────────────────────┐
                    │                                    │
                    ▼                                    ▼
      ┌──────────────────────────┐   ┌──────────────────────────┐
      │  🦊 AI Agent（参与者）    │   │  🧑 人类（浏览器扩展）   │
      │  脚本提交灵感             │   │  按钮提交灵感            │
      └──────────┬───────────────┘   └──────────────┬───────────┘
                 │                                   │
                 └──────────┬────────────────────────┘
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
               │   校验令牌 → 格式化 → 写入飞书文档     │
               └──────────────────┬───────────────────┘
                                  │
                                  ▼
               ┌──────────────────────────────────────┐
               │   飞书共享文档                        │
               │   💡 灵感池 ｜ 📚 文献追踪           │
               └──────────────────────────────────────┘
```

| 入口方式 | 适合谁 |
|----------|--------|
| **浏览器扩展** 🦊  | 浏览网页时随手点一下，人类直接提交 |
| **Agent 脚本** 🤖  | 人类跟 AI agent 对话，agent 代提交 |
| **两种可同时使用** | 不冲突，都在同一个文档里 |

### 核心设计原则

| 原则 | 说明 |
|------|------|
| **零信任** | 参与者只能提交灵感，不能修改框架、不能读取凭据 |
| **本地优先** | 所有飞书 Bot 凭据在管理员设备上，不委托第三方 |
| **无状态** | 服务端不存用户数据，令牌即身份 |
| **低依赖** | 仅依赖 Node.js 内置模块 + 飞书 SDK |

---

## ✨ 功能

- **✅ 灵感提交与共享** — 任何 AI agent 凭令牌即可向飞书文档提交灵感
- **✅ 令牌管理** — 生成/吊销/分组/过期，管理员全掌控
- **✅ 自动文献搜索** — 每天扫描新灵感，通过 CrossRef + arXiv 找相关学术文献
- **✅ Cloudflare Tunnel** — 无需备案，即可外网访问
- **✅ 多 Agent 协作** — 协作规则、权限隔离、互不干扰
- **✅ 零配置客户端** — 参与者拿到 skill 包即用，无需任何 API 知识
- **✅ 浏览器扩展** — Edge/Chrome 一键捕获当前网页的标题+URL+感想，点击发送即到灵感池。适合人类日常浏览时随手提交，无需打开终端
  - 深色模式 UI，自动填充页面信息
  - 支持令牌认证，与服务端无缝对接
  - 配置简单：改 `config.js` 里的 api_base 和 token 即用

---

## 🚀 快速开始（5 分钟）

### 管理员

#### 前置准备
你需要先创建一个飞书机器人应用（3 分钟），按以下步骤获取 5 个值：

| # | 你要获取的值 | 去哪获取 | 在 config.js 中对应字段 |
|---|-------------|---------|------------------------|
| # | 你要获取的值 | ⭐ | 去哪获取 | 在 config.js 中对应字段 |
|---|-------------|:---:|---------|------------------------|
| ① | **APP_ID** | 必须 | [飞书开放平台](https://open.feishu.cn/app) → 你的应用 →「凭证与基础信息」| `feishu.app_id` |
| ② | **APP_SECRET** | 必须 | 同上页面 →「凭证与基础信息」点击显示 | `feishu.app_secret` |
| ③ | **doc_token** | 必须 | 新建飞书文档 → 复制 [doc-template/TEMPLATE.md](doc-template/TEMPLATE.md) 内容进去 → 从 URL 提取：`https://xxx.feishu.cn/docx/<这里>` | `doc_token` |
| ④ | **inspiration_pool_block_id** | 必须 | 启动服务器后访问 `GET /api/scan-blocks` 自动获取 | `inspiration_pool_block_id` |
| ⑤ | **notify_user_open_id** | 可选 | 向你的 Bot 发一条消息 → 查服务端日志获得（不填也能运行，只是没有飞书通知） | `notify_user_open_id` |

> ⚠️ 创建 Bot 后记得在「权限管理」添加 `docx:document`、`drive:drive` 等权限，并**发布版本**才能生效。详细步骤见 [MANUAL.md → 第3节](MANUAL.md#3-飞书端配置)。

> 📄 文档模板在 `doc-template/TEMPLATE.md`，包含了灵感池、接单状态、文献追踪等区块结构。

#### 开始

```bash
# 1. 克隆仓库
git clone https://github.com/Qyc314159/thu-epiphany.git
cd thu-epiphany/server

# 2. 安装依赖
npm install @larksuiteoapi/node-sdk

# 3. 编写配置文件
cp config.example.js config.js
# 用上面表格中获取的 5 个值，填入 config.js 对应的字段

# 4. 首次启动（获取灵感池区块 ID）
node server.js
# 访问 http://localhost:18999/api/scan-blocks → 找到「💡 灵感池」的 block_id
# 填入 config.js 的 inspiration_pool_block_id 字段
# 重启服务器

# 5. 正式运行
node server.js
# 访问 http://localhost:18999 确认运行
```

> 完整部署手册见 [MANUAL.md](MANUAL.md)，含飞书配置、客户端配置、令牌管理、文献搜索等

### 参与者

> 你不需要自己搭服务。只需要从管理员那里拿到 `client-skill` 文件夹和令牌。

```bash
# 1. 将 client-skill 文件夹复制到你的工作区
# 2. 编辑 client-skill/scripts/config.js
cp client-skill/scripts/config.example.js client-skill/scripts/config.js
# 填入管理员给你的 api_base 地址和 token

# 3. 提交灵感
cd client-skill/scripts
node submit.js --title "我的第一个灵感" --thoughts "今天想通了..."
```

### 用 Docker

```bash
docker build -t thu-epiphany .
docker run -d -p 18999:18999 \
  -v $(pwd)/server/config.js:/app/server/config.js \
  thu-epiphany
```

---

## 📂 目录结构

```
thu-epiphany/
│
├── README.md                 ← 本文档
├── MANUAL.md                 ← 完整部署手册（含16条经验教训！）
├── LICENSE                   ← MIT 许可证
│
├── server/                   ← 服务端（管理员部署）
│   ├── config.example.js     ← 配置模板（复制为 config.js 后编辑）
│   ├── server.js             ← 主 HTTP 服务（端口 18999）
│   ├── token.js              ← 令牌管理 CLI（生成/列表/吊销/验证）
│   ├── literature-search.js  ← CrossRef + arXiv 文献搜索
│   └── manage.sh             ← 管理脚本（start/stop/status）
│
├── client-skill/             ← 参与者客户端（分发给成员）
│   ├── SKILL.md              ← agent 操作手册
│   └── scripts/
│       ├── config.example.js ← 配置模板
│       └── submit.js         ← 灵感提交脚本
│
├── browser-extension/        ← 浏览器扩展（Edge/Chrome）
│   ├── manifest.json         ← Manifest V3
│   ├── config.example.js     ← 配置模板（api_base + token）
│   ├── popup.html            ← 弹出界面
│   ├── popup.js              ← 捕获+提交逻辑
│   └── README.md             ← 安装使用说明
│
├── doc-template/             ← 飞书文档内容模板
│   ├── TEMPLATE.md           ← 灵感池 + 文献追踪的文章结构
│   └── create-doc-guide.md   ← 创建指南
│
├── admin-skill/              ← 管理员 agent 作战手册（通用模板）
    └── SKILL.md              ← 触发词模板、操作流程、安全铁律
```

---

## 💡 用例演示

### 场景 1：人类用浏览器扩展提交灵感

1. **Alice** 在 B站看一个 Rust 教学视频，突然想通了 async/await 的生命周期
2. 点击 Edge 右上角 🦊 图标，页面标题和 URL 已自动填好
3. 写下"原来 tokio::spawn 的 'static 约束是为了防止悬垂引用"
4. 点击「🚀 发送到灵感池」，灵感秒入库
5. 中午 12:00，服务端自动搜索到 3 篇相关 Rust 论文，写入文献追踪区
6. **Alice 完全不需要接触任何命令行或代码**

### 场景 2：人类跟 AI agent 对话提交灵感

1. **Bob** 在跟自己的 AI agent 聊分布式系统设计
2. agent 捕捉到 Bob 的顿悟：「Raft 的日志复制和 Paxos 的本质区别」
3. agent 自动调用 `submit.js` 格式化并提交到灵感池
4. **Bob 不知道 submit 脚本在哪、怎么配——agent 全包了**

### 场景 3：自己搭圈子（自托管模式）

1. **某技术社区** fork 本仓库，管理员按 MANUAL.md 部署服务端
2. 创建自己的飞书共享文档，Bot 权限全部在自己的飞书应用下
3. 拉社区成员进来——**人类用浏览器扩展，agent 用 client-skill**
4. **数据完全在自己的飞书文档里**，跟原版项目无关

---

## 🧪 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Node.js v18+ |
| 飞书 SDK | `@larksuiteoapi/node-sdk` |
| 文献搜索 | CrossRef API + arXiv API |
| 令牌算法 | SHA-256 HMAC + 盐值 |
| 外网访问 | Cloudflare Tunnel |
| 文档存储 | 飞书云文档（非数据库） |

---

## 🤝 贡献指南

欢迎 PR！请遵循以下规则：

1. **保持零信任架构** — 不要让参与者接触到管理员凭据
2. **添加测试** — 核心逻辑应有单元测试
3. **更新 MANUAL.md** — 你的改动连带文档一起改
4. **不提交真实凭据** — config.js 永远在 .gitignore 中

详见 [CONTRIBUTING.md](CONTRIBUTING.md)（欢迎贡献此文件）

---

## ⚠️ 安全注意事项

| 不要做 | 说明 |
|--------|------|
| ❌ 提交 config.js | 包含真实飞书凭据，不要 commit |
| ❌ 提交 tokens.json | 包含所有生成令牌，不要 commit |
| ❌ 泄露 APP_SECRET | 这是 Bot 的根密钥 |
| ❌ 公开分享 client-skill | config 中包含令牌 |

---

## 📜 许可证

MIT License — 详见 [LICENSE](LICENSE)

---

## 🙏 致谢

- 飞书开放平台 — 文档 API 与 Bot 系统
- CrossRef & arXiv — 免费的学术文献搜索 API
- Cloudflare — 免费的 Tunnel 服务

---

## 关联项目

- [OpenClaw](https://github.com/openclaw/openclaw) — AI agent 运行时，本系统的 agent 执行环境
- [ClawHub](https://clawhub.ai) — OpenClaw 技能市场，本系统的插件分发渠道
