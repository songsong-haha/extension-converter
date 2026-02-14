Deep Research Report on the Auto‑Promote Failure Loop and How to Prevent Recurrence
Executive summary
Your incident pattern is most consistent with a “retry storm inside a local automation loop,” where the loop keeps re-entering the same cycle after detecting a completion token, but the downstream auto‑promote step fails immediately and repetitively—never reaching the internal checkpointing logic you intended. This aligns strongly with the repeated “Cannot find module …/auto-promote.mjs” symptom you called out, because in Node.js an ERR_MODULE_NOT_FOUND can occur while loading the program entry point, before any of the script’s own state machine / checkpoint writes are executed.

The deep fix is less about “tuning retries” and more about formalizing a failure taxonomy (retryable vs config‑fatal vs policy‑terminal), implementing preflight validation (doctor) that fails fast on config‑fatal conditions, and wiring a circuit breaker / quarantine state into the outer loop so repeated auto‑promote failures cannot cause an infinite cycle. Circuit breakers are a standard reliability mechanism that transitions to an “open” (stop calling) state once failures exceed a threshold, and only later probes recovery (half‑open) under controlled conditions.

Failure-mode analysis from your described timeline
The two most load‑bearing signals in your context are: (a) failures happening immediately after “completion token found,” and (b) the dominant low-level error being “Cannot find module … auto-promote.mjs,” repeated many times. In Node.js, ERR_MODULE_NOT_FOUND explicitly means the ECMAScript module loader could not resolve a module when attempting an import operation or when loading the program entry point. That “entry point” wording matters: if the script cannot even load, the script-internal checkpoint file (loop/auto-promote-state.json) may never be created, which matches your observation that no state file exists.

Because you noted that key loop/promote .mjs files and the policy file are not Git tracked, the failure pattern also matches a deployment/clone drift scenario: the runtime is reading package.json scripts that point at Node entry points, but the corresponding .mjs targets may only exist in one working directory (or may have been generated locally) and therefore disappear in another checkout/worktree/clean environment. In that setup, each retry is not “giving the system time to recover” (as retries are meant to do for transient failures), but is simply re‑executing a deterministic config error. Retry guidance from reliability literature consistently warns that uncontrolled retries can amplify failures and impede recovery.

Finally, the presence of many stale/prunable worktrees is not necessarily the root cause of the missing module error, but it is an important compounding risk for a worktree‑based merge gate: Git can refuse to create a worktree for a branch that is “already checked out” in another linked worktree, and stale worktree metadata can accumulate if worktree directories are deleted manually without running git worktree remove. Git’s documentation explicitly describes git worktree remove as the correct cleanup path and notes that git worktree prune can clean stale administrative files; it also notes that worktree cleanup may otherwise occur later via pruning policies (for example, gc.worktreePruneExpire).

State-machine stop and quarantine criteria for repeated auto-promote failures
A robust fix treats the outer loop (the “completion token → maybeAutoPromote()” driver) as the safety controller, and treats auto‑promote as an effectful subroutine whose failures must be classified and bounded. The key design goal is to prevent the loop from re‑entering the same cycle indefinitely when failures are deterministic and non‑recoverable without human intervention.

A circuit breaker model maps cleanly to your use case:

Closed state (normal): auto‑promote is invoked after completion token detection.
Open state (quarantine): auto‑promote is skipped immediately (fail fast) and the loop stops reprocessing the same trigger; periodic probes or manual intervention are required to close the circuit again.
Half‑open state (probe): allow a limited number of attempts to see if the condition is fixed; on any failure, return to open.
To make this operationally safe (and to avoid a retry storm), the breaker needs explicit thresholds and time windows. Microsoft’s circuit breaker description highlights a failure threshold and timeout period as core parameters (closed→open on threshold, open→half‑open after timeout, half‑open→closed after a success threshold).

Recommended stop/quarantine criteria (state-machine oriented):

Immediate open (config‑fatal): If the error signature indicates deterministic configuration failure (e.g., Node ERR_MODULE_NOT_FOUND for the auto‑promote entry point), transition to open immediately (no retries), mark the completion token as “consumed but promotion quarantined,” and emit a high-severity alert/event.
Rationale: ERR_MODULE_NOT_FOUND means the runtime cannot even load the module/entry point; retries do not change the filesystem.
Thresholded open (transient retryable): For transient categories (network flake to remote, temporary lock contention, intermittent CI/QA runner unavailability), allow bounded retries with exponential backoff + jitter, then open on a threshold such as:
N consecutive failures within a time window, or
a retry budget exhaustion (maximum attempts or maximum elapsed time).
Rationale: retries can amplify load and contribute to cascading failures; exponential backoff and jitter reduce synchronized retry waves and help systems recover.
Terminal policy failure (gate failed): If QA gate fails deterministically (tests red), do not retry in a tight loop. Instead, record as “promotion blocked” and require a new commit/change to re-arm.
Rationale: reliability guidance emphasizes limiting retries and failing fast when further attempts are “doomed to fail,” because retries can create self‑inflicted outages.
Practically, this means the outer loop should persist a small “promotion controller” state (separate from auto‑promote’s internal checkpoint file) that records: last failure class, last error signature hash, consecutive failure count, and quarantine-until timestamp. This is directly aligned with circuit breaker mechanics (failure counter, timeout, half‑open probing).

