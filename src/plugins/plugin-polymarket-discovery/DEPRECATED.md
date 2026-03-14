# DEPRECATED

**Status:** Retired — v2 refactor (March 2025)

Oracle (Polymarket agent) has been retired. No migration to a portable skill.

## Why retired

Polymarket read-only integration never produced real trading edge in paper tests.
The discovery, odds, and portfolio actions were interesting in theory but weren't feeding
meaningful signal into the VINCE trading loop. With v2 slimming the core to 4 agents
(VINCE, Solus, Otaku, Forge), Oracle is the first casualty.

## If you want to revisit

Prediction market integration could be valuable if:

- Polymarket has direct API access (not just scraping)
- There's a clear signal → trade thesis pipeline
- Edge can be validated in paper mode before any live execution

The code here is archived and functional. Re-enable Oracle with `ORACLE_ENABLED=true` in `.env`.

## Related files

- `src/agents/oracle.ts` — Oracle character definition (deprecated)
- `src/plugins/plugin-polymarket-discovery/` — Market discovery actions
- `src/plugins/plugin-polymarket-desk/` — Desk management
- `src/plugins/plugin-polymarket-edge/` — Edge calculation
