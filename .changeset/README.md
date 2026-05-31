# Changesets

This project uses [changesets](https://github.com/changesets/changesets) for version management.

## Workflow

1. Make changes to packages
2. Run `pnpm changeset` to create a changeset describing changes
3. On release: `pnpm changeset version` updates versions + changelogs
4. Then: `pnpm changeset publish` publishes to registry
