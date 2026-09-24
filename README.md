# 节期 · Jieqi

独立的节气、节日、假期卡片项目，包含 Node.js + TypeScript + Express + SQLite 后端、网站、Widget 和完整插画资料。项目可整体搬迁，不依赖 WordPress 项目。

正式站点：[jieqi.dev](https://jieqi.dev)。API 和 Widget 使用 `https://api.jieqi.dev/v1/`；图片、CSS、JS 使用 `https://static.jieqi.dev`。部署步骤见 [部署说明](deploy/README.md)。

已实现：24节气、16个主要节日、2026官方放假与补班安排；文案和图片管理；弹窗触发规则；草稿预览、发布、历史版本回退；公开跨域接口；静态导出；数据库与图片备份。

`site/` 包含独立首页、邮票卡片集、另外九套完整插画（每套 40 张）、浏览器弹窗与 `widget.js` 嵌入组件。详见 [站点说明](site/README.md)。可视化管理后台和 WordPress 主题内的专用设置页面尚未制作；WordPress 可使用首页提供的通用 JS 接入。

## 本地运行

需要 Node.js 24.14+ 和 npm。使用 Node 内置 SQLite，Node 24 可能显示实验性提示。开发环境验证版本为 Node 26.7。

```sh
git clone https://github.com/gentpan/jieqi.dev.git
cd jieqi.dev
npm ci
npm run setup
npm start
```

`setup` 生成权限为 0600 的 `.env` 和随机管理员令牌，只在空库写入种子数据，首次发布种子内容。重复执行不会覆盖已编辑的数据。

默认监听 `127.0.0.1:4318`。配置见 `.env.example`；真实 `.env`、数据库、构建输出均已忽略，不应提交。

- 健康状态：`http://127.0.0.1:4318/health`
- 白露判断：`http://127.0.0.1:4318/v1/resolve?date=2026-09-07`
- 春节假期：`http://127.0.0.1:4318/v1/resolve?date=2026-02-15`
- 年度数据：`http://127.0.0.1:4318/v1/calendar/2026.json`
- 春节图片：`http://127.0.0.1:4318/assets/spring-festival-v1.png`
- 五一图片：`http://127.0.0.1:4318/assets/labour-day-v1.png`

## 管理流程

管理接口使用 `Authorization: Bearer <ADMIN_TOKEN>`。令牌仅用于你自己的管理程序，不得放进别人网站的 JS。命令行工具自动从 `.env` 读取令牌，不输出令牌。

```sh
# 读取草稿内容
npm run admin -- GET /admin/content

# 上传图片：返回 /assets/<sha256>.png，后续填入卡片的 image 字段
npm run admin -- POST /admin/assets public/assets/spring-festival-v1.png

# 创建或完整替换卡片，将完整事件 JSON 保存到文件后提交
npm run admin -- PUT /admin/events/labour-day docs/labour-day.example.json

# 查看草稿在指定日期的结果
npm run admin -- GET '/admin/preview?date=2026-05-01'

# 发布草稿，公开接口切换到新版本
npm run admin -- POST /admin/publish

# 查看历史发布版本
npm run admin -- GET /admin/publications
```

卡片和设置使用完整 PUT；未填写的可选属性采用 schema 默认值。建议先读取旧对象再修改，不要将 PUT 当作 PATCH。所有文案均为普通文本，前端需要通过 `textContent` 渲染。

发布前检查日期、假期关联与图片存在性。发布快照在 SQLite 事务内创建并激活。回退提交 `{"version":"历史UUID"}` 到 `/admin/rollback`，只切换线上版本，保留当前草稿。

## 接口清单

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/health` | 服务与发布状态 |
| GET | `/v1/manifest.json` | 已发布内容、规则、版本与支持年份 |
| GET | `/v1/calendar/:year.json` | 某年节日、节气、假期与设置；也接受不带 `.json` |
| GET | `/v1/resolve?date=YYYY-MM-DD` | 判断指定日期；省略日期时使用北京时间当天 |
| GET | `/admin/content` | 全部草稿 |
| GET | `/admin/events` | 卡片列表 |
| PUT / DELETE | `/admin/events/:id` | 写入或删除卡片；有假期引用时不允许删除 |
| GET | `/admin/schedules` | 年度假期列表 |
| PUT / DELETE | `/admin/schedules/:year` | 写入或删除某年安排 |
| GET / PUT | `/admin/settings` | 弹窗规则 |
| POST | `/admin/assets` | 上传 PNG/JPEG/WebP 原始二进制，最多 8 MB |
| GET | `/admin/preview?date=YYYY-MM-DD` | 草稿日期预览 |
| POST | `/admin/publish` | 发布 |
| GET | `/admin/publications` | 历史版本与当前版本 |
| POST | `/admin/rollback` | 激活历史发布版本 |

公开接口和图片允许任意来源跨域读取，不使用 Cookie。管理接口不开放跨域。无发布内容时公开 API 返回 503；参数错误返回 400，未认证返回 401，引用冲突返回 409，发布内容无效返回 422。不存在的路径返回 JSON 404。

## 日期与弹窗约定

- 中国节气、节日统一使用 `Asia/Shanghai`。客户端不要用访客当地日期替代中国日期。
- 支持查询公历 2000–2100 年；内置算法可以计算日期，但并不代表每年都有人工核对的放假安排。当前只有2026年安排经过来源核对。
- 节气日期由锁定版本的 `lunar-javascript` 计算，`occursAt` 附带算法给出的交节时间。弹窗默认在该北京时间日期的零点起有资格出现，不等到交节时刻；时间展示应标为历法计算值。
- 农历节日使用非闰月规则，除夕采用农历正月初一前一天计算。某年不存在的农历日不生成事件，不把错误日期推移到下一个月。
- 节日当天与假期区间分别保存，起止日期均包含。未录入年度返回 `pending`，不会套用上一年数据。
- 提前提醒 `advanceDays` 默认0，支持0–30天。当天/进行中的事件优先于预告；同类时间状态下优先假期、节日、节气，再比较 `priority`。
- 同一节日的当天和假期共享年度事件键，合并为一个候选。不同事件重叠保留在 `popup.candidates`，建议一个弹窗内部切换。
- `popup.eligible` 只表示日期与开关条件成立，不表示某访客一定需要再看。服务端不收集访客身份或展示记录。
- 默认频率 `once-per-event`：浏览器在实际显示后存储 `popup.dedupeKey`。`once-per-day` 使用当天键。不能把发布版本加入去重键，否则更新文案会导致重复弹出。
- 浏览器收到候选后先检查本地展示记录。若最高优先事件已看过，可按顺序检查后续候选；`once-per-event` 的候选键为 `jieqi:${candidate.key}`。每天最多一次模式则只检查当天键。
- `nextCheckAt` 是北京时间次日零点；浏览器在此时及 `visibilitychange` 恢复可见时重新查询。已关闭的网站无法通过这套接口自行弹窗。
- 普通日期返回 `eligible:false`，仍提供当前节气和下一事件，供常驻入口展示。

可配置设置示例：

```json
{
  "timezone": "Asia/Shanghai",
  "popupEnabled": true,
  "solarTermsEnabled": true,
  "festivalsEnabled": true,
  "holidaysEnabled": true,
  "advanceDays": 0,
  "frequency": "once-per-event",
  "delayMs": 1500
}
```

公开数据请求示例（此代码本身不绘制弹窗；完整组件见 `site/public/v1/widget.js`）：

```js
const serviceOrigin = 'https://你的服务域名';
const response = await fetch(`${serviceOrigin}/v1/resolve`, { credentials: 'omit' });
if (!response.ok) throw new Error('节期服务暂时不可用');
const result = await response.json();
if (result.popup.eligible) {
  const imageUrl = result.popup.selected.card.image
    ? new URL(result.popup.selected.card.image, serviceOrigin).href
    : null;
  // 检查本地展示记录 → 延迟 → 用卡片组件渲染 → 存储展示记录。
}
```

图片路径相对于服务域名，不能直接相对于接入方网站拼接。

## 发布与运维

```sh
npm run export -- 2026 2027
npm run backup
npm run check
npm test
```

静态导出写入 `dist/<发布版本>/`，包含 `v1/manifest.json`、各年度 `v1/calendar/<year>.json` 与图片，可用于静态托管。这里的后端静态导出不包含动态 `/v1/resolve` 接口或 `widget.js`；实际网页服务与JS组件已在 `site/` 实现。

后端部署时使用 Node 24.14+，执行 `npm ci --omit=dev`、`npm run setup` 和 `npm start`，用进程管理器保持运行，并用 HTTPS 反向代理转发到本机4318端口。数据库 `data/` 和 `public/assets/` 必须持久保存。不要把项目根目录设为可下载的静态网站目录。

公开日历/manifest 缓存最多60秒；每日判断和所有管理响应为 `no-store`。上线更新最多可能有60秒缓存延迟。图片采用内容哈希名称，样图采用版本化文件名，保留旧图供历史快照使用。

备份命令使用 SQLite 在线备份 API，同步保存图片到 `data/backups/<时间>/`。恢复时停止服务，将备份中的 `calendar.sqlite` 和 `assets` 恢复到配置的数据库路径与 `public/assets`，再启动。数据库和图片恢复需成套进行。

第一版以单实例为目标。SQLite 数据规模适合这类小型内容服务，公开读取可配合缓存或静态导出。暂无多管理员账户、定时抓取官方通知、多租户配置和在线可视化管理页面。

## 图片与资料

项目代码采用 [MIT 许可证](LICENSE)。仓库内原创插画（`.jieqi-artwork/`、`public/assets/`、`site/public/assets/` 中的图片）采用 [CC BY 4.0](ARTWORK-LICENSE.md)；使用时请标注“节期 · Jieqi”及仓库链接。第三方依赖遵循各自的许可证。数据库、管理员令牌和本地环境文件不包含在仓库中。

- 春节：`public/assets/spring-festival-v1.png`，竖排“春节”、卡通醒狮、灯笼与梅花。
- 五一：`public/assets/labour-day-v1.png`，竖排“五一”、卡通园丁、花草。
- 两张均通过 Codex 内置 `image_gen` 生成，未使用 API/CLI 回退。它们是右侧独立邮票插画，不是整张卡片截图；底色为暖米白，非透明背景。
- 邮票系列提示词和校验记录保存在 `docs/artwork-qa.json`；另外九套系列的原图、提示词和校验记录保存在 `.jieqi-artwork/` 与 `docs/artwork-series-progress.json`、`docs/artwork-expansion-progress.json`。
- 2026假期来源：[国务院办公厅通知，北京市政府转载](https://www.beijing.gov.cn/cs/gncs/zcwj/202603/t20260327_4568275.html)，2026-09-06核对。年度数据需要在官方通知发布或调整后人工更新并发布。
- 日期算法：[lunar-javascript](https://github.com/6tail/lunar-javascript)，MIT；版本锁定于 `package-lock.json`。
- 数据库实现：[Node SQLite 文档](https://nodejs.org/api/sqlite.html)。

日期与API测试覆盖中国时区零点、冬至跨年键、农历跨年、春节/端午/中秋、闰日、预告跨年、重叠事件、假期补班冲突、鉴权、草稿隔离、发布回退、图片上传和数据库持久化。
