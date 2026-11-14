# Local development database. Production should use a managed PostgreSQL service.
FROM postgres:18.6

# PostgreSQL 18 keeps PGDATA at /var/lib/postgresql/18/docker and declares
# /var/lib/postgresql as its volume; the root docker-compose.yaml mounts
# persistent storage there.
#
# TCP only: the entrypoint's temporary initialization server listens on the
# Unix socket alone, so this turns healthy only once the real server accepts
# TCP connections.
HEALTHCHECK --interval=5s --timeout=5s --start-period=10s --retries=10 CMD ["pg_isready", "-h", "127.0.0.1", "-p", "5432"]
