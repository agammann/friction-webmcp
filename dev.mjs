import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['node_modules/vinext/dist/cli.js', 'dev', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, FRICTION_LOCAL_PREVIEW: '1' } });
child.on('exit', code => process.exit(code ?? 1));
