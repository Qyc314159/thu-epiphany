#!/usr/bin/env node
/**
 * 学术文献搜索与推荐 — Literature Scanner
 *
 * 每天中午 12:00（或手动）运行：
 * 1. 读取亢慕义斋文档的灵感池区块
 * 2. 识别新增的灵感（自上次扫描以来）
 * 3. 对每条灵感，用 CrossRef + arXiv API 搜索相关学术文献
 * 4. 将文献推荐写入 doc（文档文献追踪区）
 *
 * 用法:
 *   node scripts/literature-search.js              # 扫描并搜索
 *   node scripts/literature-search.js --dry-run    # 仅扫描，不写入
 *   node scripts/literature-search.js --force      # 强制重新扫描全部
 */

const path = require('path');
const fs = require('fs');
const https = require('https');

const NODE_PATH = path.join(__dirname, 'node_modules');
const lark = require(path.join(NODE_PATH, '@larksuiteoapi/node-sdk'));
let CONFIG;
try { CONFIG = require(path.join(__dirname, 'config.js')); }
catch(e) { console.error('\u274c 无法加载 config.js'); process.exit(1); }
const APP_ID = CONFIG.feishu.app_id;
const APP_SECRET = CONFIG.feishu.app_secret;
const DOC_TOKEN = CONFIG.doc_token;

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------
const CROSSREF_API = 'https://api.crossref.org/works';
const INSPIRATION_POOL_H2 = CONFIG.inspiration_pool_block_id;
const STATE_FILE = path.join(__dirname, '..', 'data', 'literature-state.json');
const RESULTS_FILE = path.join(__dirname, '..', 'data', 'literature-results.jsonl');
const MAX_RESULTS = 3;
const MAX_QUERIES = 10;

// ---------------------------------------------------------------------------
// 飞书客户端
// ---------------------------------------------------------------------------
const client = new lark.Client({
  appId: APP_ID,
  appSecret: APP_SECRET,
  disableTokenCache: false,
});

// ---------------------------------------------------------------------------
// 状态管理
// ---------------------------------------------------------------------------
function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { lastScan: null, processedIds: [] };
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastScan: null, processedIds: [] }; }
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  state.lastScan = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// 关键词提取（清理 @用户名、emoji、停顿词）
// ---------------------------------------------------------------------------
function extractKeywords(title, thoughts) {
  let text = (title + ' ' + thoughts);

  // 去掉 @用户名 及其前缀
  text = text.replace(/\u{1F4CC}\s*@\S+[：:]\s*/gu, ' ');
  text = text.replace(/@\S+/g, ' ');
  // 去掉 emoji
  text = text.replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ');
  // 去掉标点
  text = text.replace(/[，。！？、；：""''（）【】《》\-—–·…×→←↑↓∞≈≠≤≥＋－＝±×÷]/g, ' ');
  // 合并空格
  text = text.replace(/\s+/g, ' ').trim();

  const stopWords = new Set([
    '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一',
    '一个', '这个', '那个', '今天', '发现', '觉得', '感觉', '有点', '比较',
    '已经', '可以', '需要', '通过', '进行', '以及', '或者', '如果', '因为',
    '所以', '但是', '然后', '之后', '以前', '目前', '没有', '什么', '怎么',
    '如何', '理解', '实现', '上面', '下面', '这里', '那里', '这种', '方式',
    '方法', '问题', '沙漠', '之狐', 'submit', 'title', 'thoughts',
  ]);

  const words = text.split(' ')
    .filter(w => w.length > 1 && !stopWords.has(w) && !/^[a-zA-Z]{1,2}$/.test(w))
    .slice(0, 8);

  if (words.length === 0) {
    // fallback: 取原标题去掉前缀
    return title.replace(/\u{1F4CC}\s*@\S+[：:]\s*/gu, '').trim() || 'research';
  }

  return words.join(' ');
}

