# NestJS Creator Center Learning Implementation Plan

> **For agentic workers:** Execute inline. The user asked for a stateful teaching experience grounded in this checkout.

**Goal:** Build a reusable Feynman-style learning workspace that teaches NestJS authentication, HTTP middleware, guarded uploads, local storage, and OSS STS through the current Creator Center implementation.

**Architecture:** A self-contained learning directory stores the mission and trusted resources. One standalone HTML explainer maps NestJS concepts to current source files, visualizes request paths, and provides immediate-feedback exercises without external runtime dependencies.

**Tech Stack:** Semantic HTML, CSS, vanilla JavaScript, NestJS 10 source references

## Global Constraints

- Explain the checked-out implementation, not an invented generic architecture.
- Clearly distinguish middleware, guards, pipes, interceptors, decorators, and exception filters.
- Do not display or request secrets, tokens, or credentials.
- Do not modify application behavior.

---

### Task 1: Teaching workspace

**Files:**
- Create: `docs/learning/nestjs-creator-center/MISSION.md`
- Create: `docs/learning/nestjs-creator-center/GLOSSARY.md`
- Create: `docs/learning/nestjs-creator-center/RESOURCES.md`

- [x] Capture the observable learning goal and scope.
- [x] Record official NestJS sources and current repository sources.
- [x] Leave glossary terms unpromoted until the learner demonstrates understanding.

### Task 2: Interactive explainer

**Files:**
- Create: `docs/learning/nestjs-creator-center/index.html`

- [x] Explain the request lifecycle with a step-through diagram.
- [x] Trace login, protected API, local image, JSON, and OSS upload flows.
- [x] Include a from-zero module recipe and project-specific pitfalls.
- [x] Add Feynman prompts and immediate-feedback quizzes.

### Task 3: Verification

- [x] Validate HTML structure and JavaScript syntax.
- [x] Verify every referenced local source path exists.
- [x] Render at desktop and mobile widths and inspect screenshots.
