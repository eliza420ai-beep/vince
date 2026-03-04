#!/usr/bin/env node
/**
 * Patch @elizaos/plugin-sql so createWorld tolerates duplicate world IDs.
 *
 * Fixes: startup failures when multiple agents concurrently call ensureWorldExists
 * and hit "duplicate key value violates unique constraint \"worlds_pkey\"".
 *
 * We wrap the insert in a try/catch and treat Postgres/PGLite 23505 conflicts
 * as success (world already exists).
 */
const fs = require("fs");
const path = require("path");

const files = [
  path.join(
    __dirname,
    "..",
    "node_modules",
    "@elizaos",
    "plugin-sql",
    "dist",
    "node",
    "index.node.js",
  ),
  path.join(
    __dirname,
    "..",
    "node_modules",
    "@elizaos",
    "server",
    "node_modules",
    "@elizaos",
    "plugin-sql",
    "dist",
    "node",
    "index.node.js",
  ),
];

const unpatched = `
  async createWorld(world) {
    return this.withDatabase(async () => {
      const newWorldId = world.id || v4();
      await this.db.insert(worldTable).values({
        ...world,
        id: newWorldId,
        name: world.name || ""
      });
      return newWorldId;
    });
  }`;

const patched = `
  async createWorld(world) {
    return this.withDatabase(async () => {
      const newWorldId = world.id || v4();
      try {
        await this.db.insert(worldTable).values({
          ...world,
          id: newWorldId,
          name: world.name || ""
        });
      } catch (error) {
        // Duplicate world ID (23505 / "already exists") — treat as success.
        const code = error && typeof error === "object" ? error.code : undefined;
        const detail =
          error && typeof error === "object" ? error.detail || error.message : "";
        const cause =
          error && typeof error === "object" ? error.cause : undefined;
        const causeCode =
          cause && typeof cause === "object" ? cause.code : undefined;
        const causeDetail =
          cause && typeof cause === "object"
            ? cause.detail || cause.message
            : "";
        const hasDuplicateMessage = (text) =>
          typeof text === "string" &&
          (text.toLowerCase().includes("already exists") ||
            text.toLowerCase().includes("duplicate key value"));
        if (
          code === "23505" ||
          causeCode === "23505" ||
          hasDuplicateMessage(detail) ||
          hasDuplicateMessage(causeDetail)
        ) {
          return newWorldId;
        }
        throw error;
      }
      return newWorldId;
    });
  }`;

// Also patch createEntities to fall back when PGLite complains about
// "cannot insert multiple commands into a prepared statement".
const createEntitiesUnpatched = `
  async createEntities(entities) {
    return this.withDatabase(async () => {
      try {
        return await this.db.transaction(async (tx) => {
          const normalizedEntities = entities.map((entity2) => ({
            ...entity2,
            names: this.normalizeEntityNames(entity2.names),
            metadata: entity2.metadata || {}
          }));
          await tx.insert(entityTable).values(normalizedEntities);
          return true;
        });
      } catch (error) {
        logger10.error({
          src: "plugin:sql",
          entityId: entities[0]?.id,
          error: error instanceof Error ? error.message : String(error)
        }, "Failed to create entities");
        return false;
      }
    });
  }`;

const createEntitiesPatched = `
  async createEntities(entities) {
    return this.withDatabase(async () => {
      try {
        return await this.db.transaction(async (tx) => {
          const normalizedEntities = entities.map((entity2) => ({
            ...entity2,
            names: this.normalizeEntityNames(entity2.names),
            metadata: entity2.metadata || {}
          }));
          try {
            await tx.insert(entityTable).values(normalizedEntities).onConflictDoNothing();
          } catch (error) {
            // Some engines wrap/alter the bulk-insert error message. Always retry
            // row-by-row with conflict-safe inserts before failing hard.
            for (const entity2 of normalizedEntities) {
              await tx.insert(entityTable).values(entity2).onConflictDoNothing();
            }
          }
          return true;
        });
      } catch (error) {
        logger10.error({
          src: "plugin:sql",
          entityId: entities[0]?.id,
          error: error instanceof Error ? error.message : String(error)
        }, "Failed to create entities");
        return false;
      }
    });
  }`;

