import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/User.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = 'admin@ourlisting.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`Admin user already exists with email: ${adminEmail}`);
      process.exit(0);
    }

    const defaultAdmin = {
      name: 'Default Admin',
      email: adminEmail,
      password: 'admin123', // This will be automatically hashed by User.js pre-save hook
      number: '1234567890',
      address: 'Admin Headquarters',
      role: 'admin'
    };

    const admin = await User.create(defaultAdmin);
    console.log('----------------------------------------');
    console.log('Admin User Seeded Successfully!');
    console.log(`Email: ${admin.email}`);
    console.log('Password: admin123');
    console.log(`Role: ${admin.role}`);
    console.log('----------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
};

seedAdmin();
