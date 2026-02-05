# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Jay Framework Project Rules

## Design Log Methodology

The project follows a rigorous design log methodology for all significant features and architectural changes.



### Before Making Changes
1. Check design logs in `./design-log/` for existing designs and implementation notes
2. For new features: Create design log first, get approval, then implement
3. Read related design logs to understand context and constraints

### When Creating Design Logs
1. Structure: Background → Problem → Questions and Answers → Design → Implementation Plan → Examples → Trade-offs
2. Be specific: Include file paths, type signatures, validation rules
3. Show examples: Use ✅\❌ for good/bad patterns, include realistic code
4. Explain why: Don't just describe what, explain rationale and trade-offs
5. Ask Questions (in the file): For anything that is not clear, or missing information
6. When answering question: keep the questions, just add answers
7. Be brief: write short explanations and only what most relevant
8. Draw Diagrams: Use mermain inline diagrams when it makes sense 
9. Commits: Create tight commit points within the design plan.

### When to Create Design Logs
   Create a design log BEFORE implementation when:
   - Adding a new service or module
   - Changing data flow between components
   - Modifying Kafka topics or Consul schema
   - Any change touching 3+ files

### When Implementing
1. Follow the implementation plan phases from the design log
2. Write tests first or update existing tests to match new behavior
3. Do not Update design log initial section once implementation started
4. Append design log with "Implementation Results" section as you go
5. Document deviations: Explain why implementation differs from design
6. Run tests: Include test results (X/Y passing) in implementation notes
7. After Implementation add a summary of deviations from original design
8. Branching: Generate a feature branch for the implementation plan
9. Commit updates when milestones are met based on the design plan commit strategy.

### When Answering Questions
1. Reference design logs by number when relevant (e.g., "See Design Log #4")
2. Use codebase terminology consistently (e.g., Edge vs Core layer, hierarchical keys)
3. Show type hints: This is a Python 3.11 project with dataclasses and type annotations
4. Consider backward compatibility: Default to non-breaking changes


# Interactive CLI Verification via tmux (Required)

When you need to run or validate anything in an interactive CLI (builds, tests, REPLs, installers, long-running services, prompts, SSH sessions, etc.), use **tmux** so output is reproducible and reviewable.

## Core Rule
Do not “assume” CLI results. Execute commands in tmux, capture the output, and verify it matches expectations.

---

## tmux Session Pattern (Always Use)

### 1) Create or reuse a dedicated session
- Use a stable session name per task, e.g. `agent` or `verify`.
- If the session exists, reuse it; otherwise create it.

Commands:
- `tmux has-session -t <name> 2>/dev/null || tmux new-session -d -s <name>`
- Optional: `tmux rename-window -t <name>:0 main`

### 2) Send commands to the session
- Send exactly the command you want to run.
- Include `Enter` (C-m).
- Prefer non-interactive flags where possible (`--yes`, `--no-prompt`, etc.).
- If you must answer prompts, send responses as separate `send-keys` steps.

Commands:
- `tmux send-keys -t <name> "<command>" C-m`

### 3) Capture output for inspection
- After sending a command, capture the pane output.
- Capture enough lines to include context and any errors.

Commands:
- `tmux capture-pane -t <name> -p -S -2000`

### 4) Verify the result (Mandatory)
You must explicitly verify:
- Exit status (when feasible): prefer wrapping commands so exit code is visible.
- Expected output patterns exist.
- No error keywords (“error”, “traceback”, “failed”, “panic”, “exception”).
- If it’s a build/test: confirm artifact exists and/or tests passed.
- If it’s a server: confirm it started and responds (curl/healthcheck).

**Strongly recommended wrapper** (makes exit code obvious):
- `bash -lc '<command>'; echo "__EXIT_CODE=$?__"`

Example:
- `tmux send-keys -t <name> "bash -lc 'pytest -q'; echo __EXIT_CODE=$?__" C-m`

Then capture and confirm `__EXIT_CODE=0__`.

---

## Timing / Waiting (Avoid Guessing)
Do not “sleep 10” blindly. Prefer deterministic checks:
- Poll for a file/artifact: `test -f <path> && echo READY`
- Poll a port: `nc -z localhost 8080 && echo UP`
- Poll HTTP: `curl -sf http://localhost:8080/health && echo OK`

If you must wait briefly, do it minimally (e.g., 0.2–1.0s) and re-check.

---

## Long-running Processes
If a command keeps running (server, tail, watch):
- Start it in tmux.
- Verify it’s running by capturing logs and checking a health endpoint.
- Use a second pane/window if needed.

Useful:
- New window: `tmux new-window -t <name> -n logs`
- Stop process: send Ctrl-C: `tmux send-keys -t <name> C-c`

---

## Cleanliness / Reproducibility
- Prefer a known working directory: `cd <repo>` at the start of the session.
- Echo context before major steps: `pwd`, `ls`, `git rev-parse --short HEAD`.
- Do not delete the session unless asked; it’s useful for audit trails.

---

## Self-Verification Requirement (for any produced output)
If you generate code, commands, configs, research summaries, or claims:
1) Re-run/validate in tmux when possible (lint/tests/format/build).
2) If something cannot be executed, do a reasoned verification (cross-check assumptions, constraints, invariants).
3) End with a **Verification Table**:

| Item / Claim | How Verified | Result | Evidence (tmux output snippet / file path) |
|---|---|---|---|
| ... | ... | PASS/FAIL/PARTIAL | ... |

Only mark PASS when you actually checked.

---

## Minimal tmux “recipe” example
1. Start session:
- `tmux has-session -t verify 2>/dev/null || tmux new-session -d -s verify`

2. Run tests with exit code:
- `tmux send-keys -t verify "bash -lc 'cd repo && pytest -q'; echo __EXIT_CODE=$?__" C-m`

3. Capture:
- `tmux capture-pane -t verify -p -S -2000`

4. Verify:
- Confirm `__EXIT_CODE=0__` and “no failures”.
