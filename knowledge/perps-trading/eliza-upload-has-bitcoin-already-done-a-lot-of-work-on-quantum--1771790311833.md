---
title: "# Has Bitcoin Already Done \"a Lot of Work\" on Quantum? Yes, Says One Core Dev"
source: https://www.youtube.com/watch?v=kwAspHvCIi8
category: perps-trading
ingestedWith: summarize
tags:
  - eliza-upload
  - user-submitted
  - chat
created: 2026-02-22T19:58:31.833Z
wordCount: 1932
---

# # Has Bitcoin Already Done "a Lot of Work" on Quantum? Yes, Says One Core Dev

> **Knowledge base note:** Numbers and metrics here are illustrative from the source; use for methodologies and frameworks, not as current data. For live data use VINCE.

## Content

# Has Bitcoin Already Done "a Lot of Work" on Quantum? Yes, Says One Core Dev

## Intro / Show Opening
Host Laura Shin opens Unchained and reminds viewers:
> Nothing you hear on Unchained is investment advice. This show is for informational and entertainment purposes only, and my guest and I may hold assets discussed in the show.

She also mentions sponsors and a new Bits & Bips feed.

Guest: Matt Carell, open source engineer at Spiral.

## Background: Nick Carter's Criticism
Last fall Nick Carter (Castle Island Ventures) argued Bitcoin core developers weren't prioritizing the quantum computing threat enough. One essay was titled:
> Bitcoin developers are sleepwalking towards collapse.

Carter warned of threats specific to Bitcoin and wrote:
> "it's a very real possibility that Bitcoin is the only blockchain left exposed on Qday."

Matt reached out to push back and called some of that FUD.

## Matt Carell: Overview of Bitcoin's Quantum Readiness
Matt gives two main points:

1. Most crypto wallets use derivation schemes that are quantum-safe.
   - Seed phrases (12–24 words) and the derivation from seed phrase to private key are quantum-safe.
   - The derivation from private key to public key (what appears on-chain) is vulnerable: a quantum computer could compute the private key from the public key and forward a transaction.
   - Because wallets already have quantum-safe seed-derived keys, Bitcoin could implement a software (soft fork) that requires proof of the seed phrase to spend, allowing relatively quick mitigation without every wallet needing to upgrade immediately.

2. There has been a lot of work among Bitcoin devs and funding organizations.
   - Relevant organizations with developers working on postquantum questions include:
     - Chaincode Labs
     - Brink
     - Blockstream Research
     - Spiral
   - Blockstream Research has cryptographers working on the issue.
   - Chaincode Labs produced a research report on a postquantum future for Bitcoin.
   - Discussion on the Bitcoin dev mailing list about postquantum topics has grown (Matt references a linear increase to the point where 30–40% of posts discuss postquantum), showing active discussion and work.
   - Conclusion: there's quite a bit of work and discussion, and Bitcoin could move rather quickly if needed.

## Who Matt Represents
Matt clarifies:
- He is not a designated spokesperson for Bitcoin core developers, but he speaks from conversations he's had with people who do work on Bitcoin.
- He spends a lot of time with contributors and has worked on open source protocols for 15 years, so he feels he can fairly represent where consensus is forming.

## Roadmap and Technical Questions
Laura raises concerns: data requirements, choosing a postquantum scheme, multiple soft forks, Bitcoin culture (slow upgrades), rotating/deprecating addresses, lost/abandoned coins (approx. 5% of BTC), and timelines.

Matt’s responses:

- Choosing a postquantum scheme:
  - Matt does not believe there is a major debate on which scheme to enable first: he argues that non-hash-based postquantum schemes (e.g., many lattice schemes) are still relatively young and could be broken classically.
  - He believes the prudent choice now is to add hash-based signatures to Bitcoin, but not to rely on them immediately.

