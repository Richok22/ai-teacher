const captions = window.document.getElementById("captions");
const captions_ai = window.document.getElementById("ai_captions");

async function getMicrophone() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return new MediaRecorder(stream);
    } catch (error) {
        console.error("Error accessing microphone:", error);
        throw error;
    }
}

async function openMicrophone(microphone, socket) {
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
}

async function closeMicrophone(microphone) {
    if (microphone && microphone.state !== 'inactive') {
        microphone.stop();
    }
}

let isMicrophoneActive = false;
let audioQueue = [];
let isPlayingAudio = false;
let microphone;

async function start(socket) {
    const listenButton = document.querySelector("#record");

    console.log("client: waiting to open microphone");

    listenButton.addEventListener("click", async () => {
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
    });
}

function adjustFontSize(element) {
    const parent = element.parentElement;
    let fontSize = parseFloat(window.getComputedStyle(element, null).getPropertyValue('font-size'));
    const lineHeight = parseFloat(window.getComputedStyle(element, null).getPropertyValue('line-height'));
    const maxHeight = parent.clientHeight * 0.8;
    const maxWidth = parent.clientWidth * 0.95;

    element.style.fontSize = fontSize + 'px';
    while (element.scrollHeight > maxHeight || element.scrollWidth > maxWidth) {
        fontSize -= 1;
        element.style.fontSize = fontSize + 'px';
        element.style.lineHeight = lineHeight + 'px';
    }
}

async function playAudioQueue(socket) {
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
}

window.addEventListener("load", () => {
    const socket = new WebSocket("ws://localhost:3000");

    socket.addEventListener("open", async () => {
        console.log("WebSocket connection opened");
        await start(socket);
    });

    socket.addEventListener("message", async (event) => {
        try {
            if (typeof event.data === 'string') {
                const data = JSON.parse(event.data);

                if (data.channel && data.channel.alternatives && data.channel.alternatives[0].transcript) {
                    captions.innerHTML = `<span>${data.channel.alternatives[0].transcript}</span>`;
                    adjustFontSize(captions.querySelector('span'));
                }

                if (data.response && data.response !== "") {
                    captions_ai.innerHTML = `<span>${data.response}</span>`;
                    adjustFontSize(captions_ai.querySelector('span'));
                }
            } else if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
                const audioBlob = new Blob([event.data], { type: 'audio/mp3' }); // Use appropriate mime type
                const audioUrl = URL.createObjectURL(audioBlob);

                audioQueue.push(audioUrl); // Add audio URL to the queue
                playAudioQueue(socket); // Play the audio queue
            }

        } catch (error) {
            console.error("Error parsing WebSocket message:", error);
        }
    });
});
