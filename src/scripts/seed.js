const mongoose = require('mongoose');
const config = require('../config/config');
const User = require('../models/User');
const Company = require('../models/Company');

/**
 * Database Seeder Script
 * This script populates the database with test users and companies
 */

async function seedDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    console.log('\nClearing existing data...');
    await User.deleteMany({});
    await Company.deleteMany({});
    console.log('✓ Cleared existing data');

    // Password for all test users (will be hashed by the model's pre-save hook)
    const testPassword = 'password123';

    // Create Super Admin user first (needed for creating companies)
    console.log('\nCreating Super Admin...');
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@bixssca.com',
      password: testPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    console.log('✓ Super Admin: admin@bixssca.com / password123');

    // Create Company Admin users (needed as company representatives)
    console.log('\nCreating Company Admins...');
    const companyAdmin1 = await User.create({
      name: 'John Smith',
      email: 'john@techsolutions.com',
      password: testPassword,
      role: 'COMPANY_ADMIN',
      isActive: true,
    });
    console.log('✓ Company Admin: john@techsolutions.com / password123');

    const companyAdmin2 = await User.create({
      name: 'Michael Brown',
      email: 'michael@globalenterprises.com',
      password: testPassword,
      role: 'COMPANY_ADMIN',
      isActive: true,
    });
    console.log('✓ Company Admin: michael@globalenterprises.com / password123');

    const companyAdmin3 = await User.create({
      name: 'Sarah Johnson',
      email: 'sarah@innovationcorp.com',
      password: testPassword,
      role: 'COMPANY_ADMIN',
      isActive: true,
    });
    console.log('✓ Company Admin: sarah@innovationcorp.com / password123');

    // Create test companies with representatives
    console.log('\nCreating test companies...');
    const company1 = await Company.create({
      name: 'Tech Solutions Inc',
      description: 'Leading technology solutions provider',
      registrationNumber: 'REG-001-2024',
      representative: companyAdmin1._id,
      companyAdmins: [companyAdmin1._id],
      createdBy: superAdmin._id,
      isActive: true,
    });

    const company2 = await Company.create({
      name: 'Global Enterprises Ltd',
      description: 'International business solutions',
      registrationNumber: 'REG-002-2024',
      representative: companyAdmin2._id,
      companyAdmins: [companyAdmin2._id],
      createdBy: superAdmin._id,
      isActive: true,
    });

    const company3 = await Company.create({
      name: 'Innovation Corp',
      description: 'Innovation and research company',
      registrationNumber: 'REG-003-2024',
      representative: companyAdmin3._id,
      companyAdmins: [companyAdmin3._id],
      createdBy: superAdmin._id,
      isActive: true,
    });
    console.log(`✓ Created ${3} companies`);

    // Update company admins with their company references
    companyAdmin1.company = company1._id;
    await companyAdmin1.save();

    companyAdmin2.company = company2._id;
    await companyAdmin2.save();

    companyAdmin3.company = company3._id;
    await companyAdmin3.save();

    // Create CA user with access to multiple companies
    console.log('\nCreating CA user...');
    const caUser = await User.create({
      name: 'CA Professional',
      email: 'ca@bixssca.com',
      password: testPassword,
      role: 'CA',
      isActive: true,
      invitedCompanies: [company1._id, company2._id, company3._id],
    });

    // Add CA to companies
    company1.inviteCA(caUser._id, superAdmin._id);
    company2.inviteCA(caUser._id, superAdmin._id);
    company3.inviteCA(caUser._id, superAdmin._id);
    await company1.save();
    await company2.save();
    await company3.save();
    console.log('✓ CA User: ca@bixssca.com / password123');

    // Create additional Company User for Tech Solutions Inc
    console.log('\nCreating additional company user...');
    const companyUser1 = await User.create({
      name: 'Jane Doe',
      email: 'jane@techsolutions.com',
      password: testPassword,
      role: 'COMPANY_USER',
      company: company1._id,
      isActive: true,
    });
    console.log('✓ Company User (Tech Solutions): jane@techsolutions.com / password123');

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Test Credentials Summary:');
    console.log('─────────────────────────────────────────────────────────');
    console.log('SUPER ADMIN:');
    console.log('  Email: admin@bixssca.com');
    console.log('  Password: password123');
    console.log('  Role: Full system access');
    console.log('');
    console.log('CA (Chartered Accountant):');
    console.log('  Email: ca@bixssca.com');
    console.log('  Password: password123');
    console.log('  Role: Access to all 3 companies');
    console.log('');
    console.log('COMPANY ADMIN (Tech Solutions Inc):');
    console.log('  Email: john@techsolutions.com');
    console.log('  Password: password123');
    console.log('  Role: Company administrator');
    console.log('');
    console.log('COMPANY USER (Tech Solutions Inc):');
    console.log('  Email: jane@techsolutions.com');
    console.log('  Password: password123');
    console.log('  Role: Regular company user');
    console.log('');
    console.log('COMPANY ADMIN (Global Enterprises Ltd):');
    console.log('  Email: michael@globalenterprises.com');
    console.log('  Password: password123');
    console.log('  Role: Company administrator');
    console.log('');
    console.log('COMPANY ADMIN (Innovation Corp):');
    console.log('  Email: sarah@innovationcorp.com');
    console.log('  Password: password123');
    console.log('  Role: Company administrator');
    console.log('─────────────────────────────────────────────────────────');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  }
}

// Run seeder
seedDatabase();
