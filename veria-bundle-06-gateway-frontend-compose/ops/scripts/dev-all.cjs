// naive multi-process launcher to avoid new deps
const { spawn } = require('child_process');

const procs = [
  ['pnpm', ['--filter', '@veria/audit-log-writer', 'dev']],
  ['pnpm', ['--filter', '@veria/compliance-service', 'dev']],
  ['pnpm', ['--filter', '@veria/identity-service', 'dev']],
  ['pnpm', ['--filter', '@veria/policy-service', 'dev']],
  ['pnpm', ['--filter', '@veria/gateway', 'dev']],
  ['pnpm', ['--filter', '@veria/frontend', 'dev']],
];

const children = procs.map(([cmd, args]) => spawn(cmd, args, { stdio: 'inherit', shell: true }));

process.on('SIGINT', () => {
  children.forEach(p => p.kill('SIGINT'));
  process.exit(0);
});
