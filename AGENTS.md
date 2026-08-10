# AGENTS.md -—- cloud-ip-rotator-mcp

> 本文件供 AI Agent 读取，记录项目约定与使用方式。跟随代码仓库走，跨平台通用。

## 项目简介

多云公网 IP 轮换 MCP Server。让 AI Agent 通过 MCP 协议一键轮换云服务器公网 IP，并自动更新 Cloudflare DNS 解析。

支持平台：AWS / Azure / Oracle OCI / Vultr + Cloudflare DNS。

## 项目结构

```
cloud-ip-rotator-mcp/
├── src/
│   ├── index.ts          # MCP Server 入口（stdio 传输）
│   ├── tools.ts          # 14 个 MCP 工具定义
│   ├── router.ts         # 多云调度路由层
│   ├── types.ts          # 统一类型定义
│   ├── config-store.ts   # 持久化配置存储
│   └── adapters/
│       ├── base.ts       # CloudAdapter 接口
│       ├── aws.ts        # AWS（stop/start 获取新动态 IP）
│       ├── azure.ts      # Azure（解绑→删除→创建→绑定）
│       ├── oci.ts        # OCI（ephemeral IP，RSA-SHA256 签名）
│       ├── vultr.ts      # Vultr（reserved IP→attach→删除旧的）
│       └── cloudflare.ts # Cloudflare DNS（查找+更新 A 记录）
├── ui/
│   ├── config-form.html  # 全功能配置表单（639行，四平台标签页）
│   ├── aws-config.html   # AWS 独立表单（精简版，~90行）
│   ├── azure-config.html # Azure 独立表单
│   ├── oci-config.html   # OCI 独立表单
│   ├── vultr-config.html # Vultr 独立表单
│   └── server.cjs        # 本地配置服务器（端口 8787）
└── dist/                 # 编译输出
```

## 编译与运行

```bash
# 安装依赖
npm install

# 编译（注意：tsc 可能受 ELECTRON_RUN_AS_NODE 干扰）
npx tsc

# 如 tsc 静默退出，用：
env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS npx tsc

# 启动 MCP Server
node dist/index.js
```

## 配置文件

路径：`~/.cloud-ip-rotator/config.json`（即 `C:\Users\<用户名>\.cloud-ip-rotator\config.json`）

结构：
```json
{
  "profiles": {
    "aws-sg": {
      "name": "aws-sg",
      "provider": "aws",
      "region": "ap-southeast-1",
      "instanceId": "i-xxx",
      "credentials": { "accessKeyId": "...", "secretAccessKey": "..." },
      "subdomain": "app.example.com",
      "proxied": false,
      "cloudflare": {
        "apiToken": "profile 级 Cloudflare API Token",
        "zoneId": "profile 级 Zone ID"
      }
    }
  }
}
```

Cloudflare 凭据存储在 profile 内，不再有全局字段。每个 profile 独立绑定自己的 Cloudflare 账号。

## UI 配置表单使用约定

### 永远用浏览器打开，不要内嵌在对话中

原因：AI 对话平台的内嵌 widget（如 WorkBuddy 的 `show_widget`）运行在沙箱中，CSP 策略会拦截 `fetch` 请求，导致保存按钮无法写入配置文件。浏览器中同源 `fetch` 不受限制。

### 启动本地配置服务器

```bash
cd ui
node server.cjs
```

服务运行在 `http://localhost:8787`，提供：
- `GET /` — 配置表单页面
- `GET /api/config` — 读取当前配置
- `POST /api/save-config` — 保存配置（合并写入 config.json）
- `POST /api/delete-profile` — 删除指定配置

### 打开方式

```
http://localhost:8787/
```

或直接打开 `ui/config-form.html` 文件（此时保存走剪贴板兜底）。

### 表单功能

- 四平台标签页切换（AWS / Azure / OCI / Vultr）
- 区域下拉支持「其他区域 (手动输入)」
- 勾选「启用 Cloudflare 域名解析」后展开 API Token + Zone ID 输入框
- 每个 profile 可绑定独立的 Cloudflare 凭据

## MCP 工具列表（13 个）

### 云平台操作（8 个，凭据即时传入）
1. `rotate_instance_ip` — 一键轮换公网 IP
2. `get_instance_info` — 查询实例详情
3. `list_instances` — 列出区域内所有实例
4. `allocate_ip` — 分配新公网 IP
5. `associate_ip` — 绑定 IP 到实例
6. `release_ip` — 释放/删除公网 IP
7. `list_ips` — 列出已分配的公网 IP
8. `get_instance_public_ip` — 查询实例当前公网 IP

### 配置管理 + DNS（5 个，持久化保存）
9. `save_profile` — 保存云平台配置（含独立 Cloudflare 凭据）
10. `list_profiles` — 列出所有已保存配置
11. `delete_profile` — 删除已保存配置
12. `update_dns` — 手动更新 Cloudflare DNS A 记录（需传入 cfApiToken + cfZoneId）
13. `rotate_ip_and_update_dns` — 一键：轮换 IP + 自动更新 DNS（核心工具）

## 编译注意事项

- `tsc` 可能因 `ELECTRON_RUN_AS_NODE=1` 环境变量干扰静默退出（exit 1 无输出）
- 解决方案：`env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS npx tsc`
- Azure SDK：`networkInterfaces.updateProperties` 不存在，用 `beginCreateOrUpdateAndWait`
- MCP SDK：返回 content 的 `type: 'text'` 需加 `as const`
- `package.json` 设为 `"type": "module"`，本地脚本用 `.cjs` 扩展名
