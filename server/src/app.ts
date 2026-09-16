import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { parseSession, enforceRestrictedSession } from './middleware/auth.middleware';
import authRoute from "./routes/auth.route";
import requestersRoute from "./routes/requesters.route";
import categoriesRoute from "./routes/categories.route";
import relatedSystemsRoute from "./routes/relatedSystems.route";
import ticketsRoute from "./routes/tickets.route";
import attachmentsRoute from "./routes/attachments.route";
import staffTicketsRoute from "./routes/staffTickets.route";
import adminUsersRoute from "./routes/adminUsers.route";

const app = express();

app.use(cors({
    credentials: true,
    origin: true,
}));
app.use(cookieParser());
app.use(express.json());

// Global session parsing and restricted-session enforcement
app.use(parseSession);
app.use(enforceRestrictedSession);

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'TokTickIT API'
    });
});

app.use("/api/auth", authRoute);
app.use("/api/requesters", requestersRoute);
app.use("/api/categories", categoriesRoute);
app.use("/api/related-systems", relatedSystemsRoute);
app.use("/api/tickets", ticketsRoute);
app.use("/api/attachments", attachmentsRoute);
app.use("/api/staff/tickets", staffTicketsRoute);
app.use("/api/admin/users", adminUsersRoute);

export default app;