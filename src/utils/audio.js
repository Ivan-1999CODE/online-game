// Audio and Speech Management

let availableVoices = [];
let pronunciationAudio = null;
const TTS_VOICE_KEY_PREFIX = 'englishQuestTtsVoice';
const loadVoices = () => {
    if (!window.speechSynthesis) return;
    availableVoices = window.speechSynthesis.getVoices();
};
loadVoices();
if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;

export const getTtsPilotVoice = (scopeKey = 'default') => {
    if (typeof window === 'undefined') return 'cedar';
    try {
        return window.localStorage.getItem(`${TTS_VOICE_KEY_PREFIX}:${scopeKey}`) === 'marin'
            ? 'marin'
            : 'cedar';
    } catch {
        return 'cedar';
    }
};

export const setTtsPilotVoice = (voice, scopeKey = 'default') => {
    const safeVoice = voice === 'cedar' ? 'cedar' : 'marin';
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(`${TTS_VOICE_KEY_PREFIX}:${scopeKey}`, safeVoice);
        } catch {
            // Browsers may block storage in strict privacy mode; the current
            // selection still works for this screen through React state.
        }
    }
    return safeVoice;
};

const speakWithDeviceTts = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    let selectedVoice = availableVoices.find(v => (v.lang === 'en-US' || v.lang === 'en_US') && !v.name.includes("Network"));
    if (!selectedVoice) selectedVoice = availableVoices.find(v => v.lang.includes('en'));
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
};

export const speakText = (text, audioSources = null, scopeKey = 'default', voiceOverride = null) => {
    if (!text) return;

    const selectedVoice = voiceOverride === 'marin' || voiceOverride === 'cedar'
        ? voiceOverride
        : getTtsPilotVoice(scopeKey);
    const audioSource = typeof audioSources === 'string'
        ? audioSources
        : audioSources?.[selectedVoice];

    if (!audioSource) {
        speakWithDeviceTts(text);
        return;
    }

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (pronunciationAudio) {
        pronunciationAudio.pause();
        pronunciationAudio.currentTime = 0;
    }

    const audio = new Audio(audioSource);
    pronunciationAudio = audio;
    let hasFallenBack = false;
    const fallback = () => {
        if (hasFallenBack || pronunciationAudio !== audio) return;
        hasFallenBack = true;
        speakWithDeviceTts(text);
    };
    audio.addEventListener('error', fallback, { once: true });
    audio.play().catch(fallback);
};

// --- BGM Logic ---
let bgmAudio = new Audio(); // Create singleton instance
bgmAudio.loop = true;
let currentTrackType = null; // 'lobby' | 'challenge' | null
let isMuted = false;
let currentVolume = 0.5; // Default volume
let bgmAudioContext = null;
let bgmSourceNode = null;
let bgmGainNode = null;

const ensureBgmAudioGraph = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;

    try {
        if (!bgmAudioContext) bgmAudioContext = new AudioContext();
        if (!bgmGainNode) {
            bgmGainNode = bgmAudioContext.createGain();
            bgmGainNode.gain.value = currentVolume;
            bgmGainNode.connect(bgmAudioContext.destination);
        }
        if (!bgmSourceNode) {
            bgmSourceNode = bgmAudioContext.createMediaElementSource(bgmAudio);
            bgmSourceNode.connect(bgmGainNode);
        }
        return true;
    } catch (error) {
        console.log("BGM Web Audio setup failed; using media element volume fallback:", error);
        return false;
    }
};

const resumeBgmAudioContext = () => {
    if (
        !ensureBgmAudioGraph()
        || bgmAudioContext.state === 'running'
        || bgmAudioContext.state === 'closed'
    ) return;
    bgmAudioContext.resume().catch(error => {
        console.log("BGM audio context resume failed:", error);
    });
};

export const unlockAudio = () => {
    // Mobile browsers require a user gesture to "unlock" the AudioContext/Element
    resumeBgmAudioContext();
    if (bgmAudio) {
        bgmAudio.play().then(() => {
            bgmAudio.pause();
            bgmAudio.currentTime = 0;
        }).catch(e => {
            console.log("Audio unlock failed (likely already unlocked or policy restricted):", e);
        });
    }
};

export const playMusic = (type) => {
    if (isMuted) return;
    if (currentTrackType === type && !bgmAudio.paused) return; // Already playing same track

    currentTrackType = type;
    const path = type === 'challenge' ? '/audio/BATTLE.MP3' : '/audio/HOME.MP3';

    // Update source only if different (or if we want to ensure restart)
    // For simplicity, we just set src and play. 
    // Note: In some browsers, setting src causes reload.
    const currentSrc = bgmAudio.src;
    // Check if src actually changed to avoid reloading if not needed, 
    // though 'type' check above usually handles logic.
    // However, if we stopped music, src might still be same but we need to play.

    if (!bgmAudio.src.includes(path)) {
        bgmAudio.src = path;
    }

    const usesWebAudioVolume = ensureBgmAudioGraph();
    if (usesWebAudioVolume) {
        bgmAudio.volume = 1;
        bgmGainNode.gain.value = currentVolume;
        resumeBgmAudioContext();
    } else {
        bgmAudio.volume = currentVolume;
    }

    const playPromise = bgmAudio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("Audio autoplay prevented. User interaction needed.", error);
        });
    }
};

export const stopMusic = () => {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    currentTrackType = null;
};

export const setMute = (mute) => {
    isMuted = mute;
    if (isMuted) {
        bgmAudio.pause();
    } else {
        if (currentTrackType) {
            resumeBgmAudioContext();
            // Attempt to resume
            bgmAudio.play().catch(e => console.log("Resume failed:", e));
        }
    }
};

export const setVolume = (value) => {
    currentVolume = Math.max(0, Math.min(1, value));
    if (ensureBgmAudioGraph()) {
        bgmAudio.volume = 1;
        bgmGainNode.gain.value = currentVolume;
        resumeBgmAudioContext();
        if (!isMuted && currentTrackType && bgmAudio.paused) {
            bgmAudio.play().catch(error => console.log("BGM slider resume failed:", error));
        }
    } else if (bgmAudio) {
        bgmAudio.volume = currentVolume;
    }
};

export const getMuteStatus = () => isMuted;

export const playSound = (type) => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;

        if (type === 'correct') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(900, now);
            osc.frequency.setValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.3);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'click') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'tick') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'start') {
            // Simple start sound effect
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'success') {
            // Success chime
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.setValueAtTime(1000, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        }
    } catch (e) {
        console.error(e);
    }
};

export const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};
