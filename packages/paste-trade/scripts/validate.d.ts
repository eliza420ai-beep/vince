/**
 * Shared thesis validation — used by save.ts and batch-save.ts.
 */
export interface ThesisWho {
    ticker: string;
    direction: string;
    enriched?: boolean;
}
export interface WhyCitation {
    text: string;
    url?: string;
    origin?: "research" | "inference";
}
export interface ThesisObject {
    thesis: string;
    horizon?: string;
    who?: ThesisWho[];
    why: (string | WhyCitation)[];
    quotes: string[];
    headline_quote: string;
    route_status?: "routed" | "unrouted";
    routed?: boolean;
    unrouted_reason?: string;
    route_evidence?: RouteEvidence;
    [key: string]: unknown;
}
export type SubjectKind = "asset" | "company" | "event";
export type FallbackReasonTag = "direct_unavailable" | "direct_unpriceable" | "direct_mismatch" | "direct_weaker_fit";
export interface RouteEvidenceSubject {
    label: string;
    subject_kind?: SubjectKind;
    source_quote?: string;
}
export interface RouteEvidenceDirectCheck {
    subject_label: string;
    ticker_tested: string;
    subject_kind?: SubjectKind;
    executable: boolean;
    perps_available?: boolean;
    shares_available?: boolean;
    assess_args?: string;
    notes?: string[];
}
export interface RouteEvidenceSelectedExpression {
    ticker: string;
    direction?: string;
    instrument?: string;
    platform?: string;
    trade_type?: string;
}
export interface RouteEvidence {
    schema_version?: number;
    subjects: RouteEvidenceSubject[];
    direct_checks: RouteEvidenceDirectCheck[];
    selected_expression: RouteEvidenceSelectedExpression;
    fallback_reason_tag?: FallbackReasonTag | null;
    fallback_reason_text?: string | null;
}
export declare function normalizeRouteStatus(t: Record<string, unknown>): "routed" | "unrouted" | null;
export declare function validate(obj: unknown, options?: {
    requireRouteEvidence?: boolean;
}): {
    valid: boolean;
    errors: string[];
};
