const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const email = 'kartik@codity.com';
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash: hash, name: 'Kartik Gupta' },
        create: {
            email,
            passwordHash: hash,
            name: 'Kartik Gupta'
        }
    });

    console.log('SUCCESS! Account created:');
    console.log('Email:', email);
    console.log('Password:', password);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
