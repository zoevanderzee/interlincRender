import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  if (stored.includes('.') && stored.length > 100) {
    const [storedHash, salt] = stored.split('.');
    const suppliedBuf = (await scryptAsync(supplied, salt, 64));
    const storedBuf = Buffer.from(storedHash, 'hex');
    return timingSafeEqual(suppliedBuf, storedBuf);
  } else {
    return false; // Not testing bcrypt here
  }
}

// Test with the stored password from database
const storedPassword = "ab73308463bac682dad087c1935124f01d5e475657ce5bcf61d159b29802e8dcf27f436b51e4d435f800a6116e3ad95cf3a6b77f044a1e19bc909388e4cc9bde.ee699f1bd0ceb703120a736ea66a14ce";
const testPassword = "testpass123";

console.log("Testing password comparison...");
console.log("Stored password:", storedPassword);
console.log("Test password:", testPassword);

// First, let's create a fresh hash of the test password to compare
console.log("\n--- Creating fresh hash ---");
const freshHash = await hashPassword(testPassword);
console.log("Fresh hash of 'testpass123':", freshHash);

// Test comparison with fresh hash
console.log("\n--- Testing with fresh hash ---");
const freshMatch = await comparePasswords(testPassword, freshHash);
console.log("Fresh hash comparison result:", freshMatch);

// Test with stored hash
console.log("\n--- Testing with stored hash ---");
const storedMatch = await comparePasswords(testPassword, storedPassword);
console.log("Stored hash comparison result:", storedMatch);

// Try with a wrong password
console.log("\n--- Testing with wrong password ---");
const wrongMatch = await comparePasswords("wrongpassword", storedPassword);
console.log("Wrong password comparison result:", wrongMatch);