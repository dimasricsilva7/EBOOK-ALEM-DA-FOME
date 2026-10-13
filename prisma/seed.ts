/**
 * Conteúdo inicial do Além da Fome (idempotente: pode rodar de novo sem duplicar).
 * - Produto principal R$ 67,00 (editável no admin).
 * - Materiais citados na referência ficam como "Em produção": NÃO aparecem na landing e NÃO são vendidos
 *   até o admin enviar o arquivo/link real e marcar como pronto.
 * - Landing, FAQ e quiz com textos-base (editáveis). Nenhum depoimento, número ou credencial inventado.
 */
import "dotenv/config";
import { PrismaClient, type Prisma } from "@prisma/client";

const db = new PrismaClient();
const j = (v: unknown) => v as Prisma.InputJsonValue;

type Draft = { title: string; format: "PDF" | "VIDEO" | "LINK" | "AUDIO" | "WORKBOOK" | "OTHER"; description: string; howToUse?: string };

async function upsertProduct(data: Prisma.ProductCreateInput, drafts: Draft[]) {
  const p = await db.product.upsert({ where: { slug: data.slug }, update: {}, create: data });
  if ((await db.digitalMaterial.count({ where: { productId: p.id } })) === 0) {
    await db.digitalMaterial.createMany({ data: drafts.map((d, i) => ({ ...d, productId: p.id, status: "PENDING" as const, source: d.format === "LINK" ? "link" : "file", sortOrder: i + 1 })) });
  }
  return p;
}

/**
 * Dois planos (editáveis no admin):
 *  1. E-book — R$ 67,00
 *  2. Completo (E-book + Curso + Comunidade) — R$ 97,00 — inclui automaticamente os materiais do E-book.
 * Os materiais nascem "Em produção": não aparecem na landing e o checkout recusa a venda até haver material pronto.
 */
async function product() {
  // rascunho antigo de produto único (sem pedidos) é substituído pelos dois planos
  const old = await db.product.findUnique({ where: { slug: "alem-da-fome" }, include: { _count: { select: { orderItems: true } } } });
  if (old && old._count.orderItems === 0) await db.product.delete({ where: { id: old.id } });

  const ebook = await upsertProduct(
    {
      slug: "alem-da-fome-ebook",
      sku: "AF-EBOOK",
      name: "Além da Fome — E-book",
      subtitle: "O guia completo para compreender suas emoções e sua relação com a comida",
      category: "PROGRAM",
      shortDescription: "E-book de autoconhecimento para reconhecer padrões e explorar formas mais acolhedoras de cuidar de si.",
      description: "Produto digital educativo. Não é tratamento e não substitui acompanhamento psicológico, nutricional ou médico.",
      priceCents: 6700,
      badge: "Produto digital educativo",
      active: true,
      sortOrder: 1,
      deliveryFormat: "E-book digital (PDF) com acesso pela página do seu pedido",
      digitalDeliveryNote: "Leia no seu ritmo. Se algo despertar desconforto intenso, pause e procure apoio profissional.",
      specs: j([{ label: "Formato", value: "E-book digital" }, { label: "Idioma", value: "Português" }]),
    },
    [{ title: "E-book Além da Fome", format: "PDF", description: "[PREENCHER] Descreva o e-book real (capítulos, temas) quando o arquivo estiver pronto.", howToUse: "Leia um capítulo por vez, com calma, anotando o que fizer sentido para você." }]
  );

  await upsertProduct(
    {
      slug: "alem-da-fome-completo",
      sku: "AF-COMPLETO",
      name: "Além da Fome Completo",
      subtitle: "E-book + Curso + Comunidade",
      category: "PROGRAM",
      shortDescription: "O e-book, o curso em vídeo e a comunidade para caminhar acompanhada.",
      description: "Produto digital educativo. Não é tratamento e não substitui acompanhamento psicológico, nutricional ou médico.",
      priceCents: 9700,
      badge: "Experiência completa",
      featured: true,
      active: true,
      sortOrder: 2,
      deliveryFormat: "E-book + curso online + acesso à comunidade",
      digitalDeliveryNote: "Comece pelo e-book e acompanhe as aulas no seu tempo. A comunidade é um espaço de troca respeitosa.",
      includedProductIds: j([ebook.id]),
      specs: j([{ label: "Formato", value: "E-book + curso online + comunidade" }, { label: "Idioma", value: "Português" }]),
    },
    [
      { title: "Curso Além da Fome (vídeo-aulas)", format: "VIDEO", description: "[PREENCHER] Descreva as aulas reais (quantidade, temas, duração) quando estiverem gravadas.", howToUse: "Assista a uma aula por vez e aplique as reflexões no seu dia a dia." },
      { title: "Comunidade Além da Fome", format: "LINK", description: "[PREENCHER] Informe onde é a comunidade (ex.: grupo fechado) e como funciona.", howToUse: "Entre pelo link de acesso e apresente-se quando se sentir à vontade." },
    ]
  );
  return ebook;
}

