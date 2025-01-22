import {generateKeyPair} from "node:crypto"
import {writeFileSync} from 'node:fs'

generateKeyPair(
    'rsa',
    {
      modulusLength: 2048, // Length of key in bits
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    },
    (err, publicKey, privateKey) => {
      if (err) {
        console.error('Error generating key pair:', err);
      } else {
        writeFileSync('./private.key', privateKey);
        writeFileSync('./public.key', publicKey);
        console.log('Keys generated and saved to files.');
      }
    }
  );