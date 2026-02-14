/**
 * Plugin-Naval — Philosophy, mental models, reading, wealth, happiness (Naval-style)
 *
 * Actions (16):
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

export const navalPlugin: Plugin = {
  name: "plugin-naval",
  description:
    "Naval-style philosophy: wisdom, mental models, reading, plus 13 career-audit prompts (specific knowledge, leverage, long-term games, productize yourself, accountability, reading for understanding, expected value, credibility vs status, wealth creation vs capture, escape competition, retirement test, build in public, narrow niche). Naval only.",

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
export { navalEscapeCompetitionAction } from "./actions/navalEscapeCompetition.action";
export { navalRetirementCopeAction } from "./actions/navalRetirementCope.action";
export { navalBuildInPublicAction } from "./actions/navalBuildInPublic.action";
export { navalNarrowNicheAction } from "./actions/navalNarrowNiche.action";
