/** Cheap, explainable checks for prompt-injection attempts. A score of 3 or more is treated as an attack. */

const RULES: ReadonlyArray<{ id: string; weight: number; re: RegExp }> = [
  { id: "override_instructions", weight: 3, re: /\b(?:ignore|forget|override)\b[^.\n]{0,30}\b(?:previous|prior|above|earlier|all|your)\b[^.\n]{0,20}\b(?:instructions?|prompts?|rules?)\b/i },
  { id: "disregard_rules", weight: 3, re: /\bdisregard\b[^.\n]{0,40}\b(?:instructions?|rules?|guidelines?|polic(?:y|ies))\b/i },
  { id: "reveal_prompt", weight: 3, re: /\b(?:reveal|show|print|repeat|output|leak)\b[^.\n]{0,30}\b(?:system prompt|hidden instructions?|your instructions|initial prompt)\b/i },
  { id: "persona_swap", weight: 2, re: /\b(?:you are now|act as|pretend to be)\b[^.\n]{0,30}\b(?:dan|unrestricted|unfiltered|jailbroken|developer mode)\b|\bdeveloper mode\b|\bjailbreak\b/i },
  { id: "fake_role_tag", weight: 2, re: /<\/?(?:system|assistant|developer)>|^\s*(?:system|assistant)\s*:/im },
  { id: "exfiltrate", weight: 2, re: /\b(?:send|email|fax|post|upload|forward|exfiltrate)\b[^.\n]{0,60}(?:https?:\/\/|\b[\w.+-]+@[\w-]+\.[\w.]+)/i },
  { id: "encoded_payload", weight: 1, re: /\b(?:base64|decode (?:this|the following)) /i },
  { id: "other_patients", weight: 2, re: /\b(?:all|every|other) (?:patients?|charts?|records?)\b/i },
];

export interface InjectionScore { score: number; hits: string[] }

export function scoreInjection(text: string): InjectionScore {
  const hits: string[] = [];
  let score = 0;
  for (const r of RULES) {
    if (r.re.test(text)) { hits.push(r.id); score += r.weight; }
  }
  return { score, hits };
}
