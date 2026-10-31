/**
 * Replaces identifiers with stable tokens such as [[SSN_1]] before text reaches a model.
 * Pattern matching catches structured identifiers; names and free-text identifiers are
 * only caught when the caller lists them in `known`. This is a safety net, not a
 * guarantee, which is why output is screened too and risky results wait for a human.
 */

export type IdentifierKind =
  | "NAME" | "PATIENT" | "SSN" | "PHONE" | "EMAIL" | "DATE" | "ID" | "ADDRESS" | "ZIP";

export interface KnownIdentifier { value: string; kind: IdentifierKind }

export interface RedactionResult {
  text: string;
  /** token -> original value. Keep server-side; never send to a model. */
  tokens: Map<string, string>;
  /** Count per kind. Contains no values. */
  counts: Partial<Record<IdentifierKind, number>>;
}

const MONTHS = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

export const PATTERNS: ReadonlyArray<{ kind: IdentifierKind; re: RegExp; group?: number }> = [
  { kind: "SSN", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { kind: "EMAIL", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { kind: "PHONE", re: /(?<![\d-])(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g },
  { kind: "DATE", re: /\b\d{1,2}\/\d{1,2}\/(?:\d{4}|\d{2})\b/g },
  { kind: "DATE", re: /\b\d{4}-\d{2}-\d{2}\b/g },
  { kind: "DATE", re: new RegExp(`\\b${MONTHS}\\.? \\d{1,2}(?:st|nd|rd|th)?,? \\d{4}\\b`, "gi") },
  // Record numbers: keep the label, tokenize the number.
  { kind: "ID", re: /\b(?:MRN|Member ID|Subscriber ID|Policy(?: No\.?| number)?|Claim(?: No\.?| #)?)[:# ]+\s*([A-Z0-9][A-Z0-9-]{4,})\b/gi, group: 1 },
  { kind: "ADDRESS", re: /\b\d{1,5} (?:[A-Z][a-z]+ ){1,3}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Way)\b\.?/g },
  { kind: "ZIP", re: /\b[A-Z]{2} \d{5}(?:-\d{4})?\b/g },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function redact(input: string, known: readonly KnownIdentifier[] = []): RedactionResult {
  const tokens = new Map<string, string>();
  const byValue = new Map<string, string>();
  const counts: RedactionResult["counts"] = {};
  const seq: Partial<Record<IdentifierKind, number>> = {};

  const tokenFor = (kind: IdentifierKind, value: string): string => {
    const key = `${kind}:${value.toLowerCase()}`;
    const existing = byValue.get(key);
    counts[kind] = (counts[kind] ?? 0) + 1;
    if (existing) return existing;
    const n = (seq[kind] = (seq[kind] ?? 0) + 1);
    const token = `[[${kind}_${n}]]`;
    byValue.set(key, token);
    tokens.set(token, value);
    return token;
  };

  let text = input;
  // Longest known values first so "Jane Doe" wins over "Jane".
  for (const k of [...known].filter((k) => k.value.trim()).sort((a, b) => b.value.length - a.value.length)) {
    text = text.replace(new RegExp(escape(k.value.trim()), "gi"), (m) => tokenFor(k.kind, m));
  }
  for (const p of PATTERNS) {
    text = text.replace(p.re, (...args) => {
      const m = args[0] as string;
      if (p.group === undefined) return tokenFor(p.kind, m);
      const captured = args[p.group] as string;
      return m.replace(captured, tokenFor(p.kind, captured));
    });
  }
  return { text, tokens, counts };
}

/** Finds identifier patterns without changing the text. Used to screen model output. */
export function detect(text: string, known: readonly KnownIdentifier[] = []): IdentifierKind[] {
  const found = new Set<IdentifierKind>();
  for (const k of known) {
    if (k.value.trim() && new RegExp(escape(k.value.trim()), "i").test(text)) found.add(k.kind);
  }
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    if (p.re.test(text)) found.add(p.kind);
    p.re.lastIndex = 0;
  }
  return [...found];
}

export function rehydrate(text: string, tokens: ReadonlyMap<string, string>): string {
  return text.replace(/\[\[[A-Z]+_\d+\]\]/g, (t) => tokens.get(t) ?? t);
}
