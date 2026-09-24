# 独立项目迁移

本地项目位置：`/Users/peter/projects/jieqi.dev`。

整个后端、网站、Widget、数据库、环境配置、依赖、部署资料和插画记录已迁入。
前端原有 Git 历史保留在 `site/.git`，本次没有重写历史或自动创建提交。

早期邮票原图与清单位于 `.jieqi-artwork/stamp-series-20260906/`；新增四套
160 张插画的原图、提示词、重做记录和验收资料也全部随项目保存。
图片清单已使用项目根目录相对路径；生成服务返回的历史来源路径仅用于溯源。

后端：在项目根目录执行 `npm start`，读取现有私有 `.env` 与 `data/`。
前端：在 `site/` 执行 `JIEQI_TARGET=node npm run dev`。
生产构建和发布步骤见 `../deploy/README.md`。

这次只迁移本地项目；线上 `/opt/jieqi`、数据库、域名和已被其他网站引用的
Widget 地址保持不变。前后端代码不依赖原 WordPress 工程。

迁移前的本地文件校验清单保存在忽略目录
`.migration/files-before-path-update.json`，用于本次完整性核查。
