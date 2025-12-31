#!/usr/bin/env node

require('dotenv').config({ path: __dirname + '/.env', quiet: true });
const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const spawn = require('cross-spawn');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const ora = require('ora');

// --- Constants & Configuration ---

const SCRIPTS_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(SCRIPTS_ROOT, '..');
const ENV_FILE = path.join(__dirname, '.env');

// Ensure environment is set up before defining commands
ensureEnvironmentSetup();

// Default commands (can be overridden in .env)
const CMD = {
  python: process.env.PYTHON_CMD || 'python',
  bash: process.env.BASH_CMD || 'bash',
  pm2: process.env.PM2_CMD || 'pm2',
  powershell: process.env.POWERSHELL_CMD || 'powershell'
};

// --- Script Definitions ---

const SCRIPTS = {
  services: {
    name: 'Services',
    description: 'Start individual backend/frontend services',
    scripts: {
      'auth': { file: 'start_auth.ps1', desc: 'Auth Service (Port 8003)' },
    },
    subcategories: {
      tts: {
        name: 'TTS',
        description: 'Ticket Tracking System',
        scripts: {
          'workflow': { file: 'tts/start_workflow.ps1', desc: 'Workflow API (Port 8002)' },
          'workflow-worker': { file: 'tts/start_workflow_worker.ps1', desc: 'Workflow Celery Worker' },
          'notification': { file: 'tts/start_notification.ps1', desc: 'Notification Service (Port 8006)' },
          'notification-worker': { file: 'tts/start_notification_worker.ps1', desc: 'Notification Celery Worker' },
          'messaging': { file: 'tts/start_messaging.ps1', desc: 'Messaging Service (Port 8005)' },
          'ticket': { file: 'tts/start_ticket.ps1', desc: 'Ticket Service (Port 8004)' },
          'frontend': { file: 'tts/start_frontend.ps1', desc: 'Frontend (Port 1000)' },
        }
      },
      hdts: {
        name: 'HDTS',
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
    name: 'Docker',
    description: 'Container management',
    scripts: {
      'rabbitmq': { file: 'start_rabbitmq.ps1', desc: 'Start RabbitMQ Container' },
    },
    subcategories: {
      tts: {
        name: 'TTS Docker',
        description: 'TTS Docker Compose Commands',
        scripts: {
          'start': { file: 'tts/start.sh', desc: 'Start (Build & Up)', shell: 'bash' },
          'stop': { file: 'tts/stop.sh', desc: 'Stop (Down)', shell: 'bash' },
          'restart': { file: 'tts/restart.sh', desc: 'Restart Containers', shell: 'bash' },
          'reset': { file: 'tts/reset.sh', desc: 'Reset (Down -v)', shell: 'bash' },
          'logs': { file: 'tts/logs.sh', desc: 'Follow Logs', shell: 'bash' },
        }
      }
    }
  },
  setup: {
    name: 'Setup',
    description: 'Database seeding and configuration',
    subcategories: {
      tts: {
        name: 'TTS',
        description: 'Ticket Tracking System Setup',
        scripts: {
          'seed': { file: 'restart_all_services.ps1', desc: 'Migrate & Seed All Services', args: ['-Seed'] },
          'flush-seed': { file: 'restart_all_services.ps1', desc: 'Flush DBs, Migrate & Seed', args: ['-FlushDB', '-Seed'] },
          'migrate': { file: 'restart_all_services.ps1', desc: 'Run Migrations Only' },
          'seed-workflow-hdts': { file: 'seed_workflow_helpdesk.ps1', desc: 'Seed Workflow & Helpdesk Data' },
        }
      },
      ams: {
        name: 'AMS',
        description: 'Asset Management System Setup',
        scripts: {
          'setup': { file: 'setup_and_test_ams.ps1', desc: 'Setup & Test AMS' }
        }
      },
    }
  },
  testing: {
    name: 'Testing',
    description: 'Run automated tests',
    scripts: {
      'test-ams': { file: 'test_ams_api.py', desc: 'Test AMS API (Python)', shell: 'python' },
      'test-bms': { file: 'test_bms_api.py', desc: 'Test BMS API (Python)', shell: 'python' },
      'test-bms-ps': { file: 'test_bms_api.ps1', desc: 'Test BMS API (PowerShell)' },
    },
    subcategories: {
      integration: {
        name: 'Integration Tests',
        description: 'End-to-end integration tests',
        scripts: {
          'hdts-tts': { 
            file: '../testing/test_hdts_tts_integration.py', 
            desc: 'HDTS-TTS Full Integration Test', 
            shell: 'python',
            args: ['--verbose']
          },
          'hdts-tts-quick': { 
            file: '../testing/test_hdts_tts_integration.py', 
            desc: 'HDTS-TTS Quick Test (IT Support)', 
            shell: 'python',
            args: ['--category', 'IT Support', '--department', 'IT Department']
          },
          'hdts-tts-infra': { 
            file: '../testing/test_hdts_tts_integration.py', 
            desc: 'HDTS-TTS with Test Infrastructure', 
            shell: 'python',
            args: ['--use-test-infra', '--verbose']
          },
          'hdts-tts-asset': { 
            file: '../testing/test_hdts_tts_integration.py', 
            desc: 'HDTS-TTS Asset Check Out Test', 
            shell: 'python',
            args: ['--category', 'Asset Check Out', '--department', 'Asset Department', '--verbose']
          },
        }
      }
    }
  },
  utils: {
    name: 'Utilities',
    description: 'Maintenance scripts',
    scripts: {
      'seed-tickets': { file: 'seed_tickets_open.ps1', desc: 'Seed Open Tickets (HDTS)' },
      'seed-employees-auth': { file: 'seed_employees_auth.ps1', desc: 'Seed Employees (Auth)' },
      'seed-employees-hdts': { file: 'seed_employees_hdts.ps1', desc: 'Seed Employees (HDTS)' },
    }
  },
  pm2: {
    name: 'PM2',
    description: 'Process Manager commands',
    subcategories: {
      tts: {
        name: 'TTS',
        description: 'Ticket Tracking System Ecosystem',
        scripts: {
          'start': { cmd: 'pm2 start Scripts/processes/tts-ecosystem.config.js', desc: 'Start Ecosystem' },
          'stop': { cmd: 'pm2 stop all', desc: 'Stop All Services' },
          'restart': { cmd: 'pm2 restart all', desc: 'Restart All Services' },
          'logs': { cmd: 'pm2 logs', desc: 'View Realtime Logs' },
          'status': { cmd: 'pm2 list', desc: 'View Process Status' },
          'delete': { cmd: 'pm2 delete all', desc: 'Delete All Processes' },
        }
      }
    }
  }
};

// --- Helper Functions ---

/**
 * Ensure .env exists and environment is configured
 */
function ensureEnvironmentSetup() {
  if (!fs.existsSync(ENV_FILE)) {
    console.log(chalk.yellow('Environment configuration not found.'));
    
    const spinner = ora('Configuring environment...').start();
    
    try {
      execSync('node setup-env.js', {
        cwd: __dirname,
        stdio: 'ignore',
        shell: true
      });
      spinner.succeed(chalk.green('Environment configured.'));
      require('dotenv').config({ path: ENV_FILE, override: true });
    } catch (err) {
      spinner.fail(chalk.red('Configuration failed.'));
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  }
}

/**
 * Fix line endings for shell scripts (CRLF -> LF)
 */
function fixLineEndings(scriptPath) {
  try {
    if (fs.existsSync(scriptPath)) {
      const content = fs.readFileSync(scriptPath, 'utf8');
      if (content.includes('\r\n')) {
        const fixed = content.replace(/\r\n/g, '\n');
        fs.writeFileSync(scriptPath, fixed, 'utf8');
      }
    }
  } catch (err) {
    // Ignore errors here
  }
}

/**
 * Execute a system command
 */
function executeCommand(command, args, cwd = PROJECT_ROOT) {
  console.log(chalk.gray(`[Exec] ${command} ${args.join(' ')}`));

  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env }
  });

  child.on('error', (err) => {
    console.log(chalk.red(`Error: Failed to start '${command}'`));
    console.log(chalk.red(`Details: ${err.message}`));
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green('Success.'));
    } else {
      console.log(chalk.yellow(`Exit Code: ${code}`));
    }
    console.log('');
  });
}

