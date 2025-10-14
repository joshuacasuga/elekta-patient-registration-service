import express from "express";
import dotenv from 'dotenv';
import cors from 'cors';
import { sql } from './config/db.js';
import patientRoutes from "./routes/patientRoutes.js";

dotenv.config();

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

app.listen(port, () => {
    console.log(`Patient Registration Service listening on http://localhost:${port}`);
});

// Route to test db connection
app.get('/db-connection', async (req, res) => {
    try {
        const result = await sql`SELECT NOW() AS now`;
        res.send(`Database connected! Server time: ${result[0].now}`)
        console.log('Database connected!');
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).send('Failed to connect to the database');
    }
})

// Route to test server health
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.use("/v1/patients", patientRoutes);

export default app;
