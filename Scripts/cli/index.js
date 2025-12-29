#!/usr/bin/env node

require('dotenv').config({ path: __dirname + '/.env' }); // Load .env from this directory
const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const spawn = require('cross-spawn'); // Cross-platform spawn
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const SCRIPTS_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(SCRIPTS_ROOT, '..');
const ENV_FILE = path.join(__dirname, '.env');

/**
 * Check if .env file exists, if not run setup
 */
function ensureEnvironmentSetup() {
  if (!fs.existsSync(ENV_FILE)) {
    console.log(chalk.yellow('\n⚠️  Environment configuration not found!'));
    console.log(chalk.cyan('Running setup to detect your environment...\n'));
    
    try {
      execSync('node setup-env.js', {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
      });
      console.log(chalk.cyan('\nReloading environment configuration...\n'));
      // Reload dotenv after setup
      require('dotenv').config({ path: ENV_FILE, override: true });
    } catch (err) {
      console.log(chalk.red(`\n✗ Setup failed: ${err.message}`));
      console.log(chalk.yellow('Please run setup manually: node Scripts/cli/setup-env.js\n'));
      process.exit(1);
    }
  }
}

// Run setup check before anything else
ensureEnvironmentSetup();

/**
 * CONFIGURATION
 * Default to command names (assumes they're in PATH).
 * Users can override in a .env file: PYTHON_CMD=python3
 */
const CMD = {
  python: process.env.PYTHON_CMD || 'python',
  bash: process.env.BASH_CMD || 'bash',
  pm2: process.env.PM2_CMD || 'pm2',
  powershell: process.env.POWERSHELL_CMD || 'powershell'
};

// Check for Python Venv
if (!process.env.VIRTUAL_ENV && !process.env.PYTHON_CMD) {
  console.log(chalk.yellow('⚠️  Warning: No Virtual Environment detected.'));
  console.log(chalk.gray('   If your scripts require dependencies, please activate your venv first.'));
  console.log(chalk.gray('   Example: .\\venv\\Scripts\\activate\n'));
}

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
      'tts-docker-compose': { file: 'tts-docker-compose.sh', desc: 'TTS docker compose', shell: 'bash' },
    }
  },
  setup: {
    name: '⚙️ Setup',
    description: 'Setup and seeding scripts',
    scripts: {},
    subcategories: {
      tts: {
        name: '🎫 TTS',
        description: 'Ticket Tracking System Setup',
        scripts: {
          'seed': { file: 'restart_all_services.ps1', desc: 'Migrate & Seed all services', args: ['-Seed'] },
          'flush-seed': { file: 'restart_all_services.ps1', desc: 'Flush DBs, Migrate & Seed', args: ['-FlushDB', '-Seed'] },
          'migrate': { file: 'restart_all_services.ps1', desc: 'Run migrations only' },
          'seed-workflow-hdts': { file: 'seed_workflow_helpdesk.ps1', desc: 'Seed Workflow & Helpdesk data' },
        }
      },
      ams: {
        name: '🏢 AMS',
        description: 'Asset Management System Setup',
        scripts: {
          'setup': { file: 'setup_and_test_ams.ps1', desc: 'Setup and test AMS' }
        }
      },
      hdts: {
        name: '🛠️ HDTS',
        description: 'Help Desk Tracking System Setup',
        scripts: {}
      },
      bms: {
        name: '💰 BMS',
        description: 'Budget Management System Setup',
        scripts: {}
      }
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
    scripts: {}, // Generic scripts moved to subcategories
    subcategories: {
      tts: {
        name: '🎫 TTS',
        description: 'Ticket Tracking System Processes',
        scripts: {
          'start': { cmd: 'pm2 start Scripts/processes/tts-ecosystem.config.js', desc: 'Start TTS ecosystem' },
          'stop': { cmd: 'pm2 stop all', desc: 'Stop all PM2 services' },
          'restart': { cmd: 'pm2 restart all', desc: 'Restart all PM2 services' },
          'logs': { cmd: 'pm2 logs', desc: 'View PM2 logs' },
          'status': { cmd: 'pm2 list', desc: 'Show PM2 process status' },
          'delete': { cmd: 'pm2 delete all', desc: 'Delete all PM2 processes' },
        }
      },
      ams: {
        name: '🏢 AMS',
        description: 'Asset Management System Processes',
        scripts: {}
      },
      hdts: {
        name: '🛠️ HDTS',
        description: 'Help Desk Tracking System Processes',
        scripts: {}
      },
      bms: {
        name: '💰 BMS',
        description: 'Budget Management System Processes',
        scripts: {}
      }
    }
  }
};