- Migration strategy (two-stage approach):
  - Stage 1 (soon): Add the ability to commit to a postquantum public key (e.g., via a new address format).
    - Wallets can embed postquantum public keys now so they can sign with them when necessary, but they don't have to reveal or use them yet. This makes the immediate cost zero for on-chain data.
  - Stage 2 (when quantum threat is urgent): Flip a switch (soft fork) to require revealing and signing with the postquantum keys committed earlier. Wallets already know how to sign with those keys and would switch over.
  - This avoids forcing wallets to increase fees or transaction size today; the expensive postquantum data only needs to be on-chain when absolutely necessary.

- Hash-based signatures and size:
  - Hash-based signatures are significantly larger (Matt estimates ~3–20x depending on wallet), so committing first (and revealing later) reduces immediate blockchain impact.

- Stateless vs. stateful hash-based options:
  - Matt mentions proposals and variants — for example, a Blockstream Research proposal (Jonas Nick) that merges benefits from Sphincs with a stateful signature option called "shrinks" (as discussed in the interview). Matt believes the available set of hash-based options is narrow and close in performance; "shrinks" is probably the likely choice.

## Timing, Migration, and Community Decision-Making
- Matt distinguishes two decisions:
  1. Add the ability to commit/use postquantum public keys (should be done soon).
  2. Decide when to stop accepting old public keys (flip the switch). That decision will be made by the community/market when a cryptographically relevant quantum computer is a material risk.

- He disputes the idea of picking a fixed future date now because:
  - The community at that future time will evaluate the risk, and most quantum development is currently public (IBM, Google), meaning people will have signals.
  - Someone will propose a fork when it becomes urgent; markets will decide which fork wins (the fork that disables insecure spend paths vs. one that keeps them).

- On how long migration might take:
  - Chaincode’s report estimated ~7 years to upgrade; Matt agrees that getting "substantially all active wallets" to migrate could take many years, which is why work is underway now.
  - But he reiterates wallets that use seed phrases can serve as an alternative (seed phrases remain quantum-safe), meaning migration may not require every wallet to move immediately.

## BIP 360 and Current Proposals
- BIP 360: Matt says this is a proposed new address format for committing to postquantum public keys (not directly related to Taproot).
- There has been discussion about the exact format; a concrete proposal with growing consensus is expected soon (in Bitcoin terms; not necessarily this calendar year).

## On Secret Development of a Quantum Computer and Urgency
- Laura asks about the risk of a secret quantum capability (e.g., nation state) that could be used to steal before defenses are activated.
- Matt acknowledges it's possible but argues:
  - A secret, materially cryptographically relevant quantum computer is likely a nation-state capability and probably would be used for espionage rather than stealing Bitcoin at scale.
  - The case of secret development is a risk for all cryptographic systems, not just Bitcoin.
  - Ultimately every crypto system must decide when to stop accepting old signatures — this is not unique to Bitcoin.

## Public Statements from Influential Developers
- Laura cites Nick Carter’s ranking of influential Bitcoin core developers and their public statements. Matt responds:
  - He disputes some of Nick’s list and notes many in the list do not publicly comment frequently.
  - He distinguishes contributors who actively work on Bitcoin core from those who do not.
  - Example names cited by Laura as "very high influence": Peter Woolly, Greg Maxwell, Jonas Nick, Anthony Towns, Adam Back, Alex Morcos, Michael Ford, Marco Faly, Andrew Pstra, Mara Vanderland, Peter Todd.
  - Matt says a number of these are active developers; others are less active now. Many developers simply work and don’t make grand public statements.

