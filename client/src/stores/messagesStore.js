import { defineStore } from 'pinia';

export const useMessagesStore = defineStore('messageStore', {
    state: () => ({
        messages: []
    }),
    actions: {
        addUserMessage(content) {
            this.messages.push({
                content: content,
                isAnswer: false,
                isLoading: false,
            });
        },
        addAiMessage(content) {
            this.setLoadingMessage();

            setTimeout(() => {
                this.updateLoadingMessage(content);
            }, 1000);  // 10 seconds delay
        },
        setLoadingMessage() {
            this.messages.push({
                content: '',
                isAnswer: true,
                isLoading: true,
            });
        },
        updateLoadingMessage(content) {
            const loadingMessage = this.messages.find(msg => msg.isLoading);
            if (loadingMessage) {
                loadingMessage.content = content;
                loadingMessage.isLoading = false;
            }
        }
    }
});