/**
 * Resolve and execute a script by category, subcategory (optional), and key
 */
function executeScript(categoryKey, subOrScriptKey, scriptKeyOnly) {
  const category = SCRIPTS[categoryKey];
  if (!category) {
    console.log(chalk.red(`Category '${categoryKey}' not found.`));
    return;
  }

  let script;
  let subcategoryKey;

  if (scriptKeyOnly) {
    subcategoryKey = subOrScriptKey;
    script = category.subcategories?.[subcategoryKey]?.scripts?.[scriptKeyOnly];
  } else {
    script = category.scripts?.[subOrScriptKey];
  }

  if (!script) {
    const target = scriptKeyOnly ? `${subcategoryKey}:${scriptKeyOnly}` : subOrScriptKey;
    console.log(chalk.red(`Script '${target}' not found.`));
    return;
  }

  if (script.cmd) {
    const [exec, ...args] = script.cmd.split(' ');
    const finalExec = exec === 'pm2' ? CMD.pm2 : exec;
    executeCommand(finalExec, args);
    return;
  }

  const scriptPath = path.join(SCRIPTS_ROOT, categoryKey, script.file);
  
  if (!fs.existsSync(scriptPath)) {
    console.log(chalk.red(`File missing: ${scriptPath}`));
    return;
  }

  const extraArgs = script.args || [];

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
      ...extraArgs
    ]);

  } else {
    console.log(chalk.red(`Extension not supported: ${script.file}`));
  }
}

