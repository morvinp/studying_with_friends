import {StreamChat} from "stream-chat"

import "dotenv/config"

const apiKey = process.env.STREAM_API_KEY

const apiSecret = process.env.STREAM_API_SECRET

if(!apiKey || !apiSecret){
    console.error("Stream api key or secret is missing");
}

const streamClient = StreamChat.getInstance(apiKey,apiSecret);

export const upsertStreamUser = async (userData)=>{
    try{
        await streamClient.upsertUsers([userData]);
        return userData
    }catch(error){
        console.error("Error upserting Stream user:", error);
    }
};

export const generateStreamToken = (userId)=>{
    try{
        // ensure userId is a string
        const useridStr = userId.toString();
        return streamClient.createToken(useridStr);
    }catch(error){
        console.error("error generating stream token", error);
    }
}