# jieqi.dev 独立服务器部署

目标服务器 5.9.73.228（Debian 13，现有 FrankenPHP/Caddy）。沿用 `/etc/frankenphp/Caddyfile` 中已有的 `/etc/caddy/sites/*.caddy` 导入，不替换现有网站配置。

| 地址 | 职责 |
| --- | --- |
| `https://jieqi.dev` | 首页，反向代理 `127.0.0.1:4319` |
| `https://www.jieqi.dev` | 308 永久跳转到主域名，保留路径和查询参数 |
| `https://api.jieqi.dev/v1/` | 日历接口与 `widget.js`，代理 `127.0.0.1:4318` |
| `https://static.jieqi.dev` | 图片、字体和首页编译后的 CSS、JS |

生产构建（在 site 目录）：

```sh
JIEQI_TARGET=node \
NEXT_PUBLIC_JIEQI_SITE_ORIGIN=https://jieqi.dev \
NEXT_PUBLIC_JIEQI_API_ORIGIN=https://api.jieqi.dev \
NEXT_PUBLIC_JIEQI_STATIC_ORIGIN=https://static.jieqi.dev \
npm run build
```

不设置上述变量时保留原 Sites/本地同源构建方式。`assetPrefix` 负责构建后的脚本和样式；`lib/urls.ts` 负责 public 图片与 favicon，避免只修改部分资源地址。Node 目标保留 Sites 插件，关闭 Cloudflare Worker 构建插件。

每次上传到 `/opt/jieqi/releases/新版本/`，不要上传本地 `.env`、SQLite、node_modules 或私钥。在服务器安装两层目录的锁定依赖并构建，然后执行 `bash deploy/activate.sh /opt/jieqi/releases/新版本`。该脚本适用于本次已检查的 Caddy 导入结构，先确保 4318/4319 没有其他服务占用。

`/opt/jieqi/current` 指向当前版本；数据库与 API 环境配置独立保存在 `/opt/jieqi/shared`。首次从已发布快照导入 40 张卡片，后续保留已有数据库。管理员令牌在服务器本地生成，权限 0600，不上传聊天或源代码。管理接口没有配置公网代理，需要通过 SSH 隧道访问 4318。

静态根目录 `/opt/jieqi/static` 只含公开构建资源；按哈希命名的脚本和样式缓存一年，更新时保留旧文件。普通图片缓存一小时。静态资源允许跨域 GET/HEAD/OPTIONS，`?download=1` 返回 attachment，让跨域插画下载保持有效。API 日期判断 no-store，Widget 和其他公开 API 短缓存。

主域名旧 `/v1/*` 地址跳转至 API 域名，旧图片路径跳转至静态域名。Caddy 自动申请和续签四个域名证书，Cloudflare 代理保持现有配置。

接入：

```html
<script defer src="https://api.jieqi.dev/v1/widget.js" data-mode="popup"></script>
```

检查 `systemctl status jieqi-web jieqi-api`，以及四个公开域名的状态、资源、CORS、www 跳转。回滚代码时将 current 指回旧 release 并重启这两个服务；数据库内容按后端发布回滚接口处理。

参考：[Next.js assetPrefix](https://nextjs.org/docs/pages/api-reference/config/next-config-js/assetPrefix)、[Caddy 静态文件](https://caddyserver.com/docs/caddyfile/directives/file_server)、[Caddy 路由](https://caddyserver.com/docs/caddyfile/directives/handle)。
