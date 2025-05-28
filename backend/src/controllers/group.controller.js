import Group from "../models/Group.js";
import User from "../models/User.js";

// Generate 6-character alphanumeric group ID
function generateGroupId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function createGroup(req, res) {
    try {
        const { name, description, isPublic = true } = req.body;
        const creatorId = req.user.id;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: "Group name is required" });
        }

        // Generate unique group ID
        let groupId;
        let isUnique = false;
        while (!isUnique) {
            groupId = generateGroupId();
            const existingGroup = await Group.findOne({ groupId });
            if (!existingGroup) {
                isUnique = true;
            }
        }

        const group = await Group.create({
            name: name.trim(),
            description: description?.trim() || "",
            groupId,
            creator: creatorId,
            members: [creatorId],
            isPublic
        });

        const populatedGroup = await Group.findById(group._id)
            .populate("creator", "fullName profilePic")
            .populate("members", "fullName profilePic");

        res.status(201).json(populatedGroup);
    } catch (error) {
        console.error("Error in createGroup controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function joinGroupById(req, res) {
    try {
        const { groupId } = req.body;
        const userId = req.user.id;

        if (!groupId || groupId.length !== 6) {
            return res.status(400).json({ message: "Valid 6-character group ID is required" });
        }

        const group = await Group.findOne({ groupId: groupId.toUpperCase() });
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (group.members.includes(userId)) {
            return res.status(400).json({ message: "You are already a member of this group" });
        }

        if (group.members.length >= group.maxMembers) {
            return res.status(400).json({ message: "Group is full" });
        }

        group.members.push(userId);
        await group.save();

        const populatedGroup = await Group.findById(group._id)
            .populate("creator", "fullName profilePic")
            .populate("members", "fullName profilePic");

        res.status(200).json(populatedGroup);
    } catch (error) {
        console.error("Error in joinGroupById controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function searchGroups(req, res) {
    try {
        const { query } = req.query;
        const userId = req.user.id;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({ message: "Search query is required" });
        }

        const groups = await Group.find({
            $and: [
                { isPublic: true },
                { members: { $ne: userId } }, // Exclude groups user is already in
                {
                    $or: [
                        { name: { $regex: query.trim(), $options: 'i' } },
                        { description: { $regex: query.trim(), $options: 'i' } }
                    ]
                }
            ]
        })
        .populate("creator", "fullName profilePic")
        .populate("members", "fullName profilePic")
        .limit(20);

        res.status(200).json(groups);
    } catch (error) {
        console.error("Error in searchGroups controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getMyGroups(req, res) {
    try {
        const userId = req.user.id;

        const groups = await Group.find({
            members: userId
        })
        .populate("creator", "fullName profilePic")
        .populate("members", "fullName profilePic")
        .sort({ updatedAt: -1 });

        res.status(200).json(groups);
    } catch (error) {
        console.error("Error in getMyGroups controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function leaveGroup(req, res) {
    try {
        const { id: groupId } = req.params;
        const userId = req.user.id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (!group.members.includes(userId)) {
            return res.status(400).json({ message: "You are not a member of this group" });
        }

        // Remove user from members
        group.members = group.members.filter(memberId => memberId.toString() !== userId);
        
        // If creator leaves and there are other members, transfer ownership
        if (group.creator.toString() === userId && group.members.length > 0) {
            group.creator = group.members[0];
        }
        
        // If no members left, delete the group
        if (group.members.length === 0) {
            await Group.findByIdAndDelete(groupId);
            return res.status(200).json({ message: "Group deleted as no members remain" });
        }

        await group.save();
        res.status(200).json({ message: "Left group successfully" });
    } catch (error) {
        console.error("Error in leaveGroup controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
