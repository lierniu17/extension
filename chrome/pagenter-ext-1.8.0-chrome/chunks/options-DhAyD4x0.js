import { f as listTipScripts, i as updateTipScript, h as saveTipScript, a as deleteTipScript } from "./db-C_cyLlZZ.js";
import { i as createLucideIcon, m as useI18n, k as jsxRuntimeExports, s as siGithub, r as reactExports, a as Button, T as TriangleAlert, g as cn, L as Logo, G as Globe, d as ReactDOM, R as React, b as ErrorBoundary, I as I18nProvider } from "./index-AisPC-Mg.js";
import { E as Eye, C as CircleX, p as probeCapabilities, r as resolveLlmConfig, D as DEFAULT_SYSTEM_INSTRUCTION } from "./constants-0s7FZ8JK.js";
import { I as Input, C as ChevronRight, E as EyeOff, P as Plus, T as Trash2, X } from "./input-Bc2XF5Xz.js";
import { S as Switch } from "./switch-CvFTQ0h9.js";
import { E as ExternalLink } from "./external-link-C2lz2rEA.js";
import { k as listUpstreamMcpServers, n as putUpstreamMcpServer, b as deleteUpstreamMcpServer } from "./db-C3Se-Bze.js";
const __iconNode$8 = [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]];
const ChevronDown = createLucideIcon("chevron-down", __iconNode$8);
const __iconNode$7 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
];
const CircleCheck = createLucideIcon("circle-check", __iconNode$7);
const __iconNode$6 = [
  ["path", { d: "M12 15V3", key: "m9g1x1" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["path", { d: "m7 10 5 5 5-5", key: "brsn70" }]
];
const Download = createLucideIcon("download", __iconNode$6);
const __iconNode$5 = [
  ["path", { d: "M14 18a2 2 0 0 0-4 0", key: "1v8fkw" }],
  [
    "path",
    {
      d: "m19 11-2.11-6.657a2 2 0 0 0-2.752-1.148l-1.276.61A2 2 0 0 1 12 4H8.5a2 2 0 0 0-1.925 1.456L5 11",
      key: "1fkr7p"
    }
  ],
  ["path", { d: "M2 11h20", key: "3eubbj" }],
  ["circle", { cx: "17", cy: "18", r: "3", key: "82mm0e" }],
  ["circle", { cx: "7", cy: "18", r: "3", key: "lvkj7j" }]
];
const HatGlasses = createLucideIcon("hat-glasses", __iconNode$5);
const __iconNode$4 = [
  ["path", { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8", key: "5wwlr5" }],
  [
    "path",
    {
      d: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
      key: "r6nss1"
    }
  ]
];
const House = createLucideIcon("house", __iconNode$4);
const __iconNode$3 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 16v-4", key: "1dtifu" }],
  ["path", { d: "M12 8h.01", key: "e9boi3" }]
];
const Info = createLucideIcon("info", __iconNode$3);
const __iconNode$2 = [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]];
const LoaderCircle = createLucideIcon("loader-circle", __iconNode$2);
const __iconNode$1 = [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
];
const Pencil = createLucideIcon("pencil", __iconNode$1);
const __iconNode = [
  ["path", { d: "M12 3v12", key: "1x0j5s" }],
  ["path", { d: "m17 8-5-5-5 5", key: "7q97r8" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }]
];
const Upload = createLucideIcon("upload", __iconNode);
function AboutSection() {
  const { t } = useI18n();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-foreground", children: t("about.title") }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border p-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-semibold text-foreground", children: t("about.version") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-base font-mono text-foreground/50", children: [
        "v",
        "1.8.0"
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-8 space-y-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href: "TODO_GITHUB_URL",
          target: "_blank",
          rel: "noopener noreferrer",
          className: "flex items-center gap-4 px-4 py-3.5 rounded-lg hover:bg-muted/50 transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { role: "img", viewBox: "0 0 24 24", className: "size-5 fill-current text-foreground/70", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: siGithub.path }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base text-foreground", children: t("about.sourceCode") })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href: "TODO_HOMEPAGE_URL",
          target: "_blank",
          rel: "noopener noreferrer",
          className: "flex items-center gap-4 px-4 py-3.5 rounded-lg hover:bg-muted/50 transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(House, { className: "size-5 text-foreground/70" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base text-foreground", children: t("about.homePage") })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href: "TODO_GITHUB_URL/blob/main/docs/terms-and-privacy.md",
          target: "_blank",
          rel: "noopener noreferrer",
          className: "flex items-center gap-4 px-4 py-3.5 rounded-lg hover:bg-muted/50 transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(HatGlasses, { className: "size-5 text-foreground/70" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base text-foreground", children: t("about.privacy") })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-base text-foreground/50 text-center py-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
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
    ] }) })
  ] });
}
function AdvancedSection({ config, onSave }) {
  const { t } = useI18n();
  const [maxSteps, setMaxSteps] = reactExports.useState(config?.maxSteps);
  const [systemInstruction, setSystemInstruction] = reactExports.useState(config?.systemInstruction ?? "");
  const [experimentalLlmsTxt, setExperimentalLlmsTxt] = reactExports.useState(
    config?.experimentalLlmsTxt ?? false
  );
  const [experimentalIncludeAllTabs, setExperimentalIncludeAllTabs] = reactExports.useState(
    config?.experimentalIncludeAllTabs ?? false
  );
  const [autoExecDelaySec, setAutoExecDelaySec] = reactExports.useState(config?.autoExecDelaySec ?? 3);
  const [scriptDigest, setScriptDigest] = reactExports.useState(config?.scriptInPromptStrategy === "digest");
  const [developerMode, setDeveloperMode] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const [saved, setSaved] = reactExports.useState(false);
  reactExports.useEffect(() => {
    chrome.storage.local.get("developerMode").then((r) => setDeveloperMode(!!r.developerMode));
  }, []);
  reactExports.useEffect(() => {
    setMaxSteps(config?.maxSteps);
    setSystemInstruction(config?.systemInstruction ?? "");
    setExperimentalLlmsTxt(config?.experimentalLlmsTxt ?? false);
    setExperimentalIncludeAllTabs(config?.experimentalIncludeAllTabs ?? false);
    setAutoExecDelaySec(config?.autoExecDelaySec ?? 3);
    setScriptDigest(config?.scriptInPromptStrategy === "digest");
  }, [config]);
  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await onSave({
        ...config,
        maxSteps: maxSteps || void 0,
        systemInstruction: systemInstruction || void 0,
        experimentalLlmsTxt,
        experimentalIncludeAllTabs,
        scriptInPromptStrategy: scriptDigest ? "digest" : "full",
        autoExecDelaySec
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2e3);
    } finally {
      setSaving(false);
    }
  };
  async function handleSwitchSave(key, value) {
    if (!config) return;
    const next = { ...config, [key]: value };
    await onSave(next);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-foreground", children: t("advanced.title") }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-8 space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("advanced.maxSteps") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/50", children: t("advanced.maxSteps.desc") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "number",
            placeholder: t("advanced.maxSteps.placeholder"),
            min: 1,
            max: 200,
            value: maxSteps ?? "",
            onChange: (e) => setMaxSteps(e.target.value ? Number(e.target.value) : void 0),
            className: "h-10 text-base [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("advanced.systemInstruction") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/50", children: t("advanced.systemInstruction.desc") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            placeholder: t("advanced.systemInstruction.placeholder"),
            value: systemInstruction,
            onChange: (e) => setSystemInstruction(e.target.value),
            rows: 4,
            className: "w-full text-base rounded-lg border border-input bg-background px-4 py-3 resize-y min-h-[100px]"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("advanced.autoExecDelay") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/50", children: t("advanced.autoExecDelay.desc") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "number",
            min: 3,
            max: 60,
            value: autoExecDelaySec,
            onChange: (e) => {
              const v = Math.max(3, Math.min(60, parseInt(e.target.value) || 3));
              setAutoExecDelaySec(v);
            },
            className: "h-10 text-base w-32 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          onClick: handleSave,
          disabled: saving,
          className: "cursor-pointer h-10 px-8 text-base",
          children: saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : saved ? t("common.saved") : t("common.save")
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-8 space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between cursor-pointer py-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base text-foreground", children: t("advanced.experimentalLlmsTxt") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/50 mt-0.5", children: t("advanced.experimentalLlmsTxt.desc") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Switch,
          {
            checked: experimentalLlmsTxt,
            onCheckedChange: (v) => {
              setExperimentalLlmsTxt(v);
              handleSwitchSave("experimentalLlmsTxt", v);
            }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between cursor-pointer py-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base text-foreground", children: t("advanced.experimentalIncludeAllTabs") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/50 mt-0.5", children: t("advanced.experimentalIncludeAllTabs.desc") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Switch,
          {
            checked: experimentalIncludeAllTabs,
            onCheckedChange: (v) => {
              setExperimentalIncludeAllTabs(v);
              handleSwitchSave("experimentalIncludeAllTabs", v);
            }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between cursor-pointer py-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base text-foreground", children: t("advanced.scriptDigest") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/50 mt-0.5", children: t("advanced.scriptDigest.desc") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Switch,
          {
            checked: scriptDigest,
            onCheckedChange: (v) => {
              setScriptDigest(v);
              handleSwitchSave("scriptInPromptStrategy", v ? "digest" : "full");
            }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between cursor-pointer py-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base text-foreground", children: t("advanced.developerMode") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/50 mt-0.5", children: t("advanced.developerMode.desc") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Switch,
          {
            checked: developerMode,
            onCheckedChange: (v) => {
              setDeveloperMode(v);
              chrome.storage.local.set({ developerMode: v });
            }
          }
        )
      ] })
    ] })
  ] });
}
function stringifyProbeValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[unrenderable]";
  }
}
function CapabilityRow({ name, probe, fallback, manualInput }) {
  const { t } = useI18n();
  const [showDetail, setShowDetail] = reactExports.useState(false);
  const labelKey = `general.capability.${name}.label`;
  const stateKey = probe.inconclusive ? `general.capability.${name}.inconclusive` : `general.capability.${name}.${probe.supported ? "supported" : "unsupported"}`;
  const params = {};
  if (probe.value != null) params.value = stringifyProbeValue(probe.value);
  if (fallback != null) params.fallback = String(fallback);
  const supported = probe.supported;
  const hasDetail = Boolean(probe.error || probe.evidence);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "flex items-start gap-2 rounded-lg border px-4 py-3",
        supported ? "border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10" : "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
      ),
      children: [
        supported ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "size-5 shrink-0 text-green-600 dark:text-green-400 mt-0.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: cn(
              "flex-1 text-sm space-y-1",
              supported ? "text-green-800 dark:text-green-300" : "text-amber-800 dark:text-amber-300"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: t(labelKey) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "opacity-80", children: " · " }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t(stateKey, params) })
              ] }),
              hasDetail && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  className: "flex items-center gap-1 text-xs underline opacity-70 hover:opacity-100 cursor-pointer",
                  onClick: () => setShowDetail((v) => !v),
                  children: [
                    showDetail ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "size-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-3" }),
                    t("general.capability.common.toggleDetail")
                  ]
                }
              ),
              showDetail && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 text-xs space-y-1 opacity-80", children: [
                probe.error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
                    t("general.capability.common.error"),
                    ": "
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono break-all", children: probe.error })
                ] }),
                probe.evidence && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
                    t("general.capability.common.evidence"),
                    ": "
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono break-all", children: probe.evidence })
                ] })
              ] }),
              manualInput && !probe.supported && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-semibold block", children: t("general.capability.contextLength.manualLabel") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    type: "number",
                    min: 1,
                    step: 1,
                    value: manualInput.value,
                    onChange: (e) => manualInput.onChange(e.target.value),
                    placeholder: t("general.capability.contextLength.manualPlaceholder", {
                      fallback: fallback != null ? String(fallback) : ""
                    }),
                    className: "h-8 text-sm"
                  }
                )
              ] })
            ]
          }
        )
      ]
    }
  );
}
const CONTEXT_LENGTH_FALLBACK = 32e3;
function parseManualContextLength(raw) {
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return void 0;
  return n;
}
function resolveSupportsVision(probe, previous) {
  if (probe.vision.inconclusive) return previous;
  return probe.vision.supported;
}
function resolveContextLength(probe, manualRaw) {
  if (probe.contextLength.supported && probe.contextLength.value !== null && probe.contextLength.value !== void 0) {
    return probe.contextLength.value;
  }
  return parseManualContextLength(manualRaw);
}
const CAPABILITY_RENDER_ORDER = ["tokenParam", "vision", "contextLength"];
function GeneralSection({ config, onSave }) {
  const { t } = useI18n();
  const [baseURL, setBaseURL] = reactExports.useState(config?.baseURL ?? "");
  const [model, setModel] = reactExports.useState(config?.model ?? "");
  const [apiKey, setApiKey] = reactExports.useState(config?.apiKey ?? "");
  const [language, setLanguage] = reactExports.useState(config?.language ?? "zh-CN");
  const [tempEnabled, setTempEnabled] = reactExports.useState(
    config?.temperature !== null && config?.temperature !== void 0
  );
  const [tempValue, setTempValue] = reactExports.useState(config?.temperature ?? 0.7);
  const [showApiKey, setShowApiKey] = reactExports.useState(false);
  const [saveState, setSaveState] = reactExports.useState({ kind: "idle" });
  const [manualContextLength, setManualContextLength] = reactExports.useState(
    config?.contextLength !== null && config?.contextLength !== void 0 ? String(config.contextLength) : ""
  );
  reactExports.useEffect(() => {
    setBaseURL(config?.baseURL ?? "");
    setModel(config?.model ?? "");
    setApiKey(config?.apiKey ?? "");
    setLanguage(config?.language ?? "zh-CN");
    setTempEnabled(config?.temperature !== null && config?.temperature !== void 0);
    setTempValue(config?.temperature ?? 0.7);
    setManualContextLength(
      config?.contextLength !== null && config?.contextLength !== void 0 ? String(config.contextLength) : ""
    );
  }, [config]);
  const handleSave = async () => {
    if (!config) return;
    if (!baseURL.trim() || !model.trim()) {
      setSaveState({ kind: "error", error: t("general.probeMissingFields") });
      return;
    }
    setSaveState({ kind: "probing" });
    let probe;
    try {
      probe = await probeCapabilities(
        { baseURL: baseURL.trim(), model: model.trim(), apiKey: apiKey.trim() },
        { force: true }
      );
    } catch (error) {
      setSaveState({
        kind: "error",
        error: error instanceof Error ? error.message : String(error)
      });
      return;
    }
    if (!probe.ok) {
      setSaveState({ kind: "error", error: probe.connectivityError ?? "Unknown error" });
      return;
    }
    try {
      await onSave({
        ...config,
        apiKey,
        baseURL,
        model,
        language,
        temperature: tempEnabled ? tempValue : void 0,
        supportsVision: resolveSupportsVision(probe, config.supportsVision),
        contextLength: resolveContextLength(probe, manualContextLength),
        tokenLimitParam: probe.tokenParam.value
      });
      setSaveState({ kind: "success", probe });
    } catch (error) {
      setSaveState({
        kind: "error",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-foreground", children: t("general.title") }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-8 space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("general.baseUrl") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            placeholder: t("general.baseUrl.placeholder"),
            value: baseURL,
            onChange: (e) => setBaseURL(e.target.value),
            className: "h-10 text-base"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("general.model") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            placeholder: t("general.model.placeholder"),
            value: model,
            onChange: (e) => setModel(e.target.value),
            className: "h-10 text-base"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("general.apiKey") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              type: showApiKey ? "text" : "password",
              value: apiKey,
              onChange: (e) => setApiKey(e.target.value),
              className: "h-10 text-base"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outline",
              size: "icon",
              className: "h-10 w-10 shrink-0 cursor-pointer",
              onClick: () => setShowApiKey(!showApiKey),
              children: showApiKey ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "size-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "size-4" })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("general.responseLanguage") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: language ?? "",
            onChange: (e) => setLanguage(e.target.value || void 0),
            className: "w-full h-10 text-base rounded-lg border border-input bg-background px-3 cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: t("general.responseLanguage.system") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "en-US", children: t("general.responseLanguage.en") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "zh-CN", children: t("general.responseLanguage.zh") })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-semibold text-foreground", children: t("general.temperature") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/50 mt-0.5", children: t("general.temperature.desc") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: tempEnabled, onCheckedChange: setTempEnabled })
        ] }),
        tempEnabled && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            type: "number",
            min: 0,
            max: 2,
            step: 0.1,
            value: tempValue,
            onChange: (e) => setTempValue(parseFloat(e.target.value) || 0),
            className: "h-10 text-base w-32"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-3 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            onClick: handleSave,
            disabled: saveState.kind === "probing",
            className: "cursor-pointer h-10 px-8 text-base",
            children: saveState.kind === "probing" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin mr-2" }),
              t("common.saving")
            ] }) : t("common.save")
          }
        ),
        saveState.kind === "probing" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm text-foreground/60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("general.probing") })
        ] }),
        saveState.kind === "success" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-foreground/70", children: t("general.probeSuccess") }),
          CAPABILITY_RENDER_ORDER.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            CapabilityRow,
            {
              name,
              probe: saveState.probe[name],
              fallback: name === "contextLength" ? CONTEXT_LENGTH_FALLBACK : void 0,
              manualInput: name === "contextLength" ? {
                value: manualContextLength,
                onChange: setManualContextLength
              } : void 0
            },
            name
          )),
          !saveState.probe.contextLength.supported && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-foreground/60", children: t("general.capability.contextLength.manualHint") })
        ] }),
        saveState.kind === "error" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 px-4 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "size-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 text-sm text-red-800 dark:text-red-300 space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: t("general.probeFailure") }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs opacity-80", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-semibold", children: [
                t("general.probeFailure.detail"),
                ": "
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono break-all", children: saveState.error })
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function HubSection({ onSettingsChanged }) {
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
    onSettingsChanged?.();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-foreground", children: t("hub.title") }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-8 space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "label",
        {
          className: `flex items-center justify-between p-5 rounded-lg border cursor-pointer transition-colors ${allowAll ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400" : "bg-muted/30 text-foreground"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-semibold", children: t("hub.autoApprove") }),
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-foreground/50 leading-relaxed", children: [
        t("hub.autoApprove.desc"),
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-foreground/70", children: t("hub.autoApprove.caution") })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-8 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("hub.manage") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/50 mt-1", children: t("hub.manage.desc") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          href: chrome.runtime.getURL("hub.html"),
          target: "_blank",
          rel: "noopener noreferrer",
          className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border text-base font-medium text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-colors",
          children: [
            t("hub.manage"),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-4" })
          ]
        }
      )
    ] })
  ] });
}
const STORAGE_KEY_LLM = "sniffLlmConfig";
function SniffSection({ onSettingsChanged }) {
  const { t } = useI18n();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-foreground", children: t("sniff.options.title") }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(LlmOverrideCard, { onChanged: onSettingsChanged }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(UpstreamMcpCard, { onChanged: onSettingsChanged })
  ] });
}
function LlmOverrideCard({ onChanged }) {
  const { t } = useI18n();
  const [override, setOverride] = reactExports.useState(null);
  const [enabled, setEnabled] = reactExports.useState(false);
  reactExports.useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY_LLM).then((r) => {
      const stored = r[STORAGE_KEY_LLM];
      setOverride(stored);
      setEnabled(!!stored);
    });
  }, []);
  const toggleEnabled = (checked) => {
    setEnabled(checked);
    if (!checked) {
      chrome.storage.local.remove(STORAGE_KEY_LLM);
      setOverride(void 0);
      onChanged?.();
    } else if (!override) {
      setOverride({ baseURL: "", apiKey: "", model: "" });
    }
  };
  const saveField = async (patch) => {
    const next = override ? { ...override, ...patch } : patch;
    setOverride(next);
    await chrome.storage.local.set({ [STORAGE_KEY_LLM]: next });
    onChanged?.();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-8 space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between p-5 rounded-lg border bg-muted/30", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-base font-semibold", children: t("sniff.options.llm.title") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-foreground/50 mt-1", children: t("sniff.options.llm.desc") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: enabled, onCheckedChange: toggleEnabled })
    ] }),
    enabled && override && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LabeledInput,
        {
          label: "baseURL",
          value: override.baseURL ?? "",
          placeholder: "https://api.openai.com/v1",
          onChange: (v) => saveField({ baseURL: v })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LabeledInput,
        {
          label: "apiKey",
          value: override.apiKey ?? "",
          placeholder: "sk-...",
          type: "password",
          onChange: (v) => saveField({ apiKey: v })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LabeledInput,
        {
          label: "model",
          value: override.model ?? "",
          placeholder: "gpt-4o-mini",
          onChange: (v) => saveField({ model: v })
        }
      )
    ] }),
    !enabled && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-foreground/50", children: t("sniff.options.llm.useMain") })
  ] });
}
function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono text-foreground/60", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type,
        value,
        placeholder,
        onChange: (e) => onChange(e.target.value),
        className: "h-9 px-3 text-sm border rounded-lg bg-background"
      }
    )
  ] });
}
function UpstreamMcpCard({ onChanged }) {
  const { t } = useI18n();
  const [servers, setServers] = reactExports.useState([]);
  const [editingId, setEditingId] = reactExports.useState(null);
  const refresh = reactExports.useCallback(async () => {
    const rows = await listUpstreamMcpServers();
    setServers(rows);
  }, []);
  reactExports.useEffect(() => {
    let cancelled = false;
    void listUpstreamMcpServers().then((rows) => {
      if (!cancelled) setServers(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const createNew = async () => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const record = {
      id,
      name: `Server ${servers.length + 1}`,
      transport: "stdio",
      command: "",
      args: [],
      allowedTools: ["*"],
      enabled: false,
      createdAt: now,
      updatedAt: now
    };
    await putUpstreamMcpServer(record);
    setEditingId(id);
    onChanged?.();
    await refresh();
  };
  const saveServer = async (patch) => {
    await putUpstreamMcpServer({ ...patch, updatedAt: Date.now() });
    onChanged?.();
    await refresh();
  };
  const removeServer = async (id) => {
    await deleteUpstreamMcpServer(id);
    if (editingId === id) setEditingId(null);
    onChanged?.();
    await refresh();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-8 space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-base font-semibold", children: t("sniff.options.mcp.title") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: createNew, className: "gap-1 shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5" }),
          t("sniff.options.mcp.addBtn")
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-foreground/50 mt-1", children: t("sniff.options.mcp.desc") })
    ] }),
    servers.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-foreground/50 py-4 text-center", children: "No upstream MCP servers configured." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: servers.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      McpServerRow,
      {
        server: s,
        editing: editingId === s.id,
        onEditToggle: () => setEditingId(editingId === s.id ? null : s.id),
        onSave: saveServer,
        onDelete: () => removeServer(s.id)
      },
      `${s.id}:${editingId === s.id ? "edit" : "view"}:${s.updatedAt}`
    )) })
  ] });
}
function McpServerRow({
  server,
  editing,
  onEditToggle,
  onSave,
  onDelete
}) {
  const { t } = useI18n();
  const [draft, setDraft] = reactExports.useState(server);
  const commit = async (patch) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    await onSave(next);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Switch,
        {
          checked: server.enabled,
          onCheckedChange: (checked) => commit({ enabled: checked })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: onEditToggle,
          className: "flex-1 text-left text-sm font-medium truncate",
          children: [
            server.name,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-xs font-mono text-muted-foreground", children: server.transport === "stdio" ? server.command || "(command?)" : server.url || "(url?)" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onDelete,
          title: t("sniff.options.mcp.delete"),
          className: "p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-4" })
        }
      )
    ] }),
    editing && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-t space-y-2 bg-muted/20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LabeledInput,
        {
          label: t("sniff.options.mcp.form.name"),
          value: draft.name,
          onChange: (v) => commit({ name: v })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono text-foreground/60", children: t("sniff.options.mcp.form.transport") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: draft.transport,
            onChange: (e) => commit({
              transport: e.target.value
            }),
            className: "h-9 px-3 text-sm border rounded-lg bg-background",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "stdio", children: "stdio (local command)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "sse", children: "sse (HTTP)" })
            ]
          }
        )
      ] }),
      draft.transport === "stdio" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          LabeledInput,
          {
            label: t("sniff.options.mcp.form.command"),
            value: draft.command ?? "",
            placeholder: "npx",
            onChange: (v) => commit({ command: v })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono text-foreground/60", children: t("sniff.options.mcp.form.args") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "textarea",
            {
              value: (draft.args ?? []).join("\n"),
              rows: 3,
              onChange: (e) => setDraft({
                ...draft,
                args: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
              }),
              onBlur: () => commit({ args: draft.args }),
              placeholder: "-y\\n@some/mcp-server",
              className: "px-3 py-2 text-sm border rounded-lg bg-background font-mono"
            }
          )
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        LabeledInput,
        {
          label: t("sniff.options.mcp.form.url"),
          value: draft.url ?? "",
          placeholder: "http://localhost:3000/sse",
          onChange: (v) => commit({ url: v })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LabeledInput,
        {
          label: t("sniff.options.mcp.form.allowedTools"),
          value: Array.isArray(draft.allowedTools) ? draft.allowedTools.join(", ") : draft.allowedTools ?? "",
          placeholder: "* or tool1, tool2",
          onChange: (v) => commit({
            allowedTools: v.split(",").map((s) => s.trim()).filter(Boolean)
          })
        }
      )
    ] })
  ] });
}
const EMPTY_FORM = {
  name: "",
  description: "",
  script: "",
  urlPatterns: ["*://*/*"],
  triggerMode: "manual",
  enabled: true
};
function TipScriptSection() {
  const { t } = useI18n();
  const [items, setItems] = reactExports.useState([]);
  const [search, setSearch] = reactExports.useState("");
  const [editing, setEditing] = reactExports.useState(null);
  const [creating, setCreating] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState(EMPTY_FORM);
  const [saving, setSaving] = reactExports.useState(false);
  const [expandedIds, setExpandedIds] = reactExports.useState(/* @__PURE__ */ new Set());
  const toggleExpanded = reactExports.useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const refresh = reactExports.useCallback(async () => {
    const all = await listTipScripts();
    setItems(all);
  }, []);
  reactExports.useEffect(() => {
    refresh();
  }, [refresh]);
  const filtered = items.filter(
    (ts) => !search || ts.name.toLowerCase().includes(search.toLowerCase()) || ts.description.toLowerCase().includes(search.toLowerCase())
  );
  const handleCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCreating(true);
  };
  const handleEdit = (ts) => {
    setCreating(false);
    setEditing(ts);
    setForm({
      name: ts.name,
      description: ts.description,
      script: ts.script,
      urlPatterns: ts.urlPatterns,
      triggerMode: ts.triggerMode,
      enabled: ts.enabled
    });
  };
  const handleCancel = () => {
    setCreating(false);
    setEditing(null);
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateTipScript(editing.id, form);
      } else {
        await saveTipScript(form);
      }
      setCreating(false);
      setEditing(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id) => {
    await deleteTipScript(id);
    if (editing?.id === id) {
      setEditing(null);
    }
    await refresh();
  };
  const handleToggle = async (ts) => {
    await updateTipScript(ts.id, { enabled: !ts.enabled });
    await refresh();
  };
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tipscripts-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.js,.ts,.txt";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = e.target.files;
      if (!files?.length) return;
      try {
        for (const file of Array.from(files)) {
          const text = await file.text();
          if (file.name.endsWith(".json")) {
            const parsed = JSON.parse(text);
            const data = Array.isArray(parsed) ? parsed : [parsed];
            for (const ts of data) {
              await saveTipScript({
                name: ts.name || "Imported",
                description: ts.description || "",
                script: ts.script || "",
                urlPatterns: ts.urlPatterns || ["*://*/*"],
                triggerMode: ts.triggerMode || "manual",
                enabled: ts.enabled ?? true
              });
            }
          } else {
            await saveTipScript({
              name: file.name.replace(/\.[^.]+$/, ""),
              description: "",
              script: text,
              urlPatterns: ["*://*/*"],
              triggerMode: "manual",
              enabled: true
            });
          }
        }
        await refresh();
      } catch (err) {
        console.error("[Options] Import failed:", err);
      }
    };
    input.click();
  };
  const addUrlPattern = () => {
    setForm((f) => ({ ...f, urlPatterns: [...f.urlPatterns, ""] }));
  };
  const removeUrlPattern = (idx) => {
    setForm((f) => ({ ...f, urlPatterns: f.urlPatterns.filter((_, i) => i !== idx) }));
  };
  const updateUrlPattern = (idx, value) => {
    setForm((f) => ({
      ...f,
      urlPatterns: f.urlPatterns.map((p, i) => i === idx ? value : p)
    }));
  };
  if (creating || editing) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-foreground", children: editing ? t("tipScript.edit") : t("tipScript.create") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", onClick: handleCancel, className: "cursor-pointer", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-5" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border p-8 space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("tipScript.name") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              value: form.name,
              onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })),
              placeholder: t("tipScript.name.placeholder"),
              className: "h-10 text-base"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("tipScript.description") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              value: form.description,
              onChange: (e) => setForm((f) => ({ ...f, description: e.target.value })),
              placeholder: t("tipScript.description.placeholder"),
              className: "h-10 text-base"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("tipScript.script") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "textarea",
            {
              value: form.script,
              onChange: (e) => setForm((f) => ({ ...f, script: e.target.value })),
              placeholder: t("tipScript.script.placeholder"),
              rows: 12,
              className: "w-full text-sm font-mono rounded-lg border border-input bg-background px-4 py-3 resize-y min-h-[200px] leading-relaxed",
              spellCheck: false
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("tipScript.urlPatterns") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/50", children: t("tipScript.urlPatterns.hint") }),
          form.urlPatterns.map((pattern, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 items-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                value: pattern,
                onChange: (e) => updateUrlPattern(idx, e.target.value),
                placeholder: "*://example.com/*",
                className: "h-10 text-sm font-mono"
              }
            ),
            form.urlPatterns.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "ghost",
                size: "icon",
                onClick: () => removeUrlPattern(idx),
                className: "shrink-0 cursor-pointer",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
              }
            )
          ] }, idx)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: addUrlPattern, className: "cursor-pointer", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3 mr-1" }),
            t("tipScript.addPattern")
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-base font-semibold text-foreground", children: t("tipScript.triggerMode") }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: form.triggerMode,
              onChange: (e) => setForm((f) => ({
                ...f,
                triggerMode: e.target.value
              })),
              className: "w-full h-10 text-base rounded-lg border border-input bg-background px-3 cursor-pointer",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "manual", children: t("tipScript.triggerMode.manual") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "auto", children: t("tipScript.triggerMode.auto") })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between cursor-pointer py-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base text-foreground", children: t("tipScript.enabled") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              checked: form.enabled,
              onCheckedChange: (v) => setForm((f) => ({ ...f, enabled: v }))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-3 pt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            onClick: handleSave,
            disabled: saving || !form.name || !form.script,
            className: "cursor-pointer h-10 px-8 text-base",
            children: saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : t("common.save")
          }
        ) })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-10 min-w-0 max-w-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-foreground truncate", children: t("tipScript.title") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: handleImport, className: "cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-3.5 mr-1" }),
          t("tipScript.import")
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: handleExport,
            disabled: items.length === 0,
            className: "cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-3.5 mr-1" }),
              t("tipScript.export")
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: handleCreate, className: "cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-3.5 mr-1" }),
          t("tipScript.create")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Input,
      {
        placeholder: t("tipScript.search"),
        value: search,
        onChange: (e) => setSearch(e.target.value),
        className: "h-10 text-base"
      }
    ),
    filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-12 text-sm text-muted-foreground", children: items.length === 0 ? t("tipScript.empty") : t("tipScript.noResults") }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3 min-w-0", children: filtered.map((ts) => {
      const isExpanded = expandedIds.has(ts.id);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border overflow-hidden min-w-0 max-w-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 flex items-start gap-4 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-base truncate", children: ts.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: `text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${ts.triggerMode === "auto" ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"}`,
                  children: ts.triggerMode === "auto" ? t("tipScript.triggerMode.auto") : t("tipScript.triggerMode.manual")
                }
              )
            ] }),
            !isExpanded && ts.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/60 mt-0.5 truncate", children: ts.description }),
            !isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-foreground/40 mt-1 font-mono truncate", children: ts.urlPatterns.join(", ") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: ts.enabled, onCheckedChange: () => handleToggle(ts) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "ghost",
                size: "icon-sm",
                onClick: () => handleEdit(ts),
                className: "cursor-pointer",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-3.5" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "ghost",
                size: "icon-sm",
                onClick: () => handleDelete(ts.id),
                className: "cursor-pointer text-destructive hover:text-destructive",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "ghost",
                size: "icon-sm",
                onClick: () => toggleExpanded(ts.id),
                className: "cursor-pointer",
                "aria-expanded": isExpanded,
                "aria-label": isExpanded ? "Collapse" : "Expand",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ChevronDown,
                  {
                    className: `size-4 transition-transform ${isExpanded ? "" : "-rotate-90"}`
                  }
                )
              }
            )
          ] })
        ] }),
        isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t px-5 py-4 space-y-4 bg-muted/20 min-w-0", children: [
          ts.description && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold text-foreground/50 mb-1", children: t("tipScript.description") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground/80 whitespace-pre-wrap break-words", children: ts.description })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold text-foreground/50 mb-1", children: t("tipScript.urlPatterns") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-0.5", children: ts.urlPatterns.map((p, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "text-xs font-mono text-foreground/70 break-all", children: p }, i)) })
          ] })
        ] })
      ] }, ts.id);
    }) })
  ] });
}
const SECTION_IDS = ["general", "advanced", "tipScript", "hub", "sniff", "about"];
function sectionFromHash() {
  const id = window.location.hash.slice(1);
  return SECTION_IDS.includes(id) ? id : "general";
}
function useExtConfig() {
  const [config, setConfig] = reactExports.useState(null);
  reactExports.useEffect(() => {
    chrome.storage.local.get(["llmConfig", "language", "advancedConfig"]).then((result) => {
      const llmConfig = resolveLlmConfig(result.llmConfig);
      const language = result.language || "zh-CN";
      const stored = result.advancedConfig ?? {};
      const advancedConfig = {
        systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
        ...stored
      };
      setConfig({ ...llmConfig, ...advancedConfig, language });
    });
  }, []);
  const saveConfig = reactExports.useCallback(
    async ({
      language,
      maxSteps,
      systemInstruction,
      experimentalLlmsTxt,
      experimentalIncludeAllTabs,
      autoExecDelaySec,
      ...llmConfig
    }) => {
      await chrome.storage.local.set({ llmConfig });
      if (language) {
        await chrome.storage.local.set({ language });
      } else {
        await chrome.storage.local.remove("language");
      }
      const advancedConfig = {
        maxSteps,
        systemInstruction,
        experimentalLlmsTxt,
        experimentalIncludeAllTabs,
        autoExecDelaySec
      };
      await chrome.storage.local.set({ advancedConfig });
      setConfig({ ...llmConfig, ...advancedConfig, language });
    },
    []
  );
  return { config, saveConfig };
}
function App() {
  const { t, setLocale, userLocale } = useI18n();
  const [activeSection, setActiveSection] = reactExports.useState(sectionFromHash);
  const [showSavedTip, setShowSavedTip] = reactExports.useState(false);
  const { config, saveConfig: rawSaveConfig } = useExtConfig();
  reactExports.useEffect(() => {
    const syncSection = () => setActiveSection(sectionFromHash());
    window.addEventListener("hashchange", syncSection);
    return () => window.removeEventListener("hashchange", syncSection);
  }, []);
  const saveConfig = reactExports.useCallback(
    async (cfg) => {
      await rawSaveConfig(cfg);
      setShowSavedTip(true);
    },
    [rawSaveConfig]
  );
  const navItems = [
    { id: "general", labelKey: "nav.general" },
    { id: "advanced", labelKey: "nav.advanced" },
    { id: "tipScript", labelKey: "nav.tipScript" },
    { id: "hub", labelKey: "nav.hub" },
    { id: "sniff", labelKey: "nav.sniff" },
    { id: "about", labelKey: "nav.about" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center min-h-screen bg-background", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full max-w-4xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "w-56 shrink-0 pt-10 pr-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 px-4 mb-8", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Logo, { className: "size-7" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-bold", children: "Pagenter" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "space-y-1 px-2", children: navItems.map(({ id, labelKey }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => {
            setActiveSection(id);
            window.location.hash = id;
          },
          className: `w-full text-left px-4 py-2.5 rounded-lg text-[15px] font-bold transition-colors cursor-pointer ${activeSection === id ? "bg-blue-500/10 text-blue-600" : "text-foreground/70 hover:bg-muted hover:text-foreground"}`,
          children: t(labelKey)
        },
        id
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 px-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "size-4 text-foreground/50" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-foreground/50", children: t("language.title") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: userLocale ?? "",
            onChange: (e) => setLocale(e.target.value || void 0),
            className: "w-full h-9 text-sm rounded-lg border border-input bg-background px-3 cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: t("language.followSystem") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "en", children: "English" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "zh-CN", children: "中文" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex-1 min-w-0 pt-10 pb-16 pl-8", children: [
      showSavedTip && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 px-5 py-3.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-5 shrink-0 text-blue-600 dark:text-blue-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-sm text-blue-800 dark:text-blue-300", children: t("common.settingsChanged") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setShowSavedTip(false),
            className: "shrink-0 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 cursor-pointer",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
          }
        )
      ] }),
      activeSection === "general" && /* @__PURE__ */ jsxRuntimeExports.jsx(GeneralSection, { config, onSave: saveConfig }),
      activeSection === "advanced" && /* @__PURE__ */ jsxRuntimeExports.jsx(AdvancedSection, { config, onSave: saveConfig }),
      activeSection === "tipScript" && /* @__PURE__ */ jsxRuntimeExports.jsx(TipScriptSection, {}),
      activeSection === "hub" && /* @__PURE__ */ jsxRuntimeExports.jsx(HubSection, { onSettingsChanged: () => setShowSavedTip(true) }),
      activeSection === "sniff" && /* @__PURE__ */ jsxRuntimeExports.jsx(SniffSection, { onSettingsChanged: () => setShowSavedTip(true) }),
      activeSection === "about" && /* @__PURE__ */ jsxRuntimeExports.jsx(AboutSection, {})
    ] })
  ] }) });
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
