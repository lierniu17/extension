import { i as createLucideIcon } from "./index-AisPC-Mg.js";
const __iconNode$1 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
  ["path", { d: "m9 9 6 6", key: "z0biqf" }]
];
const CircleX = createLucideIcon("circle-x", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      key: "1nclc0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Eye = createLucideIcon("eye", __iconNode);
const EMPTY_LLM_CONFIG = { baseURL: "", model: "", apiKey: "" };
function getDefaultLlmConfig() {
  return EMPTY_LLM_CONFIG;
}
function resolveLlmConfig(stored) {
  const llmConfig = stored;
  if (llmConfig?.baseURL || llmConfig?.model || llmConfig?.apiKey) return llmConfig;
  return getDefaultLlmConfig();
}
const ANSI_BACKGROUND_OFFSET = 10;
const wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
const wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
const wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
const styles$1 = {
  modifier: {
    reset: [0, 0],
    // 21 isn't widely supported and 22 does the same thing
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29]
  },
  color: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    // Bright color
    blackBright: [90, 39],
    gray: [90, 39],
    // Alias of `blackBright`
    grey: [90, 39],
    // Alias of `blackBright`
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39]
  },
  bgColor: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
    // Bright color
    bgBlackBright: [100, 49],
    bgGray: [100, 49],
    // Alias of `bgBlackBright`
    bgGrey: [100, 49],
    // Alias of `bgBlackBright`
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49]
  }
};
Object.keys(styles$1.modifier);
const foregroundColorNames = Object.keys(styles$1.color);
const backgroundColorNames = Object.keys(styles$1.bgColor);
[...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
  const codes = /* @__PURE__ */ new Map();
  for (const [groupName, group] of Object.entries(styles$1)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles$1[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles$1[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles$1, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles$1, "codes", {
    value: codes,
    enumerable: false
  });
  styles$1.color.close = "\x1B[39m";
  styles$1.bgColor.close = "\x1B[49m";
  styles$1.color.ansi = wrapAnsi16();
  styles$1.color.ansi256 = wrapAnsi256();
  styles$1.color.ansi16m = wrapAnsi16m();
  styles$1.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles$1.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles$1.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles$1, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          /* eslint-disable no-bitwise */
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
          /* eslint-enable no-bitwise */
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles$1.rgbToAnsi256(...styles$1.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles$1.ansi256ToAnsi(styles$1.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles$1.ansi256ToAnsi(styles$1.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles$1;
}
const ansiStyles = assembleStyles();
const level = (() => {
  if (!("navigator" in globalThis)) {
    return 0;
  }
  if (globalThis.navigator.userAgentData) {
    const brand = navigator.userAgentData.brands.find(({ brand: brand2 }) => brand2 === "Chromium");
    if (brand && brand.version > 93) {
      return 3;
    }
  }
  if (/\b(Chrome|Chromium)\//.test(globalThis.navigator.userAgent)) {
    return 1;
  }
  return 0;
})();
const colorSupport = level !== 0 && {
  level
};
const supportsColor = {
  stdout: colorSupport,
  stderr: colorSupport
};
function stringReplaceAll(string, substring, replacer) {
  let index = string.indexOf(substring);
  if (index === -1) {
    return string;
  }
  const substringLength = substring.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index) + substring + replacer;
    endIndex = index + substringLength;
    index = string.indexOf(substring, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
  let endIndex = 0;
  let returnValue = "";
  do {
    const gotCR = string[index - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
    endIndex = index + 1;
    index = string.indexOf("\n", endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
const { stdout: stdoutColor, stderr: stderrColor } = supportsColor;
const GENERATOR = /* @__PURE__ */ Symbol("GENERATOR");
const STYLER = /* @__PURE__ */ Symbol("STYLER");
const IS_EMPTY = /* @__PURE__ */ Symbol("IS_EMPTY");
const levelMapping = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
];
const styles = /* @__PURE__ */ Object.create(null);
const applyOptions = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
    throw new Error("The `level` option should be an integer from 0 to 3");
  }
  const colorLevel = stdoutColor ? stdoutColor.level : 0;
  object.level = options.level === void 0 ? colorLevel : options.level;
};
const chalkFactory = (options) => {
  const chalk2 = (...strings) => strings.join(" ");
  applyOptions(chalk2, options);
  Object.setPrototypeOf(chalk2, createChalk.prototype);
  return chalk2;
};
function createChalk(options) {
  return chalkFactory(options);
}
Object.setPrototypeOf(createChalk.prototype, Function.prototype);
for (const [styleName, style] of Object.entries(ansiStyles)) {
  styles[styleName] = {
    get() {
      const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
      Object.defineProperty(this, styleName, { value: builder });
      return builder;
    }
  };
}
styles.visible = {
  get() {
    const builder = createBuilder(this, this[STYLER], true);
    Object.defineProperty(this, "visible", { value: builder });
    return builder;
  }
};
const getModelAnsi = (model, level2, type, ...arguments_) => {
  if (model === "rgb") {
    if (level2 === "ansi16m") {
      return ansiStyles[type].ansi16m(...arguments_);
    }
    if (level2 === "ansi256") {
      return ansiStyles[type].ansi256(ansiStyles.rgbToAnsi256(...arguments_));
    }
    return ansiStyles[type].ansi(ansiStyles.rgbToAnsi(...arguments_));
  }
  if (model === "hex") {
    return getModelAnsi("rgb", level2, type, ...ansiStyles.hexToRgb(...arguments_));
  }
  return ansiStyles[type][model](...arguments_);
};
const usedModels = ["rgb", "hex", "ansi256"];
for (const model of usedModels) {
  styles[model] = {
    get() {
      const { level: level2 } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level2], "color", ...arguments_), ansiStyles.color.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
  const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
  styles[bgModel] = {
    get() {
      const { level: level2 } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level2], "bgColor", ...arguments_), ansiStyles.bgColor.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
}
const proto = Object.defineProperties(() => {
}, {
  ...styles,
  level: {
    enumerable: true,
    get() {
      return this[GENERATOR].level;
    },
    set(level2) {
      this[GENERATOR].level = level2;
    }
  }
});
const createStyler = (open, close, parent) => {
  let openAll;
  let closeAll;
  if (parent === void 0) {
    openAll = open;
    closeAll = close;
  } else {
    openAll = parent.openAll + open;
    closeAll = close + parent.closeAll;
  }
  return {
    open,
    close,
    openAll,
    closeAll,
    parent
  };
};
const createBuilder = (self, _styler, _isEmpty) => {
  const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto);
  builder[GENERATOR] = self;
  builder[STYLER] = _styler;
  builder[IS_EMPTY] = _isEmpty;
  return builder;
};
const applyStyle = (self, string) => {
  if (self.level <= 0 || !string) {
    return self[IS_EMPTY] ? "" : string;
  }
  let styler = self[STYLER];
  if (styler === void 0) {
    return string;
  }
  const { openAll, closeAll } = styler;
  if (string.includes("\x1B")) {
    while (styler !== void 0) {
      string = stringReplaceAll(string, styler.close, styler.open);
      styler = styler.parent;
    }
  }
  const lfIndex = string.indexOf("\n");
  if (lfIndex !== -1) {
    string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
  }
  return openAll + string + closeAll;
};
Object.defineProperties(createChalk.prototype, styles);
const chalk = createChalk();
createChalk({ level: stderrColor ? stderrColor.level : 0 });
const InvokeErrorType = {
  // Retryable
  NETWORK_ERROR: "network_error",
  // Network error, retry
  RATE_LIMIT: "rate_limit",
  // Rate limit, retry
  SERVER_ERROR: "server_error",
  // 5xx, retry
  NO_TOOL_CALL: "no_tool_call",
  // Model did not call tool
  INVALID_TOOL_ARGS: "invalid_tool_args",
  // Tool args don't match schema
  TOOL_EXECUTION_ERROR: "tool_execution_error",
  // Tool execution error
  UNKNOWN: "unknown",
  // Non-retryable
  AUTH_ERROR: "auth_error",
  // Authentication failed
  CONTEXT_LENGTH: "context_length",
  // Prompt too long
  CONTENT_FILTER: "content_filter"
  // Content filtered
};
class InvokeError extends Error {
  type;
  retryable;
  statusCode;
  /* raw error (provided if this error is caused by another error) */
  rawError;
  /* raw response from the API (provided if this error is caused by an API calling) */
  rawResponse;
  constructor(type, message, rawError, rawResponse) {
    super(message);
    this.name = "InvokeError";
    this.type = type;
    this.retryable = this.isRetryable(type, rawError);
    this.rawError = rawError;
    this.rawResponse = rawResponse;
  }
  isRetryable(type, rawError) {
    const isAbortError = rawError?.name === "AbortError";
    if (isAbortError) return false;
    const retryableTypes = [
      InvokeErrorType.NETWORK_ERROR,
      InvokeErrorType.RATE_LIMIT,
      InvokeErrorType.SERVER_ERROR,
      InvokeErrorType.NO_TOOL_CALL,
      InvokeErrorType.INVALID_TOOL_ARGS,
      InvokeErrorType.TOOL_EXECUTION_ERROR,
      InvokeErrorType.UNKNOWN
    ];
    return retryableTypes.includes(type);
  }
}
const debug = console.debug.bind(console, chalk.gray("[LLM]"));
function applyTokenLimit(body, maxTokens, param) {
  if (maxTokens == null || maxTokens <= 0) return;
  if (param === "max_completion_tokens") {
    body.max_completion_tokens = maxTokens;
    return;
  }
  if (param === "max_tokens") {
    body.max_tokens = maxTokens;
  }
}
function isUnsupportedTokenParamError(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  if (!lower.includes("max_tokens") && !lower.includes("max_completion_tokens")) return false;
  return lower.includes("unsupported") || lower.includes("not supported") || lower.includes("unrecognized") || lower.includes("not allowed") || lower.includes("use 'max_completion_tokens'") || lower.includes("use 'max_tokens'") || lower.includes("use max_completion_tokens") || lower.includes("use max_tokens");
}
function modelPatch(body) {
  const model = body.model || "";
  if (!model) return body;
  const modelName = normalizeModelName(model);
  if (modelName.startsWith("qwen")) {
    debug("Applying Qwen patch: use higher temperature");
    body.temperature = Math.max(body.temperature || 0, 1);
    body.enable_thinking = false;
  }
  if (modelName.startsWith("claude")) {
    debug("Applying Claude patch: disable thinking");
    body.thinking = { type: "disabled" };
  }
  if (modelName.startsWith("grok")) {
    debug("Applying Grok patch: disable reasoning and thinking");
    body.thinking = { type: "disabled", effort: "minimal" };
    body.reasoning = { enabled: false, effort: "low" };
  }
  if (modelName.startsWith("gpt")) {
    debug("Applying GPT patch: set verbosity to low");
    body.verbosity = "low";
    if (modelName.startsWith("gpt-52")) {
      debug("Applying GPT-52 patch: disable reasoning");
      body.reasoning_effort = "none";
    } else if (modelName.startsWith("gpt-51")) {
      debug("Applying GPT-51 patch: disable reasoning");
      body.reasoning_effort = "none";
    } else if (modelName.startsWith("gpt-54")) {
      debug("Applying GPT-5.4 patch: skip reasoning_effort");
      delete body.reasoning_effort;
    } else if (modelName.startsWith("gpt-5-mini")) {
      debug("Applying GPT-5-mini patch: set reasoning effort to low, temperature to 1");
      body.reasoning_effort = "low";
      body.temperature = 1;
    } else if (modelName.startsWith("gpt-5")) {
      debug("Applying GPT-5 patch: set reasoning effort to low");
      body.reasoning_effort = "low";
    }
  }
  if (modelName.startsWith("gemini")) {
    debug("Applying Gemini patch: set reasoning effort to minimal");
    body.reasoning_effort = "minimal";
  }
  if (modelName.startsWith("minimax")) {
    debug("Applying MiniMax patch: clamp temperature to (0, 1]");
    body.temperature = Math.max(body.temperature || 0, 0.01);
    if (body.temperature > 1) body.temperature = 1;
  }
  return body;
}
function normalizeModelName(modelName) {
  let normalizedName = modelName.toLowerCase();
  if (normalizedName.includes("/")) {
    normalizedName = normalizedName.split("/")[1];
  }
  normalizedName = normalizedName.replace(/_/g, "");
  normalizedName = normalizedName.replace(/\./g, "");
  return normalizedName;
}
const DEFAULT_TOKEN_PARAM = "max_completion_tokens";
function nextTokenParam(current) {
  if (current === "max_completion_tokens") return "max_tokens";
  if (current === "max_tokens") return "max_completion_tokens";
  return null;
}
class OpenAIClient {
  config;
  fetch;
  constructor(config) {
    this.config = config;
    this.fetch = config.customFetch ?? globalThis.fetch.bind(globalThis);
  }
  async completeText(messages, abortSignal) {
    const initialParam = this.config.tokenLimitParam ?? DEFAULT_TOKEN_PARAM;
    const triedParams = /* @__PURE__ */ new Set();
    let currentParam = initialParam;
    while (true) {
      triedParams.add(currentParam);
      const result = await this.tryComplete(messages, currentParam, abortSignal);
      if (result.kind === "ok") {
        this.config.tokenLimitParam = currentParam;
        return result.value;
      }
      if (result.kind === "unsupportedTokenParam") {
        const fallback = nextTokenParam(currentParam);
        if (fallback && !triedParams.has(fallback)) {
          currentParam = fallback;
          continue;
        }
        if (!triedParams.has("none")) {
          triedParams.add("none");
          const finalResult = await this.tryComplete(messages, "none", abortSignal);
          if (finalResult.kind === "ok") {
            this.config.tokenLimitParam = "none";
            return finalResult.value;
          }
          throw finalResult.error;
        }
        throw result.error;
      }
      throw result.error;
    }
  }
  /**
   * 单次请求；不做换参重试，由 `completeText` 编排。
   *
   * 返回值显式区分三种结局，避免把"参数兼容性问题"和"通用网络/服务端错误"
   * 混进同一个 InvokeError 通道导致外层 withRetry 反复重试同一种死法。
   */
  async tryComplete(messages, tokenParam, abortSignal) {
    const requestBody = {
      model: this.config.model,
      messages
    };
    if (this.config.temperature != null) {
      requestBody.temperature = this.config.temperature;
    }
    applyTokenLimit(requestBody, this.config.maxCompletionTokens, tokenParam);
    modelPatch(requestBody);
    let response;
    try {
      response = await this.fetch(`${this.config.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal
      });
    } catch (error) {
      const isAbortError = error?.name === "AbortError";
      const errorMessage = isAbortError ? "Network request aborted" : "Network request failed";
      if (!isAbortError) console.error(error);
      return {
        kind: "error",
        error: new InvokeError(InvokeErrorType.NETWORK_ERROR, errorMessage, error)
      };
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || response.statusText;
      const invokeError = new InvokeError(
        InvokeErrorType.UNKNOWN,
        `HTTP ${response.status}: ${errorMessage}`,
        errorData
      );
      if (response.status === 400 && isUnsupportedTokenParamError(errorMessage)) {
        return { kind: "unsupportedTokenParam", error: invokeError };
      }
      return { kind: "error", error: invokeError };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return {
        kind: "error",
        error: new InvokeError(InvokeErrorType.UNKNOWN, "No text content in response", data)
      };
    }
    return {
      kind: "ok",
      value: {
        text: content,
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
          cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens,
          reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens
        },
        rawResponse: data,
        rawRequest: requestBody
      }
    };
  }
}
const LLM_MAX_RETRIES = 2;
const PROBE_MAX_TOKENS = 10;
const RED_PIXEL_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";
const COLOR_WORDS = [
  "red",
  "blue",
  "green",
  "black",
  "white",
  "yellow",
  "orange",
  "purple",
  "pink",
  "gray",
  "grey",
  "红",
  "蓝",
  "绿",
  "黑",
  "白",
  "黄",
  "橙",
  "紫",
  "粉",
  "灰"
];
const PROBE_TIMEOUT_MS = 8e3;
const CONTEXT_LENGTH_FIELD_CANDIDATES = ["context_window", "max_input_tokens", "context_length"];
const probeCache = /* @__PURE__ */ new Map();
function cacheKey(config) {
  return `${config.baseURL}::${config.model}::${config.apiKey ?? ""}`;
}
async function probeCapabilities(config, options = {}) {
  const key = cacheKey(config);
  if (!options.force) {
    const cached = probeCache.get(key);
    if (cached) return cached.result;
  }
  const result = await runProbe(config, options.signal);
  probeCache.set(key, { result, at: Date.now() });
  return result;
}
async function runProbe(config, externalSignal) {
  const fetchFn = config.customFetch ?? globalThis.fetch.bind(globalThis);
  const connectivity = await probeConnectivity(config, fetchFn, externalSignal);
  if (!connectivity.ok) {
    return {
      ok: false,
      connectivityError: connectivity.error,
      tokenParam: blockedByConnectivity(connectivity.error),
      vision: blockedByConnectivity(connectivity.error),
      contextLength: blockedByConnectivity(connectivity.error)
    };
  }
  const tokenParam = await probeTokenParam(config, fetchFn, externalSignal);
  const tokenParamValue = tokenParam.value ?? "none";
  const [vision, contextLength] = await Promise.all([
    probeVision(config, fetchFn, externalSignal, tokenParamValue),
    probeContextLength(config, fetchFn, externalSignal)
  ]);
  return {
    ok: true,
    tokenParam,
    vision,
    contextLength
  };
}
function blockedByConnectivity(reason) {
  return {
    supported: false,
    error: `connectivity failed: ${reason}`,
    evidence: "blocked:connectivity"
  };
}
async function probeConnectivity(config, fetchFn, externalSignal) {
  const { signal, cleanup } = withTimeout(externalSignal, PROBE_TIMEOUT_MS);
  try {
    const response = await fetchFn(`${config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "ping" }]
      }),
      signal
    });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      return { ok: false, error: `HTTP ${response.status}: ${detail}` };
    }
    const data = await response.json().catch(() => null);
    if (!data || !Array.isArray(data.choices) || data.choices.length === 0) {
      return { ok: false, error: "Invalid response shape: missing choices[]" };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  } finally {
    cleanup();
  }
}
async function probeTokenParam(config, fetchFn, externalSignal) {
  const candidates = ["max_completion_tokens", "max_tokens"];
  const errors = [];
  for (const param of candidates) {
    const { signal, cleanup } = withTimeout(externalSignal, PROBE_TIMEOUT_MS);
    try {
      const body = {
        model: config.model,
        messages: [{ role: "user", content: "ping" }]
      };
      applyTokenLimit(body, PROBE_MAX_TOKENS, param);
      modelPatch(body);
      const response = await fetchFn(`${config.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}
        },
        body: JSON.stringify(body),
        signal
      });
      if (response.ok) {
        return {
          supported: true,
          value: param,
          evidence: `probe:${param}`
        };
      }
      const detail = await readErrorDetail(response);
      errors.push(`${param}: HTTP ${response.status}: ${detail}`);
    } catch (error) {
      errors.push(`${param}: ${describeError(error)}`);
    } finally {
      cleanup();
    }
  }
  return {
    supported: false,
    value: "none",
    error: errors.join(" | "),
    evidence: "fallback:none"
  };
}
const VISION_PROBE_VARIANTS = [
  { id: "minimal", includeDetail: false, useToken: false },
  { id: "no-detail+token", includeDetail: false, useToken: true },
  { id: "detail", includeDetail: true, useToken: false },
  { id: "detail+token", includeDetail: true, useToken: true }
];
function buildVisionProbeBody(config, variant, tokenParam) {
  const imageUrl = {
    url: `data:image/png;base64,${RED_PIXEL_PNG}`
  };
  if (variant.includeDetail) imageUrl.detail = "low";
  const body = {
    model: config.model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "One word only: what color is this image?" },
          { type: "image_url", image_url: imageUrl }
        ]
      }
    ]
  };
  if (variant.useToken) applyTokenLimit(body, PROBE_MAX_TOKENS, tokenParam);
  return body;
}
function isModelRejectsVisionError(message) {
  const lower = message.toLowerCase();
  return /multimodal|image.?input|vision.?model|does not support.*image|not support.*image|image content/.test(
    lower
  ) || /多模态|图像输入|图片输入|不支持.*图|不支持.*视觉/.test(message);
}
function isRequestFormatError(message) {
  if (isUnsupportedTokenParamError(message)) return true;
  const lower = message.toLowerCase();
  return lower.includes("parameter") && (lower.includes("not valid") || lower.includes("invalid") || lower.includes("unsupported") || lower.includes("unknown")) || lower.includes("unrecognized") || lower.includes("unexpected") || lower.includes("detail") && lower.includes("not");
}
function responseHasColorWord(content) {
  const lower = content.toLowerCase();
  return COLOR_WORDS.some((w) => lower.includes(w));
}
async function tryVisionProbeVariant(config, fetchFn, signal, variant, tokenParam) {
  const body = buildVisionProbeBody(config, variant, tokenParam);
  modelPatch(body);
  const response = await fetchFn(`${config.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}
    },
    body: JSON.stringify(body),
    signal
  });
  if (!response.ok) {
    const detail = await readErrorDetail(response);
    const error = `HTTP ${response.status}: ${detail}`;
    if (isModelRejectsVisionError(detail)) return { kind: "model_rejects", error };
    if (isRequestFormatError(detail)) return { kind: "request_error", error };
    return { kind: "http_error", status: response.status, error };
  }
  const data = await response.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content ?? "";
  if (responseHasColorWord(content)) return { kind: "success" };
  return { kind: "weak_response" };
}
async function probeVision(config, fetchFn, externalSignal, tokenParam) {
  const { signal, cleanup } = withTimeout(externalSignal, PROBE_TIMEOUT_MS);
  const errors = [];
  let sawModelReject = false;
  let sawRequestFormat = false;
  let sawWeakResponse = false;
  try {
    for (const variant of VISION_PROBE_VARIANTS) {
      try {
        const outcome = await tryVisionProbeVariant(config, fetchFn, signal, variant, tokenParam);
        if (outcome.kind === "success") {
          return {
            supported: true,
            evidence: `probe:image-call:${variant.id}`
          };
        }
        if (outcome.kind === "weak_response") {
          sawWeakResponse = true;
          errors.push(`${variant.id}: Response did not contain a recognizable color word`);
          continue;
        }
        if (outcome.kind === "model_rejects") {
          sawModelReject = true;
          errors.push(`${variant.id}: ${outcome.error}`);
          continue;
        }
        const errMsg = outcome.error;
        if (isModelRejectsVisionError(errMsg)) sawModelReject = true;
        else if (isRequestFormatError(errMsg)) sawRequestFormat = true;
        errors.push(`${variant.id}: ${errMsg}`);
      } catch (error) {
        const errMsg = describeError(error);
        if (isRequestFormatError(errMsg)) sawRequestFormat = true;
        errors.push(`${variant.id}: ${errMsg}`);
      }
    }
    const joined = errors.join(" | ");
    if (sawRequestFormat && !sawModelReject) {
      return {
        supported: false,
        inconclusive: true,
        error: joined,
        evidence: "probe:image-call:inconclusive"
      };
    }
    if (sawWeakResponse && !sawModelReject && !sawRequestFormat) {
      return {
        supported: false,
        inconclusive: true,
        error: joined,
        evidence: "probe:image-call:weak-response"
      };
    }
    if (sawModelReject) {
      return {
        supported: false,
        error: joined,
        evidence: "probe:image-call:model-rejects"
      };
    }
    return {
      supported: false,
      error: joined || "All vision probe variants failed",
      evidence: "probe:image-call"
    };
  } catch (error) {
    return {
      supported: false,
      error: describeError(error),
      evidence: "probe:image-call"
    };
  } finally {
    cleanup();
  }
}
async function probeContextLength(config, fetchFn, externalSignal) {
  const { signal, cleanup } = withTimeout(externalSignal, PROBE_TIMEOUT_MS);
  try {
    const url = `${config.baseURL}/models/${encodeURIComponent(config.model)}`;
    const response = await fetchFn(url, {
      method: "GET",
      headers: {
        ...config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}
      },
      signal
    });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      return {
        supported: false,
        error: `HTTP ${response.status}: ${detail}`,
        evidence: "api:/v1/models"
      };
    }
    const raw = await response.json().catch(() => null);
    if (!raw || typeof raw !== "object") {
      return {
        supported: false,
        error: "Invalid response shape: not a JSON object",
        evidence: "api:/v1/models"
      };
    }
    const { value, fieldName } = pickContextLengthField(raw);
    if (value == null) {
      return {
        supported: false,
        error: `No context length field found (tried: ${CONTEXT_LENGTH_FIELD_CANDIDATES.join(", ")})`,
        evidence: "api:/v1/models"
      };
    }
    return {
      supported: true,
      value,
      evidence: `api:/v1/models[${fieldName}]`
    };
  } catch (error) {
    return {
      supported: false,
      error: describeError(error),
      evidence: "api:/v1/models"
    };
  } finally {
    cleanup();
  }
}
function pickContextLengthField(raw) {
  const candidates = [raw];
  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
    candidates.push(raw.data);
  }
  for (const obj of candidates) {
    for (const field of CONTEXT_LENGTH_FIELD_CANDIDATES) {
      const v = obj[field];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        return { value: Math.floor(v), fieldName: field };
      }
    }
  }
  return { value: null, fieldName: "" };
}
function withTimeout(externalSignal, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }
  };
}
async function readErrorDetail(response) {
  try {
    const data = await response.json();
    return data.error?.message || response.statusText || "Unknown error";
  } catch {
    return response.statusText || "Unknown error";
  }
}
function describeError(error) {
  if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
    return `Request timed out after ${PROBE_TIMEOUT_MS}ms`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
function parseLLMConfig(config) {
  if (!config.baseURL || !config.model) {
    throw new Error("LLM_CONFIG_MISSING");
  }
  return {
    baseURL: config.baseURL,
    model: config.model,
    apiKey: config.apiKey || "",
    temperature: config.temperature,
    maxRetries: config.maxRetries ?? LLM_MAX_RETRIES,
    maxCompletionTokens: config.maxCompletionTokens ?? 0,
    customFetch: (config.customFetch ?? fetch).bind(globalThis),
    supportsVision: config.supportsVision,
    contextLength: config.contextLength,
    tokenLimitParam: config.tokenLimitParam
  };
}
class LLM extends EventTarget {
  config;
  client;
  constructor(config) {
    super();
    this.config = parseLLMConfig(config);
    this.client = new OpenAIClient(this.config);
  }
  async completeText(messages, abortSignal) {
    return await withRetry(
      async () => {
        if (abortSignal.aborted) throw new Error("AbortError");
        return await this.client.completeText(messages, abortSignal);
      },
      {
        maxRetries: this.config.maxRetries,
        onRetry: (attempt) => {
          this.dispatchEvent(
            new CustomEvent("retry", { detail: { attempt, maxAttempts: this.config.maxRetries } })
          );
        },
        onError: (error) => {
          this.dispatchEvent(new CustomEvent("error", { detail: { error } }));
        }
      }
    );
  }
}
async function withRetry(fn, settings) {
  let attempt = 0;
  let lastError = null;
  while (attempt <= settings.maxRetries) {
    if (attempt > 0) {
      settings.onRetry(attempt);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    try {
      return await fn();
    } catch (error) {
      if (error?.rawError?.name === "AbortError") throw error;
      console.error(error);
      settings.onError(error);
      if (error instanceof InvokeError && !error.retryable) throw error;
      lastError = error;
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw lastError;
}
const DEFAULT_SYSTEM_INSTRUCTION = `** 现有代码 ** 对已有代码进行迭代时，默认代码中信息和逻辑可信，微小改动也需通读全部代码，杜绝引入新异常。
** 注释与代码同等重要 ** 每3行代码需至少1行注释，确保零基础新手能独懂代码。更新代码时须同步更新注释。
** 选择器 ** 须通过 inspect_dom 实际验证，用户给出的定位等相关描述仅供参考。
** 节奏 ** 小步快跑，每步以能快速响应优先，不要强求一次全部搞定。
** BUG留档 ** 修复BUG后在对应位置注释记录现象和成因。
** 样式 ** 未明确要求默认不改动视觉元素。`;
export {
  CircleX as C,
  DEFAULT_SYSTEM_INSTRUCTION as D,
  Eye as E,
  InvokeError as I,
  LLM as L,
  InvokeErrorType as a,
  chalk as c,
  probeCapabilities as p,
  resolveLlmConfig as r
};
