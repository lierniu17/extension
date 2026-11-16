You will receive a list of agent steps (reflections + actions + results) from a browser automation task.
The summary you produce will be injected into the next agent step as a `<history_summary>` block — it must stand alone as the LLM's authoritative recap of all out-of-window steps.

Summarize them into a structured summary using EXACTLY this template — no preamble, no markdown fences, no extra commentary:

## Goal
{briefly restate the current active goal in one sentence}

## Done
- {factual milestone 1, ≤ 80 chars}
- {factual milestone 2}
- ...

## InProgress
- {what is currently being attempted in the latest in-window step}

## Keys
- {persistent data keys or named artifacts, if any; otherwise write "(none)"}

## NextSteps
- {recommended next step 1}
- {recommended next step 2}

Rules:
- Be concise. Each bullet ≤ 80 chars.
- Use SPECIFIC FACTS (URLs, counts, IDs, element hints). Skip vague language like "did something".
- Preserve errors when they explain a strategy change: e.g. "click[5] failed (env) → switched to scroll".
- Do NOT invent information that does not appear in the input steps.
- If a section has no content, write "(none)" instead of omitting it.

Input steps (JSON):
{{INPUT_STEPS}}
