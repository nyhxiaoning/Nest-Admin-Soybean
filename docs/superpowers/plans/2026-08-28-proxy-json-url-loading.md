# Proxy JSON URL Loading Implementation Plan

> **For agentic workers:** Implement this task inline; do not dispatch subagents for this single-file change.

**Goal:** Ensure every development-time URL loaded by `fetchJsonFromUrl` is requested through the frontend's same-origin proxy instead of being fetched from its original origin.

**Architecture:** Parse the supplied URL only to retain its path and query string. In development, fetch that relative URL so Vite applies the configured proxy; outside development, preserve the absolute URL because the Vite development proxy is unavailable.

**Tech Stack:** Vue 3, TypeScript, Vite 6

## Global Constraints

- Preserve the existing `/profile` Vite proxy.
- Do not compare the supplied URL origin with `VITE_API_PROXY_TARGET`.
- Remove temporary `debugger` statements.
- Do not commit the user's existing working-tree changes without an explicit commit request.

---

### Task 1: Route JSON loading through the same-origin development proxy

**Files:**
- Modify: `apps/pc-creator-center/src/modules/pixel-editor/components/editor/PixelEditor.vue`

**Interfaces:**
- Consumes: `fetchJsonFromUrl<T>(url: string): Promise<T>` callers and Vite's `/profile` proxy.
- Produces: The same `Promise<T>` result while changing only the development request URL.

- [x] Replace origin matching with an unconditional development-time `pathname + search` rewrite.
- [x] Verify `localhost`, `127.0.0.1`, and another hostname all produce the same relative request path.
- [x] Run the creator-center QA build to verify TypeScript/Vite compilation.
- [ ] When ports 3788 and 8080 are available, verify the original `/profile/...json` request no longer appears as a cross-origin browser request.
