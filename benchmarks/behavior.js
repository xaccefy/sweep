// Deterministic graders for the opt-in Sweep behavior benchmark. Each probe
// checks an observable behavior, not whether the answer repeats skill wording.

function proseOf(text) {
  return String(text || '').replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').trim();
}

const CHECKS = {
  hardware(output) {
    const actionable = /\bdrift|per[- ]unit|part[- ]to[- ]part|measure your own|\btare\b|\btrim\b|\bknob|\btuning\b|reads off|known (temp|reference|value)|reference (thermometer|sensor)|calibration (offset|constant|param|knob)/i.test(String(output || ''));
    return actionable
      ? { pass: true, reason: 'Leaves an actionable calibration path.' }
      : { pass: false, reason: 'Treats real hardware as ideal.' };
  },

  explanation(output) {
    const prose = proseOf(output);
    const words = prose ? prose.split(' ').length : 0;
    const explainsWhy = /(\d+[.)]\s|[-*]\s)/.test(String(output || '')) || /\bbecause\b|\bwhy\b|\bso that\b|renamed|inlined|removed|replaced/i.test(prose);
    return words >= 45 && explainsWhy
      ? { pass: true, reason: `Provides the requested explanation (${words} prose words).` }
      : { pass: false, reason: `Truncates the requested explanation (${words} prose words).` };
  },

  onecheck(output) {
    const hasCheck = /\bassert\b|def\s+test_|if\s+__name__|unittest|pytest|console\.assert|\bexpect\(|\bdescribe\(|\bit\(/.test(String(output || ''));
    return hasCheck
      ? { pass: true, reason: 'Leaves one runnable check.' }
      : { pass: false, reason: 'Leaves no runnable check for non-trivial logic.' };
  },

  reuse(output) {
    const text = String(output || '');
    const uses = (text.match(/\bslugify\b/g) || []).length >= 2;
    const redefines = /function\s+slugify|(?:const|let|var)\s+slugify\s*=|def\s+slugify/.test(text);
    return uses && !redefines
      ? { pass: true, reason: 'Reuses the existing slugify helper.' }
      : { pass: false, reason: 'Reimplements or ignores the existing helper.' };
  },

  native(output) {
    const text = String(output || '');
    const input = /<input\b/i.test(text) && /type=["']date["']/i.test(text);
    const dependency = /npm\s+(?:i|install)\s+(?:flatpickr|react-datepicker|date-fns)|import\s+.+from\s+["'](?:flatpickr|react-datepicker|date-fns)|new\s+DatePicker/i.test(text);
    return input && !dependency
      ? { pass: true, reason: 'Uses the native date input without a new dependency.' }
      : { pass: false, reason: 'Misses the native date input or adds a picker dependency.' };
  },

  boundary(output) {
    const text = String(output || '');
    const canonicalizes = /\.resolve\(|realpath|commonpath|relative_to|resolve\(\)/i.test(text);
    const rejects = /\braise\b|\bthrow\b|ValueError|PermissionError|path traversal|outside (?:the )?(?:base|upload)|escapes? (?:the )?(?:base|upload)/i.test(text);
    return canonicalizes && rejects
      ? { pass: true, reason: 'Canonicalizes and rejects an escaping upload path.' }
      : { pass: false, reason: 'Does not demonstrate a closed path-traversal boundary.' };
  },

  completeness(output) {
    const text = String(output || '');
    const dryRun = /--dry-run|dry_run|dryRun/.test(text);
    const format = /--format|choices?.*json.*text|json.*text/.test(text);
    const deferred = /left (?:out|for later)|not implemented|skipped.*(?:format|dry)|TODO/i.test(text);
    return dryRun && format && !deferred
      ? { pass: true, reason: 'Implements both requested CLI behaviors.' }
      : { pass: false, reason: 'Drops or defers part of the requested behavior.' };
  },
};

module.exports = (output, context = {}) => {
  const probe = context.vars?.probe;
  const check = CHECKS[probe];
  if (!check) return { pass: false, score: 0, reason: `Unknown probe '${probe}'` };
  const result = check(output);
  return { ...result, score: result.pass ? 1 : 0 };
};