const SECTIONS: Prisma.LandingSectionCreateInput[] = [
  {
    key: "hero",
    type: "hero",
    label: "Primeira tela",
    sortOrder: 1,
    title: "Além da Fome: compreenda suas emoções e construa uma relação mais *consciente* com a comida.",
    subtitle:
      "Um guia de autoconhecimento para reconhecer padrões, entender situações que influenciam sua alimentação e explorar formas mais acolhedoras de cuidar de si — sem transformar cada dificuldade em motivo para se culpar.",
    ctaLabel: "Quero conhecer o Além da Fome",
    ctaTarget: "#oferta",
    config: j({ eyebrow: "Produto digital educativo", badges: ["Conteúdo educativo", "Pagamento seguro", "PIX com confirmação na hora", "No seu ritmo"], secondaryLabel: "Fazer o quiz (5 perguntas)", secondaryTarget: "/quiz" }),
  },
  {
    key: "identificacao",
    type: "identification",
    label: "Identificação",
    sortOrder: 2,
    title: "Talvez não seja só fome.",
    subtitle: "Muita gente percebe, em algum momento, que a comida aparece em situações que têm pouco a ver com o estômago.",
    body:
      "O estresse, o cansaço, a tristeza e outras experiências podem influenciar a forma como nos relacionamos com a comida.\n\nCompreender essas situações não significa se culpar nem tentar controlar cada detalhe da própria vida. Significa começar a observar seus padrões com mais consciência e descobrir quais formas de autocuidado fazem sentido para você.",
    config: j({
      eyebrow: "Você se reconhece?",
      items: [
        "Depois de um dia cheio, a comida parece o único momento de pausa.",
        "Em dias difíceis, você come sem perceber direito o que está sentindo.",
        "Às vezes, depois de comer, vem uma conversa interna dura com você mesma.",
        "Você promete que amanhã vai ser diferente — e o ciclo recomeça.",
        "Nem sempre dá para dizer o que veio antes: só se nota depois.",
      ],
    }),
  },
  {
    key: "padroes",
    type: "patterns",
    label: "Compreensão dos padrões",
    sortOrder: 3,
    title: "Um jeito de olhar para o que acontece",
    subtitle: "Muitas vezes existe um caminho entre o que vivemos e o que fazemos com a comida. Observá-lo com calma é o primeiro passo para escolher outras respostas.",
    body: "Este modelo é uma possibilidade de reflexão, não uma explicação universal nem um diagnóstico. Cada pessoa tem sua história.",
    config: j({
      eyebrow: "Compreender, não julgar",
      steps: [
        { title: "Situação", text: "Algo acontece: uma cobrança, um cansaço, uma notícia, a solidão no fim do dia." },
        { title: "Emoção", text: "Surge uma sensação — tensão, tristeza, ansiedade, vazio — às vezes sem nome." },
        { title: "Comportamento", text: "A comida aparece como resposta: rápida, conhecida, disponível." },
        { title: "Depois", text: "Alívio, culpa ou cobrança. Perceber essa etapa ajuda a entender o ciclo inteiro." },
      ],
    }),
  },
  {
    key: "metodo",
    type: "method",
    label: "Método (pilares)",
    sortOrder: 4,
    title: "Quatro pilares para caminhar no seu tempo",
    subtitle: "Uma proposta educativa para trocar a culpa pela curiosidade sobre si mesma.",
    config: j({
      eyebrow: "Como o Além da Fome se organiza",
      items: [
        { icon: "compass", title: "Reconhecer", text: "Identificar as situações que costumam vir antes de comer sem fome física." },
        { icon: "eye", title: "Observar sem julgamento", text: "Notar emoções e padrões com gentileza, sem transformar cada dificuldade em fracasso." },
        { icon: "leaf", title: "Explorar o autocuidado", text: "Conhecer alternativas e respostas possíveis para momentos difíceis." },
        { icon: "spiral", title: "Construir aos poucos", text: "Desenvolver respostas mais conscientes ao longo do tempo, respeitando o seu ritmo." },
      ],
    }),
  },
  {
    key: "conteudo",
    type: "content",
    label: "Conteúdo incluído",
    sortOrder: 5,
    title: "O que você recebe",
    subtitle: "Cada material foi pensado para ser usado no seu ritmo, quantas vezes quiser.",
    config: j({ eyebrow: "Conteúdo incluído" }),
  },
  {
    key: "experiencia",
    type: "experience",
    label: "Como você acessa",
    sortOrder: 6,
    title: "Simples de acessar, do celular ou do computador",
    config: j({
      eyebrow: "Depois da compra",
      steps: [
        { title: "Pagamento confirmado", text: "Assim que o PIX é confirmado, o acesso é liberado automaticamente." },
        { title: "Link no seu e-mail", text: "Você recebe um e-mail com o link da sua área de acesso." },
        { title: "Materiais organizados", text: "Na página do seu pedido ficam todos os materiais, para abrir ou baixar quando quiser." },
      ],
      imageNote: "",
    }),
  },
  {
    key: "para-quem",
    type: "audience",
    label: "Para quem é",
    sortOrder: 7,
    title: "Para quem o Além da Fome foi criado",
    config: j({
      forYou: [
        "Você quer entender melhor a relação entre suas emoções e a alimentação.",
        "Você busca um conteúdo acolhedor, sem dietas, regras rígidas ou culpa.",
        "Você gosta de refletir e registrar o que sente, no seu tempo.",
      ],
      notForYou: [
        "Você procura um tratamento clínico ou uma promessa de resultado.",
        "Você busca um plano alimentar ou de emagrecimento.",
        "Você está passando por sofrimento intenso agora — nesse caso, priorize o apoio de um profissional de saúde.",
      ],
    }),
  },
  {
    key: "confianca",
    type: "trust",
    label: "Confiança",
    sortOrder: 8,
    title: "Transparência do começo ao fim",
    config: j({
      items: [
        { icon: "lock", title: "Pagamento seguro", text: "PIX processado por gateway de pagamento, com confirmação automática." },
        { icon: "shield", title: "Seus dados protegidos", text: "Usados só para o pedido e o acesso. Respostas do quiz nunca vão para anúncios." },
        { icon: "chat", title: "Suporte de verdade", text: "Dúvidas sobre acesso ou pagamento? Fale com a gente pela página de suporte." },
      ],
    }),
  },
  { key: "depoimentos", type: "reviews", label: "Depoimentos", sortOrder: 9, active: true, title: "Quem já passou por aqui", body: "Depoimentos reais, publicados com autorização." },
  {
    key: "oferta",
    type: "offer",
    label: "Oferta",
    sortOrder: 10,
    title: "Comece hoje, no seu ritmo",
    subtitle: "Um investimento único, com acesso digital imediato após a confirmação do pagamento.",
    ctaLabel: "Quero o Além da Fome",
    body: "Além da Fome é um conteúdo educativo e não substitui acompanhamento psicológico, nutricional ou médico.",
    config: j({ eyebrow: "Investimento" }),
  },
  {
    key: "limites",
    type: "limits",
    label: "Limites do produto",
    sortOrder: 11,
    title: "Um aviso importante, com carinho",
    body:
      "O Além da Fome é um produto digital educativo. Ele não diagnostica, não trata e não cura nenhuma condição, e não substitui psicoterapia, acompanhamento nutricional ou médico.\n\nSe você sente perda de controle frequente, sofrimento intenso ou qualquer risco à sua saúde, procure um profissional. Em situação de crise, ligue 188 (CVV, gratuito, 24h).",
  },
  { key: "faq", type: "faq", label: "Perguntas frequentes", sortOrder: 12, title: "Perguntas frequentes", config: j({ eyebrow: "Dúvidas" }) },
  {
    key: "cta-final",
    type: "final_cta",
    label: "CTA final",
    sortOrder: 13,
    title: "Você não precisa se tratar com *dureza* para começar a cuidar de si.",
    subtitle: "Conheça o Além da Fome e dê o primeiro passo no seu tempo.",
    ctaLabel: "Quero conhecer o Além da Fome",
    ctaTarget: "#oferta",
  },
];

