import { generateVAPIDKeys } from 'web-push';

const keys = generateVAPIDKeys();

console.log('═══════════════════════════════════════════════════');
console.log('  VAPID Keys Generated');
console.log('═══════════════════════════════════════════════════');
console.log('');
console.log('Add these to your .env:');
console.log('');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:hello@vfide.io');
console.log('');
console.log('The public key goes to the client.');
console.log('The private key stays on the server only.');
console.log('═══════════════════════════════════════════════════');
