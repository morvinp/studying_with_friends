import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

// Fix: Use absolute URL for both development and production
const callbackURL = process.env.NODE_ENV === "production" 
    ? `${process.env.BACKEND_URL}/api/auth/google/callback`
    : `http://localhost:${process.env.PORT || 5001}/api/auth/google/callback`;

// Add debug logging
console.log("Google OAuth Callback URL:", callbackURL);
console.log("Environment:", process.env.NODE_ENV);
console.log("Port:", process.env.PORT);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            return done(null, user);
        }
        
        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
        }
        
        // Create new user
        user = new User({
            googleId: profile.id,
            fullName: profile.displayName,
            email: profile.emails[0].value,
            profilePic: profile.photos[0].value,
            technologies: [], // Add this line for new model structure
            isOnBoarded: false
        });
        
        await user.save();
        done(null, user);
    } catch (error) {
        done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
