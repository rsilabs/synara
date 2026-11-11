/**
 * literati: process-wide switches for running Synara as Literati's hidden
 * sidecar. Both default off, so upstream behavior is unchanged unless the
 * embedding process sets them. Read at call time so tests can toggle them.
 *
 * - `SYNARA_DISABLE_AGENT_GATEWAY_TOOLS=1`: provider sessions get no Synara
 *   gateway tools (`mcp__synara__*`). Connected MCP connectors, which are
 *   proxied through the same gateway, keep working.
 * - `SYNARA_HOST_APP_NAME=<name>`: prompts name the host app instead of Synara.
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

/**
 * `SYNARA_HOST_APP_NAME=<name>`: the embedding app's name, used in place of
 * "Synara" in every model-facing prompt text so the host stays invisible.
 */
export function hostAppName(): string | undefined {
  const name = process.env.SYNARA_HOST_APP_NAME?.trim();
  return name ? name : undefined;
}

/** The name prompts give the host app: the embedding app's, else "Synara". */
export function hostAppLabel(): string {
  return hostAppName() ?? "Synara";
}