const FAQS = [
  ["O que é o Além da Fome?", "É um produto digital educativo sobre autoconhecimento, emoções e relação com a alimentação. Ele propõe reflexões e ferramentas práticas para você observar seus padrões com mais consciência e gentileza."],
  ["Para quem foi criado?", "Para mulheres adultas que desejam compreender melhor como emoções e situações do dia a dia podem influenciar a alimentação, e explorar formas de autocuidado — sem dietas e sem culpa."],
  ["Quais materiais estão incluídos?", "A lista completa e atualizada está na seção \"O que você recebe\", nesta página. Só aparecem ali os materiais que já estão prontos para entrega."],
  ["Como funciona o acesso?", "Depois que o pagamento é confirmado, o acesso é liberado automaticamente e você recebe um e-mail com o link da sua área de acesso, onde ficam todos os materiais. Se perder o link, peça um novo em [Meu acesso](/acesso)."],
  ["É um tratamento clínico?", "Não. O Além da Fome é educativo e não substitui psicoterapia, acompanhamento nutricional ou médico. Se você sente sofrimento intenso ou perda de controle frequente, procure um profissional de saúde."],
  ["Como funciona o pagamento?", "O pagamento é feito por PIX, com valor único. O QR Code e o código copia e cola aparecem logo após você preencher seus dados, e a confirmação é automática."],
  ["E se eu me arrepender?", "Você pode desistir da compra em até 7 dias após o pagamento e receber o valor de volta, conforme o direito de arrependimento do Código de Defesa do Consumidor. É só escrever para o suporte com o número do pedido."],
  ["Como falo com o suporte?", "Pela página [Suporte](/suporte). Respondemos pelo e-mail que você informar."],
];

