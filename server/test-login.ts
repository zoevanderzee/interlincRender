/**
 * Test script to try logging in
 */
import { storage } from './storage';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function testLogin() {
  try {
    console.log('Testing login functionality...');

    // First, let's see if we have the admin user
    const user = await storage.getUserByUsername('admin');
    
    if (!user) {
      console.log('Admin user not found. Creating admin user...');
      
      // Create admin user
      const hashedPassword = await hashPassword('admin123');
      const newUser = await storage.createUser({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User'
      });
      
      console.log('Created admin user:', newUser);
    } else {
      console.log('Found existing admin user:', user);
      
      // Test password verification
      const isPasswordValid = await comparePasswords('admin123', user.password);
      console.log('Password valid?', isPasswordValid);
    }

    // Test getting a user by ID
    if (user) {
      const userById = await storage.getUser(user.id);
      console.log('User by ID:', userById);
    }
    
    console.log('Login test completed.');
  } catch (error) {
    console.error('Error during login test:', error);
  }
}

testLogin().catch(console.error);