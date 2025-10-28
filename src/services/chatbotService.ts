import axiosClient from "../apis/api-client";

const askChatBot = async (params: { question: string, roomId: string, roomKey?: string }) => {
    const response = await axiosClient.post(`/chatbot/ask`, params);
    return response;
};

const chatbotService = {
    askChatBot
}

export default chatbotService;

