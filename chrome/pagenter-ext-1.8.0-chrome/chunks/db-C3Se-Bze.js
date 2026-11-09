import { g as getDB } from "./db-C_cyLlZZ.js";
const DEFAULT_PROJECT_CONFIG = {
  // 单个 body 超过 256KB 就截断（防止超大 JSON 塞爆 IDB）
  maxBodyKB: 256,
  // 默认忽略的 mime 类型（图片、字体、视频、音频）
  excludeMimePatterns: ["image/", "font/", "video/", "audio/"],
  // URL 黑名单（默认空，用户可配）
  excludeUrlPatterns: [],
  // 默认不抓静态资源（节省空间）
  captureStaticResources: false,
  // 默认启用 PII 脱敏
  enablePiiScrub: true,
  // 每个 API 最多保留 200 条样本，超出按时间滚动淘汰
  maxSamplesPerApi: 200
};
async function createProject(input) {
  const db = await getDB();
  const now = Date.now();
  const record = {
    id: crypto.randomUUID(),
    name: input.name,
    originPatterns: input.originPatterns,
    status: "idle",
    createdAt: now,
    updatedAt: now,
    // 配置合并默认值；未提供则直接用默认
    config: input.config ? { ...DEFAULT_PROJECT_CONFIG, ...input.config } : { ...DEFAULT_PROJECT_CONFIG },
    stats: { totalSamples: 0, totalApis: 0 }
  };
  await db.put("sniff_projects", record);
  return record;
}
async function getProject(id) {
  const db = await getDB();
  return db.get("sniff_projects", id);
}
async function listProjects() {
  const db = await getDB();
  const all = await db.getAllFromIndex("sniff_projects", "by-updated");
  return all.reverse();
}
async function updateProject(id, patch) {
  const db = await getDB();
  const existing = await db.get("sniff_projects", id);
  if (!existing) throw new Error(`Project ${id} not found`);
  const next = { ...existing, ...patch, updatedAt: Date.now() };
  await db.put("sniff_projects", next);
  return next;
}
async function deleteProject(id) {
  const db = await getDB();
  const tx = db.transaction(
    ["sniff_projects", "sniff_apis", "sniff_samples", "sniff_specs", "sniff_annotations"],
    "readwrite"
  );
  const apis = await tx.objectStore("sniff_apis").index("by-project").getAll(id);
  const apiIds = apis.map((a) => a.id);
  for (const apiId of apiIds) {
    const sampleKeys = await tx.objectStore("sniff_samples").index("by-api").getAllKeys(apiId);
    for (const key of sampleKeys) {
      await tx.objectStore("sniff_samples").delete(key);
    }
    const specKeys = await tx.objectStore("sniff_specs").index("by-api").getAllKeys(apiId);
    for (const key of specKeys) {
      await tx.objectStore("sniff_specs").delete(key);
    }
    const annoKeys = await tx.objectStore("sniff_annotations").index("by-api").getAllKeys(apiId);
    for (const key of annoKeys) {
      await tx.objectStore("sniff_annotations").delete(key);
    }
    await tx.objectStore("sniff_apis").delete(apiId);
  }
  await tx.objectStore("sniff_projects").delete(id);
  await tx.done;
}
async function getApi(id) {
  const db = await getDB();
  return db.get("sniff_apis", id);
}
async function listApisByProject(projectId) {
  const db = await getDB();
  const apis = await db.getAllFromIndex("sniff_apis", "by-project", projectId);
  return apis.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}
async function updateApi(id, patch) {
  const db = await getDB();
  const existing = await db.get("sniff_apis", id);
  if (!existing) throw new Error(`Api ${id} not found`);
  const next = { ...existing, ...patch };
  await db.put("sniff_apis", next);
  return next;
}
async function putSample(sample) {
  const db = await getDB();
  await db.put("sniff_samples", sample);
}
async function listSamplesByApi(apiId, limit = 20) {
  const db = await getDB();
  const samples = await db.getAllFromIndex("sniff_samples", "by-api", apiId);
  return samples.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}
async function countSamplesByApi(apiId) {
  const db = await getDB();
  return db.countFromIndex("sniff_samples", "by-api", apiId);
}
async function trimSamplesByApi(apiId, keep) {
  const db = await getDB();
  const all = await db.getAllFromIndex("sniff_samples", "by-api", apiId);
  if (all.length <= keep) return 0;
  const sorted = all.sort((a, b) => b.timestamp - a.timestamp);
  const toDelete = sorted.slice(keep);
  const tx = db.transaction("sniff_samples", "readwrite");
  for (const s of toDelete) {
    await tx.store.delete(s.id);
  }
  await tx.done;
  return toDelete.length;
}
async function putSpec(spec) {
  const db = await getDB();
  await db.put("sniff_specs", spec);
}
async function listSpecsByApi(apiId) {
  const db = await getDB();
  const specs = await db.getAllFromIndex("sniff_specs", "by-api", apiId);
  return specs.sort((a, b) => a.version - b.version);
}
async function getLatestSpecByApi(apiId) {
  const specs = await listSpecsByApi(apiId);
  return specs.at(-1);
}
async function listUpstreamMcpServers() {
  const db = await getDB();
  const all = await db.getAllFromIndex("upstream_mcp_servers", "by-updated");
  return all.reverse();
}
async function getUpstreamMcpServerByName(name) {
  const db = await getDB();
  return db.getFromIndex("upstream_mcp_servers", "by-name", name);
}
async function deleteUpstreamMcpServer(id) {
  const db = await getDB();
  await db.delete("upstream_mcp_servers", id);
}
async function putUpstreamMcpServer(record) {
  const db = await getDB();
  await db.put("upstream_mcp_servers", record);
}
export {
  createProject as a,
  deleteUpstreamMcpServer as b,
  countSamplesByApi as c,
  deleteProject as d,
  getLatestSpecByApi as e,
  getProject as f,
  getApi as g,
  getUpstreamMcpServerByName as h,
  listProjects as i,
  listSamplesByApi as j,
  listUpstreamMcpServers as k,
  listApisByProject as l,
  putSpec as m,
  putUpstreamMcpServer as n,
  updateProject as o,
  putSample as p,
  trimSamplesByApi as t,
  updateApi as u
};
