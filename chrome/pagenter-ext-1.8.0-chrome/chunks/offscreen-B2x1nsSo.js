import "./db-C_cyLlZZ.js";
import { p as putSample, g as getApi, u as updateApi, f as getProject, o as updateProject, t as trimSamplesByApi, e as getLatestSpecByApi, c as countSamplesByApi, m as putSpec } from "./db-C3Se-Bze.js";
const MAX_EXAMPLES = 5;
const MAX_ENUM_CANDIDATES = 20;
const MAX_SAMPLE_STRING_LENGTH = 120;
function incrementSampleCount(schema) {
  const prev = typeof schema["x-sample-count"] === "number" ? schema["x-sample-count"] : 0;
  schema["x-sample-count"] = prev + 1;
}
function computeConfidence(sampleCount) {
  if (sampleCount >= 20) return "high";
  if (sampleCount >= 5) return "medium";
  return "low";
}
function appendExample(schema, value) {
  const arr = Array.isArray(schema["x-examples"]) ? schema["x-examples"] : [];
  let v = value;
  if (typeof v === "string" && v.length > MAX_SAMPLE_STRING_LENGTH) {
    v = v.slice(0, MAX_SAMPLE_STRING_LENGTH) + "…";
  }
  const serialized = safeStringify(v);
  if (arr.some((e) => safeStringify(e) === serialized)) return;
  arr.push(v);
  if (arr.length > MAX_EXAMPLES) arr.shift();
  schema["x-examples"] = arr;
}
function safeStringify(v) {
  try {
    return JSON.stringify(v);
  } catch {
    return "<circular>";
  }
}
function getJsonType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string") return "string";
  if (t === "boolean") return "boolean";
  if (t === "number") {
    return Number.isInteger(value) ? "integer" : "number";
  }
  return "object";
}
function mergeSample(current, value) {
  const valueType = getJsonType(value);
  if (!current) {
    return createFreshSchema(value);
  }
  if (Array.isArray(current.anyOf)) {
    return mergeIntoAnyOf(current, value, valueType);
  }
  const currentType = schemaMainType(current);
  if (currentType === valueType || typesCompatible(currentType, valueType)) {
    return mergeIntoMonoType(current, value, valueType);
  }
  const newBranch = createFreshSchema(value);
  const prevCount = typeof current["x-sample-count"] === "number" ? current["x-sample-count"] : 0;
  const combined = {
    anyOf: [current, newBranch],
    "x-sample-count": prevCount + 1
  };
  combined["x-confidence"] = computeConfidence(combined["x-sample-count"]);
  return combined;
}
function schemaMainType(s) {
  const t = s.type;
  if (typeof t === "string") return t;
  return null;
}
function typesCompatible(a, b) {
  if (a === null) return false;
  if (a === b) return true;
  if (a === "integer" && b === "number" || a === "number" && b === "integer") return true;
  return false;
}
function createFreshSchema(value) {
  const type = getJsonType(value);
  const s = { type };
  s["x-sample-count"] = 1;
  s["x-confidence"] = "low";
  if (type === "string" || type === "number" || type === "integer" || type === "boolean") {
    appendExample(s, value);
    s["x-enum-candidates"] = [value];
    if (type === "string") {
      const len = value.length;
      s.minLength = len;
      s.maxLength = len;
    }
    if (type === "number" || type === "integer") {
      const n = value;
      s.minimum = n;
      s.maximum = n;
    }
  }
  if (type === "array") {
    const arr = value;
    let itemsSchema = null;
    for (const el of arr) {
      itemsSchema = mergeSample(itemsSchema, el);
    }
    s.items = itemsSchema ?? {};
    s.minItems = arr.length;
    s.maxItems = arr.length;
  }
  if (type === "object") {
    const obj = value;
    const properties = {};
    const required = [];
    for (const [k, v] of Object.entries(obj)) {
      properties[k] = createFreshSchema(v);
      required.push(k);
    }
    s.properties = properties;
    s.required = required;
    s["x-object-observed"] = 1;
  }
  return s;
}
function mergeIntoMonoType(schema, value, valueType) {
  incrementSampleCount(schema);
  schema["x-confidence"] = computeConfidence(schema["x-sample-count"]);
  const currentType = schemaMainType(schema);
  if (currentType === "integer" && valueType === "number") {
    schema.type = "number";
  }
  if (valueType === "string" || valueType === "number" || valueType === "integer" || valueType === "boolean") {
    mergePrimitive(schema, value, valueType);
  } else if (valueType === "array") {
    mergeArray(schema, value);
  } else if (valueType === "object") {
    mergeObjectFields(schema, value);
  }
  return schema;
}
function mergePrimitive(schema, value, valueType) {
  appendExample(schema, value);
  updateEnumCandidates(schema, value);
  if (valueType === "string") {
    const len = value.length;
    const prevMin = typeof schema.minLength === "number" ? schema.minLength : len;
    const prevMax = typeof schema.maxLength === "number" ? schema.maxLength : len;
    schema.minLength = Math.min(prevMin, len);
    schema.maxLength = Math.max(prevMax, len);
  }
  if (valueType === "number" || valueType === "integer") {
    const n = value;
    const prevMin = typeof schema.minimum === "number" ? schema.minimum : n;
    const prevMax = typeof schema.maximum === "number" ? schema.maximum : n;
    schema.minimum = Math.min(prevMin, n);
    schema.maximum = Math.max(prevMax, n);
  }
}
function mergeArray(schema, arr) {
  let items = schema.items ?? null;
  for (const el of arr) {
    items = mergeSample(items, el);
  }
  schema.items = items ?? {};
  const prevMin = typeof schema.minItems === "number" ? schema.minItems : arr.length;
  const prevMax = typeof schema.maxItems === "number" ? schema.maxItems : arr.length;
  schema.minItems = Math.min(prevMin, arr.length);
  schema.maxItems = Math.max(prevMax, arr.length);
}
function mergeObjectFields(schema, obj) {
  const properties = schema.properties ?? {};
  const required = Array.isArray(schema.required) ? [...schema.required] : [];
  const observed = (typeof schema["x-object-observed"] === "number" ? schema["x-object-observed"] : 0) + 1;
  schema["x-object-observed"] = observed;
  const seenKeys = new Set(Object.keys(obj));
  for (const [k, v] of Object.entries(obj)) {
    const existing = properties[k];
    if (existing) {
      properties[k] = mergeSample(existing, v);
    } else {
      properties[k] = createFreshSchema(v);
      properties[k]["x-field-seen"] = 1;
    }
    const rawSeen = properties[k]["x-field-seen"];
    const seen = typeof rawSeen === "number" ? rawSeen : 0;
    properties[k]["x-field-seen"] = seen + 1;
  }
  for (const k of Object.keys(properties)) {
    if (!seenKeys.has(k)) {
      const idx = required.indexOf(k);
      if (idx >= 0) required.splice(idx, 1);
    }
  }
  for (const [k, ps] of Object.entries(properties)) {
    const rawSeen = ps["x-field-seen"];
    const seen = typeof rawSeen === "number" ? rawSeen : 0;
    const rate = observed > 0 ? seen / observed : 0;
    ps["x-presence-rate"] = Math.round(rate * 1e3) / 1e3;
    if (rate < 1) {
      const idx = required.indexOf(k);
      if (idx >= 0) required.splice(idx, 1);
    }
  }
  schema.properties = properties;
  schema.required = required;
}
function updateEnumCandidates(schema, value) {
  if (typeof value === "boolean") return;
  const candidates = Array.isArray(schema["x-enum-candidates"]) ? schema["x-enum-candidates"] : [];
  if (schema["x-enum-candidates"] === null) return;
  const serialized = safeStringify(value);
  const exists = candidates.some((c) => safeStringify(c) === serialized);
  if (!exists) candidates.push(value);
  if (candidates.length > MAX_ENUM_CANDIDATES) {
    schema["x-enum-candidates"] = null;
    delete schema.enum;
    return;
  }
  schema["x-enum-candidates"] = candidates;
  if (candidates.length >= 2) {
    schema.enum = [...candidates];
  }
}
function mergeIntoAnyOf(schema, value, valueType) {
  incrementSampleCount(schema);
  schema["x-confidence"] = computeConfidence(schema["x-sample-count"]);
  const branches = schema.anyOf;
  let matched = false;
  for (let i = 0; i < branches.length; i++) {
    const b = branches[i];
    const bt = schemaMainType(b);
    if (bt === valueType || typesCompatible(bt, valueType)) {
      branches[i] = mergeSample(b, value);
      matched = true;
      break;
    }
  }
  if (!matched) {
    branches.push(createFreshSchema(value));
  }
  return schema;
}
function structuralHash(schema) {
  if (!schema) return "null";
  const normalized = normalizeForHash(schema);
  const json = JSON.stringify(normalized);
  let h = 5381;
  for (let i = 0; i < json.length; i++) {
    h = h * 33 + (json.codePointAt(i) ?? 0) >>> 0;
  }
  return h.toString(16);
}
function normalizeForHash(node) {
  if (node === null || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(normalizeForHash);
  const out = {};
  const keys = Object.keys(node).sort((a, b) => a.localeCompare(b));
  for (const k of keys) {
    if (k.startsWith("x-")) continue;
    const v = node[k];
    if ((k === "required" || k === "enum") && Array.isArray(v)) {
      const normalized = v.map((x) => typeof x === "object" ? normalizeForHash(x) : x);
      out[k] = [...normalized].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      continue;
    }
    out[k] = normalizeForHash(v);
  }
  return out;
}
const queues = /* @__PURE__ */ new Map();
function enqueueForApi(apiId, task) {
  const prev = queues.get(apiId) ?? Promise.resolve();
  const next = prev.then(task).catch((err) => {
    console.error(`[SniffAnalyzer] task failed for api ${apiId}:`, err);
  });
  queues.set(apiId, next);
  return next;
}
function ingestSample(sample) {
  return enqueueForApi(sample.apiId, async () => {
    await processSample(sample);
  });
}
async function processSample(sample) {
  await putSample(sample);
  const api = await getApi(sample.apiId);
  if (!api) {
    console.warn(`[SniffAnalyzer] api not found: ${sample.apiId}`);
    return;
  }
  const newCount = api.sampleCount + 1;
  await updateApi(sample.apiId, {
    sampleCount: newCount,
    lastSeenAt: sample.timestamp
  });
  const project = await getProject(sample.projectId);
  if (project) {
    await updateProject(sample.projectId, {
      stats: {
        ...project.stats,
        // 新采一条就 +1；API 数由 upsertApi 时维护，此处不动
        totalSamples: project.stats.totalSamples + 1,
        lastSampleAt: sample.timestamp
      }
    });
  }
  await updateSpecFromSample(sample);
  if (newCount % 10 === 0 && project) {
    await trimSamplesByApi(sample.apiId, project.config.maxSamplesPerApi);
  }
}
async function updateSpecFromSample(sample) {
  const inputValue = decodeInput(sample);
  const outputValue = decodeBody(sample.resBody);
  if (inputValue === UNDECODABLE && outputValue === UNDECODABLE) return;
  const latest = await getLatestSpecByApi(sample.apiId);
  const prevInput = latest?.inputSchema ?? null;
  const prevOutput = latest?.outputSchema ?? null;
  const nextInput = inputValue === UNDECODABLE ? prevInput : mergeSample(prevInput, inputValue);
  const nextOutput = outputValue === UNDECODABLE ? prevOutput : mergeSample(prevOutput, outputValue);
  const hashBefore = latest?.structuralHash ?? "";
  const hashAfter = combinedHash(nextInput, nextOutput);
  const structuralChanged = hashBefore !== hashAfter;
  const sampleCount = await countSamplesByApi(sample.apiId);
  const confidence = confidenceByCount(sampleCount);
  if (!latest || structuralChanged) {
    const record = {
      id: crypto.randomUUID(),
      apiId: sample.apiId,
      version: (latest?.version ?? 0) + 1,
      structuralHash: hashAfter,
      inputSchema: nextInput,
      outputSchema: nextOutput,
      basedOnSampleIds: [sample.id],
      confidence,
      createdAt: Date.now()
    };
    await putSpec(record);
    await updateApi(sample.apiId, { currentSpecId: record.id });
  } else {
    const updated = {
      ...latest,
      inputSchema: nextInput,
      outputSchema: nextOutput,
      // 保留原有 + 追加（最多保留 50 个，防止膨胀）
      basedOnSampleIds: appendCapped(latest.basedOnSampleIds, sample.id, 50),
      confidence
    };
    await putSpec(updated);
  }
}
function appendCapped(arr, v, cap) {
  const next = [...arr, v];
  return next.length > cap ? next.slice(next.length - cap) : next;
}
function combinedHash(input, output) {
  return `${structuralHash(input)}|${structuralHash(output)}`;
}
function confidenceByCount(count) {
  if (count < 5) return "L1";
  if (count < 20) return "L2";
  if (count < 50) return "L3";
  return "L4";
}
const UNDECODABLE = /* @__PURE__ */ Symbol("undecodable");
function decodeBody(body) {
  if (!body) return UNDECODABLE;
  if (body.encoding === "base64") return UNDECODABLE;
  const mime = (body.mimeType ?? "").toLowerCase();
  const raw = body.data;
  if (mime.includes("json") || mime === "") {
    try {
      const trimmed = raw.trim();
      if (!trimmed) return UNDECODABLE;
      if (!mime && !/^[[{]/.test(trimmed)) return UNDECODABLE;
      return JSON.parse(trimmed);
    } catch {
      return UNDECODABLE;
    }
  }
  if (mime.includes("x-www-form-urlencoded")) {
    try {
      const params = new URLSearchParams(raw);
      const obj = {};
      for (const [k, v] of params.entries()) obj[k] = v;
      return obj;
    } catch {
      return UNDECODABLE;
    }
  }
  return UNDECODABLE;
}
function decodeInput(sample) {
  let queryObj = null;
  try {
    const u = new URL(sample.url);
    queryObj = {};
    for (const [k, v] of u.searchParams.entries()) queryObj[k] = v;
  } catch {
    queryObj = null;
  }
  const bodyValue = decodeBody(sample.reqBody);
  if (bodyValue === UNDECODABLE && (!queryObj || Object.keys(queryObj).length === 0)) {
    return UNDECODABLE;
  }
  if (bodyValue !== UNDECODABLE && typeof bodyValue === "object" && bodyValue !== null) {
    return {
      // body 的字段直接展开
      ...bodyValue,
      // query 作为一个子对象挂在 __query 下
      ...queryObj && Object.keys(queryObj).length > 0 ? { __query: queryObj } : {}
    };
  }
  return queryObj && Object.keys(queryObj).length > 0 ? { __query: queryObj } : UNDECODABLE;
}
chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (!isSniffMessage(message)) return void 0;
    if (message.type === "SNIFF_SAMPLE_INGEST") {
      ingestSample(message.sample).then(() => sendResponse({ ok: true })).catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }
    if (message.type === "SNIFF_ANALYZE_TRIGGER") {
      sendResponse({ ok: true, note: "rebuild not yet implemented" });
      return void 0;
    }
    return void 0;
  }
);
setInterval(() => {
  chrome.runtime.sendMessage({ type: "OFFSCREEN_PING", at: Date.now() }).catch(() => {
  });
}, 15e3);
console.log("[Sniff/offscreen] ready at", (/* @__PURE__ */ new Date()).toISOString());
function isSniffMessage(m) {
  if (!m || typeof m !== "object") return false;
  const t = m.type;
  return t === "SNIFF_SAMPLE_INGEST" || t === "SNIFF_ANALYZE_TRIGGER";
}
