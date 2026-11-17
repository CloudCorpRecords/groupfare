# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the hosted easygroupflights MCP server. 4 of the 5 captured tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: `egf_get_service_info`, `egf_prepare_group_quote`, `egf_search_flights`, `egf_get_offer`. The capture carries `title` keys on every tool and they are served verbatim; `egf_get_service_info` carries no `required` key in the capture and none is served.
- Omitted: `egf_request_group_quote` — it sends the prepared enquiry, with the organiser's email, phone and name, to a human specialist. The prepare tool (`egf_prepare_group_quote`) only composes the brief and sends nothing, so it is kept.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `groupfare error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `GROUPFARE_MCP_URL`. The upstream record declares no headers, so no auth header is ever sent.
