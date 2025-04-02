const micButton = document.querySelector('.btn-mic');
const sendButton = document.querySelector('.btn-send');
const stopButton = document.querySelector('.btn-stop');
const speakerButton = document.querySelector('.btn-speaker');
const userInput = document.getElementById('userInput');
const messagesContainer = document.getElementById('messages');
const chatContainer = document.querySelector('.chat-container');
const recordingDisabledMessage = document.createElement('div');
recordingDisabledMessage.id = 'recording-disabled-message';
recordingDisabledMessage.textContent = 'Recording is disabled during message generation.';
document.body.appendChild(recordingDisabledMessage);

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let isGenerating = false;
let transcriptionTimeout;
let stream;
let speechQueue = [];

// Function to start recording
async function startRecording() {
    if (!stream) {
        try {
            console.log('Requesting microphone access...');
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Microphone access granted.');

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                try {
                    console.log('Processing recorded audio...');
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    console.log('Recorded Audio Blob:', audioBlob);

                    const arrayBuffer = await audioBlob.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                    const resampledBuffer = await resampleAudioBuffer(audioBuffer, 16000);
                    const wavBlob = encodeWAV(resampledBuffer, 16000);
                    console.log('WAV Audio Blob:', wavBlob);

                    const file = new File([wavBlob], 'recording.wav', { type: 'audio/wav' });
                    console.log('File:', file);

                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('temperature', '0.0');
                    formData.append('temperature_inc', '0.2');
                    formData.append('response_format', 'verbose_json');

                    for (const pair of formData.entries()) {
                        console.log(`${pair[0]}: ${pair[1]}`);
                    }

                    const response = await fetch('https://apistt.urassignment.shop/inference', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        console.error('Network response was not ok', response.statusText);
                        return;
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();

                    let transcriptionText = "";

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const text = decoder.decode(value, { stream: true });
                        console.log('Server response:', text); // Log the server response for debugging
                        const json = JSON.parse(text);
                        transcriptionText += appendTranscription(json);
                    }

                    console.log('Transcription text:', transcriptionText); // Log the transcription text for debugging
                    if (transcriptionText.trim()) {
                        sendMessage(transcriptionText); // Automatically send the message after transcription
                    } else {
                        console.warn('Transcription was empty.');
                    }
                    audioChunks = []; // Clear the audio chunks after processing
                } catch (error) {
                    console.error('Error processing audio:', error);
                }
            };
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Error accessing microphone: ' + error.message);
            return;
        }
    }

    if (mediaRecorder && mediaRecorder.state === 'inactive') {
        try {
            audioChunks = [];
            mediaRecorder.start();
            isRecording = true;
            micButton.classList.add('recording'); // Add a class to indicate recording state
            chatContainer.classList.add('recording'); // Change background color to indicate recording
            showRecordingWarning();
            statusUpdate('Recording...');
        } catch (error) {
            console.error('Error starting the recording:', error);
            alert('Error starting the recording: ' + error.message);
        }
    }
}

// Function to stop recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        try {
            mediaRecorder.stop();
            isRecording = false;
            micButton.classList.remove('recording'); // Remove the recording state class
            chatContainer.classList.remove('recording'); // Revert background color
            hideRecordingWarning();
            statusUpdate('Processing...');
        } catch (error) {
            console.error('Error stopping the recording:', error);
            alert('Error stopping the recording: ' + error.message);
        }
    }
}

micButton.addEventListener('click', () => {
    if (isGenerating) {
        showRecordingDisabledMessage();
    } else if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !isRecording && event.target !== userInput) {
        event.preventDefault();
        if (isGenerating) {
            showRecordingDisabledMessage();
        } else {
            startRecording();
        }
    }
});

document.addEventListener('keyup', (event) => {
    if (event.code === 'Space' && isRecording && event.target !== userInput) {
        event.preventDefault();
        stopRecording();
    }
});

sendButton.addEventListener('click', () => {
    const userText = userInput.value.trim();
    if (userText) {
        sendMessage(userText);
        userInput.value = '';
    }
});

speakerButton.addEventListener('click', toggleTTS); // Add event listener for speaker button

function appendTranscription(data) {
    let transcriptionText = '';
    if (data.segments) {
        data.segments.forEach(segment => {
            transcriptionText += segment.text + ' ';
        });
    }
    return transcriptionText.trim();
}

async function resampleAudioBuffer(audioBuffer, targetSampleRate) {
    const audioContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
        audioBuffer.numberOfChannels,
        audioBuffer.duration * targetSampleRate,
        targetSampleRate
    );

    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(audioContext.destination);
    bufferSource.start(0);

    const renderedBuffer = await audioContext.startRendering();
    return renderedBuffer;
}

