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
    return new Promise((resolve) => {
        microphone.onstart = () => {
            console.log("WebSocket connection opened");
            document.body.classList.add("recording");
            isMicrophoneActive = true; // Microphone is active when it starts
            resolve();
        };

        microphone.onstop = () => {
            console.log("WebSocket connection closed");
            document.body.classList.remove("recording");
            isMicrophoneActive = false; // Microphone is inactive when it stops
        };

        microphone.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                socket.send(event.data);
            }
        };

        microphone.start(1000);
    });
}

async function closeMicrophone(microphone) {
    microphone.stop();
}

let isMicrophoneActive = false;

async function start(socket) {
    const listenButton = document.querySelector("#record");
    let microphone;

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
                microphone = undefined;
                isMicrophoneActive = false;
            } else {
                microphone.start(1000);
                isMicrophoneActive = true;
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
                    adjustFontSize(captions.querySelector('span')); // Adjust font size based on content
                }

                if (data.response && data.response !== "") {
                    captions_ai.innerHTML = `<span>${data.response}</span>`;
                    adjustFontSize(captions_ai.querySelector('span')); // Adjust font size based on content
                }
            } else if (event.data instanceof Blob) {
                const blob = event.data;
                const audioUrl = URL.createObjectURL(blob);
                const audio = new Audio(audioUrl);
                audio.play().catch(error => {
                    console.error("Error playing audio:", error);
                });
            }
        } catch (error) {
            console.error("Error parsing WebSocket message:", error);
        }
    });

    socket.addEventListener("close", () => {
        console.log("WebSocket connection closed");
    });
});