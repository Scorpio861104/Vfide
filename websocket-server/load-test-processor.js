// Artillery Load Test Processor for WebSocket Server

const crypto = require('crypto');

// Generate random Ethereum-like address
function generateRandomAddress() {
  return '0x' + crypto.randomBytes(20).toString('hex');
}

// Generate random string
function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate random number
function generateRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Setup function - runs once per virtual user
function setupUser(context, events, done) {
  context.vars.userAddress = generateRandomAddress();
  context.vars.userId = generateRandomString(16);
  
  // Track connection metrics
  context.vars.messagesReceived = 0;
  context.vars.messagesSent = 0;
  
  return done();
}

// Teardown function - runs when virtual user disconnects
function teardownUser(context, events, done) {
  console.log(`User ${context.vars.userAddress} stats:`, {
    sent: context.vars.messagesSent,
    received: context.vars.messagesReceived
  });
  
  return done();
}

// Track messages received
function trackMessageReceived(context, events, done) {
  context.vars.messagesReceived++;
  return done();
}

// Track messages sent
function trackMessageSent(context, events, done) {
  context.vars.messagesSent++;
  return done();
}

// Custom metrics
function recordCustomMetrics(context, events, done) {
  events.emit('counter', 'websocket.messages.sent', context.vars.messagesSent);
  events.emit('counter', 'websocket.messages.received', context.vars.messagesReceived);
  
  return done();
}

module.exports = {
  setupUser,
  teardownUser,
  trackMessageReceived,
  trackMessageSent,
  recordCustomMetrics,
  generateRandomAddress,
  generateRandomString,
  generateRandomNumber
};
