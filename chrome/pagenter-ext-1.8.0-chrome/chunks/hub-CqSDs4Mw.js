import "./db-C_cyLlZZ.js";
import { i as createLucideIcon, r as reactExports, t as tAsync, m as useI18n, k as jsxRuntimeExports, L as Logo, M as MotionOverlay, f as StatusDot, a as Button, d as ReactDOM, R as React, b as ErrorBoundary, I as I18nProvider } from "./index-AisPC-Mg.js";
import { a as callUpstreamMcpByName, c as callApiByProjectAndTool, u as useAgent, S as Square, E as EventCard, A as ActivityCard } from "./cards-C2G-WIrK.js";
import { S as Switch } from "./switch-CvFTQ0h9.js";
import { g as getApi, e as getLatestSpecByApi, l as listApisByProject, i as listProjects } from "./db-C3Se-Bze.js";
import "./constants-0s7FZ8JK.js";
import "./zap-NPAHCgQi.js";
const __iconNode$4 = [
  ["path", { d: "M12 22v-6", key: "6o8u61" }],
  ["path", { d: "M12 8V2", key: "1wkif3" }],
  ["path", { d: "M4 12H2", key: "rhcxmi" }],
  ["path", { d: "M10 12H8", key: "s88cx1" }],
  ["path", { d: "M16 12h-2", key: "10asgb" }],
  ["path", { d: "M22 12h-2", key: "14jgyd" }],
  ["path", { d: "m15 19-3-3-3 3", key: "e37ymu" }],
  ["path", { d: "m15 5-3 3-3-3", key: "19d6lf" }]
];
const FoldVertical = createLucideIcon("fold-vertical", __iconNode$4);
const __iconNode$3 = [
  [
    "path",
    { d: "M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z", key: "goz73y" }
  ],
  ["path", { d: "m2 22 3-3", key: "19mgm9" }],
  ["path", { d: "M7.5 13.5 10 11", key: "7xgeeb" }],
  ["path", { d: "M10.5 16.5 13 14", key: "10btkg" }],
  ["path", { d: "m18 3-4 4h6l-4 4", key: "16psg9" }]
];
const PlugZap = createLucideIcon("plug-zap", __iconNode$3);
const __iconNode$2 = [
  ["path", { d: "M12 22v-5", key: "1ega77" }],
  ["path", { d: "M15 8V2", key: "18g5xt" }],
  [
    "path",
    { d: "M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z", key: "1xoxul" }
  ],
  ["path", { d: "M9 8V2", key: "14iosj" }]
];
const Plug = createLucideIcon("plug", __iconNode$2);
const __iconNode$1 = [
  ["path", { d: "M12 22v-6", key: "6o8u61" }],
  ["path", { d: "M12 8V2", key: "1wkif3" }],
  ["path", { d: "M4 12H2", key: "rhcxmi" }],
  ["path", { d: "M10 12H8", key: "s88cx1" }],
  ["path", { d: "M16 12h-2", key: "10asgb" }],
  ["path", { d: "M22 12h-2", key: "14jgyd" }],
  ["path", { d: "m15 19-3 3-3-3", key: "11eu04" }],
  ["path", { d: "m15 5-3-3-3 3", key: "itvq4r" }]
];
const UnfoldVertical = createLucideIcon("unfold-vertical", __iconNode$1);
const __iconNode = [
  ["path", { d: "m19 5 3-3", key: "yk6iyv" }],
  ["path", { d: "m2 22 3-3", key: "19mgm9" }],
  [
    "path",
    { d: "M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z", key: "goz73y" }
  ],
  ["path", { d: "M7.5 13.5 10 11", key: "7xgeeb" }],
  ["path", { d: "M10.5 16.5 13 14", key: "10btkg" }],
  [
    "path",
    { d: "m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z", key: "1snsnr" }
  ]
];
const Unplug = createLucideIcon("unplug", __iconNode);
class HubWs {
  static MAX_RECONNECT_ATTEMPTS = 8;
  #ws = null;
  #state = "disconnected";
  #busy = false;
  #approved = false;
  #manualDisconnect = false;
  #reconnectTimer = null;
  #reconnectAttempt = 0;
  #handlers;
  #port;
  #onStateChange;
  constructor(port, handlers, onStateChange) {
    this.#port = port;
    this.#handlers = handlers;
    this.#onStateChange = onStateChange;
  }
  get state() {
    return this.#state;
  }
  get busy() {
    return this.#busy;
  }
  connect() {
    if (this.#ws) return;
    this.#clearReconnectTimer();
    this.#manualDisconnect = false;
    this.#setState("connecting");
    const ws = new WebSocket(`ws://localhost:${this.#port}`);
    this.#ws = ws;
    ws.addEventListener("open", () => {
      this.#reconnectAttempt = 0;
      this.#setState("connected");
      this.#send({ type: "ready" });
    });
    ws.addEventListener("close", () => {
      this.#ws = null;
      this.#busy = false;
      this.#approved = false;
      this.#setState("disconnected");
      if (!this.#manualDisconnect) this.#scheduleReconnect();
    });
    ws.addEventListener("message", (event) => {
      this.#handleMessage(event.data);
    });
    ws.addEventListener("error", () => {
    });
  }
  disconnect() {
    this.#manualDisconnect = true;
    this.#clearReconnectTimer();
    this.#ws?.close();
    this.#ws = null;
    this.#busy = false;
    this.#approved = false;
    this.#setState("disconnected");
  }
  #clearReconnectTimer() {
    if (this.#reconnectTimer !== null) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
  }
  #scheduleReconnect() {
    if (this.#reconnectAttempt >= HubWs.MAX_RECONNECT_ATTEMPTS) return;
    this.#clearReconnectTimer();
    const delay = Math.min(1e3 * 2 ** this.#reconnectAttempt, 3e4);
    this.#reconnectAttempt++;
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      if (!this.#ws) this.connect();
    }, delay);
  }
  #setState(state) {
    if (this.#state === state) return;
    this.#state = state;
    this.#onStateChange(state);
  }
  #send(msg) {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      this.#ws.send(JSON.stringify(msg));
    }
  }
  async #handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!await this.#checkApproval()) {
      this.#send({ type: "error", message: "User denied the connection request." });
      return;
    }
    switch (msg.type) {
      case "execute":
        this.#handleExecute(msg);
        break;
      case "stop":
        this.#handlers.onStop();
        break;
      case "list_projects":
      case "list_page_apis":
      case "describe_page_api":
      case "call_page_api":
      case "mcp_call":
        this.#handleRequest(msg);
        break;
    }
  }
  /**
   * 处理 Sniff / MCP 类请求；按 requestId 回 response。
   * 若 handler 缺省（旧 caller），返回 not_supported 错误。
   */
  async #handleRequest(msg) {
    const { requestId } = msg;
    try {
      let data;
      if (msg.type === "list_projects") {
        if (!this.#handlers.onListProjects) throw new Error("list_projects not supported");
        data = await this.#handlers.onListProjects();
      } else if (msg.type === "list_page_apis") {
        if (!this.#handlers.onListPageApis) throw new Error("list_page_apis not supported");
        data = await this.#handlers.onListPageApis(msg.projectId);
      } else if (msg.type === "describe_page_api") {
        if (!this.#handlers.onDescribePageApi) throw new Error("describe_page_api not supported");
        data = await this.#handlers.onDescribePageApi(msg.apiId);
      } else if (msg.type === "call_page_api") {
        if (!this.#handlers.onCallPageApi) throw new Error("call_page_api not supported");
        data = await this.#handlers.onCallPageApi(msg.projectId, msg.toolName, msg.args);
      } else if (msg.type === "mcp_call") {
        if (!this.#handlers.onMcpCall) throw new Error("mcp_call not supported");
        data = await this.#handlers.onMcpCall(msg.serverName, msg.toolName, msg.args);
      }
      this.#send({ type: "response", requestId, data });
    } catch (err) {
      this.#send({
        type: "response",
        requestId,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  async #checkApproval() {
    if (this.#approved) return true;
    const { allowAllHubConnection } = await chrome.storage.local.get("allowAllHubConnection");
    if (allowAllHubConnection === true) {
      this.#approved = true;
      return true;
    }
    const ok = window.confirm(await tAsync("hub.approveConfirm"));
    if (ok) this.#approved = true;
    return ok;
  }
  async #handleExecute(msg) {
    if (this.#busy) {
      this.#send({ type: "error", message: "Hub is busy with another task" });
      return;
    }
    this.#busy = true;
    try {
      const result = await this.#handlers.onExecute(msg.task, msg.config);
      this.#send({ type: "result", success: result.success, data: result.data });
    } catch (err) {
      this.#send({ type: "error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      this.#busy = false;
    }
  }
}
function useHubWs(execute, stop, configure, config) {
  const wsPort = new URLSearchParams(location.search).get("ws");
  const [wsState, setWsState] = reactExports.useState(() => wsPort ? "connecting" : "disconnected");
  const hubWsRef = reactExports.useRef(null);
  const latest = reactExports.useRef({ execute, stop, configure, config });
  reactExports.useEffect(() => {
    latest.current = { execute, stop, configure, config };
  });
  reactExports.useEffect(() => {
    if (!wsPort) return;
    const hubWs = new HubWs(
      Number(wsPort),
      {
        onExecute: async (task, incomingConfig) => {
          const { execute: execute2, configure: configure2, config: config2 } = latest.current;
          if (incomingConfig) {
            await configure2({ ...config2, ...incomingConfig });
          }
          const result = await execute2(task);
          return { success: result.success, data: result.data };
        },
        onStop: () => latest.current.stop(),
        // --- Sniff / MCP 扩展 handlers ---
        // 这些 handler 直接读写 IndexedDB 和发 fetch，hub 页面和扩展同 origin
        onListProjects: async () => {
          const rows = await listProjects();
          return rows.map((p) => ({
            id: p.id,
            name: p.name,
            originPatterns: p.originPatterns,
            status: p.status,
            stats: p.stats
          }));
        },
        onListPageApis: async (projectId) => {
          if (!projectId) throw new Error("projectId is required");
          const apis = await listApisByProject(projectId);
          return apis.filter((a) => a.exposed).map((a) => ({
            id: a.id,
            toolName: a.toolName ?? a.id,
            displayName: a.displayName,
            description: a.description,
            method: a.method,
            urlPattern: a.urlPattern,
            sampleCount: a.sampleCount
          }));
        },
        onDescribePageApi: async (apiId) => {
          const api = await getApi(apiId);
          if (!api) throw new Error(`API ${apiId} not found`);
          const spec = api.currentSpecId ? await getLatestSpecByApi(apiId) : null;
          return {
            api: {
              id: api.id,
              toolName: api.toolName ?? api.id,
              displayName: api.displayName,
              description: api.description,
              method: api.method,
              urlPattern: api.urlPattern,
              exposed: api.exposed
            },
            spec: spec ? {
              version: spec.version,
              structuralHash: spec.structuralHash,
              inputSchema: spec.inputSchema,
              outputSchema: spec.outputSchema,
              confidence: spec.confidence
            } : null
          };
        },
        onCallPageApi: async (projectId, toolName, args) => {
          const r = await callApiByProjectAndTool(projectId, toolName, args ?? {});
          if (r.error) throw new Error(r.error);
          return r.data;
        },
        onMcpCall: async (serverName, toolName, args) => {
          const r = await callUpstreamMcpByName(serverName, toolName, args ?? {});
          if (r.error) throw new Error(r.error);
          return r.data;
        }
      },
      setWsState
    );
    hubWs.connect();
    hubWsRef.current = hubWs;
    return () => {
      hubWs.disconnect();
      hubWsRef.current = null;
    };
  }, [wsPort]);
  return { wsState };
}
function App() {
  const { t } = useI18n();
  const { status, history, activity, currentTask, config, execute, stop, configure } = useAgent();
  const { wsState } = useHubWs(execute, stop, configure, config);
  const historyRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history, activity]);
  const isRunning = status === "running";
  const WsIcon = wsState === "connected" ? PlugZap : wsState === "connecting" ? Plug : Unplug;
  const wsLabel = {
    connected: t("hub.ws.connected"),
    connecting: t("hub.ws.connecting"),
    disconnected: new URLSearchParams(location.search).get("ws") ? t("hub.ws.disconnected") : t("hub.ws.noConnection")
  }[wsState];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-screen bg-background", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "w-80 shrink-0 border-r flex flex-col bg-muted/20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href: "TODO_HOMEPAGE_URL",
          target: "_blank",
          rel: "noopener noreferrer",
          className: "flex items-center gap-2 px-5 h-12 border-b hover:bg-muted/30 transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Logo, { className: "size-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold tracking-tight", children: t("hub.pageTitle") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] font-medium uppercase tracking-wider text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5", children: t("hub.beta") })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto px-5 py-4 space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground leading-relaxed space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t("hub.intro") }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
            t("hub.intro.checkOfficial"),
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "a",
              {
                href: "TODO_GITHUB_URL/tree/main/packages/mcp",
                target: "_blank",
                rel: "noopener noreferrer",
                className: "underline hover:text-foreground",
                children: t("hub.intro.mcpLink")
              }
            ),
            "."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(HubConfig, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ProtocolDocsCollapsible, {})
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t px-5 py-3 text-[10px] text-muted-foreground/60 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
          "v",
          "1.8.0"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          t("about.credits"),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "a",
            {
              href: "TODO_PERSONAL_URL",
              target: "_blank",
              rel: "noopener noreferrer",
              className: "underline hover:text-foreground",
              children: "@XePope"
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex-1 flex flex-col min-w-0 relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(MotionOverlay, { active: isRunning }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-center justify-between border-b px-5 h-12", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(WsIcon, { className: "size-3.5" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: wsLabel })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatusDot, { status }),
          isRunning && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "destructive", size: "sm", onClick: stop, className: "h-7 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { className: "size-3 mr-1" }),
            t("hub.stop")
          ] })
        ] })
      ] }),
      currentTask && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b px-5 py-2 bg-muted/30", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground uppercase tracking-wide", children: t("hub.currentTask") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", title: currentTask, children: currentTask })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          ref: historyRef,
          className: "min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-2",
          children: [
            !currentTask && history.length === 0 && !isRunning && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center h-full text-muted-foreground gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(WsIcon, { className: "size-10 opacity-30" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: wsState === "connected" ? t("hub.empty.waiting") : t("hub.empty.noSession") })
            ] }),
            history.map((event, index) => (
              // eslint-disable-next-line react-x/no-array-index-key
              /* @__PURE__ */ jsxRuntimeExports.jsx(EventCard, { event }, index)
            )),
            activity && /* @__PURE__ */ jsxRuntimeExports.jsx(ActivityCard, { activity })
          ]
        }
      )
    ] })
  ] });
}
function HubConfig() {
  const { t } = useI18n();
  const [allowAll, setAllowAll] = reactExports.useState(false);
  reactExports.useEffect(() => {
    chrome.storage.local.get("allowAllHubConnection").then((r) => {
      setAllowAll(r.allowAllHubConnection === true);
    });
  }, []);
  const toggle = (checked) => {
    setAllowAll(checked);
    chrome.storage.local.set({ allowAllHubConnection: checked });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[11px] font-semibold text-foreground/80 uppercase tracking-wider mb-2", children: t("hub.config") }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group/hub relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "label",
        {
          className: `flex items-center justify-between p-3 rounded-md border cursor-pointer text-xs ${allowAll ? "bg-amber-500/10 border-amber-500/30 text-amber-600" : "bg-muted/50 text-muted-foreground"}`,
          children: [
            t("hub.autoApprove"),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Switch,
              {
                checked: allowAll,
                onCheckedChange: toggle,
                className: allowAll ? "data-[state=checked]:bg-amber-500" : ""
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "group-hover/hub:visible group-hover/hub:opacity-100 transition-opacity duration-150  left-0 right-0 top-full z-10 pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative p-2.5 rounded-md border border-border bg-background/60 backdrop-blur-md shadow-2xl text-muted-foreground text-xs leading-relaxed", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -top-1.5 left-5 size-3 rotate-45 rounded-[1px] border-l border-t border-border bg-background/60 backdrop-blur-md" }),
        t("hub.autoApprove.desc"),
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
          "* ",
          t("hub.autoApprove.caution")
        ] })
      ] }) })
    ] })
  ] });
}
function ProtocolDocsCollapsible() {
  const { t } = useI18n();
  const [open, setOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => setOpen(!open),
        className: "flex items-center gap-1 text-[11px] font-semibold text-foreground/80 uppercase tracking-wider cursor-pointer",
        children: [
          t("hub.docs"),
          open ? /* @__PURE__ */ jsxRuntimeExports.jsx(FoldVertical, { className: "size-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(UnfoldVertical, { className: "size-3" })
        ]
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-4 text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px]", children: [
        t("hub.docs.connect.prefix"),
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-[10px]", children: "hub.html?ws=PORT" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[11px] font-medium text-foreground/60 mb-1.5", children: t("hub.docs.flow") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "list-decimal list-inside space-y-1 text-[11px] leading-relaxed", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t("hub.docs.flow.1") }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
            t("hub.docs.flow.2"),
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-[10px]", children: "ready" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
            t("hub.docs.flow.3"),
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-[10px]", children: "execute" }),
            ` ${t("hub.docs.flow.3.suffix")}`
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t("hub.docs.flow.4") }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
            t("hub.docs.flow.5"),
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-[10px]", children: "result" }),
            " /",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-[10px]", children: "error" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[11px] font-medium text-foreground/60 mb-1.5", children: t("hub.docs.callerToHub") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "bg-muted/50 rounded-md p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap", children: `{ type: "execute", task: string, config?: object }
{ type: "stop" }` })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-[11px] font-medium text-foreground/60 mb-1.5", children: t("hub.docs.hubToCaller") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "bg-muted/50 rounded-md p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap", children: `{ type: "ready" }
{ type: "result", success: boolean, data: string }
{ type: "error", message: string }` })
      ] })
    ] })
  ] });
}
const syncDarkMode = () => {
  document.documentElement.classList.toggle(
    "dark",
    matchMedia("(prefers-color-scheme: dark)").matches
  );
};
syncDarkMode();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncDarkMode);
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(I18nProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) }) }) })
);
