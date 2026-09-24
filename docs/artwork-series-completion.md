# 节期四种完整插画系列

已上线：https://jieqi.dev/#collection

| 系列 | style 参数 | 已验收并上线 |
| --- | --- | --- |
| 极简 | minimal | 40 张 |
| 拟人 | character | 40 张 |
| 手绘动画 | anime | 40 张 |
| 甜系少女 | sweet | 40 张 |

每个系列包含 24 节气与 16 节日，共 160 张独立插画。所有图片均通过内置 image_gen 分别生成并逐张目视验收；沿用已批准的 4 张白露作为系列成员。8 次不合格生成已重做，原图、原提示词及拒绝原因均保留。

卡片集可切换五种全年风格，预览支持切换风格、连续翻页和下载。三种水彩、剪纸、黏土白露小样仍清楚标为小样。默认邮票风格、诗文、动态公历农历日期、图片加载状态、统计脚本与原有 Widget 设置均保留。

## 接入

沿用 https://api.jieqi.dev/v1/widget.js，通过 data-style="minimal"（或 character、anime、sweet）选择系列。年度、manifest、resolve 接口均支持同名 style 查询参数。

## 验证

- 类型检查、26 项单元与 API 测试、站点 lint、生产构建均通过；VPS 构建通过。
- 2026、2027 年每个系列均有 40 个独立 eventId，包含关联假期区间的所有响应均无风格回退。2026 年接口有 47 个日期记录（含 7 个假期区间），2027 年为 40 个。
- 160 个线上图片 URL 全部返回 200，逐文件 SHA-256 与本地 WebP 一致；160 个原图哈希和 160 个发布图片哈希分别互不重复。
- 原有三种白露小样可访问，其他日期仍明确回退邮票；默认邮票有效。
- 同一 Widget 文件内容保持不变，图片 height:auto、弹窗 height:fit-content 与 880px 宽度设置保留。

## 记录与原件

- [逐图进度、来源、提示词路径、重做及目视 QA](artwork-series-progress.json)
- [线上图片 URL、哈希及年度接口验收记录](artwork-series-verification.json)
- 原图与提示词：项目内 `.jieqi-artwork/complete-series-20260907/`；沿用白露原图及提示词：`.jieqi-artwork/style-samples-20260907/`。
- WebP：`site/public/assets/` 与 `public/assets/`；160 张合计 40,440,170 字节。
- 复验命令：`node scripts/verify-artwork.mjs`。
- 发布目录：`/opt/jieqi/releases/20260907-complete-series`；前一版本目录保留。