Preflight and “doctor” patterns to turn missing modules into config-fatal, not retryable
The missing-module symptom is exactly the kind of failure that should be detected before the loop starts, not after “completion token found.” In Node.js, ERR_MODULE_NOT_FOUND is unambiguous about module resolution failure in the ESM loader.

A practical pattern is a two-level preflight:

Level one: filesystem + git contract checks (fast, deterministic)
Before starting the loop (and before each promote attempt if you want belt‑and‑suspenders), validate that required runtime entry points exist and are tracked.

Git can list tracked files and can error if a file path is not present in the index using git ls-files --error-unmatch. The docs specify that --error-unmatch treats missing files as an error (exit status 1).
git ls-files also supports listing untracked files (--others) and applying standard ignore rules (--exclude-standard). This makes it suitable for “tracked-only runtime” enforcement and for detecting surprise filesystem drift.
Level two: runtime import/entry execution probe (slower, high confidence)
Run a “canary import” (or node scripts/worktree/auto-promote.mjs --help) under the same Node flags/package scope as production. Node’s ESM specifier rules include that relative imports require explicit file extensions, and .mjs is an explicit ESM marker; mismatches here are often deterministic configuration problems.

What to classify as config-fatal (no retry):

ERR_MODULE_NOT_FOUND / MODULE_NOT_FOUND when loading the expected entry point.
Required policy file missing.
Required scripts missing or not tracked (if you adopt tracked-only contract).
Path mismatch between package.json script targets and actual repository layout.
This aligns with the general reliability principle of fail fast on non-transient failures and only retry when the failure is plausibly transient. Cloud reliability guidance repeatedly emphasizes controlling and limiting retries, because frequent retries can overload systems and degrade recovery.

Git worktree merge-gate defenses against stale/prunable accumulation
Because your merge gate uses Git worktrees, you should treat worktree lifecycle as a first-class resource management problem, not an incidental implementation detail.

Git’s documentation provides several key mechanical facts that inform defense patterns:

Linked worktrees are tracked via administrative files under $GIT_DIR/worktrees, and stale admin entries can remain if a worktree directory is deleted without using git worktree remove; these can later be cleaned up via automatic pruning policies or git worktree prune.
git worktree remove refuses to remove an “unclean” worktree unless --force is used, and the main worktree cannot be removed.
When creating a new worktree for a branch, Git will refuse if that branch is already checked out in another worktree, unless --force is used. This is exactly the kind of failure stale worktrees can trigger.
git worktree list --porcelain exists specifically to provide stable, script-friendly output for tooling.
How git worktrees improve our git workflow | by Saeed Zarinfam | ThreadSafe
What is the Circuit Breaker Pattern? | by dhanushka madushan | Think Integration | Medium

Defensive patterns that work well in automation:

Use an explicit worktree naming/ownership convention. Create merge temp worktrees under a single directory prefix (e.g., loop/tmp-wt/<runId>), and store an “owner manifest” file inside that directory that records PID, start time, and the branch/sha being operated on. This makes it possible to clean up safely even if the main loop crashes. The Git worktree docs emphasize that worktrees are distinct directories linked to the same repository metadata, so lifecycle markers stored in the worktree directory are a natural complement to Git’s own admin metadata.

Run cleanup in two phases:

git worktree remove --force <path> for known temp worktrees (force because automation-created worktrees should not contain valuable uncommitted work), and then
git worktree prune to remove stale admin entries for worktrees that no longer exist. Git explicitly distinguishes “remove” (worktree) from “prune” (admin metadata).
Add a repo-wide mutex around worktree operations. The failure mode where multiple loop instances (or overlapping auto‑promote phases) manipulate worktrees concurrently can produce confusing “branch already used by worktree” failures and metadata races. Git’s own git worktree add --lock option is documented as equivalent to add followed by lock “but without race condition,” which is a strong hint that race concerns exist and should be addressed explicitly in automation.

Treat “prunable/stale worktrees exist” as a health signal. Git’s tooling can annotate worktrees as prunable, and worktree metadata is intended to be pruned when the checkout is missing/expired by policy. Building a periodic hygiene job that reports and prunes stale entries is consistent with Git’s own model (including --expire on prune).

