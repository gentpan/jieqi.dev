# 节期 · Jieqi 首页

面向 jieqi.dev 的首页、40张节气节日卡片集、十种全年插画风格、弹窗预览、JS嵌入组件和公开日期接口。

正式站点：[jieqi.dev](https://jieqi.dev)。部署步骤见上级 [部署说明](../deploy/README.md)。原 Sites 项目保留为独立预览。

每张卡片包含四句原创古风短诗、来源标注与两段时节/习俗说明。首页和 Widget 同时显示公历与农历干支年、生肖、月日。日期由对应事件的实际发生日换算；假期显示起止两端的农历日期，干支年与生肖采用正月初一换年的民用农历口径，闰月保留“闰”字。API 的 `lunarStart` / `lunarEnd` 提供结构化字段，`resolve.lunar` 则对应所查询的当天。

默认文案保存在上级 `src/editorial.ts`，明确标注“节期原创 · 古风短诗”，不是古人原作或格律诗引文。`scripts/refresh-editorial.ts` 只更新40张卡片的诗文和出处字段，保留日期规则、图片、假期与设置，发布前应备份线上内容。

日期边界测试涵盖春节换年、除夕二十九、闰六月、跨年假期与2000—2100年抽样对照。独立 ICU 对照中2027/2030年的两处日期差异，已依据香港天文台的 [2027年历表](https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2027e.pdf) 和 [2030年历表](https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2030e.pdf) 确认。

## 运行

```sh
npm ci
npm run dev
npm run build
```

开发服务器默认 http://localhost:3000/。这是与上一级 Node/SQLite 管理后端分开的站点，可独立部署为 Cloudflare Worker。

## 内容来源与发布

上一级项目是编辑与图片原图的来源；本目录不包含管理员令牌、SQLite数据库或管理员接口。`lib/snapshot.json` 是已发布的内容快照，`lib/calendar/` 是从后端复制的纯日期引擎。站点实时按北京时间计算日期，不需要访客连接本地后端。

在上一级目录执行 `npm run sync-site` 会合并本次新增节日、导入通过文字校验的插画、生成 WebP、发布内容并同步站点。然后在本目录重新构建和发布。修改本地后端数据不会未经发布自动改动线上网站。`sync-site` 会将邮票系列的标准插画更新到对应事件。

- 24节气：小寒至冬至。
- 16节日：元旦、除夕、春节、元宵、妇女节、清明、五一、青年节、儿童节、端午、七夕、教师节、中秋、国庆、重阳、腊八。
- 节日日期与放假区间分开。当前录入2026年官方安排；未录入年份显示待公布。
- 清明节与清明节气共用一张邮票插画，作为两个不同日期条目展示。
- 邮票、水彩手绘、层叠剪纸、软萌粘土、极简、拟人、手绘动画、甜系少女、木刻版画、丝线刺绣均覆盖全部 40 张卡片。

## 公开接口与JS

风格与 API 版本分开：`v1` 是接口兼容版本，插画风格使用 `data-style`，无需更换 JS 地址。十种风格均覆盖全部卡片。`/v1/styles.json` 提供风格名称和覆盖范围；日历、日期判断、manifest 接受 `?style=watercolor`。公开卡片的 `artworkStyle` 返回 requested/resolved/fallback，不修改存储内容或污染其他风格请求。

```html
<script defer src="https://api.jieqi.dev/v1/widget.js" data-mode="popup" data-style="stamp"></script>
```

固定卡片可以分别设置不同风格（不要使用 HTML 保留的 `style` 属性）：

```html
<script defer src="https://api.jieqi.dev/v1/widget.js"></script>
<jieqi-card event="term-bailu" data-style="watercolor"></jieqi-card>
<jieqi-card event="spring-festival" data-style="stamp"></jieqi-card>
```

自动弹窗沿用首个脚本的风格；固定卡片优先用自身 `data-style`，未设置时继承脚本值。更换风格不改变同一节日的提醒频率。首页接入区域支持风格选择、复制及对应预览。新增风格时，在源端 `src/styles.ts` 注册稳定风格 ID 与具体图片，再同步部署；不需要新建 API 版本。

- `/v1/manifest.json` — 内容和设置。
- `/v1/calendar/2026.json` — 年度历法与假期数据。
- `/v1/resolve?date=2026-09-07` — 日期条件判断；省略日期使用北京时间当天。
- `/v1/widget.js` — 无外部依赖的浏览器组件。

自动弹窗：

```html
<script defer src="https://api.jieqi.dev/v1/widget.js" data-mode="popup"></script>
```

固定嵌入：

```html
<script defer src="https://api.jieqi.dev/v1/widget.js"></script>
<jieqi-card event="spring-festival"></jieqi-card>
```

正式构建使用 `NEXT_PUBLIC_JIEQI_API_ORIGIN` 生成接入代码，用 `NEXT_PUBLIC_JIEQI_STATIC_ORIGIN` 为图片和构建资源加前缀。不设置变量时，本地和 Sites 预览仍使用同源地址。Widget 从脚本所在的 API 域名读取日期，插画从 static 域名加载。

组件使用 Shadow DOM 隔离样式，原生 `dialog` 处理模态交互，按本地存储的事件键防止重复显示；本地存储不可用时使用内存记录。同日重叠事件保持优先级。关闭后保留右下角入口；跨日与恢复页面可见时重新判断。网页关闭后不会发送系统通知。

手动控制：

```js
await window.Jieqi.show('term-bailu');
window.Jieqi.start();
await window.Jieqi.refresh();
window.Jieqi.destroy();
```

可设置 `<jieqi-card theme="light">` / `theme="dark"`，默认跟随系统；可通过 `--jieqi-bg`、`--jieqi-text`、`--jieqi-muted`、`--jieqi-accent` 设置颜色。API公开读取不发送Cookie，组件不收集访客身份。部署为仅本人可见的Sites预览时，外部网站接入会被访问控制阻挡；公开使用需要公开访问权限。

## 校验

`npx tsc --noEmit` 和 `npm run lint` 检查项目代码。插画原图、提示词与校验记录保存在根项目 `.jieqi-artwork/` 和 `docs/`；网页图片只作格式压缩，不重绘汉字。

后端的日期测试覆盖跨年、春节/除夕、农历大小月、冬至、闰年、节假日重叠、提醒频率与假期待公布状态。站点API还校验响应、CORS、错误日期、未来年份及JS可访问性。

首页按支持情况注册 `jieqi_list_cards`、`jieqi_preview_card` 两个 WebMCP 工具。当前环境没有执行这些工具的受支持验证上下文，因此未声称已验证；普通浏览器不支持时自动跳过。未进行浏览器自动化交互或响应式截图测试。

## 部署结构

`.openai/hosting.json` 保存现有 Sites 项目标识，重复发布复用，不新建。使用 Vinext + Sites Vite 插件构建 Worker。`public/assets/` 按插画风格分目录保存网站用 WebP；`public/v1/widget.js` 直接对外提供。注册域名并不会自动改动DNS；域名接入记录需要在域名服务商配置。

本次将模板的React服务端组件及Vinext更新到有修复的兼容版本，锁文件记录实际依赖。其余构建工具遵循模板依赖，未进行无关大版本升级。
