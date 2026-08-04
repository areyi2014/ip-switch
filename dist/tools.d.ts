/**
 * MCP Tool Definitions — 定义所有暴露给 AI Agent 的工具
 *
 * 设计原则：
 *   1. 凭据可通过 credentials 参数即时传入，也可持久化到配置文件
 *   2. 所有工具都是幂等的（重试安全）
 *   3. 统一错误格式，包含 provider 上下文
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/** 注册所有 MCP 工具 */
export declare function registerTools(server: McpServer): void;
