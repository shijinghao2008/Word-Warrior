import { GoogleGenerativeAI, SchemaType } from '@google/genai';
import { config, models } from '../config.js';
import { QuizPayload, WritingScore } from '../types.js';

const client = new GoogleGenerativeAI({ apiKey: config.geminiApiKey ?? '' });

export const gradeWriting = async (topic: string, content: string): Promise<WritingScore> => {
  const response = await client.models.generateContent({
    model: models.flash,
    contents: `请根据语法、词汇和相关性对以下写作练习进行评分。题目: ${topic}\n内容: ${content}`,
    config: {
      temperature: 0.1,
      systemInstruction: 'You are an English Teacher. Grade text based on grammar/vocab.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          score: { type: SchemaType.NUMBER },
          feedback: { type: SchemaType.STRING },
          corrections: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ['score', 'feedback'],
      },
    },
  });

  try {
    return JSON.parse(response.text()) as WritingScore;
  } catch (error) {
    return { score: 0, feedback: '评分解析失败' };
  }
};

export const explainAnswer = async (question: string, userAnswer: string, correctAnswer: string) => {
  const response = await client.models.generateContent({
    model: models.flash,
    contents: `请解释为什么在这个问题中 '${userAnswer}' 是错误的，而 '${correctAnswer}' 是正确的：${question}`,
    config: {
      temperature: 0.1,
      systemInstruction: '你是一位专业的考试辅导英语老师。请用中文提供清晰、简练的解释。',
    },
  });
  return response.text();
};

export const buildQuiz = async (category: string): Promise<QuizPayload> => {
  const response = await client.models.generateContent({
    model: models.flash,
    contents: `为中国应试英语生成一个高难度的 ${category} 题目。`,
    config: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          prompt: { type: SchemaType.STRING },
          options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          correctAnswer: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING },
        },
        required: ['prompt', 'options', 'correctAnswer'],
      },
    },
  });
  return JSON.parse(response.text()) as QuizPayload;
};
