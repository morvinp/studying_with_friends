import mongoose from "mongoose";
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
            return !this.googleId;
        },
        minLength:6
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    bio:{
        type:String,
        default:"",
    },
    profilePic:{
        type:String,
        default:"",
    },
    // NEW: Replace language fields with technologies
    technologies: {
        type: [String],
        default: []
        // No validation here - we'll handle it in controllers
    },
    isOnBoarded:{
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

// Keep your existing password hashing middleware
userSchema.pre("save", async function(next){
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
    if (!this.password) return false;
    const isPasswordCorrect = await bcrypt.compare(enteredPassword, this.password);
    return isPasswordCorrect;
};

const User = mongoose.model("User", userSchema);
export default User;
