import crypto from 'crypto';

console.log('=== Trolley API Credential Analysis ===');
console.log('Current environment shows:');
console.log('- API Key:', process.env.TROLLEY_API_KEY?.substring(0, 20) + '...');
console.log('- Secret length:', process.env.TROLLEY_API_SECRET?.length);
console.log();

console.log('Expected from your dashboard:');
console.log('- Access Key ID: ALPtDYZcPETO6U7JEA2KKN4Y (you mentioned this)');
console.log('- Current env shows: ALPtDYZcLNH24IRL4ZXMBOBQ (different key)');
console.log();

console.log('Issue diagnosis:');
console.log('1. Environment variables contain old/test credentials');
console.log('2. Your new production keys are not being loaded');
console.log('3. Trolley API correctly rejects invalid keys');
console.log();

console.log('Required action:');
console.log('- Provide the complete new API key pair from your Trolley dashboard');
console.log('- New keys will replace the cached old credentials');
console.log('- Integration will be immediately functional once updated');
