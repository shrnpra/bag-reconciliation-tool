import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_MANAGER_EMAIL;
  const password = process.env.SEED_MANAGER_PASSWORD;

  if (!email || !password) {
    console.error(
      'ERROR: Set SEED_MANAGER_EMAIL and SEED_MANAGER_PASSWORD environment variables before running the seed script.',
    );
    process.exit(1);
  }

  // Check if a manager already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Manager account "${email}" already exists. Skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.MANAGER,
    },
  });

  console.log(`Created manager account: ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
