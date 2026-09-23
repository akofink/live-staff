# Working Flow

## Sources of Truth

GitHub Issues are an optional queue for work the maintainer wants tracked.
Do not create an issue merely to justify a small change.
GitHub Pull Requests are the review and integration record.
The `docs/` directory records durable product decisions, architecture, and conventions.

Do not use a checked-in task list as a second issue tracker.
It becomes stale and creates conflicting sources of truth.

## Agent Delivery Loop

1. Read `AGENTS.md` and the relevant documentation.
2. Create a dedicated branch and worktree named for the focused outcome.
3. Make the smallest coherent change that does the requested work.
4. Run the automated checks that match the change.
5. Update durable documentation or an ADR when a decision changes.
6. Commit with a conventional subject.
7. Open a pull request that says what changed and which checks ran.
8. Do not add a device matrix, thermal run, or capture corpus as required follow-up.

## Planning Cadence

Keep the product roadmap at milestone granularity in `docs/roadmap.md`.
Do not create milestone issues for a release program.
File an issue only when the maintainer wants that work queued.
Use issue labels for area and state as the project grows, such as `audio`, `music-domain`, `notation`, `ux`, `documentation`, and `good first issue`.
Use GitHub Discussions for open-ended product or design exploration rather than issues that lack an actionable outcome.

## Pull Request Notes

Say what changed and which checks ran.
Do not list missing device, screen-reader, or thermal evidence as required follow-up.
For audio or notation changes, mention privacy only when the change touches capture, persistence, or network behavior.

## Agent Boundaries

Agents may create issues, branches, worktrees, commits, draft pull requests, and documentation within the repository's privacy and architecture constraints.
They must not add a backend, upload audio, weaken permission handling, or introduce major dependencies without a documented decision and explicit maintainer approval.