- Specific quotes:
  - Peter Woolly (2025): "I certainly agree there is no urgency right now." Also: "I believe the main quantum related threat to Bitcoin, at least in the medium-term, is not the actual materialization of a cryptographically relevant quantum computer, but the belief whether one may exist soon after."
    - Matt says comments like this are often responses to short horizon claims (2–5 years) and should not be conflated with ignoring the problem. The quantum experts still give long (e.g., ~10-year) horizons.

  - Peter Todd (July 2025): "For all the claims of progress on quantum computing hardware, the fact still remains that no one is even close to demonstrating cryptographic relevant quantum computing capabilities and the actual cryptographic relevant capability as a real hardware are laughable."
    - Matt characterizes developers like Peter Todd and Adam Back as not necessarily contributing actively to Bitcoin Core engineering work.

  - Adam Back (November): "probably not for 20 to 40 years, if then." Matt says a 20–40 year horizon is possible but planning for a less optimistic timeline is prudent.

## Lost/Abandoned Coins and Burning Old Coins
- Laura raises the issue of lost/abandoned coins (estimated ~5% of BTC, ~1.7M BTC) and whether the community would "burn" them to eliminate vulnerable addresses.
- Matt’s view:
  - The decision is up to the market and the community at that future time.
  - If a fork disables insecure spend paths (i.e., burns those coins), the market will likely prefer the fork that preserves scarcity/value. If the alternative allows insecure spend paths and extra coins are stealable and sold, markets will favor the safer fork.
  - He expects debate and people upset, but market dynamics will largely decide which chain is considered "Bitcoin."

## Stakeholders: Custodians like BlackRock
- Laura asks whether custodial institutions (BlackRock ETFs) are primary stakeholders who should influence dev plans/timelines.
- Matt answers:
  - Custodians are stakeholders, but not the most important. Bitcoin development is open-source and developers work on what they think matters.
  - Custodians can hire or fund development; some ETFs/firms (e.g., Bitwise, ARK) have funded dev efforts.
  - Custodians will be economically relevant in the fork decision since they control holdings and can help choose which chain to support, but the market will decide.

## Who Bitcoin Developers Optimize For
- Matt: contributors aim to uphold Bitcoin's principles — especially trustlessness, censorship resistance, and minimizing third-party trust.
- The goal is to let people hold and transact in Bitcoin without counterparty trust. Rapid changes risk introducing new trust requirements, so changes should be careful and principled.

## AI-Caused Classical Crypto Breakthrough Risks
- Laura asks whether AI-driven classical cryptanalysis (a mathematical breakthrough) could break current crypto pre-quantum and whether devs are addressing that.
- Matt:
  - That risk is discussed (classical breakthroughs, possibly aided by AI).
  - There's a limited set of mitigations: for example, requiring two independent signature schemes so at least one survives. This doubles overhead and is impractical for blockchains in general.
  - Many crypto primitives, if broken, leave little room for defense. Often primitives are broken progressively rather than overnight, which allows responses; it's unclear if AI changes that pattern in the short term.

## Compression / Snarks and Data Concerns
- Laura references Justin Drake's idea (Ethereum) to hash many signatures and compress them with ZK proofs (SNARKs) to reduce on-chain data.
- Matt:
  - This is a valid approach: use a postquantum zk-proof to prove validity of many signatures rather than embedding full postquantum signatures in each transaction.
  - That may be a mid-term optimization once the need is immediate.
  - The near-term priority is enabling commitments to postquantum keys so wallets can prepare; optimizing blockspace and transaction size can follow and might include zk compression.
  - If postquantum signatures require much more data, it's possible a block size increase could be considered — depending on hardware capability and other factors — but such changes involve tradeoffs.

## Closing Remarks
- Matt reiterates: people are working on postquantum issues in Bitcoin. There are concrete proposals (e.g., BIP 360), research, and developers funded by organizations addressing the problem.
- He stresses the two-stage approach:
  1. Add commitment capability for postquantum public keys soon.
  2. Flip to require postquantum signatures when the quantum threat becomes urgent.
- The community/market will decide on the final actions and any fork outcomes when the time comes.

Laura thanks Matt for coming on and notes the topic is important given rapid AI progress and potential quantum developments. The show ends with sponsor mentions and sign-off.
