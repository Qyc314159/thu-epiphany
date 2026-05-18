#!/usr/bin/env node
/**
 * thu-epiphany-server — 灵感捕获与令牌验证服务 v3
 *
 * 监听端口 18999，提供 REST API：
 *   POST /api/inspiration   提交灵感（需令牌验证）
 *   POST /api/flush         将缓冲写入飞书文档
 *   GET  /api/health        健康检查
 *   GET  /api/status        状态概览
 *
 * 令牌验证：读取 tokens.json，Bearer Token 鉴权。
 * 飞书写入：用 Bot 凭据直接 patch 到亢慕义斋文档的灵感池区块。
 *
 * 用法:
 *   node scripts/thu-epiphany-server.js              # 默认端口 18999
 *   node scripts/thu-epiphany-server.js --port 18999
 *   node scripts/thu-epiphany-server.js --flush      # 立即flush并退出
 *
 * 测试:
 *   curl -X POST http://localhost:18999/api/inspiration \
 *     -H 'Content-Type: application/json' \
 *     -H 'Authorization: Bearer sk_fox_...' \
 *     -d '{"url":"https://example.com","title":"示例","thoughts":"这个思路不错"}'
 */

const path = require('path');
const http = require('http');
const fs = require('fs');

const NODE_PATH = path.join(__dirname, 'node_modules');
const lark = require(path.join(NODE_PATH, '@larksuiteoapi/node-sdk'));
const { APP_ID, APP_SECRET, DOC_TOKEN } = require(
  path.join(process.env.HOME, '.openclaw/scripts/credentials')
);

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------
const PORT = parseInt(
  (process.argv.find(a => a.startsWith('--port=')) || '--port=18999').replace('--port=', ''), 10
);
const USER_OPEN_ID = CONFIG.notify_user_open_id || '';
const INSPIRATION_POOL_H2 = CONFIG.inspiration_pool_block_id; // 灵感池 H2 block_id

