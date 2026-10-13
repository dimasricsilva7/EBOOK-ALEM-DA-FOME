import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Field, PageHeader, inputCls, textareaCls } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/admin/client";
import { IconItemsEditor, MediaInput, StepsEditor, StringListEditor } from "@/components/admin/inputs";
import { SECTION_TYPES, type SectionType } from "@/lib/domain";
import { db } from "@/lib/db";
import { saveSection } from "../../cms-actions";

export const metadata = { title: "Editar seção" };

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const s = (v: unknown) => (typeof v === "string" ? v : "");
const label = "mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500";

/** O que cada tipo usa (os demais campos ficam ocultos para não confundir). */
const USES: Record<string, { body?: string; image?: string; cta?: boolean; video?: boolean }> = {
  hero: { image: "Imagem da primeira tela (vazio = capa do produto em composição de livro)", cta: true },
  identification: { body: "Texto emocional (parágrafos)" },
  patterns: { body: "Nota de rodapé (ex.: \"é uma possibilidade de reflexão, não diagnóstico\")" },
  method: { body: "Observação abaixo dos pilares" },
  content: { body: "Observação abaixo dos materiais" },
  experience: { image: "Imagem/mockup da área de acesso (identifique se for ilustrativa)" },
  video: { video: true },
  gallery: {},
  audience: {},
  trust: {},
  reviews: { body: "Nota abaixo dos depoimentos" },
  offer: { body: "Texto pequeno abaixo da oferta (ex.: aviso legal)", cta: true },
  limits: { body: "Texto do aviso (o que o produto NÃO é)" },
  faq: {},
  final_cta: { cta: true },
  topics: { body: "Observação abaixo dos tópicos" },
  showcase: { body: "Descrição do formato digital", image: "Mockup do e-book (vazio = capa do produto em composição de livro)", cta: true },
  author: { body: "Biografia (use **negrito** e *itálico*)", image: "Fotografia autêntica da autora" },
};

