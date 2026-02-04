import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Setup Prisma with PostgreSQL adapter (Prisma 7)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedSuperAdmin() {
    try {
        console.log('🌱 Seeding Super Admin...');

        // Check if super admin already exists
        const existingAdmin = await prisma.adminUser.findFirst({
            where: { role: 'SUPER_ADMIN' },
        });

        if (existingAdmin) {
            console.log('✅ Super Admin already exists');
            console.log(`Email: ${existingAdmin.email}`);
            return;
        }

        // Create super admin
        const hashedPassword = await bcrypt.hash('SuperAdmin@2026', 10);

        const superAdmin = await prisma.adminUser.create({
            data: {
                email: 'admin@rtmadmin.e-clicks.net',
                password: hashedPassword,
                name: 'Super Administrator',
                role: 'SUPER_ADMIN',
            },
        });

        console.log('✅ Super Admin created successfully!');
        console.log('');
        console.log('📧 Email:', superAdmin.email);
        console.log('🔑 Password: SuperAdmin@2026');
        console.log('');
        console.log('⚠️  IMPORTANT: Change this password after first login!');
    } catch (error) {
        console.error('❌ Error seeding Super Admin:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

seedSuperAdmin();
