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
3. 项目级 ~/ip-switch/.codex/config.toml 与 Profile ~/.codex/ip-switch.config.toml 作冗余通道保留。
4. **用户级 [mcp_servers.ip-switch] 改由 install 脚本幂等追加**（Ensure-CodexUserConfig / ensure_codex_user_config，用脚本已解析的 $codexNode/$distJs 路径）→ 用户级注册不再依赖 CC Switch 是否在跑。
   - A 档细化：该段虽属 CC Switch 重生成的 A 档，但 install 用 `Contains('[mcp_servers.ip-switch]')`/`grep -qF` 幂等守卫：
     - CC Switch 已写入 → 命中跳过（不重复表，CC Switch 版本保留）
     - CC Switch 未跑 → 用户级无此段 → 脚本补写，MCP 列表可见
   - 项目级模板 ipSwitchConfigBody / ip_switch_config_body 仍不含 mcp 段（避免"4 vs 3"幽灵计数）。

## 可复现验证手段
cp ~/.codex/config.toml /tmp/before; taskkill /im cc-switch.exe /f; 重拉起 cc-switch.exe; diff /tmp/before 当前。
