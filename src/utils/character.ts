import type {
  Character,
  MessageExample,
  MessageExampleGroup,
} from "@elizaos/core";

/**
 * Style object for Character.style. Core expects proto StyleGuides; we pass a plain object and cast.
 */
export function styleGuide(style: {
  all?: string[];
  chat?: string[];
  post?: string[];
}): Character["style"] {
  return style as Character["style"];
}

/**
 * Wrap message example tuples into MessageExampleGroup[] for Character.messageExamples.
 */
export function messageExamplesGroups(
  groups: MessageExample[][],
): MessageExampleGroup[] {
  return groups.map((examples) => ({ examples }));
}
