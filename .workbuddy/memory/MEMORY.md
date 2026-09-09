# 项目长期记忆：cloud-ip-rotator / ip-switch（实证结论，非猜测）

## CC Switch 改写 Codex 配置（三档分类）——决定 install 能写用户级 ~/.codex/config.toml 哪些键
环境：CC Switch v3.20.0 + Codex 桌面版 + Windows。验证法：`cp ~/.codex/config.toml /tmp/before; taskkill /im cc-switch.exe /f; 重拉起; diff`。

- **A 档｜CC Switch 每次重启按 SSOT 重生成**（键常"在"但手改即被覆盖，勿手改）：顶层 model_provider/model/model_reasoning_effort/disable_response_storage/notify/model_catalog_json；[model_providers.custom] 整块（base_url 强制 127.0.0.1:15721，token=PROXY_MANAGED）；[marketplaces.openai-bundled]/[plugins."*@openai-bundled"]/[plugins."*@openai-curated"]；[features]/[shell_environment_policy.set]/[windows]/[desktop]；[mcp_servers.node_repl](+.env，按 Codex runtime hash 重生成)；[mcp_servers.ip-switch]（CC Switch 读本地市场插件自动合成）；[projects.<cc-switch 已知工作区>]。
- **B 档｜合并保留**（手写安全，install 可放心 append）：[marketplaces.local]、[plugins."ip-switch@local"]、其它非托管 mcp_servers 段。
- **C 档｜重启即清空**：手写 [projects.'...'] 信任条目。

**纠偏**：node_repl"键在"≠"可手改"——它是被重生成（重启前后 exe 路径哈希 415ffebf…→2fb56274… 变化）。"CC Switch 不抹 [projects]"只对 A 档自己认识的条目成立。

## install 设计定论（2026-09-02 收敛）
1. 全局注册写 **B 档键**（marketplaces.local + plugins."ip-switch@local"）→ 重启存活、全局可见。
2. 信任条目（C 档）仅 best-effort（Ensure-CodexTrust 留着无害，不作持久机制）。
3. **项目级 ~/ip-switch/.codex/config.toml 与 Profile ~/.codex/ip-switch.config.toml 已彻底移除**（install 生成逻辑 + 磁盘文件都删）。理由：桌面「插件/MCP 列表」只读用户级 config.toml（或 --profile），项目级/Profile 对桌面 UI 零增益；顺带解决同名 mcp 幽灵计数（4 vs 3）。
4. **用户级 [mcp_servers.ip-switch] 由 install 幂等追加**（Ensure-CodexUserConfig / ensure_codex_user_config）：脚本已含该段（CC Switch 在跑）→ Contains/grep -qF 命中跳过；不在跑 → 补写，MCP 列表仍可见。
5. **桌面可见性只依赖用户级三段**（marketplaces.local + plugins + mcp）。Profile 仅 `codex --profile` CLI 读，`codex app` 不支持 --profile。

## ip-switch skill 架构
源码 `<root>/{SKILL.md, skill.json, scripts/}` → install 复制到 `~/.workbuddy/skills/ip-switch/`（scripts/ 保留为子目录）+ 写 bootstrap 锚点 + 创建 `<install-dir>/data/` 运行时目录（install-dir.txt / config.json / server-port.txt / server.pid / ui-server.{out,err}.log / open-ui.log）。Codex 镜像 `~/.codex/skills/ip-switch/`（仅当 `~/.codex/skills` 已存在）。