const RESULTS = [
  {
    key: "estresse",
    title: "Sua rotina pede pausas — e a comida tem ocupado esse lugar",
    subtitle: "Pelo que você compartilhou, situações de estresse e cansaço parecem aparecer com frequência antes de comer sem fome.",
    body: "Isso é muito comum quando o dia não deixa espaço para respirar. A comida vira um intervalo rápido, conhecido e disponível.\n\nOlhar para isso com curiosidade, e não com cobrança, pode ajudar você a perceber quais pausas fariam sentido na sua rotina.",
    points: ["Repare em que momento do dia isso costuma acontecer.", "Experimente nomear o que está sentindo antes de decidir o que fazer.", "Pequenas pausas planejadas podem ser uma forma de autocuidado."],
  },
  {
    key: "emocoes",
    title: "As emoções difíceis parecem pedir colo",
    subtitle: "Pelo que você compartilhou, emoções como tristeza, solidão ou ansiedade podem estar ligadas a alguns momentos com a comida.",
    body: "Buscar conforto é humano. Entender o que cada emoção está pedindo pode abrir espaço para outras formas de acolhimento, sem precisar se julgar.",
    points: ["Registrar o que você sente ajuda a reconhecer padrões.", "Nem toda emoção precisa ser resolvida na hora — às vezes, só reconhecida.", "Conversar com alguém de confiança também é uma forma de cuidado."],
  },
  {
    key: "controle",
    title: "A sensação de passar do ponto merece atenção gentil",
    subtitle: "Pelo que você compartilhou, a percepção de perder o controle aparece em alguns momentos.",
    body: "Essa sensação costuma vir acompanhada de muita cobrança. Observar o que acontece antes — e não só depois — pode trazer pistas importantes.\n\nSe isso acontece com frequência e traz sofrimento, conversar com um profissional de saúde pode ajudar muito.",
    points: ["Perceber os sinais que vêm antes é um passo valioso.", "Comer com atenção, sem pressa, pode ajudar a perceber a saciedade.", "Procurar apoio profissional é um gesto de cuidado, não de fraqueza."],
  },
  {
    key: "culpa",
    title: "A conversa interna tem sido dura com você",
    subtitle: "Pelo que você compartilhou, culpa e autocobrança aparecem depois de comer.",
    body: "A culpa raramente ajuda a mudar algo — muitas vezes, ela alimenta o próprio ciclo. Trocar o julgamento pela curiosidade é um exercício, e pode ser aprendido aos poucos.",
    points: ["Repare no tom das frases que você diz para si mesma.", "Pergunte: \"o que eu diria para uma amiga nessa situação?\"", "Autocuidado também é sobre como você se trata."],
  },
  {
    key: "variadas",
    title: "Suas experiências são variadas — e isso é muito comum",
    subtitle: "Pelo que você compartilhou, não existe um único padrão: os momentos mudam de acordo com o dia.",
    body: "Isso não é um problema a ser resolvido de uma vez. Observar com calma, sem pressa de rotular, já é um bom começo para se conhecer melhor.",
    points: ["Um registro simples por alguns dias pode revelar padrões.", "Cada situação pode pedir uma resposta diferente.", "Vá no seu ritmo — autoconhecimento é processo."],
  },
];

