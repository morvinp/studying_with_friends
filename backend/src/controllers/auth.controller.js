import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.js"
import jwt from "jsonwebtoken"

export async function signup(req,res){
    const {email, password, fullName}=req.body;

    try{
        if(!email || !password || !fullName){
            return res.status(400).json({message:"All fields required"});
        }

        if(password.length < 6){
            return res.status(400).json({message:"Password must be at least 6 characters"});
        }

        // Check email 
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
        }

        const existingUser = await User.findOne({email});
        if(existingUser){
            // Check if user signed up with Google
            if (existingUser.googleId) {
                return res.status(400).json({
                    message: "Account exists with Google. Please login with Google."
                });
            }
            return res.status(400).json({message:"Email already exists, please use a different one"});
        }
        
        const idx = Math.floor(Math.random()*100)+1;
        const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`

        const newUser = await User.create({
            email,
            fullName,
            password,
            profilePic:randomAvatar,
            technologies: [] // Initialize empty technologies array
        })

        try{
            await upsertStreamUser({
                id:newUser._id.toString(),
                name: newUser.fullName,
                image: newUser.profilePic || "",
            });
            console.log(`Stream user created for ${newUser.fullName}`);
        }catch(error){
            console.log("Error creating stream user",error);
        }

        const token = jwt.sign({userId:newUser._id},process.env.JWT_SECRET_KEY, { expiresIn:"7d"})

        res.cookie("jwt",token,{
            maxAge: 7*24*60*60*1000,
            httpOnly:true,//prevent XSS attacks
            sameSite: "strict", //prevent CSRF attacks
            secure: process.env.NODE_ENV==="production"
        })

        res.status(201).json({success:true,user:newUser})
    }catch(error){
        console.log("error in signup controller",error);
        res.status(500).json({message:"Something went wrong"});
    }
}

export async function login(req,res){
    try{
        const {email, password}=req.body;
        if(!email || !password){
            return res.status(400).json({message: "All fields required"});
        }

        const user = await User.findOne({email});
        if(!user) return res.status(401).json({message:"Invalid Email or password"});

        // Check if user signed up with Google
        if (user.googleId && !user.password) {
            return res.status(400).json({
                message: "Please login with Google"
            });
        }

        const isPasswordCorrect = await user.matchPassword(password);
        if(!isPasswordCorrect) return res.status(401).json({message: "Invalid Email or password"});

        const token = jwt.sign({userId:user._id},process.env.JWT_SECRET_KEY, { expiresIn:"7d"})

        res.cookie("jwt",token,{
            maxAge: 7*24*60*60*1000,
            httpOnly:true,//prevent XSS attacks
            sameSite: "strict", //prevent CSRF attacks
            secure: process.env.NODE_ENV==="production"
        })

        res.status(200).json({success:true, user});
        
    }catch(error){
        console.log("Error in login controller", error.message);
        res.status(500).json({message:"Internal Server error"});
    }
}

export function logout(req,res){
    res.clearCookie("jwt");
    res.status(200).json({success:true,message:"Logout Successful"});
}

// Updated onboard function for technologies
export async function onboard(req, res){
    try{
        const userId = req.user._id;
        const {fullName, bio, technologies, profilePic} = req.body;

        // Validate required fields
        if(!fullName || !technologies || !Array.isArray(technologies) || technologies.length === 0){
            return res.status(400).json({
                message:"Required fields missing or invalid",
                missingFields:[
                    !fullName && "fullName",
                    (!technologies || !Array.isArray(technologies) || technologies.length === 0) && "technologies (at least 1 required)"
                ].filter(Boolean)
            });
        }

        // Validate technologies array length (max 5)
        if(technologies.length > 5) {
            return res.status(400).json({
                message: "Maximum 5 technologies allowed"
            });
        }

        // Prepare update data
        const updateData = {
            fullName,
            bio: bio || "", // bio is optional
            technologies,
            isOnBoarded: true
        };

        // Only update profilePic if provided
        if(profilePic && profilePic.trim()) {
            updateData.profilePic = profilePic;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            {new: true}
        );

        if(!updatedUser){
            return res.status(404).json({message: "User not found"});
        }

        try{
            await upsertStreamUser({
                id: updatedUser._id.toString(),
                name: updatedUser.fullName,
                image: updatedUser.profilePic || "",
            });
            console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
        }catch(error){
            console.log("Error updating Stream user during onboarding:", error.message);
        }

        res.status(200).json({success: true, user: updatedUser});
    }catch(error){
        console.error("Onboarding error:", error);
        res.status(500).json({message:"Internal Server Error"});
    }
}

// Google OAuth Controllers
export const googleAuth = (req, res, next) => {
    // This will be handled by passport middleware in routes
    // No need for implementation here
};

export const googleCallback = async (req, res) => {
    try {
        // Create/update Stream user for Google OAuth users
        try {
            await upsertStreamUser({
                id: req.user._id.toString(),
                name: req.user.fullName,
                image: req.user.profilePic || "",
            });
            console.log(`Stream user created/updated for Google user ${req.user.fullName}`);
        } catch(streamError) {
            console.log("Error creating/updating stream user for Google OAuth:", streamError);
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: req.user._id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "7d" }
        );

        // Set cookie
        res.cookie("jwt", token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
        });

        // Dynamic redirect based on environment
        const frontendUrl = process.env.NODE_ENV === "production" 
            ? process.env.FRONTEND_URL || "https://studying-with-friends.onrender.com"
            : "http://localhost:5173";

        // Redirect to frontend
        res.redirect(`${frontendUrl}${req.user.isOnBoarded ? '/' : '/onboarding'}`);
    } catch (error) {
        console.error("Error in Google callback:", error);
        
        const frontendUrl = process.env.NODE_ENV === "production" 
            ? process.env.FRONTEND_URL || "https://studying-with-friends.onrender.com"
            : "http://localhost:5173";
            
        res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
};


// Add this new function
export const getSocketToken = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Generate a short-lived token specifically for Socket.io
    const socketToken = jwt.sign(
      { userId: req.user._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '1h' } // Short-lived for Socket.io
    );

    res.status(200).json({ token: socketToken });
  } catch (error) {
    console.error('Error getting socket token:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
