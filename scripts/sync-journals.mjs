/**
 * 同步机关刊物仓库 YouthLAgency/ZhenliWeekly 到本地
 *
 * 用法：
 *   node scripts/sync-journals.mjs           # 执行同步
 *   node scripts/sync-journals.mjs --dry-run # 预览变更
 *
 * - PDF 文件下载到 public/journals/<类型>/<文件名>，部署后从 Cloudflare CDN 提供
 * - journals markdown frontmatter 用 pdfLocal 指向本站路径
 * - MD 文件内容作为期刊正文
 */
import { readdir, readFile, writeFile, unlink, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, parse } from 'node:path';

const REPO_OWNER = 'YouthLAgency';
const REPO_NAME = 'ZhenliWeekly';
const REPO_BRANCH = 'main';
const JOURNALS_DIR = join(process.cwd(), 'src', 'content', 'journals');
const PDF_DIR = join(process.cwd(), 'public', 'journals');

const dryRun = process.argv.includes('--dry-run');

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  return res.json();
}

// 带重试的 API 请求
async function apiWithRetry(path, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await api(path);
    } catch (err) {
      lastErr = err;
      console.log(`   ⏳ 重试 ${i + 1}/${retries}：${path.split('?')[0]}`);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

// 下载文件内容
// - 小文件（<1MB）：Contents API 返回 base64 content
// - 大文件（>=1MB）：用 Git Blobs API 获取 base64 content（走 api.github.com，比 raw URL 稳定）
async function downloadRaw(dirName, filename) {
  const path = `${encodeURIComponent(dirName)}/${encodeURIComponent(filename)}`;
  const data = await apiWithRetry(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${REPO_BRANCH}`);
  if (data.encoding === 'base64' && data.content) {
    return { buffer: Buffer.from(data.content, 'base64') };
  }
  // 大文件：用 Git Blobs API
  const blob = await apiWithRetry(`/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs/${data.sha}`);
  return { buffer: Buffer.from(blob.content, 'base64') };
}

async function getTopDirs() {
  const data = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/contents?ref=${REPO_BRANCH}`);
  return data.filter((item) => item.type === 'dir');
}

async function getFiles(dirPath) {
  const data = await api(
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(dirPath)}?ref=${REPO_BRANCH}`
  );
  if (!Array.isArray(data)) return [];
  const skipNames = new Set(['docs.md', 'readme.md', 'README.md', 'index.md', '.gitkeep']);
  return data.filter((item) => item.type === 'file' && !skipNames.has(item.name));
}

function getJournalType(dirName) {
  const name = dirName.toLowerCase();
  if (name.includes('周刊') || name.includes('weekly')) return '周刊';
  if (name.includes('月刊') || name.includes('monthly')) return '月刊';
  if (name.includes('文艺') || name.includes('literary')) return '文艺报';
  return '特刊';
}

function extractIssue(filename) {
  const base = parse(filename).name;
  let m = base.match(/第([一二三四五六七八九十百千零\d]+)期/);
  if (m) return `第${m[1]}期`;
  m = base.match(/([一二三四五六七八九十百千零]+)期/);
  if (m) return `第${m[1]}期`;
  m = base.match(/(\d+)/);
  if (m) return `第${m[1]}期`;
  return base;
}

function extractDate(filename) {
  const base = parse(filename).name;
  const cnMonth = { 一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,十一:11,十二:12 };
  let m = base.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m = base.match(/(\d{4})(\d{2})(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = base.match(/(\d{4})年([一二三四五六七八九十]+|\d{1,2})月/);
  if (m) {
    let mo = m[2];
    if (cnMonth[mo]) mo = cnMonth[mo];
    return `${m[1]}-${String(mo).padStart(2,'0')}-01`;
  }
  m = base.match(/(\d{4})/);
  if (m) return `${m[1]}-01-01`;
  return new Date().toISOString().slice(0, 10);
}

function slugify(dirName, filename) {
  const typeMap = { '周刊': 'weekly', '月刊': 'monthly', '文艺报': 'literary', '特刊': 'special' };
  const type = typeMap[getJournalType(dirName)] || 'monthly';
  const base = parse(filename).name
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .toLowerCase();
  return `${type}-${base}`;
}

// 生成 journals markdown（含正文）
function generateJournalMd({ dirName, filename, type, date, body }) {
  const issue = extractIssue(filename);
  const title = `${dirName}·${issue}`;
  const isPdf = /\.pdf$/i.test(filename);
  const pdfLocal = isPdf ? `/journals/${dirName}/${filename}` : '';

  const fm = [
    '---',
    `title: "${title}"`,
    `issue: "${issue}"`,
    `description: "${dirName}${issue}——机关刊物电子版。"`,
    `date: ${date}`,
    `type: ${type}`,
    `onlineReadable: true`,
  ];
  if (pdfLocal) fm.push(`pdfLocal: "${pdfLocal}"`);
  fm.push(
    `tags:`,
    `  - ${type}`,
    `  - 机关刊物`,
    `draft: false`,
    '---',
  );

  let content = fm.join('\n');
  if (body && body.trim()) {
    content += '\n\n' + body;
  } else if (isPdf) {
    content += '\n\n本文为 PDF 在线阅读版，请使用上方 PDF 阅读器浏览完整内容。';
  }
  return content;
}

async function main() {
  console.log(`📡 正在读取 ${REPO_OWNER}/${REPO_NAME} 仓库结构...`);
  const dirs = await getTopDirs();
  console.log(`发现 ${dirs.length} 个文件夹：${dirs.map((d) => d.name).join('、')}`);

  const journals = [];
  for (const dir of dirs) {
    const type = getJournalType(dir.name);
    console.log(`\n📁 ${dir.name}（类型：${type}）`);
    const files = await getFiles(dir.name);
    const docFiles = files.filter((f) => /\.(pdf|md)$/i.test(f.name));
    console.log(`   找到 ${docFiles.length} 个文件`);
    for (const f of docFiles) {
      journals.push({
        dirName: dir.name,
        filename: f.name,
        type,
        date: extractDate(f.name),
        slug: slugify(dir.name, f.name),
      });
      console.log(`   - ${f.name} → ${journals.at(-1).slug}.md`);
    }
  }

  if (journals.length === 0) {
    console.log('\n⚠ 未找到任何期刊文件，退出。');
    return;
  }

  // 确保目录存在
  if (!existsSync(JOURNALS_DIR)) await mkdir(JOURNALS_DIR, { recursive: true });
  if (!existsSync(PDF_DIR)) await mkdir(PDF_DIR, { recursive: true });

  // 收集所有预期的 PDF 本地路径（用于清理过期 PDF）
  const expectedPdfPaths = new Set();

  // 下载 PDF 并写入 journals
  let created = 0, updated = 0, downloaded = 0, failed = 0;

  for (const j of journals) {
    try {
      const isPdf = /\.pdf$/i.test(j.filename);
      let body = '';

      if (isPdf) {
        // 下载 PDF 到 public/journals/<dirName>/<filename>
        const localDir = join(PDF_DIR, j.dirName);
        if (!existsSync(localDir)) await mkdir(localDir, { recursive: true });
        const localPath = join(localDir, j.filename);
        const pdfUrl = `/journals/${j.dirName}/${j.filename}`;
        expectedPdfPaths.add(pdfUrl);

        // 检查是否已存在且大小一致（避免重复下载）
        const { buffer } = await downloadRaw(j.dirName, j.filename);
        const buf = buffer;
        if (!existsSync(localPath) || readFileSyncSafe(localPath)?.length !== buf.length) {
          console.log(`⬇ 下载 PDF：${j.filename}（${(buf.length/1024).toFixed(1)} KB）`);
          if (!dryRun) await writeFile(localPath, buf);
          downloaded++;
        } else {
          console.log(`⏭ PDF 已存在：${j.filename}`);
        }
      } else {
        // MD 文件：下载内容作为正文
        const { buffer } = await downloadRaw(j.dirName, j.filename);
        body = buffer.toString('utf-8');
      }

      // 写入 journals markdown
      const mdPath = join(JOURNALS_DIR, `${j.slug}.md`);
      const newContent = generateJournalMd({ ...j, body });
      let isNew = true;
      if (existsSync(mdPath)) {
        const old = await readFile(mdPath, 'utf-8');
        if (old === newContent) {
          console.log(`⏭ 无变化：${j.slug}.md`);
          continue;
        }
        isNew = false;
      }
      console.log(`${isNew ? '✨ 新增' : '✏ 更新'}：${j.slug}.md`);
      if (!dryRun) await writeFile(mdPath, newContent, 'utf-8');
      if (isNew) created++;
      else updated++;
    } catch (err) {
      console.log(`✗ 跳过 ${j.filename}：${err.message}`);
      failed++;
    }
  }

  // 清理过期 journals markdown
  const existingMd = (await readdir(JOURNALS_DIR)).filter((f) => f.endsWith('.md'));
  const expectedSlugs = new Set(journals.map((j) => j.slug));
  let deleted = 0;
  for (const f of existingMd) {
    if (!expectedSlugs.has(parse(f).name)) {
      console.log(`🗑 删除过期条目：${f}`);
      if (!dryRun) await unlink(join(JOURNALS_DIR, f));
      deleted++;
    }
  }

  // 清理过期 PDF
  for (const dir of dirs) {
    const localDir = join(PDF_DIR, dir.name);
    if (!existsSync(localDir)) continue;
    const localFiles = await readdir(localDir);
    const expectedInDir = new Set(
      journals.filter((j) => j.dirName === dir.name && /\.pdf$/i.test(j.filename)).map((j) => j.filename)
    );
    for (const f of localFiles) {
      if (!expectedInDir.has(f)) {
        console.log(`🗑 删除过期 PDF：${dir.name}/${f}`);
        if (!dryRun) await unlink(join(localDir, f));
      }
    }
  }

  console.log(`\n✅ 同步完成：新增 ${created}，更新 ${updated}，下载 ${downloaded}，删除 ${deleted}，失败 ${failed}${dryRun ? '（dry-run）' : ''}`);
}

// 安全读取文件大小
function readFileSyncSafe(p) {
  try {
    const { readFileSync } = require('fs');
    return readFileSync(p);
  } catch {
    return null;
  }
}

main().catch((err) => {
  console.error('❌ 同步失败：', err.message);
  process.exit(1);
});
