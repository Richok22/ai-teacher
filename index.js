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
let language = "en"

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
        deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
            ws.send(JSON.stringify(data));
            transcript = data.channel.alternatives[0].transcript;
            console.log(data)

            if (transcript === "") {

            } else {
                if (data.is_final === true & data.speech_final === true) {
                    aiPrompt(transcript, ws);
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
        const result = await model.generateContent(prompt + " Answer needs to be in that language:" + language);
        const response = await result.response;
        const text = await response.text();

        console.log("AI Response:", text);

        ws.send(JSON.stringify({ response: text }));



        // Check if language is Latvian
        if (language && language.toLowerCase() === 'lv') {
            // Use Narakeet TTS for Latvian language
            await getAudioNarakeet(text, ws);
        } else {
            // Use Deepgram TTS for other languages
            await getAudioDeepgram(text, ws);
        }
    } catch (error) {
        console.error("Error calling Generative AI API:", error);
    }
}

async function getAudioNarakeet(text, ws) {
    try {
        console.log("Requesting TTS for text:", text);

        // Make HTTP request to Play.ht TTS API
        // Replace 'YOUR_API_KEY' with your Play.ht API key
        const apiKey = 'd61c6db767624ba392eb741ae66d1ba3';
        const playhtUrl = 'https://api.play.ht/text-to-speech/streaming';

        const formData = new FormData();
        formData.append('text', encodeURIComponent(text)); // Ensure proper encoding
        formData.append('voice', 'female');
        formData.append('apikey', apiKey);

        const response = await fetch(playhtUrl, {
            method: 'POST',
            body: formData,
            headers: formData // Pass formData directly as headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        response.body.pipe(ws, { end: true }); // Pipe the audio stream to the WebSocket connection

        console.log("Audio stream sent to client");
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
            ws.send(audioData, { binary: true }); // Send the buffer over WebSocket with binary flag
            console.log("Audio data sent to client");
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