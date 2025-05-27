import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
dotenv.config();

import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import { connectDB } from "./lib/db.js";
import passport from "./lib/passport.js"; // Import passport configuration

const app = express();
const PORT = process.env.PORT;
const __dirname = path.resolve();

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === "production" 
        ? ["https://studying-with-friends.onrender.com"]
        : ["http://localhost:5173"],
    credentials: true,
}));

// Basic middleware
app.use(express.json());
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

// Production static files
if(process.env.NODE_ENV === "production"){
    app.use(express.static(path.join(__dirname,"../frontend/dist")));

    app.get("*", (req,res)=>{
        res.sendFile(path.join(__dirname,"../frontend/dist/index.html"))
    })
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});
