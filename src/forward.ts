/**
 * groupfare core: a forwarding client for the hosted
 * easygroupflights MCP server.
 *
 * Nothing about the fares is computed here.
 * tools/list is answered from the literal definitions
 * below, which reproduce a live capture of the upstream
 * server word for word (name, title, description and
 * inputSchema exactly as captured; the capture carries
 * title keys on every tool, and one tool --
 * egf_get_service_info -- carries no `required` key, so
 * none is served for it). A tools/call travels upstream
 * over a streamable-HTTP JSON-RPC session: an initialize
 * POST, a notifications/initialized POST, then the
 * tools/call POST, carrying the Mcp-Session-Id response
 * header on later requests when the upstream issues one.
 * The session opens lazily on the first forwarded call
 * and is reused for the client's lifetime.
 *
 * The endpoint is pinned to
 * https://mcp.easygroupflights.com/mcp and may be
 * replaced with the GROUPFARE_MCP_URL environment
 * variable (that override is a labelled reconstruction).
 * The registry record declares NO headers on the upstream
 * remote, so no auth header is ever sent, under any
 * environment.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures -- an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch
 * that throws or times out -- become an isError result
 * whose text begins with `groupfare error:` (that
 * rendering is a labelled reconstruction). Replies may
 * be plain JSON or SSE (`data:` lines); the JSON-RPC
 * message whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://mcp.easygroupflights.com/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/easygroupflights-tools.json; generated   */
/* programmatically by parsing and re-serialising the fixture JSON,     */
/* never retyped). 4 of the 5 captured tools are built;                 */
/* egf_request_group_quote is omitted (see BUILD-REPORT.md).            */
/* ------------------------------------------------------------------ */

