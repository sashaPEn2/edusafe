#!/usr/bin/env node
/**
 * EduSafe — генератор статических страниц блога
 * Запуск: node generate-blog.js
 * Результат: папка blog/ с отдельным .html для каждой статьи
 *            + обновлённый blog.html со ссылками на эти страницы
 *
 * Установка зависимостей (один раз):
 *   npm install contentful @contentful/rich-text-html-renderer
 */

const { createClient } = require('contentful');
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');
const fs = require('fs');
const path = require('path');

// ── Настройки Contentful ─────────────────────────────────────────────────────
const SPACE_ID    = 'r6g09taz57g1';
const ACCESS_TOKEN = 'zqICxOXNmrLbK3yIiNLMZ19XwauYoQGurJJ7p2U6uqk';
const SITE_BASE_URL = 'https://edusafe.site'; // ← замените на ваш реальный домен

// ── Папка назначения ─────────────────────────────────────────────────────────
const OUT_DIR = path.join(__dirname, 'blog');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Вспомогательные функции ──────────────────────────────────────────────────

/** Превращает заголовок в URL-slug */
function slugify(title = '') {
  return title
    .toLowerCase()
    .replace(/[а-яё]/g, ch => {
      const map = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',
                   и:'i',й:'j',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',
                   с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',
                   щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
      return map[ch] || ch;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

/** Дата в читаемом виде */
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

/** ISO-дата для <meta> */
function isoDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString();
}

/** Первый абзац как excerpt */
function getExcerpt(richDoc, maxLen = 160) {
  try {
    const para = richDoc.content.find(n => n.nodeType === 'paragraph');
    return para.content.map(n => n.value || '').join('').substring(0, maxLen).trim() + '…';
  } catch { return ''; }
}

// ── Общие стили и компоненты ─────────────────────────────────────────────────

const COMMON_CSS = `
  <style>
    :root{--ink:#0d1117;--ink-soft:#1e2633;--accent:#0057d9;--accent-light:#3b82f6;--accent-pale:#dbeafe;--teal:#0ea5c7;--mint:#d1fae5;--surface:#ffffff;--surface-2:#f5f7fb;--border:#e2e8f0;--text-muted:#64748b;--white:#ffffff;--radius-sm:8px;--radius:16px;--radius-lg:24px;--shadow-sm:0 1px 4px rgba(0,0,0,.06);--shadow:0 4px 20px rgba(0,0,0,.08);--shadow-lg:0 16px 48px rgba(0,0,0,.12)}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{font-family:'Golos Text',sans-serif;background:var(--surface-2);color:var(--ink);line-height:1.65;overflow-x:hidden}
    .container{width:100%;max-width:1180px;margin:0 auto;padding:0 1.5rem}
    header{background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:200}
    .header-inner{display:flex;align-items:center;justify-content:space-between;height:68px;gap:1rem}
    .logo{display:flex;align-items:center;gap:.6rem;text-decoration:none;flex-shrink:0}
    .logo-icon{width:38px;height:38px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1rem}
    .logo-text{font-family:'Unbounded',sans-serif;font-weight:700;font-size:1.2rem;color:var(--ink)}
    .nav-desktop{display:flex;align-items:center;gap:.25rem}
    .nav-desktop a{text-decoration:none;color:var(--text-muted);font-weight:500;font-size:.88rem;padding:.45rem .85rem;border-radius:var(--radius-sm);transition:all .2s;white-space:nowrap;display:flex;align-items:center;gap:.4rem}
    .nav-desktop a:hover,.nav-desktop a.active{background:var(--accent-pale);color:var(--accent)}
    .header-right{display:flex;align-items:center;gap:.75rem;flex-shrink:0}
    .lang-select{padding:.4rem .7rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--ink);font-size:.85rem;font-family:'Golos Text',sans-serif;cursor:pointer;outline:none}
    .burger{display:none;background:none;border:none;color:var(--ink);font-size:1.4rem;cursor:pointer;padding:.3rem;border-radius:8px;transition:background .2s}
    .burger:hover{background:var(--surface-2)}
    footer{background:#070b11;color:#64748b;padding:3rem 0 2rem}
    .footer-top{display:flex;align-items:flex-start;justify-content:space-between;gap:2rem;flex-wrap:wrap;margin-bottom:2rem;padding-bottom:2rem;border-bottom:1px solid rgba(255,255,255,.07)}
    .footer-brand{max-width:320px}
    .footer-logo{display:flex;align-items:center;gap:.6rem;text-decoration:none;margin-bottom:.75rem}
    .footer-logo .logo-icon{background:var(--accent)}
    .footer-logo .logo-text{color:#fff;font-size:1.1rem}
    .footer-brand p{font-size:.85rem;line-height:1.65}
    .footer-nav-title{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:.75rem}
    .footer-links{list-style:none;display:flex;flex-direction:column;gap:.4rem}
    .footer-links a{text-decoration:none;color:#64748b;font-size:.88rem;transition:color .2s}
    .footer-links a:hover{color:#94a3b8}
    .footer-bottom{font-size:.78rem;text-align:center;display:flex;flex-direction:column;gap:.4rem}
    @media(max-width:900px){.nav-desktop{display:none}.burger{display:flex}}
    @media(max-width:600px){.footer-top{flex-direction:column}}
  </style>`;

const HEAD_LINKS = `
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;700;800&family=Golos+Text:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>`;

function headerHtml() {
  return `
<header>
  <div class="container">
    <div class="header-inner">
      <a href="../index.html" class="logo">
        <div class="logo-icon"><i class="fas fa-shield-alt"></i></div>
        <span class="logo-text">EduSafe</span>
      </a>
      <nav class="nav-desktop">
        <a href="../index.html"><i class="fas fa-home"></i><span>Главная</span></a>
        <a href="../theory.html"><i class="fas fa-book-open"></i><span>Теория</span></a>
        <a href="../choice-sp.html"><i class="fas fa-lightbulb"></i><span>Практика</span></a>
        <a href="../videos.html"><i class="fas fa-play-circle"></i><span>Видео</span></a>
        <a href="../quiz.html"><i class="fas fa-graduation-cap"></i><span>Викторина</span></a>
        <a href="../blog.html" class="active"><i class="fas fa-pen-nib"></i><span>Блог</span></a>
        <a href="../contact.html"><i class="fas fa-exclamation-circle"></i><span>Жалоба</span></a>
      </nav>
      <div class="header-right">
        <select class="lang-select"><option value="ru">🇧🇾 Русский</option><option value="en">🇬🇧 English</option></select>
        <button class="burger" aria-label="Меню"><i class="fas fa-bars"></i></button>
      </div>
    </div>
  </div>
</header>`;
}

function footerHtml() {
  return `
<footer>
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <a href="../index.html" class="footer-logo">
          <div class="logo-icon"><i class="fas fa-shield-alt"></i></div>
          <span class="logo-text">EduSafe</span>
        </a>
        <p>Республиканский информационно-практический ресурс для педагогов и студентов</p>
      </div>
      <div>
        <div class="footer-nav-title">Разделы</div>
        <ul class="footer-links">
          <li><a href="../index.html">Главная</a></li>
          <li><a href="../theory.html">Теория</a></li>
          <li><a href="../choice-sp.html">Практика</a></li>
          <li><a href="../videos.html">Видео</a></li>
          <li><a href="../quiz.html">Викторина</a></li>
          <li><a href="../blog.html">Блог</a></li>
          <li><a href="../contact.html">Жалоба</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div>© 2025 Невдах Александр, УО «Белорусский государственный экономический университет»</div>
      <div>Ресурс не использует cookies и не собирает персональные данные пользователей.</div>
      <div>Все материалы носят информационно-просветительский характер и соответствуют действующему законодательству Республики Беларусь.</div>
    </div>
  </div>
</footer>`;
}

// ── Шаблон страницы статьи ───────────────────────────────────────────────────

function buildPostPage(item, slug) {
  const f    = item.fields;
  const id   = item.sys.id;
  const date = formatDate(f.date);
  const iso  = isoDate(f.date);
  const excerpt = f.content ? getExcerpt(f.content) : '';
  const imgUrl  = f.image ? 'https:' + f.image.fields.file.url : '';
  const pageUrl = `${SITE_BASE_URL}/blog/${slug}.html`;

  // Рендер Contentful Rich Text → HTML
  let contentHtml = '';
  if (f.content && f.content.nodeType === 'document') {
    contentHtml = documentToHtmlString(f.content, {
      renderNode: {
        'embedded-asset-block': node =>
          `<img src="https:${node.data.target.fields.file.url}" class="rich-img" alt=""/>`,
      }
    });
  }

  // JSON-LD Schema.org для статьи
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: f.title || '',
    description: excerpt,
    datePublished: iso,
    dateModified: iso,
    image: imgUrl || undefined,
    url: pageUrl,
    author: {
      '@type': 'Person',
      name: 'Невдах Александр'
    },
    publisher: {
      '@type': 'Organization',
      name: 'EduSafe',
      url: SITE_BASE_URL
    },
    inLanguage: 'ru'
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

  <!-- SEO -->
  <title>${f.title || 'Статья'} — EduSafe</title>
  <meta name="description" content="${excerpt}"/>
  <link rel="canonical" href="${pageUrl}"/>

<!-- Vercel Speed Insights -->
<script>
  window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
</script>
<script defer src="/_vercel/speed-insights/script.js"></script>

<!-- Yandex.Metrika counter -->
<script type="text/javascript">
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=109089619', 'ym');

    ym(109089619, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/109089619" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Yandex.Metrika counter -->

  <!-- Open Graph -->
  <meta property="og:type" content="article"/>
  <meta property="og:title" content="${f.title || ''}"/>
  <meta property="og:description" content="${excerpt}"/>
  <meta property="og:url" content="${pageUrl}"/>
  ${imgUrl ? `<meta property="og:image" content="${imgUrl}"/>` : ''}
  <meta property="article:published_time" content="${iso}"/>

  <!-- Schema.org -->
  <script type="application/ld+json">${jsonLd}</script>

  ${HEAD_LINKS}
  ${COMMON_CSS}
  <style>
    .back-btn{display:inline-flex;align-items:center;gap:.5rem;color:var(--text-muted);text-decoration:none;margin-bottom:2rem;font-weight:500;font-size:.9rem;padding:.5rem 1rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);transition:all .2s}
    .back-btn:hover{color:var(--accent);border-color:var(--accent);transform:translateX(-3px)}
    .single-post-wrap{max-width:820px;margin:0 auto;padding:3rem 0 5rem}
    .single-post{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow)}
    .post-header{padding:2.5rem 3rem 2rem}
    .post-meta-row{display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem;flex-wrap:wrap}
    .post-tag{background:var(--accent-pale);color:var(--accent);font-size:.78rem;font-weight:700;padding:.3rem .8rem;border-radius:999px;text-transform:uppercase;letter-spacing:.06em}
    .post-meta-date{font-size:.85rem;color:var(--text-muted);display:flex;align-items:center;gap:.35rem}
    .article-title{font-family:'Unbounded',sans-serif;font-size:clamp(1.4rem,3vw,2.1rem);font-weight:700;color:var(--ink);line-height:1.22;letter-spacing:-.02em}
    .post-main-poster{width:100%;max-height:420px;object-fit:cover;display:block}
    .post-body{padding:2.5rem 3rem 3rem}
    .post-content{font-size:1.08rem;line-height:1.85;color:#374151}
    .post-content h1,.post-content h2,.post-content h3{font-family:'Unbounded',sans-serif;color:var(--ink);margin-top:2rem;margin-bottom:.9rem;line-height:1.3;letter-spacing:-.01em}
    .post-content h1{font-size:1.8rem}
    .post-content h2{font-size:1.35rem;border-bottom:1px solid var(--border);padding-bottom:.5rem}
    .post-content h3{font-size:1.15rem}
    .post-content p{margin-bottom:1.2rem}
    .post-content strong{color:var(--ink);font-weight:600}
    .post-content em{font-style:italic;color:var(--text-muted)}
    .post-content ul,.post-content ol{margin:1.25rem 0;padding-left:1.5rem}
    .post-content li{margin-bottom:.5rem}
    .post-content blockquote{border-left:3px solid var(--accent);margin:1.75rem 0;padding:.75rem 1.5rem;background:var(--accent-pale);border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-style:italic;color:var(--ink-soft)}
    .post-content a{color:var(--accent);text-decoration:underline;font-weight:500}
    .rich-img{max-width:100%;height:auto;border-radius:var(--radius);margin:2rem 0;display:block;box-shadow:var(--shadow)}
    #comments-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:2.5rem 3rem;margin-top:2rem}
    #comments-section h3{font-family:'Unbounded',sans-serif;font-size:1.1rem;font-weight:700;color:var(--ink);margin-bottom:1.5rem;letter-spacing:-.01em}
    @media(max-width:600px){.post-header{padding:1.75rem 1.5rem 1.5rem}.post-body{padding:1.5rem}.single-post-wrap{padding:2rem 0 4rem}#comments-section{padding:1.5rem}}
  </style>
</head>
<body>

${headerHtml()}

<main>
  <div class="container">
    <div class="single-post-wrap">
      <a href="../blog.html" class="back-btn"><i class="fas fa-arrow-left"></i> Назад к списку</a>
      <article class="single-post" itemscope itemtype="https://schema.org/BlogPosting">
        <div class="post-header">
          <div class="post-meta-row">
            <span class="post-tag"><i class="fas fa-pen-nib"></i> Блог</span>
            <span class="post-meta-date"><i class="far fa-calendar-alt"></i> ${date}</span>
          </div>
          <h1 class="article-title" itemprop="headline">${f.title || 'Без названия'}</h1>
        </div>
        ${imgUrl ? `<img src="${imgUrl}" class="post-main-poster" alt="${f.title || ''}" itemprop="image">` : ''}
        <div class="post-body">
          <div class="post-content" itemprop="articleBody">${contentHtml}</div>
        </div>
      </article>

      <div id="comments-section">
        <h3><i class="fas fa-comments" style="color:var(--accent);margin-right:.5rem"></i>Комментарии</h3>
        <div id="disqus_thread"></div>
      </div>
    </div>
  </div>
</main>

${footerHtml()}

<script>
  var disqus_config = function () {
    this.page.url  = '${pageUrl}';
    this.page.identifier = '${id}';
  };
  (function() {
    var d = document, s = d.createElement('script');
    s.src = 'https://edusafe-test.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
  })();
</script>
</body>
</html>`;
}

// ── Генерация blog.html (список статей) ──────────────────────────────────────
// Этот файл обновляется при каждом запуске скрипта — ссылки ведут на статичные страницы

function buildIndexPage(posts) {
  const cardsHtml = posts.map((item, i) => {
    const f = item.fields;
    const slug = slugify(f.title) || item.sys.id;
    const date = formatDate(f.date);
    const imgUrl = f.image ? 'https:' + f.image.fields.file.url : '';
    let excerpt = 'Читать далее...';
    try {
      excerpt = f.content.content.find(n => n.nodeType === 'paragraph')
        .content[0].value.substring(0, 120) + '...';
    } catch(e) {}

    return `
      <a class="post-card" href="blog/${slug}.html">
        ${imgUrl ? `<div class="card-image-wrap"><img src="${imgUrl}" class="card-image" alt="${f.title || ''}" loading="lazy"></div>` : ''}
        <div class="card-content">
          <div class="card-meta">
            <span class="card-date"><i class="far fa-calendar-alt"></i> ${date}</span>
            <span class="card-tag">Блог</span>
          </div>
          <h3 class="card-title">${f.title || 'Без названия'}</h3>
          <p class="card-excerpt">${excerpt}</p>
          <span class="read-more">Читать далее <i class="fas fa-arrow-right fa-xs"></i></span>
        </div>
      </a>`;
  }).join('\n');

  // JSON-LD для страницы списка
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'EduSafe Блог',
    url: `${SITE_BASE_URL}/blog.html`,
    description: 'Актуальные новости и советы по защите персональных данных в образовании',
    blogPost: posts.map(item => ({
      '@type': 'BlogPosting',
      headline: item.fields.title || '',
      url: `${SITE_BASE_URL}/blog/${slugify(item.fields.title) || item.sys.id}.html`,
      datePublished: isoDate(item.fields.date)
    }))
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="ru" id="htmlRoot">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="description" content="Блог EduSafe — актуальные новости и советы по защите персональных данных в образовании."/>
  <title>Блог — EduSafe</title>
  <link rel="canonical" href="${SITE_BASE_URL}/blog.html"/>

  <!-- Vercel Speed Insights -->
  <script>
    window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/speed-insights/script.js"></script>

  <meta property="og:type" content="website"/>
  <meta property="og:title" content="Блог — EduSafe"/>
  <meta property="og:description" content="Актуальные новости и советы по защите персональных данных в образовании."/>
  <meta property="og:url" content="${SITE_BASE_URL}/blog.html"/>
  <script type="application/ld+json">${jsonLd}</script>

  <link rel="icon" href="./favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;700;800&family=Golos+Text:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
  <style>
    :root{--ink:#0d1117;--ink-soft:#1e2633;--accent:#0057d9;--accent-light:#3b82f6;--accent-pale:#dbeafe;--teal:#0ea5c7;--mint:#d1fae5;--surface:#ffffff;--surface-2:#f5f7fb;--border:#e2e8f0;--text-muted:#64748b;--white:#ffffff;--radius-sm:8px;--radius:16px;--radius-lg:24px;--shadow-sm:0 1px 4px rgba(0,0,0,.06);--shadow:0 4px 20px rgba(0,0,0,.08);--shadow-lg:0 16px 48px rgba(0,0,0,.12)}
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{font-family:'Golos Text',sans-serif;background:var(--surface-2);color:var(--ink);line-height:1.65;overflow-x:hidden}
    .container{width:100%;max-width:1180px;margin:0 auto;padding:0 1.5rem}
    header{background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:200}
    .header-inner{display:flex;align-items:center;justify-content:space-between;height:68px;gap:1rem}
    .logo{display:flex;align-items:center;gap:.6rem;text-decoration:none;flex-shrink:0}
    .logo-icon{width:38px;height:38px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1rem}
    .logo-text{font-family:'Unbounded',sans-serif;font-weight:700;font-size:1.2rem;color:var(--ink)}
    .nav-desktop{display:flex;align-items:center;gap:.25rem}
    .nav-desktop a{text-decoration:none;color:var(--text-muted);font-weight:500;font-size:.88rem;padding:.45rem .85rem;border-radius:var(--radius-sm);transition:all .2s;white-space:nowrap;display:flex;align-items:center;gap:.4rem}
    .nav-desktop a:hover,.nav-desktop a.active{background:var(--accent-pale);color:var(--accent)}
    .header-right{display:flex;align-items:center;gap:.75rem;flex-shrink:0}
    .lang-select{padding:.4rem .7rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--ink);font-size:.85rem;font-family:'Golos Text',sans-serif;cursor:pointer;outline:none}
    .burger{display:none;background:none;border:none;color:var(--ink);font-size:1.4rem;cursor:pointer;padding:.3rem;border-radius:8px;transition:background .2s}
    .burger:hover{background:var(--surface-2)}
    .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(3px);z-index:300;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}
    .drawer-overlay.open{opacity:1;visibility:visible}
    .drawer{position:fixed;top:0;right:0;width:min(88%,340px);height:100%;background:var(--surface);z-index:301;transform:translateX(100%);transition:transform .35s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;padding:1.5rem}
    .drawer-overlay.open .drawer{transform:translateX(0)}
    .drawer-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:1.25rem;border-bottom:1px solid var(--border);margin-bottom:1.25rem}
    .drawer-close{background:var(--surface-2);border:none;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;color:var(--text-muted)}
    .drawer-nav{display:flex;flex-direction:column;gap:.5rem}
    .drawer-nav a{display:flex;align-items:center;gap:.75rem;padding:.8rem 1rem;border-radius:var(--radius-sm);text-decoration:none;color:var(--ink);font-weight:500;transition:all .2s}
    .drawer-nav a i{color:var(--accent);width:18px;text-align:center}
    .drawer-nav a:hover,.drawer-nav a.active{background:var(--accent-pale);color:var(--accent)}
    .drawer-lang{margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid var(--border)}
    .hero{background:var(--ink);position:relative;overflow:hidden;padding:4.5rem 0 3.5rem}
    .hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(59,130,246,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.08) 1px,transparent 1px);background-size:48px 48px}
    .hero-glow{position:absolute;width:600px;height:600px;background:radial-gradient(circle,rgba(0,87,217,.35) 0%,transparent 70%);top:-200px;right:-100px;pointer-events:none}
    .hero-glow-2{position:absolute;width:400px;height:400px;background:radial-gradient(circle,rgba(14,165,199,.2) 0%,transparent 70%);bottom:-150px;left:-50px;pointer-events:none}
    .hero-content{position:relative;z-index:2;text-align:center;max-width:820px;margin:0 auto}
    .hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3);color:#93c5fd;font-size:.8rem;font-weight:600;padding:.45rem 1rem;border-radius:999px;margin-bottom:1.5rem;letter-spacing:.02em}
    .hero h1{font-family:'Unbounded',sans-serif;font-size:clamp(1.75rem,4vw,2.75rem);font-weight:700;color:var(--white);line-height:1.2;margin-bottom:1.25rem;letter-spacing:-.02em}
    .hero h1 span{background:linear-gradient(135deg,#60a5fa,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .hero-sub{font-size:1.05rem;color:#94a3b8;max-width:600px;margin:0 auto;line-height:1.7}
    .section{padding:4rem 0 5rem}
    .section-tag{display:inline-block;background:var(--accent-pale);color:var(--accent);font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;padding:.35rem .9rem;border-radius:999px;margin-bottom:1rem}
    .section-title{font-family:'Unbounded',sans-serif;font-size:clamp(1.4rem,2.5vw,2rem);font-weight:700;color:var(--ink);margin-bottom:.75rem;letter-spacing:-.02em;line-height:1.25}
    .section-sub{font-size:1rem;color:var(--text-muted);max-width:580px;line-height:1.7}
    .section-header{margin-bottom:3rem}
    .section-header.centered{text-align:center}
    .section-header.centered .section-sub{margin:0 auto}
    .posts-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
    .post-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;display:flex;flex-direction:column;transition:transform .25s,box-shadow .25s,border-color .25s;position:relative;text-decoration:none;color:inherit}
    .post-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent);border-radius:999px 999px 0 0;opacity:0;transition:opacity .25s}
    .post-card:hover{transform:translateY(-5px);box-shadow:var(--shadow-lg);border-color:transparent}
    .post-card:hover::before{opacity:1}
    .card-image-wrap{width:100%;height:210px;overflow:hidden;background:var(--surface-2)}
    .card-image{width:100%;height:100%;object-fit:cover;transition:transform .5s}
    .post-card:hover .card-image{transform:scale(1.05)}
    .card-content{padding:1.5rem;flex:1;display:flex;flex-direction:column;gap:.6rem}
    .card-meta{display:flex;align-items:center;gap:.75rem}
    .card-date{font-size:.8rem;color:var(--text-muted);display:flex;align-items:center;gap:.35rem}
    .card-tag{font-size:.72rem;font-weight:600;background:var(--accent-pale);color:var(--accent);padding:.2rem .6rem;border-radius:999px;text-transform:uppercase;letter-spacing:.06em}
    .card-title{font-family:'Unbounded',sans-serif;font-size:.98rem;font-weight:700;color:var(--ink);line-height:1.35;margin:0}
    .card-excerpt{font-size:.88rem;color:var(--text-muted);line-height:1.65;flex:1}
    .read-more{display:inline-flex;align-items:center;gap:.4rem;font-weight:600;font-size:.85rem;color:var(--accent);margin-top:.5rem;transition:gap .2s}
    .read-more:hover{gap:.65rem}
    .loading{text-align:center;padding:5rem 1.5rem;font-size:1.1rem;color:var(--text-muted)}
    footer{background:#070b11;color:#64748b;padding:3rem 0 2rem}
    .footer-top{display:flex;align-items:flex-start;justify-content:space-between;gap:2rem;flex-wrap:wrap;margin-bottom:2rem;padding-bottom:2rem;border-bottom:1px solid rgba(255,255,255,.07)}
    .footer-brand{max-width:320px}
    .footer-logo{display:flex;align-items:center;gap:.6rem;text-decoration:none;margin-bottom:.75rem}
    .footer-logo .logo-icon{background:var(--accent)}
    .footer-logo .logo-text{color:#fff;font-size:1.1rem}
    .footer-brand p{font-size:.85rem;line-height:1.65}
    .footer-nav-title{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:.75rem}
    .footer-links{list-style:none;display:flex;flex-direction:column;gap:.4rem}
    .footer-links a{text-decoration:none;color:#64748b;font-size:.88rem;transition:color .2s}
    .footer-links a:hover{color:#94a3b8}
    .footer-bottom{font-size:.78rem;text-align:center;display:flex;flex-direction:column;gap:.4rem}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    .anim{opacity:0}
    .anim.visible{animation:fadeUp .55s ease both}
    .anim-d1{animation-delay:.05s}
    .anim-d2{animation-delay:.12s}
    .anim-d3{animation-delay:.19s}
    @media(max-width:900px){.posts-grid{grid-template-columns:1fr 1fr}.nav-desktop{display:none}.burger{display:flex}}
    @media(max-width:600px){.posts-grid{grid-template-columns:1fr}.hero{padding:3rem 0 2.5rem}.section{padding:3rem 0 4rem}.footer-top{flex-direction:column}}
  </style>
</head>
<body>

<header>
  <div class="container">
    <div class="header-inner">
      <a href="index.html" class="logo">
        <div class="logo-icon"><i class="fas fa-shield-alt"></i></div>
        <span class="logo-text">EduSafe</span>
      </a>
      <nav class="nav-desktop">
        <a href="index.html"><i class="fas fa-home"></i><span>Главная</span></a>
        <a href="theory.html"><i class="fas fa-book-open"></i><span>Теория</span></a>
        <a href="choice-sp.html"><i class="fas fa-lightbulb"></i><span>Практика</span></a>
        <a href="videos.html"><i class="fas fa-play-circle"></i><span>Видео</span></a>
        <a href="quiz.html"><i class="fas fa-graduation-cap"></i><span>Викторина</span></a>
        <a href="blog.html" class="active"><i class="fas fa-pen-nib"></i><span>Блог</span></a>
        <a href="contact.html"><i class="fas fa-exclamation-circle"></i><span>Жалоба</span></a>
      </nav>
      <div class="header-right">
        <select class="lang-select" id="languageSelector">
          <option value="ru">🇧🇾 Русский</option>
          <option value="en">🇬🇧 English</option>
        </select>
        <button class="burger" id="navToggle" aria-label="Меню"><i class="fas fa-bars"></i></button>
      </div>
    </div>
  </div>
</header>

<div class="drawer-overlay" id="drawerOverlay">
  <div class="drawer">
    <div class="drawer-head">
      <div class="logo">
        <div class="logo-icon"><i class="fas fa-shield-alt"></i></div>
        <span class="logo-text">EduSafe</span>
      </div>
      <button class="drawer-close" id="drawerClose"><i class="fas fa-times"></i></button>
    </div>
    <nav class="drawer-nav">
      <a href="index.html"><i class="fas fa-home"></i><span>Главная</span></a>
      <a href="theory.html"><i class="fas fa-book-open"></i><span>Теория</span></a>
      <a href="choice-sp.html"><i class="fas fa-lightbulb"></i><span>Практика</span></a>
      <a href="videos.html"><i class="fas fa-play-circle"></i><span>Видео</span></a>
      <a href="quiz.html"><i class="fas fa-graduation-cap"></i><span>Виктор��на</span></a>
      <a href="blog.html" class="active"><i class="fas fa-pen-nib"></i><span>Блог</span></a>
      <a href="contact.html"><i class="fas fa-exclamation-circle"></i><span>Жалоба</span></a>
    </nav>
    <div class="drawer-lang">
      <select class="lang-select" id="mobileLanguageSelector" style="width:100%">
        <option value="ru">🇧🇾 Ру��ский</option>
        <option value="en">🇬🇧 English</option>
      </select>
    </div>
  </div>
</div>

<section class="hero">
  <div class="hero-grid"></div>
  <div class="hero-glow"></div>
  <div class="hero-glow-2"></div>
  <div class="container">
    <div class="hero-content">
      <div class="hero-badge anim"><i class="fas fa-pen-nib"></i><span>EduSafe · Блог</span></div>
      <h1 class="anim anim-d1">Актуальные <span>новости и советы</span> по безопасности данных</h1>
      <p class="hero-sub anim anim-d2">Экспертные материалы о защите персональных данных в образовательной среде Республики Беларусь</p>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-header centered anim">
      <span class="section-tag">Блог</span>
      <h2 class="section-title">Последние публикации</h2>
      <p class="section-sub">Разборы ситуаций, правовые новости и практические советы по цифровой безопасности</p>
    </div>
    <div class="posts-grid">
      ${cardsHtml}
    </div>
  </div>
</section>

<footer>
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <a href="index.html" class="footer-logo">
          <div class="logo-icon"><i class="fas fa-shield-alt"></i></div>
          <span class="logo-text">EduSafe</span>
        </a>
        <p>Республиканский информационно-практический ресурс для педагогов и студентов</p>
      </div>
      <div>
        <div class="footer-nav-title">Разделы</div>
        <ul class="footer-links">
          <li><a href="index.html">Главная</a></li>
          <li><a href="theory.html">Теория</a></li>
          <li><a href="choice-sp.html">Практика</a></li>
          <li><a href="videos.html">Видео</a></li>
          <li><a href="quiz.html">Викторина</a></li>
          <li><a href="blog.html">Блог</a></li>
          <li><a href="contact.html">Жалоба</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div>© 2025 Невдах Александр, УО «Белорусский государственный экономический университет»</div>
      <div>Ресурс не использует cookies и не собирает персональные данные пользователей.</div>
      <div>Все материалы носят информационно-просветительский характер и соответствуют действующему законодательству Республики Беларусь.</div>
    </div>
  </div>
</footer>

<script>
  const overlay = document.getElementById('drawerOverlay');
  document.getElementById('navToggle').addEventListener('click', () => {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  function closeDrawer() { overlay.classList.remove('open'); document.body.style.overflow = ''; }
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeDrawer(); });
  document.querySelectorAll('.drawer-nav a').forEach(a => a.addEventListener('click', closeDrawer));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.anim').forEach(el => observer.observe(el));
</script>
</body>
</html>`;
}

// ── Генерация sitemap.xml ────────────────────────────────────────────────────

function buildSitemap(posts, slugMap) {
  const now = new Date().toISOString().split('T')[0];
  const urls = [
    `<url><loc>${SITE_BASE_URL}/blog.html</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    ...posts.map(item => {
      const slug = slugMap[item.sys.id];
      const lastmod = item.fields.date ? new Date(item.fields.date).toISOString().split('T')[0] : now;
      return `<url><loc>${SITE_BASE_URL}/blog/${slug}.html</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
    })
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📡 Подключаемся к Contentful...');
  const client = createClient({ space: SPACE_ID, accessToken: ACCESS_TOKEN });

  console.log('📥 Загружаем статьи...');
  const response = await client.getEntries({
    content_type: 'blogPost',
    order: '-fields.date',
    include: 2,
    limit: 1000
  });

  if (!response.items.length) {
    console.log('⚠️  Статьи не найдены.');
    return;
  }

  console.log(`✅ Найдено статей: ${response.items.length}`);

  const slugMap = {};

  // Генерация страниц статей
  for (const item of response.items) {
    const slug = slugify(item.fields.title) || item.sys.id;
    slugMap[item.sys.id] = slug;

    const html = buildPostPage(item, slug);
    const filePath = path.join(OUT_DIR, `${slug}.html`);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  📄 blog/${slug}.html`);
  }

  // Обновлённый blog.html (список)
  const indexHtml = buildIndexPage(response.items);
  const indexPath = path.join(__dirname, 'blog.html');
  fs.writeFileSync(indexPath, indexHtml, 'utf8');
  console.log('  📄 blog.html (обновлён)');

  // Sitemap
  const sitemap = buildSitemap(response.items, slugMap);
  const sitemapPath = path.join(__dirname, 'sitemap-blog.xml');
  fs.writeFileSync(sitemapPath, sitemap, 'utf8');
  console.log('  🗺  sitemap-blog.xml');

  console.log('\n🎉 Готово! Загрузите папку blog/ и файлы blog.html + sitemap-blog.xml на хостинг.');
}

main().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});
