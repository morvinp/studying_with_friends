import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 50
    },
    description: {
        type: String,
        default: "",
        maxLength: 200
    },
    groupId: {
        type: String,
        required: true,
        unique: true,
        length: 6
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    isPublic: {
        type: Boolean,
        default: true
    },
    maxMembers: {
        type: Number,
        default: 50
    }
}, { timestamps: true });

const Group = mongoose.model("Group", groupSchema);

export default Group;