Redesigning auto-promote idempotency around Git’s real side effects
Your current auto‑promote script is described as a checkpointed state machine with a state file and phaseDone() semantics. The key issue is that the state machine must align its checkpoints to irreversible boundaries in Git: merges, pushes, and deletes affect shared state (remote refs), while worktree creation/cleanup affects local state.

A practical checkpoint model for push/merge/push/cleanup/delete-remote is to structure phases so each phase can be safely re-run by checking the world state first (idempotency by observation), and to avoid doing multiple irreversible actions between checkpoints.

Suggested high-level phases (each checkpointed):

Preflight & environment lock acquired: verify required files exist and are tracked; confirm Node can load the entry point; acquire a repo-wide lock. This prevents entering the “completion token → immediate failure → retry loop” pattern. Node’s error semantics support treating entry-point load failures as deterministic.
Worktree created & clean baseline ensured: create a fresh worktree for the merge target; if it already exists, verify it is owned by the current run and reuse or recreate. Use Git worktree semantics (add/remove/prune) rather than manual directory deletion.
Remote refs fetched & branch existence verified: validate that required branches exist before proceeding. The goal is to make “branch missing” a policy/config-fatal before any merge attempt.
Merge step executed with deterministic strategy: prefer git merge --ff-only when your policy expects linear history and you want the merge step to fail without creating a merge commit unless fast-forward is possible; Git’s merge options explicitly describe --ff-only as refusing to merge unless up-to-date or fast-forwardable.
Push step with safety constraints: avoid force pushes unless policy requires; Git push has explicit behaviors around pruning and deletion, and deletions can be expressed via refspec or --delete.
QA gate recorded as terminal vs retryable: if QA is required by policy and fails, record “blocked” and stop; do not hammer the gate with infinite retries (retry amplification risk).
Cleanup worktree & prune metadata: git worktree remove then git worktree prune to keep admin metadata from accumulating.
Remote branch deletion (optional, last): delete only after successful merge+push; Git supports branch deletion via git push --delete or empty-src refspec semantics.
For retries inside this state machine, apply the same taxonomy:

Retry only on transient failures and use exponential backoff + jitter with a cap and attempt limit. This is widely recommended to reduce synchronized retry waves and avoid self‑inflicted outages.
For deterministic failures (missing module, missing policy, invariant violations like “worktree branch already used” due to leaked worktree), fail fast and quarantine; the outer circuit breaker should trip and stop the loop from reprocessing the same completion token.
Enforcing a tracked-only runtime contract in CI and release artifacts
Your “tracked-only runtime contract” goal is well aligned with how modern CI/CD systems reduce environment drift: build and run from a clean checkout, and ensure runtime-critical assets are either tracked or generated deterministically by the build (and then packaged).

There are two complementary controls—one policy and one mechanical.

Policy control: define the runtime manifest Create an explicit allowlist of required runtime entry points and config files (the .mjs loop runner(s), auto‑promote entry point, policy JSON, and any scripts invoked by spawn). Then require that each entry is:

present on disk, and
tracked in Git.
Git can enforce “tracked” through git ls-files (show tracked files) and can hard-fail for specific paths via --error-unmatch. Git documentation specifies these behaviors directly.

Mechanical control: CI checks that fail on drift A minimal, practical CI job can:

Run git ls-files --error-unmatch <path> for each required file (hard guarantee it’s in the index).
Run git ls-files --others --exclude-standard to detect unexpected untracked files that might be “secretly required” by the runtime. The --others and --exclude-standard options are documented as listing untracked files and applying standard ignore rules.
Run a smoke execution that loads the entry points under Node’s real ESM behavior (since relative specifiers and file extensions matter under ESM). Node’s ESM documentation explicitly notes that relative specifiers require file extensions, and .mjs is a strong ESM marker, so CI should run in the same module mode as production.
Artifact control: package only what you intend to run If you publish or deploy via npm-style artifacts, npm provides a built-in allowlisting mechanism: defining a "files" list in package.json restricts what goes into the packed/published tarball, and .npmignore / .gitignore interaction controls exclusions. This is useful because it makes “untracked runtime dependencies” fail early when the artifact is produced or deployed.

If your deployment is not npm-based, the same principle applies: build an artifact from a clean checkout and deploy only that artifact, so missing tracked files become immediate, reproducible failures rather than environment-specific surprises.

Finally, in CI systems such as GitHub Actions, the default behavior is to check out repository contents fresh per run, which naturally exposes any reliance on untracked local files. Turning that implicit property into an explicit “doctor step” (preflight + tracked-only verification + Node entrypoint smoke) makes the contract intentional and auditable.
