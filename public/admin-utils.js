/**
 * 东方欲晓通讯站 —— 后台管理共享工具
 * 包含：GitHub API 封装、Markdown frontmatter 解析/序列化、各板块 schema 配置
 * 所有函数挂载到 window.AdminUtils，供各 admin 页面调用
 */
(function () {
  if (window.AdminUtils) return;

  // ========== 配置存储 ==========
  const Storage = {
    get(key, def) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? def : v;
      } catch (e) {
        return def;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(key, val);
      } catch (e) {}
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    },
  };

  // ========== GitHub API ==========
  const GitHub = {
    getConfig() {
      return {
        token: Storage.get('gh_token', ''),
        owner: Storage.get('gh_owner', ''),
        repo: Storage.get('gh_repo', ''),
        branch: Storage.get('gh_branch', 'main'),
      };
    },
    setConfig(cfg) {
      if (cfg.token !== undefined) Storage.set('gh_token', cfg.token);
      if (cfg.owner !== undefined) Storage.set('gh_owner', cfg.owner);
      if (cfg.repo !== undefined) Storage.set('gh_repo', cfg.repo);
      if (cfg.branch !== undefined) Storage.set('gh_branch', cfg.branch);
    },
    isConfigured() {
      const c = this.getConfig();
      return c.token && c.owner && c.repo;
    },
    async api(method, path, body) {
      const cfg = this.getConfig();
      if (!cfg.token) throw new Error('请先在设置页配置 GitHub Token');
      const url = `https://api.github.com${path}`;
      const opts = {
        method,
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      };
      if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      const res = await fetch(url, opts);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(`GitHub API ${res.status}: ${data.message || res.statusText}`);
      }
      return data;
    },
    // 获取目录下文件列表
    async listFiles(path) {
      const cfg = this.getConfig();
      const data = await this.api(
        'GET',
        `/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}`
      );
      if (Array.isArray(data)) {
        return data.filter((f) => f.type === 'file' && f.name.endsWith('.md'));
      }
      return [];
    },
    // 获取文件内容（base64 + sha）
    async getFile(path) {
      const cfg = this.getConfig();
      const data = await this.api(
        'GET',
        `/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}`
      );
      const content = data.content
        ? decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))))
        : '';
      return { content, sha: data.sha };
    },
    // 创建或更新文件
    async putFile(path, content, message, sha) {
      const cfg = this.getConfig();
      const body = {
        message,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: cfg.branch,
      };
      if (sha) body.sha = sha;
      return this.api(
        'PUT',
        `/repos/${cfg.owner}/${cfg.repo}/contents/${path}`,
        body
      );
    },
    // 删除文件
    async deleteFile(path, sha, message) {
      const cfg = this.getConfig();
      return this.api(
        'DELETE',
        `/repos/${cfg.owner}/${cfg.repo}/contents/${path}`,
        {
          message: message || `删除 ${path}`,
          sha,
          branch: cfg.branch,
        }
      );
    },
  };

  // ========== Markdown 处理 ==========
  const Markdown = {
    // YAML 字符串转义
    yamlString(v) {
      if (v === undefined || v === null) return '';
      const s = String(v);
      const needsQuote =
        /[:#&*!|>'"%@`,\[\]{}]/.test(s) ||
        /^\s|\s$/.test(s) ||
        s === '' ||
        /^[0-9]/.test(s) ||
        /^(true|false|null|yes|no)$/i.test(s);
      if (needsQuote) {
        return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
      }
      return s;
    },
    // 序列化字段
    serializeField(name, value, type) {
      if (type === 'boolean') {
        return `${name}: ${value ? 'true' : 'false'}`;
      }
      if (type === 'number') {
        return `${name}: ${value}`;
      }
      if (type === 'tags') {
        const arr = String(value || '')
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (arr.length === 0) return `${name}: []`;
        return `${name}:\n` + arr.map((t) => `  - ${this.yamlString(t)}`).join('\n');
      }
      return `${name}: ${this.yamlString(value)}`;
    },
    // 从表单数据生成 Markdown
    generate(fields, body) {
      const lines = ['---'];
      fields.forEach((f) => {
        if (f.optional && (f.value === '' || f.value === undefined || f.value === null)) {
          return;
        }
        if (
          !f.optional &&
          (f.value === '' || f.value === undefined || f.value === null) &&
          f.type !== 'boolean'
        ) {
          lines.push(`# ⚠ ${f.name}: （必填，待填写）`);
          return;
        }
        lines.push(this.serializeField(f.name, f.value, f.type));
      });
      lines.push('---');
      if (body && body.trim()) {
        lines.push('');
        lines.push(body);
      }
      return lines.join('\n');
    },
    // 解析 frontmatter
    parse(content) {
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (!match) return { data: {}, body: content };
      const fmText = match[1];
      const body = match[2] || '';
      const data = {};
      let currentKey = null;
      let currentList = null;

      fmText.split(/\r?\n/).forEach((line) => {
        if (line.trim() === '') return;
        const listItem = line.match(/^\s+-\s+(.*)$/);
        if (listItem && currentList !== null) {
          let val = listItem[1].trim();
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1).replace(/\\"/g, '"');
          }
          currentList.push(val);
          return;
        }
        const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
        if (kv) {
          currentKey = kv[1];
          let val = kv[2].trim();
          if (val === '[]') {
            data[currentKey] = [];
            currentList = data[currentKey];
          } else if (val === '') {
            data[currentKey] = [];
            currentList = data[currentKey];
          } else {
            currentList = null;
            if (val === 'true') data[currentKey] = true;
            else if (val === 'false') data[currentKey] = false;
            else if (val.startsWith('"') && val.endsWith('"'))
              data[currentKey] = val.slice(1, -1).replace(/\\"/g, '"');
            else if (!isNaN(val) && val !== '') data[currentKey] = Number(val);
            else data[currentKey] = val;
          }
        }
      });

      return { data, body };
    },
  };

  // ========== Schema 配置 ==========
  const Schemas = {
    guide: {
      label: '入门指南',
      path: 'src/content/guide',
      slugField: 'title',
      fields: [
        { name: 'title', label: '标题', type: 'string', required: true },
        { name: 'description', label: '简介', type: 'text', required: true },
        { name: 'author', label: '作者', type: 'string', default: '青联社' },
        { name: 'date', label: '日期', type: 'date', required: true },
        {
          name: 'type',
          label: '类型',
          type: 'enum',
          options: ['阅读路径', '概念入门', '推荐书单', '社员招募', '通讯员征集'],
          default: '阅读路径',
        },
        { name: 'order', label: '排序', type: 'number', default: 0 },
        { name: 'tags', label: '标签（逗号分隔）', type: 'tags' },
        { name: 'draft', label: '草稿', type: 'boolean', default: false },
      ],
    },
    articles: {
      label: '理论文章',
      path: 'src/content/articles',
      slugField: 'title',
      fields: [
        { name: 'title', label: '标题', type: 'string', required: true },
        { name: 'description', label: '简介', type: 'text', required: true },
        { name: 'author', label: '作者', type: 'string', required: true },
        { name: 'date', label: '日期', type: 'date', required: true },
        {
          name: 'category',
          label: '分类',
          type: 'enum',
          options: ['经典著作', '概念词典', '国际共运史', '专题文章', '时事评论'],
          default: '专题文章',
        },
        {
          name: 'source',
          label: '来源',
          type: 'enum',
          options: ['原创', '译文', '转载'],
          default: '原创',
        },
        { name: 'tags', label: '标签（逗号分隔）', type: 'tags' },
        { name: 'draft', label: '草稿', type: 'boolean', default: false },
      ],
    },
    art: {
      label: '文艺作品',
      path: 'src/content/art',
      slugField: 'title',
      fields: [
        { name: 'title', label: '标题', type: 'string', required: true },
        { name: 'description', label: '简介', type: 'text', required: true },
        { name: 'author', label: '作者', type: 'string', required: true },
        { name: 'date', label: '日期', type: 'date', required: true },
        {
          name: 'type',
          label: '类型',
          type: 'enum',
          options: ['诗歌', '散文', '小说', '评论', '音乐', '美术', '戏剧'],
          default: '诗歌',
        },
        { name: 'bilibili', label: 'Bilibili BV号（可选）', type: 'string', optional: true },
        { name: 'tags', label: '标签（逗号分隔）', type: 'tags' },
        { name: 'draft', label: '草稿', type: 'boolean', default: false },
      ],
    },
    journals: {
      label: '期刊通讯',
      path: 'src/content/journals',
      slugField: 'title',
      fields: [
        { name: 'title', label: '标题', type: 'string', required: true },
        { name: 'issue', label: '期号', type: 'string', required: true },
        { name: 'description', label: '简介', type: 'text', required: true },
        { name: 'date', label: '日期', type: 'date', required: true },
        {
          name: 'type',
          label: '类型',
          type: 'enum',
          options: ['周刊', '月刊', '文艺报', '特刊'],
          default: '周刊',
        },
        { name: 'downloadUrl', label: '下载链接（可选）', type: 'url', optional: true },
        { name: 'onlineReadable', label: '开放在线阅读', type: 'boolean', default: true },
        { name: 'tags', label: '标签（逗号分隔）', type: 'tags' },
        { name: 'draft', label: '草稿', type: 'boolean', default: false },
      ],
    },
    concepts: {
      label: '概念词典',
      path: 'src/content/concepts',
      slugField: 'term',
      fields: [
        { name: 'term', label: '术语', type: 'string', required: true },
        { name: 'description', label: '释义', type: 'text', required: true },
        {
          name: 'category',
          label: '分类',
          type: 'enum',
          options: ['哲学', '政治经济学', '科学社会主义', '党史', '人物'],
          default: '哲学',
        },
        { name: 'tags', label: '标签（逗号分隔）', type: 'tags' },
        { name: 'draft', label: '草稿', type: 'boolean', default: false },
      ],
    },
    tools: {
      label: '左翼工具',
      path: 'src/content/tools',
      slugField: 'name',
      fields: [
        { name: 'name', label: '名称', type: 'string', required: true },
        { name: 'description', label: '简介', type: 'text', required: true },
        {
          name: 'type',
          label: '分类',
          type: 'enum',
          options: ['加密工具', '安全指南', '常用网站', '学习资源'],
          default: '学习资源',
        },
        { name: 'url', label: '官网链接（可选）', type: 'url', optional: true },
        { name: 'recommended', label: '本站推荐', type: 'boolean', default: false },
        { name: 'tags', label: '标签（逗号分隔）', type: 'tags' },
        { name: 'draft', label: '草稿', type: 'boolean', default: false },
      ],
    },
  };

  // ========== 工具函数 ==========
  const Utils = {
    slugify(text) {
      return String(text || '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[\\/:*?"<>|]/g, '')
        .toLowerCase();
    },
    today() {
      return new Date().toISOString().slice(0, 10);
    },
    // 从 schema 生成表单字段配置（含默认值）
    getDefaultFields(collectionKey) {
      const schema = Schemas[collectionKey];
      if (!schema) return [];
      return schema.fields.map((f) => ({
        ...f,
        value: f.default !== undefined ? f.default : f.type === 'tags' ? '' : '',
      }));
    },
    // 从 frontmatter data 填充字段
    fieldsFromData(collectionKey, data) {
      const schema = Schemas[collectionKey];
      if (!schema) return [];
      return schema.fields.map((f) => {
        let value = data[f.name];
        if (f.type === 'tags' && Array.isArray(value)) {
          value = value.join(', ');
        }
        if (value === undefined) {
          value = f.default !== undefined ? f.default : f.type === 'tags' ? '' : '';
        }
        return { ...f, value };
      });
    },
  };

  window.AdminUtils = { Storage, GitHub, Markdown, Schemas, Utils };
})();
