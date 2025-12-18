
import { GoogleGenAI, Type, Modality } from "@google/genai";

// Use process.env.API_KEY directly as per SDK guidelines
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const gradeWriting = async (topic: string, content: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Please grade this English writing task based on grammar, vocabulary, and coherence (IELTS/TOEFL standard).
    Topic: ${topic}
    Student Content: ${content}`,
    config: {
      systemInstruction: "你是一位资深的雅思/托福英语老师。请根据学术英语写作标准对文章进行 0 到 100 的评分。返回一个包含 'score'（数字）、'feedback'（中文总评）和 'corrections'（具体的英文纠错及改进建议数组，用中文注释）的 JSON 对象。",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          corrections: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["score", "feedback", "corrections"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return { score: 0, feedback: "评分出错", corrections: [] };
  }
};

export const getExplanation = async (question: string, userAnswer: string, correctAnswer: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Explain why '${userAnswer}' is incorrect and '${correctAnswer}' is correct for this English exam question: ${question}`,
    config: {
      systemInstruction: "你是一位专业的英语名师。请用中文针对该题目提供清晰、透彻的解析。你的回复必须严格包含以下两个部分：\n1. 错误原因分析：(分析为什么用户的选择是错的，以及题目陷阱)\n2. 建议：(提供相关的语法或词汇学习建议)\n请确保回复简洁有力，分行清晰。总字数控制在150字以内。"
    }
  });
  return response.text;
};

export const generateQuiz = async (category: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a high-difficulty English ${category} task for academic exams (TOEFL/IELTS). 
    If it is 'Reading Comprehension', provide a short passage (STRICTLY under 150 words) followed by one challenging multiple-choice question. 
    Ensure the options are plausible and test deep understanding. Keep the explanations extremely concise.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING, description: "The English passage (under 150 words) and the question text combined." },
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Four English options." },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING, description: "Concise Chinese explanation." }
        },
        required: ["prompt", "options", "correctAnswer"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const askFollowUp = async (context: string, question: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Context (Passage and Question): ${context}\n\nUser Question: ${question}`,
    config: {
      systemInstruction: "你是一位专业的英语助教。针对当前的阅读题目和解析，回答学生提出的后续疑问。请保持回答极其简洁，字数控制在100字以内，并使用 Markdown 格式（如加粗关键词）。"
    }
  });
  return response.text;
};

// --- Listening Features ---

export const generateListeningQuiz = async () => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a TOEFL/IELTS style listening script and question. 
    1. The script should be an academic snippet or a conversation (approx 80-100 words).
    2. Provide one multiple-choice question based on the script.
    3. Provide 4 options.
    4. Provide the correct answer.
    5. Provide a Chinese explanation of why the answer is correct and others are wrong.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING, description: "The English spoken content." },
          question: { type: Type.STRING, description: "The question asked after the script." },
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 options." },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING, description: "Analysis in Chinese." }
        },
        required: ["script", "question", "options", "correctAnswer", "explanation"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const synthesizeSpeech = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
};
