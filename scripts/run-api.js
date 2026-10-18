const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('🚀 Iniciando WorkEz API Backend (.NET 10)...');

const isWin = process.platform === 'win32';
const dotnetCmd = isWin ? 'dotnet.exe' : 'dotnet';

const child = spawn(dotnetCmd, ['run', '--project', 'WorkEzApi/WorkEz.WebUID/WorkEz.WebUID.csproj'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    ASPNETCORE_ENVIRONMENT: 'Development',
    ASPNETCORE_URLS: 'http://0.0.0.0:5065'
  }
});

child.on('error', (err) => {
  console.error('Falha ao iniciar o processo .NET:', err);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
