import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured in environment variables.');
}

const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('sysAdmin2026', 10);

  // التأكد من عدم تكرار إنشاء حساب الآدمن
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'sysAdmin' },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: 'sysAdmin',
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });
    console.log('✅ Admin user seeded successfully!');
  } else {
    console.log('ℹ️ Admin user already exists.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