// --- Interactive Menus ---

async function interactiveMenu() {
  console.clear();
  const choices = Object.entries(SCRIPTS).map(([key, cat]) => ({
    name: `${cat.name.padEnd(12)} | ${cat.description}`,
    value: key
  }));
  
  choices.push(new inquirer.Separator());
  choices.push({ name: 'Exit', value: 'exit' });

  const { category } = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: 'Select category:',
      loop: false,
      choices
    }
  ]);

  if (category === 'exit') process.exit(0);

  await showSubMenu(category);
}

async function showSubMenu(categoryKey) {
  console.clear();
  const cat = SCRIPTS[categoryKey];
  const choices = [];

  if (cat.scripts) {
    Object.entries(cat.scripts).forEach(([key, script]) => {
      choices.push({
        name: `${key.padEnd(20)} | ${script.desc}`,
        value: { type: 'script', key }
      });
    });
  }

  if (cat.subcategories) {
    if (choices.length > 0) choices.push(new inquirer.Separator('Subcategories'));
    
    Object.entries(cat.subcategories).forEach(([key, subcat]) => {
      choices.push({
        name: `${subcat.name.padEnd(20)} | ${subcat.description}`,
        value: { type: 'subcategory', key }
      });
    });
  }

  choices.push(new inquirer.Separator());
  choices.push({ name: 'Back', value: { type: 'back' } });

  const { selection } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: `Category: ${cat.name}`,
      loop: false,
      choices
    }
  ]);

  if (selection.type === 'back') return interactiveMenu();
  if (selection.type === 'subcategory') return showSubcategoryItems(categoryKey, selection.key);
  if (selection.type === 'script') executeScript(categoryKey, selection.key);
}

async function showSubcategoryItems(categoryKey, subcatKey) {
  console.clear();
  const cat = SCRIPTS[categoryKey];
  const subcat = cat.subcategories[subcatKey];
  
  const choices = Object.entries(subcat.scripts).map(([key, script]) => ({
    name: `${key.padEnd(20)} | ${script.desc}`,
    value: key
  }));

  choices.push(new inquirer.Separator());
  choices.push({ name: 'Back', value: 'back' });

  const { script } = await inquirer.prompt([
    {
      type: 'list',
      name: 'script',
      message: `${cat.name} > ${subcat.name}`,
      loop: false,
      choices
    }
  ]);

  if (script === 'back') return showSubMenu(categoryKey);
  executeScript(categoryKey, subcatKey, script);
}

// --- List Command ---

function listAllScripts() {
  console.log('Available Scripts:\n');

  for (const [catKey, cat] of Object.entries(SCRIPTS)) {
    console.log(`[${cat.name}]`);
    
    if (cat.scripts) {
      for (const [sKey, script] of Object.entries(cat.scripts)) {
        console.log(`  ${sKey}: ${script.desc}`);
      }
    }

    if (cat.subcategories) {
      for (const [subKey, subcat] of Object.entries(cat.subcategories)) {
        console.log(`  (${subcat.name})`);
        for (const [sKey, script] of Object.entries(subcat.scripts)) {
          console.log(`    ${sKey}: ${script.desc}`);
        }
      }
    }
    console.log('');
  }
}

// --- CLI Initialization ---

program
  .name('scripts')
  .description('Capstone System Management CLI')
  .version(require('./package.json').version);

program.command('menu').alias('m').description('Open interactive menu').action(interactiveMenu);
program.command('list').alias('ls').description('List all available scripts').action(listAllScripts);

program
  .command('run <category> [subcategory] [script]')
  .alias('r')
  .description('Run a specific script')
  .action((category, subcategory, script) => {
    if (subcategory && !script) {
      const isDirectScript = SCRIPTS[category]?.scripts?.[subcategory];
      if (isDirectScript) {
        executeScript(category, subcategory);
      } else {
        executeScript(category, subcategory);
      }
    } else {
      executeScript(category, subcategory, script);
    }
  });

program.command('start').description('Start ecosystem').action(() => executeScript('pm2', 'tts', 'start'));
program.command('stop').description('Stop ecosystem').action(() => executeScript('pm2', 'tts', 'stop'));
program.command('status').description('Show status').action(() => executeScript('pm2', 'tts', 'status'));
program.command('seed').description('Seed data').action(() => executeScript('setup', 'tts', 'seed'));

if (process.argv.length <= 2) {
  interactiveMenu();
} else {
  program.parse();
}