// Patch MigrationTracker.ensureSchema to tolerate engines (like PGLite) that
// don't support CREATE SCHEMA. If the CREATE SCHEMA statement fails with a
// dialect-specific error, we treat it as a no-op so migrations can proceed.
const ensureSchemaUnpatched = `
  async ensureSchema() {
    await this.db.execute(sql\`CREATE SCHEMA IF NOT EXISTS migrations\`);
  }`;

const ensureSchemaPatched = `
  async ensureSchema() {
    try {
      await this.db.execute(sql\`CREATE SCHEMA IF NOT EXISTS migrations\`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const lower = message.toLowerCase();
      // Engines without schema support (e.g. PGLite) will throw here. In that
      // case we skip schema creation and rely on the default namespace.
      const isSchemaUnsupported =
        lower.includes("schema") ||
        lower.includes("not supported") ||
        lower.includes("syntax error");
      if (!isSchemaUnsupported) {
        throw error;
      }
    }
  }`;

// On schema-less engines, references like "migrations._migrations" fail even if
// CREATE SCHEMA is skipped. Normalize runtime migrator metadata tables to the
// default namespace so table creation and queries are consistent.
const migrationTableRewrites = [
  ["migrations._migrations", "_migrations"],
  ["migrations._journal", "_journal"],
  ["migrations._snapshots", "_snapshots"],
];

let patchedAny = false;
for (const file of files) {
  if (!fs.existsSync(file)) {
    console.warn(
      `patch-elizaos-plugin-sql-worlds: file not found, skipping ${file}`,
    );
    continue;
  }
  let s = fs.readFileSync(file, "utf8");
  if (s.includes(patched)) {
    // Already patched
  } else if (s.includes(unpatched)) {
    s = s.replace(unpatched, patched);
    console.log(
      "patch-elizaos-plugin-sql-worlds: createWorld duplicate-key guard applied",
    );
  } else {
    console.warn(
      "patch-elizaos-plugin-sql-worlds: createWorld pattern not found, skipping",
    );
  }

  if (s.includes(createEntitiesPatched)) {
    // Already patched
  } else if (s.includes(createEntitiesUnpatched)) {
    s = s.replace(createEntitiesUnpatched, createEntitiesPatched);
    console.log(
      "patch-elizaos-plugin-sql-worlds: createEntities fallback hardened",
    );
  } else {
    console.warn(
      "patch-elizaos-plugin-sql-worlds: createEntities pattern not found, skipping",
    );
  }

  if (s.includes(ensureSchemaPatched)) {
    // Already patched
  } else if (s.includes(ensureSchemaUnpatched)) {
    s = s.replace(ensureSchemaUnpatched, ensureSchemaPatched);
    console.log(
      "patch-elizaos-plugin-sql-worlds: MigrationTracker.ensureSchema fallback applied",
    );
  } else {
    console.warn(
      "patch-elizaos-plugin-sql-worlds: ensureSchema pattern not found, skipping",
    );
  }

  let rewroteMigrationRefs = 0;
  for (const [from, to] of migrationTableRewrites) {
    if (!s.includes(from)) continue;
    s = s.split(from).join(to);
    rewroteMigrationRefs++;
  }
  if (rewroteMigrationRefs > 0) {
    console.log(
      `patch-elizaos-plugin-sql-worlds: normalized migration table refs (${rewroteMigrationRefs} patterns)`,
    );
  }

  fs.writeFileSync(file, s, "utf8");
  patchedAny = true;
  console.log(`patch-elizaos-plugin-sql-worlds: applied ${file}`);
}

if (!patchedAny) {
  console.warn("patch-elizaos-plugin-sql-worlds: no files patched");
}

process.exit(0);

