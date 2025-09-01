import { db } from '../server/db';
import { users } from '../shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

// Function to hash passwords
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  try {
    console.log('Creating administrator account...');

    // First check if the admin already exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin'));

    if (existingAdmin.length > 0) {
      console.log('Admin account already exists. Updating password...');

      // Update the existing admin's password
      const hashedPassword = await hashPassword('admin123');
      await db.update(users)
        .set({
          password: hashedPassword
        })
        .where(eq(users.username, 'admin'));

      console.log('✅ Admin password updated successfully!');
      console.log('You can now login with:');
      console.log('Username: admin');
      console.log('Password: admin123');

      return;
    }

    // Create a new admin user
    const hashedPassword = await hashPassword('admin123');

    await db.insert(users).values({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@interlinc.co',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      workerType: null,
      profileImageUrl: null,
      companyName: 'Interlinc',
      title: 'Administrator',
      stripeCustomerId: null,
      stripeSubscriptionId: null
    });

    console.log('✅ Admin account created successfully!');
    console.log('You can now login with:');
    console.log('Username: admin');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error creating admin account:', error);
  }
}

main();