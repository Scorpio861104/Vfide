module.exports = {
  // TypeScript/JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // JSON, Markdown, CSS files
  '*.{json,md,css,scss}': [
    'prettier --write',
  ],
  
  // Solidity files
  '../contracts/**/*.sol': [
    'prettier --write',
  ],
  
  // Run type check on TypeScript files
  '*.{ts,tsx}': () => 'tsc --noEmit',
};
