import { e as getSession, d as deleteSession, l as listSessions, c as clearSessions, f as listTipScripts } from "./db-C_cyLlZZ.js";
import { i as createLucideIcon, r as reactExports, k as jsxRuntimeExports, a as Button, e as RotateCcw, m as useI18n, g as cn, j as cva, M as MotionOverlay, L as Logo, f as StatusDot, S as Settings, E as EmptyState, B as BookOpen, d as ReactDOM, R as React, b as ErrorBoundary, I as I18nProvider } from "./index-AisPC-Mg.js";
import { E as EventCard, C as CircleCheckBig, R as ReactCodeMirror, o as oneDark, j as javascript, u as useAgent, A as ActivityCard, S as Square } from "./cards-C2G-WIrK.js";
import { T as Trash2, X, I as Input, P as Plus, C as ChevronRight, E as EyeOff } from "./input-Bc2XF5Xz.js";
import { C as CircleX, E as Eye } from "./constants-0s7FZ8JK.js";
import { i as listProjects, g as getApi, e as getLatestSpecByApi, j as listSamplesByApi, l as listApisByProject, u as updateApi, f as getProject, a as createProject, d as deleteProject } from "./db-C3Se-Bze.js";
import { P as Play } from "./play-BVSF7kc5.js";
import "./zap-NPAHCgQi.js";
const __iconNode$d = [
  ["path", { d: "M12 17V3", key: "1cwfxf" }],
  ["path", { d: "m6 11 6 6 6-6", key: "12ii2o" }],
  ["path", { d: "M19 21H5", key: "150jfl" }]
];
const ArrowDownToLine = createLucideIcon("arrow-down-to-line", __iconNode$d);
const __iconNode$c = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
];
const ArrowLeft = createLucideIcon("arrow-left", __iconNode$c);
const __iconNode$b = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]];
const ChevronLeft = createLucideIcon("chevron-left", __iconNode$b);
const __iconNode$a = [
  [
    "path",
    {
      d: "M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z",
      key: "kmsa83"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]
];
const CirclePlay = createLucideIcon("circle-play", __iconNode$a);
const __iconNode$9 = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1", key: "tgr4d6" }],
  [
    "path",
    {
      d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
      key: "116196"
    }
  ],
  ["path", { d: "M12 11h4", key: "1jrz19" }],
  ["path", { d: "M12 16h4", key: "n85exb" }],
  ["path", { d: "M8 11h.01", key: "1dfujw" }],
  ["path", { d: "M8 16h.01", key: "18s6g9" }]
];
const ClipboardList = createLucideIcon("clipboard-list", __iconNode$9);
const __iconNode$8 = [
  ["path", { d: "m18 16 4-4-4-4", key: "1inbqp" }],
  ["path", { d: "m6 8-4 4 4 4", key: "15zrgr" }],
  ["path", { d: "m14.5 4-5 16", key: "e7oirm" }]
];
const CodeXml = createLucideIcon("code-xml", __iconNode$8);
const __iconNode$7 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["line", { x1: "22", x2: "18", y1: "12", y2: "12", key: "l9bcsi" }],
  ["line", { x1: "6", x2: "2", y1: "12", y2: "12", key: "13hhkx" }],
  ["line", { x1: "12", x2: "12", y1: "6", y2: "2", key: "10w3f3" }],
  ["line", { x1: "12", x2: "12", y1: "22", y2: "18", key: "15g9kq" }]
];
const Crosshair = createLucideIcon("crosshair", __iconNode$7);
const __iconNode$6 = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M10 12.5 8 15l2 2.5", key: "1tg20x" }],
  ["path", { d: "m14 12.5 2 2.5-2 2.5", key: "yinavb" }]
];
const FileCode = createLucideIcon("file-code", __iconNode$6);
const __iconNode$5 = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
];
const History = createLucideIcon("history", __iconNode$5);
const __iconNode$4 = [
  ["path", { d: "M14 4.1 12 6", key: "ita8i4" }],
  ["path", { d: "m5.1 8-2.9-.8", key: "1go3kf" }],
  ["path", { d: "m6 12-1.9 2", key: "mnht97" }],
  ["path", { d: "M7.2 2.2 8 5.1", key: "1cfko1" }],
  [
    "path",
    {
      d: "M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z",
      key: "s0h3yz"
    }
  ]
];
const MousePointerClick = createLucideIcon("mouse-pointer-click", __iconNode$4);
const __iconNode$3 = [
  ["rect", { x: "14", y: "3", width: "5", height: "18", rx: "1", key: "kaeet6" }],
  ["rect", { x: "5", y: "3", width: "5", height: "18", rx: "1", key: "1wsw3u" }]
];
const Pause = createLucideIcon("pause", __iconNode$3);
const __iconNode$2 = [
  ["path", { d: "M16.247 7.761a6 6 0 0 1 0 8.478", key: "1fwjs5" }],
  ["path", { d: "M19.075 4.933a10 10 0 0 1 0 14.134", key: "ehdyv1" }],
  ["path", { d: "M4.925 19.067a10 10 0 0 1 0-14.134", key: "1q22gi" }],
  ["path", { d: "M7.753 16.239a6 6 0 0 1 0-8.478", key: "r2q7qm" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
];
const Radio = createLucideIcon("radio", __iconNode$2);
const __iconNode$1 = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
];
const Save = createLucideIcon("save", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
      key: "1ffxy3"
    }
  ],
  ["path", { d: "m21.854 2.147-10.94 10.939", key: "12cjpa" }]
];
const Send = createLucideIcon("send", __iconNode);
function HistoryDetail({
  sessionId,
  onBack,
  onRerun
}) {
  const [session, setSession] = reactExports.useState(null);
  reactExports.useEffect(() => {
    getSession(sessionId).then((s) => setSession(s ?? null));
  }, [sessionId]);
  if (!session) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-screen text-xs text-muted-foreground", children: "Loading..." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-screen bg-background", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-center gap-2 border-b px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon-sm", onClick: onBack, className: "cursor-pointer", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "size-3.5" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium truncate", children: "History" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b px-3 py-2 bg-muted/30", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground uppercase tracking-wide", children: "Task" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-medium wrap-anywhere break-all", title: session.task, children: session.task }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => onRerun(session.task),
            className: "flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-3" }),
              "Run again"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: async () => {
              await deleteSession(sessionId);
              onBack();
            },
            className: "flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3" }),
              "Delete"
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2", children: session.history.map((event, index) => (
      // eslint-disable-next-line react-x/no-array-index-key
      /* @__PURE__ */ jsxRuntimeExports.jsx(EventCard, { event }, index)
    )) })
  ] });
}
const EXPORT_FILE_PREFIX = "pagenter-history";
const MAX_TASK_SLUG_LENGTH = 40;
function serializeHistoryExport(history) {
  return `${JSON.stringify(history, null, 2)}
`;
}
function buildHistoryExportFilename(task, createdAt) {
  const taskSlug = sanitizeTaskForFilename(task);
  const timestamp2 = formatTimestampForFilename(createdAt);
  return taskSlug ? `${EXPORT_FILE_PREFIX}-${taskSlug}-${timestamp2}.json` : `${EXPORT_FILE_PREFIX}-${timestamp2}.json`;
}
function downloadHistoryExport(task, createdAt, history) {
  const filename = buildHistoryExportFilename(task, createdAt);
  const content = serializeHistoryExport(history);
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
function sanitizeTaskForFilename(task) {
  return task.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, MAX_TASK_SLUG_LENGTH);
}
function formatTimestampForFilename(createdAt) {
  const date = new Date(createdAt);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}
