# Context refresh and recovery

Context ZIP downloads use the OS temporary directory. Extraction uses a unique
`.ellygent-stage-*` directory inside the destination workspace, so promotion never
renames across filesystems. ZIP paths and the required manifest fields are
validated before the live export is touched. Markdown retains its explicit
`--overwrite` requirement.

Promotion is a multi-step swap, **not atomic**: rename `.ellygent` to
`.ellygent.previous`, then rename the validated staged directory to `.ellygent`.
If promotion fails, restore the backup. If restoration also fails, the error
names the retained backup; do not delete it. Successful promotion removes the
backup on a best-effort basis. A destination lock rejects concurrent refreshes.

After process interruption:

1. Confirm no refresh is still running. The `.ellygent-refresh.lock` directory is
   intentionally retained on abrupt termination; never remove an active lock.
2. If `.ellygent` is absent and `.ellygent.previous` exists, rename the latter to
   `.ellygent` to restore the last export immediately. If both exist, promotion
   completed; inspect the live manifest and files before discarding the backup.
   To restore the old export, first move the new `.ellygent` aside, then rename
   `.ellygent.previous` to `.ellygent`.
3. Remove the stale lock and retry. On retry, a retained backup is restored if
   the target is absent; if the target exists its manifest must validate before
   the backup is removed. Orphan `.ellygent-stage-*` directories can be removed
   once no refresh is running.

This protects against application errors and process interruption. It does not
provide power-loss durability guarantees (no directory fsync), nor coordinate
external writers that ignore the lock. Do not manually alter export paths while
a refresh runs. Windows/macOS filesystem behavior has not been tested here.
