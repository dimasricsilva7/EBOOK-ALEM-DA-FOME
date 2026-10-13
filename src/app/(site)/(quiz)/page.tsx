import QuizPage, { metadata as quizMetadata } from "./quiz/page";

/** Entrada do site: o quiz abre direto em "/" (a página de vendas fica em /e-book). */
export const dynamic = "force-dynamic";
export const metadata = quizMetadata;
export default QuizPage;
