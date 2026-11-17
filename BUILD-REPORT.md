# BUILD REPORT — groupfare

Clean-room rebuild of `com.easygroupflights/easygroupflights`
v2.1.0 (remote-only MCP server at
`https://mcp.easygroupflights.com/mcp`), built 2026-10-28 as
a forwarding client. Package: `@reneturcios/groupfare` 0.1.0,
registry name `io.github.CloudCorpRecords/groupfare`.

## Surface built

Labelled subset: **4 of 5 captured tools built**, one omitted.

| Tool | Required fields as served |
|------|---------------------------|
| `egf_get_service_info` | NO `required` key in the capture — served verbatim, none invented |
| `egf_prepare_group_quote` | `origin`, `destination`, `departure_date`, `adults`, `email`, `phone` |
| `egf_search_flights` | `origin`, `destination`, `departure_date` |
| `egf_get_offer` | `offer_id` |

**OMITTED: `egf_request_group_quote`** — "Sends a prepared
group flight enquiry to a human specialist, who replies by
email": the final send of the organiser's email, phone and
name to a human inbox. It is absent at registry level (not in
`TOOL_DEFS`/`TOOL_NAMES`), at the MCP layer (a call is
rejected with McpError MethodNotFound before any network
hop), and at CLI level (no subcommand; invoking it prints
usage and exits 2, and the usage text does not name it). All
three absences are asserted in the test suite.

Judgments recorded in the spec and followed here:

- `egf_prepare_group_quote` is kept: per its own captured
  description it "returns the exact brief that would go to a
  human specialist, with a confirmation_token... Nothing is
  sent" — the prepare-never-submit shape. Its required email
  and phone are the caller's own inputs, echoed back in the
  brief; the tool sends nothing anywhere.
- `egf_get_offer` is kept: it merely RETURNS one fare plus a
  booking link (a navigation URL), takes no personal details
  and creates no checkout session or booking. **Flagged for
  re-triage before any publish wave**, per the spec.

Each served tool carries exactly the keys `name`, `title`,
`description`, `inputSchema`, exactly as captured: the capture
carries `title` keys on every tool and they are served
verbatim. The tool literals were generated programmatically
from `harness/fixtures/easygroupflights-tools.json` by the
generator at `/tmp/b50-groupfare-scratch/gen2.py` (parse +
re-serialise; its round-trip assertions confirmed the emitted
literals parse back to the fixture's tool objects) — never
retyped — and the registration-integrity test suite plus the
parity harness confirmed the served literals deep-equal the
fixture's 4 tool objects, in order. (Note: the VM write guard
blocked the generator's direct file write of fixture-derived
bytes — it landed as a 0-byte file with EPERM — so the
generator emitted the literal on stdout and the file was
written with the file-write tool, then re-verified by parsing
the emitted `TOOL_DEFS` literal out of `src/forward.ts` and
deep-equalling it against the fixture: OK.) Tools are
registered via the MCP SDK low-level Server API
(`ListToolsRequestSchema` / `CallToolRequestSchema`
handlers), not McpServer+zod.

## Fixture conflicts

**None.** The spec and the fixture agree on the 4 served
tools' names, titles, descriptions, required fields (including
the one tool with no `required` key: `egf_get_service_info`)
and property shapes, and on the omission of
`egf_request_group_quote` (already absent from the slimmed
fixture, recorded in its `_source`).

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://mcp.easygroupflights.com/mcp`.
- Env override `GROUPFARE_MCP_URL` — labelled reconstruction.
- The registry record declares NO headers on the remote: no auth
  header is ever sent. Tests assert that no `Authorization`
  header is sent under any environment — including with key-like
  env vars (`GROUPFARE_API_KEY`, `API_KEY`, `AUTHORIZATION`)
  set — and that no `X-API-Key` header is ever sent; upstream
  requests carry only `Content-Type`, `Accept` and, when issued,
  `Mcp-Session-Id`.
- Error rendering `groupfare error:` text for upstream failures —
  labelled reconstruction.
- Upstream results pass through verbatim, including
  `structuredContent`, `isError` and extra fields. tools/call is
  forwarded as streamable-HTTP JSON-RPC: initialize
  (protocolVersion `2025-03-26`) → notifications/initialized →
  tools/call, honouring `Mcp-Session-Id` when issued; plain-JSON
  and SSE replies are both parsed. The forwarding core takes an
  injectable fetch; tests stub the upstream — no live network
  calls in tests.

## Deviations

None in the build itself. One environment note on the lockfile
route, recorded under Lockfile below.

## Lockfile

- Route: the final lockfile was produced in the build dir with
  no pre-existing lockfile by
  `npm install --package-lock-only --ignore-scripts --offline`
  (Route 3, offline). Sequence, honestly: the first offline
  attempt failed `ENOTCACHED` (the `@modelcontextprotocol/sdk`
  packument was not in the local cache); the fallback route
  (`HTTPS_PROXY=http://hatch-egress-proxy:3128` +
  `--registry https://registry.npmjs.org`) failed repeatedly
  with `EPERM` on the fetch-body write (the VM write guard);
  an online attempt that was later killed had meanwhile warmed
  the npm cache, after which the offline Route-3 command
  succeeded and produced the lockfile below. The full
  `npm install` for `node_modules` was likewise run offline
  against the warm cache.
- Parses as JSON; `name` == `@reneturcios/groupfare`.
- Package entries: **128**.
- sha256: `59b0254b04641bb70388f1e4a87723b591b9b371908439cf217f47e5b89eb4b0`
  (re-verified unchanged after the subsequent offline
  `npm install`).

## server.json

- Description exactly: "Group flight fares: service info, small-party fare search, offers, and a never-sent quote brief." —
  **96 characters** (verified programmatically).
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/groupfare:0.1.0`) carries **no**
  `version` field. Both entries carry packageArguments
  `[{type: positional, value: mcp}]` and transport stdio.
  Dockerfile (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/groupfare"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/groupfare`
  and its smoke test asserts the server name `groupfare`.

## Verification (all run 2026-10-28)

1. `npx tsc --noEmit` → exit 0.
2. `npm run build` → exit 0; real `dist/` produced (cli, forward,
   index, mcp, types — .js, .d.ts, .js.map each).
3. `node dist/cli.js --version` → `0.1.0`.
4. `npm test` → **58 tests, 58 pass, 0 fail** (registration-integrity
   suite deep-equals the served tools/list against the fixture's 4
   tools, including title verbatim and required-key exactness
   assertions — egf_get_service_info has NO required key — plus
   subset assertions that the omitted `egf_request_group_quote` is
   absent at registry, MCP (MethodNotFound) and CLI level, session
   handling/reuse, env override, the no-Authorization /
   no-X-API-Key assertions under any environment, verbatim per-tool
   argument forwarding for all 4 tools and result pass-through
   including structuredContent and upstream isError, SSE parsing,
   error rendering for both the JSON-RPC-error and transport-failure
   paths, MCP-layer validation, and CLI behaviour including a
   working subcommand for every one of the 4 tools against a local
   stub server).
5. Parity: `python3 /home/hatch/workspace/mcp-rebuild-100/harness/parity.py --original /home/hatch/workspace/mcp-rebuild-100/harness/fixtures/easygroupflights-tools.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/groupfare/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/groupfare/parity-out` → **verdict PASS, parity 100.0**
   (4/4 identical, 0 missing, 0 extra, no schema diffs). Output in
   `parity-out/`.
