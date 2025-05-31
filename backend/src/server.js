import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import { createServer } from 'http';
import { initializeSocket } from './lib/socket.js';

dotenv.config();

import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import groupRoutes from "./routes/group.route.js";
import messageRoutes from "./routes/message.route.js"; // Add message routes
import { connectDB } from "./lib/db.js";
import passport from "./lib/passport.js"; // Import passport configuration

const app = express();
const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// Create HTTP server for Socket.io
const server = createServer(app);

// Initialize Socket.io
initializeSocket(server);

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === "production" 
        ? [process.env.FRONTEND_URL] // This will use your FRONTEND_URL
        : ["http://localhost:5173"],
    credentials: true,
}));


// Basic middleware
app.use(express.json({ limit: "10mb" })); // Increased limit for file uploads
app.use(cookieParser());

// Session configuration (MUST come before passport middleware)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-fallback-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI, // Make sure you have this in your .env
    }),
    cookie: {
        secure: process.env.NODE_ENV === "production", // true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport middleware (MUST come after session)
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes); // Add message routes

// Health check endpoint for Socket.io monitoring
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        websocket: "enabled"
    });
});

// Production static files
if(process.env.NODE_ENV === "production"){
    app.use(express.static(path.join(__dirname,"../frontend/dist")));

    app.get("*", (req,res)=>{
        res.sendFile(path.join(__dirname,"../frontend/dist/index.html"))
    })
}

// Use server.listen instead of app.listen for Socket.io support
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Socket.io enabled on port ${PORT}`);
    connectDB();
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
