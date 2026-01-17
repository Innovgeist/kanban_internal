import mongoose from 'mongoose';
import { User } from '../src/modules/users/user.model';
import { config } from '../src/config/env';
import bcrypt from 'bcrypt';

async function createSuperAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB successfully!');

    const email = 'innovgeist@gmail.com';
    const defaultPassword = 'SuperAdmin@123'; // Default password for testing
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      // Update existing user to SuperAdmin
      existingUser.role = 'SUPERADMIN';
      await existingUser.save();
      console.log('\n✅ User updated to SUPERADMIN successfully!');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   User ID: ${existingUser._id}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`\n⚠️  Note: Password remains unchanged. Use existing password to login.`);
    } else {
      // Create new SuperAdmin user
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

      const user = await User.create({
        name: 'Super Admin',
        email: email.toLowerCase(),
        passwordHash,
        role: 'SUPERADMIN',
      });

      console.log('\n✅ SuperAdmin created successfully!');
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${defaultPassword}`);
      console.log(`   User ID: ${user._id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created at: ${user.createdAt}`);
      console.log(`\n⚠️  IMPORTANT: Change the password after first login!`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating SuperAdmin:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createSuperAdmin();
