// Run with: node -r dotenv/config test-key.js
// Or manually paste your key below

const key = process.env.DOCUSIGN_RSA_PRIVATE_KEY || 'PASTE_YOUR_KEY_HERE';

console.log('Key length:', key.length);
console.log('First 50 chars:', key.substring(0, 50));

try {
  const decoded = Buffer.from(key, 'base64').toString('utf-8');
  console.log('\nDecoded first 100 chars:');
  console.log(decoded.substring(0, 100));
  console.log('\nDecoded last 50 chars:');
  console.log(decoded.substring(decoded.length - 50));
} catch (e) {
  console.log('Decode error:', e.message);
}
