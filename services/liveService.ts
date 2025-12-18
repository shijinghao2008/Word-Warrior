
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

export const startLiveSession = (
  onFinalFeedback: (fullText: string) => void,
  systemPrompt: string = "You are a Battle Referee. Evaluate user's English."
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let accumulatedText = "";
  let sessionObj: any = null;

  // Use the specific requested model
  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: systemPrompt,
      outputAudioTranscription: {}, 
      inputAudioTranscription: {},
    },
    callbacks: {
      onopen: () => console.log('Live Session Connected'),
      onmessage: async (message: LiveServerMessage) => {
        // Collect transcription as it streams in
        if (message.serverContent?.outputTranscription) {
          accumulatedText += message.serverContent.outputTranscription.text;
        }

        // Trigger feedback when the model finishes its turn
        if (message.serverContent?.turnComplete) {
          console.log("Model Turn Complete. Total text:", accumulatedText);
          if (accumulatedText.trim()) {
            onFinalFeedback(accumulatedText);
            accumulatedText = ""; 
          }
        }
      },
      onerror: (e) => console.error('Live Error', e),
      onclose: () => {
        console.log('Live Session Closed.');
      },
    },
  });

  sessionPromise.then(s => { sessionObj = s; });

  return {
    sessionPromise,
    // Expose method to send text commands (e.g., to trigger evaluation)
    sendText: (text: string) => {
      if (sessionObj) {
        sessionObj.send([{ text }]);
      }
    },
    close: () => {
      if (sessionObj) sessionObj.close();
    }
  };
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
