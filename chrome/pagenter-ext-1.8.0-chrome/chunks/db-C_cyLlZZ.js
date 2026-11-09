(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
function initPlugins() {
}
try {
  initPlugins();
} catch (err) {
  console.error("[wxt] Failed to initialize plugins", err);
}
const scriptRel = "modulepreload";
const assetsURL = function(dep) {
  return "/" + dep;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    let allSettled = function(promises$2) {
      return Promise.all(promises$2.map((p) => Promise.resolve(p).then((value$1) => ({
        status: "fulfilled",
        value: value$1
      }), (reason) => ({
        status: "rejected",
        reason
      }))));
    };
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = allSettled(deps.map((dep) => {
      dep = assetsURL(dep);
      if (dep in seen) return;
      seen[dep] = true;
      const isCss = dep.endsWith(".css");
      const cssSelector = isCss ? '[rel="stylesheet"]' : "";
      if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return;
      const link = document.createElement("link");
      link.rel = isCss ? "stylesheet" : scriptRel;
      if (!isCss) link.as = "script";
      link.crossOrigin = "";
      link.href = dep;
      if (cspNonce) link.setAttribute("nonce", cspNonce);
      document.head.appendChild(link);
      if (isCss) return new Promise((res, rej) => {
        link.addEventListener("load", res);
        link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)));
      });
    }));
  }
  function handlePreloadError(err$2) {
    const e$1 = new Event("vite:preloadError", { cancelable: true });
    e$1.payload = err$2;
    window.dispatchEvent(e$1);
    if (!e$1.defaultPrevented) throw err$2;
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
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
  openPromise.then((db) => {
    if (terminated)
      db.addEventListener("close", () => terminated());
    if (blocking) {
      db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
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
      upgrade(db, oldVersion, newVersion) {
        console.log(`[db] upgrading from v${oldVersion} to v${newVersion}`);
        if (!db.objectStoreNames.contains("sessions")) {
          const sessionStore = db.createObjectStore("sessions", { keyPath: "id" });
          sessionStore.createIndex("by-created", "createdAt");
        }
        if (!db.objectStoreNames.contains("tipscripts")) {
          const store = db.createObjectStore("tipscripts", { keyPath: "id" });
          store.createIndex("by-updated", "updatedAt");
          store.createIndex("by-enabled", "enabled");
        }
        if (!db.objectStoreNames.contains("sniff_projects")) {
          const s = db.createObjectStore("sniff_projects", { keyPath: "id" });
          s.createIndex("by-updated", "updatedAt");
          s.createIndex("by-status", "status");
        }
        if (!db.objectStoreNames.contains("sniff_apis")) {
          const s = db.createObjectStore("sniff_apis", { keyPath: "id" });
          s.createIndex("by-project", "projectId");
          s.createIndex("by-updated", "lastSeenAt");
          s.createIndex("by-exposed", "exposed");
        }
        if (!db.objectStoreNames.contains("sniff_samples")) {
          const s = db.createObjectStore("sniff_samples", { keyPath: "id" });
          s.createIndex("by-api", "apiId");
          s.createIndex("by-project", "projectId");
          s.createIndex("by-timestamp", "timestamp");
        }
        if (!db.objectStoreNames.contains("sniff_specs")) {
          const s = db.createObjectStore("sniff_specs", { keyPath: "id" });
          s.createIndex("by-api", "apiId");
        }
        if (!db.objectStoreNames.contains("sniff_annotations")) {
          const s = db.createObjectStore("sniff_annotations", { keyPath: "id" });
          s.createIndex("by-spec", "specId");
          s.createIndex("by-api", "apiId");
        }
        if (!db.objectStoreNames.contains("upstream_mcp_servers")) {
          const s = db.createObjectStore("upstream_mcp_servers", { keyPath: "id" });
          s.createIndex("by-updated", "updatedAt");
          s.createIndex("by-name", "name", { unique: true });
        }
        if (!db.objectStoreNames.contains("pagenter_kv")) {
          const s = db.createObjectStore("pagenter_kv", { keyPath: "id" });
          s.createIndex("by-session", "sessionId");
        }
        console.log(`[db] upgrade complete, current stores:`, [...db.objectStoreNames]);
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
function isIncompatibleHistory(history) {
  for (const event of history) {
    if (event.type !== "step") continue;
    const r = event.reflection;
    if (!r) continue;
    if ("evaluation_previous_goal" in r || "memory" in r || "next_goal" in r) return true;
    if (!("progress" in r)) return true;
  }
  return false;
}
async function cleanupIncompatibleSessions() {
  const db = await getDB();
  const all = await db.getAll("sessions");
  const targetIds = all.filter((s) => isIncompatibleHistory(s.history)).map((s) => s.id);
  if (targetIds.length === 0) return 0;
  const tx = db.transaction("sessions", "readwrite");
  await Promise.all(targetIds.map((id) => tx.store.delete(id)));
  await tx.done;
  console.log(
    `[db] removed ${targetIds.length} session(s) with incompatible reflection shape. Export to markdown beforehand if you want to keep them.`
  );
  return targetIds.length;
}
async function saveSession(session) {
  await cleanupIncompatibleSessions().catch((e) => {
    console.warn("[db] cleanupIncompatibleSessions failed (non-fatal):", e);
  });
  const db = await getDB();
  const now = Date.now();
  const record = {
    ...session,
    tasks: session.tasks || (session.task ? [session.task] : []),
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };
  await db.put("sessions", record);
  return record;
}
async function updateSession(id, patch) {
  const db = await getDB();
  const existing = await db.get("sessions", id);
  if (!existing) return;
  await db.put("sessions", { ...existing, ...patch, updatedAt: Date.now() });
}
async function listSessions() {
  const db = await getDB();
  const all = await db.getAllFromIndex("sessions", "by-created");
  return all.reverse();
}
async function getSession(id) {
  const db = await getDB();
  return db.get("sessions", id);
}
async function deleteSession(id) {
  const db = await getDB();
  await db.delete("sessions", id);
  const { kvClearBySession } = await __vitePreload(async () => {
    const { kvClearBySession: kvClearBySession2 } = await import("./kvStore-B3infbmv.js");
    return { kvClearBySession: kvClearBySession2 };
  }, true ? [] : void 0);
  await kvClearBySession(id).catch((e) => {
    console.warn("[db] kvClearBySession failed (non-fatal):", e);
  });
}
async function clearSessions() {
  const db = await getDB();
  await db.clear("sessions");
  await db.clear("pagenter_kv");
}
async function saveTipScript(mz) {
  const db = await getDB();
  const now = Date.now();
  const record = {
    ...mz,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };
  await db.put("tipscripts", record);
  return record;
}
async function updateTipScript(id, patch) {
  const db = await getDB();
  const existing = await db.get("tipscripts", id);
  if (!existing) return;
  await db.put("tipscripts", { ...existing, ...patch, updatedAt: Date.now() });
}
async function listTipScripts() {
  const db = await getDB();
  const all = await db.getAllFromIndex("tipscripts", "by-updated");
  return all.reverse();
}
async function deleteTipScript(id) {
  const db = await getDB();
  await db.delete("tipscripts", id);
}
async function getMatchingTipScripts(url) {
  const all = await listTipScripts();
  return all.filter((mz) => mz.enabled && mz.urlPatterns.some((p) => matchUrl(p, url)));
}
export {
  __vitePreload as _,
  deleteTipScript as a,
  getMatchingTipScripts as b,
  clearSessions as c,
  deleteSession as d,
  getSession as e,
  listTipScripts as f,
  getDB as g,
  saveTipScript as h,
  updateTipScript as i,
  listSessions as l,
  saveSession as s,
  updateSession as u
};
