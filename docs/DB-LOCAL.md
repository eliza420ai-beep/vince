## Local database setup

VINCE supports two local database modes:

- **PGLite (default)**: zero-config, file-based, good for quick smoke tests but fragile with advanced SQL features.
- **Postgres**: recommended for day-to-day dev once you’re on the v2 core / plugin line.

For the v2 stack (`@elizaos/core@2.0.0-alpha.27` + `@elizaos/plugin-sql@2.x`), Postgres is the stable path. PGLite is still wired up but can hit engine limitations (schemas, migrations metadata, `message_servers`), which is why we recommend moving VINCE onto a real Postgres instance.

---

### Option 1: Run Postgres via Docker (recommended)

From the repo root (`vince/`):

```bash
docker compose up -d db
```

This uses `docker-compose.yml` in the repo:

- Container name: `vince-postgres`
- Image: `postgres:16`
- Port: `5432` on localhost
- Database: `vince`
- User: `vince`
- Password: `vince`
- Data directory on host: `./.eliza/postgres-data`

Once the container is running, point VINCE at it via `.env`.

In `.env` (see `.env.example` for the full section), set:

```bash
POSTGRES_URL=postgres://vince:vince@localhost:5432/vince
```

Leave `PGLITE_DATA_DIR` commented out; `POSTGRES_URL` presence is what makes the SQL plugin use Postgres instead of PGLite.

---

### Option 2: Keep using PGLite (not recommended for v2)

If you leave `POSTGRES_URL` empty, VINCE uses PGLite with:

- Data directory under `.eliza/.elizadb`
- A WASM-based Postgres engine that doesn’t support every dialect feature

For quick experiments this is fine, but for the v2 migration and the runtime migrator (`migrations._migrations`, `message_servers`, etc.), Postgres gives you a much smoother experience.

---

### Starting VINCE with Postgres

With `docker compose up -d db` running and `POSTGRES_URL` set:

```bash
# Optional: initialize / sanity check DB bootstrap
bun run db:bootstrap

# Main dev entrypoint (custom UI + agents)
bun start
```

`bun start` will now use Postgres for:

- ElizaOS core data (`message_servers`, `messages`, entities, etc.)
- VINCE plugin SQL storage (paper bot, feature store if configured)

If you ever need to reset the local Postgres data, stop the container and remove the volume directory:

```bash
docker compose down
rm -rf .eliza/postgres-data
docker compose up -d db
```

