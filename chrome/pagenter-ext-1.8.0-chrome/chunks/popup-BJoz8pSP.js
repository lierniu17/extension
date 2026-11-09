import { b as getMatchingTipScripts } from "./db-C_cyLlZZ.js";
import { i as createLucideIcon, m as useI18n, r as reactExports, k as jsxRuntimeExports, L as Logo, a as Button, S as Settings, d as ReactDOM, R as React, b as ErrorBoundary, I as I18nProvider } from "./index-AisPC-Mg.js";
import { Z as Zap } from "./zap-NPAHCgQi.js";
import { P as Play } from "./play-BVSF7kc5.js";
import { E as ExternalLink } from "./external-link-C2lz2rEA.js";
const __iconNode = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M15 3v18", key: "14nvp0" }]
];
const PanelRight = createLucideIcon("panel-right", __iconNode);
function App() {
  const { t } = useI18n();
  const [tipScripts, setTipScripts] = reactExports.useState([]);
  const [currentUrl, setCurrentUrl] = reactExports.useState("");
  const [runningId, setRunningId] = reactExports.useState(null);
  reactExports.useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      const url = tab?.url || "";
      setCurrentUrl(url);
      if (url) {
        getMatchingTipScripts(url).then(setTipScripts);
      }
    });
  }, []);
  const handleRun = async (mz) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    setRunningId(mz.id);
    try {
      await chrome.runtime.sendMessage({
        type: "TIPSCRIPT_EXECUTE",
        tabId: tab.id,
        script: mz.script
      });
    } catch (err) {
      console.error("[Popup] Failed to execute tipscript:", err);
    } finally {
      setRunningId(null);
    }
  };
  const handleOpenSidePanel = async () => {
    const win = await chrome.windows.getCurrent();
    if (win.id) {
      await chrome.sidePanel.open({ windowId: win.id });
    }
    window.close();
  };
  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage();
    window.close();
  };
  const manualScripts = tipScripts.filter((ts) => ts.triggerMode === "manual");
  const autoScripts = tipScripts.filter((ts) => ts.triggerMode === "auto");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-80 bg-background text-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Logo, { className: "size-5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold", children: "Pagenter" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "ghost",
          size: "icon-sm",
          onClick: handleOpenSidePanel,
          className: "cursor-pointer",
          title: t("popup.openSidePanel"),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(PanelRight, { className: "size-4" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-3 space-y-3", children: tipScripts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-6 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "size-8 mx-auto mb-2 opacity-30" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t("popup.noTipScript") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs mt-1 opacity-70", children: t("popup.noTipScript.hint") })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      manualScripts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: t("popup.manualScripts") }),
        manualScripts.map((mz) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex items-center justify-between rounded-lg border px-3 py-2",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: mz.name }),
                mz.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground truncate", children: mz.description })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "ghost",
                  size: "icon-sm",
                  onClick: () => handleRun(mz),
                  disabled: runningId === mz.id,
                  className: "ml-2 cursor-pointer shrink-0",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "size-3.5" })
                }
              )
            ]
          },
          mz.id
        ))
      ] }),
      autoScripts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: t("popup.autoScripts") }),
        autoScripts.map((mz) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex items-center justify-between rounded-lg border px-3 py-2 opacity-70",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: mz.name }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-green-600 shrink-0", children: t("popup.autoActive") })
            ]
          },
          mz.id
        ))
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-4 py-3 border-t", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          className: "flex-1 cursor-pointer text-xs",
          onClick: handleOpenOptions,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "size-3 mr-1.5" }),
            t("popup.manageTipScript")
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          className: "flex-1 cursor-pointer text-xs",
          onClick: handleOpenSidePanel,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3 mr-1.5" }),
            t("popup.openSidePanel")
          ]
        }
      )
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
