import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
    createGroup, 
    joinGroupById, 
    searchGroups, 
    getMyGroups, 
    leaveGroup 
} from "../controllers/group.controller.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(protectRoute);

router.post("/", createGroup);
router.post("/join", joinGroupById);
router.get("/search", searchGroups);
router.get("/my-groups", getMyGroups);
router.delete("/:id/leave", leaveGroup);

export default router;
