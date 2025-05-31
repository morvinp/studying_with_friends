import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { getSocketToken, googleCallback, login, logout, onboard, signup } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router()

// Existing routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/onboarding", protectRoute, onboard);
router.get("/me", protectRoute, (req, res) => {
    res.status(200).json({ success: true, user: req.user });
});
router.get("/socket-token", protectRoute, getSocketToken);
// Google OAuth routes
router.get("/google", 
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get("/google/callback",
    passport.authenticate('google', { 
        failureRedirect: process.env.NODE_ENV === "production" 
            ? `${process.env.FRONTEND_URL}/login`
            : "http://localhost:5173/login"
    }),
    googleCallback
);

export default router;
