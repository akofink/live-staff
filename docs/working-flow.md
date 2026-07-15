# Working Flow

## Sources of Truth

GitHub Issues are the mutable work queue.
Each issue describes one outcome, scope, acceptance criteria, and relevant constraints.
GitHub Pull Requests are the review and integration record.
The `docs/` directory records durable product decisions, architecture, conventions, and roadmap-level exit criteria.

Do not use a checked-in task list as a second issue tracker.
It becomes stale and creates conflicting sources of truth.

## Agent Delivery Loop

1. Start from an existing issue or create one before implementation.
2. Read `AGENTS.md`, the relevant documentation, and the issue acceptance criteria.
3. Create a dedicated branch and worktree named for the focused outcome.
4. Make the smallest coherent change that satisfies the issue.
5. Run targeted tests during development and the full `lint`, `test`, and `build` gates before publishing.
6. Update durable documentation or an ADR only when a decision or contract changes.
7. Commit with a conventional subject that references the issue.
8. Push the branch and open a draft pull request that links the issue, summarizes intent, and records verification.
9. Keep the PR draft while work is incomplete; mark it ready only when it meets the definition of done.
10. Squash merge after review, then let GitHub delete the branch and close the issue.

## Planning Cadence

Keep the product roadmap at milestone granularity in `docs/roadmap.md`.
Create and prioritize GitHub issues for the next milestone only when their acceptance criteria are understood.
Use issue labels for area and state as the project grows, such as `audio`, `music-domain`, `notation`, `ux`, `documentation`, and `good first issue`.
Use GitHub Discussions for open-ended product or design exploration rather than issues that lack an actionable outcome.

## Required PR Evidence

Every pull request states the linked issue, behavior change, verification performed, and any manual browser or device validation still required.
For audio and notation changes, include the relevant manual test environment and known limits.

## Agent Boundaries

Agents may create issues, branches, worktrees, commits, draft pull requests, and documentation within the repository's privacy and architecture constraints.
They must not add a backend, upload audio, weaken permission handling, or introduce major dependencies without a documented decision and explicit maintainer approval.
