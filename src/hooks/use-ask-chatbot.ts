import chatbotService from "@/services/chatbotService";
import { useMutation } from "@tanstack/react-query";

const askChatBotRequest = async (params: { question: string; roomId: string }) => {
    const response = await chatbotService.askChatBot(params);
    return response;
};

const useAskChatBot = () => {
    const { isPending, mutateAsync: askChatBot } = useMutation({
        mutationFn: (params: { question: string; roomId: string }) =>
            askChatBotRequest(params),
    });
    return { isPending, askChatBot };
};

export default useAskChatBot;