function pad(value) {
  return value.toString().padStart(2, "0");
}
function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1e3);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
function HistoryList({
  onSelect,
  onBack,
  onRerun
}) {
  const [sessions, setSessions] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const load = reactExports.useCallback(async () => {
    setSessions(await listSessions());
    setLoading(false);
  }, []);
  reactExports.useEffect(() => {
    load();
  }, [load]);
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };
  const handleExport = (e, session) => {
    e.stopPropagation();
    downloadHistoryExport(session.task, session.createdAt, session.history);
  };
  const handleRerun = (e, task) => {
    e.stopPropagation();
    onRerun(task);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-screen bg-background", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-center gap-2 border-b px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon-sm", onClick: onBack, className: "cursor-pointer", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "size-3.5" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium flex-1", children: "History" }),
      sessions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "ghost",
          size: "sm",
          onClick: async () => {
            await clearSessions();
            setSessions([]);
          },
          className: "text-[10px] text-muted-foreground hover:text-destructive cursor-pointer h-6 px-2",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3 mr-1" }),
            "Clear All"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto", children: [
      loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-32 text-xs text-muted-foreground", children: "Loading..." }),
      !loading && sessions.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-32 text-xs text-muted-foreground", children: "No history yet" }),
      sessions.map((session) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          role: "button",
          tabIndex: 0,
          onClick: () => onSelect(session.id),
          className: "w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors cursor-pointer flex items-start gap-2 group",
          children: [
            session.status === "completed" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "size-3.5 text-green-500 shrink-0 mt-0.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "size-3.5 text-destructive shrink-0 mt-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium truncate", children: session.task }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center mt-0.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-muted-foreground", children: [
                  timeAgo(session.createdAt),
                  " · ",
                  session.history.length,
                  " steps"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: (e) => handleRerun(e, session.task),
                      className: "p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
                      title: "Run task again",
                      "aria-label": `Run history task again: ${session.task}`,
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-3" })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: (e) => handleExport(e, session),
                      className: "p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
                      title: "Export history JSON",
                      "aria-label": `Export history for ${session.task}`,
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownToLine, { className: "size-3" })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: (e) => handleDelete(e, session.id),
                      className: "p-0.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer",
                      title: "Delete history",
                      "aria-label": `Delete history for ${session.task}`,
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3" })
                    }
                  )
                ] })
              ] })
            ] })
          ]
        },
        session.id
      ))
    ] })
  ] });
}
function TipScriptConfirmDialog({
  proposal,
  onConfirm,
  onDismiss
}) {
  const { t } = useI18n();
  const [name, setName] = reactExports.useState(proposal.name);
  const [description, setDescription] = reactExports.useState(proposal.description);
  const [script, setScript] = reactExports.useState(proposal.script);
  const [urlPatterns, setUrlPatterns] = reactExports.useState(proposal.urlPatterns);
  const [triggerMode, setTriggerMode] = reactExports.useState(proposal.triggerMode);
  const isDark = document.documentElement.classList.contains("dark");
  const handleConfirm = () => {
    onConfirm({ name, description, script, urlPatterns, triggerMode });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-background border rounded-xl shadow-2xl w-[95%] max-w-lg max-h-[90vh] flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: t("tipScript.dialog.title") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onDismiss,
          className: "text-muted-foreground hover:text-foreground cursor-pointer",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto px-4 py-3 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-foreground", children: t("tipScript.dialog.name") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: name, onChange: (e) => setName(e.target.value), className: "h-8 text-sm" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-foreground", children: t("tipScript.dialog.description") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value: description,
            onChange: (e) => setDescription(e.target.value),
            className: "h-8 text-sm"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-foreground", children: t("tipScript.dialog.script") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ReactCodeMirror,
          {
            value: script,
            onChange: setScript,
            extensions: [javascript()],
            theme: isDark ? oneDark : void 0,
            height: "200px",
            basicSetup: { lineNumbers: true, foldGutter: false, highlightActiveLine: true }
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-foreground", children: t("tipScript.dialog.urlPatterns") }),
        urlPatterns.map((pattern, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5 items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              value: pattern,
              onChange: (e) => {
                const next = [...urlPatterns];
                next[idx] = e.target.value;
                setUrlPatterns(next);
              },
              className: "h-7 text-xs font-mono",
              placeholder: "*://example.com/*"
            }
          ),
          urlPatterns.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setUrlPatterns(urlPatterns.filter((_, i) => i !== idx)),
              className: "text-muted-foreground hover:text-destructive cursor-pointer shrink-0",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5" })
            }
          )
        ] }, idx)),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "ghost",
            size: "sm",
            onClick: () => setUrlPatterns([...urlPatterns, ""]),
            className: "text-xs h-6 cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3 mr-1" }),
              t("tipScript.dialog.addPattern")
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-foreground", children: t("tipScript.dialog.triggerMode") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: triggerMode,
            onChange: (e) => setTriggerMode(e.target.value),
            className: "w-full h-8 text-sm rounded-lg border border-input bg-background px-2 cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "manual", children: t("tipScript.dialog.triggerMode.manual") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "auto", children: t("tipScript.dialog.triggerMode.auto") })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 px-4 py-3 border-t", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: onDismiss, className: "cursor-pointer", children: t("tipScript.dialog.cancel") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          size: "sm",
          onClick: handleConfirm,
          disabled: !name || !script,
          className: "cursor-pointer",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "size-3.5 mr-1.5" }),
            t("tipScript.dialog.save")
          ]
        }
      )
    ] })
  ] }) });
}
const POLL_INTERVAL_MS = 1e3;
function useProjectList() {
  const [projects, setProjects] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [seed, setSeed] = reactExports.useState(0);
  reactExports.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const rows = await listProjects();
      if (!cancelled) {
        setProjects(rows);
        setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [seed]);
  return { projects, loading, refresh: () => setSeed((x) => x + 1) };
}
function useApiList(projectId) {
  const [apis, setApis] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!projectId) {
        if (!cancelled) {
          setApis([]);
          setLoading(false);
        }
        return;
      }
      const rows = await listApisByProject(projectId);
      if (!cancelled) {
        setApis(rows);
        setLoading(false);
      }
    };
    void load();
    const timer = projectId ? setInterval(load, POLL_INTERVAL_MS) : null;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [projectId]);
  return { apis, loading };
}
function useApiDetail(apiId) {
  const [api, setApi] = reactExports.useState(null);
  const [spec, setSpec] = reactExports.useState(null);
  const [samples, setSamples] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [seed, setSeed] = reactExports.useState(0);
  reactExports.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!apiId) {
        if (!cancelled) {
          setApi(null);
          setSpec(null);
          setSamples([]);
          setLoading(false);
        }
        return;
      }
      const [a, s, ss] = await Promise.all([
        getApi(apiId),
        getLatestSpecByApi(apiId),
        listSamplesByApi(apiId, 20)
      ]);
      if (cancelled) return;
      setApi(a ?? null);
      setSpec(s ?? null);
      setSamples(ss);
      setLoading(false);
    };
    void load();
    const timer = apiId ? setInterval(load, POLL_INTERVAL_MS) : null;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [apiId, seed]);
  return { api, spec, samples, loading, refresh: () => setSeed((x) => x + 1) };
}
function ApiDetail({ apiId, onBack }) {
  const { t } = useI18n();
  const { api, spec, samples, loading, refresh } = useApiDetail(apiId);
  const toggleExpose = reactExports.useCallback(async () => {
    if (!api) return;
    await updateApi(api.id, {
      exposed: !api.exposed,
      toolName: api.toolName || buildDefaultToolName(api.method, api.urlPattern)
    });
    refresh();
  }, [api, refresh]);
  if (loading || !api) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-xs text-muted-foreground", children: "Loading api..." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-3 py-2 border-b sticky top-0 bg-background z-10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onBack, className: "p-1 rounded hover:bg-muted", title: "Back", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "size-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted", children: api.method }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono truncate", children: api.urlPattern })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-muted-foreground", children: [
          t("sniff.api.samples"),
          ": ",
          api.sampleCount
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-2 border-b bg-muted/30 text-xs space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: t("sniff.api.expose") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: api.exposed ? "default" : "outline", onClick: toggleExpose, children: api.exposed ? "Exposed" : t("sniff.api.unexposed") })
      ] }),
      api.exposed && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          EditableField,
          {
            label: t("sniff.api.toolName"),
            value: api.toolName ?? "",
            onSubmit: async (v) => {
              await updateApi(api.id, { toolName: v.trim() || void 0 });
              refresh();
            },
            mono: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          EditableField,
          {
            label: t("sniff.api.displayName"),
            value: api.displayName ?? "",
            onSubmit: async (v) => {
              await updateApi(api.id, { displayName: v.trim() || void 0 });
              refresh();
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          EditableField,
          {
            label: t("sniff.api.description"),
            value: api.description ?? "",
            onSubmit: async (v) => {
              await updateApi(api.id, { description: v.trim() || void 0 });
              refresh();
            },
            multiline: true
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SchemaBlock, { title: t("sniff.api.input"), schema: spec?.inputSchema ?? null }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SchemaBlock, { title: t("sniff.api.output"), schema: spec?.outputSchema ?? null }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SamplesBlock, { samples }),
    spec && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-2 text-[10px] text-muted-foreground border-t", children: [
      "spec v",
      spec.version,
      " · hash ",
      spec.structuralHash.slice(0, 8)
    ] })
  ] });
}
function buildDefaultToolName(method, pattern) {
  const safe = pattern.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${method.toLowerCase()}_${safe}`.slice(0, 64);
}
function EditableField({
  label,
  value,
  onSubmit,
  mono,
  multiline
}) {
  const [draft, setDraft] = reactExports.useState(value);
  const [editing, setEditing] = reactExports.useState(false);
  if (!editing && draft !== value) setDraft(value);
  const commonInputCls = `w-full px-2 py-1 border rounded bg-background ${mono ? "font-mono" : ""}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: label }),
    multiline ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        value: draft,
        rows: 2,
        onFocus: () => setEditing(true),
        onChange: (e) => setDraft(e.target.value),
        onBlur: async () => {
          setEditing(false);
          if (draft !== value) await onSubmit(draft);
        },
        className: commonInputCls
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "text",
        value: draft,
        onFocus: () => setEditing(true),
        onChange: (e) => setDraft(e.target.value),
        onBlur: async () => {
          setEditing(false);
          if (draft !== value) await onSubmit(draft);
        },
        className: `h-7 ${commonInputCls}`
      }
    )
  ] });
}
function SchemaBlock({
  title,
  schema
}) {
  const [open, setOpen] = reactExports.useState(true);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => setOpen(!open),
        className: "w-full flex items-center gap-1 px-3 py-1.5 text-xs font-medium hover:bg-muted/50",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: `size-3 transition-transform ${open ? "rotate-90" : ""}` }),
          title,
          !schema && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-[10px] text-muted-foreground", children: "empty" })
        ]
      }
    ),
    open && schema && /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "px-3 pb-2 text-[10px] font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto", children: JSON.stringify(schema, null, 2) })
  ] });
}
function SamplesBlock({ samples }) {
  const { t } = useI18n();
  const [open, setOpen] = reactExports.useState(false);
  const [expandedId, setExpandedId] = reactExports.useState(null);
  if (samples.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2 text-[10px] text-muted-foreground border-b", children: t("sniff.sample.viewer.none") });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => setOpen(!open),
        className: "w-full flex items-center gap-1 px-3 py-1.5 text-xs font-medium hover:bg-muted/50",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: `size-3 transition-transform ${open ? "rotate-90" : ""}` }),
          "Samples (",
          samples.length,
          ")"
        ]
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] font-mono", children: samples.map((s) => {
      const expanded = expandedId === s.id;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t first:border-t-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setExpandedId(expanded ? null : s.id),
            className: "w-full flex items-center gap-2 px-3 py-1 text-left hover:bg-muted/50",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: statusColor(s.resStatus), children: s.resStatus }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 truncate", children: s.url }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: s.durationMs ? `${Math.round(s.durationMs)}ms` : "-" })
            ]
          }
        ),
        expanded && /* @__PURE__ */ jsxRuntimeExports.jsx(SampleBody, { sample: s })
      ] }, s.id);
    }) })
  ] });
}
function SampleBody({ sample }) {
  const { t } = useI18n();
  const reqText = bodyText(sample.reqBody);
  const resText = bodyText(sample.resBody);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-2 space-y-2 bg-muted/20", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: t("sniff.sample.viewer.req") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "whitespace-pre-wrap break-all max-h-40 overflow-y-auto", children: reqText })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: t("sniff.sample.viewer.res") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "whitespace-pre-wrap break-all max-h-40 overflow-y-auto", children: resText })
    ] })
  ] });
}
function bodyText(blob) {
  if (!blob) return "(empty)";
  if (blob.encoding !== "utf8") {
    return `(${blob.encoding}, ${blob.originalSize} bytes${blob.truncated ? ", truncated" : ""})`;
  }
  try {
    return JSON.stringify(JSON.parse(blob.data), null, 2);
  } catch {
    return blob.data;
  }
}
function statusColor(status) {
  if (status >= 500) return "text-red-600";
  if (status >= 400) return "text-yellow-600";
  if (status >= 200 && status < 300) return "text-green-600";
  return "text-muted-foreground";
}
function ProjectDetail({ projectId, onBack }) {
  const { t } = useI18n();
  const [project, setProject] = reactExports.useState(null);
  const [subTab, setSubTab] = reactExports.useState("apis");
  const [selectedApiId, setSelectedApiId] = reactExports.useState(null);
  reactExports.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const p = await getProject(projectId);
      if (!cancelled) setProject(p ?? null);
    };
    load();
    const timer = setInterval(load, 1e3);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [projectId]);
  const startRecording = reactExports.useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.runtime.sendMessage({
      type: "SNIFF_START_RECORDING",
      tabId: tab.id,
      projectId
    });
  }, [projectId]);
  const stopRecording = reactExports.useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.runtime.sendMessage({
      type: "SNIFF_STOP_RECORDING",
      tabId: tab.id,
      projectId
    });
  }, [projectId]);
  if (!project) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-xs text-muted-foreground", children: "Loading project..." });
  }
  const isRecording = project.status === "recording";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-3 py-2 border-b", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onBack, className: "p-1 rounded hover:bg-muted", title: "Back", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "size-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: project.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground truncate", children: project.originPatterns[0] || "(no origin)" })
      ] }),
      isRecording ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "destructive", onClick: stopRecording, className: "gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { className: "size-3.5" }),
        t("sniff.project.stop")
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: startRecording, className: "gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "size-3.5" }),
        t("sniff.project.startOn")
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex border-b text-xs", children: ["apis", "settings"].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: () => {
          setSubTab(k);
          setSelectedApiId(null);
        },
        className: `flex-1 py-2 border-b-2 -mb-px transition-colors ${subTab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`,
        children: t(`sniff.project.tab.${k}`)
      },
      k
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto", children: [
      subTab === "apis" && (selectedApiId ? /* @__PURE__ */ jsxRuntimeExports.jsx(ApiDetail, { apiId: selectedApiId, onBack: () => setSelectedApiId(null) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ApiList, { projectId, onSelect: setSelectedApiId })),
      subTab === "settings" && /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsPane, { project })
    ] })
  ] });
}
function ApiList({
  projectId,
  onSelect
}) {
  const { t } = useI18n();
  const { apis, loading } = useApiList(projectId);
  const sorted = reactExports.useMemo(() => [...apis].sort((a, b) => b.sampleCount - a.sampleCount), [apis]);
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-xs text-muted-foreground", children: "Loading..." });
  }
  if (sorted.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-xs text-muted-foreground", children: "No APIs captured yet. Start recording on a tab to collect samples." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: sorted.map((api) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: () => onSelect(api.id),
      className: "w-full flex items-center gap-2 px-3 py-2 border-b text-left hover:bg-muted/50",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: `inline-block text-[10px] font-mono px-1.5 py-0.5 rounded ${methodColor(api.method)}`,
            children: api.method
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-mono truncate", children: api.urlPattern }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-muted-foreground", children: [
            t("sniff.api.samples"),
            ": ",
            api.sampleCount,
            api.exposed && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-primary", children: [
              "● ",
              t("sniff.api.expose")
            ] })
          ] })
        ] })
      ]
    },
    api.id
  )) });
}
function methodColor(method) {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-green-100 text-green-800";
    case "POST":
      return "bg-blue-100 text-blue-800";
    case "PUT":
    case "PATCH":
      return "bg-yellow-100 text-yellow-800";
    case "DELETE":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
function SettingsPane({ project }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 text-xs space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SettingRow, { k: "maxBodyKB", v: String(project.config.maxBodyKB) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SettingRow, { k: "maxSamplesPerApi", v: String(project.config.maxSamplesPerApi) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SettingRow, { k: "enablePiiScrub", v: String(project.config.enablePiiScrub) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SettingRow, { k: "captureStaticResources", v: String(project.config.captureStaticResources) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SettingRow,
      {
        k: "excludeMimePatterns",
        v: project.config.excludeMimePatterns.join(", ") || "(none)"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SettingRow,
      {
        k: "excludeUrlPatterns",
        v: project.config.excludeUrlPatterns.join(", ") || "(none)"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-2 text-[10px] text-muted-foreground", children: "Edit via Options page (coming soon)." })
  ] });
}
function SettingRow({ k, v }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-32 font-mono text-muted-foreground shrink-0", children: k }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 font-mono break-all", children: v })
  ] });
}
function ProjectList({ onSelect }) {
  const { t } = useI18n();
  const { projects, loading, refresh } = useProjectList();
  const [creating, setCreating] = reactExports.useState(null);
  const openCreateForm = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let origin = "";
    try {
      if (tab?.url) origin = new URL(tab.url).origin;
    } catch {
      origin = "";
    }
    const name = origin ? new URL(origin).hostname : "";
    setCreating({ name, origin });
  };
  const submitCreate = async () => {
    if (!creating) return;
    const name = creating.name.trim();
    const origin = creating.origin.trim();
    if (!name) return;
    await createProject({
      name,
      // originPatterns 用字符串数组，至少给一个默认的
      originPatterns: origin ? [origin] : []
    });
    setCreating(null);
    refresh();
  };
  const handleDelete = async (p) => {
    if (!confirm(t("sniff.project.delete.confirm"))) return;
    await deleteProject(p.id);
    refresh();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-3 py-2 border-b", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-medium text-muted-foreground", children: projects.length > 0 && `${projects.length} projects` }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: openCreateForm, className: "gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }),
        t("sniff.btn.newProject")
      ] })
    ] }),
    creating && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 px-3 py-2 border-b bg-muted/30", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          autoFocus: true,
          value: creating.name,
          onChange: (e) => setCreating({ ...creating, name: e.target.value }),
          placeholder: "Project name",
          className: "h-8 px-2 text-sm border rounded bg-background"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: creating.origin,
          onChange: (e) => setCreating({ ...creating, origin: e.target.value }),
          placeholder: "https://example.com",
          className: "h-8 px-2 text-sm border rounded bg-background"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 justify-end", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", onClick: () => setCreating(null), children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", onClick: submitCreate, disabled: !creating.name.trim(), children: "Create" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto", children: [
      loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-xs text-muted-foreground", children: "Loading..." }),
      !loading && projects.length === 0 && !creating && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: t("sniff.empty.title") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-xs text-muted-foreground", children: t("sniff.empty.desc") })
      ] }),
      projects.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        ProjectRow,
        {
          project: p,
          onSelect: () => onSelect(p.id),
          onDelete: () => handleDelete(p)
        },
        p.id
      ))
    ] })
  ] });
}
function ProjectRow({
  project,
  onSelect,
  onDelete
}) {
  const { t } = useI18n();
  const dotClass = project.status === "recording" ? "bg-green-500 animate-pulse" : "bg-gray-400";
  const statusLabel = t(`sniff.project.status.${project.status}`);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      role: "button",
      tabIndex: 0,
      onClick: onSelect,
      onKeyDown: (e) => {
        if (e.key === "Enter") onSelect();
      },
      className: "flex items-center gap-2 px-3 py-2 border-b cursor-pointer hover:bg-muted/50",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-block size-2 rounded-full ${dotClass}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm font-medium truncate", children: [
            project.name,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground font-normal", children: statusLabel })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground truncate", children: [
            project.originPatterns[0] || t("sniff.project.origin"),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2", children: [
              t("sniff.project.stats.samples", {
                count: String(project.stats.totalSamples)
              }),
              " · ",
              t("sniff.project.stats.apis", {
                count: String(project.stats.totalApis)
              })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
            title: t("sniff.project.delete"),
            onClick: (e) => {
              e.stopPropagation();
              onDelete();
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CirclePlay, { className: "size-4 text-muted-foreground/60" })
      ]
    }
  );
}
function SniffView() {
  const [selectedProjectId, setSelectedProjectId] = reactExports.useState(null);
  if (selectedProjectId) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ProjectDetail, { projectId: selectedProjectId, onBack: () => setSelectedProjectId(null) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ProjectList, { onSelect: setSelectedProjectId });
}
function Textarea({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "textarea",
    {
      "data-slot": "textarea",
      className: cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      ),
      ...props
    }
  );
}
function InputGroup({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "input-group",
      role: "group",
      className: cn(
        "group/input-group border-input dark:bg-input/30 relative flex w-full items-center rounded-md border shadow-xs transition-[color,box-shadow] outline-none",
        "h-9 min-w-0 has-[>textarea]:h-auto",
        // Variants based on alignment.
        "has-[>[data-align=inline-start]]:[&>input]:pl-2",
        "has-[>[data-align=inline-end]]:[&>input]:pr-2",
        "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",
        // Focus state — soft multi-color glow matching ai-motion palette
        "has-[[data-slot=input-group-control]:focus-visible]:border-blue-400/60",
        "has-[[data-slot=input-group-control]:focus-visible]:shadow-[0_0_0_1px_rgba(57,182,255,0.2),0_0_8px_rgba(57,182,255,0.15),0_0_16px_rgba(189,69,251,0.1)]",
        // Error state.
        "has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40",
        className
      ),
      ...props
    }
  );
}
const inputGroupAddonVariants = cva(
  "text-muted-foreground flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium select-none [&>svg:not([class*='size-'])]:size-4 [&>kbd]:rounded-[calc(var(--radius)-5px)] group-data-[disabled=true]/input-group:opacity-50",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
        "inline-end": "order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]",
        "block-start": "order-first w-full justify-start px-3 pt-3 [.border-b]:pb-3 group-has-[>input]/input-group:pt-2.5",
        "block-end": "order-last w-full justify-start px-3 pb-3 [.border-t]:pt-3 group-has-[>input]/input-group:pb-2.5"
      }
    },
    defaultVariants: {
      align: "inline-start"
    }
  }
);
function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      role: "group",
      "data-slot": "input-group-addon",
      "data-align": align,
      className: cn(inputGroupAddonVariants({ align }), className),
      onClick: (e) => {
        if (e.target.closest("button")) {
          return;
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus();
      },
      ...props
    }
  );
}
const inputGroupButtonVariants = cva("text-sm shadow-none flex gap-2 items-center", {
  variants: {
    size: {
      xs: "h-6 gap-1 px-2 rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-3.5 has-[>svg]:px-2",
      sm: "h-8 px-2.5 gap-1.5 rounded-md has-[>svg]:px-2.5",
      "icon-xs": "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0",
      "icon-sm": "size-8 p-0 has-[>svg]:p-0"
    }
  },
  defaultVariants: {
    size: "xs"
  }
});
function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Button,
    {
      type,
      "data-size": size,
      variant,
      className: cn(inputGroupButtonVariants({ size }), className),
      ...props
    }
  );
}
function InputGroupTextarea({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Textarea,
    {
      "data-slot": "input-group-control",
      className: cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent",
        className
      ),
      ...props
    }
  );
}
function timestamp() {
  return (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
}
function jsonBlock(data) {
  try {
    return "```json\n" + JSON.stringify(data, null, 2) + "\n```";
  } catch {
    return "```\n(non-serializable)\n```";
  }
}
function codeBlock(lang, code) {
  return "```" + lang + "\n" + code + "\n```";
}
function formatMs(ms) {
  if (ms < 1e3) return `${ms}ms`;
  return `${(ms / 1e3).toFixed(1)}s`;
}
function formatStep(event) {
  const lines = [];
  lines.push(`## Step ${event.stepIndex}`);
  lines.push("");
  const timingParts = [];
  if (event.startedAt) timingParts.push(`start: ${event.startedAt}`);
  if (event.endedAt) timingParts.push(`end: ${event.endedAt}`);
  if (event.llmDurationMs != null) timingParts.push(`LLM: ${formatMs(event.llmDurationMs)}`);
  if (event.toolDurationMs != null) timingParts.push(`tool: ${formatMs(event.toolDurationMs)}`);
  if (timingParts.length > 0) {
    lines.push(`> ${timingParts.join(" | ")}`);
    lines.push("");
  }
  const r = event.reflection;
  const hasReflectionContent = r.progress && r.progress.length > 0 || r.pending && r.pending.length > 0 || r.evidence && r.evidence.length > 0 || !!r.reasoning || r.goal_status && r.goal_status !== "on_track";
  if (hasReflectionContent) {
    lines.push("### Reflection");
    if (r.progress && r.progress.length > 0) {
      lines.push(`- **progress**: ${r.progress.join("; ")}`);
    }
    if (r.pending && r.pending.length > 0) {
      lines.push(`- **pending**: ${r.pending.join("; ")}`);
    }
    if (r.evidence && r.evidence.length > 0) {
      lines.push(`- **evidence**: ${r.evidence.join("; ")}`);
    }
    if (r.reasoning) lines.push(`- **reasoning**: ${r.reasoning}`);
    if (r.goal_status && r.goal_status !== "on_track") {
      lines.push(`- **goal**: [${r.goal_status}]${r.active_goal ? ` ${r.active_goal}` : ""}`);
    }
    lines.push("");
  }
  lines.push("### Action");
  lines.push(`- **Tool**: \`${event.action.name}\``);
  const input = event.action.input;
  if (input != null) {
    if (typeof input === "object" && input.script) {
      lines.push("- **Input**:");
      lines.push(codeBlock("javascript", input.script));
    } else {
      lines.push("- **Input**: " + jsonBlock(input));
    }
  }
  if (event.action.output) {
    const out = event.action.output;
    if (out.length > 500) {
      lines.push("- **Output** (truncated):");
      lines.push("```");
      lines.push(out.slice(0, 500) + "...");
      lines.push("```");
    } else {
      lines.push(`- **Output**: \`${out}\``);
    }
  }
  lines.push("");
  if (event.usage) {
    const u = event.usage;
    const parts = [
      `prompt=${u.promptTokens}`,
      `completion=${u.completionTokens}`,
      `total=${u.totalTokens}`
    ];
    if (u.cachedTokens) parts.push(`cached=${u.cachedTokens}`);
    if (u.reasoningTokens) parts.push(`reasoning=${u.reasoningTokens}`);
    lines.push(`### Usage: ${parts.join(" ")}`);
    lines.push("");
  }
  if (event.rawRequest) {
    lines.push("<details><summary>Raw Request</summary>");
    lines.push("");
    lines.push(jsonBlock(event.rawRequest));
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }
  if (event.rawResponse) {
    lines.push("<details><summary>Raw Response</summary>");
    lines.push("");
    lines.push(jsonBlock(event.rawResponse));
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }
  return lines.join("\n");
}
function formatEvent(event) {
  switch (event.type) {
    case "step":
      return formatStep(event);
    case "user_message":
      return `## User Message

${event.content}
`;
    case "observation":
      return `## Observation

${event.content}
`;
    case "error": {
      const errEvent = event;
      const lines = [`## Error

\`${errEvent.message}\``];
      if (errEvent.rawResponse) {
        lines.push("");
        lines.push("<details><summary>Raw Response</summary>");
        lines.push("");
        lines.push(jsonBlock(errEvent.rawResponse));
        lines.push("");
        lines.push("</details>");
      }
      return lines.join("\n") + "\n";
    }
    case "retry":
      return `## Retry (${event.attempt}/${event.maxAttempts})

${event.message}
`;
    case "user_takeover":
      return `## User Takeover
`;
    default:
      return "";
  }
}
function buildStats(history) {
  const stats = {
    stepCount: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    toolCalls: {},
    errorCount: 0,
    retryCount: 0
  };
  for (const event of history) {
    if (event.type === "step") {
      stats.stepCount++;
      if (event.usage) {
        stats.totalPromptTokens += event.usage.promptTokens;
        stats.totalCompletionTokens += event.usage.completionTokens;
        stats.totalTokens += event.usage.totalTokens;
      }
      const tool = event.action.name;
      stats.toolCalls[tool] = (stats.toolCalls[tool] ?? 0) + 1;
    } else if (event.type === "error") {
      stats.errorCount++;
    } else if (event.type === "retry") {
      stats.retryCount++;
    }
  }
  return stats;
}
function formatStats(stats) {
  const lines = ["## Session Statistics", ""];
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Steps | ${stats.stepCount} |`);
  lines.push(`| Total Tokens | ${stats.totalTokens} |`);
  lines.push(`| Prompt Tokens | ${stats.totalPromptTokens} |`);
  lines.push(`| Completion Tokens | ${stats.totalCompletionTokens} |`);
  lines.push(`| Errors | ${stats.errorCount} |`);
  lines.push(`| Retries | ${stats.retryCount} |`);
  lines.push("");
  const sorted = Object.entries(stats.toolCalls).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) {
    lines.push("### Tool Call Frequency");
    lines.push("");
    lines.push("| Tool | Count |");
    lines.push("|------|-------|");
    for (const [tool, count] of sorted) {
      lines.push(`| \`${tool}\` | ${count} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
function exportSessionAsMarkdown(history, task, modelInfo, currentScript) {
  const stats = buildStats(history);
  const lines = [];
  lines.push("# Session Report");
  lines.push("");
  lines.push(`- **Exported**: ${timestamp()}`);
  lines.push(`- **Task**: ${task || "(none)"}`);
  lines.push(`- **Total events**: ${history.length}`);
  if (modelInfo) {
    lines.push(`- **Model**: ${modelInfo.model}`);
    lines.push(`- **Vision**: ${modelInfo.supportsVision ? "Yes" : "No"}`);
  }
  lines.push("");
  if (currentScript) {
    lines.push("## Current Script (latest version)");
    lines.push("");
    lines.push(codeBlock("javascript", currentScript));
    lines.push("");
  }
  lines.push(formatStats(stats));
  lines.push("---");
  lines.push("");
  for (const event of history) {
    const block = formatEvent(event);
    if (block) {
      lines.push(block);
      lines.push("---");
      lines.push("");
    }
  }
  return lines.join("\n");
}
function App() {
  const { t } = useI18n();
  const [view, setView] = reactExports.useState({ name: "chat" });
  const [inputValue, setInputValue] = reactExports.useState("");
  const historyRef = reactExports.useRef(null);
  const textareaRef = reactExports.useRef(null);
  const {
    status,
    history,
    activity,
    currentTask,
    mode,
    setMode,
    modelInfo,
    execute,
    stop,
    newChat,
    addPickedElement,
    tipScriptProposal,
    openTipScriptProposal,
    confirmTipScript,
    dismissTipScript,
    attachedScript,
    setAttachedScript,
    getCurrentScript
  } = useAgent();
  reactExports.useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history, activity]);
  reactExports.useEffect(() => {
    const onRemoteSync = () => setView({ name: "chat" });
    window.addEventListener("pagenter:session-sync", onRemoteSync);
    return () => window.removeEventListener("pagenter:session-sync", onRemoteSync);
  }, []);
  const runTask = reactExports.useCallback(
    (task) => {
      const normalizedTask = task.trim();
      if (!normalizedTask || status === "running") return;
      setInputValue("");
      setView({ name: "chat" });
      execute(normalizedTask).catch((error) => {
        console.error("[SidePanel] Failed to execute task:", error);
      });
    },
    [execute, status]
  );
  const handleSubmit = reactExports.useCallback(
    (e) => {
      e?.preventDefault();
      runTask(inputValue);
    },
    [inputValue, runTask]
  );
  const handleStop = reactExports.useCallback(() => {
    console.log("[SidePanel] Stopping task...");
    stop();
  }, [stop]);
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };
  const KEEP_HIGHLIGHTS_MS = 5e3;
  const [markCopied, setMarkCopied] = reactExports.useState(false);
  const handleMarkAndCopy = reactExports.useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      await chrome.storage.local.set({
        keepHighlightsUntil: Date.now() + KEEP_HIGHLIGHTS_MS
      });
      const res = await chrome.runtime.sendMessage({
        type: "PAGE_CONTROL",
        action: "get_browser_state",
        targetTabId: tab.id
      });
      const content = res?.content || res?.error || "(empty)";
      await navigator.clipboard.writeText(content);
      setMarkCopied(true);
      setTimeout(() => {
        setMarkCopied(false);
        chrome.storage.local.remove("keepHighlightsUntil");
      }, KEEP_HIGHLIGHTS_MS);
    } catch (err) {
      console.error("[SidePanel] Mark & copy failed:", err);
    }
  }, []);
  const [picking, setPicking] = reactExports.useState(false);
  const pickingTabIdRef = reactExports.useRef(null);
  const tRef = reactExports.useRef(t);
  reactExports.useEffect(() => {
    tRef.current = t;
  });
  const startPickerOn = reactExports.useCallback(async (tabId) => {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "ELEMENT_PICKER",
        action: "start",
        payload: {
          hintTitle: tRef.current("picker.hint.title"),
          hintEsc: tRef.current("picker.hint.esc")
        }
      });
    } catch {
    }
  }, []);
  const stopPickerOn = reactExports.useCallback(async (tabId) => {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "ELEMENT_PICKER",
        action: "stop"
      });
    } catch {
    }
  }, []);
  const handlersRef = reactExports.useRef({ addPickedElement, setInputValue });
  reactExports.useEffect(() => {
    handlersRef.current = { addPickedElement, setInputValue };
  });
  const handleElementPick = reactExports.useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    if (picking) {
      if (pickingTabIdRef.current != null) {
        await stopPickerOn(pickingTabIdRef.current);
      }
      pickingTabIdRef.current = null;
      setPicking(false);
      return;
    }
    pickingTabIdRef.current = tab.id;
    setPicking(true);
    await startPickerOn(tab.id);
  }, [picking, startPickerOn, stopPickerOn]);
  reactExports.useEffect(() => {
    if (!picking) return;
    const onMessage = (message) => {
      if (message.type === "ELEMENT_PICKED") {
        const { addPickedElement: addPickedElement2, setInputValue: setInputValue2 } = handlersRef.current;
        addPickedElement2(message.data.cssSelector);
        const info = [
          `[Element Picked]`,
          `Tag: ${message.data.tagName}`,
          message.data.id ? `ID: #${message.data.id}` : "",
          message.data.classList?.length ? `Classes: .${message.data.classList.join(".")}` : "",
          `Selector: ${message.data.cssSelector}`,
          `XPath: ${message.data.xpath}`
        ].filter(Boolean).join("\n");
        setInputValue2((prev) => (prev ? prev + "\n\n" : "") + info);
        pickingTabIdRef.current = null;
        setPicking(false);
      } else if (message.type === "ELEMENT_PICKER_STOPPED") {
        pickingTabIdRef.current = null;
        setPicking(false);
      }
    };
    chrome.runtime.onMessage.addListener(onMessage);
    const onTabActivated = async (info) => {
      const prev = pickingTabIdRef.current;
      if (prev != null && prev !== info.tabId) {
        await stopPickerOn(prev);
      }
      pickingTabIdRef.current = info.tabId;
      await startPickerOn(info.tabId);
    };
    chrome.tabs.onActivated.addListener(onTabActivated);
    const onEsc = (e) => {
      if (e.key !== "Escape") return;
      if (pickingTabIdRef.current != null) {
        stopPickerOn(pickingTabIdRef.current);
      }
      pickingTabIdRef.current = null;
      setPicking(false);
    };
    window.addEventListener("keydown", onEsc, true);
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
      chrome.tabs.onActivated.removeListener(onTabActivated);
      window.removeEventListener("keydown", onEsc, true);
    };
  }, [picking, startPickerOn, stopPickerOn]);
  reactExports.useEffect(() => {
    const handler = (e) => {
      if (e.key === "b" && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleElementPick();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleElementPick]);
  const [showScriptPicker, setShowScriptPicker] = reactExports.useState(false);
  const [tipScriptList, setTipScriptList] = reactExports.useState([]);
  const handleOpenScriptPicker = reactExports.useCallback(async () => {
    const scripts = await listTipScripts();
    setTipScriptList(scripts.map((s) => ({ id: s.id, name: s.name, script: s.script })));
    setShowScriptPicker(true);
  }, []);
  const handleSelectScript = reactExports.useCallback(
    (item) => {
      setAttachedScript({ name: item.name, content: item.script });
      setShowScriptPicker(false);
    },
    [setAttachedScript]
  );
  const [developerMode, setDeveloperMode] = reactExports.useState(false);
  const [devCopied, setDevCopied] = reactExports.useState(false);
  reactExports.useEffect(() => {
    chrome.storage.local.get("developerMode").then((r) => {
      setDeveloperMode(!!r.developerMode);
    });
    const listener = (changes) => {
      if (changes.developerMode) setDeveloperMode(!!changes.developerMode.newValue);
    };
    chrome.storage.local.onChanged.addListener(listener);
    return () => chrome.storage.local.onChanged.removeListener(listener);
  }, []);
  const handleCopySession = reactExports.useCallback(async () => {
    const md = exportSessionAsMarkdown(history, currentTask, modelInfo, getCurrentScript());
    await navigator.clipboard.writeText(md);
    setDevCopied(true);
    setTimeout(() => setDevCopied(false), 2e3);
  }, [history, currentTask, modelInfo, getCurrentScript]);
  if (view.name === "history") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      HistoryList,
      {
        onSelect: (id) => setView({ name: "history-detail", sessionId: id }),
        onBack: () => setView({ name: "chat" }),
        onRerun: runTask
      }
    );
  }
  if (view.name === "history-detail") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      HistoryDetail,
      {
        sessionId: view.sessionId,
        onBack: () => setView({ name: "history" }),
        onRerun: runTask
      }
    );
  }
  const isRunning = status === "running";
  const showEmptyState = history.length === 0 && !isRunning;
  const isScriptMode = mode === "script";
  const isSniffMode = mode === "sniff";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex flex-col h-screen bg-background", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(MotionOverlay, { active: isRunning }),
    tipScriptProposal && /* @__PURE__ */ jsxRuntimeExports.jsx(
      TipScriptConfirmDialog,
      {
        proposal: tipScriptProposal,
        onConfirm: confirmTipScript,
        onDismiss: dismissTipScript
      },
      tipScriptProposal.script
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-center justify-between border-b px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Logo, { className: "size-5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex rounded-md border text-[11px] overflow-hidden", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setMode("normal"),
              className: `px-2 py-0.5 cursor-pointer transition-colors flex items-center gap-1 ${mode === "normal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MousePointerClick, { className: "size-2.5" }),
                t("panel.mode.normal")
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setMode("script"),
              className: `px-2 py-0.5 cursor-pointer transition-colors flex items-center gap-1 ${isScriptMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileCode, { className: "size-2.5" }),
                t("panel.mode.script")
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setMode("sniff"),
              className: `px-2 py-0.5 cursor-pointer transition-colors flex items-center gap-1 ${isSniffMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { className: "size-2.5" }),
                t("panel.mode.sniff")
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatusDot, { status }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon-sm",
            onClick: () => {
              newChat();
              setView({ name: "chat" });
            },
            className: "cursor-pointer",
            title: t("panel.newChat"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon-sm",
            onClick: handleMarkAndCopy,
            className: "cursor-pointer",
            title: t("panel.markAndCopy"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(CodeXml, { className: `size-3.5 ${markCopied ? "text-green-500" : ""}` })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon-sm",
            onClick: () => setView({ name: "history" }),
            className: "cursor-pointer",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-3.5" })
          }
        ),
        developerMode && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon-sm",
            onClick: handleCopySession,
            className: "cursor-pointer",
            title: t("panel.copySession"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardList, { className: `size-3.5 ${devCopied ? "text-green-500" : ""}` })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "ghost",
            size: "icon-sm",
            onClick: () => chrome.runtime.openOptionsPage(),
            className: "cursor-pointer",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "size-3.5" })
          }
        )
      ] })
    ] }),
    isScriptMode && modelInfo && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-3 py-1 border-b bg-muted/30 text-[10px] text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium truncate", children: modelInfo.model }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-0.5", children: [
        modelInfo.supportsVision ? /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-2.5 text-green-500" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "size-2.5 text-orange-400" }),
        modelInfo.supportsVision ? t("panel.vision") : t("panel.noVision")
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex-1 overflow-hidden flex flex-col", children: [
      isSniffMode && /* @__PURE__ */ jsxRuntimeExports.jsx(SniffView, {}),
      !isSniffMode && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          ref: historyRef,
          className: "min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2",
          children: [
            showEmptyState && /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, {}),
            history.map((event, index) => {
              let finalScript = null;
              if (event.type === "step" && event.action?.name === "done") {
                for (let i = index - 1; i >= 0; i--) {
                  const prev = history[i];
                  if (prev.type === "step" && prev.action?.name === "execute_javascript") {
                    finalScript = prev.action?.input?.script ?? null;
                    break;
                  }
                }
              }
              return (
                // eslint-disable-next-line react-x/no-array-index-key
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  EventCard,
                  {
                    event,
                    onSaveAsTipScript: openTipScriptProposal,
                    finalScript
                  },
                  index
                )
              );
            }),
            activity && /* @__PURE__ */ jsxRuntimeExports.jsx(ActivityCard, { activity })
          ]
        }
      )
    ] }),
    showScriptPicker && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        role: "button",
        tabIndex: 0,
        className: "absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4",
        onClick: () => setShowScriptPicker(false),
        onKeyDown: (e) => {
          if (e.key === "Escape") setShowScriptPicker(false);
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            role: "dialog",
            className: "bg-background border rounded-lg shadow-lg w-full max-w-xs max-h-60 flex flex-col",
            onClick: (e) => e.stopPropagation(),
            onKeyDown: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-3 py-2 border-b", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold", children: t("panel.selectTipScript") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setShowScriptPicker(false),
                    className: "cursor-pointer",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3.5 text-muted-foreground hover:text-foreground" })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto", children: tipScriptList.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-center text-xs text-muted-foreground", children: t("panel.noTipScripts") }) : tipScriptList.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => handleSelectScript(item),
                  className: "w-full text-left px-3 py-2 text-xs hover:bg-muted/60 cursor-pointer truncate",
                  children: item.name
                },
                item.id
              )) })
            ]
          }
        )
      }
    ),
    !isSniffMode && /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "border-t", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 px-3 pt-2 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: picking ? "default" : "outline",
            size: "sm",
            onClick: handleElementPick,
            title: t("panel.pickElement.shortcut"),
            className: "text-[11px] h-6 px-2 cursor-pointer shrink-0",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Crosshair, { className: "size-3 mr-1" }),
              picking ? t("panel.picking") : t("panel.pickElement")
            ]
          }
        ),
        isScriptMode && (attachedScript ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-[11px] h-6 px-2 rounded-md border bg-primary/10 text-primary max-w-36 min-w-0 overflow-hidden shrink", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { className: "size-3 shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate min-w-0", title: attachedScript.name, children: attachedScript.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setAttachedScript(null),
              className: "shrink-0 hover:text-destructive cursor-pointer",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3" })
            }
          )
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: handleOpenScriptPicker,
            className: "text-[11px] h-6 px-2 cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { className: "size-3 mr-1" }),
              t("panel.refScript")
            ]
          }
        ))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(InputGroup, { className: "relative rounded-lg", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          InputGroupTextarea,
          {
            ref: textareaRef,
            placeholder: isScriptMode ? t("panel.placeholder.script") : t("panel.placeholder.normal"),
            value: inputValue,
            onChange: (e) => setInputValue(e.target.value),
            onKeyDown: handleKeyDown,
            disabled: isRunning,
            className: "text-xs pr-12 min-h-10"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputGroupAddon, { align: "inline-end", className: "absolute bottom-0 right-0", children: isRunning ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          InputGroupButton,
          {
            size: "icon-sm",
            variant: "destructive",
            onClick: handleStop,
            className: "size-7",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { className: "size-3" })
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          InputGroupButton,
          {
            size: "icon-sm",
            variant: "default",
            onClick: () => handleSubmit(),
            disabled: !inputValue.trim(),
            className: "size-7 cursor-pointer",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "size-3" })
          }
        ) })
      ] }) })
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
