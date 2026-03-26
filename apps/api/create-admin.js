const { PrismaClient } = require('./src/__generated__/prisma');
const bcrypt = require('bcryptjs');

const p = new PrismaClient();

p.user.create({
  data: {
    email: 'admin@judien.tw',
    passwordHash: bcrypt.hashSync('password123', 12),
    phoneE164: '+886912345678',
    role: 'ADMIN'
  }
}).then(user => {
  console.log('Admin user created:', user);
}).catch(err => {
  console.error('Error creating admin user:', err);
}).finally(async () => {
  await p.$disconnect();
});
