# 项目长期记忆：CC Switch 改写 Codex 配置的行为（实证）

环境：CC Switch v3.20.0 + Codex 桌面版 + Windows。结论均来自真机 backup→kill cc-switch.exe→restart→diff，非猜测。

## 三档分类（决定 install 脚本能写用户级 ~/.codex/config.toml 哪些键）

**A 档｜CC Switch 每次重启按 SSOT 重生成**（键常"在"，但手改即被覆盖；不要手改）
- 顶层：model_provider, model, model_reasoning_effort, disable_response_storage, notify, model_catalog_json
- [model_providers.custom] 整块（base_url 强制 127.0.0.1:15721，token=PROXY_MANAGED）
- [marketplaces.openai-bundled], [plugins."*@openai-bundled"], [plugins."*@openai-curated"]
- [features], [shell_environment_policy.set], [windows], [desktop]
- [mcp_servers.node_repl](+.env)：按当前 Codex runtime hash 重生成
- [mcp_servers.ip-switch]：CC Switch 读本地市场插件自动合成（也在 A 档）
- [projects.<cc-switch 已知工作区>]：只重生成它认识的

**B 档｜合并保留（手写条目安全，install 可放心 append）**
- [marketplaces.local]
- [plugins."ip-switch@local"]
- 其它非托管 mcp_servers 段

**C 档｜手写条目每次重启被清空**
- [projects.'c:\users\administrator\ip-switch']（手写的信任条目）——重启即删

## 关键纠偏
- **node_repl "始终未被清除" = 被重生成，不是被保留**。证据：重启前后 exe 路径哈希 `415ffebf3d576e9b` → `2fb562745e6d66f0` 变化。所以"键在"≠"可手改"。
- 旧判断"CC Switch 不抹 [projects]"仅对 A 档里它自己的已知工作区条目成立；手写 C 档条目照样清。

## install 设计定论
1. 全局注册写 B 档键（marketplaces.local + plugins.ip-switch@local）到用户级 config.toml → 安全、重启存活，ip-switch 全局可见。
2. 信任条目（C 档）仅 best-effort：Ensure-CodexTrust 留着无害，不可作持久机制。
3. **项目级 ~/ip-switch/.codex/config.toml 与 Profile ~/.codex/ip-switch.config.toml 已彻底移除**（2026-09-02）：
   - 生成逻辑从 install.ps1 / install.sh 删除，磁盘上的两份文件也已删除。
   - 移除理由（均对桌面 UI 零增益）：
     - 项目级：全局列表不读它；且其信任条目是 C 档（CC Switch 重启即清），脆弱。
     - Profile：仅 `codex --profile ip-switch` 加载，桌面 `codex app` 不支持 --profile；且"独立文件加载"机制官方文档未规范、未经实证。
   - 顺带解决了此前"项目级 mcp + 用户级 mcp 同名 → 桌面 MCP 列表 4 vs 3 幽灵计数"的问题。
4. **用户级 [mcp_servers.ip-switch] 改由 install 脚本幂等追加**（Ensure-CodexUserConfig / ensure_codex_user_config，用脚本已解析的 $codexNode/$distJs 路径）→ 用户级注册不再依赖 CC Switch 是否在跑。
   - A 档细化：该段虽属 CC Switch 重生成的 A 档，但 install 用 `Contains('[mcp_servers.ip-switch]')`/`grep -qF` 幂等守卫：
     - CC Switch 已写入 → 命中跳过（不重复表，CC Switch 版本保留）
     - CC Switch 未跑 → 用户级无此段 → 脚本补写，MCP 列表可见
5. **实测确认（2026-09-02）：桌面版「插件列表/市场」与「MCP 列表」均只读用户级 config.toml（或 --profile），不读项目级。**
   - 用户删掉用户级 `[marketplaces.local]`+`[plugins."ip-switch@local"]` 后，即便项目级 / Profile 副本仍含这两段，插件列表也看不到 ip-switch；仅 MCP 列表因用户级 `[mcp_servers.ip-switch]` 仍在而可见。
   - → 用户级注册（Ensure-CodexUserConfig 的 marketplaces + plugins + mcp 三段）是唯一能让桌面 UI 稳定发现 ip-switch 的通道；项目级仅在该目录作为"已信任工作区"打开时生效（且信任条目是 C 档、CC Switch 重启即清），Profile 仅被 `codex --profile` CLI 读取（`codex app` 桌面端不支持 --profile）。
   - **决议（2026-09-02）：项目级 .codex/config.toml 与 Profile ip-switch.config.toml 均从 install 与磁盘移除，单一事实来源收敛为用户级注册。后续重装后桌面可见性只依赖用户级三段。**

