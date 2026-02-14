/**
 * Plugin-Naval — Philosophy, mental models, reading, wealth, happiness (Naval-style)
 *
 * Actions (26):
 * - NAVAL_WISDOM, NAVAL_MENTAL_MODEL, NAVAL_READING (wisdom, frameworks, book recs)
 * - NAVAL_SPECIFIC_KNOWLEDGE_AUDIT: career audit for specific knowledge
 * - NAVAL_LEVERAGE_IDENTIFICATION: code/media/labor/capital, rank by ease to scale
 * - NAVAL_LONG_TERM_GAMES: is this opportunity compounding?
 * - NAVAL_PRODUCTIZE_YOURSELF: 12-month build/sell/scale roadmap
 * - NAVAL_ACCOUNTABILITY_AUTHENTICITY: authentic or for show?
 * - NAVAL_READING_UNDERSTANDING: extract mental models from a book, apply, finish or not
 * - NAVAL_EXPECTED_VALUE: EV calculator, if you can't decide the answer is no
 * - NAVAL_CREDIBILITY_VS_STATUS: audit last 6 months
 * - NAVAL_WEALTH_CREATION_CAPTURE: positive sum vs zero sum
 * - NAVAL_WEALTH_VS_MONEY: wealth = earn while you sleep, money = claim on labor
 * - NAVAL_CRYPTO_WEALTH_MINDSET: crypto build vs speculate, wealth mindset
 * - NAVAL_STARTUP_FOUNDER_CHECK: should I start? idea + specific knowledge + leverage
 * - NAVAL_STARTUP_EQUITY_OWNERSHIP: equity vs salary, raise vs bootstrap, earn equity
 * - NAVAL_HAPPINESS_DESIRE_AUDIT: happiness as skill, desire as contract, peace
 * - NAVAL_MEDITATION_STILLNESS: meditation/stillness for judgment and peace
 * - NAVAL_RENTING_TIME_AUDIT: you won't get rich renting out your time
 * - NAVAL_AVOID_RUIN: Kelly, position sizing, don't bet the farm
 * - NAVAL_ANGEL_INVESTING: how to think about early-stage / angel investing
 * - NAVAL_LONG_TERM_PEOPLE: compounding relationships, who to nurture
 * - NAVAL_ESCAPE_COMPETITION: skill intersections, monopoly
 * - NAVAL_RETIREMENT_COPE: retirement test
 * - NAVAL_BUILD_IN_PUBLIC: accountability leverage
 * - NAVAL_NARROW_NICHE: narrow until obvious choice
 *
 * Naval only. Knowledge: knowledge/naval (and teammate for context).
 */

import type { IAgentRuntime, Plugin } from "@elizaos/core";
import { navalWisdomAction } from "./actions/navalWisdom.action";
import { navalMentalModelAction } from "./actions/navalMentalModel.action";
import { navalReadingAction } from "./actions/navalReading.action";
import { navalSpecificKnowledgeAuditAction } from "./actions/navalSpecificKnowledgeAudit.action";
import { navalLeverageIdentificationAction } from "./actions/navalLeverageIdentification.action";
import { navalLongTermGamesAction } from "./actions/navalLongTermGames.action";
import { navalProductizeYourselfAction } from "./actions/navalProductizeYourself.action";
import { navalAccountabilityAuthenticityAction } from "./actions/navalAccountabilityAuthenticity.action";
import { navalReadingUnderstandingAction } from "./actions/navalReadingUnderstanding.action";
import { navalExpectedValueAction } from "./actions/navalExpectedValue.action";
import { navalCredibilityVsStatusAction } from "./actions/navalCredibilityVsStatus.action";
import { navalWealthCreationCaptureAction } from "./actions/navalWealthCreationCapture.action";
import { navalEscapeCompetitionAction } from "./actions/navalEscapeCompetition.action";
import { navalRetirementCopeAction } from "./actions/navalRetirementCope.action";
import { navalBuildInPublicAction } from "./actions/navalBuildInPublic.action";
import { navalNarrowNicheAction } from "./actions/navalNarrowNiche.action";
import { navalWealthVsMoneyAction } from "./actions/navalWealthVsMoney.action";
import { navalCryptoWealthMindsetAction } from "./actions/navalCryptoWealthMindset.action";
import { navalStartupFounderCheckAction } from "./actions/navalStartupFounderCheck.action";
import { navalStartupEquityOwnershipAction } from "./actions/navalStartupEquityOwnership.action";
import { navalHappinessDesireAuditAction } from "./actions/navalHappinessDesireAudit.action";
import { navalMeditationStillnessAction } from "./actions/navalMeditationStillness.action";
import { navalRentingTimeAuditAction } from "./actions/navalRentingTimeAudit.action";
import { navalAvoidRuinAction } from "./actions/navalAvoidRuin.action";
import { navalAngelInvestingAction } from "./actions/navalAngelInvesting.action";
import { navalLongTermPeopleAction } from "./actions/navalLongTermPeople.action";

