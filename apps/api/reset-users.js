const { PrismaClient } = require('./src/__generated__/prisma');
const bcrypt = require('bcryptjs');

const p = new PrismaClient();

async function main() {
  // Delete all related data first (foreign key order)
  await p.messageLog.deleteMany();
  await p.comment.deleteMany();
  await p.rSVP.deleteMany();
  await p.reminderRule.deleteMany();
  await p.event.deleteMany();
  await p.user.deleteMany();
  console.log('All existing users and data deleted.');

  // Create fresh admin
  const admin = await p.user.create({
    data: {
      email: 'admin@judien.tw',
      passwordHash: bcrypt.hashSync('password123', 12),
      phoneE164: '+886912345678',
      displayName: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log('New admin created:', admin.email, admin.id);

  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