## 可复现验证手段
cp ~/.codex/config.toml /tmp/before; taskkill /im cc-switch.exe /f; 重拉起 cc-switch.exe; diff /tmp/before 当前。

## ip-switch skill（2026-09-06 新增，2026-09-06 重构，2026-09-07 再次重构）

**架构**：项目内 `<root>/SKILL.md` + `<root>/skill.json` + `<root>/scripts/` → install 脚本复制到 `~/.workbuddy/skills/ip-switch/scripts/`(保留 `scripts/` 子目录)+ 写 bootstrap 锚点 + 创建项目内 `data/` 运行时目录。

**核心**：单文件 Node.js 脚本 `open-ui.mjs` 跨平台启动 ui/server.cjs 并打开浏览器。零依赖，幂等复用。

**为什么用 skill 而不是 MCP tool**：MCP tool 是 stdio 通道，不能开浏览器。skill 是 AI Agent 触发浏览器动作的唯一干净路径。

**位置约定**：
- 项目源码：`<root>/SKILL.md` + `<root>/skill.json` + `<root>/scripts/{_icon.svg, open-ui.mjs, open-ui.sh, open-ui.ps1}`
- 用户级安装：保留子目录结构：
  ```
  ~/.workbuddy/skills/ip-switch/
  ├── SKILL.md
  ├── skill.json
  └── scripts/              ← 保留作为子目录
      ├── _icon.svg
      ├── open-ui.mjs        ← 调用入口：node ~/.workbuddy/skills/ip-switch/scripts/open-ui.mjs
      ├── open-ui.sh
      ├── open-ui.ps1
      └── .install-path.txt  ← bootstrap 锚点（install 写入；放 scripts/ 下跟 open-ui.mjs 同目录）
  ```
- Codex 镜像：同上结构（**仅当 `~/.codex/skills` 已存在时**复制）
- 项目内运行时目录：`<install-dir>/data/`（**取代之前的 `~/.ip-switch/`**）
  - `install-dir.txt` — 运行时配置（项目路径，给 --status 查询用）
  - `config.json` — 凭据配置（ui/server.cjs 写入）
  - `server-port.txt` — 端口（ui/server.cjs 启动时写入）
  - `server.pid` — 进程 PID（open-ui.mjs 写入）
  - `ui-server.{out,err}.log` — server 日志

**bootstrap 三级查找**（open-ui.mjs 找 INSTALL_DIR 的顺序）：
1. 读 `__dirname/.install-path.txt`（用户级副本模式，install 写入）
2. 用 `__dirname/..` 推断（项目内副本模式，`<root>/scripts/open-ui.mjs` → `<root>`）
3. Fallback 到常见路径 `~/ip-switch`、`~/tools/ip-switch`、`C:\ip-switch`、`/opt/ip-switch`

**server.cjs 数据目录**：
- 优先用环境变量 `IP_SWITCH_DATA_DIR`（open-ui.mjs spawn 时传入）
- Fallback 到 `path.join(__dirname, '..', 'data')`（基于 ui/ 目录推断）

**install 脚本对 skill 的处理（必须无条件安装）**：
- 即使用户没装 WorkBuddy 也要装 → 让 Codex/任何终端用户能跑 `node ~/.workbuddy/skills/ip-switch/scripts/open-ui.mjs`
- 创建 `<install-dir>/data/`（`mkdir -p`）+ 写 `data/install-dir.txt`（运行时配置）
- 复制 `SKILL.md`、`skill.json` → 用户级副本根目录
- `cp -R "$scripts_src/." "$dest/scripts/"` 保留 scripts/ 子目录
- 写 `$dest/scripts/.install-path.txt`（bootstrap 锚点，放在 scripts/ 下避免与 SKILL.md 同级混淆）
- `find "$dest/scripts" -maxdepth 1 -exec chmod +x` 给脚本赋执行位
- 若 `~/.codex/skills` 已存在，镜像一份

