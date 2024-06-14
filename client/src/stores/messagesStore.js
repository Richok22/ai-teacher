import { defineStore } from 'pinia';

export const useChooseMenuStores = defineStore('messageStore', {
    state: () => {
        return {
            message: [
                {
                    content: 'This is Message',
                    isAnswer : true
                },
            ],
        }
    },
})