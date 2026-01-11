#!/usr/bin/env node
/**
 * Environment Configuration Checker
 * Validates environment setup and provides actionable feedback
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath) {
  return fs.existsSync(filePath);
}

function readEnvFile(filePath) {
  if (!checkFile(filePath)) return null;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        vars[match[1].trim()] = match[2].trim();
      }
    }
  });
  
  return vars;
}

function isPlaceholder(value) {
  if (!value) return true;
  return /^(your_|YOUR_|xxx|change.?this|example)/i.test(value);
}

function checkVariable(vars, name, required = false) {
  const value = vars[name];
  const hasValue = value && !isPlaceholder(value);
  
  if (required && !hasValue) {
    return { status: 'error', message: `Missing required: ${name}` };
  } else if (!hasValue) {
    return { status: 'warning', message: `Not set (optional): ${name}` };
  } else {
    return { status: 'success', message: `Set: ${name}` };
  }
}

console.log('\n' + '='.repeat(60));
log('🔍 VFIDE Environment Configuration Check', 'cyan');
console.log('='.repeat(60) + '\n');

let errors = 0;
let warnings = 0;
let success = 0;

// Check root .env
log('📋 Root Project (.env)', 'blue');
log('─'.repeat(60), 'blue');

if (!checkFile('.env')) {
  log('✗ .env file not found', 'red');
  log('  → Run: cp .env.example .env', 'yellow');
  errors++;
} else {
  const rootEnv = readEnvFile('.env');
  
  const checks = [
    checkVariable(rootEnv, 'PRIVATE_KEY', false),
    checkVariable(rootEnv, 'BASESCAN_API_KEY', false),
  ];
  
  checks.forEach(result => {
    if (result.status === 'error') {
      log(`✗ ${result.message}`, 'red');
      errors++;
    } else if (result.status === 'warning') {
      log(`⚠ ${result.message}`, 'yellow');
      warnings++;
    } else {
      log(`✓ ${result.message}`, 'green');
      success++;
    }
  });
}

console.log();

// Check frontend/.env.local
log('📋 Frontend (.env.local)', 'blue');
log('─'.repeat(60), 'blue');

const frontendEnvPath = 'frontend/.env.local';
if (!checkFile(frontendEnvPath)) {
  log('✗ frontend/.env.local not found', 'red');
  log('  → Run: cp frontend/.env.local.example frontend/.env.local', 'yellow');
  errors++;
} else {
  const frontendEnv = readEnvFile(frontendEnvPath);
  
  const checks = [
    checkVariable(frontendEnv, 'NEXT_PUBLIC_WAGMI_PROJECT_ID', true),
    checkVariable(frontendEnv, 'DATABASE_URL', true),
    checkVariable(frontendEnv, 'NEXT_PUBLIC_CHAIN_ID', true),
    checkVariable(frontendEnv, 'NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS', false),
    checkVariable(frontendEnv, 'NEXT_PUBLIC_DAO_ADDRESS', false),
  ];
  
  checks.forEach(result => {
    if (result.status === 'error') {
      log(`✗ ${result.message}`, 'red');
      errors++;
    } else if (result.status === 'warning') {
      log(`⚠ ${result.message}`, 'yellow');
      warnings++;
    } else {
      log(`✓ ${result.message}`, 'green');
      success++;
    }
  });
}

console.log();

// Check websocket-server/.env
log('📋 WebSocket Server (.env)', 'blue');
log('─'.repeat(60), 'blue');

const wsEnvPath = 'websocket-server/.env';
if (!checkFile(wsEnvPath)) {
  log('✗ websocket-server/.env not found', 'red');
  log('  → Run: cp websocket-server/.env.example websocket-server/.env', 'yellow');
  errors++;
} else {
  const wsEnv = readEnvFile(wsEnvPath);
  
  const checks = [
    checkVariable(wsEnv, 'JWT_SECRET', true),
    checkVariable(wsEnv, 'CORS_ORIGINS', true),
    checkVariable(wsEnv, 'PORT', false),
  ];
  
  checks.forEach(result => {
    if (result.status === 'error') {
      log(`✗ ${result.message}`, 'red');
      errors++;
    } else if (result.status === 'warning') {
      log(`⚠ ${result.message}`, 'yellow');
      warnings++;
    } else {
      log(`✓ ${result.message}`, 'green');
      success++;
    }
  });
  
  // Check if JWT_SECRET is default
  if (wsEnv.JWT_SECRET && wsEnv.JWT_SECRET.includes('change-this')) {
    log('⚠ JWT_SECRET appears to be default value', 'yellow');
    log('  → Generate new: openssl rand -base64 32', 'yellow');
    warnings++;
  }
}

console.log();

// Check database setup
log('📋 Database Setup', 'blue');
log('─'.repeat(60), 'blue');

if (!checkFile('frontend/init-db.sql')) {
  log('✗ Database schema file not found', 'red');
  errors++;
} else {
  log('✓ Database schema file exists', 'green');
  success++;
  
  // Try to connect to database (basic check)
  const frontendEnv = readEnvFile(frontendEnvPath);
  if (frontendEnv && frontendEnv.DATABASE_URL && !isPlaceholder(frontendEnv.DATABASE_URL)) {
    log('✓ DATABASE_URL configured', 'green');
    log('  → Verify connection: psql "$DATABASE_URL" -c "\\dt"', 'blue');
  } else {
    log('⚠ DATABASE_URL not configured', 'yellow');
    log('  → See DATABASE-SETUP.md for instructions', 'yellow');
    warnings++;
  }
}

console.log();

// Summary
console.log('='.repeat(60));
log('📊 Summary', 'cyan');
console.log('='.repeat(60));

log(`✓ Success: ${success}`, 'green');
log(`⚠ Warnings: ${warnings}`, 'yellow');
log(`✗ Errors: ${errors}`, 'red');

console.log();

if (errors > 0) {
  log('❌ Configuration has errors that must be fixed!', 'red');
  console.log();
  log('Quick fixes:', 'yellow');
  log('1. Run: ./scripts/setup-wizard.sh (interactive setup)', 'blue');
  log('2. Or manually create missing .env files from examples', 'blue');
  log('3. Get WalletConnect ID: https://cloud.walletconnect.com/', 'blue');
  log('4. Set up database: see DATABASE-SETUP.md', 'blue');
  console.log();
  process.exit(1);
} else if (warnings > 0) {
  log('⚠️  Configuration is OK but has warnings', 'yellow');
  log('These are optional but recommended for production', 'yellow');
  console.log();
  process.exit(0);
} else {
  log('✅ All configurations are properly set!', 'green');
  console.log();
  process.exit(0);
}
