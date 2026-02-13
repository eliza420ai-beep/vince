/**
 * Beautiful plugin settings banner with custom ASCII art
 * Discovery Plugin - Capability discovery and monetized queries
 */

import type { IAgentRuntime } from '@elizaos/core';

// Discovery: Sunflower/Treasure theme - unique palette
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  // Sunflower Yellow
  sunflower: '\x1b[32m',
  // Honey Gold
  honey: '\x1b[35m',
  // Map Brown accent
  mapBrown: '\x1b[33m',
  brightGreen: '\x1b[92m',
  brightWhite: '\x1b[97m',
};

function line(content: string): string {
    const stripped = content.replace(/\x1b\[[0-9;]*m/g, '');
    const len = stripped.length;
    if (len > 78) return content.slice(0, 78);
    return content + ' '.repeat(78 - len);
}

export interface BannerOptions {
    runtime: IAgentRuntime;
}

export function printBanner(options: BannerOptions): void {
    const { runtime } = options;
  const R = ANSI.reset, D = ANSI.dim, B = ANSI.bold;
  const c1 = ANSI.mapBrown, c2 = ANSI.sunflower, c3 = ANSI.honey;
  const W = ANSI.brightWhite, C = ANSI.sunflower;

    const top = `${c1}╔${'═'.repeat(78)}╗${R}`;
    const mid = `${c1}╠${'═'.repeat(78)}╣${R}`;
    const bot = `${c1}╚${'═'.repeat(78)}╝${R}`;
    const row = (s: string) => `${c1}║${R}${line(s)}${c1}║${R}`;

    const lines: string[] = [''];
    lines.push(top);
    lines.push(row(` ${B}Character: ${runtime.character.name}${R}`));
    lines.push(mid);

    // Discovery - Explorer / Compass Rose Italic Style
    lines.push(row(`${c2}    ____  _                                      ${c3}     N${R}`));
    lines.push(row(`${c2}   / __ \\(_)_____________  _   _____  _______  __${c3}     |${R}`));
    lines.push(row(`${c2}  / / / / / ___/ ___/ __ \\| | / / _ \\/ ___/ / / /${c3}  W--◆--E${R}`));
    lines.push(row(`${c2} / /_/ / (__  ) /__/ /_/ /| |/ /  __/ /  / /_/ / ${c3}     |${R}`));
    lines.push(row(`${c2}/_____/_/____/\\___/\\____/ |___/\\___/_/   \\__, /  ${c3}     S${R}`));
    lines.push(row(`${c2}                                        /____/${R}`));
    lines.push(row(``));
    lines.push(row(`${D}                Capability Discovery & Monetized Queries${R}`));
    lines.push(mid);

    // Features
    lines.push(row(` ${B}${W}Features${R}`));
    lines.push(row(` ${ANSI.brightGreen}▸${R} Discover agent capabilities dynamically`));
    lines.push(row(` ${ANSI.brightGreen}▸${R} Monetized capability queries`));
    lines.push(row(` ${ANSI.brightGreen}▸${R} Agent-to-agent discovery protocol`));
    lines.push(row(` ${ANSI.brightGreen}▸${R} Capability marketplace integration`));
    lines.push(bot);
    lines.push('');

    runtime.logger.info(lines.join('\n'));
}

