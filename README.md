# groupfare

Planning a group trip and wondering what the fares actually look like? groupfare is a local forwarding client for the hosted easygroupflights MCP service: it answers `tools/list` locally from the captured tool definitions and forwards every call to the service, returning the answers exactly as the service sends them back.

Four of the five captured tools are served. You can read what the service does and which market it serves, prepare a group quote brief for 10 or more travellers (the brief is composed and returned to you — nothing is sent anywhere), search live public fares for a small party of 1 to 9 travellers, and fetch a single fare offer by its `offer_id`, including its booking link. The fifth captured tool, `egf_request_group_quote`, is deliberately omitted: it sends the prepared enquiry — with the organiser's email, phone and name — to a human specialist. This rebuild never sends it.

## The tools

- **`egf_get_service_info`** — What easygroupflights is for one market: who it serves, how group fares differ from public tickets, what happens after a quote is requested, and how to reach a person. Submits nothing. `market` is one of `en`, `pl`, `at` and defaults to `en`. No required parameters.
- **`egf_prepare_group_quote`** — Checks a group flight enquiry for 10 or more seated travellers and returns the exact brief that would go to a human specialist, with a `confirmation_token` valid for 15 minutes. Nothing is sent. Required: `origin`, `destination`, `departure_date`, `adults`, `email`, `phone`.
- **`egf_search_flights`** — Live public fares for 1 to 9 travellers, cheapest first, each with an `offer_id` valid for 30 minutes. Results are paged: pass `next_cursor` back as `cursor` for more. Required: `origin`, `destination`, `departure_date`.
- **`egf_get_offer`** — One fare from a recent search, by its `offer_id`: the per-person price, the flights, a booking link and the time until which the `offer_id` is valid. Works for 30 minutes after the search. `offer_id` is required.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/groupfare mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "groupfare": {
      "command": "npx",
      "args": ["-y", "@reneturcios/groupfare", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/groupfare
docker run --rm ghcr.io/cloudcorprecords/groupfare egf_search_flights '{"origin":"VIE","destination":"BCN","departure_date":"2026-11-01"}'
```

## CLI

One binary serves both the command line and the MCP server. Each tool is a subcommand taking a single JSON string with that tool's arguments:

```bash
groupfare egf_get_service_info '{}'
groupfare egf_prepare_group_quote '{"origin":["LHR"],"destination":["BCN"],"departure_date":"2026-11-01","adults":12,"email":"organiser@example.com","phone":"+441244568183"}'
groupfare egf_search_flights '{"origin":"VIE","destination":"BCN","departure_date":"2026-11-01","passengers":2}'
groupfare egf_get_offer '{"offer_id":"off-123"}'
groupfare --version
```

Exit codes: `0` when the forwarded call succeeds, `1` when the upstream result is an error, and `2` for usage problems such as an unknown subcommand or a malformed JSON argument.

## Configuration

- `GROUPFARE_MCP_URL` — Overrides the upstream endpoint. The default is the pinned hosted endpoint, `https://mcp.easygroupflights.com/mcp`. (The override variable is a reconstruction added by this rebuild.)

The upstream registry record declares no headers, so no authentication header is ever sent; the tool surface was captured keyless.

Upstream failures — a JSON-RPC error from the service, a non-2xx response, an unreadable body, or a request that fails outright — are reported to the caller as an error result whose text starts with `groupfare error:`.

## How forwarding works

The first forwarded call opens a session: an `initialize` request (protocol version `2025-03-26`), followed by a `notifications/initialized` notification, then the `tools/call` itself. If the service answers the initialize request with an `Mcp-Session-Id` header, that value is carried on every later request, and the open session is reused for the rest of the process. Replies are accepted either as plain JSON or as server-sent events. Successful results pass through verbatim, including any `isError` flag and any extra fields the service includes.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The test suite checks the served tool list against the captured surface (all 4 built tools, deep-equal, in order, with titles served verbatim and no `required` key added to the one tool that carries none), asserts the omitted `egf_request_group_quote` tool is absent at registry, MCP and CLI level, exercises the session handshake and its reuse, verifies that no `Authorization` or `X-API-Key` header is ever sent under any environment, and verifies that arguments go upstream untouched and results come back untouched.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
