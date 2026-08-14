const path = require('node:path');

const { getSweepInstructions } = require(path.join(__dirname, '..', '..', 'hooks', 'sweep-instructions.js'));
const system = getSweepInstructions('full');

module.exports = ({ vars }) => [
  { role: 'system', content: system },
  { role: 'user', content: vars.task },
];
