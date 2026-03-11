---
tags: [regulation, compliance, legal]
agents: [oracle, eliza]
last_reviewed: 2026-02-15
---

# Crypto Enforcement Case Studies

## SEC v. Ripple Labs (2020-2025)

**Theory:** XRP sales constituted unregistered securities offerings under the Howey test.

**Key ruling (July 2023):** Judge Torres split the baby — institutional sales of XRP were securities transactions, but programmatic sales on exchanges were not. This distinction between "to whom you sell" rather than "what you sell" was groundbreaking and challenged the SEC's blanket approach.

**Resolution:** The SEC's appeal and Ripple's cross-appeal created prolonged uncertainty. The case effectively established that the _manner of sale_ matters as much as the asset itself — a token can be sold as a security in one context and not another.

**Precedent:** Undermined the SEC's position that most tokens are inherently securities. Gave ammunition to every project arguing their token had achieved sufficient decentralization. However, the ruling's applicability beyond the Southern District of New York remains debated.

**Risk lesson:** _Institutional fundraising with expectations of profit from the issuer's efforts = highest risk. Secondary market trading with sufficient decentralization = defensible._

## United States v. Roman Storm / Tornado Cash (2023-ongoing)

**Theory:** Developers of a privacy-preserving smart contract protocol conspired to commit money laundering and sanctions evasion. OFAC sanctioned Tornado Cash's smart contract addresses (August 2022) — the first time immutable code was sanctioned.

**Key issues:** Can open-source developers be held criminally liable for how others use their code? Is an immutable smart contract a "person" that can be sanctioned? The Sixth Circuit (November 2024) ruled that immutable smart contracts are not "property" of a foreign national and cannot be sanctioned under IEEPA, partially vacating the OFAC sanctions.

**Impact:** Massive chilling effect on privacy tool development. Developers of mixing protocols, privacy chains, and similar tools now face personal criminal risk. Many relocated offshore or went anonymous. The case defines the boundary between building neutral infrastructure and facilitating crime.

**Risk lesson:** _Building privacy/anonymity tools carries existential regulatory risk in the US, regardless of legitimate use cases. The line between tool-builder and facilitator is drawn by prosecutors, not code._

## Coinbase v. SEC (2023-2025)

**Theory:** SEC alleged Coinbase operated as an unregistered securities exchange, broker, and clearing agency by listing tokens that were securities.

**Context:** Coinbase had previously sought SEC approval (petition for rulemaking, 2022) and was told to "come in and register" — while simultaneously being told there was no viable registration path for crypto. This Catch-22 became central to Coinbase's defense.

**Significance:** The highest-profile test of whether major US exchanges can operate under existing securities law. Coinbase's defense argued: (1) the tokens listed are not securities, (2) there's no workable registration framework, and (3) the SEC is overstepping via enforcement rather than rulemaking (major questions doctrine).

**Outcome trajectory:** The case accelerated political pressure for legislative clarity. Coinbase's aggressive litigation strategy (counter-suing, mandamus petitions) shifted the narrative from "comply or else" to "comply with what, exactly?"

**Risk lesson:** _Even well-resourced, US-based, publicly traded companies face existential regulatory risk without clear legislation. Being "compliant" is impossible when rules don't exist._

## United States / CFTC / DOJ v. Binance (2023-2024)

**Theory:** Multi-agency action alleging systematic AML/KYC violations, sanctions evasion, and operating an unregistered exchange/derivatives platform.

**Resolution:** CZ pled guilty to BSA violations (November 2023), received 4 months imprisonment, and Binance paid $4.3B in penalties — the largest crypto enforcement action in history. Binance agreed to a compliance monitorship.

**Precedent:** Established that offshore exchanges serving US customers cannot evade US law. The "we don't serve Americans" defense fails when internal communications show deliberate circumvention. The criminal guilty plea from a CEO raised the personal stakes dramatically.

**Risk lesson:** _Operating offshore with US customer exposure is not a regulatory strategy — it's a ticking time bomb. AML/KYC violations are treated as criminal, not civil. The DOJ will extradite._

## Uniswap Labs — SEC Investigation (2024-2025)

**Theory:** SEC issued a Wells notice (April 2024) alleging Uniswap Labs operated as an unregistered securities exchange and broker through the Uniswap front-end and protocol.

**Significance:** This case tested whether a DeFi front-end operator is liable for activity on the underlying protocol. Uniswap Labs argued it merely provides an interface to autonomous smart contracts — it doesn't custody funds, match orders, or have the ability to restrict protocol-level access.

**Industry impact:** The investigation highlighted the front-end enforcement vector. Uniswap Labs had already geo-blocked certain tokens and jurisdictions — arguably acknowledging some gatekeeper responsibility, which complicated their "mere interface" defense. The case's trajectory was heavily influenced by the post-2024-election shift in SEC posture.

**Risk lesson:** _Operating a DeFi front-end creates regulatory surface area. Every compliance action you take (geo-blocking, token delisting) implicitly acknowledges control — which regulators will use against you. The "fully decentralized" defense weakens with each centralized decision._

---

## Cross-Cutting Framework for Regulatory Risk Assessment

| Factor             | Lower Risk                     | Higher Risk                    |
| ------------------ | ------------------------------ | ------------------------------ |
| Decentralization   | Immutable, no admin keys       | Upgradeable, team-controlled   |
| User type          | Institutional, accredited      | Retail, unsophisticated        |
| Jurisdiction       | Offshore, no US nexus          | US users, US entity            |
| Token economics    | Utility, no profit expectation | Revenue sharing, buybacks      |
| Compliance posture | Proactive, documented          | Evasive, "we'll figure it out" |

_Last updated: 2026-02-15_
