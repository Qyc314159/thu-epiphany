#!/usr/bin/env node
/**
 * 令牌管理 — Token Management CLI
 *
 * 用法:
 *   node scripts/token.js generate <group-name> [备注] [--app-id <app_id>]  生成新令牌
 *   node scripts/token.js list                                               列出所有令牌
 *   node scripts/token.js revoke <token>                                     吊销令牌
 *   node scripts/token.js validate <token>                                   验证令牌是否有效
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const TOKENS_FILE = path.join(__dirname, 'tokens.json');

// ---------------------------------------------------------------------------
// 存储层
// ---------------------------------------------------------------------------
function loadTokens() {
  if (!fs.existsSync(TOKENS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2) + '\n', 'utf8');
  // 安全：仅 owner 可读写
  fs.chmodSync(TOKENS_FILE, 0o600);
}

function generateToken(group, note, appId) {
  const raw = crypto.randomBytes(24).toString('hex');
  const token = `sk_fox_${raw}`;
  const tokens = loadTokens();
  tokens[token] = {
    group: group || '',
    note: note || '',
    app_id: appId || '',
    created: new Date().toISOString(),
    active: true,
  };
  saveTokens(tokens);
  return token;
}

function revokeToken(token) {
  const tokens = loadTokens();
  if (!tokens[token]) return false;
  tokens[token].active = false;
  tokens[token].revoked_at = new Date().toISOString();
  saveTokens(tokens);
  return true;
}

function validateToken(token) {
  const tokens = loadTokens();
  const entry = tokens[token];
  if (!entry) return { valid: false, reason: 'TOKEN_NOT_FOUND' };
  if (!entry.active) return { valid: false, reason: 'TOKEN_REVOKED' };
  return { valid: true, info: entry };
}

function listTokens() {
  const tokens = loadTokens();
  return Object.entries(tokens).map(([token, info]) => ({
    token: token.substring(0, 16) + '...',
    full_token: token,
    ...info,
  }));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const cmd = process.argv[2];

switch (cmd) {
  case 'generate':
  case 'gen':
  case 'g': {
    const args = process.argv.slice(3);
    const appIdIdx = args.indexOf('--app-id');
    const appId = appIdIdx >= 0 ? args[appIdIdx + 1] : '';
    // 过滤掉 --app-id 及其值，剩下的都是 group 和 note
    const cleanArgs = args.filter((a, i) => {
      if (a === '--app-id') return false;
      if (args[i - 1] === '--app-id') return false;
      return true;
    });
    const group = cleanArgs[0] || '';
    const note = cleanArgs.slice(1).join(' ') || '';
    const token = generateToken(group, note, appId);
    const lines = [
      `\n✅ 新令牌已生成`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  令牌:     ${token}`,
    ];
    if (appId) lines.push(`  APP_ID:   ${appId}`);
    if (group) lines.push(`  群组:     ${group}`);
    if (note) lines.push(`  备注:     ${note}`);
    lines.push(`  有效期:   直至吊销`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`  ⚠️  这是唯一一次显示完整令牌。请安全保存。\n`);
    console.log(lines.join('\n'));
    break;
  }

  case 'list':
  case 'ls':
  case 'l': {
    const list = listTokens();
    if (list.length === 0) {
      console.log('📭 暂无令牌');
      break;
    }
    console.log('\n📋 令牌列表');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const entry of list) {
      const status = entry.active ? '✅' : '❌ 已吊销';
      console.log(`  ${status} ${entry.token}`);
      console.log(`     创建: ${entry.created.slice(0, 10)}`);
      if (entry.app_id) console.log(`     APP_ID: ${entry.app_id}`);
      if (entry.group) console.log(`     群组: ${entry.group}`);
      if (entry.note) console.log(`     备注: ${entry.note}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    break;
  }

  case 'revoke':
  case 'r': {
    const token = process.argv[3];
    if (!token) {
      console.error('❌ 用法: node scripts/token.js revoke <token>');
      process.exit(1);
    }
    if (revokeToken(token)) {
      console.log(`✅ 令牌已吊销: ${token.substring(0, 16)}...`);
    } else {
      console.error(`❌ 未找到此令牌`);
    }
    break;
  }

  case 'validate':
  case 'v': {
    const token = process.argv[3];
    if (!token) {
      console.error('❌ 用法: node scripts/token.js validate <token>');
      process.exit(1);
    }
    const result = validateToken(token);
    if (result.valid) {
      console.log(`✅ 令牌有效 — 组: ${result.info.group}  |  创建: ${result.info.created.slice(0, 10)}`);
    } else {
      console.log(`❌ 令牌无效 — ${result.reason}`);
    }
    break;
  }

  default:
    console.log(`
🦊 令牌管理工具
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  用法:
    generate <group> [备注]    生成新令牌
    list                       列出所有令牌
    revoke <token>             吊销令牌
    validate <token>           验证令牌
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}
