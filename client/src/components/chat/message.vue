<script setup>
defineProps({
  message: {
    type: Object,
    required: true,
  }
});
</script>

<template>
  <div v-if="message.isLoading" class="message">
    <span class="loading__dot"></span>
    <span class="loading__dot"></span>
    <span class="loading__dot"></span>
  </div>
  <div v-if="message.isLoading && message.isAnswer" class="answer">
    <span class="loading__dot"></span>
    <span class="loading__dot"></span>
    <span class="loading__dot"></span>
  </div>

  <div v-else-if="message.isAnswer" class="answer">
    <p>{{ message.content }}</p>
  </div>
  <div v-else class="message">
    <p>{{ message.content }}</p>
  </div>
</template>
<style scoped>
.message, .answer {
  animation: showup 1s;
  margin: 0.85rem;
  max-width: 50%;
  min-width: 2rem;
  border-radius: .5rem;
  align-self: flex-end;
}

@keyframes showup {
  from {
    opacity: 0;
    transform: translateY(-15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message {
  background-color: #017df8;
  color: #fff;
}

.answer {
  background-color: #414041;
  color: #fff;
  align-self: flex-start;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.loading__dot {
  animation: dot ease-in-out 2.5s infinite;
  background-color: #ffffff;
  border-radius: 50%;
  display: inline-block;
  height: 10px;
  margin: 5px;
  width: 10px;
}

.loading__dot:nth-of-type(2) {
  animation-delay: 0.2s;
}

.loading__dot:nth-of-type(3) {
  animation-delay: 0.3s;
}

@keyframes dot {
  0% {
    background-color: #ffffff;
    transform: scale(1);
  }
  50% {
    background-color: #EFEFEF;
    transform: scale(1.3);
  }
  100% {
    background-color: #ffffff;
    transform: scale(1);
  }
}

@keyframes dot-flashing {
  0% {
    background-color: #9880ff;
  }
  50%, 100% {
    background-color: rgba(152, 128, 255, 0.2);
  }
}

p {
  margin: 0 10px;
  font-size: 16px;
  font-weight: 500;
}
</style>
