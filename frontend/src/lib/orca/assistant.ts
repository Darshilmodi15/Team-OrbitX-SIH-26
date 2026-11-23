import type { LangCode } from "./i18n";
import type { LocationInfo, MarineBundle, SafetyLevel } from "./types";

/**
 * ORCA Marine AI - Conversational Assistant Types & Legacy Guard.
 * Synthetic deterministic answer templates remain permanently disabled so all
 * scientific responses must come from verified backend evidence pipelines.
 */

export type AssistantContext = {
  location: LocationInfo | null;
  bundle: MarineBundle | null;
  levelLabel?: (l: SafetyLevel) => string;
  lang?: LangCode | string;
  history?: Array<{ role: string; text: string }>;
};

export function answerQuestion(_question: string, _ctx: AssistantContext): string {
  throw new Error("LEGACY_SYNTHETIC_TEMPLATE_DISABLED");
}