function encodeWAV(audioBuffer, sampleRate) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + audioBuffer.length * numberOfChannels * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, audioBuffer.length * numberOfChannels * 2, true);

    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function sendMessage(userText) {
    if (!userText) {
        alert("Please enter a message.");
        return;
    }

    sendButton.disabled = true;
    isGenerating = true;
    disableRecording();

    addMessage(userText, 'user-message');

    ensureSingleEventSource();
    const eventSource = new EventSource(`/generate-text?prompt=${encodeURIComponent(userText)}`);
    let botMessageContent = ""; 

    eventSource.onmessage = function(event) {
        const messages = event.data.split('\n').filter(line => line.startsWith('data:'));
        
        messages.forEach(message => {
            const jsonData = JSON.parse(message.slice(5));
            if (jsonData && jsonData.choices && jsonData.choices.length > 0) {
                jsonData.choices.forEach(choice => {
                    if (choice.delta && choice.delta.content) {
                        botMessageContent += choice.delta.content; 
                        handleTTS(choice.delta.content); // Handle TTS for the streamed text
                    }
                });
            }
        });

        updateBotMessage(botMessageContent); 
    };

    eventSource.onend = function() {
        if (botMessageContent) {
            updateBotMessage(botMessageContent, true); 
        }
        sendButton.disabled = false; // Re-enable the send button
        isGenerating = false;
        enableRecording();
    };

    eventSource.onerror = function(error) {
        console.error('Stream error:', error);
        eventSource.close(); // Close stream on error
        sendButton.disabled = false; // Re-enable the send button
        isGenerating = false;
        enableRecording();
    };

    window.currentEventSource = eventSource; // Track the current event source
}

function stopGeneration() {
    if (window.currentEventSource) {
        window.currentEventSource.close(); // Close the EventSource
        window.currentEventSource = null;

        sendButton.disabled = false;
        isGenerating = false;
        enableRecording();
    }
}

function addMessage(text, senderClass) {
    const messageElement = document.createElement('div');
    messageElement.textContent = text;
    messageElement.className = `${senderClass} message`;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function ensureSingleEventSource() {
    if (window.currentEventSource) {
        window.currentEventSource.close();
        window.currentEventSource = null;
    }
}

document.addEventListener("DOMContentLoaded", function() {
    stopButton.addEventListener("click", stopGeneration);

    userInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            const userText = userInput.value.trim();
            if (userText) {
                sendMessage(userText);
                userInput.value = '';
            }
        }
    });
});

function updateBotMessage(text, finalize = false) {
    let botMessageElement = document.querySelector('.bot-message:last-child');
    if (!botMessageElement || finalize) {
        botMessageElement = document.createElement('div');
        botMessageElement.className = 'bot-message message';
        messagesContainer.appendChild(botMessageElement);
    }
    botMessageElement.innerHTML = marked.parse(text);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function disableRecording() {
    micButton.classList.add('disabled');
}

function enableRecording() {
    micButton.classList.remove('disabled');
}

function showRecordingDisabledMessage() {
    recordingDisabledMessage.style.display = 'block';
    setTimeout(() => {
        recordingDisabledMessage.style.display = 'none';
    }, 3000);
}

function statusUpdate(message) {
    console.log(message);
}

function showRecordingWarning() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('Microphone access granted.');
    }
}

function hideRecordingWarning() {
    console.log('Microphone access revoked.');
}

function scheduleTranscriptionProcessing() {
    if (transcriptionTimeout) {
        clearTimeout(transcriptionTimeout);
    }
    transcriptionTimeout = setTimeout(() => {
        if (audioChunks.length > 0 && !isRecording) {
            mediaRecorder.stop();
        }
    }, 2000); // Adjust the timeout duration as needed
}

// Function to handle TTS for streamed text
async function handleTTS(text) {
    if (text.trim() === "") return;

    const payload = {
        text: text,
        speaker_id: "p250",
        style_wav: "",
        language_id: ""
    };

    console.log('TTS Payload:', JSON.stringify(payload)); // Log the payload for debugging

    const response = await fetch('https://apitts.urassignment.shop/api/tts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        console.error('TTS API error:', response.statusText);
        return;
    }

    const audioBlob = await response.blob();
    speechQueue.push(audioBlob);
    if (speechQueue.length === 1) {
        playNextSpeech();
    }
}

// Function to play the next speech in the queue
function playNextSpeech() {
    if (speechQueue.length === 0) return;

    const audioBlob = speechQueue.shift();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = function() {
        playNextSpeech(); // Play the next speech in the queue when the current one ends
    };

    audio.play();
}

// Function to toggle TTS
function toggleTTS() {
    const isTTSOn = speakerButton.classList.toggle('tts-on');
    if (isTTSOn) {
        console.log("TTS enabled");
    } else {
        console.log("TTS disabled");
        speechQueue = []; // Clear the queue if TTS is turned off
    }
}