// Helper to fix line endings in script file (useful for cross-platform git usage)
function fixLineEndings(scriptPath) {
  try {
    if (fs.existsSync(scriptPath)) {
      const content = fs.readFileSync(scriptPath, 'utf8');
      // Only write if we actually find CRLF to save IO
      if (content.includes('\r\n')) {
        const fixed = content.replace(/\r\n/g, '\n');
        fs.writeFileSync(scriptPath, fixed, 'utf8');
      }
    }
  } catch (err) {
    // Silent fail
  }
}

// Unified command executor using cross-spawn
function executeCommand(command, args, cwd = PROJECT_ROOT) {
  console.log(chalk.gray(`> ${command} ${args.join(' ')}\n`));

  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env } // Pass current env (vital for venv)
  });

  child.on('error', (err) => {
    console.log(chalk.red(`Failed to start command: ${command}`));
    console.log(chalk.yellow(`Error: ${err.message}`));
    if (err.code === 'ENOENT') {
      console.log(chalk.yellow(`Hint: Is '${command}' installed and in your PATH?`));
    }
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green(`\n✓ Completed successfully`));
    } else {
      console.log(chalk.yellow(`\n⚠ Exited with code ${code}`));
    }
  });
}

// Helper to run a script
function runScript(category, scriptKey, extraArgs = []) {
  const script = SCRIPTS[category]?.scripts[scriptKey];
  if (!script) {
    console.log(chalk.red(`Script '${scriptKey}' not found in category '${category}'`));
    return;
  }

  console.log(chalk.cyan(`\n▶ Running: ${script.desc || scriptKey}`));

  // Case A: Direct command (PM2 commands)
  if (script.cmd) {
    const [exec, ...args] = script.cmd.split(' ');
    // Use CMD config if it's a known command
    const finalExec = exec === 'pm2' ? CMD.pm2 : exec;
    executeCommand(finalExec, [...args, ...extraArgs]);
    return;
  }

  // Case B: Script file execution
  const scriptPath = path.join(SCRIPTS_ROOT, category, script.file);
  if (!fs.existsSync(scriptPath)) {
    console.log(chalk.red(`Script file not found: ${scriptPath}`));
    return;
  }

  // Determine execution based on shell type or file extension
  if (script.shell === 'bash' || script.file.endsWith('.sh')) {
    fixLineEndings(scriptPath);
    // Convert to forward slashes for bash compatibility
    const posixPath = scriptPath.split(path.sep).join('/');
    executeCommand(CMD.bash, [posixPath, ...extraArgs]);

  } else if (script.shell === 'python' || script.file.endsWith('.py')) {
    executeCommand(CMD.python, [scriptPath, ...extraArgs]);

  } else if (script.file.endsWith('.ps1')) {
    executeCommand(CMD.powershell, [
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      ...(script.args || []),
      ...extraArgs
    ]);
  } else {
    console.log(chalk.red(`Unknown script type for: ${script.file}`));
  }
}

