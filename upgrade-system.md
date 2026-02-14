Improving Reliability of Your Autonomous Loop + Auto-Promote System
Why systems like this keep failing
Autonomous “infinite loop” engineering systems fail more often from integration drift than from any single bug: the runtime entrypoints, supervision layer, promotion/merge policy, and validation gates must behave as one coherent state machine. When they don’t, you get a predictable pattern: “it works in one mode, breaks in another,” retries amplify failures, and documentation stops matching the real control plane. Designing the system as a state machine with explicit invariants (single entrypoint, stable exit codes, idempotent promotion, and observable health) is the fastest path to reliability.

A second, structural cause is retry without a contract. Retries are only safe when (a) the operation is idempotent or made idempotent, and (b) backoff and jitter prevent retry storms and cascading failures. This is described consistently across platform guidance: use exponential backoff with jitter, cap it, limit retries, and avoid “nested retry loops” that multiply load across layers.

Finally, automation that runs under background services (like macOS launch agents) commonly fails due to OS-level permissions and protected locations. Modern macOS restricts access to user data folders (notably Desktop/Documents/Downloads and some synced/remote volumes) unless the process has the right grants; this can break “works in Terminal, fails in launchd” scenarios.

High-probability failure points in your current design
Your own analysis already isolates the main issue: production is effectively anchored to the legacy .sh chain while the “reliability features” (lock, heartbeat, stall-kill, exponential backoff, supervisor state) exist primarily in the newer .mjs chain. That split creates a “two brains” control plane: tests and new features validate one runner, but production invokes another. This is the single most common reason teams “keep failing for different reasons” in automation-heavy repos: each path evolves independently until neither is trustworthy.

Beyond that, the following failure points are especially likely to show up repeatedly:

The auto-promote step is the most side-effectful operation (push, merge, push target, delete worktrees/branches). Side-effectful steps must be idempotent and must classify failures correctly (config errors vs transient errors). Platform guidance is clear that retries on non-idempotent operations can cause duplicated side effects unless the operation is designed to be safe to retry. The same principle applies here: promotion needs a “resume-safe” transaction boundary.

Your process supervision choices determine whether hangs and partial failures kill the system. The newer runner uses a detached supervisor approach with explicit “child status” modeling; this aligns with how Node’s process controls are designed to work (detached process groups + unref() so the parent can exit independently).

Background execution on macOS is a known trap: launchd expects you not to daemonize inside the job itself, and it will aggressively respawn if it thinks the process died. This is why the “supervisor inside launchd” needs to be deliberate, not accidental.

Your QA gate installs browsers/dependencies as part of the gate. That is valid, but it is expensive and can become flaky on constrained machines. Playwright’s CI guidance explicitly documents a stable install sequence (npm ci then npx playwright install --with-deps), and also recommends limiting CI parallelism for stability.

Git worktrees are powerful but unforgiving when automation leaves stale metadata or unclean working trees. Git’s own documentation highlights that worktrees have administrative metadata and need pruning/cleanup when deleted externally; drift here directly produces “mysterious failures” in follow-on automation.

Reliability principles to adopt as non-negotiable invariants
Your system will stabilize quickly if you enforce a few invariants as “policy, not preference.”

A single canonical entrypoint must exist. Every operator flow (foreground run, background run, daemon install, CI run) should call the same runner ultimately. This avoids retry policy differences, different completion detection, and different promotion behavior. Once you choose the canonical runner, everything else becomes a thin wrapper.

Retries must happen in one layer only. Best-practice guidance warns about layered retries multiplying load (e.g., 3 retries at 5 layers becomes 243 attempts) and preventing recovery. In your system, this means: put retry/backoff in the supervisor/runner layer, and keep sub-steps “fail fast” with clear exit codes.

Backoff must include jitter and must be capped. Both AWS and Google describe capped exponential backoff and jitter as core to preventing contention and cascading failures. Your new runner has backoff; treat jitter as the missing reliability feature that prevents synchronized retry storms (particularly if multiple agents run).

Promotion must be idempotent (or transactionally resumable). The most important conceptual shift: auto-promote is not a “script,” it is a workflow with checkpoints. If a network push fails after a local merge, the correct retry is “push again,” not “merge again.” This is the same “safe retries require idempotency” argument that AWS and Azure emphasize; it applies even though your side effects are Git operations rather than API operations.

Concurrency control must be lock-based and observable. Your lock+heartbeat design is aligned with common overlap-prevention patterns. For shell-level locking, flock is the standard primitive: it creates an advisory lock around a command and can fail or wait if already locked. If you keep any .sh wrappers, using flock in wrappers prevents accidental duplicate overlaps.

Process-group termination must be precise. When you spawn detached supervisors, killing only one PID may leave descendants alive. POSIX semantics allow signaling an entire process group using a negative PID, and Node’s detached-process guidance aligns with this approach. Your newer stop script’s “kill process group” design is the right direction; keep it as the standard.

Concrete remediation directions that will stop the repeated failures
This section is intentionally tactical: it’s the shortest set of changes that makes the system coherent and durable.

Make the new Node runner the canonical axis and route all execution through it. This does not require deleting shell scripts immediately; it requires that package.json scripts and daemon installers ultimately call the same canonical runner so production and tests exercise the same behavior. Node’s process model supports detached supervising processes explicitly (detached process groups + unref()), which matches what you already built.

Standardize the “background” command to run the supervisor, not the loop directly. The supervisor is where retries/backoff/self-heal belong; the loop should be a single-iteration engine plus completion detection. This also aligns with the general “single layer retries” guidance, reducing accidental amplification.

