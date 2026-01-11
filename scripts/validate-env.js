#!/usr/bin/env node
/**
 * Environment Variable Validation Script
 * Checks for required environment variables across the project
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

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function loadEnvFile(filePath) {
  if (!checkFileExists(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) return;
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });
  
  return env;
}

function validateRequired(env, requiredVars, label) {
  const missing = [];
  const placeholder = [];
  
  requiredVars.forEach(varName => {
    if (!env[varName]) {
      missing.push(varName);
    } else if (
      env[varName].includes('your_') ||
      env[varName].includes('YOUR_') ||
      env[varName].includes('xxx') ||
      env[varName] === ''
    ) {
      placeholder.push(varName);
    }
  });
  
  return { missing, placeholder, label };
}

// Main validation
log('\n🔍 VFIDE Environment Variable Validation\n', 'cyan');

const validations = [];

// 1. Root .env (Smart Contracts)
log('📦 Checking root .env (Smart Contracts)...', 'blue');
const rootEnvPath = path.join(__dirname, '..', '.env');
const rootEnv = loadEnvFile(rootEnvPath);

if (!rootEnv) {
  log('  ❌ File missing: .env', 'red');
  log('  💡 Run: cp .env.example .env', 'yellow');
} else {
  log('  ✅ File exists', 'green');
  const result = validateRequired(
    rootEnv,
    ['PRIVATE_KEY'],
    'Root .env'
  );
  validations.push(result);
  
  if (result.missing.length === 0 && result.placeholder.length === 0) {
    log('  ✅ All required variables set', 'green');
  }
}

// 2. WebSocket Server .env
log('\n🔌 Checking websocket-server/.env...', 'blue');
const wsEnvPath = path.join(__dirname, '..', 'websocket-server', '.env');
const wsEnv = loadEnvFile(wsEnvPath);

if (!wsEnv) {
  log('  ❌ File missing: websocket-server/.env', 'red');
  log('  💡 Run: cp websocket-server/.env.example websocket-server/.env', 'yellow');
} else {
  log('  ✅ File exists', 'green');
  const result = validateRequired(
    wsEnv,
    ['PORT', 'JWT_SECRET', 'CORS_ORIGINS'],
    'WebSocket Server .env'
  );
  validations.push(result);
  
  if (result.missing.length === 0 && result.placeholder.length === 0) {
    log('  ✅ All required variables set', 'green');
  }
  
  // Check JWT secret strength
  if (wsEnv.JWT_SECRET && wsEnv.JWT_SECRET.length < 32) {
    log('  ⚠️  JWT_SECRET is weak (< 32 characters)', 'yellow');
    log('  💡 Generate strong secret: openssl rand -base64 32', 'yellow');
  }
}

// 3. Frontend .env.local
log('\n🎨 Checking frontend/.env.local...', 'blue');
const frontendEnvPath = path.join(__dirname, '..', 'frontend', '.env.local');
const frontendEnv = loadEnvFile(frontendEnvPath);

if (!frontendEnv) {
  log('  ❌ File missing: frontend/.env.local', 'red');
  log('  💡 Run: cp frontend/.env.local.example frontend/.env.local', 'yellow');
} else {
  log('  ✅ File exists', 'green');
  const result = validateRequired(
    frontendEnv,
    ['NEXT_PUBLIC_WAGMI_PROJECT_ID', 'DATABASE_URL', 'NEXT_PUBLIC_WS_URL'],
    'Frontend .env.local'
  );
  validations.push(result);
  
  if (result.missing.length === 0 && result.placeholder.length === 0) {
    log('  ✅ All critical variables set', 'green');
  }
  
  // Check for contract addresses
  const contractVars = [
    'NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS',
    'NEXT_PUBLIC_DAO_ADDRESS',
    'NEXT_PUBLIC_VAULT_HUB_ADDRESS',
  ];
  
  const missingContracts = contractVars.filter(v => !frontendEnv[v] || frontendEnv[v] === '');
  if (missingContracts.length > 0) {
    log('  ⚠️  Contract addresses not set (required after deployment):', 'yellow');
    missingContracts.forEach(v => log(`     - ${v}`, 'yellow'));
  }
}

// Summary
log('\n' + '='.repeat(60), 'cyan');
log('📊 Validation Summary\n', 'cyan');

let hasErrors = false;
let hasWarnings = false;

validations.forEach(({ missing, placeholder, label }) => {
  if (missing.length > 0) {
    hasErrors = true;
    log(`❌ ${label} - Missing required variables:`, 'red');
    missing.forEach(v => log(`   - ${v}`, 'red'));
  }
  
  if (placeholder.length > 0) {
    hasWarnings = true;
    log(`⚠️  ${label} - Placeholder values detected:`, 'yellow');
    placeholder.forEach(v => log(`   - ${v}`, 'yellow'));
  }
});

// Database check
log('\n🗄️  Database Connectivity Check...', 'blue');
if (frontendEnv && frontendEnv.DATABASE_URL) {
  const dbUrl = frontendEnv.DATABASE_URL;
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    log('  ℹ️  Using local database', 'cyan');
    log('  💡 Ensure PostgreSQL is running: pg_isready', 'cyan');
  } else if (dbUrl.includes('postgres.vercel') || dbUrl.includes('supabase')) {
    log('  ℹ️  Using hosted database', 'cyan');
  }
} else {
  log('  ⚠️  DATABASE_URL not configured', 'yellow');
}

// Final verdict
log('\n' + '='.repeat(60), 'cyan');
if (hasErrors) {
  log('\n❌ VALIDATION FAILED - Fix errors above before proceeding\n', 'red');
  process.exit(1);
} else if (hasWarnings) {
  log('\n⚠️  VALIDATION PASSED WITH WARNINGS - Update placeholders before production\n', 'yellow');
  process.exit(0);
} else {
  log('\n✅ VALIDATION PASSED - All environment variables configured!\n', 'green');
  process.exit(0);
}
