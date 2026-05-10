const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

// State Management
let currentFile = null;
let wavesurfer = null;
let isProcessing = false;

// UI Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const dashboard = document.getElementById('dashboard');
const hero = document.getElementById('hero');
const progressBtn = document.getElementById('process-btn');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const statusText = document.getElementById('status-text');
const transcriptArea = document.getElementById('transcript-area');

// Init Wavesurfer
wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#475569',
    progressColor: '#22d3ee',
    cursorColor: '#a855f7',
    barWidth: 2,
    barRadius: 3,
    responsive: true,
    height: 100,
});

// 1. File Handling
dropZone.onclick = () => fileInput.click();

fileInput.onchange = (e) => handleFiles(e.target.files);

dropZone.ondragover = (e) => {
    e.preventDefault();
    dropZone.classList.add('scale-95', 'border-cyan-400');
};

dropZone.ondragleave = () => {
    dropZone.classList.remove('scale-95', 'border-cyan-400');
};

dropZone.ondrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
};

function handleFiles(files) {
    if (files.length === 0) return;
    currentFile = files[0];
    
    showToast("File uploaded successfully!");
    gsap.to(hero, { opacity: 0, y: -20, duration: 0.5, onComplete: () => {
        hero.classList.add('hidden');
        dashboard.classList.remove('hidden');
        wavesurfer.loadBlob(currentFile);
    }});
}

// 2. FFmpeg & AI Pipeline
async function runPipeline() {
    if (isProcessing) return;
    isProcessing = true;
    
    progressBtn.innerText = "Processing...";
    progressBtn.classList.add('opacity-50');

    try {
        if (!ffmpeg.isLoaded()) {
            statusText.innerText = "Loading AI Core...";
            await ffmpeg.load();
        }

        // STEP 1: Extract Audio
        updateStatus("Extracting high-fidelity audio...", 20);
        const { name } = currentFile;
        ffmpeg.FS('writeFile', 'input', await fetchFile(currentFile));
        await ffmpeg.run('-i', 'input', '-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k', 'output.mp3');
        const audioData = ffmpeg.FS('readFile', 'output.mp3');

        // STEP 2: Speech to Text (Web Speech API)
        updateStatus("AI Transcription in progress...", 40);
        const text = await performSTT(); 
        transcriptArea.innerText = `[Original]: ${text}`;

        // STEP 3: Translation (Mock Logic for demo)
        updateStatus("Translating to target language...", 60);
        const translatedText = await mockTranslate(text, document.getElementById('target-lang').value);
        transcriptArea.innerHTML += `<br><br><span class="text-cyan-400">[Translated]: ${translatedText}</span>`;

        // STEP 4: AI Voice Synthesis (TTS)
        updateStatus("Generating AI Voice Morph...", 80);
        const morphedAudioBlob = await generateMorphedVoice(translatedText);

        // STEP 5: Re-muxing (Merge back to Video if original was video)
        updateStatus("Finalizing export...", 95);
        // Logic to merge back using ffmpeg.run('-i', 'input', '-i', 'morphed.mp3', ...)
        
        finishProcessing(morphedAudioBlob);

    } catch (err) {
        console.error(err);
        showToast("Error during processing");
        resetUI();
    }
}

// 3. Audio Processing Helpers
function performSTT() {
    return new Promise((resolve) => {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.start();
        
        recognition.onresult = (event) => {
            resolve(event.results[0][0].transcript);
        };
        recognition.onerror = () => resolve("Sample detected speech for demonstration purposes.");
    });
}

function mockTranslate(text, lang) {
    // In a real app, you'd call a client-side model like Transformers.js
    const mocks = {
        'hi': "à¤¯à¤¹ à¤ªà¥à¤°à¤¦à¤°à¥à¤¶à¤¨ à¤•à¥‡ à¤²à¤¿à¤ à¤à¤• à¤•à¥ƒà¤¤à¥à¤°à¤¿à¤® à¤¬à¥à¤¦à¥à¤§à¤¿à¤®à¤¤à¥à¤¤à¤¾ à¤…à¤¨à¥à¤µà¤¾à¤¦ à¤¹à¥ˆà¥¤",
        'ja': "ã“ã‚Œã¯ãƒ‡ãƒ¢ãƒ³ã‚¹ãƒˆãƒ¬ãƒ¼ã‚·ãƒ§ãƒ³ç”¨ã® AI ç¿»è¨³ã§ã™ã€‚",
        'es': "Esta es una traducciÃ³n de IA para demostraciÃ³n."
    };
    return new Promise(res => setTimeout(() => res(mocks[lang] || text), 1000));
}

async function generateMorphedVoice(text) {
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        const pitch = document.getElementById('pitch-slider').value;
        const speed = document.getElementById('speed-slider').value;
        
        utterance.pitch = pitch;
        utterance.rate = speed;
        
        // Use MediaRecorder to capture the synthesis
        // Note: Standard TTS doesn't directly return a blob, in production 
        // we use Web Audio API capture or a specialized WASM library.
        speechSynthesis.speak(utterance);
        
        utterance.onend = () => {
            // Returning original file for demo download logic
            resolve(currentFile); 
        };
    });
}

// 4. Utility Functions
function updateStatus(msg, percent) {
    statusText.innerText = msg;
    progressPercent.innerText = `${percent}%`;
    progressBar.style.width = `${percent}%`;
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function finishProcessing(blob) {
    isProcessing = false;
    updateStatus("Processing Complete!", 100);
    progressBtn.innerText = "Process Again";
    progressBtn.classList.remove('opacity-50');
    
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.disabled = false;
    downloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    downloadBtn.classList.add('bg-cyan-500', 'text-white');
    
    downloadBtn.onclick = () => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voicemorph_${Date.now()}.mp4`;
        a.click();
    };
}

progressBtn.onclick = runPipeline;

// Slider UI Updates
document.getElementById('pitch-slider').oninput = (e) => {
    document.getElementById('pitch-val').innerText = e.target.value;
};
document.getElementById('speed-slider').oninput = (e) => {
    document.getElementById('speed-val').innerText = e.target.value;
};