export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "egf_get_service_info",
    "title": "About easygroupflights",
    "description": "Describes easygroupflights for one market: who it serves, how group fares differ from public tickets, what happens after a quote is requested, and how to reach a person. Submits nothing.",
    "inputSchema": {
      "properties": {
        "market": {
          "description": "Which market to describe. Defaults to en.",
          "enum": [
            "en",
            "pl",
            "at"
          ],
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "egf_prepare_group_quote",
    "title": "Prepare a group flight quote request",
    "description": "Checks a group flight enquiry for 10 or more seated travellers and returns the exact brief that would go to a human specialist, with a confirmation_token valid for 15 minutes. Nothing is sent.",
    "inputSchema": {
      "properties": {
        "adults": {
          "description": "Travellers aged 16 or over.",
          "minimum": 1,
          "type": "integer"
        },
        "cabin_class": {
          "description": "Defaults to economy.",
          "enum": [
            "economy",
            "business"
          ],
          "type": "string"
        },
        "children": {
          "description": "Travellers aged 2–11, each in their own seat.",
          "minimum": 0,
          "type": "integer"
        },
        "children_ages": {
          "description": "Age of each child, one entry per child.",
          "items": {
            "type": "integer"
          },
          "type": "array"
        },
        "date_flexibility_days": {
          "description": "How many days either side of the given dates the group can move. 0 means fixed dates.",
          "minimum": 0,
          "type": "integer"
        },
        "departure_date": {
          "description": "Outbound date, ISO 8601 (YYYY-MM-DD).",
          "type": "string"
        },
        "destination": {
          "description": "Arrival airport as an IATA code, e.g. [\"BCN\"].",
          "items": {
            "pattern": "^[A-Za-z]{3}$",
            "type": "string"
          },
          "type": "array"
        },
        "email": {
          "description": "Where the quote is sent. Required.",
          "type": "string"
        },
        "first_name": {
          "description": "Organiser's first name.",
          "type": "string"
        },
        "infants": {
          "description": "Under 2, travelling on an adult lap. They do not occupy a seat and do not count towards the group of 10.",
          "minimum": 0,
          "type": "integer"
        },
        "last_name": {
          "description": "Organiser's surname.",
          "type": "string"
        },
        "market": {
          "description": "Which market handles the enquiry: en (easygroupflights.com), pl (grupoweloty.pl) or at (gruppenfluege.at). Defaults to en.",
          "enum": [
            "en",
            "pl",
            "at"
          ],
          "type": "string"
        },
        "note": {
          "description": "Anything that shapes the fare: what the group is (school trip, wedding, sports team, conference), baggage or equipment needs, budget, who pays, whether names are known yet.",
          "type": "string"
        },
        "origin": {
          "description": "Departure airport as an IATA code, e.g. [\"LHR\"]. Several codes are allowed when the group converges from more than one city.",
          "items": {
            "pattern": "^[A-Za-z]{3}$",
            "type": "string"
          },
          "type": "array"
        },
        "phone": {
          "description": "Contact number in international form, e.g. +441244568183. Required: a group specialist may phone to confirm details.",
          "type": "string"
        },
        "return_date": {
          "description": "Return date, ISO 8601 (YYYY-MM-DD). Omit for a one-way group booking.",
          "type": "string"
        },
        "return_destination": {
          "description": "Return leg arrival airports, if travellers go home to a different city.",
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "return_origin": {
          "description": "Return leg departure airports, if the group flies home from somewhere other than the destination.",
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "youths": {
          "description": "Travellers aged 12–15.",
          "minimum": 0,
          "type": "integer"
        },
        "youths_ages": {
          "description": "Age of each youth, one entry per youth.",
          "items": {
            "type": "integer"
          },
          "type": "array"
        }
      },
      "required": [
        "origin",
        "destination",
        "departure_date",
        "adults",
        "email",
        "phone"
      ],
      "type": "object"
    }
  },
  {
    "name": "egf_search_flights",
    "title": "Search flights for a small party",
    "description": "Searches live public fares for 1 to 9 travellers and returns options with per-person prices, carriers and stops, cheapest first, each with an offer_id valid for 30 minutes. Results come in pages: pass next_cursor back as cursor, with the same route and dates, for more.",
    "inputSchema": {
      "properties": {
        "cursor": {
          "description": "next_cursor from the previous page of this search. Omit for the first page.",
          "type": "string"
        },
        "departure_date": {
          "description": "Outbound date, ISO 8601 (YYYY-MM-DD).",
          "type": "string"
        },
        "destination": {
          "description": "Arrival airport, IATA code, e.g. BCN.",
          "type": "string"
        },
        "limit": {
          "description": "Fares per page. Defaults to 10.",
          "maximum": 20,
          "minimum": 1,
          "type": "integer"
        },
        "origin": {
          "description": "Departure airport, IATA code, e.g. VIE.",
          "type": "string"
        },
        "passengers": {
          "description": "How many people are travelling, 1 to 9. Defaults to 1.",
          "maximum": 9,
          "minimum": 1,
          "type": "integer"
        },
        "return_date": {
          "description": "Return date, ISO 8601 (YYYY-MM-DD). Omit for one way.",
          "type": "string"
        }
      },
      "required": [
        "origin",
        "destination",
        "departure_date"
      ],
      "type": "object"
    }
  },
  {
    "name": "egf_get_offer",
    "title": "Get one flight offer",
    "description": "Returns one fare from a recent flight search, by its offer_id: the per-person price, the flights, a booking link and the time until which the offer_id is valid. Works for 30 minutes after the search.",
    "inputSchema": {
      "properties": {
        "offer_id": {
          "description": "offer_id of a fare, exactly as the flight search returned it.",
          "type": "string"
        }
      },
      "required": [
        "offer_id"
      ],
      "type": "object"
    }
  }
];
export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured built surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `groupfare error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class GroupfareClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).GROUPFARE_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    // The registry record declares NO headers on the upstream
    // remote: no Authorization header is ever sent.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "groupfare", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): GroupfareClient {
  return new GroupfareClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new GroupfareClient(deps).callTool(name, args);
}
