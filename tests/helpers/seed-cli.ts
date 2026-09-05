import { seedTestUsers } from "./seed";

async function main() {
  const seeded = await seedTestUsers();
  console.log(`Seeded test users: ${seeded.regular.email}, ${seeded.admin.email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});