import { Router } from 'express';
import { z } from 'zod';
import { applyReadingWin, applyVocabMastery, applyWritingScore, calculateCombatPower } from '../utils/progression.js';
import { buildQuiz, explainAnswer, gradeWriting } from '../ai/geminiClient.js';
import { getUser, saveUser } from '../store/userStore.js';
import { ReadingRequest, VocabTrainingRequest, WritingRequest } from '../types.js';

const router = Router();

const vocabSchema = z.object({
  userId: z.string().min(1),
  mastered: z.number().int().nonnegative(),
});

router.post('/vocab', async (req, res) => {
  const parsed = vocabSchema.safeParse(req.body as VocabTrainingRequest);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid payload' });
  const { userId, mastered } = parsed.data;
  const profile = await getUser(userId);
  const updatedStats = applyVocabMastery(profile.stats, mastered);
  const updated = await saveUser({ ...profile, stats: updatedStats });
  return res.json({
    success: true,
    data: {
      stats: updated.stats,
      combatPower: calculateCombatPower(updated.stats),
      gainedExp: mastered * 5,
    },
  });
});

const writingSchema = z.object({
  userId: z.string().min(1),
  topic: z.string().min(1),
  content: z.string().min(1),
});

router.post('/writing', async (req, res) => {
  const parsed = writingSchema.safeParse(req.body as WritingRequest);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid payload' });
  const { userId, topic, content } = parsed.data;
  const profile = await getUser(userId);
  const aiScore = await gradeWriting(topic, content);
  const updatedStats = applyWritingScore(profile.stats, aiScore.score);
  const updated = await saveUser({ ...profile, stats: updatedStats });
  return res.json({
    success: true,
    data: {
      stats: updated.stats,
      score: aiScore,
      combatPower: calculateCombatPower(updated.stats),
    },
  });
});

const readingSchema = z.object({
  userId: z.string().min(1),
  question: z.string().min(1),
  userAnswer: z.string().min(1),
  correctAnswer: z.string().min(1),
  difficulty: z.number().int().positive().max(5),
});

router.post('/reading', async (req, res) => {
  const parsed = readingSchema.safeParse(req.body as ReadingRequest);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid payload' });
  const { userId, question, userAnswer, correctAnswer, difficulty } = parsed.data;
  const isCorrect = userAnswer.trim() === correctAnswer.trim();
  const profile = await getUser(userId);
  const updatedStats = applyReadingWin(profile.stats, difficulty, isCorrect);
  const updated = await saveUser({ ...profile, stats: updatedStats });
  const explanation = isCorrect ? undefined : await explainAnswer(question, userAnswer, correctAnswer);
  return res.json({
    success: true,
    data: {
      stats: updated.stats,
      correct: isCorrect,
      explanation,
      combatPower: calculateCombatPower(updated.stats),
    },
  });
});

router.get('/quiz/:category', async (req, res) => {
  const category = req.params.category ?? 'reading';
  const payload = await buildQuiz(category);
  res.json({ success: true, data: payload });
});

export default router;