const QUESTIONS: { title: string; type?: string; options: [string, string | null][] }[] = [
  {
    title: "Em quais momentos você percebe que pensa em comer mesmo sem fome física?",
    options: [
      ["Depois de um dia cansativo ou estressante", "estresse"],
      ["Quando me sinto triste, sozinha ou ansiosa", "emocoes"],
      ["Quando começo e sinto que é difícil parar", "controle"],
      ["Varia muito, não sei dizer", "variadas"],
    ],
  },
  {
    title: "Quando isso acontece, o que costuma vir antes?",
    options: [
      ["Pressão, correria ou cobranças do dia", "estresse"],
      ["Uma emoção difícil, às vezes sem nome", "emocoes"],
      ["Uma sensação de urgência, de não conseguir esperar", "controle"],
      ["Não percebo — só noto depois", "variadas"],
    ],
  },
  {
    title: "E depois, como você costuma se sentir?",
    options: [
      ["Aliviada por um tempo", "estresse"],
      ["Com culpa ou me cobrando muito", "culpa"],
      ["Com a sensação de ter passado do ponto", "controle"],
      ["Depende muito do dia", "variadas"],
    ],
  },
  {
    title: "Como você costuma falar consigo mesma sobre alimentação?",
    options: [
      ["Com bastante cobrança e julgamento", "culpa"],
      ["Prometendo que amanhã vai ser diferente", "controle"],
      ["Evito pensar nisso", "emocoes"],
      ["De forma tranquila, só quero entender melhor", "variadas"],
    ],
  },
  {
    title: "O que você gostaria de explorar agora?",
    options: [
      ["Formas de lidar com o estresse do dia a dia", "estresse"],
      ["Entender melhor minhas emoções", "emocoes"],
      ["Me sentir mais presente na hora de comer", "controle"],
      ["Ser menos dura comigo mesma", "culpa"],
    ],
  },
];

async function main() {
  await product();
  for (const s of SECTIONS) await db.landingSection.upsert({ where: { key: s.key }, update: {}, create: s });
  if ((await db.faq.count()) === 0) await db.faq.createMany({ data: FAQS.map(([question, answer], i) => ({ question, answer, sortOrder: i + 1 })) });

  for (const [i, r] of RESULTS.entries()) {
    await db.quizResult.upsert({ where: { key: r.key }, update: {}, create: { ...r, points: j(r.points), ctaLabel: "Conhecer o Além da Fome", ctaTarget: "/", sortOrder: i + 1 } });
  }
  if ((await db.quizQuestion.count()) === 0) {
    for (const [i, q] of QUESTIONS.entries()) {
      await db.quizQuestion.create({ data: { title: q.title, type: q.type ?? "single", sortOrder: i + 1, options: { create: q.options.map(([label, resultKey], k) => ({ label, resultKey, weight: 1, sortOrder: k })) } } });
    }
  }
  // Publica a primeira versão do quiz (o admin pode editar e publicar outras)
  if ((await db.quizVersion.count()) === 0) {
    const { buildDraftQuizFrom } = await import("./seed-quiz");
    await db.quizVersion.create({ data: { data: j(await buildDraftQuizFrom(db)), publishedBy: "seed" } });
  }
  console.log(`Seed ok — planos E-book (R$ 67) e Completo (R$ 97), ${SECTIONS.length} seções, quiz publicado.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