**历史踩坑**：
1. 早期用 `cp -R "$scripts_src/." "$dest/"` 把 scripts/ 内容展平 → open-ui.mjs 和 SKILL.md 混一层。修复：保留 scripts/ 子目录。
2. `open-ui.mjs` 用 `~/.ip-switch/install-dir.txt` bootstrap → 2026-09-07 改用 `~/.workbuddy/skills/ip-switch/scripts/.install-path.txt`（用户级副本）+ `__dirname/..`（项目内副本），干掉 `~/.ip-switch/`。
3. `main()` 里 `const path = PAGE_PATHS[args.page]` 与 `import path from 'node:path'` 同名 → TDZ 错误。修复：变量名改为 `pagePath`。
4. install 最初把 `.install-path.txt` 写到 skill 根目录，但 open-ui.mjs 读的是 scripts/ 子目录 → 错配。修复：install 改成写到 `scripts/` 下。

## Windows 后台进程脱离（通用解法，重要！）

**坑**：`spawn(..., {detached: true, stdio: 'ignore'}).unref()` 在 Windows 上**不够**——子进程会被父进程的 job 对象回收，父进程退出子进程死。

**正解（跨平台）**：
```js
if (process.platform === 'win32') {
  // cmd /c start /B 完全脱离父进程（新进程组，无 job 继承）
  spawn('cmd.exe', ['/c', 'start', '/B', process.execPath, 'script.js'], {
    detached: true, stdio: 'ignore', windowsHide: true
  }).unref();
} else {
  // macOS / Linux：detached + unref 即可（POSIX setsid 等价）
  spawn(process.execPath, ['script.js'], { detached: true, stdio: 'ignore' }).unref();
}
```

**特征**：open-ui.mjs 退出后，UI server.cjs 仍在跑。验证方式：起 server → 脚本退出 → `curl 127.0.0.1:<port>` 仍 200。

## Windows 零窗口三层方案（2026-09-07）

按推荐顺序：