Harden completion detection so it is robust to minor formatting drift. Today you rely on a token that the agent is instructed to print “exactly.” That is a strong contract, but autonomous agents often include surrounding formatting. Treat completion detection as “token appears anywhere in output tail,” not “line equals token.” This is a small change that prevents “never completes” infinite looping.

Fix promotion invocation so the canonical runner calls an existing file. Right now, your analysis indicates the new loop tries to call a Node auto-promote entrypoint that is missing, while the shell chain calls the shell auto-promote script. Standardize to one implementation:

Either implement auto-promote.mjs as a real workflow (recommended if Node is canonical), or
Make auto-promote.mjs a deliberate wrapper around the existing shell script (acceptable as a bridge), or
Swap the Node runner to call the shell script directly and classify “missing file” as fatal config error, not retryable.
The key point is not “JS vs shell.” The key is that the canonical runner must not depend on untracked/nonexistent files, and config errors must be fatal rather than endlessly retried. The broader principle matches cloud retry guidance: do not retry failures that are not transient, and do not retry non-idempotent operations blindly.

Make auto-promote idempotent by adding checkpoints. Treat the steps as:

verify branches exist locally
push source branches (retryable)
verify merge preconditions (non-retryable if policy mismatch)
merge if not already merged (idempotent check)
push target branch (retryable)
cleanup local worktrees/branches (best-effort)
delete remote branches (best-effort)
This is the same design logic as “safe retries with idempotent operations”: retries should repeat only the safe part of the workflow.

Unify merge policy and eliminate script variants as “policy by filename.” Your repo currently exhibits policy drift via “script duplicates with different rules.” This creates operator confusion and nondeterministic expectation. Git’s semantics (e.g., --no-ff forcing merge commits) are stable, but your policy around pushing, target branch enforcement, and required branches must be centralized. Git’s merge docs explicitly define --no-ff behavior; use that as a stable primitive, but keep policy choices in one place.

Align tests to the canonical runtime contract immediately. The fastest way to recover CI trust is to make tests validate the same executable paths that production uses. In practice:

Add a test that loads package.json and verifies every referenced script path exists.
Add a test that runs npm run loop:bg:start and asserts heartbeat/state files update (for Node path).
Either update track-growth-loop.mjs to implement the analytics summary expected by tests, or explicitly change the tests to match the current spec and document the reduced dashboard.
This is less about “more tests” and more about ensuring that tests validate the entrypoint contract rather than a side-path.

Make macOS daemon operation an explicit supported mode, not an implicit assumption. Apple’s launchd guidance includes behavioral constraints (don’t daemonize yourself, treat SIGTERM properly), and macOS privacy protections can block access to protected folders in headless/daemon contexts. Your runbook already notes path sensitivity; formalize it as a requirement: repo must live in a non-protected path for unattended operation, or the invoking binaries must have the needed privacy grants.

Stabilize Playwright installation in the QA gate. Your current gate installs Chromium dependencies every time. Playwright’s CI doc shows the canonical approach, and it also recommends reducing worker parallelism in CI for stability. Consider moving browser installation into a one-time setup (CI image layer or caching strategy) and keeping the gate focused on lint/build/test execution.

Operational checklist to keep the loop stable over weeks
A weekly-stable loop needs “operational safety rails,” not just “correct scripts.”

Use lock + heartbeat as the operator interface. Heartbeat should convey: session id, iteration, last output time, failure streak, and the current phase (ensure backlog, run codex, promote, cleanup). Your current design is already close; the key is enforcing that every runner writes heartbeat consistently so status commands always work.

Apply jitter to backoff. Even if you only run one loop today, jitter prevents synchronized retries when you eventually run multiple loops (or when a supervisor restarts quickly). Both AWS and Google emphasize jitter specifically to avoid coordinated retry storms.

Make failure classification explicit. A missing script file, malformed PRD, or policy mismatch is not transient; it should flip the system to “fatal/config error” and stop or alert, not retry forever. This mirrors general retry guidance: retry only when you understand the failure and it is likely transient.

Keep retries at one layer. If the supervisor handles restarts with backoff, do not add additional “retry loops” inside auto-promote and inside codex execution unless they are strictly local and bounded. This avoids cascading amplification described in distributed-systems retry guidance.

Treat Git worktree cleanup as part of the contract. Worktree automation is reliable when cleanup runs automatically and stale metadata is pruned. Git documents worktree prune behavior and the existence of administrative files that can become stale; your automation should assume it must clean up after crashes.

Ensure stop kills the whole process group when detached. POSIX defines negative PID signaling semantics for process groups, and Node’s detached process guidance explicitly creates a new process group/session on non-Windows platforms. Your stop script’s process-group branch is the right model—make it the default for supervisor-based background execution.

A realistic evolution path after stabilization
Once the system stops failing “for different reasons,” you can add sophistication safely.

Move policy to “policy-as-code.” Create a single policy file (for example loop/policy.json) that defines required agent branches, target branch enforcement, push responsibilities, and whether “core team” branches are mandatory. The runner and auto-promote should read policy rather than encoding it via alternate filenames. This eliminates docs-vs-code drift because policy becomes the code.

Add a “doctor” command as your first-line support tool. It should validate:

package.json script targets exist
all Node imports resolve
the canonical runner can start and write heartbeat
required Git commands exist and the repo is in a valid worktree state
macOS daemon prerequisites (path not in protected folders or required grants acknowledged)
This is the simplest way to prevent regression back into “split-brain entrypoints.”

Only after stabilization, consider multi-agent expansion. Core-team branches (ceo/growth/qa/analytics/designer) can work, but they increase coordination surfaces and amplify failure probability unless the promotion workflow is checkpointed and idempotent. Use the same idempotency principles emphasized in resilient retry guidance: each additional branch is another side effect to make “safe to retry.”