const DATA_DIR = path.join(__dirname, '..', 'data');
const INSPIRATIONS_FILE = path.join(DATA_DIR, 'inspirations.jsonl');
const TOKENS_FILE = path.join(__dirname, '..', 'tokens.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// 飞书客户端
// ---------------------------------------------------------------------------
const client = new lark.Client({
  appId: APP_ID,
  appSecret: APP_SECRET,
  disableTokenCache: false,
});

// ---------------------------------------------------------------------------
// 令牌管理
// ---------------------------------------------------------------------------
function loadTokens() {
  if (!fs.existsSync(TOKENS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  } catch { return {}; }
}

function validateToken(token) {
  if (!token) return { valid: false, reason: 'NO_TOKEN' };
  // Strip "Bearer " prefix if present
  const clean = token.startsWith('Bearer ') ? token.slice(7) : token;
  const tokens = loadTokens();
  const entry = tokens[clean];
  if (!entry) return { valid: false, reason: 'TOKEN_NOT_FOUND' };
  if (!entry.active) return { valid: false, reason: 'TOKEN_REVOKED' };
  return { valid: true, group: entry.group };
}

// ---------------------------------------------------------------------------
// 本地缓冲
// ---------------------------------------------------------------------------
function appendToLocalFile(entry) {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(INSPIRATIONS_FILE, line, 'utf8');
}

function readInspirations() {
  if (!fs.existsSync(INSPIRATIONS_FILE)) return [];
  const content = fs.readFileSync(INSPIRATIONS_FILE, 'utf8').trim();
  if (!content) return [];
  return content.split('\n')
    .filter(line => line.trim())
    .map((line, i) => {
      try { return { ...JSON.parse(line), _index: i }; }
      catch { return null; }
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// 飞书文档操作 - 在灵感池 H2 下追加新的灵感块
// ---------------------------------------------------------------------------
async function appendInspirationToDoc(entry) {
  const title = entry.title || '未命名灵感';
  const thoughts = entry.thoughts || '';
  const url = entry.url || '';
  const from = entry.from || '@外部贡献者';
  const ts = new Date(entry.timestamp || Date.now());
  const dateStr = ts.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  // 构造要插入的块序列
  // block_type: 5 = heading3, 2 = text, 15 = divider
  const blocks = [
    // 灵感标题 (H3)
    {
      block_type: 5,
      heading3: {
        elements: [
          { text_run: { content: `📌 ${from}：${title}` } }
        ]
      }
    },
    // url
    {
      block_type: 2,
      text: {
        elements: [
          { text_run: { content: `🔗 ` } },
          { text_run: { content: url, text_element_style: { link: { url: url } } } }
        ]
      }
    },
    // timestamp
    {
      block_type: 2,
      text: {
        elements: [
          { text_run: { content: `🕐 投稿时间: ${dateStr}` } }
        ]
      }
    },
  ];

  // 如果有 thoughts 内容，加上文本块
  if (thoughts) {
    blocks.push({
      block_type: 2,
      text: {
        elements: [
          { text_run: { content: `📝 ${thoughts}` } }
        ]
      }
    });
  }

  try {
    const resp = await client.docx.documentBlockChildren.create({
      path: {
        document_id: DOC_TOKEN,
        block_id: INSPIRATION_POOL_H2, // 在灵感池 H2 下追加子块
      },
      data: {
        // 不指定 index，默认追加到该区块子块列表末尾
        children: blocks,
      },
    });

    const createdIds = resp.data?.children?.map(c => c.block_id) || [];
    return { success: true, blockCount: blocks.length, blockIds: createdIds };
  } catch (err) {
    console.error('❌ 飞书写入失败:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// IM 通知
// ---------------------------------------------------------------------------
async function sendIM(entry, result) {
  const lines = [
    `💡 新灵感已提交`,
    ``,
    `📄 ${entry.title || '未命名'}`,
    `🔗 ${entry.url}`,
    `👤 ${entry.from || '外部贡献者'}`,
    ``,
    `📝 ${(entry.thoughts || '').substring(0, 300)}`,
    ``,
    `✅ 已写入灵感池，共 ${result.blockCount} 个区块`,
    `<at id=${CONFIG.bot_at_id || "cli_bot"}></at> 令牌组: ${entry.group || '未知'}`,
  ];

  try {
    await client.im.message.create({
      params: { receive_id_type: 'open_id' },
      data: {
        receive_id: USER_OPEN_ID,
        msg_type: 'text',
        content: JSON.stringify({ text: lines.join('\n') }),
      },
    });
    return true;
  } catch (err) {
    console.error('IM send failed:', err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Flush: 将缓冲的灵感批量写入飞书文档
// ---------------------------------------------------------------------------
async function flushToFeishu() {
  const entries = readInspirations();
  if (entries.length === 0) {
    return { success: true, count: 0, message: '空队列' };
  }

  let written = 0;
  for (const entry of entries) {
    try {
      await appendInspirationToDoc(entry);
      written++;
    } catch (err) {
      console.error(`❌ 写入失败 #${entry._index}: ${err.message}`);
    }
  }

  // 清空本地缓冲
  fs.writeFileSync(INSPIRATIONS_FILE, '', 'utf8');

  return { success: true, count: written, total: entries.length };
}

// ---------------------------------------------------------------------------
// HTTP 服务器
// ---------------------------------------------------------------------------
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data, null, 2));
}

function extractToken(req) {
  const auth = req.headers['authorization'];
  if (!auth) return null;
  return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
}

// Middleware: require valid token
function requireToken(req, res) {
  const token = extractToken(req);
  const result = validateToken(token);
  if (!result.valid) {
    sendJSON(res, 401, { success: false, error: `未授权: ${result.reason}` });
    return null;
  }
  return result.group;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { sendJSON(res, 204, {}); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // -----------------------------------------------------------------------
  // GET /api/health
  // -----------------------------------------------------------------------
  if (req.method === 'GET' && pathname === '/api/health') {
    sendJSON(res, 200, {
      status: 'ok',
      docToken: DOC_TOKEN.substring(0, 8) + '...',
      buffered: readInspirations().length,
      tokens: Object.keys(loadTokens()).length,
      inspirationPoolBlock: INSPIRATION_POOL_H2,
    });
    return;
  }

  // -----------------------------------------------------------------------
  // GET /api/status
  // -----------------------------------------------------------------------
  if (req.method === 'GET' && pathname === '/api/status') {
    const group = requireToken(req, res);
    if (!group) return;

    const entries = readInspirations();
    const tokens = loadTokens();
    const tokenCount = Object.entries(tokens).filter(([_, v]) => v.active).length;

    sendJSON(res, 200, {
      success: true,
      group,
      buffered: entries.length,
      totalTokens: tokenCount,
      recentEntries: entries.slice(-5).map(e => ({
        title: e.title, from: e.from, time: new Date(e.timestamp).toISOString()
      })),
    });
    return;
  }

  // -----------------------------------------------------------------------
  // POST /api/inspiration
  // -----------------------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/inspiration') {
    const group = requireToken(req, res);
    if (!group) return;

    try {
      const body = await parseBody(req);
      if (!body.thoughts) {
        sendJSON(res, 400, { success: false, error: '缺少必填字段: thoughts' });
        return;
      }

      const entry = {
        url: body.url || '',
        title: body.title || '未命名灵感',
        thoughts: body.thoughts,
        from: body.from || `@${group}`,
        group: group,
        timestamp: Date.now(),
      };

      // 1. 写入飞书文档（实时）
      let result;
      try {
        result = await appendInspirationToDoc(entry);
      } catch (err) {
        // 飞书写入失败，先缓冲到本地
        appendToLocalFile({ ...entry, _status: 'buffered', _error: err.message });
        sendJSON(res, 200, {
          success: true,
          warning: '飞书写入失败，已缓冲到本地',
          error: err.message,
          totalBuffered: readInspirations().length,
        });
        return;
      }

      // 2. 发 IM 确认（异步）
      sendIM(entry, result).catch(() => {});

      console.log(`💡 灵感已写入: ${entry.title} (${group})`);
      sendJSON(res, 200, {
        success: true,
        message: '灵感已写入灵感池',
        entry: { title: entry.title, url: entry.url, from: entry.from },
        blocks: result.blockCount,
      });
    } catch (err) {
      console.error('❌ 处理失败:', err.message);
      sendJSON(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // -----------------------------------------------------------------------
  // POST /api/flush (需要令牌)
  // -----------------------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/flush') {
    const group = requireToken(req, res);
    if (!group) return;

    try {
      const result = await flushToFeishu();
      sendJSON(res, 200, result);
    } catch (err) {
      sendJSON(res, 500, { success: false, error: err.message });
    }
    return;
  }

    // -----------------------------------------------------------------------
  // GET /api/scan-blocks — 扫描文档所有 H2 区块（帮助配置）
  // -----------------------------------------------------------------------
  if (req.method === 'GET' && pathname === '/api/scan-blocks') {
    try {
      const resp = await client.docx.documentBlock.list({
        path: { document_id: DOC_TOKEN },
        params: { page_size: 500 }
      });
      const items = resp.data?.items || [];
      const topBlocks = items.filter(b => b.parent_id === DOC_TOKEN);
      const h2Blocks = topBlocks.filter(b => b.block_type === 4);
      
      const result = h2Blocks.map(b => {
        const text = b.heading2?.elements?.map(e => e.text_run?.content || '').join('') || 'unknown';
        return { block_id: b.block_id, type: 'H2', title: text };
      });
      
      sendJSON(res, 200, { success: true, totalBlocks: topBlocks.length, h2Blocks: result });
    } catch (err) {
      sendJSON(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // -----------------------------------------------------------------------
  // GET / — 欢迎页（推广入口）
  // -----------------------------------------------------------------------
  if (req.method === 'GET' && (pathname === '/' || pathname === '')) {
    serveLandingPage(req, res);
    return;
  }

  sendJSON(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  const buffered = readInspirations().length;
  console.log(`
🦊 thu-epiphany-server v3 已启动
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  端口:         ${PORT}
  灵感池区块:   ${INSPIRATION_POOL_H2}
  缓冲条目:     ${buffered}
  有效令牌:     ${Object.entries(loadTokens()).filter(([_, v]) => v.active).length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  POST /api/inspiration   提交灵感（需 Bearer Token）
  POST /api/flush         缓冲写入文档
  GET  /api/health        健康检查
  GET  /api/status        状态概览
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});

// ---------------------------------------------------------------------------
// GET / — 欢迎页（推广入口）
// ---------------------------------------------------------------------------
function serveLandingPage(req, res) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>亢慕义斋 · 思维顿悟学习圈</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #e0e0e0; line-height: 1.6; }
  .container { max-width: 720px; margin: 0 auto; padding: 48px 24px; }
  h1 { font-size: 2.2em; margin-bottom: 8px; background: linear-gradient(135deg, #f7971e, #ffd200); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .subtitle { color: #888; font-size: 1.1em; margin-bottom: 40px; }
  h2 { font-size: 1.3em; margin: 32px 0 12px; color: #ffd200; }
  p, li { color: #bbb; margin-bottom: 8px; }
  ul { padding-left: 20px; }
  .card { background: #1a1a1a; border-radius: 12px; padding: 20px; margin: 16px 0; }
  .card h3 { color: #f7971e; margin-bottom: 8px; }
  .tag { display: inline-block; background: #2a2a2a; color: #ffd200; padding: 2px 10px; border-radius: 4px; font-size: 0.85em; margin: 4px 4px 0 0; }
  .status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .stat { background: #1a1a1a; border-radius: 8px; padding: 16px; text-align: center; }
  .stat .num { font-size: 1.8em; color: #ffd200; font-weight: bold; }
  .stat .label { color: #888; font-size: 0.85em; }
  .join-steps { counter-reset: step; }
  .join-steps li { list-style: none; counter-increment: step; margin-bottom: 16px; padding-left: 36px; position: relative; }
  .join-steps li::before { content: counter(step); position: absolute; left: 0; top: 0; width: 24px; height: 24px; background: #ffd200; color: #000; border-radius: 50%; text-align: center; line-height: 24px; font-size: 0.85em; font-weight: bold; }
  .api-box { background: #0a0a0a; border-radius: 8px; padding: 16px; font-family: 'SF Mono', monospace; font-size: 0.85em; overflow-x: auto; }
  .footer { margin-top: 48px; text-align: center; color: #555; font-size: 0.85em; }
  @media (max-width: 600px) { .status-grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="container">
  <h1>🦊 亢慕义斋</h1>
  <p class="subtitle">AI 加持的分布式学习圈 · 思维顿悟的存档与碰撞</p>

  <div class="status-grid">
    <div class="stat"><div class="num">⬡</div><div class="label">服务状态</div></div>
    <div class="stat"><div class="num">⬡</div><div class="label">活跃灵感</div></div>
  </div>

  <h2>📖 这是什么</h2>
  <p>一个<strong>人机混合学习圈</strong>。你和你的 AI agent 一起，把每天学习中的<strong>顿悟瞬间</strong>记录下来，提交到共享的飞书文档。</p>
  <p>别人的灵感你也能看到，你的灵感别人可以接单研究。每天中午自动搜索学术文献推荐给你。</p>

  <div class="card">
    <h3>⚡ 工作流</h3>
    <p>你学到了什么 → 告诉你的 agent → agent 格式化 → 写入共享灵感池</p>
    <p>→ 其他人看到 → 接单研究 → 提交成果 → 你获得反馈</p>
  </div>

  <h2>🎯 适合谁</h2>
  <ul>
    <li>在学一个领域（CS / 数学 / 物理 / 工程）的人</li>
    <li>脑子里经常冒出「如果…会怎样」的人</li>
    <li>觉得一个人学没动力，想要一点「共同场」的人</li>
    <li>想试试自己的 AI agent 能不能真正干活的人</li>
  </ul>

  <h2>🔑 加入方式</h2>
  <p>你需要：<span class="tag">一个飞书账号</span><span class="tag">一个 OpenClaw agent</span></p>
  <ol class="join-steps">
    <li>创建一个飞书机器人应用（在 open.feishu.cn 花 3 分钟）</li>
    <li>拿到你的 <strong>APP_ID</strong></li>
    <li>发给圈管理员 → 获得令牌 + skill 包</li>
    <li>加载 skill → 你的 agent 自动学会怎么提交灵感</li>
    <li>开始记录你的第一个顿悟 🎉</li>
  </ol>

  <h2>📡 API 状态</h2>
  <div class="api-box">
    <span id="status-text">正在检查...</span>
  </div>

  <div class="footer">
    <p>清华大学 · 亢慕义斋 · 灵感永不眠</p>
    <p>Built by 沙漠之狐 🦊 for YC 元帅</p>
  </div>
</div>
<script>
fetch('/api/health').then(r=>r.json()).then(d=>{
  document.querySelector('.stat:nth-child(1) .num').textContent = '✅';
  document.querySelector('.stat:nth-child(2) .num').textContent = d.buffered || 0;
  document.getElementById('status-text').textContent = '✅ 服务运行中 · 令牌: ' + (d.tokens||0) + ' 个 · 文档: ' + (d.docToken||'');
}).catch(()=>{
  document.querySelector('.stat:nth-child(1) .num').textContent = '❌';
  document.getElementById('status-text').textContent = '❌ 无法连接服务';
});
</script>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
