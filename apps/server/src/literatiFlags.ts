/**
 * literati: process-wide switches for running Synara as Literati's hidden
 * sidecar. Both default off, so upstream behavior is unchanged unless the
 * embedding process sets them. Read at call time so tests can toggle them.
 *
 * - `SYNARA_DISABLE_AGENT_GATEWAY_TOOLS=1`: provider sessions get no Synara
 *   gateway tools (`mcp__synara__*`). Connected MCP connectors, which are
 *   proxied through the same gateway, keep working.
 * - `SYNARA_STRICT_MCP=1`: only Synara-injected MCP servers load. Claude runs
 *   with `--strict-mcp-config`; Codex disables every MCP server from the
 *   user's config layers per thread and turns off plugins, apps and the
 *   browser / computer-use features for the app-server process.
 *
 * @module literatiFlags
 */

export function agentGatewayToolsDisabled(): boolean {
  return process.env.SYNARA_DISABLE_AGENT_GATEWAY_TOOLS === "1";
}

export function strictMcpEnabled(): boolean {
  return process.env.SYNARA_STRICT_MCP === "1";
}
