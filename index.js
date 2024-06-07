const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");
dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let keepAlive;
let transcript;
let language = "ru";
let teaching_language = "russian";

let isProcessing = false;
const requestQueue = [];
const audioQueue = [];
let isPlayingAudio = false;

const setupDeepgram = (ws) => {
    const deepgram = deepgramClient.listen.live({
        language: language,
        punctuate: true,
        smart_format: true,
        model: "nova-2",
    });

    if (keepAlive) clearInterval(keepAlive);
    keepAlive = setInterval(() => {
        deepgram.keepAlive();
    }, 10 * 1000);

    deepgram.addListener(LiveTranscriptionEvents.Open, async () => {
        deepgram.addListener(LiveTranscriptionEvents.Transcript, async (data) => {
            ws.send(JSON.stringify(data));
            transcript = data.channel.alternatives[0].transcript;

            if (transcript === "") {
                // TODO Turn off mic on client
            } else {
                if (data.is_final === true && data.speech_final === true) {
                    requestQueue.push(transcript);
                    processQueue(ws);
                }
            }
        });

        deepgram.addListener(LiveTranscriptionEvents.Close, async () => {
            clearInterval(keepAlive);
            deepgram.finish();
        });

        deepgram.addListener(LiveTranscriptionEvents.Error, async (error) => {
            console.log("deepgram: error received");
            console.error(error);
        });

        deepgram.addListener(LiveTranscriptionEvents.Warning, async (warning) => {
            console.warn(warning);
        });

        deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
            console.log(data);
            ws.send(JSON.stringify({ metadata: data }));
        });
    });

    return deepgram;
};

const processQueue = async (ws) => {
    if (isProcessing || requestQueue.length === 0 || isPlayingAudio) {
        return;
    }

    isProcessing = true;
    const transcript = requestQueue.shift();
    await aiPrompt(transcript, ws);
    isProcessing = false;

    if (requestQueue.length > 0) {
        processQueue(ws);
    }
};

const processAudioQueue = (ws) => {
    if (isPlayingAudio || audioQueue.length === 0) {
        return;
    }

    isPlayingAudio = true;
    const audioBuffer = audioQueue.shift();

    ws.send(audioBuffer, { binary: true }, () => {
        isPlayingAudio = false;
        processAudioQueue(ws);
        processQueue(ws); // Resume processing AI prompts after audio finishes
    });
};

wss.on("connection", (ws) => {
    console.log("socket: client connected");
    let deepgram = setupDeepgram(ws);

    ws.on("message", (message) => {
        if (deepgram.getReadyState() === 1) {
            deepgram.send(message);
        } else if (deepgram.getReadyState() >= 2) {
            deepgram.finish();
            deepgram.removeAllListeners();
            deepgram = setupDeepgram(ws);
        }
    });

    ws.on("close", () => {
        deepgram.finish();
        deepgram.removeAllListeners();
        deepgram = null;
    });
});

async function aiPrompt(prompt, ws) {
    try {
        console.log("Sending prompt to generative AI:", prompt);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt + "You are Language Learning Assistant. You are here to help the user learn and practice the chosen language: " + language + ", remember don't use emojis and another type texts because you are tts.");
        const response = await result.response;
        const text = await response.text();

        console.log("AI Response:", text);

        ws.send(JSON.stringify({ response: text }));

        if (language && language.toLowerCase() === 'en') {
            await getAudioDeepgram(text, ws);
        } else {
            await getAudioGoogleTTS(text, ws);
        }
    } catch (error) {
        console.error("Error calling Generative AI API:", error);
    }
}

async function getAudioGoogleTTS(text, ws) {
    try {
        console.log("Requesting TTS for text:", text);

        const apiKey = process.env.GEMINI_API_KEY;
        const googleTTSUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

        const requestBody = JSON.stringify({
            input: {
                text: text
            },
            voice: {
                languageCode: language,
                ssmlGender: 'FEMALE',
            },
            audioConfig: {
                audioEncoding: 'linear16'
            }
        });

        const response = await fetch(googleTTSUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: requestBody
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();
        const audioContent = responseData.audioContent;

        if (audioContent) {
            console.log("Audio data received from Google TTS");
            const audioBuffer = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));
            audioQueue.push(audioBuffer);
            processAudioQueue(ws);
        } else {
            console.error("Error generating audio: No data received");
        }
    } catch (error) {
        console.error("TTS error:", error);
    }
}

async function getAudioDeepgram(text, ws) {
    try {
        console.log("Requesting TTS for text:", text);
        const response = await deepgramClient.speak.request(
            { text },
            {
                model: "aura-asteria-en",
                encoding: "linear16",
                container: "wav",
            }
        );

        const audioResponse = response.result;
        const audioData = await audioResponse.arrayBuffer();

        if (audioData) {
            console.log("Audio data received from Deepgram");
            audioQueue.push(audioData);
            processAudioQueue(ws);
        } else {
            console.error("Error generating audio: No data received");
        }
    } catch (error) {
        console.error("TTS error:", error);
    }
}

app.use(express.static("public/"));
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

server.listen(3000, () => {
    console.log("Server is listening on port 3000");
});
