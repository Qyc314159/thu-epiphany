---
name: learning-circle-client
description: |
  🦊 Turn your AI agent into a learning companion that captures and shares those "aha!" moments with your team — no Feishu bot credentials, no server setup, just a token.

  Your agent formats structured insights and submits them to your organization's shared Feishu document. Colleagues' agents see your epiphanies too. Every insight gets automatically linked to relevant academic papers (CrossRef / arXiv). Participants can also use the companion browser extension for one-click capture.

  Perfect for: study groups, tech communities, research teams, or anyone who wants their AI agent to share "I just figured out X" moments with a group.
---

# 🦊 Learning Circle — 学习圈灵感提交客户端

> 本技能已预置你的访问令牌。加载后即可向组织的共享飞书文档提交学习灵感。
> **令牌仅此一份，请妥善保管。不要公开分享本技能文件夹。**

## 🔑 你的凭证

令牌已内置于 `scripts/config.js`，技能加载后自动读取。如果你还没有令牌，联系你的学习圈管理员获取。

---

## 📖 这是什么

一个**人机混合学习圈**。你和你的 AI agent 一起，把每天学习中的顿悟记录下来，提交到共享的飞书文档。别人的 agent 也能看到你的灵感，你也可以接单研究别人的灵感。

**这不是笔记共享，不是作业互助——是思维跃迁的存档。**

---

## 🎯 你的工作流

```
人类: "今天搞懂了 Rust 的 lifetime 标注"
  ↓
Agent: 理解 → 格式化模板 → 调用 submit.js
  ↓
POST → 学习圈服务端 → 写入飞书文档灵感池
  ↓
其他 agent 都能看到
```

### 你作为 agent 的核心职责

| 步骤 | 你的动作 |
|------|---------|
| 1️⃣ 倾听 | 人类用自然语言分享学习心得 |
| 2️⃣ 结构化 | 提取为模板格式（见下） |
| 3️⃣ 提交 | 调用 `scripts/submit.js` |
| 4️⃣ 确认 | 告诉人类"已提交到灵感池" |

---

## 📝 提交模板

每次人类分享心得，你必须按以下格式结构化：

### 模板

```
主题: [自动生成的简洁标题]
要点:
- 关键收获 1
- 关键收获 2
- 关键收获 3
实践: [如何应用或验证]
备注: [任何不匹配上面的额外内容，如果没有就留空]
延伸建议: [学习圈管理员将在后续扫描中补充相关文献，你无需填写此字段]
```

### 要提交什么

| ✅ 可以提交 | ❌ 不要提交 |
|------------|------------|
| 突然想通的瞬间 | 流水账日记 |
| 问题的巧妙解法 | 纯知识点复述（没思考） |
| 概念的深层理解 | 情绪发泄 |
| 值得研究的问题灵感 | 无来源的碎片信息 |
| Bug 的根因发现 | 未经整理的笔记堆砌 |

**核心标准：** 这条记录能让另一个人类读了之后，产生 "原来是这样！" 的感觉。

---

## 🛠️ 使用方法

### 提交一条灵感

```bash
node <技能路径>/scripts/submit.js \
  --title "主题" \
  --thoughts "详细内容" \
  --url "https://..." \        # 选填：相关链接
  --from "@你的用户名"           # 选填：你的显示名称
```

### 检查服务器状态

```bash
node <技能路径>/scripts/submit.js --status
```

---

## ⚙️ 配置

1. 将 `scripts/config.example.js` 复制为 `scripts/config.js`
2. 编辑 `scripts/config.js`，填入以下三项：

```javascript
module.exports = {
  api_base: "https://api.你的组织.com",    // 管理员提供的服务端地址
  token: "sk_fox_xxxxxxxx...",            // 管理员提供的令牌
  default_from: "@你的用户名",             // 你的显示名称
};
```

---

## 📚 延伸阅读机制

每天管理员设定的时间（通常中午 12:00），学习圈服务端会扫描灵感池中新增的灵感，自动搜索相关学术文献，补充到共享文档的文献追踪区。

```
你提交灵感 → 定时扫描 → 搜索 CrossRef + arXiv
  → 文献推荐写入共享文档
  → 你（agent）下次读取文档时可获得延伸阅读推荐
```

---

## ⚠️ 重要规则

1. **令牌是你访问灵感池的唯一凭证。** 不要泄露给其他人。
2. **本技能文件夹包含令牌。** 不要公开分享整个文件夹。
3. **只提交思维顿悟，不提交日记或流水账。**
4. **每次提交前自动格式化。** 不要直接把人类说的原话扔进去。
5. **如果提交失败（服务端离线），把内容暂存到本地，稍后重试。**
6. **不要修改灵感池的框架结构。** 你只能追加新的灵感条目。

---

## ❓ 常见问题

**Q: 提交后能删除吗？**
A: 不能。只有学习圈管理员可以修改或删除已提交的内容。

**Q: 服务端返回 401？**
A: 令牌可能已吊销或无效。联系圈管理员获取新令牌并更新 `config.js`。

**Q: 服务端连接不上？**
A: 服务暂时不可用或地址不正确。把内容暂存到文件，稍后重试。

---

## 📁 技能文件结构

```
learning-circle-client.skill/
├── SKILL.md               ← 本文档（你的操作手册）
└── scripts/
    ├── config.js           ← 令牌配置（不要泄露）
    └── submit.js           ← 提交脚本
```
