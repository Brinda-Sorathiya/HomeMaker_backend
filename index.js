import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import { sql } from "./config/db.js";
import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js'
import recomendRoutes from './routes/recommendationRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import { app, server } from "./lib/socket.js";

dotenv.config();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.get("/", (req, res) => {
    res.send("Hello World");
});

app.use('/auth', authRoutes);
app.use('/property', propertyRoutes);
app.use('/review', reviewRoutes);
app.use('/recommend', recomendRoutes);
app.use('/chat', chatRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await sql`SELECT 1`;
        console.log("Connected to the database");
        
        // Start server
        server.listen(PORT, () => {
            console.log(`Server is running on port http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();