export default async function EditSectionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const section = await db.landingSection.findUnique({ where: { key } });
  if (!section) notFound();
  const c = (section.config ?? {}) as Record<string, unknown>;
  const t = section.type;
  const u = USES[t] ?? { body: "Texto", image: "Imagem", cta: true };

  return (
    <div>
      <PageHeader title={section.label} description={`Tipo: ${SECTION_TYPES[t as SectionType] ?? t}`} actions={<Link href="/e-book" target="_blank" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium">Ver landing</Link>} />
      <ActionForm action={saveSection} className="space-y-6">
        <input type="hidden" name="key" value={section.key} />
        <Card title="Conteúdo">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-medium md:col-span-2"><input type="checkbox" name="active" defaultChecked={section.active} className="h-4 w-4" /> Seção ativa</label>
            <Field label="Chamada acima do título (opcional)"><input name="cfg_eyebrow" defaultValue={s(c.eyebrow)} className={inputCls} /></Field>
            <Field label="Âncora (opcional)" hint="Ex.: como-funciona — usado em links #como-funciona"><input name="cfg_anchor" defaultValue={s(c.anchor)} className={inputCls} /></Field>
            <Field label="Título" className="md:col-span-2" hint={t === "hero" || t === "final_cta" ? "Use *asteriscos* para destacar um trecho em itálico." : undefined}><input name="title" defaultValue={section.title ?? ""} className={inputCls} /></Field>
            <Field label="Subtítulo" className="md:col-span-2"><textarea name="subtitle" rows={2} defaultValue={section.subtitle ?? ""} className={textareaCls} /></Field>
            {u.body && (
              <Field label={u.body} className="md:col-span-2" hint="Parágrafos separados por linha em branco. Links: [texto](/caminho)"><textarea name="body" rows={4} defaultValue={section.body ?? ""} className={textareaCls} /></Field>
            )}
            {u.cta && (
              <>
                <Field label="Texto do botão"><input name="ctaLabel" defaultValue={section.ctaLabel ?? ""} className={inputCls} /></Field>
                {t !== "offer" && <Field label="Destino do botão" hint="#oferta, #faq, /quiz…"><input name="ctaTarget" defaultValue={section.ctaTarget ?? ""} className={inputCls} /></Field>}
              </>
            )}
            {u.image && <div className="md:col-span-2"><MediaInput name="imageUrl" label={u.image} defaultValue={section.imageUrl} folder={t === "hero" ? "hero" : "landing"} /></div>}
            {u.video && <div className="md:col-span-2"><MediaInput name="videoUrl" label="Vídeo — link YouTube/Vimeo ou MP4 (https)" accept="video/*" defaultValue={section.videoUrl} folder="landing" /></div>}
          </div>
        </Card>

        {["hero", "identification", "patterns", "experience", "method", "trust", "audience", "offer", "video", "topics", "showcase", "author"].includes(t) && (
          <Card title="Itens da seção">
            <div className="grid gap-4 md:grid-cols-2">
              {t === "hero" && (
                <>
                  <Field label="Descrição da foto (acessibilidade)" className="md:col-span-2"><input name="cfg_imageAlt" defaultValue={s(c.imageAlt)} className={inputCls} /></Field>
                  <Field label="Link secundário (opcional)"><input name="cfg_secondaryLabel" defaultValue={s(c.secondaryLabel)} placeholder="Ex.: Fazer o quiz" className={inputCls} /></Field>
                  <Field label="Destino do link secundário"><input name="cfg_secondaryTarget" defaultValue={s(c.secondaryTarget)} placeholder="/quiz" className={inputCls} /></Field>
                  <div className="md:col-span-2">
                    <p className={label}>Elementos de confiança (até 4) — somente verdadeiros</p>
                    <StringListEditor name="cfg_badges" defaultValue={arr<string>(c.badges)} addLabel="Adicionar elemento" />
                  </div>
                </>
              )}
              {t === "identification" && (
                <div className="md:col-span-2">
                  <p className={label}>Situações do dia a dia (linguagem empática, sem presumir)</p>
                  <StringListEditor name="cfg_items" defaultValue={arr<string>(c.items)} addLabel="Adicionar situação" />
                </div>
              )}
              {(t === "patterns" || t === "experience") && (
                <div className="md:col-span-2">
                  <p className={label}>{t === "patterns" ? "Etapas do ciclo (ex.: Situação → Emoção → Comportamento → Depois)" : "Passos de acesso"}</p>
                  <StepsEditor name="cfg_steps" defaultValue={arr(c.steps)} />
                </div>
              )}
              {t === "experience" && (
                <>
                  <Field label="Legenda da imagem" hint='Ex.: "Imagem ilustrativa da área de acesso"'><input name="cfg_imageNote" defaultValue={s(c.imageNote)} className={inputCls} /></Field>
                  <Field label="Descrição da imagem (acessibilidade)"><input name="cfg_imageAlt" defaultValue={s(c.imageAlt)} className={inputCls} /></Field>
                </>
              )}
              {(t === "method" || t === "trust" || t === "topics") && (
                <div className="md:col-span-2">
                  <p className={label}>{t === "topics" ? "Tópicos do e-book (use os títulos reais do sumário)" : t === "method" ? "Pilares" : "Itens de confiança (suporte, pagamento seguro, privacidade…) — a autoria vem de Configurações → Autoria"}</p>
                  <IconItemsEditor name="cfg_items" defaultValue={arr(c.items)} />
                </div>
              )}
              {t === "audience" && (
                <>
                  <Field label="Título da coluna 1"><input name="cfg_forYouTitle" defaultValue={s(c.forYouTitle)} placeholder="É para você se…" className={inputCls} /></Field>
                  <Field label="Título da coluna 2"><input name="cfg_notForYouTitle" defaultValue={s(c.notForYouTitle)} placeholder="Não é o caminho se…" className={inputCls} /></Field>
                  <div><p className={label}>É para você se…</p><StringListEditor name="cfg_forYou" defaultValue={arr<string>(c.forYou)} /></div>
                  <div><p className={label}>Não é o caminho se…</p><StringListEditor name="cfg_notForYou" defaultValue={arr<string>(c.notForYou)} /></div>
                </>
              )}
              {t === "offer" && (
                <div className="md:col-span-2">
                  <p className={label}>Itens extras na lista da oferta (os materiais PRONTOS já entram automaticamente)</p>
                  <StringListEditor name="cfg_includes" defaultValue={arr<string>(c.includes)} addLabel="Adicionar item" />
                  <p className="mt-2 text-xs text-slate-500">Preço, capa e nome vêm do produto principal (Produtos). Garantia: Configurações → Vendas.</p>
                </div>
              )}
              {t === "showcase" && (
                <>
                  <div className="md:col-span-2">
                    <p className={label}>Formato e entrega (somente o que for verdade)</p>
                    <StringListEditor name="cfg_formatItems" defaultValue={arr<string>(c.formatItems)} addLabel="Adicionar item" />
                  </div>
                  <Field label="Título da prévia de páginas" hint="As prévias são as imagens da Galeria — envie só páginas reais do e-book."><input name="cfg_previewTitle" defaultValue={s(c.previewTitle)} placeholder="Prévia de páginas internas" className={inputCls} /></Field>
                  <Field label="Descrição do mockup (acessibilidade)"><input name="cfg_imageAlt" defaultValue={s(c.imageAlt)} className={inputCls} /></Field>
                </>
              )}
              {t === "author" && (
                <>
                  <Field label="Nome"><input name="cfg_name" defaultValue={s(c.name)} className={inputCls} /></Field>
                  <Field label="Linha abaixo do nome (opcional)"><input name="cfg_role" defaultValue={s(c.role)} className={inputCls} /></Field>
                  <Field label="Texto de contexto (relação com o tema)" className="md:col-span-2"><textarea name="cfg_context" rows={3} defaultValue={s(c.context)} className={textareaCls} /></Field>
                  <Field label="Descrição da foto (acessibilidade)" className="md:col-span-2"><input name="cfg_imageAlt" defaultValue={s(c.imageAlt)} placeholder="Fotografia de Geneen Roth" className={inputCls} /></Field>
                </>
              )}
              {t === "video" && (
                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="cfg_vertical" defaultChecked={s(c.vertical) === "true"} className="h-4 w-4" /> Vídeo vertical (9:16)</label>
              )}
            </div>
          </Card>
        )}
        {t === "content" && <p className="text-sm text-slate-500">Os cards desta seção são os <Link href="/admin/produtos" className="underline">materiais PRONTOS</Link> do produto principal marcados para a landing. Sem materiais prontos, a seção não aparece.</p>}
        {t === "faq" && <p className="text-sm text-slate-500">Perguntas em <Link href="/admin/faq" className="underline">FAQ</Link>.</p>}
        {t === "reviews" && <p className="text-sm text-slate-500">Depoimentos em <Link href="/admin/avaliacoes" className="underline">Avaliações</Link> — só aparecem os reais e aprovados.</p>}
        {t === "gallery" && <p className="text-sm text-slate-500">Imagens em <Link href="/admin/galeria" className="underline">Galeria</Link>.</p>}
        <SubmitButton>Salvar seção</SubmitButton>
      </ActionForm>
    </div>
  );
}
