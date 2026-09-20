#!/bin/sh
# Biddú Docker entrypoint (starts as root, drops to `nextjs`).
#
# Volume mounts shadow the image's chown-ed directories with root-owned
# ones, so without this step SQLite/uploads/logs writes fail on fresh
# volumes (SQLITE_READONLY / EACCES). Non-recursive chown is deliberate:
# it fixes mountpoint ownership in milliseconds; files created afterwards
# are already owned by `nextjs`, and the one root-polluting writer (the
# one-shot `migrate` service) repairs its own files after running.
set -e
chown nextjs:nodejs /app/data /app/public/uploads /app/logs /app/.next 2>/dev/null || true
exec gosu nextjs "$@"
