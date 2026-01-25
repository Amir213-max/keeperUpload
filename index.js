import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // جلب بيانات المستخدمين
  const users = await prisma.user.findMany();

  if (users.length > 0) {
    // عرض أسماء الأعمدة من أول كائن مستخدم
    console.log('User columns:', Object.keys(users[0]));
  } else {
    console.log('No users found');
  }

  // نفس الشيء لموديل Address (كمثال)
  const addresses = await prisma.address.findMany();
  if (addresses.length > 0) {
    console.log('Address columns:', Object.keys(addresses[0]));
  } else {
    console.log('No addresses found');
  }

  // وهكذا مع موديلات أخرى حسب الحاجة
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