export const navalPlugin: Plugin = {
  name: "plugin-naval",
  description:
    "Naval-style philosophy: wisdom, mental models, reading, plus career-audit prompts (specific knowledge, leverage, long-term games, productize yourself, accountability, expected value, credibility vs status, wealth creation vs capture, wealth vs money, crypto wealth mindset, startup founder check, startup equity/ownership, happiness/desire audit, meditation/stillness, renting time audit, avoid ruin, angel investing, long-term people, escape competition, retirement test, build in public, narrow niche). Naval only.",

  actions: [
    navalWisdomAction,
    navalMentalModelAction,
    navalReadingAction,
    navalSpecificKnowledgeAuditAction,
    navalLeverageIdentificationAction,
    navalLongTermGamesAction,
    navalProductizeYourselfAction,
    navalAccountabilityAuthenticityAction,
    navalReadingUnderstandingAction,
    navalExpectedValueAction,
    navalCredibilityVsStatusAction,
    navalWealthCreationCaptureAction,
    navalWealthVsMoneyAction,
    navalCryptoWealthMindsetAction,
    navalStartupFounderCheckAction,
    navalStartupEquityOwnershipAction,
    navalHappinessDesireAuditAction,
    navalMeditationStillnessAction,
    navalRentingTimeAuditAction,
    navalAvoidRuinAction,
    navalAngelInvestingAction,
    navalLongTermPeopleAction,
    navalEscapeCompetitionAction,
    navalRetirementCopeAction,
    navalBuildInPublicAction,
    navalNarrowNicheAction,
  ],

  init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    const name = (runtime.character?.name ?? "").toLowerCase();
    if (name !== "naval") return;
  },
};

export { navalWisdomAction } from "./actions/navalWisdom.action";
export { navalMentalModelAction } from "./actions/navalMentalModel.action";
export { navalReadingAction } from "./actions/navalReading.action";
export { navalSpecificKnowledgeAuditAction } from "./actions/navalSpecificKnowledgeAudit.action";
export { navalLeverageIdentificationAction } from "./actions/navalLeverageIdentification.action";
export { navalLongTermGamesAction } from "./actions/navalLongTermGames.action";
export { navalProductizeYourselfAction } from "./actions/navalProductizeYourself.action";
export { navalAccountabilityAuthenticityAction } from "./actions/navalAccountabilityAuthenticity.action";
export { navalReadingUnderstandingAction } from "./actions/navalReadingUnderstanding.action";
export { navalExpectedValueAction } from "./actions/navalExpectedValue.action";
export { navalCredibilityVsStatusAction } from "./actions/navalCredibilityVsStatus.action";
export { navalWealthCreationCaptureAction } from "./actions/navalWealthCreationCapture.action";
export { navalWealthVsMoneyAction } from "./actions/navalWealthVsMoney.action";
export { navalCryptoWealthMindsetAction } from "./actions/navalCryptoWealthMindset.action";
export { navalStartupFounderCheckAction } from "./actions/navalStartupFounderCheck.action";
export { navalStartupEquityOwnershipAction } from "./actions/navalStartupEquityOwnership.action";
export { navalHappinessDesireAuditAction } from "./actions/navalHappinessDesireAudit.action";
export { navalMeditationStillnessAction } from "./actions/navalMeditationStillness.action";
export { navalRentingTimeAuditAction } from "./actions/navalRentingTimeAudit.action";
export { navalAvoidRuinAction } from "./actions/navalAvoidRuin.action";
export { navalAngelInvestingAction } from "./actions/navalAngelInvesting.action";
export { navalLongTermPeopleAction } from "./actions/navalLongTermPeople.action";
export { navalEscapeCompetitionAction } from "./actions/navalEscapeCompetition.action";
export { navalRetirementCopeAction } from "./actions/navalRetirementCope.action";
export { navalBuildInPublicAction } from "./actions/navalBuildInPublic.action";
export { navalNarrowNicheAction } from "./actions/navalNarrowNiche.action";
