import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from "./lib/prisma";

import requestersRoute from "./routes/requesters.route";
import categoriesRoute from "./routes/categories.route";
import relatedSystemsRoute from "./routes/relatedSystems.route";
import ticketsRoute from "./routes/tickets.route";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'TokTickIT API'
    });
});

app.use("/api/requesters", requestersRoute);
app.use("/api/categories", categoriesRoute);
app.use("/api/related-systems", relatedSystemsRoute);
app.use("/api/tickets", ticketsRoute);

export default app;