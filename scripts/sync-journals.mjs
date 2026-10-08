/**
 * 同步机关刊物仓库 YouthLAgency/ZhenliWeekly 到本地 journals 集合
 *
 * 用法：
 *   node scripts/sync-journals.mjs           # 执行同步
 *   node scripts/sync-journals.mjs --dry-run # 预览变更
 *
 * 该仓库包含《真理周刊》《真理月刊》两个文件夹，内含 PDF/Markdown 文件。
 * 同步后在 src/content/journals/ 下生成对应元数据条目，PDF 在线阅读指向该仓库。
 */
import { readdir, readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, parse } from 'node:path';

const REPO_OWNER = 'YouthLAgency';
const REPO_NAME = 'ZhenliWeekly';
const REPO_BRANCH = 'main';
const JOURNALS_DIR = join(process.cwd(), 'src', 'content', 'journals');

const dryRun = process.argv.includes('--dry-run');

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  return res.json();
}

// 获取仓库根目录的文件夹列表
async function getTopDirs() {
  const data = await api(`/repos/${REPO_OWNER}/${REPO_NAME}/contents?ref=${REPO_BRANCH}`);
  return data.filter((item) => item.type === 'dir');
}

// 获取文件夹下的文件
async function getFiles(dirPath) {
  const data = await api(
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(dirPath)}?ref=${REPO_BRANCH}`
  );
  if (!Array.isArray(data)) return [];
  // 过滤掉说明文档
  const skipNames = new Set(['docs.md', 'readme.md', 'README.md', 'index.md', '.gitkeep']);
  return data.filter((item) => item.type === 'file' && !skipNames.has(item.name));
}

// 判断期刊类型
function getJournalType(dirName) {
  const name = dirName.toLowerCase();
  if (name.includes('周刊') || name.includes('weekly')) return '周刊';
  if (name.includes('月刊') || name.includes('monthly')) return '月刊';
  return '特刊';
}

// 从文件名提取期号
function extractIssue(filename) {
  const base = parse(filename).name;
  // 优先匹配"第X期"或"X期"
  let m = base.match(/第([一二三四五六七八九十百千零\d]+)期/);
  if (m) return `第${m[1]}期`;
  m = base.match(/([一二三四五六七八九十百千零]+)期/);
  if (m) return `第${m[1]}期`;
  // 匹配数字
  m = base.match(/(\d+)/);
  if (m) return `第${m[1]}期`;
  return base;
}

// 从文件名推断日期（支持 2026-10-01、20261001、2026年七月、2026年7月）
function extractDate(filename) {
  const base = parse(filename).name;
  const cnMonth = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6,
    七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12,
  };
  // YYYY-MM-DD
  let m = base.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  // YYYYMMDD
  m = base.match(/(\d{4})(\d{2})(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // YYYY年MM月（中文或阿拉伯数字）
  m = base.match(/(\d{4})年([一二三四五六七八九十]+|\d{1,2})月/);
  if (m) {
    let month = m[2];
    if (cnMonth[month]) month = cnMonth[month];
    month = String(month).padStart(2, '0');
    return `${m[1]}-${month}-01`;
  }
  // YYYY 单独
  m = base.match(/(\d{4})/);
  if (m) return `${m[1]}-01-01`;
  // 否则用今天
  return new Date().toISOString().slice(0, 10);
}

// 生成 slug
function slugify(dirName, filename) {
  const type = getJournalType(dirName) === '周刊' ? 'weekly' : 'monthly';
  const base = parse(filename).name
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .toLowerCase();
  return `${type}-${base}`;
}

// 生成 frontmatter
function generateFrontmatter({ dirName, filename, type, date }) {
  const issue = extractIssue(filename);
  const title = `${dirName}·${issue}`;
  const pdfPath = `${dirName}/${filename}`;
  const isPdf = filename.toLowerCase().endsWith('.pdf');
  return [
    '---',
    `title: "${title}"`,
    `issue: "${issue}"`,
    `description: "${dirName}${issue}——机关刊物电子版。"`,
    `date: ${date}`,
    `type: ${type}`,
    `onlineReadable: true`,
    `pdfRepo: "${REPO_OWNER}/${REPO_NAME}"`,
    `pdfPath: "${pdfPath}"`,
    `pdfBranch: "${REPO_BRANCH}"`,
    `tags:`,
    `  - ${type}`,
    `  - 机关刊物`,
    `draft: false`,
    '---',
    '',
    `本文为 PDF 在线阅读版，请使用上方 PDF 阅读器浏览完整内容。`,
  ].join('\n');
}

async function main() {
  console.log(`📡 正在读取 ${REPO_OWNER}/${REPO_NAME} 仓库结构...`);
  const dirs = await getTopDirs();
  console.log(`发现 ${dirs.length} 个文件夹：${dirs.map((d) => d.name).join(', ')}`);

  // 收集所有期刊文件
  const journals = [];
  for (const dir of dirs) {
    const type = getJournalType(dir.name);
    console.log(`\n📁 ${dir.name}（类型：${type}）`);
    const files = await getFiles(dir.name);
    // 只取 PDF 和 MD
    const docFiles = files.filter((f) => /\.(pdf|md)$/i.test(f.name));
    console.log(`   找到 ${docFiles.length} 个文件`);
    for (const f of docFiles) {
      const date = extractDate(f.name);
      journals.push({
        dirName: dir.name,
        filename: f.name,
        type,
        date,
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
  if (!existsSync(JOURNALS_DIR)) {
    await mkdir(JOURNALS_DIR, { recursive: true });
  }

  // 获取现有 journals 文件
  const existingFiles = (await readdir(JOURNALS_DIR)).filter((f) => f.endsWith('.md'));
  const expectedSlugs = new Set(journals.map((j) => j.slug));

  // 删除不再存在的期刊
  let deleted = 0;
  for (const file of existingFiles) {
    const slug = parse(file).name;
    if (!expectedSlugs.has(slug)) {
      console.log(`🗑 删除过期条目：${file}`);
      if (!dryRun) await unlink(join(JOURNALS_DIR, file));
      deleted++;
    }
  }

  // 写入/更新期刊
  let created = 0;
  let updated = 0;
  for (const j of journals) {
    const filePath = join(JOURNALS_DIR, `${j.slug}.md`);
    const newContent = generateFrontmatter(j);
    let isNew = true;
    if (existsSync(filePath)) {
      const oldContent = await readFile(filePath, 'utf-8');
      if (oldContent === newContent) {
        console.log(`⏭ 无变化：${j.slug}.md`);
        continue;
      }
      isNew = false;
    }
    console.log(`${isNew ? '✨ 新增' : '✏ 更新'}：${j.slug}.md`);
    if (!dryRun) await writeFile(filePath, newContent, 'utf-8');
    if (isNew) created++;
    else updated++;
  }

  console.log(`\n✅ 同步完成：新增 ${created}，更新 ${updated}，删除 ${deleted}${dryRun ? '（dry-run，未实际写入）' : ''}`);
}

main().catch((err) => {
  console.error('❌ 同步失败：', err.message);
  process.exit(1);
});