// Helper to run a script from a subcategory
function runScriptFromSubcategory(category, subcategoryKey, scriptKey, extraArgs = []) {
  const script = SCRIPTS[category]?.subcategories?.[subcategoryKey]?.scripts?.[scriptKey];
  if (!script) {
    console.log(chalk.red(`Script '${scriptKey}' not found in subcategory '${subcategoryKey}'`));
    return;
  }

  console.log(chalk.cyan(`\n▶ Running: ${script.desc || scriptKey}`));

  // Case A: Direct command (PM2 commands)
  if (script.cmd) {
    const [exec, ...args] = script.cmd.split(' ');
    // Use CMD config if it's a known command
    const finalExec = exec === 'pm2' ? CMD.pm2 : exec;
    executeCommand(finalExec, [...args, ...extraArgs]);
    return;
  }

  const scriptPath = path.join(SCRIPTS_ROOT, category, script.file);
  if (!fs.existsSync(scriptPath)) {
    console.log(chalk.red(`Script file not found: ${scriptPath}`));
    return;
  }

  // Determine execution based on shell type or file extension
  if (script.shell === 'bash' || script.file.endsWith('.sh')) {
    fixLineEndings(scriptPath);
    const posixPath = scriptPath.split(path.sep).join('/');
    executeCommand(CMD.bash, [posixPath, ...extraArgs]);

  } else if (script.shell === 'python' || script.file.endsWith('.py')) {
    executeCommand(CMD.python, [scriptPath, ...extraArgs]);

  } else if (script.file.endsWith('.ps1')) {
    executeCommand(CMD.powershell, [
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      ...(script.args || []),
      ...extraArgs
    ]);
  } else {
    console.log(chalk.red(`Unknown script type for: ${script.file}`));
  }
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
        name: `${subcat.name} - ${subcat.description} >`,
        value: { type: 'subcategory', key }
      });
    });
  }

  choices.push({ name: chalk.yellow('< Back'), value: { type: 'back' } });

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
  choices.push({ name: chalk.yellow('< Back'), value: 'back' });

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
    
    if (category.scripts) {
      for (const [scriptKey, script] of Object.entries(category.scripts)) {
        console.log(chalk.white(`    ${catKey}:${scriptKey}`));
        console.log(chalk.gray(`      ${script.desc}`));
      }
    }
    
    if (category.subcategories) {
      for (const [subKey, subcat] of Object.entries(category.subcategories)) {
        for (const [scriptKey, script] of Object.entries(subcat.scripts)) {
          console.log(chalk.white(`    ${catKey}:${subKey}:${scriptKey}`));
          console.log(chalk.gray(`      ${script.desc}`));
        }
      }
    }
  }
  
  console.log(chalk.cyan('\n💡 Usage: scripts run <category>:[subcategory:]<script>'));
  console.log(chalk.gray('   Example: scripts run services:auth\n'));
}

// CLI Setup
program
  .name('scripts')
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
  .description('Run a script (format: category:[subcategory:]script)')
  .action((scriptName) => {
    const parts = scriptName.split(':');
    if (parts.length === 2) {
      runScript(parts[0], parts[1]);
    } else if (parts.length === 3) {
      runScriptFromSubcategory(parts[0], parts[1], parts[2]);
    } else {
      console.log(chalk.red('Invalid format. Use: category:script OR category:subcategory:script'));
      console.log(chalk.gray('Example: scripts run services:auth'));
      return;
    }
  });

// Quick commands
program
  .command('start')
  .description('Start TTS services with PM2')
  .action(() => runScriptFromSubcategory('pm2', 'tts', 'start'));

program
  .command('stop')
  .description('Stop all PM2 services')
  .action(() => runScriptFromSubcategory('pm2', 'tts', 'stop'));

program
  .command('restart')
  .description('Restart all PM2 services')
  .action(() => runScriptFromSubcategory('pm2', 'tts', 'restart'));

program
  .command('logs [service]')
  .description('View PM2 logs')
  .action((service) => {
    const args = service ? ['logs', service] : ['logs'];
    spawn(CMD.pm2, args, { stdio: 'inherit' });
  });

program
  .command('status')
  .description('Show PM2 process status')
  .action(() => runScriptFromSubcategory('pm2', 'tts', 'status'));

program
  .command('seed')
  .description('Run TTS migrations and seed data')
  .action(() => runScriptFromSubcategory('setup', 'tts', 'seed'));

program
  .command('flush')
  .description('Flush TTS DBs, migrate, and seed')
  .action(() => runScriptFromSubcategory('setup', 'tts', 'flush-seed'));

// Default to interactive menu if no command
if (process.argv.length <= 2) {
  interactiveMenu();
} else {
  program.parse();
}