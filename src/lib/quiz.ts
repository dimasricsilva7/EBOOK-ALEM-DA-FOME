/**
 * Quiz — tipos e regras puras (navegador, servidor e testes).
 * Os resultados são EDITORIAIS: reconhecem o que a pessoa compartilhou e sugerem conteúdo educativo.
 * Nunca são diagnóstico, classificação clínica ou recomendação médica.
 */

export type QuizOptionData = { id: string; label: string; resultKey: string | null; weight: number; nextQuestionId: string | null };
export type QuizQuestionData = { id: string; title: string; helpText: string | null; type: "single" | "multiple"; required: boolean; options: QuizOptionData[] };
export type QuizResultData = { key: string; title: string; subtitle: string | null; body: string | null; points: string[]; ctaLabel: string | null; ctaTarget: string | null };

export type QuizTexts = {
  introEyebrow: string;
  introTitle: string;
  introText: string;
  introButton: string;
  consentText: string;
  privacyNote: string;
  leadEnabled: boolean;
  leadRequired: boolean;
  leadTitle: string;
  leadText: string;
  leadButton: string;
  leadSkipLabel: string;
  marketingConsentLabel: string;
  resultEyebrow: string;
  resultDisclaimer: string;
  fallbackResultKey: string;
};

export type QuizData = { questions: QuizQuestionData[]; results: QuizResultData[]; texts: QuizTexts };

export const QUIZ_TEXT_DEFAULTS: QuizTexts = {
  introEyebrow: "Um momento só seu",
  introTitle: "O que acontece antes de você comer sem fome?",
  introText:
    "São 5 perguntas rápidas para você observar seus momentos com mais carinho. Não existe resposta certa ou errada — e o resultado não é um diagnóstico. É um ponto de partida para se conhecer melhor.",
  introButton: "Começar",
  consentText:
    "Concordo que minhas respostas sejam usadas somente para montar o meu resultado, conforme a Política de Privacidade. Elas não são compartilhadas com plataformas de anúncios.",
  privacyNote: "Suas respostas ficam protegidas e você pode pedir a exclusão a qualquer momento.",
  leadEnabled: true,
  leadRequired: true,
  leadTitle: "Para onde enviamos o seu resultado?",
  leadText: "Informe seu nome e e-mail para ver o resultado e recebê-lo por escrito. Sem spam.",
  leadButton: "Ver meu resultado",
  leadSkipLabel: "Prefiro ver sem informar",
  marketingConsentLabel: "Quero receber conteúdos e novidades do Além da Fome por e-mail (opcional).",
  resultEyebrow: "O que você compartilhou",
  resultDisclaimer:
    "Este resultado é um conteúdo educativo baseado nas suas respostas e não substitui avaliação, acompanhamento ou tratamento com profissionais de saúde (psicologia, nutrição ou medicina).",
  fallbackResultKey: "variadas",
};

/** Próxima pergunta: regra da opção escolhida (pergunta única) ou a seguinte na ordem. null = fim. */
export function nextQuestionId(data: QuizData, currentId: string, chosenOptionIds: string[]): string | null {
  const idx = data.questions.findIndex((q) => q.id === currentId);
  if (idx < 0) return data.questions[0]?.id ?? null;
  const q = data.questions[idx];
  const ruled = q.options.find((o) => chosenOptionIds.includes(o.id) && o.nextQuestionId);
  if (ruled?.nextQuestionId === "END") return null;
  if (ruled?.nextQuestionId && data.questions.some((x) => x.id === ruled.nextQuestionId)) return ruled.nextQuestionId;
  return data.questions[idx + 1]?.id ?? null;
}

/**
 * Resultado editorial: soma os pesos de cada chave nas opções escolhidas. Empate ou nenhuma pontuação
 * → resultado padrão ("experiências variadas"), que não força um rótulo sobre a pessoa.
 */
export function computeResult(data: QuizData, answers: Record<string, string[]>): string {
  const valid = new Set(data.results.map((r) => r.key));
  const fallback = valid.has(data.texts.fallbackResultKey) ? data.texts.fallbackResultKey : (data.results[0]?.key ?? "");
  const score = new Map<string, number>();
  for (const q of data.questions) {
    const chosen = answers[q.id] ?? [];
    for (const o of q.options) {
      if (!chosen.includes(o.id) || !o.resultKey || !valid.has(o.resultKey)) continue;
      score.set(o.resultKey, (score.get(o.resultKey) ?? 0) + Math.max(0, o.weight));
    }
  }
  const ranked = [...score.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return fallback;
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return fallback;
  return ranked[0][0];
}

/** Caminho percorrido pelas regras (usado para progresso e validação de "obrigatórias"). */
export function pathFor(data: QuizData, answers: Record<string, string[]>): string[] {
  const path: string[] = [];
  let cur: string | null = data.questions[0]?.id ?? null;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    path.push(cur);
    const chosen = answers[cur];
    if (!chosen?.length) {
      const q = data.questions.find((x) => x.id === cur);
      if (q?.required) break;
    }
    cur = nextQuestionId(data, cur, chosen ?? []);
  }
  return path;
}
