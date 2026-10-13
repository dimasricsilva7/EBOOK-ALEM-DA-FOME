import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";
import { buildDraftQuiz, getPublishedQuiz } from "@/server/quiz";
import { QuizClient } from "./QuizClient";

export const metadata: Metadata = { title: "Quiz", description: "5 perguntas para observar seus momentos com mais carinho. Conteúdo educativo, não é diagnóstico." };
export const dynamic = "force-dynamic";

/** Quiz público (versão publicada). ?preview=1 mostra o RASCUNHO, só para administradores logados. */
export default async function QuizPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams;
  if (preview === "1") {
    const admin = await getCurrentAdmin();
    if (admin) {
      const draft = await buildDraftQuiz();
      return <QuizClient data={draft} versionId="preview" preview />;
    }
  }
  const published = await getPublishedQuiz();
  if (!published || !published.data.questions.length) {
    return (
      <div className="container-page max-w-lg py-24 text-center">
        <h1 className="h-section">O quiz volta em breve</h1>
        <p className="lead mt-4">Enquanto isso, você pode conhecer o Além da Fome.</p>
        <Link href="/" className="btn-primary mt-8">Conhecer o Além da Fome</Link>
      </div>
    );
  }
  return <QuizClient data={published.data} versionId={published.id} />;
}
