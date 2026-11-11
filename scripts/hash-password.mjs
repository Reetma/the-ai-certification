// Prints the ADMIN_PASSWORD_HASH value for a password: node scripts/hash-password.mjs '<password>'
import { randomBytes, scryptSync } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.mjs '<password>'");
  process.exit(1);
}
const salt = randomBytes(16);
console.log(`scrypt:${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`);
