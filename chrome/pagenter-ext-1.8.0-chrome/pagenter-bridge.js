var pagenterBridge = (function() {
  "use strict";
  function defineUnlistedScript(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const definition = defineUnlistedScript(() => {
    let _lastId = 0;
    const nextId = () => {
      _lastId += 1;
      return _lastId;
    };
    const DEFAULT_BRIDGE_TIMEOUT_MS = 15e3;
    function sendBridgeRequest(channel, payload, timeoutMs = DEFAULT_BRIDGE_TIMEOUT_MS) {
      const id = nextId();
      return new Promise((resolve, reject) => {
        const handle = (e) => {
          if (e.source !== window) return;
          const data = e.data;
          if (!data || typeof data !== "object") return;
          if (data.channel !== `${channel}_RESPONSE`) return;
          if (data.id !== id) return;
          cleanup();
          if (data.error) reject(new Error(String(data.error)));
          else resolve(data.payload);
        };
        window.addEventListener("message", handle);
        const timer = setTimeout(() => {
          cleanup();
          reject(
            new Error(
              `[__pagenter] ${channel} timed out after ${timeoutMs}ms. The page's isolated-world content script bridge is not responding (may not be injected — try reloading this page after updating the extension, or check if this URL allows content scripts).`
            )
          );
        }, timeoutMs);
        window.postMessage({ channel: `${channel}_REQUEST`, id, payload }, "*");
        function cleanup() {
          window.removeEventListener("message", handle);
          clearTimeout(timer);
        }
      });
    }
    const callApi = (toolName, args) => {
      if (!toolName) throw new Error("toolName is required");
      return sendBridgeRequest("PAGENTER_API_CALL", { toolName, args });
    };
    const mcp = (serverName, toolName, args) => {
      if (!serverName) throw new Error("serverName is required");
      if (!toolName) throw new Error("toolName is required");
      return sendBridgeRequest("PAGENTER_MCP_CALL", { serverName, toolName, args });
    };
    const listApis = (projectId) => {
      return sendBridgeRequest("PAGENTER_API_LIST", { projectId });
    };
    const llm = (options) => {
      if (!options?.messages || !Array.isArray(options.messages) || options.messages.length === 0) {
        throw new Error("llm() requires a non-empty messages array");
      }
      return sendBridgeRequest(
        "PAGENTER_LLM_CALL",
        options
      );
    };
    const kv = Object.freeze({
      set: (key, value) => {
        if (!key || typeof key !== "string") throw new Error("key must be a non-empty string");
        return sendBridgeRequest("PAGENTER_KV_SET", { key, value });
      },
      get: (key) => {
        if (!key || typeof key !== "string") throw new Error("key must be a non-empty string");
        return sendBridgeRequest("PAGENTER_KV_GET", { key }).then((r) => r.value);
      },
      list: () => {
        return sendBridgeRequest("PAGENTER_KV_LIST", {}).then((r) => r.keys);
      },
      delete: (key) => {
        if (!key || typeof key !== "string") throw new Error("key must be a non-empty string");
        return sendBridgeRequest("PAGENTER_KV_DELETE", { key });
      }
    });
    Object.defineProperty(window, "__pagenter", {
      value: Object.freeze({
        version: "1.8.0",
        callApi,
        mcp,
        listApis,
        llm,
        kv
      }),
      writable: false,
      configurable: false
    });
  });
  function initPlugins() {
  }
  function print(method, ...args) {
    return;
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  const result = (() => {
    try {
      initPlugins();
    } catch (err) {
      logger.error(`Failed to initialize plugins for "${"pagenter-bridge"}"`, err);
      throw err;
    }
    let result2;
    try {
      result2 = definition.main();
      if (result2 instanceof Promise) result2 = result2.catch((err) => {
        logger.error(`The unlisted script "${"pagenter-bridge"}" crashed on startup!`, err);
        throw err;
      });
    } catch (err) {
      logger.error(`The unlisted script "${"pagenter-bridge"}" crashed on startup!`, err);
      throw err;
    }
    return result2;
  })();
  return result;
})();

pagenterBridge;