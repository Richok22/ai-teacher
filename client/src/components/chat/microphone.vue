<template>
  <div>
    <div class="object" id="record" @click="recording ? stopRecording() : startRecording()"
         :class="{ recording: recording }">
      <div class="outline"></div>
      <div class="outline" id="delayed"></div>
      <div class="button"></div>
      <div class="button" id="circlein">
        <svg
            class="mic-icon"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            x="0px"
            y="0px"
            viewBox="0 0 1000 1000"
            enable-background="new 0 0 1000 1000"
            xml:space="preserve"
            style="fill: #000000"
        >
              <g>
                <path
                    d="M500,683.8c84.6,0,153.1-68.6,153.1-153.1V163.1C653.1,78.6,584.6,10,500,10c-84.6,0-153.1,68.6-153.1,153.1v367.5C346.9,615.2,415.4,683.8,500,683.8z M714.4,438.8v91.9C714.4,649,618.4,745,500,745c-118.4,0-214.4-96-214.4-214.4v-91.9h-61.3v91.9c0,141.9,107.2,258.7,245,273.9v124.2H346.9V990h306.3v-61.3H530.6V804.5c137.8-15.2,245-132.1,245-273.9v-91.9H714.4z"
                />
              </g>
            </svg>
      </div>
    </div>
    <div id="captions"></div>
    <div id="ai_captions"></div>
  </div>
</template>

<script setup>
import {ref} from 'vue';
import {useMessagesStore} from '/src/stores/messagesStore.js';

const recording = ref(false);
let microphone;
let isMicrophoneActive = false;
let audioQueue = [];
let isPlayingAudio = false;
const captions = ref(null);
const captionsAI = ref(null);

const messagesStore = useMessagesStore();

const getMicrophone = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
    return new MediaRecorder(stream);
  } catch (error) {
    console.error("Error accessing microphone:", error);
    throw error;
  }
};

const openMicrophone = async (microphone, socket) => {
  return new Promise((resolve, reject) => {
    microphone.onstart = () => {
      console.log("Microphone started");
      document.body.classList.add("recording");
      isMicrophoneActive = true;
      resolve();
    };

    microphone.onstop = () => {
      console.log("Microphone stopped");
      document.body.classList.remove("recording");
      isMicrophoneActive = false;
    };

    microphone.ondataavailable = async (event) => {
      if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    };

    try {
      microphone.start(1000); // Collect data in chunks of 1000ms (1 second)
    } catch (error) {
      reject(error);
    }
  });
};

const closeMicrophone = async (microphone) => {
  if (microphone && microphone.state !== 'inactive') {
    microphone.stop();
  }
};

const startRecording = async () => {
  recording.value = true;
  const socket = new WebSocket("ws://localhost:3000");

  socket.addEventListener("open", async () => {
    console.log("WebSocket connection opened");
    await start(socket);
  });

  socket.addEventListener("message", async (event) => {
    try {
      if (typeof event.data === "string") {
        const data = JSON.parse(event.data);

        console.log(data)
        if (data.channel && data.channel.alternatives && data.channel.alternatives[0].transcript) {
          messagesStore.addUserMessage(data.channel.alternatives[0].transcript)
        }

        if (data.response && data.response !== "") {
          messagesStore.addAiMessage(data.response);
        }

      } else if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {

        const audioBlob = new Blob([event.data], {type: "audio/mp3"}); // Use appropriate mime type
        const audioUrl = URL.createObjectURL(audioBlob);
        setTimeout(() => {
          audioQueue.push(audioUrl); // Add audio URL to the queue
          playAudioQueue(socket); // Play the audio queue
        }, 1000)
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  });

  socket.addEventListener("close", () => {
    console.log("WebSocket connection closed");
  });

  socket.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });
};

const stopRecording = () => {
  recording.value = false;
  closeMicrophone(microphone);
};

const playAudioQueue = async (socket) => {
  if (isPlayingAudio || audioQueue.length === 0) {
    return;
  }

  isPlayingAudio = true;

  // Turn off the microphone before playing audio
  if (isMicrophoneActive) {
    await closeMicrophone(microphone);
  }

  const audioUrl = audioQueue.shift();
  const audio = new Audio(audioUrl);

  audio.onended = async () => {
    isPlayingAudio = false;

    // Turn the microphone back on after the audio has finished playing
    if (!isMicrophoneActive && microphone) {
      await openMicrophone(microphone, socket);
    }

    await playAudioQueue(socket); // Play next audio in queue
  };

  audio.play().catch(error => {
    console.error("Error playing audio:", error);
    isPlayingAudio = false;
    playAudioQueue(socket); // Continue with next audio in case of error
  });
};

const start = async (socket) => {
  console.log("client: waiting to open microphone");

  if (!microphone) {
    try {
      microphone = await getMicrophone();
      await openMicrophone(microphone, socket);
    } catch (error) {
      console.error("Error opening microphone:", error);
    }
  } else {
    if (isMicrophoneActive) {
      await closeMicrophone(microphone);
    } else {
      await openMicrophone(microphone, socket);
    }
  }
};
</script>


<style scoped>

.object {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Your existing styles */
.outline {
  display: none;
}

.recording .outline {
  display: block;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 8px solid #b5a4a4;
  animation: pulse 3s ease-out infinite;
  position: absolute;
}

.button {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #50cddd;
  box-shadow: 0px 0px 80px #0084f9;
}

.recording .button {
  background: #dd5050;
  box-shadow: 0px 0px 80px #f90000;
}

@keyframes pulse {
  0% {
    transform: scale(0);
    opacity: 0;
    border: 65px solid #000000;
  }
  50% {
    border: solid #ffffff;
    opacity: 0.8;
  }
  90% {
    transform: scale(3.2);
    opacity: 0.2;
    border: 3px solid #000000;
  }
  100% {
    transform: scale(3.3);
    opacity: 0;
    border: 1px solid #ffffff;
  }
}

#delayed {
  animation-delay: 1.5s;
}

#circlein {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #6bd6e1;
  box-shadow: 0px -2px 15px #e0ff94;
  position: absolute;
}

.recording #circlein {
  background: #e16b6b;
  box-shadow: 0px -2px 15px #e0ff94;
}

.mic-icon {
  height: 60px;
  position: absolute;
  margin: 21px;
}


img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}


</style>