- **核心**：单文件零依赖 `scripts/open-ui.mjs`，跨平台起 ui/server.cjs + 开浏览器。skill 而非 MCP tool 的原因：MCP 是 stdio 通道开不了浏览器，skill 是 Agent 触发浏览器动作的干净路径。
- **bootstrap 三级找 INSTALL_DIR**：① `__dirname/.install-path.txt`（用户级副本，install 写入 scripts/ 下）② `__dirname/..` 推断（项目内副本）③ fallback ~/ip-switch、~/tools/ip-switch、C:\ip-switch、/opt/ip-switch。
- **server.cjs 数据目录**：优先 env `IP_SWITCH_DATA_DIR`（open-ui.mjs spawn 传入），fallback `path.join(__dirname,'..','data')`。
- **install 对 skill 无条件安装**（用户没装 WorkBuddy 也装，让 Codex/终端能跑）；`cp -R "$scripts_src/." "$dest/scripts/"` 整目录复制（新文件如 .vbs 自动包含）；写 `scripts/.install-path.txt`；赋执行位。
- 历史踩坑：scripts/ 内容被展平混层；`~/.ip-switch/` 定位已被干掉；`const path = PAGE_PATHS[...]` 与 import path 同名 TDZ → 改名 pagePath；.install-path.txt 曾写到 skill 根目录与 open-ui.mjs 读取目录错配。

## Windows 后台进程脱离（通用解法，重要）
`spawn(detached+unref)` 在 Windows **不够**（子进程被父 job 回收）。正解：
```js
if (process.platform === 'win32') {
  spawn('cmd.exe', ['/c','start','/B', process.execPath, 'script.js'], { detached:true, stdio:'ignore', windowsHide:true }).unref();
} else {
  spawn(process.execPath, ['script.js'], { detached:true, stdio:'ignore' }).unref();
}
```
验证：起 server → 脚本退出 → `curl 127.0.0.1:<port>` 仍 200。

## Windows 零窗口三层方案（外行场景：怕"闪 cmd 窗口像病毒"）
1. **Layer 1（首选）`scripts/open-ui.vbs`**（Windows GUI 入口）：`WScript.Shell.Run "node ... --quiet", 0, False`；wscript 是 GUI subsystem → 整链零窗口；参数透传（无参=全功能表单，`wscript open-ui.vbs aws`=AWS 页）；**路径 `\` 必须转 `\\`**；自动拼 --quiet；不建桌面快捷方式。
2. **Layer 2 `nodew.exe` 自动检测**：spawn server 时 `fs.existsSync(path.join(path.dirname(process.execPath),'nodew.exe'))`，有则用之（彻底无 console），无则 fallback node.exe + windowsHide。
3. **Layer 3 `windowsHide:true` 兜底**（console subsystem 的 node.exe 可能仍闪一下）。

## open-ui.mjs 改造（2026-09-07）
`--quiet`/`-q` 选项；日志默认双写 stderr + `<install-dir>/data/open-ui.log`（ISO timestamp），--quiet 只写文件；**必须 `fs.appendFileSync` 同步写**（WriteStream 在进程立即 exit 时丢缓冲）；spawn server 优先 nodew.exe。

## SKILL.md §6 章节（Codex 用户）
§6 通用表格用占位符 `<skill-root>`；§6.1 Codex 视角（桌面/CLI/手动）。skill 根：WorkBuddy=`~/.workbuddy/skills/ip-switch/`、Codex=`~/.codex/skills/ip-switch/`、项目内原件兜底。Codex 桌面用户不用敲命令，对话框说"打开 ip-switch 配置页"即可。

## 调用方式（按用户友好度排序）
| 用户 | 调用 | 是否弹窗 |
|---|---|---|
| 外行/桌面 | 双击 `open-ui.vbs` | 零窗口 |
| 终端熟练 | `node ~/.workbuddy/skills/ip-switch/scripts/open-ui.mjs aws` | 用户终端可见 |
| AI agent | child_process spawn 同命令 | 零窗口 |
| 静默 | 加 `--quiet`/`-q` | 只写日志文件 |

## 教训（必须遵守）
1. **Edit 工具可能撒谎**——返回 "Successfully edited" 不等于真改了（曾致 `_quietMode is not defined` TDZ 才发现）。**每次 Edit 后必须立即 grep 验证**。
2. `fs.createWriteStream` 在进程立即 exit 时丢日志 → 小日志量直接用 `fs.appendFileSync`。
3. VBScript Shell.Run 字符串里的 `\` 必须转义成 `\\`（路径含空格/反斜杠时出错）。
