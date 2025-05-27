import mongoose, { mongo } from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    fullName:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required: function() {
            // Password is only required if googleId is not present
            return !this.googleId;
        },
        minLength:6
    },
    // Add Google ID field
    googleId: {
        type: String,
        unique: true,
        sparse: true // This allows multiple null values
    },
    bio:{
        type:String,
        default:"",
    },
    profilePic:{
        type:String,
        default:"",
    },
    nativeLanguage:{
        type:String,
        default:"",
    },
    learningLanguage:{
        type:String,
        default:"",
    },
    location:{
        type:String,
        default:"",
    },
    isOnBoarded:{ // Note: Fixed the typo from "isOnBoarded" to match your structure
        type:Boolean,
        default:false,
    },
    friends:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
        }
    ]
}, {timestamps:true});

// Pre hook - only hash password if it exists and is modified
userSchema.pre("save", async function(next){
    // Skip password hashing if password is not present (Google OAuth users)
    if(!this.password || !this.isModified("password")) return next();
    
    try{
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    }catch(error){
        next(error);
    }
})

userSchema.methods.matchPassword = async function(enteredPassword){
    // Return false if user doesn't have a password (Google OAuth only)
    if (!this.password) return false;
    
    const isPasswordCorrect = await bcrypt.compare(enteredPassword, this.password);
    return isPasswordCorrect;
};

const User = mongoose.model("User", userSchema);

export default User;
