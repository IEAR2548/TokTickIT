import { prisma } from "../src/lib/prisma";

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

    // 5 active Development Requesters
    const activeRequesters = [
        { name: 'Alice Tanaka', email: 'alice.tanaka@example.com' },
        { name: 'Bob Chavez', email: 'bob.chavez@example.com' },
        { name: 'Carol Meier', email: 'carol.meier@example.com' },
        { name: 'David Sorn', email: 'david.sorn@example.com' },
        { name: 'Elena Rostova', email: 'elena.rostova@example.com' },
        { name: 'Fiona Gallagher', email: 'fiona.gallagher@example.com' },
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

    // Lookup maps for foreign keys
    const categoryMap = new Map<string, number>();
    const allCategories = await prisma.category.findMany();
    for (const c of allCategories) {
        categoryMap.set(c.name, c.id);
    }

    const systemMap = new Map<string, number>();
    const allSystems = await prisma.relatedSystem.findMany();
    for (const s of allSystems) {
        systemMap.set(s.name, s.id);
    }

    const requesterMap = new Map<string, number>();
    const allRequesters = await prisma.devRequester.findMany();
    for (const r of allRequesters) {
        requesterMap.set(r.email, r.id);
    }

    // Sample tickets for each active requester
    const sampleTickets = [
        // Alice Tanaka
        {
            ticketNumber: 'TK-20260824-0001',
            requesterEmail: 'alice.tanaka@example.com',
            categoryName: 'Hardware',
            relatedSystemName: 'Corporate Laptop',
            summary: 'Laptop battery drains quickly',
            description: 'The battery drains from 100% to 0% within one hour of normal usage.',
            requestedPriority: 'MEDIUM' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-08-24T09:14:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260825-0001',
            requesterEmail: 'alice.tanaka@example.com',
            categoryName: 'Network',
            relatedSystemName: 'Campus Wi-Fi',
            summary: 'Cannot connect to Campus Wi-Fi in building 3',
            description: 'Wi-Fi authentication keeps failing with timeout error since yesterday morning.',
            requestedPriority: 'HIGH' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-08-25T10:30:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260825-0002',
            requesterEmail: 'alice.tanaka@example.com',
            categoryName: 'Software',
            relatedSystemName: 'LEB2 App',
            summary: 'LEB2 App font rendering issue on Linux',
            description: 'Thai fonts are clipped and overlapping in student dashboard on Chrome Linux.',
            requestedPriority: 'LOW' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-08-25T14:15:00.000Z'),
        },

        // Bob Chavez
        {
            ticketNumber: 'TK-20260826-0001',
            requesterEmail: 'bob.chavez@example.com',
            categoryName: 'Network',
            relatedSystemName: 'VPN',
            summary: 'Unable to access VPN from home',
            description: 'Receiving certificate error when initiating Cisco VPN client connection.',
            requestedPriority: 'HIGH' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-08-26T08:45:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260827-0001',
            requesterEmail: 'bob.chavez@example.com',
            categoryName: 'Account and Access',
            relatedSystemName: 'Email',
            summary: 'Password reset required for institutional email',
            description: 'Locked out of primary email account after too many incorrect password attempts.',
            requestedPriority: 'CRITICAL' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-08-27T11:00:00.000Z'),
        },

        // Carol Meier
        {
            ticketNumber: 'TK-20260828-0001',
            requesterEmail: 'carol.meier@example.com',
            categoryName: 'Software',
            relatedSystemName: 'Grade Submission App',
            summary: 'Grade Submission App throws 500 error on final report export',
            description: 'Exporting semester grade report gives unexpected server error 500.',
            requestedPriority: 'CRITICAL' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-08-28T14:20:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260829-0001',
            requesterEmail: 'carol.meier@example.com',
            categoryName: 'Hardware',
            relatedSystemName: 'Printer',
            summary: 'Paper jam in 4th floor shared printer',
            description: 'Printer tray 2 has a paper jam and error indicator red light is flashing.',
            requestedPriority: 'LOW' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-08-29T13:15:00.000Z'),
        },

        // David Sorn
        {
            ticketNumber: 'TK-20260830-0001',
            requesterEmail: 'david.sorn@example.com',
            categoryName: 'Software',
            relatedSystemName: 'LEB2 App',
            summary: 'LEB2 App session keeps expiring during quiz submission',
            description: 'Students reporting that LEB2 logouts happen unexpectedly during mid-quiz.',
            requestedPriority: 'HIGH' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-08-30T15:00:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260831-0001',
            requesterEmail: 'david.sorn@example.com',
            categoryName: 'Account and Access',
            relatedSystemName: 'Email',
            summary: 'New staff account creation request for teaching assistant',
            description: 'Please create network access and institutional email for new semester TA.',
            requestedPriority: 'MEDIUM' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-08-31T09:00:00.000Z'),
        },

        // Elena Rostova (14 tickets to demonstrate multi-page pagination)
        {
            ticketNumber: 'TK-20260901-0001',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Account and Access',
            relatedSystemName: 'Email',
            summary: 'Email sync failing on Thunderbird client',
            description: 'IMAP sync errors out with connection timeout code 504 on workstation.',
            requestedPriority: 'MEDIUM' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T08:00:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0002',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Network',
            relatedSystemName: 'Campus Wi-Fi',
            summary: 'Wi-Fi disconnects intermittently in library',
            description: 'Connection drops every 15 minutes while studying in the quiet zone.',
            requestedPriority: 'LOW' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T08:30:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0003',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Software',
            relatedSystemName: 'Grade Submission App',
            summary: 'Software license renewal for MATLAB toolbox',
            description: 'License expired notice showing on department lab computers.',
            requestedPriority: 'HIGH' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T09:00:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0004',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Hardware',
            relatedSystemName: 'Corporate Laptop',
            summary: 'Monitor display flickers when connected via HDMI',
            description: 'External display goes black intermittently when shaking the desk.',
            requestedPriority: 'MEDIUM' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T09:30:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0005',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Network',
            relatedSystemName: 'VPN',
            summary: 'Cannot reach internal portal via VPN',
            description: 'DNS resolution fails for intranet.kmutt.ac.th over VPN gateway.',
            requestedPriority: 'HIGH' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T10:00:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0006',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Hardware',
            relatedSystemName: 'Printer',
            summary: 'Scanner not detected on network printer',
            description: 'Scan to email feature says printer offline on 2nd floor.',
            requestedPriority: 'LOW' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T10:30:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0007',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Account and Access',
            relatedSystemName: 'Email',
            summary: 'Password expired and cannot reset via self-service',
            description: 'Self-service portal says security questions not configured.',
            requestedPriority: 'CRITICAL' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T11:00:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0008',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Software',
            relatedSystemName: 'LEB2 App',
            summary: 'LEB2 assignment upload button not responding',
            description: 'Clicking submit does nothing when attaching ZIP file above 10MB.',
            requestedPriority: 'HIGH' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T11:30:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0009',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Hardware',
            relatedSystemName: 'Corporate Laptop',
            summary: 'Keyboard spacebar sticking on corporate laptop',
            description: 'Spacebar requires heavy pressure to register keystrokes.',
            requestedPriority: 'LOW' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T12:00:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0010',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Network',
            relatedSystemName: 'VPN',
            summary: 'VPN disconnection during large file transfer',
            description: 'Tunnel drops every time transferring dataset larger than 1GB.',
            requestedPriority: 'MEDIUM' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T12:30:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0011',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Software',
            relatedSystemName: 'Grade Submission App',
            summary: 'Grade report calculation error for curved grades',
            description: 'Weighted formula gives NaN when student has zero marks.',
            requestedPriority: 'CRITICAL' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T13:00:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0012',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Network',
            relatedSystemName: 'Campus Wi-Fi',
            summary: 'Wi-Fi certificate invalid warning on Android device',
            description: 'Device warns of untrusted root CA when attempting to connect.',
            requestedPriority: 'MEDIUM' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T13:30:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0013',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Hardware',
            relatedSystemName: 'Printer',
            summary: 'Toner replacement needed for science building printer',
            description: 'Black cartridge empty indicator is on, cannot print research papers.',
            requestedPriority: 'LOW' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T14:00:00.000Z'),
        },
        {
            ticketNumber: 'TK-20260901-0014',
            requesterEmail: 'elena.rostova@example.com',
            categoryName: 'Account and Access',
            relatedSystemName: 'Email',
            summary: 'Request new account access for visiting professor',
            description: 'Guest lecturer starting next week needs library and email credentials.',
            requestedPriority: 'MEDIUM' as const,
            currentStatus: 'NEW' as const,
            createdAt: new Date('2026-09-01T14:30:00.000Z'),
        },
    ];

    for (const t of sampleTickets) {
        const requesterId = requesterMap.get(t.requesterEmail);
        const categoryId = categoryMap.get(t.categoryName);
        const relatedSystemId = systemMap.get(t.relatedSystemName);

        if (requesterId && categoryId && relatedSystemId) {
            await prisma.ticket.upsert({
                where: { ticketNumber: t.ticketNumber },
                update: {
                    requesterId,
                    categoryId,
                    relatedSystemId,
                    summary: t.summary,
                    description: t.description,
                    requestedPriority: t.requestedPriority,
                    currentStatus: t.currentStatus,
                },
                create: {
                    ticketNumber: t.ticketNumber,
                    requesterId,
                    categoryId,
                    relatedSystemId,
                    summary: t.summary,
                    description: t.description,
                    requestedPriority: t.requestedPriority,
                    currentStatus: t.currentStatus,
                    createdAt: t.createdAt,
                },
            });
        }
    }

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