
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

// Implement audio encoding manually as per guidelines
export const encodeAudio = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Implement audio decoding manually as per guidelines
export const decodeAudio = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Resample utility for browser audio compatibility
export const resampleAudio = (buffer: Float32Array, fromRate: number, toRate: number): Float32Array => {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    result[i] = buffer[Math.min(Math.floor(i * ratio), buffer.length - 1)];
  }
  return result;
};



export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Free Talking Session with bidirectional audio streaming
export const startFreeTalkingSession = (
  topic: string,
  level: string,
  onAudioReceived: (audioData: Uint8Array) => void,
  onConversationEnd?: (summary: string) => void
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let sessionObj: any = null;
  let audioSources: AudioBufferSourceNode[] = [];
  let outputAudioContext: AudioContext | null = null;
  let nextStartTime = 0;
  let accumulatedSummary = "";

  const levelDescriptions: Record<string, string> = {
    'beginner': 'Use simple vocabulary and speak slowly. Use short sentences.',
    'intermediate': 'Use everyday vocabulary at normal speed. Use common expressions.',
    'advanced': 'Use advanced vocabulary and idiomatic expressions. Speak naturally at native speed.'
  };

  const systemPrompt = `
You are a friendly English conversation partner helping a ${level} level student practice English.

Topic: ${topic}
Level: ${level}

Guidelines:
- Engage in natural, conversational English about ${topic}
- ${levelDescriptions[level] || levelDescriptions['intermediate']}
- Ask open-ended questions to encourage speaking
- Gently correct major errors by rephrasing
- Keep responses concise (2-3 sentences max)
- Be encouraging and supportive
- IMPORTANT: Respond in AUDIO format

The conversation will last about 3 minutes. Make it engaging and interactive.
`;

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: systemPrompt,
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } }
      },
      outputAudioTranscription: {},
      inputAudioTranscription: {},
    },
    callbacks: {
      onopen: () => {
        console.log('Free Talking Session Connected');
        // Initialize audio context for playback
        if (!outputAudioContext) {
          outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
      },
      onmessage: async (message: LiveServerMessage) => {
        // Handle audio output
        if (message.serverContent?.modelTurn?.parts) {
          for (const part of message.serverContent.modelTurn.parts) {
            if (part.inlineData?.mimeType?.includes('audio/pcm')) {
              const audioData = decodeAudio(part.inlineData.data);
              onAudioReceived(audioData);

              // Play audio immediately
              if (outputAudioContext) {
                try {
                  const audioBuffer = await decodeAudioData(audioData, outputAudioContext, 24000, 1);
                  const source = outputAudioContext.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputAudioContext.destination);

                  const currentTime = outputAudioContext.currentTime;
                  const startTime = Math.max(currentTime, nextStartTime);
                  source.start(startTime);
                  nextStartTime = startTime + audioBuffer.duration;

                  audioSources.push(source);

                  // Clean up after playing
                  source.onended = () => {
                    const index = audioSources.indexOf(source);
                    if (index > -1) audioSources.splice(index, 1);
                  };
                } catch (e) {
                  console.error('Error playing audio:', e);
                }
              }
            }
          }
        }

        // Handle interruption
        if (message.serverContent?.interrupted) {
          console.log('Conversation interrupted by user');
          stopAllAudio();
        }

        // Collect summary at the end
        if (message.serverContent?.outputTranscription) {
          accumulatedSummary += message.serverContent.outputTranscription.text;
        }

        if (message.serverContent?.turnComplete && onConversationEnd && accumulatedSummary.includes('summary')) {
          onConversationEnd(accumulatedSummary);
        }
      },
      onerror: (e) => console.error('Free Talking Session Error', e),
      onclose: () => {
        console.log('Free Talking Session Closed');
        stopAllAudio();
        if (outputAudioContext) {
          outputAudioContext.close();
          outputAudioContext = null;
        }
      },
    },
  });

  sessionPromise.then(s => { sessionObj = s; });

  const stopAllAudio = () => {
    audioSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Already stopped
      }
    });
    audioSources = [];
    if (outputAudioContext) {
      nextStartTime = outputAudioContext.currentTime;
    }
  };

  return {
    sessionPromise,
    sendAudio: (audioData: Uint8Array) => {
      if (sessionObj) {
        const pcmBlob = { data: encodeAudio(audioData), mimeType: 'audio/pcm;rate=16000' };
        sessionObj.sendRealtimeInput({ media: pcmBlob });
      }
    },
    stopAudio: stopAllAudio,
    requestSummary: () => {
      if (sessionObj) {
        sessionObj.send([{ text: 'Please provide a brief summary in Chinese of our conversation, including: 1) Overall performance 2) Strong points 3) Areas for improvement' }]);
      }
    },
    close: () => {
      stopAllAudio();
      if (sessionObj) sessionObj.close();
    }
  };
};

