#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(SCRIPTS_ROOT, '..');

// Script categories and their scripts
const SCRIPTS = {
  services: {
    name: '🚀 Services',
    description: 'Start individual services',
    scripts: {
      'auth': { file: 'start_auth.ps1', desc: 'Auth Service (port 8003)' },
    },
    subcategories: {
      tts: {
        name: '🎫 TTS',
        description: 'Ticket Tracking System',
        scripts: {
          'workflow': { file: 'tts/start_workflow.ps1', desc: 'Workflow API (port 8002)' },
          'workflow-worker': { file: 'tts/start_workflow_worker.ps1', desc: 'Workflow Celery Worker' },
          'notification': { file: 'tts/start_notification.ps1', desc: 'Notification Service (port 8006)' },
          'notification-worker': { file: 'tts/start_notification_worker.ps1', desc: 'Notification Celery Worker' },
          'messaging': { file: 'tts/start_messaging.ps1', desc: 'Messaging Service (port 8005)' },
          'ticket': { file: 'tts/start_ticket.ps1', desc: 'Ticket Service (port 8004)' },
          'frontend': { file: 'tts/start_frontend.ps1', desc: 'Frontend (port 1000)' },
        }
      },
      hdts: {
        name: '🛠️ HDTS',
        description: 'Help Desk Tracking System',
        scripts: {
          'backend': { file: 'hdts/start_helpdesk_backend.ps1', desc: 'Helpdesk Backend' },
          'worker': { file: 'hdts/start_helpdesk_backend_worker.ps1', desc: 'Helpdesk Celery Worker' },
          'frontend': { file: 'hdts/start_helpdesk_frontend.ps1', desc: 'Helpdesk Frontend' },
        }
      }
    }
  },
  docker: {
    name: '🐳 Docker',
    description: 'Docker-related commands',
    scripts: {
      'rabbitmq': { file: 'start_rabbitmq.ps1', desc: 'Start RabbitMQ container' },
      'docker-compose': { file: 'docker.sh', desc: 'Run Docker Compose setup (bash)', shell: 'bash' },
    }
  },
  setup: {
    name: '⚙️ Setup',
    description: 'Setup and seeding scripts',
    scripts: {
      'migrate-seed': { file: 'restart_all_services.ps1', desc: 'Migrate & Seed all services', args: ['-Seed'] },
      'flush-migrate-seed': { file: 'restart_all_services.ps1', desc: 'Flush DBs, Migrate & Seed', args: ['-FlushDB', '-Seed'] },
      'migrate-only': { file: 'restart_all_services.ps1', desc: 'Run migrations only' },
      'seed-workflow-hdts': { file: 'seed_workflow_helpdesk.ps1', desc: 'Seed Workflow & Helpdesk data' },
      'setup-ams': { file: 'setup_and_test_ams.ps1', desc: 'Setup and test AMS' },
      'init': { file: 'init.sh', desc: 'Initialize project (bash)', shell: 'bash' },
      'reset': { file: 'reset.sh', desc: 'Reset project (bash)', shell: 'bash' },
      'env': { file: 'env.sh', desc: 'Setup environment (bash)', shell: 'bash' },
    }
  },
  testing: {
    name: '🧪 Testing',
    description: 'Test scripts',
    scripts: {
      'test-ams': { file: 'test_ams_api.py', desc: 'Test AMS API', shell: 'python' },
      'test-bms': { file: 'test_bms_api.py', desc: 'Test BMS API', shell: 'python' },
      'test-bms-ps': { file: 'test_bms_api.ps1', desc: 'Test BMS API (PowerShell)' },
    }
  },
  utils: {
    name: '🔧 Utilities',
    description: 'Utility scripts',
    scripts: {
      'delete-migrations': { file: 'delete_migrations_workflow_api.sh', desc: 'Delete workflow API migrations', shell: 'bash' },
    }
  },
  pm2: {
    name: '📦 PM2',
    description: 'PM2 process manager commands',
    scripts: {
      'start-all': { cmd: 'pm2 start ecosystem.config.js', desc: 'Start all services with PM2' },
      'stop-all': { cmd: 'pm2 stop all', desc: 'Stop all PM2 services' },
      'restart-all': { cmd: 'pm2 restart all', desc: 'Restart all PM2 services' },
      'logs': { cmd: 'pm2 logs', desc: 'View PM2 logs' },
      'status': { cmd: 'pm2 list', desc: 'Show PM2 process status' },
      'delete-all': { cmd: 'pm2 delete all', desc: 'Delete all PM2 processes' },
    }
  }
};

