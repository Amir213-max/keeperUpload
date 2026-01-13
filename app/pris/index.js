const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // إنشاء مستخدم جديد
  const user = await prisma.user.create({
    data: {
      name: 'Ahmed',
      email: 'ahmed@example.com',
    },
  });
  console.log(user);

  // جلب جميع المستخدمين
  const allUsers = await prisma.user.findMany();
  console.log(allUsers);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
