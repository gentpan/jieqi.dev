# 节期 · Jieqi 首页

面向 jieqi.dev 的首页、40张节气节日卡片集、弹窗预览、风格小样、JS嵌入组件和公开日期接口。

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
- 可选风格目前仅制作白露小样，不把三种小样说成三套完整系列。

## 公开接口与JS

- `/v1/manifest.json` — 内容和设置。
- `/v1/calendar/2026.json` — 年度历法与假期数据。
- `/v1/resolve?date=2026-09-07` — 日期条件判断；省略日期使用北京时间当天。
- `/v1/widget.js` — 无外部依赖的浏览器组件。

自动弹窗：

```html
<script defer src="https://jieqi.dev/v1/widget.js" data-mode="popup"></script>
```

固定嵌入：

```html
<script defer src="https://jieqi.dev/v1/widget.js"></script>
<jieqi-card event="spring-festival"></jieqi-card>
```

网站当前域名会自动用于首页生成的接入代码。上面的 jieqi.dev 示例只有在域名解析、HTTPS和公开访问配置完成后，才能用于其他网站。

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

`npx tsc --noEmit` 和 `npm run lint` 检查项目代码；模板自带的 `components/ui/`、`hooks/` 保持原样，不纳入项目规则的静态样式语义误报扫描。图片已在源端逐张检查字形，根项目 `docs/artwork-qa.json` 记录提示词、原图路径、逐字检查结果与返工记录。生成原图保留，网页图片只作格式压缩，不重绘汉字。

后端的日期测试覆盖跨年、春节/除夕、农历大小月、冬至、闰年、节假日重叠、提醒频率与假期待公布状态。站点API还校验响应、CORS、错误日期、未来年份及JS可访问性。

首页按支持情况注册 `jieqi_list_cards`、`jieqi_preview_card` 两个 WebMCP 工具。当前环境没有执行这些工具的受支持验证上下文，因此未声称已验证；普通浏览器不支持时自动跳过。未进行浏览器自动化交互或响应式截图测试。

## 部署结构

`.openai/hosting.json` 保存现有 Sites 项目标识，重复发布复用，不新建。使用 Vinext + Sites Vite 插件构建 Worker。`public/assets/` 保存网站用WebP，`public/v1/widget.js`直接对外提供。注册域名并不会自动改动DNS；域名接入记录需要在域名服务商配置。

本次将模板的React服务端组件及Vinext更新到有修复的兼容版本，锁文件记录实际依赖。其余构建工具遵循模板依赖，未进行无关大版本升级。