1. **Layer 1（外行首选）—— `scripts/open-ui.vbs`**（48 行 Windows GUI 入口）
   - `WScript.Shell.Run "node ... --quiet", 0, False`（WindowStyle=0 隐藏 + 异步不阻塞）
   - 路径 `\` 转 `\\`（VBScript 字符串解析要求）
   - 自动启用 `--quiet`
   - install 用 `cp -R "$scripts_src/." "$dest/scripts/"` 整目录 copy → **新 vbs 自动包含，无需改 install**

2. **Layer 2 —— open-ui.mjs spawn server 时检测 `nodew.exe`**
   - `path.join(path.dirname(process.execPath), 'nodew.exe')`
   - nodew.exe 是 Node 官方 Windows 安装包自带的 GUI subsystem 版本
   - 有则用之（彻底无 console），无则 fallback 到 `windowsHide: true`

3. **Layer 3 —— `windowsHide: true` 兜底**
   - Node 内部用 `CREATE_NO_WINDOW` 标志，但 node.exe 是 console subsystem，可能闪一下

## open-ui.mjs 改造（2026-09-07）

- 加 `--quiet` / `-q` 选项（vbs 内部强制启用）
- 日志：默认双写（stderr + `<install-dir>/data/open-ui.log` 带 ISO timestamp），--quiet 只写文件
- **实现用 `fs.appendFileSync`（同步写）**——关键：不能用 WriteStream，进程立即 exit 时异步 flush 会丢日志
- spawn server 优先 `nodew.exe`

## Codex 章节（2026-09-07）

SKILL.md §6 改为通用表格（占位符 `<skill-root>`）+ §6.1 Codex 用户视角（桌面端 / CLI / 手动）。install 时镜像到 `~/.codex/skills/ip-switch/`（仅当 `~/.codex/skills` 已存在）。

| Agent | skill 根 |
|-------|---------|
| WorkBuddy | `~/.workbuddy/skills/ip-switch/` |
| Codex 桌面端/CLI | `~/.codex/skills/ip-switch/` |
| 项目内原件（兜底） | `<install-dir>/scripts/` |

**Codex 桌面端用户**根本不需要敲命令——在 Codex 对话框里说"打开 ip-switch 配置页"，AI 自动跑脚本。

## 关键教训（2026-09-07）

1. **Edit 工具可能撒谎**——返回 "Successfully edited" 但文件未改。**Edit 后必须立即 grep 验证**，不能信工具的成功提示
2. **fs.createWriteStream 在进程立即 exit 时丢日志**——改 `fs.appendFileSync` 同步写

## Windows 零窗口三层方案（外行用户场景）

外行手动跑 `node ...open-ui.mjs aws` 会看到 [INFO] 日志 + 可能闪一下 cmd 窗口 → "以为是病毒"。三层防线按推荐度排序：

**Layer 1（首选）—— `open-ui.vbs` 桌面入口**（2026-09-07 新增）：
- WScript.Shell 用 `WindowStyle=0` + `bWaitOnReturn=False` 调用 `node ... --quiet`
- wscript.exe 是 GUI subsystem → node 子进程无 console → 整条链路零窗口
- 参数透传：双击无参 = 全功能表单；`wscript open-ui.vbs aws` = AWS 配置页
- 路径转义：`Replace(mjsPath, "\", "\\")`（VBScript Shell.Run 字符串解析需要）
- 自动启用 `--quiet`：vbs 内部拼 `node "..." --quiet [用户参数]`
- 不创建桌面快捷方式（让用户自己右键"发送到桌面"，避免 install 做错）

**Layer 2 —— `nodew.exe` 自动检测**（spawn server 子进程时）：
- `nodew.exe` 是 Node 官方 Windows 安装包自带的 GUI subsystem 版本，与 `node.exe` 同目录
- 检测：`fs.existsSync(path.join(path.dirname(process.execPath), 'nodew.exe'))`
- 优先用 nodew.exe 启动 server.cjs → 彻底无 console
- 用户机器若无 nodew.exe（便携版 Node）→ fallback 到 node.exe + windowsHide: true

**Layer 3 —— `windowsHide: true` 兜底**：
- Node.js 内部用 `CREATE_NO_WINDOW` 标志
- 对 GUI subsystem 程序（nodew.exe）有效；对 console subsystem（node.exe）可能仍闪一下

## open-ui.mjs 改造（2026-09-07）

- 加 `--quiet` / `-q` 选项：log 只写文件，不打印 stderr
- 日志：**默认双写 stderr + `<install-dir>/data/open-ui.log`**（同步 `fs.appendFileSync`，不能用 WriteStream —— 进程立即 exit 会丢缓冲）
- spawn server 优先用 nodew.exe
- vbs 文件由 install 脚本的 `cp -R "$scripts_src/." "$dest/scripts/"` 自动复制，无需改 install

## 教训（必须遵守）

1. **Edit 工具返回 "Successfully edited" 不等于真改了**！必须**立即 grep 验证**。
   经验：本轮我 Edit 了 log 块，工具说成功但文件未改 → 后续 `--status` 报 `_quietMode is not defined` TDZ 才发现。下次：每次 Edit 后必须 grep 确认改动真的落地。
2. **fs.createWriteStream 在进程立即 exit 时丢日志**。小日志量场景直接用 `fs.appendFileSync`（每次几行无性能问题）。
3. **VBScript Shell.Run 字符串里的 `\` 必须转义成 `\\`**。否则路径里含空格或反斜杠时会出错。

## 安装后用户调用方式（按用户友好度排序）

| 用户类型 | 推荐调用 | 是否弹窗 |
|----------|---------|----------|
| 外行 / 桌面用户 | 双击 `open-ui.vbs` 或桌面快捷方式 | **零窗口** |
| 终端熟练 | `node ~/.workbuddy/skills/ip-switch/scripts/open-ui.mjs aws` | 用户终端可见 |
| AI agent (WorkBuddy/Codex) | `node .../open-ui.mjs aws`（child_process spawn，无 console） | 零窗口（agent 自己没 console） |
| 静默调用 | 加 `--quiet` / `-q` | log 只写文件 |

**用户级副本布局**（install 后）：
```
~/.workbuddy/skills/ip-switch/
├── SKILL.md
├── skill.json
└── scripts/                ← scripts/ 作为子目录保留
    ├── _icon.svg
    ├── open-ui.mjs         ← 主入口
    ├── open-ui.sh          ← bash wrapper（可选）
    ├── open-ui.ps1         ← PowerShell wrapper（可选）
    ├── open-ui.vbs         ← Windows GUI 入口（外行用，零窗口）
    └── .install-path.txt   ← bootstrap 锚点（install 写入）
```
