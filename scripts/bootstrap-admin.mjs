// Bootstrap an admin account from environment variables at container start.
//
// Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH (the `salt:hash` scrypt format
// produced by src/lib/auth.ts hashPassword) and this script upserts a
// verified admin with that password. Idempotent: an existing user is
// promoted/updated, and with the variables unset the script is a no-op.
// Lets a fresh deploy get its first admin without shell access to the host.
import { PrismaClient } from "@prisma/client";

const email = process.env.ADMIN_EMAIL;
const passwordHash = process.env.ADMIN_PASSWORD_HASH;

if (!email || !passwordHash) {
  process.exit(0);
}

const prisma = new PrismaClient();
try {
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isAdmin: true, emailVerifiedAt: new Date() },
    create: {
      email,
      passwordHash,
      isAdmin: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`bootstrap-admin: ensured admin account for ${email}`);
} finally {
  await prisma.$disconnect();
}
