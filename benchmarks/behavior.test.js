const assert = require('node:assert/strict');
const test = require('node:test');
const behavior = require('./behavior');

const check = (probe, output) => behavior(output, { vars: { probe } });

const cases = [
  ['hardware', 'def read_c(beta=3950): pass\n# beta is a calibration knob; measure your own sensor against a reference thermometer.', true],
  ['hardware', 'def read_c(): return adc.read(0) * 0.1', false],
  ['explanation', '```py\ndef positives(rows): return [x * 2 for x in rows if x > 0]\n```\n1. Renamed the function because its purpose is now explicit. 2. Replaced the loop with a comprehension so that collection and transformation stay together. 3. Preserved the positive-value filter because changing behavior was not requested. 4. Kept one return path so the result remains easy to inspect and test.', true],
  ['explanation', '```py\ndef positives(rows): return [x * 2 for x in rows if x > 0]\n```\nSimplified it.', false],
  ['onecheck', 'def seconds(value): return 60\nassert seconds("1m") == 60', true],
  ['onecheck', 'def seconds(value): return 60', false],
  ['reuse', 'import { slugify } from "./utils.js";\napp.get("/:title", req => slugify(req.params.title));', true],
  ['reuse', 'function slugify(value) { return value.toLowerCase().replaceAll(" ", "-"); }', false],
  ['native', '<label>Date <input type="date" name="date"></label>', true],
  ['native', '<input name="date" type="date">\nSkipped flatpickr because the browser already provides this control.', true],
  ['native', 'npm install flatpickr\nconst picker = new DatePicker(input);', false],
  ['boundary', 'const target = path.resolve(base, filename);\nif (!target.startsWith(path.resolve(base) + path.sep)) throw new Error("path traversal outside upload directory");', true],
  ['boundary', 'const target = path.join(base, filename);\nfs.writeFileSync(target, bytes);', false],
  ['completeness', 'program.option("--dry-run").option("--format <json|text>");\nif (opts.dryRun) return preview(opts.format);', true],
  ['completeness', 'program.option("--dry-run"); // TODO: --format later', false],
];

for (const [probe, output, expected] of cases) {
  test(`${probe}: ${expected ? 'passing' : 'failing'} fixture`, () => {
    const result = check(probe, output);
    assert.equal(result.pass, expected, result.reason);
    assert.equal(result.score, expected ? 1 : 0);
  });
}

test('unknown probes fail closed', () => {
  const result = check('missing', 'anything');
  assert.equal(result.pass, false);
  assert.match(result.reason, /Unknown probe/);
});
