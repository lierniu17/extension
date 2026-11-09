import { g as getDB } from "./db-C_cyLlZZ.js";
const STORE = "pagenter_kv";
async function kvClearBySession(sessionId) {
  if (!sessionId) return 0;
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");
  const records = await tx.store.index("by-session").getAll(sessionId);
  for (const r of records) {
    await tx.store.delete(r.id);
  }
  await tx.done;
  return records.length;
}
export {
  kvClearBySession
};