// Helper to convert Windows path to POSIX path for bash (Git Bash/MINGW64)
function toPosixPath(windowsPath) {
  // Handle Git Bash MINGW64 style paths (e.g., C:\path -> /c/path)
  return windowsPath
    .replace(/\\/g, '/')           // Replace backslashes with forward slashes
    .replace(/^([A-Za-z]):/, (match, drive) => `/${drive.toLowerCase()}`); // Convert C: to /c (Git Bash style)
}

// Helper to fix line endings in script file
function fixLineEndings(scriptPath) {
  try {
    const content = fs.readFileSync(scriptPath, 'utf8');
    const fixed = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    fs.writeFileSync(scriptPath, fixed, 'utf8');
  } catch (err) {
    console.log(chalk.yellow(`Warning: Could not fix line endings: ${err.message}`));
  }
}

// Helper to run a script
function runScript(category, scriptKey, extraArgs = []) {
  const script = SCRIPTS[category]?.scripts[scriptKey];
  if (!script) {
    console.log(chalk.red(`Script '${scriptKey}' not found in category '${category}'`));
    return;
  }

  let command, args, cwd;

  if (script.cmd) {
    // Direct command (PM2 commands)
    const parts = script.cmd.split(' ');
    command = parts[0];
    args = [...parts.slice(1), ...extraArgs];
    cwd = PROJECT_ROOT;
  } else {
    // Script file
    const scriptPath = path.join(SCRIPTS_ROOT, category, script.file);
    
    if (!fs.existsSync(scriptPath)) {
      console.log(chalk.red(`Script file not found: ${scriptPath}`));
      return;
    }

    cwd = PROJECT_ROOT;

    if (script.shell === 'bash') {
      // Fix line endings before running
      fixLineEndings(scriptPath);
      command = 'bash';
      // Convert Windows path to POSIX for bash and quote it
      const posixPath = toPosixPath(scriptPath);
      args = [`"${posixPath}"`, ...extraArgs];
    } else if (script.shell === 'python') {
      command = path.join(PROJECT_ROOT, 'venv', 'Scripts', 'python.exe');
      args = [scriptPath, ...extraArgs];
    } else {
      // PowerShell script
      command = 'powershell';
      // Quote the script path if it contains spaces
      const quotedPath = scriptPath.includes(' ') ? `"${scriptPath}"` : scriptPath;
      args = ['-ExecutionPolicy', 'Bypass', '-File', quotedPath, ...(script.args || []), ...extraArgs];
    }
  }

  console.log(chalk.cyan(`\n▶ Running: ${script.desc || scriptKey}`));
  console.log(chalk.gray(`  Command: ${command} ${args.join(' ')}\n`));

  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true
  });

  child.on('error', (err) => {
    console.log(chalk.red(`Error: ${err.message}`));
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green(`\n✓ Completed successfully`));
    } else {
      console.log(chalk.yellow(`\n⚠ Exited with code ${code}`));
    }
  });
}

// Helper to run a script from a subcategory
function runScriptFromSubcategory(category, subcategoryKey, scriptKey, extraArgs = []) {
  const script = SCRIPTS[category]?.subcategories?.[subcategoryKey]?.scripts?.[scriptKey];
  if (!script) {
    console.log(chalk.red(`Script '${scriptKey}' not found in subcategory '${subcategoryKey}'`));
    return;
  }

  let command, args, cwd;

  // Script file
  const scriptPath = path.join(SCRIPTS_ROOT, category, script.file);
  
  if (!fs.existsSync(scriptPath)) {
    console.log(chalk.red(`Script file not found: ${scriptPath}`));
    return;
  }

  cwd = PROJECT_ROOT;

  if (script.shell === 'bash') {
    fixLineEndings(scriptPath);
    command = 'bash';
    const posixPath = toPosixPath(scriptPath);
    args = [`"${posixPath}"`, ...extraArgs];
  } else if (script.shell === 'python') {
    command = path.join(PROJECT_ROOT, 'venv', 'Scripts', 'python.exe');
    args = [scriptPath, ...extraArgs];
  } else {
    // PowerShell script
    command = 'powershell';
    const quotedPath = scriptPath.includes(' ') ? `"${scriptPath}"` : scriptPath;
    args = ['-ExecutionPolicy', 'Bypass', '-File', quotedPath, ...(script.args || []), ...extraArgs];
  }

  console.log(chalk.cyan(`\n▶ Running: ${script.desc || scriptKey}`));
  console.log(chalk.gray(`  Command: ${command} ${args.join(' ')}\n`));

  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true
  });

  child.on('error', (err) => {
    console.log(chalk.red(`Error: ${err.message}`));
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green(`\n✓ Completed successfully`));
    } else {
      console.log(chalk.yellow(`\n⚠ Exited with code ${code}`));
    }
  });
}

