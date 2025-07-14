import { generateKeyPairSync } from 'crypto';
import { writeFileSync } from 'fs';
// Generate RSA key pair
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
    }
});
// Save keys to files
writeFileSync('private.key', privateKey);
writeFileSync('public.key', publicKey);
console.log('Keys generated: private.key and public.key');
