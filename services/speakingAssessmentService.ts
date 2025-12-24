import { supabase } from './supabaseClient';
import { SpeakingQuestion, SpeakingAssessment, AssessmentScore } from '../types';
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY ?? '',
});

/**
 * Fetch speaking questions from database with optional filters
 */
export async function fetchSpeakingQuestions(
    difficulty?: '初级' | '中级' | '高级',
    category?: 'Daily Chat' | 'Travel' | 'Business' | 'Academic' | 'Tech'
): Promise<SpeakingQuestion[]> {
    try {
        let query = supabase.from('speaking_questions').select('*');

        if (difficulty) {
            query = query.eq('difficulty', difficulty);
        }
        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching speaking questions:', error);
        return [];
    }
}

/**
 * Record audio using MediaRecorder API and return WAV blob
 */
export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;

    async startRecording(): Promise<void> {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            // Try to use WAV format if supported, otherwise use webm and convert later
            const mimeType = MediaRecorder.isTypeSupported('audio/wav')
                ? 'audio/wav'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/ogg';

            this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
        } catch (error) {
            console.error('Error starting recording:', error);
            throw new Error('无法访问麦克风，请检查权限设置。');
        }
    }

    async stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('没有正在进行的录音'));
                return;
            }

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });

                // Stop all tracks
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                }

                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    isRecording(): boolean {
        return this.mediaRecorder?.state === 'recording';
    }
}

/**
 * Convert audio blob to base64 string
 */
export async function audioBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove the data:audio/wav;base64, prefix
            const base64Data = base64String.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Call OpenRouter API with Gemini 2.5 Flash to assess speaking
 */
export async function assessSpeakingWithAI(
    audioBase64: string,
    question: SpeakingQuestion
): Promise<AssessmentScore> {
    try {
        const prompt = `你是一位专业的英语口语评估老师。请评估以下口语回答，并以JSON格式返回评分。

题目：${question.question_text}
难度：${question.difficulty}
领域：${question.category}

请从以下维度进行评分（每项0-100分）：
1. pronunciation_score - 发音准确度
2. fluency_score - 流畅度（是否有过多停顿、重复）
3. vocabulary_score - 词汇使用（词汇量、准确性）
4. content_score - 内容丰富度（是否有足够的细节和例子）
5. on_topic_score - 是否切题（是否回答了问题）

同时请统计用户说出的完整句子数量 (sentence_count)。我们将根据句子数量发放奖励。

同时给出 total_score（总分，0-100）和 feedback_text（详细的文字反馈，150字左右，中文，指出优点和需要改进的地方）。

请严格按照以下JSON格式返回，不要包含任何其他文字：
{
  "pronunciation_score": 数字,
  "fluency_score": 数字,
  "vocabulary_score": 数字,
  "content_score": 数字,
  "on_topic_score": 数字,
  "total_score": 数字,
  "sentence_count": 数字,
  "feedback_text": "文字反馈"
}`;

        const result = await openRouter.chat.send({
            model: 'google/gemini-2.5-flash',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt,
                        },
                        {
                            type: 'input_audio',
                            inputAudio: {
                                data: audioBase64,
                                format: 'wav',
                            },
                        },
                    ] as any,
                },
            ],
        } as any);

        const responseText = result.choices?.[0]?.message?.content || '';

        // Handle content that might be an array or string
        const contentText = typeof responseText === 'string'
            ? responseText
            : Array.isArray(responseText)
                ? (responseText.find((item: any) => item.type === 'text') as any)?.text || JSON.stringify(responseText)
                : String(responseText);

        // Parse the JSON response
        const jsonMatch = contentText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI返回的格式不正确');
        }

        const assessment = JSON.parse(jsonMatch[0]) as AssessmentScore;

        // Validate scores are within range
        const validateScore = (score: number) => Math.max(0, Math.min(100, score));

        return {
            pronunciation_score: validateScore(assessment.pronunciation_score),
            fluency_score: validateScore(assessment.fluency_score),
            vocabulary_score: validateScore(assessment.vocabulary_score),
            content_score: validateScore(assessment.content_score),
            on_topic_score: validateScore(assessment.on_topic_score),
            total_score: validateScore(assessment.total_score),
            sentence_count: assessment.sentence_count || 0,
            feedback_text: assessment.feedback_text || '评估完成。',
        };
    } catch (error) {
        console.error('Error assessing speaking with AI:', error);
        throw new Error('AI评估失败，请重试');
    }
}

/**
 * Save assessment to database and award experience
 */
export async function saveAssessment(
    userId: string,
    questionId: string,
    score: AssessmentScore
): Promise<{ assessmentId: string; expAwarded: number; goldAwarded: number }> {
    try {
        // Calculate awards based on sentence count
        // 20 XP and 10 Gold per sentence
        const sentenceCount = score.sentence_count || 0;
        const expAwarded = sentenceCount * 20;
        const goldAwarded = sentenceCount * 10;

        // Ensure reasonable limits (e.g., max 500 XP per session to prevent abuse?)
        // Applying a flexible cap for now, maybe max 20 sentences reward?
        // Let's keep it uncapped for now unless user asks, but 0 sentences = 0 reward.
        // Also check if score is decent? Maybe if total_score < 30, no reward?
        // User didn't specify score threshold, just "Per Sentence".
        // Let's assume valid sentences.

        // Insert assessment record
        const { data: assessmentData, error: assessmentError } = await supabase
            .from('speaking_assessments')
            .insert([
                {
                    user_id: userId,
                    question_id: questionId,
                    total_score: score.total_score,
                    pronunciation_score: score.pronunciation_score,
                    fluency_score: score.fluency_score,
                    vocabulary_score: score.vocabulary_score,
                    content_score: score.content_score,
                    on_topic_score: score.on_topic_score,
                    feedback_text: score.feedback_text,
                    exp_awarded: expAwarded,
                },
            ])
            .select()
            .single();

        if (assessmentError) throw assessmentError;

        // Update user experience if exp was awarded
        if (expAwarded > 0) {
            const { error: expError } = await supabase.rpc('add_user_exp', {
                p_user_id: userId,
                p_exp: expAwarded,
            });

            if (expError) {
                console.error('Error updating user exp:', expError);
            }
        }

        // Update user gold
        if (goldAwarded > 0) {
            const { error: goldError } = await supabase.rpc('increment_user_gold', {
                x_user_id: userId,
                x_amount: goldAwarded
            });
            if (goldError) {
                console.error('Error updating user gold:', goldError);
            }
        }

        return {
            assessmentId: assessmentData.id,
            expAwarded,
            goldAwarded
        };
    } catch (error) {
        console.error('Error saving assessment:', error);
        throw new Error('保存评估结果失败');
    }
}

/**
 * Fetch user's assessment history
 */
export async function fetchUserAssessments(
    userId: string
): Promise<SpeakingAssessment[]> {
    try {
        const { data, error } = await supabase
            .from('speaking_assessments')
            .select(
                `
        *,
        question:speaking_questions(*)
      `
            )
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((assessment: any) => ({
            ...assessment,
            question: assessment.question || undefined,
        }));
    } catch (error) {
        console.error('Error fetching user assessments:', error);
        return [];
    }
}
