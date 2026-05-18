/**
 * 🦊 灵感捕获器 — 浏览器扩展
 *
 * Edge / Chrome Manifest V3
 * 捕获当前页面 URL + 标题 + 感想，发送到 thu-epiphany 服务端。
 *
 * 配置说明：
 *   编辑同目录下的 config.js（需从 config.example.js 复制）
 *   设置 api_base（服务端地址）和 token（访问令牌）
 */

// ===========================================================================
// 配置加载
// ===========================================================================
const CFG = typeof THU_EPIPHANY_CONFIG !== 'undefined'
  ? THU_EPIPHANY_CONFIG
  : { api_base: 'http://localhost:18999', token: '', from: '', circle_name: '学习圈' };

const SERVER_URL = CFG.api_base.replace(/\/+$/, ''); // 去掉尾部斜杠
const TOKEN = CFG.token;
const FROM = CFG.from || undefined;

// ===========================================================================
// DOM 引用
// ===========================================================================
const $ = (id) => document.getElementById(id);
const pageTitle = $('pageTitle');
const pageUrl = $('pageUrl');
const thoughts = $('thoughts');
const btnSend = $('btnSend');
const status = $('status');
const counter = $('counter');

// ===========================================================================
// 初始化
// ===========================================================================
async function init() {
  // 显示学习圈名称
  const badge = $('circleBadge');
  if (badge) badge.textContent = CFG.circle_name || '学习圈';

  const footer = $('footerText');
  if (footer) footer.textContent = `灵感会同步到 ${CFG.circle_name || '学习圈'} · 需运行 thu-epiphany 服务`;

  // 获取当前标签页信息
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      pageTitle.textContent = tab.title || '（无标题）';
      pageUrl.textContent = tab.url || '（无 URL）';
      pageUrl.title = tab.url;
    }
  } catch (err) {
    pageTitle.textContent = '无法获取页面信息';
    console.error('Tab query error:', err);
  }

  // 检查服务端状态
  checkServerStatus();
}

// ===========================================================================
// 状态显示
// ===========================================================================
function showStatus(type, message) {
  status.className = 'status ' + type;
  status.textContent = message;
}

// ===========================================================================
// 检查服务端状态
// ===========================================================================
async function checkServerStatus() {
  try {
    const resp = await fetch(`${SERVER_URL}/api/health`);
    if (!resp.ok) throw new Error('Server not OK');
    const data = await resp.json();
    if (data.entries !== undefined && data.entries > 0) {
      counter.textContent = `📦 有待处理的灵感 ${data.entries} 条`;
    } else {
      counter.textContent = '✅ 服务运行正常';
    }
  } catch {
    counter.textContent = '⚠️ thu-epiphany 服务未运行 (' + SERVER_URL + ')';
  }
}

// ===========================================================================
// 发送灵感
// ===========================================================================
async function sendInspiration() {
  const text = thoughts.value.trim();
  const url = pageUrl.textContent;
  const title = pageTitle.textContent;

  if (!text) {
    showStatus('error', '请先写下你的感想 ✏️');
    return;
  }

  if (!url || url === '（无 URL）') {
    showStatus('error', '无法获取页面 URL');
    return;
  }

  if (!TOKEN) {
    showStatus('error', '❌ 未配置访问令牌。请编辑 config.js 填入 token');
    return;
  }

  btnSend.disabled = true;
  showStatus('loading', '🚀 正在发送...');

  try {
    const resp = await fetch(`${SERVER_URL}/api/inspiration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        url,
        title,
        thoughts: text,
        ...(FROM ? { from: FROM } : {}),
      }),
    });

    const data = await resp.json();

    if (resp.ok && data.success) {
      showStatus('success', `✅ 灵感已捕获！`);
      thoughts.value = '';
      // 刷新服务器状态
      checkServerStatus();
    } else {
      const errMsg = data.error || `HTTP ${resp.status}`;
      if (resp.status === 401) {
        showStatus('error', `❌ 令牌无效或未授权，请联系管理员更新 config.js`);
      } else {
        showStatus('error', `❌ 发送失败: ${errMsg}`);
      }
    }
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      showStatus('error', `❌ 无法连接服务 (${SERVER_URL})\n请确认 thu-epiphany 服务已启动`);
    } else {
      showStatus('error', `❌ 错误: ${err.message}`);
    }
  } finally {
    btnSend.disabled = false;
  }
}

// ===========================================================================
// 事件绑定
// ===========================================================================
btnSend.addEventListener('click', sendInspiration);

// Enter 发送，Shift+Enter 换行
thoughts.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendInspiration();
  }
});

// 启动
init();
