import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const app = express();

app.use(cors());
app.use(express.json());

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'TokTickIT API'
    });
});

app.get("/api/categories", async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: {
                id: "asc",
            },
            select: {
                id: true,
                name: true,
            },
        });
        return res.status(200).json(categories)
    } catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({ error: 'Failed to fetch categories' })
    }
})

export default app;