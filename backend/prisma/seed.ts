import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password =
    process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const name =
    process.env.SUPER_ADMIN_NAME || process.env.ADMIN_NAME || "Platform Owner";

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in your environment before seeding.",
    );
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "SUPER_ADMIN", status: "ACTIVE" },
    });
    console.log(
      `Super administrator ${email} already exists. Ensured platform access.`,
    );
    return;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      profile: {
        create: {
          pastorName: name,
          title: "Senior Pastor",
          bio: "Welcome! Update this biography from the Profile page in your dashboard.",
          churchName: "",
          contactEmail: email,
          socialLinks: {},
        },
      },
    },
  });

  console.log(`Administrator account created for ${user.email}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