// ---------------------------------------------------------------------------
// CrossRef API 搜索（通用学术文献）
// ---------------------------------------------------------------------------
function searchCrossRef(query) {
  return new Promise((resolve) => {
    const url = CROSSREF_API + '?query=' + encodeURIComponent(query) +
      '&rows=' + MAX_RESULTS + '&sort=relevance&order=desc';
    const req = https.get(url, {
      headers: { 'User-Agent': 'thu-epiphany/1.0' },
      timeout: 8000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const items = json.message?.items || [];
          const results = items.map(item => ({
            title: item.title?.[0] || 'Untitled',
            authors: (item.author || []).map(a =>
              [a.given, a.family].filter(Boolean).join(' ')
            ).join(', '),
            year: (item.published?.date_parts?.[0]?.[0] ||
                   item['published-print']?.date_parts?.[0]?.[0]) || '',
            doi: item.DOI || '',
            url: item.DOI ? 'https://doi.org/' + item.DOI : (item.URL || ''),
            source: 'CrossRef',
          })).slice(0, MAX_RESULTS);
          resolve(results);
        } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

// ---------------------------------------------------------------------------
// arXiv API 搜索（计算机/数学/物理预印本）
// ---------------------------------------------------------------------------
function searchArxiv(query) {
  return new Promise((resolve) => {
    const url = 'https://export.arxiv.org/api/query?search_query=all:' +
      encodeURIComponent(query) + '&max_results=' + MAX_RESULTS +
      '&sortBy=relevance&sortOrder=descending';
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const entries = data.split('<entry>').slice(1);
          const results = entries.slice(0, MAX_RESULTS).map(e => {
            const title = (e.match(/<title>(.*?)<\/title>/s)?.[1] || 'Untitled')
              .trim().replace(/\s+/g, ' ');
            const authorMatches = [...e.matchAll(/<name>(.*?)<\/name>/g)];
            const authors = authorMatches.map(m => m[1]).join(', ');
            const year = e.match(/<published>(\d{4})/)?.[1] || '';
            const id = e.match(/<id>(.*?)<\/id>/)?.[1] || '';
            return { title, authors, year, url: id, source: 'arXiv', doi: '' };
          });
          resolve(results);
        } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

// ---------------------------------------------------------------------------
// 多源搜索（CrossRef + arXiv，去重合并）
// ---------------------------------------------------------------------------
async function searchAll(query) {
  const [crossref, arxiv] = await Promise.all([
    searchCrossRef(query),
    searchArxiv(query),
  ]);
  const all = [...crossref, ...arxiv];
  const seen = new Set();
  return all.filter(r => {
    const key = r.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_RESULTS + 1);
}

// ---------------------------------------------------------------------------
// 读取灵感池
// ---------------------------------------------------------------------------
async function getInspirations() {
  const resp = await client.docx.documentBlock.list({
    path: { document_id: DOC_TOKEN },
    params: { page_size: 500 }
  });
  const items = resp.data?.items || [];
  const children = items.filter(b => b.parent_id === INSPIRATION_POOL_H2);

  const inspirations = [];
  let current = null;

  for (const block of children) {
    if (block.block_type === 5) {
      if (current) inspirations.push(current);
      const title = block.heading3?.elements
        ?.map(e => e.text_run?.content || '').join('') || '';
      current = { blockId: block.block_id, title, texts: [], fullText: title };
    } else if (block.block_type === 2 && current) {
      const text = block.text?.elements
        ?.map(e => e.text_run?.content || '').join('') || '';
      current.texts.push(text);
      current.fullText += ' ' + text;
    }
  }
  if (current) inspirations.push(current);
  return inspirations;
}

// ---------------------------------------------------------------------------
// 写入结果到本地
// ---------------------------------------------------------------------------
async function saveResults(inspirationTitle, results) {
  const entry = JSON.stringify({
    inspiration: inspirationTitle,
    timestamp: new Date().toISOString(),
    results,
  }) + '\n';
  const dir = path.dirname(RESULTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(RESULTS_FILE, entry, 'utf8');
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  console.log('📚 文献搜索扫描');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const inspirations = await getInspirations();
  console.log('  灵感池条目:', inspirations.length);

  const state = loadState();
  const processedIds = state.processedIds || [];
  let newEntries = force
    ? inspirations
    : inspirations.filter(ins => !processedIds.includes(ins.blockId));

  // 过滤掉模板和示例
  newEntries = newEntries.filter(ins =>
    !ins.title.includes('示例') && !ins.title.includes('模板') &&
    !ins.title.includes('关于')
  );

  console.log('  新增未处理:', newEntries.length);

  if (newEntries.length === 0) {
    console.log('✅ 无需处理');
    return;
  }

  let totalFound = 0;
  let processed = 0;

  for (const entry of newEntries) {
    if (processed >= MAX_QUERIES) break;

    const keywords = extractKeywords(entry.title, entry.fullText);
    console.log('\n  [' + (processed + 1) + '/' +
      Math.min(newEntries.length, MAX_QUERIES) + '] ' +
      entry.title.slice(0, 50));

    if (dryRun) {
      console.log('    关键词:', keywords.slice(0, 60));
      console.log('    ⏭️  DRY RUN');
      processed++;
      continue;
    }

    try {
      const results = await searchAll(keywords);
      console.log('    关键词:', keywords.slice(0, 60));
      console.log('    结果:', results.length, '篇');

      if (results.length > 0) {
        await saveResults(entry.title, results);
        totalFound += results.length;
        for (const r of results) {
          console.log('      → ' + r.title.slice(0, 60));
        }
      }

      state.processedIds.push(entry.blockId);
      processed++;
    } catch (err) {
      console.log('    ❌ 搜索失败:', err.message);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  if (!dryRun) saveState(state);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 完成! 处理 ' + processed + ' 条, 推荐 ' + totalFound + ' 篇');
}

main().catch(err => {
  console.error('❌ 致命错误:', err.message);
  process.exit(1);
});
