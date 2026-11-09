var background = (function() {
  "use strict";
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  function handlePageControlMessage(message, sender, sendResponse) {
    const PREFIX2 = "[RemotePageController.background]";
    const debug2 = console.debug.bind(console, `\x1B[90m${PREFIX2}\x1B[0m`);
    const { action, payload, targetTabId } = message;
    if (action === "get_my_tab_id") {
      debug2("get_my_tab_id", sender.tab?.id);
      sendResponse({ tabId: sender.tab?.id || null });
      return;
    }
    sendPageControlMessage(targetTabId, action, payload).then((result2) => {
      sendResponse(result2);
    }).catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("Receiving end does not exist")) {
        console.warn(
          PREFIX2,
          `[${action}] tab ${targetTabId}: content script still missing after auto-injection. The page may be on a restricted URL (chrome://, chrome-extension://, view-source:, etc.) or the user denied scripting permission. Original error:`,
          error
        );
      } else if (msg.includes("Cannot access") || msg.includes("Missing host permission")) {
        console.warn(
          PREFIX2,
          `[${action}] tab ${targetTabId}: extension cannot script this URL. Original error:`,
          error
        );
      } else {
        console.warn(PREFIX2, `[${action}] tab ${targetTabId}:`, error);
      }
      sendResponse({ success: false, error: msg });
    });
    return true;
  }
  async function sendPageControlMessage(tabId, action, payload) {
    try {
      return await chrome.tabs.sendMessage(tabId, {
        type: "PAGE_CONTROL",
        action,
        payload
      });
    } catch (error) {
      if (!isMissingReceivingEnd(error)) throw error;
      try {
        await injectContentScript(tabId);
      } catch (injectErr) {
        const injectMsg = injectErr instanceof Error ? injectErr.message : String(injectErr);
        throw new Error(`Receiving end does not exist and auto-injection failed: ${injectMsg}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
      return chrome.tabs.sendMessage(tabId, {
        type: "PAGE_CONTROL",
        action,
        payload
      });
    }
  }
  function isMissingReceivingEnd(error) {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("Receiving end does not exist");
  }
  async function injectContentScript(tabId) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-scripts/content.js"],
      world: "ISOLATED"
    });
  }
  const PREFIX$1 = "[TabsController.background]";
  const debug$1 = console.debug.bind(console, `\x1B[90m${PREFIX$1}\x1B[0m`);
  function handleTabControlMessage(message, sender, sendResponse) {
    const { action, payload } = message;
    switch (action) {
      case "get_active_tab": {
        debug$1("get_active_tab");
        chrome.tabs.query({ active: true }).then((tabs) => {
          debug$1("get_active_tab: success", tabs);
          sendResponse({ success: true, tab: tabs[0] });
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "get_tab_info": {
        debug$1("get_tab_info", payload);
        chrome.tabs.get(payload.tabId).then((tab) => {
          debug$1("get_tab_info: success", tab);
          sendResponse(tab);
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "open_new_tab": {
        debug$1("open_new_tab", payload);
        chrome.tabs.create({ url: payload.url, active: false }).then((newTab) => {
          debug$1("open_new_tab: success", newTab);
          sendResponse({ success: true, tabId: newTab.id });
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "create_tab_group": {
        debug$1("create_tab_group", payload);
        chrome.tabs.group({ tabIds: payload.tabIds, createProperties: { windowId: payload.windowId } }).then((groupId) => {
          debug$1("create_tab_group: success", groupId);
          sendResponse({ success: true, groupId });
        }).catch((error) => {
          console.error(PREFIX$1, "Failed to create tab group", error);
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "update_tab_group": {
        debug$1("update_tab_group", payload);
        chrome.tabGroups.update(payload.groupId, payload.properties).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "add_tab_to_group": {
        debug$1("add_tab_to_group", payload);
        chrome.tabs.group({ tabIds: payload.tabId, groupId: payload.groupId }).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "close_tab": {
        debug$1("close_tab", payload);
        chrome.tabs.remove(payload.tabId).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "get_window_tabs": {
        debug$1("get_window_tabs", payload);
        chrome.tabs.query({ windowId: payload.windowId }).then((tabs) => {
          sendResponse({ success: true, tabs });
        }).catch((error) => {
          sendResponse({ error: error instanceof Error ? error.message : String(error) });
        });
        return true;
      }
      case "capture_visible_tab": {
        debug$1("capture_visible_tab", payload);
        chrome.tabs.captureVisibleTab(payload?.windowId ?? void 0, {
          format: "jpeg",
          quality: 70
        }).then((dataUrl) => {
          sendResponse({ success: true, dataUrl });
        }).catch((error) => {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        });
        return true;
      }
      default:
        sendResponse({ error: `Unknown action: ${action}` });
        return;
    }
  }
  const tabEventPorts = /* @__PURE__ */ new Set();
  function broadcastTabEvent(message) {
    for (const port of tabEventPorts) {
      port.postMessage(message);
    }
  }
  function setupTabEventsPort() {
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name !== "tab-events") return;
      debug$1("port connected", port.sender?.tab?.id ?? port.sender?.url);
      tabEventPorts.add(port);
      port.onDisconnect.addListener(() => {
        debug$1("port disconnected");
        tabEventPorts.delete(port);
      });
    });
    chrome.tabs.onCreated.addListener((tab) => {
      broadcastTabEvent({ action: "created", payload: { tab } });
    });
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      broadcastTabEvent({ action: "removed", payload: { tabId, removeInfo } });
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      broadcastTabEvent({ action: "updated", payload: { tabId, changeInfo, tab } });
    });
  }
  const PREFIX = "[cdp]";
  const debug = console.debug.bind(console, `\x1B[90m${PREFIX}\x1B[0m`);
  const warn = console.warn.bind(console, `\x1B[33m${PREFIX}\x1B[0m`);
  const RESTRICTED_URL_RE = /^(chrome|chrome-extension|about|edge|brave|opera|vivaldi|devtools):\/\//;
  const IS_BACKGROUND = typeof window === "undefined";
  const CTX = IS_BACKGROUND ? "bg" : "remote";
  const attachedTabs = /* @__PURE__ */ new Set();
  const leaseRefs = /* @__PURE__ */ new Map();
  const ambientPins = /* @__PURE__ */ new Set();
  const externallyOwnedTabs = /* @__PURE__ */ new Set();
  const eventListeners = /* @__PURE__ */ new Set();
  let onDetachInstalled = false;
  let onEventInstalled = false;
  function ensureOnDetachInstalled() {
    if (onDetachInstalled) return;
    onDetachInstalled = true;
    chrome.debugger.onDetach.addListener((source, reason) => {
      if (source.tabId != null) {
        debug(`[${CTX}] external detach tab=${source.tabId} reason=${reason}`);
        attachedTabs.delete(source.tabId);
        leaseRefs.delete(source.tabId);
        ambientPins.delete(source.tabId);
        externallyOwnedTabs.delete(source.tabId);
      }
    });
  }
  function ensureOnEventInstalled() {
    if (onEventInstalled) return;
    onEventInstalled = true;
    chrome.debugger.onEvent.addListener((source, method, params) => {
      for (const listener of [...eventListeners]) {
        try {
          listener(source, method, params);
        } catch (err) {
          debug(`[${CTX}] event listener threw`, err);
        }
      }
    });
  }
  async function tryReuseExistingAttach(tabId, attachError) {
    if (!attachError.includes("Another debugger is already attached")) return false;
    try {
      await chrome.debugger.sendCommand({ tabId }, "Runtime.enable");
      attachedTabs.add(tabId);
      externallyOwnedTabs.add(tabId);
      debug(`[${CTX}] reused cross-context attach tab=${tabId}`);
      return true;
    } catch {
      return false;
    }
  }
  async function physicalAttach(tabId) {
    ensureOnDetachInstalled();
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) throw new Error(`Tab ${tabId} no longer exists`);
    if (tab.url && RESTRICTED_URL_RE.test(tab.url)) {
      throw new Error(`Cannot attach debugger to restricted page: ${tab.url}`);
    }
    try {
      await chrome.debugger.attach({ tabId }, "1.3");
      attachedTabs.add(tabId);
      externallyOwnedTabs.delete(tabId);
      debug(`[${CTX}] attached tab=${tabId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("Already attached")) {
        attachedTabs.add(tabId);
        debug(`[${CTX}] reused same-context attach tab=${tabId}`);
        return;
      }
      if (await tryReuseExistingAttach(tabId, msg)) return;
      throw new Error(`Failed to attach debugger to tab ${tabId}: ${msg}`);
    }
  }
  async function physicalDetach(tabId) {
    if (!attachedTabs.has(tabId)) return;
    attachedTabs.delete(tabId);
    try {
      await chrome.debugger.detach({ tabId });
      debug(`[${CTX}] detached tab=${tabId}`);
    } catch {
    }
  }
  async function tryPhysicalDetach(tabId) {
    if (ambientPins.has(tabId)) return;
    if ((leaseRefs.get(tabId) ?? 0) > 0) return;
    if (externallyOwnedTabs.has(tabId)) return;
    await physicalDetach(tabId);
  }
  async function acquireCdpTab(tabId) {
    const next = (leaseRefs.get(tabId) ?? 0) + 1;
    leaseRefs.set(tabId, next);
    if (!attachedTabs.has(tabId)) {
      try {
        await physicalAttach(tabId);
      } catch (err) {
        if (next === 1) leaseRefs.delete(tabId);
        else leaseRefs.set(tabId, next - 1);
        throw err;
      }
    }
    debug(`[${CTX}] acquire tab=${tabId} leases=${next}`);
  }
  async function releaseCdpTab(tabId) {
    const cur = leaseRefs.get(tabId) ?? 0;
    if (cur <= 0) {
      debug(`[${CTX}] release tab=${tabId} ignored (no lease)`);
      return;
    }
    const next = cur - 1;
    if (next === 0) leaseRefs.delete(tabId);
    else leaseRefs.set(tabId, next);
    debug(`[${CTX}] release tab=${tabId} leases=${next}`);
    await tryPhysicalDetach(tabId);
  }
  async function ensureCdpAttachedLocal(tabId, pinOnAttach = false) {
    if (!attachedTabs.has(tabId)) {
      await physicalAttach(tabId);
    }
    if (pinOnAttach) ambientPins.add(tabId);
  }
  async function cdpSendLocal(tabId, method, params, options) {
    await ensureCdpAttachedLocal(tabId, options?.pin !== false);
    return chrome.debugger.sendCommand({ tabId }, method, params);
  }
  async function callBackgroundProxy(payload) {
    let res;
    try {
      res = await chrome.runtime.sendMessage({
        type: "CDP_PROXY",
        ...payload
      });
    } catch (err) {
      throw new Error(
        `CDP proxy: background unreachable (${err instanceof Error ? err.message : String(err)})`
      );
    }
    if (!res) throw new Error("CDP proxy: empty response from background");
    if (res.error) throw new Error(res.error);
    return res.result;
  }
  async function cdpSendRemote(tabId, method, params, options) {
    const start = performance.now();
    try {
      const result2 = await callBackgroundProxy({
        action: "send",
        tabId,
        method,
        params,
        pin: options?.pin
      });
      const dur = performance.now() - start | 0;
      if (dur > 500) debug(`[${CTX}] ← ${method} tab=${tabId} (${dur}ms slow)`);
      return result2;
    } catch (err) {
      warn(`[${CTX}] ✗ ${method} tab=${tabId}: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }
  async function cdpDetachRemote(tabId) {
    debug(`[${CTX}] → detach tab=${tabId}`);
    await callBackgroundProxy({ action: "detach", tabId });
  }
  function addCdpEventListenerRemote(_listener) {
    warn(`[${CTX}] addCdpEventListener is background-only; ignored in this context`);
    return () => {
    };
  }
  function addCdpEventListenerLocal(listener) {
    ensureOnEventInstalled();
    eventListeners.add(listener);
    return () => eventListeners.delete(listener);
  }
  async function handleCdpProxyMessage(message) {
    if (!IS_BACKGROUND) {
      return { error: "handleCdpProxyMessage must run in background" };
    }
    const { action, tabId, method, params, pin } = message;
    if (typeof tabId !== "number") return { error: "CDP_PROXY: tabId is required" };
    try {
      switch (action) {
        case "attach":
          debug(`[${CTX}] ← attach tab=${tabId}`);
          await acquireCdpTab(tabId);
          return { ok: true, result: null };
        case "detach":
          debug(`[${CTX}] ← detach tab=${tabId}`);
          await releaseCdpTab(tabId);
          return { ok: true, result: null };
        case "send": {
          if (!method) return { error: "CDP_PROXY: method is required for send" };
          const start = performance.now();
          const result2 = await cdpSendLocal(tabId, method, params, { pin });
          const dur = performance.now() - start | 0;
          if (dur > 500) debug(`[${CTX}] ← ${method} tab=${tabId} (${dur}ms slow)`);
          return { ok: true, result: result2 };
        }
        default:
          return { error: `CDP_PROXY: unknown action "${action}"` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warn(`[${CTX}] ✗ ${action}${method ? " " + method : ""} tab=${tabId}: ${msg}`);
      return { error: msg };
    }
  }
  const cdpSend = IS_BACKGROUND ? cdpSendLocal : cdpSendRemote;
  const cdpAcquire = IS_BACKGROUND ? acquireCdpTab : async (tabId) => {
    debug(`[${CTX}] → acquire tab=${tabId}`);
    await callBackgroundProxy({ action: "attach", tabId });
  };
  const cdpRelease = IS_BACKGROUND ? releaseCdpTab : cdpDetachRemote;
  const addCdpEventListener = IS_BACKGROUND ? addCdpEventListenerLocal : addCdpEventListenerRemote;
  const DEFAULT_EVAL_TIMEOUT_MS = 6e4;
  function wrapScriptForEval(rawScript, opts) {
    const withoutLeadingComments = rawScript.replace(/^(?:\s*\/\/[^\n]*\n)+/, "");
    const trimmed = withoutLeadingComments.trim();
    const looksLikeIife = trimmed.startsWith("(") && /\)\s*\(\s*\)\s*;?\s*$/.test(trimmed) && isBalancedParens(trimmed);
    const inner = looksLikeIife ? `(async () => { return await ${trimmed.replace(/;\s*$/, "")}; })()` : `(async () => { ${rawScript} })()`;
    const timeoutMs = DEFAULT_EVAL_TIMEOUT_MS;
    return `Promise.race([
		${inner},
		new Promise((_, rej) => setTimeout(() => rej(new Error(
			'execute_javascript timed out after ${timeoutMs}ms. ' +
			'Common causes: a pending await that never resolves (e.g. window.__pagenter.kv bridge not ready on this page, ' +
			'fetch that never returns, waiting on an event that did not fire). ' +
			'Try a shorter script, add an explicit timeout, or check that the page is ready.'
		)), ${timeoutMs}))
	])`;
  }
  function isBalancedParens(s) {
    let depth = 0;
    let inStr = null;
    let inTpl = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      const prev = i > 0 ? s[i - 1] : "";
      if (inStr) {
        if (c === "\\") {
          i++;
          continue;
        }
        if (c === inStr) inStr = null;
        continue;
      }
      if (inTpl) {
        if (c === "\\") {
          i++;
          continue;
        }
        if (c === "`") inTpl = false;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = c;
        continue;
      }
      if (c === "`") {
        inTpl = true;
        continue;
      }
      if (c === "/" && prev !== "\\" && s[i + 1] === "/") {
        const nl = s.indexOf("\n", i);
        i = nl === -1 ? s.length : nl;
        continue;
      }
      if (c === "/" && s[i + 1] === "*") {
        const end = s.indexOf("*/", i + 2);
        i = end === -1 ? s.length : end + 1;
        continue;
      }
      if (c === "(") depth++;
      else if (c === ")") {
        depth--;
        if (depth < 0) return false;
      }
    }
    return depth === 0;
  }
  const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
  let idbProxyableTypes;
  let cursorAdvanceMethods;
  function getIdbProxyableTypes() {
    return idbProxyableTypes || (idbProxyableTypes = [
      IDBDatabase,
      IDBObjectStore,
      IDBIndex,
      IDBCursor,
      IDBTransaction
    ]);
  }
  function getCursorAdvanceMethods() {
    return cursorAdvanceMethods || (cursorAdvanceMethods = [
      IDBCursor.prototype.advance,
      IDBCursor.prototype.continue,
      IDBCursor.prototype.continuePrimaryKey
    ]);
  }
  const transactionDoneMap = /* @__PURE__ */ new WeakMap();
  const transformCache = /* @__PURE__ */ new WeakMap();
  const reverseTransformCache = /* @__PURE__ */ new WeakMap();
  function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
      const unlisten = () => {
        request.removeEventListener("success", success);
        request.removeEventListener("error", error);
      };
      const success = () => {
        resolve(wrap(request.result));
        unlisten();
      };
      const error = () => {
        reject(request.error);
        unlisten();
      };
      request.addEventListener("success", success);
      request.addEventListener("error", error);
    });
    reverseTransformCache.set(promise, request);
    return promise;
  }
  function cacheDonePromiseForTransaction(tx) {
    if (transactionDoneMap.has(tx))
      return;
    const done = new Promise((resolve, reject) => {
      const unlisten = () => {
        tx.removeEventListener("complete", complete);
        tx.removeEventListener("error", error);
        tx.removeEventListener("abort", error);
      };
      const complete = () => {
        resolve();
        unlisten();
      };
      const error = () => {
        reject(tx.error || new DOMException("AbortError", "AbortError"));
        unlisten();
      };
      tx.addEventListener("complete", complete);
      tx.addEventListener("error", error);
      tx.addEventListener("abort", error);
    });
    transactionDoneMap.set(tx, done);
  }
  let idbProxyTraps = {
    get(target, prop, receiver) {
      if (target instanceof IDBTransaction) {
        if (prop === "done")
          return transactionDoneMap.get(target);
        if (prop === "store") {
          return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
        }
      }
      return wrap(target[prop]);
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has(target, prop) {
      if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
        return true;
      }
      return prop in target;
    }
  };
  function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
  }
  function wrapFunction(func) {
    if (getCursorAdvanceMethods().includes(func)) {
      return function(...args) {
        func.apply(unwrap(this), args);
        return wrap(this.request);
      };
    }
    return function(...args) {
      return wrap(func.apply(unwrap(this), args));
    };
  }
  function transformCachableValue(value) {
    if (typeof value === "function")
      return wrapFunction(value);
    if (value instanceof IDBTransaction)
      cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
      return new Proxy(value, idbProxyTraps);
    return value;
  }
  function wrap(value) {
    if (value instanceof IDBRequest)
      return promisifyRequest(value);
    if (transformCache.has(value))
      return transformCache.get(value);
    const newValue = transformCachableValue(value);
    if (newValue !== value) {
      transformCache.set(value, newValue);
      reverseTransformCache.set(newValue, value);
    }
    return newValue;
  }
  const unwrap = (value) => reverseTransformCache.get(value);
  function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name, version);
    const openPromise = wrap(request);
    if (upgrade) {
      request.addEventListener("upgradeneeded", (event) => {
        upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
      });
    }
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion,
        event.newVersion,
        event
      ));
    }
    openPromise.then((db2) => {
      if (terminated)
        db2.addEventListener("close", () => terminated());
      if (blocking) {
        db2.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
      }
    }).catch(() => {
    });
    return openPromise;
  }
  const readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
  const writeMethods = ["put", "add", "delete", "clear"];
  const cachedMethods = /* @__PURE__ */ new Map();
  function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
      return;
    }
    if (cachedMethods.get(prop))
      return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, "");
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
      // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
      !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
    ) {
      return;
    }
    const method = async function(storeName, ...args) {
      const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
      let target2 = tx.store;
      if (useIndex)
        target2 = target2.index(args.shift());
      return (await Promise.all([
        target2[targetFuncName](...args),
        isWrite && tx.done
      ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
  }
  replaceTraps((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
  }));
  const advanceMethodProps = ["continue", "continuePrimaryKey", "advance"];
  const methodMap = {};
  const advanceResults = /* @__PURE__ */ new WeakMap();
  const ittrProxiedCursorToOriginalProxy = /* @__PURE__ */ new WeakMap();
  const cursorIteratorTraps = {
    get(target, prop) {
      if (!advanceMethodProps.includes(prop))
        return target[prop];
      let cachedFunc = methodMap[prop];
      if (!cachedFunc) {
        cachedFunc = methodMap[prop] = function(...args) {
          advanceResults.set(this, ittrProxiedCursorToOriginalProxy.get(this)[prop](...args));
        };
      }
      return cachedFunc;
    }
  };
  async function* iterate(...args) {
    let cursor = this;
    if (!(cursor instanceof IDBCursor)) {
      cursor = await cursor.openCursor(...args);
    }
    if (!cursor)
      return;
    cursor = cursor;
    const proxiedCursor = new Proxy(cursor, cursorIteratorTraps);
    ittrProxiedCursorToOriginalProxy.set(proxiedCursor, cursor);
    reverseTransformCache.set(proxiedCursor, unwrap(cursor));
    while (cursor) {
      yield proxiedCursor;
      cursor = await (advanceResults.get(proxiedCursor) || cursor.continue());
      advanceResults.delete(proxiedCursor);
    }
  }
  function isIteratorProp(target, prop) {
    return prop === Symbol.asyncIterator && instanceOfAny(target, [IDBIndex, IDBObjectStore, IDBCursor]) || prop === "iterate" && instanceOfAny(target, [IDBIndex, IDBObjectStore]);
  }
  replaceTraps((oldTraps) => ({
    ...oldTraps,
    get(target, prop, receiver) {
      if (isIteratorProp(target, prop))
        return iterate;
      return oldTraps.get(target, prop, receiver);
    },
    has(target, prop) {
      return isIteratorProp(target, prop) || oldTraps.has(target, prop);
    }
  }));
  const REGEX_SPECIAL = ".+?^${}()|[]";
  function escapeForRegex(ch) {
    if (REGEX_SPECIAL.includes(ch) || ch === String.fromCharCode(92)) {
      return String.fromCharCode(92) + ch;
    }
    return ch;
  }
  function matchUrl(pattern, url) {
    if (!pattern || !url) return false;
    pattern = pattern.trim();
    if (pattern === "<all_urls>") {
      return /^https?:\/\//.test(url);
    }
    let regexStr = "";
    for (const ch of pattern) {
      if (ch === "*") {
        regexStr += ".*";
      } else {
        regexStr += escapeForRegex(ch);
      }
    }
    try {
      const re = new RegExp("^" + regexStr + "$", "i");
      return re.test(url);
    } catch {
      return false;
    }
  }
  const DB_NAME = "page-agent-ext";
  const DB_VERSION = 4;
  let dbPromise = null;
  function getDB() {
    if (!dbPromise) {
      dbPromise = openDB(DB_NAME, DB_VERSION, {
        blocked(currentVersion, blockedVersion) {
          console.warn(
            `[db] open(v${blockedVersion}) is BLOCKED by an existing connection holding v${currentVersion}. Close other tabs / reload sidepanel.`
          );
        },
        blocking(currentVersion, blockedVersion, event) {
          console.warn(
            `[db] our connection (v${currentVersion}) is BLOCKING an upgrade to v${blockedVersion}. Releasing now.`
          );
          const conn = event.target;
          conn?.result?.close();
          dbPromise = null;
        },
        terminated() {
          console.warn("[db] connection terminated unexpectedly. Will reopen on next access.");
          dbPromise = null;
        },
        upgrade(db2, oldVersion, newVersion) {
          console.log(`[db] upgrading from v${oldVersion} to v${newVersion}`);
          if (!db2.objectStoreNames.contains("sessions")) {
            const sessionStore = db2.createObjectStore("sessions", { keyPath: "id" });
            sessionStore.createIndex("by-created", "createdAt");
          }
          if (!db2.objectStoreNames.contains("tipscripts")) {
            const store = db2.createObjectStore("tipscripts", { keyPath: "id" });
            store.createIndex("by-updated", "updatedAt");
            store.createIndex("by-enabled", "enabled");
          }
          if (!db2.objectStoreNames.contains("sniff_projects")) {
            const s = db2.createObjectStore("sniff_projects", { keyPath: "id" });
            s.createIndex("by-updated", "updatedAt");
            s.createIndex("by-status", "status");
          }
          if (!db2.objectStoreNames.contains("sniff_apis")) {
            const s = db2.createObjectStore("sniff_apis", { keyPath: "id" });
            s.createIndex("by-project", "projectId");
            s.createIndex("by-updated", "lastSeenAt");
            s.createIndex("by-exposed", "exposed");
          }
          if (!db2.objectStoreNames.contains("sniff_samples")) {
            const s = db2.createObjectStore("sniff_samples", { keyPath: "id" });
            s.createIndex("by-api", "apiId");
            s.createIndex("by-project", "projectId");
            s.createIndex("by-timestamp", "timestamp");
          }
          if (!db2.objectStoreNames.contains("sniff_specs")) {
            const s = db2.createObjectStore("sniff_specs", { keyPath: "id" });
            s.createIndex("by-api", "apiId");
          }
          if (!db2.objectStoreNames.contains("sniff_annotations")) {
            const s = db2.createObjectStore("sniff_annotations", { keyPath: "id" });
            s.createIndex("by-spec", "specId");
            s.createIndex("by-api", "apiId");
          }
          if (!db2.objectStoreNames.contains("upstream_mcp_servers")) {
            const s = db2.createObjectStore("upstream_mcp_servers", { keyPath: "id" });
            s.createIndex("by-updated", "updatedAt");
            s.createIndex("by-name", "name", { unique: true });
          }
          if (!db2.objectStoreNames.contains("pagenter_kv")) {
            const s = db2.createObjectStore("pagenter_kv", { keyPath: "id" });
            s.createIndex("by-session", "sessionId");
          }
          console.log(`[db] upgrade complete, current stores:`, [...db2.objectStoreNames]);
        }
      });
      dbPromise = Promise.race([
        dbPromise,
        new Promise(
          (_, reject) => setTimeout(() => {
            reject(
              new Error(
                "[db] openDB timed out after 8s. The IndexedDB upgrade may be blocked by another tab/connection. Close other extension contexts and reload."
              )
            );
          }, 8e3)
        )
      ]).catch((err) => {
        dbPromise = null;
        throw err;
      });
    }
    return dbPromise;
  }
  async function listSessions() {
    const db2 = await getDB();
    const all = await db2.getAllFromIndex("sessions", "by-created");
    return all.reverse();
  }
  async function listTipScripts() {
    const db2 = await getDB();
    const all = await db2.getAllFromIndex("tipscripts", "by-updated");
    return all.reverse();
  }
  async function getMatchingTipScripts(url) {
    const all = await listTipScripts();
    return all.filter((mz) => mz.enabled && mz.urlPatterns.some((p) => matchUrl(p, url)));
  }
  const db = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    getDB,
    getMatchingTipScripts,
    listSessions,
    listTipScripts
  }, Symbol.toStringTag, { value: "Module" }));
  async function getProject(id) {
    const db2 = await getDB();
    return db2.get("sniff_projects", id);
  }
  async function listProjects() {
    const db2 = await getDB();
    const all = await db2.getAllFromIndex("sniff_projects", "by-updated");
    return all.reverse();
  }
  async function updateProject(id, patch) {
    const db2 = await getDB();
    const existing = await db2.get("sniff_projects", id);
    if (!existing) throw new Error(`Project ${id} not found`);
    const next = { ...existing, ...patch, updatedAt: Date.now() };
    await db2.put("sniff_projects", next);
    return next;
  }
  async function upsertApi(projectId, method, urlPattern, urlPatternTokens) {
    const db2 = await getDB();
    const apis = await db2.getAllFromIndex("sniff_apis", "by-project", projectId);
    const hit = apis.find((a) => a.method === method && a.urlPattern === urlPattern);
    if (hit) return hit;
    const now = Date.now();
    const record = {
      id: crypto.randomUUID(),
      projectId,
      method,
      urlPattern,
      urlPatternTokens,
      sampleCount: 0,
      firstSeenAt: now,
      lastSeenAt: now,
      exposed: false
    };
    await db2.put("sniff_apis", record);
    return record;
  }
  async function listApisByProject(projectId) {
    const db2 = await getDB();
    const apis = await db2.getAllFromIndex("sniff_apis", "by-project", projectId);
    return apis.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  }
  async function listSpecsByApi(apiId) {
    const db2 = await getDB();
    const specs = await db2.getAllFromIndex("sniff_specs", "by-api", apiId);
    return specs.sort((a, b) => a.version - b.version);
  }
  async function getLatestSpecByApi(apiId) {
    const specs = await listSpecsByApi(apiId);
    return specs.at(-1);
  }
  async function getUpstreamMcpServerByName(name) {
    const db2 = await getDB();
    return db2.getFromIndex("upstream_mcp_servers", "by-name", name);
  }
  const BUILT_IN_RULES = [
    // ---- 认证类（字段名）----
    {
      id: "auth_key_secret",
      label: "password/secret field",
      scope: "key",
      // 命中字段名包含 password, passwd, pwd, secret
      keyPattern: /\b(password|passwd|pwd|secret|apikey|api[_-]?key)\b/i,
      strategy: "full",
      defaultEnabled: true
    },
    {
      id: "auth_token",
      label: "token/session field",
      scope: "key",
      // 命中 token, sessionid, accesstoken 等
      keyPattern: /\b(token|access[_-]?token|refresh[_-]?token|session[_-]?id|jwt|bearer)\b/i,
      strategy: "full",
      defaultEnabled: true
    },
    {
      id: "auth_authorization_header",
      label: "Authorization / Cookie header",
      scope: "key",
      keyPattern: /^(authorization|cookie|set-cookie|x-csrf-token)$/i,
      strategy: "full",
      defaultEnabled: true
    },
    // ---- 身份类（值正则）----
    {
      id: "email",
      label: "email address",
      scope: "value",
      // 基础 email 正则（不追求 RFC 完备）
      valuePattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
      strategy: "partial",
      defaultEnabled: true
    },
    {
      id: "cn_phone",
      label: "CN mobile phone",
      scope: "value",
      // 中国大陆手机号：1 开头 11 位
      valuePattern: new RegExp("(?<!\\d)(1[3-9]\\d{9})(?!\\d)", "g"),
      strategy: "partial",
      defaultEnabled: true
    },
    {
      id: "cn_id_card",
      label: "CN ID card 18",
      scope: "value",
      // 18 位身份证（不校验效验位，只要格式）
      valuePattern: new RegExp("(?<!\\d)(\\d{17}[\\dXx])(?![\\dXx])", "g"),
      strategy: "partial",
      defaultEnabled: true
    },
    {
      id: "bank_card",
      label: "bank card 13-19",
      scope: "value",
      // 13~19 位连续数字（银行卡范围），需独立成段避免误伤
      valuePattern: new RegExp("(?<!\\d)(\\d{13,19})(?!\\d)", "g"),
      strategy: "partial",
      defaultEnabled: true
    },
    // ---- 地址/IP 类 ----
    {
      id: "ipv4",
      label: "IPv4 address",
      scope: "value",
      valuePattern: new RegExp("(?<![\\d.])((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)(?![\\d.])", "g"),
      strategy: "partial",
      defaultEnabled: false
    }
  ];
  function scrubValue(value, options = {}) {
    const rules = resolveRules(options);
    return recurse(value, null, rules);
  }
  function scrubHeaders(headers, options = {}) {
    const rules = resolveRules(options);
    const out = {};
    for (const [k, v] of Object.entries(headers)) {
      const keyHit = rules.find(
        (r) => (r.scope === "key" || r.scope === "both") && r.keyPattern?.test(k)
      );
      if (keyHit) {
        out[k] = applyFullReplace(v, keyHit);
        continue;
      }
      out[k] = applyValueRules(v, rules);
    }
    return out;
  }
  function resolveRules(options) {
    const enabledIds = options.enabledRuleIds;
    const base = enabledIds ? BUILT_IN_RULES.filter((r) => enabledIds.includes(r.id)) : BUILT_IN_RULES.filter((r) => r.defaultEnabled);
    const custom = options.customRules ?? [];
    return [...base, ...custom];
  }
  function recurse(value, currentKey, rules) {
    if (value === null || value === void 0) return value;
    if (typeof value === "object" && !Array.isArray(value)) {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        const keyHit = rules.find(
          (r) => (r.scope === "key" || r.scope === "both") && r.keyPattern?.test(k)
        );
        if (keyHit) {
          out[k] = redactBySchema(v, keyHit);
          continue;
        }
        out[k] = recurse(v, k, rules);
      }
      return out;
    }
    if (Array.isArray(value)) {
      return value.map((el) => recurse(el, currentKey, rules));
    }
    if (typeof value === "string") {
      return applyValueRules(value, rules);
    }
    return value;
  }
  function redactBySchema(value, rule) {
    if (value === null || value === void 0) return value;
    if (Array.isArray(value)) return value.map((v) => redactBySchema(v, rule));
    if (typeof value === "object") {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = redactBySchema(v, rule);
      }
      return out;
    }
    return applyFullReplace(value, rule);
  }
  function applyFullReplace(value, rule) {
    if (rule.strategy === "hash") {
      return `[REDACTED:${rule.id}:${shortHash(toDebugString(value))}]`;
    }
    return `[REDACTED:${rule.id}]`;
  }
  function toDebugString(v) {
    if (v === null) return "null";
    if (v === void 0) return "undefined";
    if (typeof v === "object") return JSON.stringify(v);
    if (typeof v === "string") return v;
    return v.toString();
  }
  function applyValueRules(value, rules) {
    let out = value;
    for (const rule of rules) {
      if (rule.scope !== "value" && rule.scope !== "both") continue;
      if (!rule.valuePattern) continue;
      const pattern = new RegExp(rule.valuePattern.source, rule.valuePattern.flags);
      out = out.replace(pattern, (match) => {
        if (rule.strategy === "hash") {
          return `[REDACTED:${rule.id}:${shortHash(match)}]`;
        }
        if (rule.strategy === "partial") {
          return partialMask(match);
        }
        return `[REDACTED:${rule.id}]`;
      });
    }
    return out;
  }
  function partialMask(s) {
    if (s.length <= 2) return "*".repeat(s.length);
    const first = s[0];
    const last = s.at(-1) ?? "";
    return `${first}${"*".repeat(s.length - 2)}${last}`;
  }
  function shortHash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = h * 33 + (s.codePointAt(i) ?? 0) >>> 0;
    }
    return h.toString(16).slice(0, 8);
  }
  const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const RE_OBJECT_ID = /^[0-9a-f]{24}$/i;
  const RE_NUMERIC = /^\d+$/;
  const RE_LONG_HEX = /^[0-9a-f]{20,}$/i;
  const RE_DATE = /^(\d{4}-\d{2}-\d{2}|\d{8})$/;
  const RE_BASE64URL = /^[A-Za-z0-9_-]{20,}$/;
  function classifyPathSegment(seg) {
    if (!seg) return { isParam: false, token: "" };
    if (RE_UUID.test(seg)) {
      return { isParam: true, token: ":uuid", paramKind: "uuid" };
    }
    if (RE_OBJECT_ID.test(seg)) {
      return { isParam: true, token: ":objectId", paramKind: "objectId" };
    }
    if (RE_DATE.test(seg)) {
      return { isParam: true, token: ":date", paramKind: "date" };
    }
    if (RE_NUMERIC.test(seg)) {
      return { isParam: true, token: ":id", paramKind: "id" };
    }
    if (RE_LONG_HEX.test(seg)) {
      return { isParam: true, token: ":hash", paramKind: "hash" };
    }
    if (RE_BASE64URL.test(seg) && /[A-Za-z]/.test(seg) && /\d/.test(seg)) {
      return { isParam: true, token: ":token", paramKind: "token" };
    }
    return { isParam: false, token: seg };
  }
  function normalizeUrl(rawUrl, method) {
    const u = new URL(rawUrl);
    const segments = u.pathname.split("/");
    const tokens = [];
    for (const seg of segments) {
      const cls = classifyPathSegment(seg);
      tokens.push(cls.token);
    }
    const urlPattern = tokens.join("/");
    const queryKeys = Array.from(new Set(u.searchParams.keys())).sort((a, b) => a.localeCompare(b));
    return {
      method: method.toUpperCase(),
      urlPattern,
      // tokens 里保留的空串是为了无损拼回 pattern，这里过滤掉仅用于展示的版本
      urlPatternTokens: tokens.filter((t) => t !== ""),
      origin: u.origin,
      queryKeys
    };
  }
  class NetworkRecorder {
    onSample;
    // tabId → 绑定的项目 / 监听器
    bindings = /* @__PURE__ */ new Map();
    // 全局请求聚合表（key = `${tabId}|${requestId}`）
    pending = /* @__PURE__ */ new Map();
    // 全局 CDP 事件 listener（所有 tab 共用一个，内部按 tabId 过滤）
    cdpOff = null;
    constructor(opts) {
      this.onSample = opts.onSample;
    }
    // -----------------------------------------------------------------------
    // 启停
    // -----------------------------------------------------------------------
    /** 开始录制指定 tab，绑定到给定项目 */
    async start(tabId, project) {
      const existing = this.bindings.get(tabId);
      if (existing) {
        existing.project = project;
        return;
      }
      await cdpAcquire(tabId);
      try {
        await cdpSend(
          tabId,
          "Network.enable",
          {
            maxResourceBufferSize: project.config.maxBodyKB * 1024 * 4,
            maxTotalBufferSize: project.config.maxBodyKB * 1024 * 16
          },
          { pin: false }
        );
      } catch (err) {
        await cdpRelease(tabId).catch(() => {
        });
        throw err;
      }
      this.ensureGlobalListener();
      const binding = {
        project,
        tabId,
        // detach 时会在 stop 里清理，占位一个 noop
        detachListener: () => {
        }
      };
      this.bindings.set(tabId, binding);
    }
    /** 停止录制指定 tab，detach 并清理状态 */
    async stop(tabId) {
      const binding = this.bindings.get(tabId);
      if (!binding) return;
      try {
        await cdpSend(tabId, "Network.disable", void 0, { pin: false });
      } catch {
      }
      await cdpRelease(tabId);
      this.bindings.delete(tabId);
      for (const key of [...this.pending.keys()]) {
        if (key.startsWith(`${tabId}|`)) this.pending.delete(key);
      }
      if (this.bindings.size === 0 && this.cdpOff) {
        this.cdpOff();
        this.cdpOff = null;
      }
    }
    /** 停止所有 tab 的录制 */
    async stopAll() {
      for (const tabId of [...this.bindings.keys()]) {
        await this.stop(tabId);
      }
    }
    // -----------------------------------------------------------------------
    // CDP 事件处理
    // -----------------------------------------------------------------------
    /** 启动时懒加载全局 listener */
    ensureGlobalListener() {
      if (this.cdpOff) return;
      const handler = (source, method, params) => {
        if (source.tabId == null) return;
        if (!this.bindings.has(source.tabId)) return;
        this.dispatchCdpEvent(source.tabId, method, params);
      };
      this.cdpOff = addCdpEventListener(handler);
    }
    /** 分发 CDP 事件到具体处理器 */
    dispatchCdpEvent(tabId, method, params) {
      switch (method) {
        case "Network.requestWillBeSent":
          this.onRequestWillBeSent(tabId, params);
          break;
        case "Network.responseReceived":
          this.onResponseReceived(tabId, params);
          break;
        case "Network.loadingFinished":
          this.onLoadingFinished(tabId, params);
          break;
        case "Network.loadingFailed":
          this.onLoadingFailed(tabId, params);
          break;
      }
    }
    /** 请求即将发送：建立 pending 记录 */
    onRequestWillBeSent(tabId, p) {
      const rec = {
        requestId: p.requestId,
        tabId,
        // wallTime 单位是秒（unix 时间），转成 ms
        startWallMs: Math.round(p.wallTime * 1e3),
        startMonoSec: p.timestamp,
        request: p.request,
        resourceType: p.type ?? "Other",
        initiatorStack: p.initiator?.stack?.callFrames?.slice(0, 10).map((f) => ({
          functionName: f.functionName,
          url: f.url,
          lineNumber: f.lineNumber
        }))
      };
      this.pending.set(keyOf(tabId, p.requestId), rec);
    }
    /** 收到响应头：把 response 挂进 pending */
    onResponseReceived(tabId, p) {
      const rec = this.pending.get(keyOf(tabId, p.requestId));
      if (!rec) return;
      rec.response = p.response;
    }
    /**
     * 请求完成：拿 body、组装 SniffSample、触发回调
     */
    async onLoadingFinished(tabId, p) {
      const key = keyOf(tabId, p.requestId);
      const rec = this.pending.get(key);
      if (!rec) return;
      this.pending.delete(key);
      const binding = this.bindings.get(tabId);
      if (!binding) return;
      const project = binding.project;
      if (!rec.response) return;
      if (shouldSkip(rec, project)) return;
      let resBody = null;
      try {
        const raw = await cdpSend(
          tabId,
          "Network.getResponseBody",
          { requestId: p.requestId }
        );
        resBody = toBodyBlob(raw.body, raw.base64Encoded, rec.response.mimeType, project.config);
      } catch {
        resBody = null;
      }
      let reqBodyRaw = rec.request.postData;
      if (!reqBodyRaw && rec.request.hasPostData) {
        try {
          const rb = await cdpSend(tabId, "Network.getRequestPostData", {
            requestId: p.requestId
          });
          reqBodyRaw = rb.postData;
        } catch {
          reqBodyRaw = void 0;
        }
      }
      const reqBody = reqBodyRaw ? toBodyBlob(
        reqBodyRaw,
        false,
        rec.request.headers["Content-Type"] ?? rec.request.headers["content-type"],
        project.config
      ) : null;
      const scrubOpts = project.config.enablePiiScrub ? void 0 : { enabledRuleIds: [] };
      const cleanReqHeaders = scrubHeaders(rec.request.headers, scrubOpts);
      const cleanResHeaders = scrubHeaders(rec.response.headers, scrubOpts);
      const cleanReqBody = reqBody ? { ...reqBody, data: scrubStringBody(reqBody, scrubOpts) } : null;
      const cleanResBody = resBody ? { ...resBody, data: scrubStringBody(resBody, scrubOpts) } : null;
      let normalized;
      try {
        normalized = normalizeUrl(rec.request.url, rec.request.method);
      } catch {
        return;
      }
      const api = await upsertApi(
        project.id,
        normalized.method,
        normalized.urlPattern,
        normalized.urlPatternTokens
      );
      const sample = {
        id: crypto.randomUUID(),
        apiId: api.id,
        projectId: project.id,
        tabId,
        url: rec.request.url,
        method: normalized.method,
        reqHeaders: cleanReqHeaders,
        reqBody: cleanReqBody,
        resStatus: rec.response.status,
        resStatusText: rec.response.statusText,
        resHeaders: cleanResHeaders,
        resBody: cleanResBody,
        // duration 用 monotonic 差值，精度更高
        durationMs: Math.max(0, Math.round((p.timestamp - rec.startMonoSec) * 1e3)),
        timestamp: rec.startWallMs,
        context: {
          // 这里没法直接拿 page url/title —— 留空，由上层补
          pageUrl: "",
          pageTitle: "",
          initiatorStack: rec.initiatorStack
        }
      };
      this.onSample(sample);
    }
    /** 请求失败：清理 pending；不产生样本 */
    onLoadingFailed(tabId, p) {
      this.pending.delete(keyOf(tabId, p.requestId));
    }
  }
  function keyOf(tabId, requestId) {
    return `${tabId}|${requestId}`;
  }
  function shouldSkip(rec, project) {
    const url = rec.request.url;
    for (const pat of project.config.excludeUrlPatterns) {
      if (pat && url.includes(pat)) return true;
    }
    const mime = rec.response?.mimeType ?? "";
    for (const pat of project.config.excludeMimePatterns) {
      if (pat && mime.startsWith(pat)) return true;
    }
    if (!project.config.captureStaticResources) {
      if (["Image", "Font", "Media", "Stylesheet", "Other"].includes(rec.resourceType)) return true;
    }
    return false;
  }
  function toBodyBlob(raw, base64Encoded, mimeType, config) {
    const maxBytes = config.maxBodyKB * 1024;
    const originalSize = base64Encoded ? Math.floor(raw.length * 3 / 4) : raw.length;
    if (originalSize > maxBytes) {
      return {
        encoding: base64Encoded ? "base64" : "utf8",
        data: raw.slice(0, maxBytes),
        mimeType,
        truncated: true,
        originalSize
      };
    }
    return {
      encoding: base64Encoded ? "base64" : "utf8",
      data: raw,
      mimeType,
      truncated: false,
      originalSize
    };
  }
  function scrubStringBody(body, options) {
    if (body.encoding === "base64") return body.data;
    try {
      const obj = JSON.parse(body.data);
      return JSON.stringify(scrubValue(obj, options));
    } catch {
      return JSON.stringify(scrubValue(body.data, options)).replace(/^"/, "").replace(/"$/, "");
    }
  }
  function extractOrigin(url) {
    if (!url) return null;
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  }
  function originMatches(origin, patterns) {
    if (patterns.length === 0) {
      console.warn("[Pagenter Bridge] project has empty originPatterns, allowing all origins");
      return true;
    }
    for (const p of patterns) {
      if (p === origin) return true;
      if (p.endsWith("*") && origin.startsWith(p.slice(0, -1))) return true;
    }
    return false;
  }
  async function findProjectByOrigin(origin) {
    const all = await listProjects();
    for (const p of all) {
      if (originMatches(origin, p.originPatterns)) return p;
    }
    return null;
  }
  async function handleApiList(sender, payload) {
    const origin = extractOrigin(sender.tab?.url);
    if (!origin) return { error: "No tab origin available" };
    const project = payload.projectId ? await listProjects().then((ps) => ps.find((p) => p.id === payload.projectId) ?? null) : await findProjectByOrigin(origin);
    if (!project) return { error: "No matching project for this origin" };
    if (!originMatches(origin, project.originPatterns)) {
      return { error: `Origin ${origin} is not allowed for project ${project.id}` };
    }
    const apis = await listApisByProject(project.id);
    const exposed = apis.filter((a) => a.exposed);
    const out = [];
    for (const a of exposed) {
      const spec = a.currentSpecId ? await getLatestSpecByApi(a.id) : null;
      out.push({
        projectId: project.id,
        apiId: a.id,
        toolName: a.toolName ?? a.id,
        displayName: a.displayName,
        description: a.description,
        method: a.method,
        urlPattern: a.urlPattern,
        inputSchema: spec?.inputSchema ?? null,
        outputSchema: spec?.outputSchema ?? null
      });
    }
    return { data: out };
  }
  async function handleApiCall(sender, payload) {
    const origin = extractOrigin(sender.tab?.url);
    if (!origin) return { error: "No tab origin available" };
    const project = await findProjectByOrigin(origin);
    if (!project) return { error: "No matching project for this origin" };
    return callApiByProjectAndTool(project.id, payload.toolName, payload.args ?? {});
  }
  async function callApiByProjectAndTool(projectId, toolName, args) {
    const project = await listProjects().then((ps) => ps.find((p) => p.id === projectId) ?? null);
    if (!project) return { error: `Project ${projectId} not found` };
    const apis = await listApisByProject(project.id);
    const api = apis.find((a) => a.exposed && (a.toolName === toolName || a.id === toolName));
    if (!api) return { error: `API "${toolName}" not found or not exposed` };
    const spec = api.currentSpecId ? await getLatestSpecByApi(api.id) : null;
    try {
      const { url, method, body, headers } = buildRequest(api, spec ?? null, project, args);
      const res = await fetch(url, {
        method,
        headers,
        body,
        credentials: "include"
      });
      const text = await res.text();
      let parsed = text;
      try {
        parsed = JSON.parse(text);
      } catch {
      }
      return {
        data: {
          status: res.status,
          ok: res.ok,
          body: parsed
        }
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
  function stringifyScalar(v) {
    if (v === null || v === void 0) return "";
    if (typeof v === "object") return JSON.stringify(v);
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "bigint") return v.toString();
    if (typeof v === "boolean") return v ? "true" : "false";
    return JSON.stringify(v) ?? "";
  }
  function fillPath(pattern, args) {
    const consumed = /* @__PURE__ */ new Set();
    const pathFilled = pattern.replaceAll(/:(\w+)/g, (_, name) => {
      const v = args[name];
      if (v === void 0 || v === null) return `:${name}`;
      consumed.add(name);
      return encodeURIComponent(stringifyScalar(v));
    });
    return { pathFilled, consumed };
  }
  function appendQuery(url, rest) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(rest)) {
      if (v === null || v === void 0) continue;
      qs.append(k, stringifyScalar(v));
    }
    const q = qs.toString();
    if (!q) return url;
    return url + (url.includes("?") ? "&" : "?") + q;
  }
  function buildRequest(api, _spec, project, args) {
    const base = project.originPatterns[0] ?? "";
    const { pathFilled, consumed } = fillPath(api.urlPattern, args);
    const rest = {};
    for (const [k, v] of Object.entries(args)) {
      if (!consumed.has(k)) rest[k] = v;
    }
    const method = api.method.toUpperCase();
    let url = base.replace(/\/$/, "") + (pathFilled.startsWith("/") ? pathFilled : "/" + pathFilled);
    let body = null;
    const headers = { Accept: "application/json" };
    if (method === "GET" || method === "HEAD") {
      url = appendQuery(url, rest);
    } else if (Object.keys(rest).length > 0) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(rest);
    }
    return { url, method, body, headers };
  }
  async function callUpstreamMcpByName(serverName, toolName, args) {
    const server = await getUpstreamMcpServerByName(serverName);
    if (!server) return { error: `Upstream MCP server "${serverName}" not configured` };
    if (!server.enabled) return { error: `Upstream MCP server "${serverName}" is disabled` };
    if (!matchAllowedTools(server, toolName)) {
      return { error: `Tool "${toolName}" not in allowedTools for "${server.name}"` };
    }
    try {
      const { callUpstreamTool: callUpstreamTool2 } = await Promise.resolve().then(() => upstreamClient);
      const result2 = await callUpstreamTool2(server, toolName, args);
      return { data: result2 };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
  async function handleMcpCall(_sender, payload) {
    return callUpstreamMcpByName(payload.serverName, payload.toolName, payload.args ?? {});
  }
  function matchAllowedTools(server, tool) {
    const list = server.allowedTools ?? [];
    if (list.includes("*")) return true;
    return list.includes(tool);
  }
  const KV_MAX_BYTES_PER_KEY = 1 * 1024 * 1024;
  const KV_MAX_BYTES_PER_SESSION = 50 * 1024 * 1024;
  const STORE = "pagenter_kv";
  function makeId(sessionId, key) {
    return `${sessionId}::${key}`;
  }
  function estimateBytes(value) {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }
  async function getSessionBytes(sessionId) {
    const db2 = await getDB();
    const records = await db2.getAllFromIndex(STORE, "by-session", sessionId);
    return records.reduce((sum, r) => sum + (r.bytes || 0), 0);
  }
  async function kvSet(sessionId, key, value) {
    if (!sessionId) throw new Error("sessionId required");
    if (!key || typeof key !== "string") throw new Error("key must be a non-empty string");
    const bytes = estimateBytes(value);
    if (bytes > KV_MAX_BYTES_PER_KEY) {
      throw new Error(
        `QuotaExceededError: value (${bytes} bytes) exceeds per-key limit (${KV_MAX_BYTES_PER_KEY} bytes)`
      );
    }
    const db2 = await getDB();
    const existing = await db2.get(STORE, makeId(sessionId, key));
    const existingBytes = existing?.bytes ?? 0;
    const usedBytes = await getSessionBytes(sessionId);
    const projected = usedBytes - existingBytes + bytes;
    if (projected > KV_MAX_BYTES_PER_SESSION) {
      throw new Error(
        `QuotaExceededError: session total would be ${projected} bytes, exceeds limit ${KV_MAX_BYTES_PER_SESSION}`
      );
    }
    const now = Date.now();
    const record = {
      id: makeId(sessionId, key),
      sessionId,
      key,
      value,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      bytes
    };
    await db2.put(STORE, record);
  }
  async function kvGet(sessionId, key) {
    if (!sessionId) throw new Error("sessionId required");
    if (!key || typeof key !== "string") throw new Error("key must be a non-empty string");
    const db2 = await getDB();
    const record = await db2.get(STORE, makeId(sessionId, key));
    return record?.value;
  }
  async function kvList(sessionId) {
    if (!sessionId) throw new Error("sessionId required");
    const db2 = await getDB();
    const records = await db2.getAllFromIndex(STORE, "by-session", sessionId);
    return records.map((r) => r.key);
  }
  async function kvDelete(sessionId, key) {
    if (!sessionId) throw new Error("sessionId required");
    if (!key || typeof key !== "string") throw new Error("key must be a non-empty string");
    const db2 = await getDB();
    await db2.delete(STORE, makeId(sessionId, key));
  }
  async function cleanupOrphanKv() {
    const sessions = await listSessions();
    const validIds = new Set(sessions.map((s) => s.id));
    const db2 = await getDB();
    const all = await db2.getAll(STORE);
    const orphans = all.filter((r) => !validIds.has(r.sessionId));
    if (orphans.length === 0) return 0;
    const tx = db2.transaction(STORE, "readwrite");
    for (const r of orphans) {
      await tx.store.delete(r.id);
    }
    await tx.done;
    console.log(
      `[kvStore] cleaned ${orphans.length} orphan KV record(s) (session no longer exists)`
    );
    return orphans.length;
  }
  const EMPTY_LLM_CONFIG = { baseURL: "", model: "", apiKey: "" };
  function getDefaultLlmConfig() {
    return EMPTY_LLM_CONFIG;
  }
  function resolveLlmConfig(stored) {
    const llmConfig = stored;
    if (llmConfig?.baseURL || llmConfig?.model || llmConfig?.apiKey) return llmConfig;
    return getDefaultLlmConfig();
  }
  let sharedNetworkRecorder = null;
  function getSharedRecorder() {
    if (!sharedNetworkRecorder) {
      sharedNetworkRecorder = new NetworkRecorder({
        onSample: (sample) => {
          void forwardSampleToOffscreen(sample);
        }
      });
    }
    return sharedNetworkRecorder;
  }
  const OFFSCREEN_URL = "offscreen.html";
  async function ensureOffscreen() {
    const hasDoc = chrome.offscreen.hasDocument;
    if (hasDoc) {
      const exists = await hasDoc.call(chrome.offscreen);
      if (exists) return;
    }
    try {
      await chrome.offscreen.createDocument({
        url: OFFSCREEN_URL,
        // WORKERS 允许我们跑 IndexedDB + 长期计算
        reasons: [chrome.offscreen.Reason.WORKERS],
        justification: "API schema analysis runs off the main service worker thread."
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Only a single offscreen")) {
        console.error("[Background] ensureOffscreen failed:", err);
        throw err;
      }
    }
  }
  async function forwardSampleToOffscreen(sample) {
    await ensureOffscreen();
    chrome.runtime.sendMessage({ type: "SNIFF_SAMPLE_INGEST", sample }).catch((err) => console.warn("[Background] forward sample failed:", err));
  }
  async function handleSniffStart(tabId, projectId) {
    try {
      const project = await getProject(projectId);
      if (!project) return { ok: false, error: `Project ${projectId} not found` };
      await ensureOffscreen();
      await getSharedRecorder().start(tabId, project);
      await updateProject(projectId, { status: "recording" });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Background] SNIFF_START failed:", err);
      return { ok: false, error: msg };
    }
  }
  async function handleSniffStop(tabId, projectId) {
    try {
      await getSharedRecorder().stop(tabId);
    } catch (err) {
      console.error("[Background] SNIFF_STOP failed:", err);
    }
    if (projectId) {
      await updateProject(projectId, { status: "idle" }).catch(() => {
      });
    }
    return { ok: true };
  }
  const definition = defineBackground(() => {
    console.log("[Background] Service Worker started");
    cleanupOrphanKv().catch((err) => {
      console.warn("[Background] cleanupOrphanKv failed (non-fatal):", err);
    });
    setupTabEventsPort();
    chrome.tabs.onRemoved.addListener((tabId) => {
      handleSniffStop(tabId).catch(() => {
      });
    });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "TAB_CONTROL") {
        return handleTabControlMessage(message, sender, sendResponse);
      } else if (message.type === "PAGE_CONTROL") {
        return handlePageControlMessage(message, sender, sendResponse);
      } else if (message.type === "TIPSCRIPT_EXECUTE") {
        const tabId = message.tabId ?? sender.tab?.id;
        if (!tabId) {
          sendResponse({ error: "No tabId available" });
          return;
        }
        handleTipScriptExecute(tabId, message.script).then((result2) => sendResponse({ ok: true, result: result2 })).catch((err) => sendResponse({ error: String(err) }));
        return true;
      } else if (message.type === "TIPSCRIPT_QUERY") {
        handleTipScriptQuery(message.url).then((scripts) => sendResponse({ scripts })).catch((err) => sendResponse({ error: String(err) }));
        return true;
      } else if (message.type === "ELEMENT_PICKER") {
        handleElementPicker(message.tabId, message.action, message.payload).then((result2) => sendResponse(result2)).catch((err) => sendResponse({ error: String(err) }));
        return true;
      } else if (message.type === "ELEMENT_PICKED" || message.type === "ELEMENT_PICKER_STOPPED") {
        sendResponse({ ok: true });
        return;
      } else if (message.type === "AGENT_SESSION_SYNC") {
        sendResponse({ ok: true });
        return;
      } else if (message.type === "AGENT_STOP") {
        sendResponse({ ok: true });
        return;
      } else if (message.type === "SNIFF_START_RECORDING") {
        const tabId = message.tabId ?? sender.tab?.id;
        if (!tabId || !message.projectId) {
          sendResponse({ ok: false, error: "tabId & projectId required" });
          return;
        }
        handleSniffStart(tabId, message.projectId).then((r) => sendResponse(r));
        return true;
      } else if (message.type === "SNIFF_STOP_RECORDING") {
        const tabId = message.tabId ?? sender.tab?.id;
        if (!tabId) {
          sendResponse({ ok: false, error: "tabId required" });
          return;
        }
        handleSniffStop(tabId, message.projectId).then((r) => sendResponse(r));
        return true;
      } else if (message.type === "OFFSCREEN_PING") {
        sendResponse({ ok: true });
        return;
      } else if (message.type === "CDP_PROXY") {
        const extensionOrigin = chrome.runtime.getURL("");
        const fromExtensionPage = !sender.tab && sender.url?.startsWith(extensionOrigin);
        if (!fromExtensionPage) {
          console.warn(
            "[Background] CDP_PROXY rejected from non-extension source:",
            sender.url ?? "(unknown)"
          );
          sendResponse({ error: "CDP_PROXY: forbidden source" });
          return;
        }
        handleCdpProxyMessage(message).then(sendResponse);
        return true;
      } else if (message.type === "PAGENTER_API_CALL") {
        handleApiCall(sender, message.payload).then(sendResponse);
        return true;
      } else if (message.type === "PAGENTER_MCP_CALL") {
        handleMcpCall(sender, message.payload).then(sendResponse);
        return true;
      } else if (message.type === "PAGENTER_API_LIST") {
        handleApiList(sender, message.payload).then(sendResponse);
        return true;
      } else if (message.type === "PAGENTER_LLM_CALL") {
        handleLlmCall(message.payload).then(sendResponse);
        return true;
      } else if (message.type === "PAGENTER_KV_SET" || message.type === "PAGENTER_KV_GET" || message.type === "PAGENTER_KV_LIST" || message.type === "PAGENTER_KV_DELETE") {
        handleKvCall(message.type, message.payload).then(sendResponse);
        return true;
      } else {
        sendResponse({ error: "Unknown message type" });
        return;
      }
    });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {
    });
    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      if (message.type === "OPEN_HUB") {
        openOrFocusHubTab(message.wsPort).then(() => {
          if (sender.tab?.id) chrome.tabs.remove(sender.tab.id);
          sendResponse({ ok: true });
        });
        return true;
      }
    });
  });
  async function openOrFocusHubTab(wsPort) {
    const hubUrl = chrome.runtime.getURL("hub.html");
    const existing = await chrome.tabs.query({ url: `${hubUrl}*` });
    if (existing.length > 0 && existing[0].id) {
      await chrome.tabs.update(existing[0].id, {
        active: true,
        url: `${hubUrl}?ws=${wsPort}`
      });
      return;
    }
    await chrome.tabs.create({ url: `${hubUrl}?ws=${wsPort}`, pinned: true });
  }
  async function handleTipScriptExecute(tabId, script) {
    const expression = wrapScriptForEval(script);
    const result2 = await cdpSend(tabId, "Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (result2.exceptionDetails) {
      return {
        error: result2.exceptionDetails.exception?.description || result2.exceptionDetails.text || "Script execution error"
      };
    }
    return result2.result?.value;
  }
  async function handleTipScriptQuery(url) {
    const { getMatchingTipScripts: getMatchingTipScripts2 } = await Promise.resolve().then(() => db);
    return getMatchingTipScripts2(url);
  }
  async function handleElementPicker(tabId, action, payload) {
    await chrome.tabs.sendMessage(tabId, {
      type: "ELEMENT_PICKER",
      action,
      payload
    });
    return { ok: true };
  }
  async function handleLlmCall(payload) {
    if (!payload?.messages || !Array.isArray(payload.messages) || payload.messages.length === 0) {
      return { error: "messages is required and must be a non-empty array" };
    }
    const storage = await chrome.storage.local.get("llmConfig");
    const llmConfig = resolveLlmConfig(storage.llmConfig);
    if (!llmConfig?.baseURL || !llmConfig?.model) {
      return { error: "LLM not configured. Please set baseURL and model in extension settings." };
    }
    const requestBody = {
      model: llmConfig.model,
      messages: payload.messages,
      // temperature 默认 0（确定性输出，适合结构化任务如数据筛选）
      temperature: payload.temperature ?? 0
    };
    if (payload.response_format === "json") {
      requestBody.response_format = { type: "json_object" };
    }
    try {
      const baseURL = llmConfig.baseURL.replace(/\/+$/, "");
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 有 apiKey 时才添加 Authorization header
          ...llmConfig.apiKey && { Authorization: `Bearer ${llmConfig.apiKey}` }
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData?.error?.message || response.statusText;
        return { error: `LLM API error (HTTP ${response.status}): ${errorMsg}` };
      }
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== "string") {
        return { error: "LLM response did not contain text content" };
      }
      return {
        data: {
          text,
          usage: {
            promptTokens: data.usage?.prompt_tokens ?? 0,
            completionTokens: data.usage?.completion_tokens ?? 0,
            totalTokens: data.usage?.total_tokens ?? 0
          }
        }
      };
    } catch (err) {
      return { error: `LLM request failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
  async function handleKvCall(type, payload) {
    const storage = await chrome.storage.local.get("lastSessionId");
    const sessionId = storage.lastSessionId;
    if (!sessionId) {
      return {
        error: "No active session. KV operations require a running agent task. Start a task first, then retry."
      };
    }
    try {
      switch (type) {
        case "PAGENTER_KV_SET": {
          if (!payload?.key) return { error: "key is required" };
          await kvSet(sessionId, payload.key, payload.value);
          return { data: { ok: true } };
        }
        case "PAGENTER_KV_GET": {
          if (!payload?.key) return { error: "key is required" };
          const value = await kvGet(sessionId, payload.key);
          return { data: { value } };
        }
        case "PAGENTER_KV_LIST": {
          const keys = await kvList(sessionId);
          return { data: { keys } };
        }
        case "PAGENTER_KV_DELETE": {
          if (!payload?.key) return { error: "key is required" };
          await kvDelete(sessionId, payload.key);
          return { data: { ok: true } };
        }
        default:
          return { error: `Unknown KV op: ${type}` };
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
  function initPlugins() {
  }
  globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  function print(method, ...args) {
    return;
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) console.warn("The background's main() function return a promise, but it must be synchronous");
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  var background_entrypoint_default = result;
  async function callUpstreamTool(server, toolName, args) {
    if (server.transport === "stdio") {
      throw new Error(
        "stdio transport requires Pagenter Hub relay, which is not yet implemented. Please use sse transport or wait for Hub integration."
      );
    }
    if (!server.url) throw new Error(`Upstream MCP server "${server.name}" has no url`);
    const req = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args }
    };
    const res = await fetch(server.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(req)
    });
    if (!res.ok) {
      throw new Error(`Upstream MCP HTTP ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    const parsed = parseJsonRpcOrSseFrame(text);
    if (parsed.error) {
      throw new Error(`Upstream MCP error: ${parsed.error.message}`);
    }
    return parsed.result;
  }
  function parseJsonRpcOrSseFrame(text) {
    try {
      return JSON.parse(text);
    } catch {
    }
    const match = /^data:\s*(.*)$/m.exec(text);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (err) {
        throw new Error(`Failed to parse SSE data frame: ${err}`);
      }
    }
    throw new Error("Unrecognized upstream MCP response format");
  }
  const upstreamClient = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    callUpstreamTool
  }, Symbol.toStringTag, { value: "Module" }));
  return background_entrypoint_default;
})();
