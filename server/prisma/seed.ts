import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    // 4 required Categories
    const categories = ['Account and Access', 'Hardware', 'Software', 'Network'];

    for (const name of categories) {
        await prisma.category.upsert({
            where: { name },
            update: { isActive: true },
            create: { name, isActive: true },
        });
    }

    // 7 Related Systems
    const relatedSystems = [
        'Email',
        'Campus Wi-Fi',
        'VPN',
        'LEB2 App',
        'Grade Submission App',
        'Printer',
        'Corporate Laptop',
    ];
    for (const name of relatedSystems) {
        await prisma.relatedSystem.upsert({
            where: { name },
            update: { isActive: true },
            create: { name, isActive: true },
        });
    }

    // 4 active Development Requesters
    const activeRequesters = [
        { name: 'Alice Tanaka', email: 'alice.tanaka@example.com' },
        { name: 'Bob Chavez', email: 'bob.chavez@example.com' },
        { name: 'Carol Meier', email: 'carol.meier@example.com' },
        { name: 'David Sorn', email: 'david.sorn@example.com' },
    ];
    for (const r of activeRequesters) {
        await prisma.devRequester.upsert({
            where: { email: r.email },
            update: { name: r.name, isActive: true },
            create: { name: r.name, email: r.email, isActive: true },
        });
    }

    // 1 inactive Development Requester
    await prisma.devRequester.upsert({
        where: { email: 'eve.former@example.com' },
        update: { name: 'Eve Former', isActive: false },
        create: {
            name: 'Eve Former',
            email: 'eve.former@example.com',
            isActive: false,
        },
    });

    console.log('Seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });