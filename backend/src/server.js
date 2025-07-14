import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import { createServer } from 'http';
import keyVaultService from './services/keyVault.service.js';

// Load local environment variables first (for fallback and Key Vault URL)
dotenv.config();

import cors from "cors";
import path from "path";

// Import routes (these don't need env vars at import time)
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import groupRoutes from "./routes/group.route.js";
import messageRoutes from "./routes/message.route.js";
import leaderboardRoutes from "./routes/leaderboard.route.js";
import aiRoutes from "./routes/ai.route.js";
import powerbiRoutes from "./routes/powerbi.route.js";

// Initialize the application
const initializeApp = async () => {
    try {
        console.log('🚀 Starting application initialization...');

        // Check if we should use Key Vault
        const useKeyVault = process.env.NODE_ENV === 'production' || process.env.USE_KEY_VAULT === 'true';
        
        if (useKeyVault) {
            console.log('🔐 Key Vault mode enabled');
            
            // Check if Key Vault URL is configured
            if (!process.env.AZURE_KEY_VAULT_URL) {
                console.error('❌ AZURE_KEY_VAULT_URL not found in environment variables');
                console.log('📋 Please add AZURE_KEY_VAULT_URL to your .env file');
                console.log('📋 Example: AZURE_KEY_VAULT_URL=https://your-keyvault-name.vault.azure.net/');
                console.log('🔄 Falling back to local environment variables');
            } else {
                console.log(`🔐 Key Vault URL: ${process.env.AZURE_KEY_VAULT_URL}`);
                console.log('🔄 Loading secrets from Azure Key Vault...');
                
                const loadResult = await keyVaultService.loadAllSecrets();
                
                if (!loadResult.success) {
                    console.warn('⚠️ Key Vault loading failed, falling back to local environment variables');
                } else {
                    console.log(`✅ Successfully loaded ${loadResult.totalLoaded}/${loadResult.totalAttempted} secrets from Key Vault`);
                }
            }
        } else {
            console.log('🏠 Development mode: Using local .env file');
        }

        // NOW import modules that need environment variables (after Key Vault loading)
        const { initializeSocket } = await import('./lib/socket.js');
        const { connectDB } = await import('./lib/db.js');
        const passport = await import('./lib/passport.js');

        // Initialize Express app
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
                ? ["https://studying-with-friends.onrender.com"]
                : ["http://localhost:5173"],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
        }));

        // Basic middleware
        app.use(express.json({ limit: "10mb" }));
        app.use(cookieParser());

        // Session configuration
        app.use(session({
            secret: process.env.SESSION_SECRET || 'your-fallback-secret',
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({
                mongoUrl: process.env.MONGO_URI,
            }),
            cookie: {
                secure: process.env.NODE_ENV === "production",
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            }
        }));

        // Passport middleware (use the default export)
        app.use(passport.default.initialize());
        app.use(passport.default.session());

        // Routes
        app.use("/api/auth", authRoutes);
        app.use("/api/users", userRoutes);
        app.use("/api/chat", chatRoutes);
        app.use("/api/groups", groupRoutes);
        app.use("/api/messages", messageRoutes);
        app.use("/api/ai", aiRoutes);
        app.use("/api/leaderboard", leaderboardRoutes);
        app.use("/api/powerbi", powerbiRoutes);

        // Health check endpoint with Key Vault status
        app.get("/api/health", async (req, res) => {
            const keyVaultHealth = await keyVaultService.healthCheck();
            
            res.json({ 
                status: "ok", 
                timestamp: new Date().toISOString(),
                websocket: "enabled",
                keyVault: {
                    enabled: useKeyVault,
                    configured: !!process.env.AZURE_KEY_VAULT_URL,
                    status: keyVaultHealth.status,
                    message: keyVaultHealth.message
                },
                environment: process.env.NODE_ENV || 'development'
            });
        });

        // Production static files
        if(process.env.NODE_ENV === "production"){
            app.use(express.static(path.join(__dirname,"../frontend/dist")));

            app.get("*", (req,res)=>{
                res.sendFile(path.join(__dirname,"../frontend/dist/index.html"))
            })
        }

        // Start server
        server.listen(PORT, () => {
            console.log(`\n🎉 Application started successfully!`);
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`🔌 Socket.io enabled on port ${PORT}`);
            console.log(`🔐 Key Vault: ${useKeyVault ? 'Enabled' : 'Disabled'}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
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

    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        process.exit(1);
    }
};

// Start the application
initializeApp();