// Interactive menu
async function interactiveMenu() {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║     Capstone System Script Manager CLI             ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════╝\n'));

  const categoryChoices = Object.entries(SCRIPTS).map(([key, cat]) => ({
    name: `${cat.name} - ${cat.description}`,
    value: key
  }));
  categoryChoices.push({ name: chalk.red('✖ Exit'), value: 'exit' });

  const { category } = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: 'Select a category:',
      choices: categoryChoices
    }
  ]);

  if (category === 'exit') {
    console.log(chalk.gray('Goodbye!'));
    process.exit(0);
  }

  await showCategoryMenu(category);
}

// Show category menu (handles subcategories)
async function showCategoryMenu(category) {
  const cat = SCRIPTS[category];
  const choices = [];

  // Add direct scripts first
  if (cat.scripts) {
    Object.entries(cat.scripts).forEach(([key, script]) => {
      choices.push({
        name: `${key} - ${script.desc}`,
        value: { type: 'script', key }
      });
    });
  }

  // Add subcategories
  if (cat.subcategories) {
    Object.entries(cat.subcategories).forEach(([key, subcat]) => {
      choices.push({
        name: `${subcat.name} - ${subcat.description} →`,
        value: { type: 'subcategory', key }
      });
    });
  }

  choices.push({ name: chalk.yellow('← Back'), value: { type: 'back' } });

  const { selection } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: `Select from ${cat.name}:`,
      choices
    }
  ]);

  if (selection.type === 'back') {
    return interactiveMenu();
  }

  if (selection.type === 'subcategory') {
    return showSubcategoryMenu(category, selection.key);
  }

  if (selection.type === 'script') {
    runScript(category, selection.key);
  }
}

// Show subcategory menu
async function showSubcategoryMenu(category, subcategoryKey) {
  const subcat = SCRIPTS[category].subcategories[subcategoryKey];
  
  const choices = Object.entries(subcat.scripts).map(([key, script]) => ({
    name: `${key} - ${script.desc}`,
    value: key
  }));
  choices.push({ name: chalk.yellow('← Back'), value: 'back' });

  const { script } = await inquirer.prompt([
    {
      type: 'list',
      name: 'script',
      message: `Select from ${subcat.name}:`,
      choices
    }
  ]);

  if (script === 'back') {
    return showCategoryMenu(category);
  }

  runScriptFromSubcategory(category, subcategoryKey, script);
}

// List all scripts
function listScripts() {
  console.log(chalk.bold.cyan('\n📋 Available Scripts:\n'));
  
  for (const [catKey, category] of Object.entries(SCRIPTS)) {
    console.log(chalk.bold.yellow(`\n${category.name}`));
    console.log(chalk.gray(`  ${category.description}`));
    
    for (const [scriptKey, script] of Object.entries(category.scripts)) {
      console.log(chalk.white(`    ${catKey}:${scriptKey}`));
      console.log(chalk.gray(`      ${script.desc}`));
    }
  }
  
  console.log(chalk.cyan('\n💡 Usage: tts run <category>:<script>'));
  console.log(chalk.gray('   Example: tts run services:auth\n'));
}

// CLI Setup
program
  .name('tts')
  .description('CLI Manager for Ticket Tracking System')
  .version('1.0.0');

program
  .command('menu')
  .alias('m')
  .description('Open interactive menu')
  .action(interactiveMenu);

program
  .command('list')
  .alias('ls')
  .description('List all available scripts')
  .action(listScripts);

program
  .command('run <script>')
  .alias('r')
  .description('Run a script (format: category:script)')
  .action((script) => {
    const [category, scriptKey] = script.split(':');
    if (!category || !scriptKey) {
      console.log(chalk.red('Invalid format. Use: category:script'));
      console.log(chalk.gray('Example: tts run services:auth'));
      return;
    }
    runScript(category, scriptKey);
  });

// Quick commands
program
  .command('start')
  .description('Start all services with PM2')
  .action(() => runScript('pm2', 'start-all'));

program
  .command('stop')
  .description('Stop all PM2 services')
  .action(() => runScript('pm2', 'stop-all'));

program
  .command('restart')
  .description('Restart all PM2 services')
  .action(() => runScript('pm2', 'restart-all'));

program
  .command('logs [service]')
  .description('View PM2 logs')
  .action((service) => {
    const cmd = service ? `pm2 logs ${service}` : 'pm2 logs';
    spawn('powershell', ['-Command', cmd], { stdio: 'inherit', shell: true });
  });

program
  .command('status')
  .description('Show PM2 process status')
  .action(() => runScript('pm2', 'status'));

program
  .command('seed')
  .description('Run migrations and seed data')
  .action(() => runScript('setup', 'migrate-seed'));

program
  .command('flush')
  .description('Flush DBs, migrate, and seed')
  .action(() => runScript('setup', 'flush-migrate-seed'));

// Default to interactive menu if no command
if (process.argv.length <= 2) {
  interactiveMenu();
} else {
  program.parse();
}
