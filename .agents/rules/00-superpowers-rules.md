---
trigger: always_on
glob:
description: Superpowers methodology rules — enforces design-before-code, TDD, systematic debugging, and verification-before-completion on every task. Based on https://github.com/obra/superpowers.
---

## 1. Design Before Code (Mandatory)

Never write code before a design is agreed upon.

When a user says "let's build X" or "add feature Y":
- Stop. Do not open any file or write any code yet.
- Ask clarifying questions **one at a time** to understand the real goal.
- Prefer multiple-choice questions to open-ended ones.
- Assess scope first: if the request spans multiple independent subsystems, propose decomposing into sub-projects before going deeper.
- Present a design summary in short sections the user can actually read and approve.
- Only proceed to planning after the user explicitly approves the design.
- Save the design document to `docs/superpowers/YYYY-MM-DD-<feature>-design.md` and commit it.

**Never invoke implementation work during brainstorming. The only output of brainstorming is a design document.**

---

## 2. Plan Before Implementation (Mandatory)

After design approval, write a detailed implementation plan before touching any code.

A good plan includes:
- A file structure map: which files will be created or modified and what each one is responsible for. Lock in decomposition decisions here.
- Tasks broken into **2–5 minute units** — small enough that each can be verified independently.
- For each task: exact file paths, the code to write, the verification command to run, and the expected outcome.
- Every task has a pre-written git commit message.

Save the plan to `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`.

If the plan covers multiple independent subsystems, split into separate plan files — one per subsystem. Each should produce working, testable software on its own.

---

## 3. Test-Driven Development — Iron Law (Rigid, No Exceptions)

**No production code without a failing test first.**

The cycle is strictly: **RED → GREEN → REFACTOR**

1. **RED**: Write the test. Run it. Confirm it fails. If it passes without new code, the test is wrong — delete it and start over.
2. **GREEN**: Write the minimal code to make the test pass. Nothing more.
3. **REFACTOR**: Clean up. Run tests again. They must still pass.
4. Commit after each passing RED-GREEN-REFACTOR cycle.

**Hard rules:**
- If code was written before its test, delete the code and start from RED.
- Do not write multiple tests at once before making them pass one by one.
- Tests must be real: they must actually fail before the code exists.
- YAGNI (You Aren't Gonna Need It): write only what the current test requires.
- DRY (Don't Repeat Yourself): remove duplication in the refactor step.

---

## 4. Systematic Debugging (Rigid, No Exceptions)

**Never propose a fix before completing root cause investigation.**

When a bug, test failure, or unexpected behavior appears:

**Phase 1 — Gather evidence (required before anything else):**
- Read the full error message carefully.
- Reproduce the issue reliably.
- Check what changed recently (git log).
- In multi-component systems: log what enters and exits each component boundary to find exactly where it breaks.

**Phase 2 — Pattern analysis:**
- Is this an isolated bug or does a similar pattern appear elsewhere?
- What conditions trigger it consistently?

**Phase 3 — Form and test a hypothesis:**
- State a specific hypothesis about the root cause.
- Write a test that proves or disproves it.

**Phase 4 — Fix with evidence:**
- Apply the fix only after the root cause is understood.
- Write or update tests that would have caught this bug.
- Verify the fix didn't break anything else.

**If 3 or more fix attempts have failed**: Stop. Question the architecture. Do not keep patching symptoms — discuss with the user whether a design change is needed.

**Symptom fixes without root cause = failure. Always.**

---

## 5. Verification Before Completion (Mandatory)

Never declare a task "done" by claiming it works. Prove it.

Before marking any task complete:
- Run the exact verification commands specified in the plan.
- Capture the actual command output as evidence.
- Confirm all tests pass.
- Only mark complete after validation, not after writing the code.

A task is done when tests pass and evidence is captured — not when the code is written.

---

## 6. File and Code Organization

- Each file has **one clear responsibility**. If a file is doing two things, split it.
- If a file is growing large during implementation, flag it and discuss splitting before continuing.
- Design for isolation: units should have clear boundaries and well-defined interfaces so they can be tested independently.
- When working in an existing codebase: follow existing patterns. Make targeted, minimal changes. Do not refactor code that isn't directly related to the current task.
- Context isolation for subagents: each subagent receives only the context relevant to its specific task — not the entire plan.

---

## 7. Code Quality Standards

- **Complexity**: prefer the simplest solution that passes the tests. Complexity is a cost, not a feature.
- **YAGNI**: do not add functionality that isn't required by the current plan task.
- **DRY**: eliminate duplication in the refactor step. But don't over-abstract prematurely.
- **Commits**: one logical change per commit. Use the commit message from the plan. Always commit after a passing test cycle.
- **Secrets**: never commit credentials, API keys, tokens, or passwords. If found in existing code, flag immediately.

---

## 8. Code Review Standards

Before marking a branch ready for merge:

**Spec compliance check (first):**
- Does the implementation match what the plan described?
- Are there missing requirements or out-of-scope additions?

**Code quality check (second):**
- Are there obvious bugs or logic errors?
- Is test coverage adequate?
- Are files growing too large (doing more than one thing)?
- Does the code follow existing project conventions?

Severity levels: **Critical** (blocks merge) → **Important** (fix before ship) → **Nice-to-have** (optional).

---

## 9. Priority and Override Rules

- User's explicit instructions (direct requests, project-specific rules) always take highest priority.
- These rules override default agent behavior where they conflict.
- Rigid rules (TDD, systematic debugging, verification) must be followed exactly — do not rationalize skipping them on "simple" tasks.
- Flexible rules (brainstorming style, plan format) can be adapted to context.
- When in doubt whether a rule applies: apply it. The cost of skipping a necessary check is higher than the cost of running an unnecessary one.
