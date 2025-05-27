import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { googleCallback, login, logout, onboard, signup } from "../controllers/auth.controller.js";
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

// Google OAuth routes
router.get("/google", 
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get("/google/callback",
    passport.authenticate('google', { failureRedirect: 'http://localhost:5173/login' }),
    googleCallback
);

export default router;

