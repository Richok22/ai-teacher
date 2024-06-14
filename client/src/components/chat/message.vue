<script setup>
const props = defineProps({
  message: {
    type: Object,
    required: true,
    default: () => {
    },
  },
});
</script>

<template>
  <div class="message">
    <p>This is message </p>
  </div>
  <div class="answer">
    <p>This is answer</p>
  </div>
</template>

<style scoped>
.message, .answer {
  margin-top: 9px;
  min-height: 40px;
  min-width: 90px;
  display: flex;
  align-items: center;
  border-radius: .5rem;
}

.message {
  justify-content: left;
  margin-left: 5px;
  background-color: #017df8;
  color: #fff;
}

.answer{
  justify-content: right;
  margin-right: 5px;
  background-color: #414041;
  color: #fff;
}

p {
  margin-left: 10px;
  font-size: 16px;
  font-weight: 500;
}

.answer p {
  margin-right: 10px;
  font-size: 16px;
  font-weight: 500;
}

</style>