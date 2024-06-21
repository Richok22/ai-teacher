<template>
  <h2>Chat</h2>
  <div class="chat-container">
    <div class="bot">
      <div class="ai"></div>
    </div>
    <div class="chat-box">
      <div class="title">
        <p>Chat</p>
      </div>
      <div class="chat-messages">
        <Message v-for="(msg, index) in messagesStore.messages" :key="index" :message="msg" />
      </div>
      <div class="send_message">
        <input
            type="text"
            v-model="newMessage"
            @keyup.enter="sendMessage"
            placeholder="Type a message"
        >
      </div>
    </div>
    <Microphone @transcription="sendMessage" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useMessagesStore } from '/src/stores/messagesStore.js';
import Message from "../components/chat/message.vue";
import Microphone from "../components/chat/microphone.vue";

const messagesStore = useMessagesStore();
const newMessage = ref('');

const sendMessage = async () => {
  if (newMessage.value.trim()) {
    messagesStore.addUserMessage(newMessage.value);

    // Simulate an AI response
    setTimeout(() => {
      messagesStore.setLoadingMessage();

      setTimeout(() => {
        const aiResponse = `AI Response to: ${newMessage.value}`;
        messagesStore.updateLoadingMessage(aiResponse);
      }, 2000);
    }, 500);

    newMessage.value = '';
  }
};
</script>

<style scoped>
.chat-container {
  display: grid;
  gap: 2.5rem;
  grid-template-columns: repeat(2, 1fr);
  padding-block: 2rem;
  max-width: min(95%, 70rem);
  margin-inline: auto;
}

.ai {
  height: 26.6rem;
  width: 26.6rem;
  background-color: #bbb;
  border-radius: 50%;
}

.chat-box {
  border-radius: .75rem;
  background-color: #101110;
}

.title {
  border-radius: .75rem .75rem 0 0;
  padding: 1rem;
  justify-content: center;
  align-content: center;
  background-color: #414041;
  width: 100%;
}

.chat-messages {
  border-radius: .75rem;
  overflow: auto;
  max-height: 26.6rem;
  background-color: #101110;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.send_message {
  border-radius: 0 0 .75rem .75rem;
  width: 100%;
  padding: 1rem;
  background-color: #414041;
}

@media only screen and (max-width: 768px) {
  .chat-container {
    grid-template-columns: repeat(1, 1fr);
    margin-inline: unset;
  }
}
</style>
