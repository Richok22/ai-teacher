<script setup>

import Message from "../components/chat/message.vue";
import Microphone from "../components/chat/microphone.vue";

</script>

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
        <message>

        </message>
        <message>

        </message>
        <message>

        </message>
        <message>

        </message>
        <message>

        </message>

      </div>
      <div class="send_message">
        <input type="text">
      </div>
    </div>
    <microphone>

    </microphone>
  </div>
</template>

<style scoped>

.chat-container {
  display: grid;
  gap: 2.5rem;
  grid-template-columns: repeat(2, 1fr);

  padding-block: 2rem ;
  max-width: min(95%, 70rem);
  margin-inline: auto ;
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
  display: flex;
  overflow: auto;
  flex-direction: column;
  max-height: 26.6rem;
  background-color: #101110;
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