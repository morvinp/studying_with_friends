import { axiosInstance } from "./axios";

export const signup = async (signupData)=>{
      const response = await axiosInstance.post("/auth/signup",signupData);
      return response.data;
}

export const login = async (loginData)=>{
      const response = await axiosInstance.post("/auth/login",loginData);
      return response.data;
}

export const logout = async ()=>{
      const response = await axiosInstance.post("/auth/logout");
      return response.data;
}

export const getAuthUser = async()=>{
      try{
      const res = await axiosInstance.get("/auth/me");
      return res.data;
      }catch(error){
            console.log("error in getAuthUser",error);
            return null;
      }
    }

export const completeOnboarding = async(userData)=>{
    const response = await axiosInstance.post("/auth/onboarding",userData);
    return response.data;
}

export async function getUserFriends() {
  const response = await axiosInstance.get("/users/friends");
  return response.data;
}

export async function getRecommendedUsers() {
  const response = await axiosInstance.get("/users");
  return response.data;
}

export async function getOutgoingFriendReqs() {
  const response = await axiosInstance.get("/users/outgoing-friend-requests");
  return response.data;
}

export async function sendFriendRequest(userId) {
  console.log("Sending friend request to:", userId);
  const response = await axiosInstance.post(`/users/friend-request/${userId}`);
  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/users/friend-requests");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(`/users/friend-request/${requestId}/accept`);
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

export async function createGroup(groupData) {
    const response = await axiosInstance.post("/groups", groupData);
    return response.data;
}

export async function joinGroupById(groupId) {
    const response = await axiosInstance.post("/groups/join", { groupId });
    return response.data;
}

export async function searchGroups(query) {
    const response = await axiosInstance.get(`/groups/search?query=${encodeURIComponent(query)}`);
    return response.data;
}

export async function getMyGroups() {
    const response = await axiosInstance.get("/groups/my-groups");
    return response.data;
}

export async function leaveGroup(groupId) {
    const response = await axiosInstance.delete(`/groups/${groupId}/leave`);
    return response.data;
}


// Add this function
export const getSocketToken = async () => {
  try {
    const response = await axiosInstance.get("/auth/socket-token");
    return response.data;
  } catch (error) {
    console.log("error in getSocketToken", error);
    return null;
  }
};
// Add this function
export const getChatMessages = async (chatId, page = 1, limit = 50) => {
  try {
    const response = await axiosInstance.get(`/messages/${chatId}?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.log("error in getChatMessages", error);
    return { messages: [], hasMore: false };
  }
};

// Add this function to get user details
export const getUserById = async (userId) => {
  try {
    const response = await axiosInstance.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.log("error in getUserById", error);
    return null;
  }
};
