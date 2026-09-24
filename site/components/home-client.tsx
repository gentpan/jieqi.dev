'use client';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { flushSync } from 'react-dom';
import {
  ArrowDown,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Code2,
  Copy,
  Check,
  Maximize2,
  X,
  Download,
  Mail,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import SeasonCard from '@/components/season-card';
import type { Occurrence } from '@/lib/calendar/calendar';
import { apiOrigin, assetUrl } from '@/lib/urls';
import { selectArtwork, styleCatalog, styleSchema } from '@/lib/calendar/styles';
import type { StyleId } from '@/lib/calendar/styles';
type Variant = { id: string; title: string; image: string };
const styleNames: Record<string, string> = {
  'bailu-watercolor': '水彩手绘',
  'bailu-papercut': '层叠剪纸',
  'bailu-clay': '软萌黏土',
  'bailu-minimal': '极简留白',
  'bailu-character': '时节拟人',
  'bailu-anime': '手绘动画',
  'bailu-sweet': '甜系少女',
  'bailu-woodblock': '木刻版画',
  'bailu-embroidery': '丝线刺绣',
};
const styleNotes: Record<string, string> = {
  'bailu-watercolor': '清透笔触，留住露水与晨光。',
  'bailu-papercut': '纸页之间，让秋意有了层次。',
  'bailu-clay': '圆润小世界，装下一点可爱。',
  'bailu-minimal': '以留白与简洁轮廓，描绘四季里的小美好。',
  'bailu-character': '让每个时节，化作一个可爱的小精灵。',
  'bailu-anime': '走进晨雾与田野，遇见手绘的温柔日常。',
  'bailu-sweet': '轻柔裙摆与四季风物，把日常写成甜甜的童话。',
  'bailu-woodblock': '刀痕与套色，让四季有了鲜明的力量。',
  'bailu-embroidery': '一针一线，把时节绣进柔软的日常。',
};
const styleItems = Object.fromEntries(styleCatalog.map(style => [style.id, `${style.name} · ${style.coverage === 'complete' ? '全年 40 张' : '白露小样'}`]));

const subscribeOrigin = () => () => {};
const getOrigin = () => apiOrigin || window.location.origin;
const getServerOrigin = () => apiOrigin || 'https://jieqi.dev';

export default function HomeClient({
  events,
  holidays,
  today,
  variants,
}: {
  events: Occurrence[];
  holidays: Occurrence[];
  today: string;
  variants: Variant[];
}) {
  const ready = useMemo(() => events.filter((e) => e.card.image), [events]);
  const nextTerm = ready.find(
    (e) => e.category === 'solar-term' && e.start >= today,
  );
  const current = ready
    .filter((e) => e.category === 'solar-term' && e.start <= today)
    .at(-1);
  const defaultEvent =
    (nextTerm &&
    (Date.parse(nextTerm.start) - Date.parse(today)) / 86400000 <= 3
      ? nextTerm
      : current) ??
    ready.find((e) => e.eventId === 'spring-festival') ??
    ready[0];
  const [selectedKey, setSelectedKey] = useState(
    `${defaultEvent.category}:${defaultEvent.key}`,
  );
  const selected =
    [...ready, ...holidays].find(
      (e) => `${e.category}:${e.key}` === selectedKey,
    ) ?? defaultEvent;
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<string | undefined>();
  const [previewStyle, setPreviewStyle] = useState<StyleId>('stamp');
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState('solar-term');
  const [collectionStyle, setCollectionStyle] = useState<StyleId>('stamp');
  const [mode, setMode] = useState('popup');
  const [embedStyle, setEmbedStyle] = useState<StyleId>('stamp');
  const origin = useSyncExternalStore(
    subscribeOrigin,
    getOrigin,
    getServerOrigin,
  );
  const [copyState, setCopyState] = useState('');
  const code =
    mode === 'popup'
      ? `<script defer src="${origin}/v1/widget.js" data-mode="popup" data-style="${embedStyle}"></script>`
      : `<script defer src="${origin}/v1/widget.js"></script>\n<jieqi-card event="${selected.eventId}" data-style="${embedStyle}"></jieqi-card>`;
  const embedPreviewImage = (event: Occurrence) => {
    const art = selectArtwork(event.eventId, event.card.image, embedStyle);
    return art.resolved === 'stamp' ? undefined : art.image ?? undefined;
  };
  const preview = (event: Occurrence, image?: string, style: StyleId = 'stamp') => {
    setSelectedKey(`${event.category}:${event.key}`);
    setVariant(image);
    setPreviewStyle(style);
    setOpen(true);
  };
  const navigate = (delta: number) => {
    const index = ready.findIndex((e) => e.eventId === selected.eventId);
    const next=ready[(index + delta + ready.length) % ready.length];
    setSelectedKey(`${next.category}:${next.key}`);
    const artwork = selectArtwork(next.eventId, next.card.image, previewStyle);
    setVariant(artwork.resolved === 'stamp' ? undefined : artwork.image ?? undefined);
  };
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState('已复制');
    } catch {
      setCopyState('请选中下方代码复制');
    }
  }
  useEffect(() => {
    if (!copyState) return;
    const timer = setTimeout(() => setCopyState(''), 3500);
    return () => clearTimeout(timer);
  }, [copyState]);
  useEffect(() => {
    type Context = {
      registerTool: (
        tool: {
          name: string;
          description: string;
          inputSchema: object;
          annotations: object;
          execute: (input: unknown) => unknown;
        },
        options: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: 'jieqi_list_cards',
        description:
          'List available seasonal and festival cards with their IDs and dates.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => ({
          cards: ready.map((e) => ({
            id: e.eventId,
            name: e.name,
            date: e.start,
          })),
        }),
      },
      {
        name: 'jieqi_preview_card',
        description: 'Select a card and open its visible preview dialog.',
        inputSchema: {
          type: 'object',
          properties: { eventId: { type: 'string' } },
          required: ['eventId'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input: unknown) => {
          const id = (input as { eventId?: unknown })?.eventId;
          if (typeof id !== 'string') throw new Error('eventId is required');
          const event = ready.find((e) => e.eventId === id);
          if (!event) throw new Error('Unknown card');
          flushSync(() => {
            setSelectedKey(`${event.category}:${event.key}`);
            setVariant(undefined);
            setPreviewStyle('stamp');
            setOpen(true);
          });
          return { id: event.eventId, name: event.name, previewOpen: true };
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => lifecycle.abort();
  }, [ready]);
  if (!selected) return null;
  const previewArtwork = selectArtwork(selected.eventId, selected.card.image, previewStyle);
  const resolvedStyle = styleCatalog.find(style => style.id === previewArtwork.resolved)!;
  const collectionName = styleCatalog.find(style => style.id === collectionStyle)!.name;
  const holiday = holidays.find((e) => e.eventId === selected.eventId);
  const dayLabel =
    selected.start === today
      ? '今日来信'
      : selected.start > today
        ? '下一份期待'
        : '时节来信';
  return (
    <main id="top">
      <header className="site-header wrap">
        <a href="#top" className="brand" aria-label="节期首页">
          <span className="brand-seal">节</span>
          <strong>节期</strong>
          <span className="brand-domain">JIEQI.DEV</span>
        </a>
        <nav aria-label="主导航">
          <a href="#collection">卡片集</a>
          {variants.length > 0 && (
            <a className="styles-link" href="#styles">
              插画风格
            </a>
          )}
          <a href="#embed">
            接入网站 <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
      <section className="intro wrap">
        <div>
          <p className="eyebrow">
            <span /> 寄一份时节，给每一次相逢
          </p>
          <h1>
            让网站，也有<span>过节的仪式感。</span>
          </h1>
        </div>
        <p className="intro-note">
          二十四节气与中国节日，
          <br />
          化作一张张如期而至的卡片。
        </p>
      </section>
      <section className="feature-section wrap" aria-label="节日卡片预览">
        <div className="feature-label">
          <span>
            <Mail size={14} /> {dayLabel}{' '}
            <span className="label-separator">/</span> 邮票系列
          </span>
          <span>THE SEASONAL POST · {today.slice(0, 4)}</span>
        </div>
        <SeasonCard event={selected} />
        <div className="feature-bottom">
          <span>
            <span className="live-dot" /> 北京时间 ·{' '}
            {today.replaceAll('-', '.')}
          </span>
          <div className="feature-actions">
            <button onClick={() => preview(selected)}>
              <Maximize2 size={15} /> 预览弹窗
            </button>
            <button
              className="round-button"
              onClick={() => navigate(-1)}
              aria-label="上一张卡片"
            >
              <ArrowLeft size={17} />
            </button>
            <button
              className="round-button"
              onClick={() => navigate(1)}
              aria-label="下一张卡片"
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>
      <section className="collection-section wrap" id="collection">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE COLLECTION · 01</p>
            <h2>把四季，慢慢收藏。</h2>
          </div>
          <p>
            节气有时，节日有情。
            <br />
            点开一张卡片，读一封时节的来信。
          </p>
        </div>
        <Tabs
          value={category}
          onValueChange={(v) => {
            setCategory(String(v));
            setExpanded(false);
          }}
          className="collection-tabs"
        >
          <div className="collection-toolbar">
            <TabsList variant="line">
              <TabsTrigger value="solar-term">
                二十四节气 <span>24</span>
              </TabsTrigger>
              <TabsTrigger value="festival">
                中国节日 <span>16</span>
              </TabsTrigger>
            </TabsList>
            <Select value={collectionStyle} onValueChange={value => setCollectionStyle(styleSchema.parse(value))} items={styleItems}>
              <SelectTrigger aria-label="选择卡片集风格"><SelectValue /></SelectTrigger>
              <SelectContent>{styleCatalog.filter(style => style.coverage === 'complete').map(style => <SelectItem key={style.id} value={style.id}>{style.name} · 全年 40 张</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {['solar-term', 'festival'].map((kind) => (
            <TabsContent value={kind} key={kind}>
              <div className="stamp-grid">
                {ready
                  .filter((e) => e.category === kind)
                  .slice(0, expanded ? 100 : 8)
                  .map((event) => (
                    <button
                      className="stamp-item"
                      key={event.key}
                      onClick={() => preview(event, selectArtwork(event.eventId, event.card.image, collectionStyle).image ?? undefined, collectionStyle)}
                      aria-label={`查看${event.name}${collectionName}卡片`}
                    >
                      <div className="stamp-well">
                        <Image
                          unoptimized
                          src={assetUrl(selectArtwork(event.eventId, event.card.image, collectionStyle).image!)}
                          alt={`${event.name}${collectionName}插画`}
                          width={1024}
                          height={1536}
                          loading="lazy"
                        />
                        <span className="stamp-open">
                          <ArrowUpRight size={20} />
                        </span>
                      </div>
                      <div className="stamp-caption">
                        <strong>{event.name}</strong>
                        <time dateTime={event.start}>
                          {event.start.slice(5).replace('-', ' / ')}
                        </time>
                      </div>
                    </button>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
        {ready.filter((e) => e.category === category).length > 8 && (
          <button
            className="expand-button"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? '收起卡片'
              : `展开全部 ${category === 'solar-term' ? 24 : 16} 张`}{' '}
            <ArrowDown size={16} className={expanded ? 'flipped' : ''} />
          </button>
        )}
      </section>
      {variants.length > 0 && (
        <section className="styles-section wrap" id="styles">
          <div className="section-heading">
            <div>
              <p className="eyebrow">STYLE NOTES · 02</p>
              <h2>同一个时节，不同的心意。</h2>
            </div>
            <p>十种全年系列。选一种心意，陪伴四季。</p>
          </div>
          <div className="style-grid">
            {variants.map((v) => (
              <button
                className={`style-sample ${v.id}`}
                key={v.id}
                onClick={() =>
                  preview(
                    ready.find((e) => e.eventId === 'term-bailu')!,
                    v.image,
                    styleSchema.parse(v.id.replace('bailu-', '')),
                  )
                }
              >
                <div className="style-art">
                  <Image
                    unoptimized
                    src={assetUrl(v.image)}
                    alt={`白露 · ${styleNames[v.id]}`}
                    width={1024}
                    height={1536}
                    loading="lazy"
                  />
                </div>
                <div className="style-copy">
                  <span>{styleCatalog.find(style => style.id === v.id.replace('bailu-', ''))?.coverage === 'complete' ? '全年系列 · 40 张' : '白露小样 · 1 张'}</span>
                  <h3>{styleNames[v.id]}</h3>
                  <p>{styleNotes[v.id]}</p>
                  <ArrowUpRight size={20} />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="embed-section wrap" id="embed">
        <div>
          <p className="eyebrow">
            <Code2 size={16} /> MADE FOR YOUR WEBSITE
          </p>
          <h2>
            一行接入，
            <br />
            让心意准时抵达。
          </h2>
          <p>
            节气当天、节日期间，自动送上一张卡片。
            <br />
            同一事件默认只提醒一次，关掉后也能再看。
          </p>
          <ul className="embed-benefits">
            <li>
              <Check size={15} /> 手机与电脑自适应
            </li>
            <li>
              <Check size={15} /> 无需注册，公开读取
            </li>
            <li>
              <Check size={15} /> 按北京时间判断日期
            </li>
          </ul>
        </div>
        <div className="code-panel">
          <div className="code-toolbar">
            <Select
              value={mode}
              onValueChange={(v) => setMode(String(v))}
              items={{ popup: '节日自动弹窗', inline: '嵌入当前卡片' }}
            >
              <SelectTrigger aria-label="选择接入方式">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popup">节日自动弹窗</SelectItem>
                <SelectItem value="inline">嵌入当前卡片</SelectItem>
              </SelectContent>
            </Select>
            <button onClick={copyCode} aria-label="复制接入代码">
              {copyState === '已复制' ? (
                <Check size={16} />
              ) : (
                <Copy size={16} />
              )}
              <span>{copyState === '已复制' ? '已复制' : '复制代码'}</span>
            </button>
          </div>
          <div className="embed-style-choice">
            <span>插画风格</span>
            <Select
              value={embedStyle}
              onValueChange={(value) => setEmbedStyle(styleSchema.parse(value))}
              items={styleItems}
            >
              <SelectTrigger aria-label="选择插画风格"><SelectValue /></SelectTrigger>
              <SelectContent>{styleCatalog.map(style => <SelectItem key={style.id} value={style.id}>{styleItems[style.id]}</SelectItem>)}</SelectContent>
            </Select>
            <p>{styleCatalog.find(style => style.id === embedStyle)?.coverage === 'complete' ? '已覆盖 24 节气与 16 节日。同一个 JS 地址，通过 data-style 选择风格。' : '此风格仅有白露小样；其他节日自动使用邮票插画。'}</p>
          </div>
          <pre>
            <code>{code}</code>
          </pre>
          <p className="code-hint">
            {mode === 'popup'
              ? '把代码放在网页的 </body> 前。'
              : '把组件标签放在你希望展示卡片的位置。'}
          </p>
          <div className="code-foot">
            <span>WordPress · 静态网站 · 更多网页</span>
            <button onClick={() => preview(holiday ?? selected, embedPreviewImage(holiday ?? selected), embedStyle)}>
              看看效果 <ArrowUpRight size={14} />
            </button>
          </div>
          <span className="sr-only" aria-live="polite">
            {copyState}
          </span>
        </div>
      </section>
      <footer className="wrap">
        <a href="#top" className="brand">
          <span className="brand-seal">节</span>
          <strong>节期</strong>
        </a>
        <p>应时而来，因你有期。</p>
        <span>JIEQI.DEV</span>
      </footer>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="card-dialog" showCloseButton={false}>
          <DialogTitle className="sr-only">{selected.name}卡片预览</DialogTitle>
          <DialogDescription className="sr-only">
            {selected.start}，{selected.card.description}
          </DialogDescription>
          <DialogClose className="dialog-close" aria-label="关闭卡片">
            <X size={22} />
          </DialogClose>
          <SeasonCard event={selected} image={variant} />
          <div className="preview-style-choice">
            <Select value={previewStyle} items={styleItems} onValueChange={value => {
              const style = styleSchema.parse(value);
              setPreviewStyle(style);
              setVariant(selectArtwork(selected.eventId, selected.card.image, style).image ?? undefined);
            }}>
              <SelectTrigger aria-label="切换预览风格"><SelectValue /></SelectTrigger>
              <SelectContent>{styleCatalog.map(style => <SelectItem key={style.id} value={style.id}>{styleItems[style.id]}</SelectItem>)}</SelectContent>
            </Select>
            {previewArtwork.fallback && <span>此节日暂无该风格，展示邮票插画。</span>}
          </div>
          <div className="dialog-foot">
            <button onClick={() => navigate(-1)} aria-label="上一张">
              <ArrowLeft size={18} />
            </button>
            <span>
              {selected.category === 'solar-term' ? '二十四节气' : '中国节日'} ·{' '}
              {resolvedStyle.name}{resolvedStyle.coverage === 'complete' ? '系列' : '小样'}
            </span>
            <a
              href={`${assetUrl(variant || selected.card.image!)}${apiOrigin ? '?download=1' : ''}`}
              download={`${selected.name}-${resolvedStyle.name}.webp`}
            >
              <Download size={16} /> 下载插画
            </a>
            <button onClick={() => navigate(1)} aria-label="下一张">
              <ArrowRight size={18} />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
