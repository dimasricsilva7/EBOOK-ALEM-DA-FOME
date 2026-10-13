import type { PrismaClient } from "@prisma/client";
import { QUIZ_TEXT_DEFAULTS, type QuizData } from "../src/lib/quiz";

/** Mesma montagem de src/server/quiz.ts (buildDraftQuiz), sem "server-only", para o seed. */
export async function buildDraftQuizFrom(db: PrismaClient): Promise<QuizData> {
  const [questions, results] = await Promise.all([
    db.quizQuestion.findMany({ where: { active: true }, include: { options: { orderBy: { sortOrder: "asc" } } }, orderBy: [{ sortOrder: "asc" }] }),
    db.quizResult.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }] }),
  ]);
  return {
    questions: questions.map((q) => ({ id: q.id, title: q.title, helpText: q.helpText, type: q.type === "multiple" ? "multiple" : "single", required: q.required, options: q.options.map((o) => ({ id: o.id, label: o.label, resultKey: o.resultKey, weight: o.weight, nextQuestionId: o.nextQuestionId })) })),
    results: results.map((r) => ({ key: r.key, title: r.title, subtitle: r.subtitle, body: r.body, points: Array.isArray(r.points) ? (r.points as string[]) : [], ctaLabel: r.ctaLabel, ctaTarget: r.ctaTarget })),
    texts: QUIZ_TEXT_DEFAULTS,
  };
}
