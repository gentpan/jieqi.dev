/* 节期 · jieqi.dev · v1 — dependency-free, no cookies or visitor tracking. */
(() => {
  'use strict';
  const script = document.currentScript;
  if (!script || !script.src) return;
  const origin = new URL(script.src).origin;
  const defaultStyle = script.dataset.style || 'stamp';
  const assetOrigin = origin === 'https://api.jieqi.dev' ? 'https://static.jieqi.dev' : origin;
  const imageUrl = (value) => {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value, assetOrigin);
      return [origin, assetOrigin].includes(url.origin) && /^\/assets\/[a-zA-Z0-9._-]+$/.test(url.pathname) && !url.search && !url.hash && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  };
  if (window.Jieqi) {
    if (script.dataset.mode === 'popup') window.Jieqi.start();
    return;
  }
  const memory = new Set();
  let active = false;
  let popupHost;
  let timer;
  let displayTimer;
  let pending = false;
  let generation = 0;
  let lastAttempt = 0;
  const css = `:host{font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#30382e;display:block;color-scheme:light;--jieqi-bg:#fffdf7;--jieqi-text:#30382e;--jieqi-muted:#626c5b;--jieqi-accent:#a23e32}*{box-sizing:border-box}.card{position:relative;background:var(--jieqi-bg);color:var(--jieqi-text);border:1px solid #e0dfd1;border-radius:10px;padding:32px;display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);grid-template-areas:"copy art" "signoff dates";gap:20px 28px;width:100%;text-align:left;box-shadow:0 16px 50px #242d2310}.copy{grid-area:copy;align-self:center;min-width:0}.kind{font-size:12px;letter-spacing:2px;color:var(--jieqi-muted);margin:0 0 20px}.name{font-family:"Songti SC",STSong,serif;font-size:44px;letter-spacing:8px;line-height:1.3;margin:0 0 14px;font-weight:600}.date{font:13px monospace;letter-spacing:1px;color:var(--jieqi-muted);line-height:1.7}.quote{white-space:pre-line;font-family:"Songti SC",STSong,serif;color:var(--jieqi-accent);font-size:22px;line-height:1.8;margin:20px 0 12px}.description{font-size:16px;line-height:1.9;color:var(--jieqi-muted);margin:0}.lunar-date{font-size:14px;line-height:1.8;color:var(--jieqi-muted);margin:8px 0 0}.description+.description{margin-top:12px}.holiday{font-size:13px;color:var(--jieqi-accent);line-height:1.8}.art{grid-area:art;min-width:0;display:flex;align-items:center;justify-content:center}.art img{display:block;width:100%;max-width:200px;height:auto;aspect-ratio:2/3;object-fit:contain;transform:rotate(4deg)}.dates{grid-area:dates;align-self:center;display:flex;flex-wrap:wrap;align-items:baseline;justify-content:center;gap:4px 12px;text-align:center}.dates .date,.dates .lunar-date{margin:0;font-size:14px;letter-spacing:0;line-height:1.7}.card.no-art{grid-template-columns:1fr;grid-template-areas:"copy" "dates" "signoff"}.footer{grid-area:signoff;align-self:center;font-size:12px;margin:0;color:var(--jieqi-muted);letter-spacing:2px}.close{position:absolute;right:12px;top:12px;border:1px solid #a7ad9d;border-radius:50%;background:var(--jieqi-bg);color:var(--jieqi-text);width:34px;height:34px;font-size:24px;line-height:1;cursor:pointer;z-index:2}.reopen{position:fixed;right:20px;bottom:20px;z-index:2147483000;border:1px solid #d1d3c5;background:var(--jieqi-bg);color:var(--jieqi-text);border-radius:50%;width:52px;height:52px;font-family:"Songti SC",STSong,serif;font-size:22px;box-shadow:0 5px 20px #26332422;cursor:pointer}.close:focus-visible,.reopen:focus-visible{outline:2px solid var(--jieqi-accent);outline-offset:4px}dialog{border:0;padding:0;background:transparent;width:min(880px,calc(100vw - 48px));height:fit-content;max-width:none;max-height:calc(100dvh - 64px);overflow:auto;position:fixed;inset:0;margin:auto;box-shadow:0 20px 90px #16201233;border-radius:10px}dialog::backdrop{background:#20291e66}.status{padding:16px;font-size:14px;color:var(--jieqi-muted)}@media(max-width:600px){.card{grid-template-columns:1fr;grid-template-areas:"art" "dates" "copy" "signoff";padding:28px 24px;gap:22px}.art{grid-row:1}.art img{width:140px}.name{font-size:40px}.quote{font-size:22px}.description{font-size:16px}.kind{margin-bottom:14px}dialog{width:calc(100vw - 32px);max-height:calc(100dvh - 48px)}.reopen{bottom:16px;right:16px}.footer{margin-top:0}}@media(prefers-color-scheme:dark){:host(:not([theme="light"])){--jieqi-bg:#252b25;--jieqi-text:#eeeee5;--jieqi-muted:#c2cbb9;--jieqi-accent:#e6a18c}.card{border-color:#697263}}:host([theme="dark"]){--jieqi-bg:#252b25;--jieqi-text:#eeeee5;--jieqi-muted:#c2cbb9;--jieqi-accent:#e6a18c}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}`;
  const element = (tag, className, text) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  };
  const read = (key) => {
    if (memory.has(key)) return true;
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  };
  const mark = (key) => {
    memory.add(key);
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* device disallows storage */
    }
  };
  const get = async (path, style = defaultStyle) => {
    const url = new URL(path, origin);
    url.searchParams.set('style', style);
    const response = await fetch(url.href, {
      credentials: 'omit',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Jieqi service unavailable');
    return response.json();
  };
  const chinaDate = () =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  const calendar = async (style = defaultStyle) =>
    get('/v1/calendar/' + chinaDate().slice(0, 4) + '.json', style);
  function createCard(event) {
    const article = element('article', 'card');
    const copy = element('div', 'copy');
    copy.append(
      element(
        'p',
        'kind',
        event.category === 'solar-term'
          ? '二十四节气 · 节期来信'
          : '中国节日 · 节期来信',
      ),
    );
    const title = element('h2', 'name', event.card.name);
    title.id = 'jieqi-title';
    copy.append(title);
    const dates = element('div', 'dates');
    dates.setAttribute('aria-label', '公历与农历日期');
    dates.append(
      element(
        'p',
        'date',
        '公历 ' + event.start.replaceAll('-', '/') +
          (event.end !== event.start
            ? ' — ' + event.end.replaceAll('-', '/')
            : ''),
      ),
    );
    if (event.lunarStart) dates.append(element('p', 'lunar-date', '农历 ' + event.lunarStart.label + (event.end !== event.start && event.lunarEnd ? ' — ' + event.lunarEnd.label : '')));
    if (event.card.quote) copy.append(element('p', 'quote', event.card.quote));
    for (const paragraph of event.card.description.split(/\n\s*\n/)) copy.append(element('p', 'description', paragraph));
    if (event.category === 'holiday')
      copy.append(
        element(
          'p',
          'holiday',
          event.name +
            (event.workdays.length
              ? ' · 补班：' + event.workdays.join('、')
              : ''),
        ),
      );
    article.append(copy);
    const illustration = imageUrl(event.card.image);
    if (illustration) {
      const art = element('div', 'art');
      const img = element('img');
      img.src = illustration;
      img.alt = event.card.name + '插画';
      img.width = 1024;
      img.height = 1536;
      img.addEventListener(
        'error',
        () => {
          art.remove();
          article.classList.add('no-art');
        },
        { once: true },
      );
      art.append(img);
      article.append(art);
    } else article.classList.add('no-art');
    article.append(element('p', 'footer', '愿日子有光，心有所期。'), dates);
    return article;
  }
  function shadow(host) {
    const root = host.attachShadow({ mode: 'open' });
    const style = element('style');
    style.textContent = css;
    root.append(style);
    return root;
  }
  function show(event, dedupeKey) {
    if (popupHost) {
      popupHost.remove();
      popupHost = undefined;
    }
    const host = element('div');
    popupHost = host;
    const root = shadow(host);
    const dialog = element('dialog');
    dialog.setAttribute('aria-labelledby', 'jieqi-title');
    const card = createCard(event);
    const close = element('button', 'close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', '关闭节日卡片');
    close.addEventListener('click', () => dialog.close());
    card.append(close);
    dialog.append(card);
    const reopen = element('button', 'reopen', '节');
    reopen.type = 'button';
    reopen.hidden = true;
    reopen.setAttribute('aria-label', '重新查看' + event.card.name + '卡片');
    reopen.addEventListener('click', () => {
      reopen.hidden = true;
      dialog.showModal();
    });
    dialog.addEventListener('close', () => {
      reopen.hidden = false;
    });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        )
          dialog.close();
      }
    });
    root.append(dialog, reopen);
    document.body.append(host);
    dialog.showModal();
    close.focus();
    if (dedupeKey) mark(dedupeKey);
  }
  const candidateKey = (result, event) =>
    'jieqi:' +
    (result.popup.frequency === 'once-per-day' ? result.date : event.key);
  function scheduleRefresh(result) {
    clearTimeout(timer);
    const delay = Math.max(
      1000,
      Math.min(86400000, Date.parse(result.nextCheckAt) - Date.now() + 1000),
    );
    timer = setTimeout(refresh, Number.isFinite(delay) ? delay : 60000);
  }
  async function refresh() {
    if (!active || pending || document.visibilityState === 'hidden') return;
    if (Date.now() - lastAttempt < 1000) return;
    pending = true;
    lastAttempt = Date.now();
    const ticket = generation;
    try {
      const result = await get('/v1/resolve');
      if (!active || ticket !== generation) return;
      scheduleRefresh(result);
      if (
        !result.popup.eligible ||
        popupHost?.shadowRoot?.querySelector('dialog[open]')
      )
        return;
      const event = result.popup.candidates.find(
        (item) => !read(candidateKey(result, item)),
      );
      if (!event) return;
      clearTimeout(displayTimer);
      displayTimer = setTimeout(() => {
        if (
          !active ||
          ticket !== generation ||
          document.visibilityState === 'hidden'
        )
          return;
        if (chinaDate() !== result.date) {
          void refresh();
          return;
        }
        const key = candidateKey(result, event);
        if (!read(key)) show(event, key);
      }, result.popup.delayMs);
    } catch {
      if (active) {
        clearTimeout(timer);
        timer = setTimeout(refresh, 60000);
      }
    } finally {
      pending = false;
    }
  }
  class JieqiCard extends HTMLElement {
    static get observedAttributes() {
      return ['event', 'theme', 'data-style'];
    }
    connectedCallback() {
      if (!this.shadowRoot) shadow(this);
      void this.renderCard();
    }
    attributeChangedCallback(name) {
      if ((name === 'event' || name === 'data-style') && this.isConnected) void this.renderCard();
    }
    async renderCard() {
      const requested = this.getAttribute('event');
      const style = this.getAttribute('data-style') || defaultStyle;
      const ticket = Symbol();
      this.renderTicket = ticket;
      const root = this.shadowRoot;
      root.querySelectorAll('.card,.status').forEach((node) => node.remove());
      root.append(element('p', 'status', '正在寄来一份时节…'));
      try {
        let event;
        if (requested) {
          const data = await calendar(style);
          event = data.events.find(
            (item) => item.eventId === requested && item.category !== 'holiday',
          );
        } else {
          const data = await get('/v1/resolve', style);
          event = data.popup.selected || data.currentTerm || data.next;
        }
        if (this.renderTicket !== ticket || !this.isConnected) return;
        root.querySelectorAll('.status').forEach((node) => node.remove());
        if (!event) {
          root.append(element('p', 'status', '暂未找到这张卡片。'));
          return;
        }
        root.append(createCard(event));
      } catch {
        if (this.renderTicket === ticket) {
          root.querySelectorAll('.status').forEach((node) => node.remove());
          root.append(element('p', 'status', '时节来信暂未送达，请稍后再试。'));
        }
      }
    }
  }
  if (!customElements.get('jieqi-card'))
    customElements.define('jieqi-card', JieqiCard);
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void refresh();
  };
  window.Jieqi = {
    version: '1.0.0',
    start() {
      if (active) return;
      active = true;
      generation++;
      document.addEventListener('visibilitychange', onVisibility);
      void refresh();
    },
    refresh,
    async show(id) {
      const data = await calendar();
      const event = data.events.find(
        (item) => item.eventId === id && item.category !== 'holiday',
      );
      if (!event) throw new Error('Unknown Jieqi card');
      show(event);
    },
    destroy() {
      active = false;
      generation++;
      clearTimeout(timer);
      clearTimeout(displayTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      popupHost?.remove();
      popupHost = undefined;
    },
  };
  if (script.dataset.mode === 'popup') {
    if (document.readyState === 'loading')
      document.addEventListener(
        'DOMContentLoaded',
        () => window.Jieqi.start(),
        { once: true },
      );
    else window.Jieqi.start();
  }
})();
