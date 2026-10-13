/**
 * Conteúdo do Além da Fome (idempotente: roda em todo build sem duplicar nem sobrescrever edições do admin).
 * - Banco vazio: cria produto, landing, FAQ e quiz já na versão atual do conteúdo.
 * - Banco existente: aplica UMA vez cada versão de conteúdo (Setting "content_version").
 * - Oferta única: "Além da Fome — E-book" (R$ 67,00). O plano Completo fica desativado (pedidos antigos preservados).
 * - Materiais nascem "Pendentes": não são vendidos até o admin enviar o arquivo real e marcar como pronto.
 * - Nenhum depoimento, número, sumário ou credencial inventado.
 */
import "dotenv/config";
import { PrismaClient, type Prisma } from "@prisma/client";

const db = new PrismaClient();
const j = (v: unknown) => v as Prisma.InputJsonValue;
const CONTENT_VERSION = 2;

const QUIZ_TEXTS = {
  introEyebrow: "Um momento só seu",
  introTitle: "O que a comida representa nos seus momentos mais difíceis?",
  introText: "Responda a 5 perguntas rápidas para observar sua relação com a comida, reconhecer possíveis padrões e descobrir por onde começar a se compreender melhor.",
  introNote: "Uma experiência de autoconhecimento. Sem respostas certas ou erradas, sem julgamentos e sem diagnóstico.",
  introButton: "Começar meu quiz",
  introTime: "Leva cerca de 1–2 minutos.",
  leadEnabled: true,
  leadRequired: false,
  leadTitle: "Quer receber o seu resultado por e-mail?",
  leadText: "É opcional. Se você informar nome e e-mail, enviamos uma cópia do seu resultado — e usamos esses dados só para isso. Novidades por e-mail apenas se você marcar a opção abaixo.",
  leadButton: "Enviar e ver meu resultado",
  leadSkipLabel: "Ver meu resultado sem informar e-mail",
  resultEyebrow: "O seu resultado",
};

// ───────────── Produto ─────────────

async function product() {
  const ebook = await db.product.upsert({
    where: { slug: "alem-da-fome-ebook" },
    update: {},
    create: {
      slug: "alem-da-fome-ebook",
      sku: "AF-EBOOK",
      name: "Além da Fome — E-book",
      subtitle: "Um convite para olhar além da fome",
      category: "PROGRAM",
      shortDescription: "E-book educativo que convida você a reconhecer padrões, compreender melhor suas emoções e explorar formas mais conscientes de cuidar de si — sem culpa e sem regras rígidas.",
      description: "Produto digital educativo. Não é tratamento e não substitui acompanhamento psicológico, nutricional ou médico.",
      priceCents: 6700,
      badge: "Produto digital educativo",
      featured: true,
      active: true,
      sortOrder: 1,
      deliveryFormat: "E-book digital (PDF)",
      digitalDeliveryNote: "Leia no seu ritmo. Se algo despertar desconforto intenso, pause e procure apoio profissional.",
      specs: j([{ label: "Formato", value: "E-book digital (PDF)" }, { label: "Idioma", value: "Português" }]),
    },
  });
  if ((await db.digitalMaterial.count({ where: { productId: ebook.id } })) === 0) {
    await db.digitalMaterial.create({
      data: { productId: ebook.id, title: "E-book Além da Fome", format: "PDF", description: "E-book digital Além da Fome.", howToUse: "Leia um capítulo por vez, com calma, anotando o que fizer sentido para você.", status: "PENDING", source: "file", sortOrder: 1 },
    });
  }
  return ebook;
}

/** Oferta única: desativa o plano Completo (sem apagar — pedidos antigos continuam válidos) e ofertas que dependiam dele. */
async function disableCompleteOffer() {
  await db.product.updateMany({ where: { slug: "alem-da-fome-completo" }, data: { active: false, featured: false } });
  const inactive = (await db.product.findMany({ where: { active: false }, select: { id: true } })).map((p) => p.id);
  if (inactive.length) {
    await db.upsell.updateMany({ where: { productId: { in: inactive } }, data: { active: false } });
    await db.orderBump.updateMany({ where: { productId: { in: inactive } }, data: { active: false } });
  }
  await db.product.updateMany({ where: { slug: "alem-da-fome-ebook", priceCents: { lte: 0 } }, data: { priceCents: 6700 } });
}

// ───────────── Landing ─────────────

const SECTIONS: Prisma.LandingSectionCreateInput[] = [
  {
    key: "hero",
    type: "hero",
    label: "Primeira tela",
    sortOrder: 1,
    title: "Quando a comida parece responder ao que você está sentindo, vale olhar *além da fome*.",
    subtitle:
      "Nem sempre é fácil entender por que determinados momentos do dia influenciam nossa relação com a comida. O estresse, o cansaço e as emoções podem fazer parte dessa experiência.\n\nO Além da Fome é um e-book educativo que convida você a reconhecer padrões, compreender melhor suas emoções e explorar formas mais conscientes de cuidar de si — sem culpa e sem regras rígidas.",
    ctaLabel: "Quero conhecer o e-book",
    ctaTarget: "#oferta",
    imageUrl: null,
    config: j({ eyebrow: "E-book digital educativo", badges: ["Conteúdo educativo", "Pagamento seguro", "Acesso digital", "No seu ritmo"], secondaryLabel: "Entender como funciona", secondaryTarget: "#como-funciona", imageAlt: "" }),
  },
  {
    key: "identificacao",
    type: "identification",
    label: "Identificação",
    sortOrder: 2,
    title: "Às vezes, a vontade de comer chega junto com outras coisas.",
    subtitle: "Cada pessoa vive isso de um jeito — e nem todas as situações abaixo vão fazer sentido para você. Veja se alguma delas soa familiar.",
    body: "Perceber isso não significa que exista algo errado com você. É um sinal de que pode valer a pena observar a sua experiência com mais curiosidade — e menos cobrança.",
    config: j({
      eyebrow: "Talvez você se reconheça",
      items: [
        "Depois de um dia de cansaço e sobrecarga, a comida parece o primeiro momento de pausa.",
        "Em alguns momentos, comer vira uma forma de dar um respiro no meio de tudo.",
        "Certos hábitos acontecem no automático, e você só percebe depois.",
        "Depois de comer, às vezes aparece uma voz interna exigente ou crítica.",
        "Você gostaria de entender melhor o que acontece com você nesses momentos.",
      ],
    }),
  },
  {
    key: "olhar-alem",
    type: "patterns",
    label: "O que significa olhar além da fome",
    sortOrder: 3,
    title: "O que significa olhar além da fome",
    subtitle: "A relação com a comida não é feita só de fome física. Ela também envolve o contexto do dia, os hábitos, as emoções e a história de cada pessoa.",
    body: "A proposta não é ignorar a fome física nem criar regras rígidas. É observar a sua experiência com mais consciência, para compreender o que você sente e do que precisa.",
    config: j({
      eyebrow: "Como funciona",
      anchor: "como-funciona",
      steps: [
        { title: "Contexto", text: "Rotina, cansaço, pressão e o momento do dia podem influenciar quando e como a vontade de comer aparece." },
        { title: "Hábitos", text: "Alguns comportamentos se repetem quase sem perceber. Reconhecê-los ajuda a escolher com mais consciência." },
        { title: "Emoções", text: "Estresse, tristeza, tédio ou solidão podem fazer parte desses momentos — e merecem atenção, não julgamento." },
        { title: "Experiências pessoais", text: "Sua história e suas vivências também moldam a forma como você se relaciona com a comida." },
      ],
    }),
  },
  {
    key: "topicos",
    type: "topics",
    label: "O que você encontrará no e-book (ajuste ao sumário real)",
    sortOrder: 4,
    title: "Conteúdos para compreender, não para se cobrar",
    subtitle: "Temas apresentados de forma clara e acolhedora, para você ler e refletir no seu ritmo.",
    config: j({
      eyebrow: "O que você encontrará no e-book",
      items: [
        { icon: "eye", title: "Reconhecer seus padrões", text: "Observar em quais situações a vontade de comer aparece além da fome física, para compreender melhor o seu dia a dia." },
        { icon: "heart", title: "Emoções e comida", text: "Entender como estresse, cansaço e emoções podem fazer parte da sua relação com a comida — sem rótulos e sem culpa." },
        { icon: "compass", title: "Fome do corpo e outras necessidades", text: "Perceber os sinais de fome física e diferenciá-los de outras necessidades, como descanso, pausa ou acolhimento." },
        { icon: "hand", title: "Menos julgamento, mais gentileza", text: "Refletir sobre a autocobrança e experimentar uma forma mais gentil de olhar para si mesma." },
        { icon: "leaf", title: "Um cuidado mais consciente", text: "Explorar formas mais conscientes de cuidar de si, sem regras rígidas e respeitando o seu ritmo." },
      ],
    }),
  },
  {
    key: "produto",
    type: "showcase",
    label: "Apresentação do e-book",
    sortOrder: 5,
    title: "Um e-book para ler no seu ritmo",
    body: "O Além da Fome é um e-book digital educativo. Depois da confirmação do pagamento, você recebe o acesso por e-mail e pode ler pelo celular, tablet ou computador, no seu tempo.",
    ctaLabel: "Quero o e-book",
    ctaTarget: "#oferta",
    config: j({
      eyebrow: "O produto",
      formatItems: ["E-book digital (PDF)", "Leitura no celular, tablet ou computador", "Acesso enviado por e-mail após a confirmação do pagamento", "Link também disponível na página do seu pedido"],
      previewTitle: "Prévia de páginas internas",
    }),
  },
  {
    key: "autora",
    type: "author",
    label: "Sobre a autora",
    sortOrder: 6,
    title: "Geneen Roth",
    body:
      "**Geneen Roth** é escritora bestseller, palestrante e pioneira na abordagem da alimentação emocional e do *mindful eating*. Autora de obras que exploram a relação entre comida, emoções, corpo e autoaceitação, Geneen utiliza sua própria jornada e décadas de experiência em retiros para convidar leitores a refletirem sobre seus hábitos alimentares com mais consciência e menos culpa.",
    imageUrl: null,
    config: j({
      eyebrow: "Sobre a autora",
      name: "Geneen Roth",
      role: "",
      context: "O convite que atravessa o seu trabalho é trocar a culpa pela curiosidade — e olhar para a comida como uma porta de entrada para compreender o que se sente.",
      imageAlt: "Fotografia de Geneen Roth",
    }),
  },
  {
    key: "para-quem",
    type: "audience",
    label: "Para quem é",
    sortOrder: 7,
    title: "Para quem o Além da Fome pode fazer sentido",
    config: j({
      forYouTitle: "Pode fazer sentido se você…",
      forYou: [
        "Deseja compreender melhor a relação entre emoções e alimentação.",
        "Quer observar os seus hábitos do dia a dia com mais atenção.",
        "Busca uma abordagem educativa e acolhedora, sem dietas e sem culpa.",
        "Quer começar uma reflexão no seu próprio ritmo.",
      ],
      notForYouTitle: "Importante saber",
      notForYou: [
        "O e-book é educativo e não substitui atendimento psicológico, nutricional ou médico.",
        "Não é dieta, plano alimentar nem promessa de emagrecimento.",
        "Se você vive sofrimento intenso ou sente com frequência que perdeu o controle, procure um profissional de saúde. Em situação de crise, ligue 188 (CVV, gratuito, 24h).",
      ],
    }),
  },
  {
    key: "oferta",
    type: "offer",
    label: "Oferta",
    sortOrder: 8,
    title: "Comece hoje, no seu ritmo",
    subtitle: "Um pagamento único, com acesso digital liberado após a confirmação do pagamento.",
    ctaLabel: "Quero o e-book",
    body: "Além da Fome é um conteúdo educativo e não substitui acompanhamento psicológico, nutricional ou médico.",
    config: j({ eyebrow: "Oferta", includes: [] }),
  },
  { key: "faq", type: "faq", label: "Perguntas frequentes", sortOrder: 9, title: "Perguntas frequentes", config: j({ eyebrow: "Dúvidas" }) },
  {
    key: "cta-final",
    type: "final_cta",
    label: "CTA final",
    sortOrder: 10,
    title: "Você não precisa entender *tudo de uma vez*.",
    subtitle: "Pode começar observando sua experiência com mais curiosidade e menos cobrança.",
    ctaLabel: "Quero conhecer o Além da Fome",
    ctaTarget: "#oferta",
  },
];

/** Seções da versão anterior que saem da página (ficam desativadas no admin, não são apagadas). */
const RETIRED_SECTIONS = ["padroes", "metodo", "conteudo", "experiencia", "confianca", "depoimentos", "limites"];

const FAQS: [string, string][] = [
  ["O que é o Além da Fome?", "É um e-book digital educativo sobre a relação entre emoções e alimentação. Ele convida você a reconhecer padrões, compreender melhor suas emoções e explorar formas mais conscientes de cuidar de si — sem culpa e sem regras rígidas."],
  ["O que está incluído?", "O e-book Além da Fome em formato digital (PDF). Esta oferta não inclui cursos, comunidade ou bônus."],
  ["Como funciona o acesso?", "Depois que o pagamento é confirmado, o acesso é liberado automaticamente e você recebe um e-mail com o link da sua área de acesso. Se perder o link, peça um novo em [Meu acesso](/acesso)."],
  ["Como o material é entregue?", "Pela sua área de acesso, onde você abre ou baixa o e-book para ler no celular, tablet ou computador. O link também fica disponível na página do seu pedido."],
  ["Quais são as formas de pagamento?", "PIX, em pagamento único. O QR Code e o código copia e cola aparecem logo após você preencher seus dados, e a confirmação é feita automaticamente pelo sistema de pagamento."],
  ["O e-book substitui acompanhamento profissional?", "Não. O Além da Fome é educativo: não diagnostica, não trata e não substitui psicoterapia, acompanhamento nutricional ou médico. Se você sente sofrimento intenso ou perda de controle frequente, procure um profissional de saúde."],
  ["E se eu me arrepender?", "Você pode desistir da compra em até 7 dias após o pagamento e receber o valor de volta, conforme o direito de arrependimento do Código de Defesa do Consumidor. É só escrever para o suporte informando o número do pedido."],
  ["Como falo com o suporte?", "Pela página [Suporte](/suporte). Respondemos pelo e-mail que você informar."],
];

// ───────────── Quiz ─────────────

const EXERCISE_PAUSE =
  "Na próxima vez que perceber vontade de comer, se isso for confortável para você, faça uma pausa breve e observe: o que estava acontecendo antes? Como estou me sentindo? Do que preciso neste momento?\n\nNão existe resposta certa, e você não precisa negar comida a si mesma.";

const RESULTS = [
  {
    key: "estresse",
    title: "Quando o dia pesa",
    subtitle: "Suas respostas sugerem que vale observar como os dias de maior cansaço e pressão se relacionam com a sua vontade de comer.",
    body: "Isso não significa que exista algo errado com você. É um convite para perceber o que acontece antes, durante e depois desses momentos, com mais curiosidade e menos julgamento.\n\nQuando a rotina deixa pouco espaço para respirar, a comida pode acabar ocupando o lugar de uma pausa — rápida, conhecida e disponível.",
    points: ["Cansaço, sobrecarga e pressão apareceram nas suas respostas.", "A vontade de comer parece ganhar força nas pausas depois de dias exigentes.", "Observar o ritmo do seu dia pode trazer pistas sobre o que você precisa."],
    reflection: "Do que eu preciso, de verdade, quando o dia termina pesado?",
    exercise: `${EXERCISE_PAUSE}\n\nSe fizer sentido, anote em uma frase o que percebeu. Com o tempo, essas anotações podem revelar padrões.`,
  },
  {
    key: "emocoes",
    title: "Quando as emoções pedem atenção",
    subtitle: "Suas respostas sugerem que emoções como tristeza, ansiedade, solidão ou tédio podem fazer parte de alguns dos seus momentos com a comida.",
    body: "Buscar conforto é humano. Reconhecer o que cada emoção está pedindo pode abrir espaço para outras formas de acolhimento — sem precisar se julgar por isso.\n\nNem toda emoção precisa ser resolvida na hora. Às vezes, ela só precisa ser notada.",
    points: ["Emoções difíceis apareceram com frequência nas suas respostas.", "A comida pode estar ocupando, às vezes, um lugar de conforto ou de distração.", "Dar nome ao que você sente é um passo importante para se compreender."],
    reflection: "O que eu estou sentindo agora — e o que essa emoção está tentando me dizer?",
    exercise: `${EXERCISE_PAUSE}\n\nExperimente nomear a emoção com uma palavra (cansaço, tristeza, tédio, saudade…). Nomear já é uma forma de cuidado.`,
  },
  {
    key: "controle",
    title: "Quando os hábitos acontecem no automático",
    subtitle: "Suas respostas sugerem que alguns momentos com a comida acontecem quase sem perceber — e só ficam claros depois.",
    body: "Hábitos automáticos fazem parte da vida de todo mundo. Eles não dizem quem você é; apenas mostram caminhos que se repetiram muitas vezes.\n\nTrazer um pouco mais de atenção para esses momentos pode ajudar você a perceber sinais que antes passavam despercebidos.",
    points: ["A vontade de comer às vezes aparece de forma automática ou como distração.", "Perceber quando parar nem sempre é fácil — e isso é mais comum do que parece.", "Atenção gentil, sem cobrança, ajuda a enxergar o que vem antes."],
    reflection: "O que estava acontecendo um pouco antes de eu perceber que estava comendo?",
    exercise:
      "Em uma próxima refeição ou lanche, se isso for confortável para você, experimente comer com um pouco mais de atenção: perceba sabores, texturas e como o seu corpo se sente ao longo do caminho.\n\nNão existe jeito certo de fazer isso, e você não precisa negar comida a si mesma — a ideia é apenas observar.",
  },
  {
    key: "culpa",
    title: "Quando a autocobrança ocupa espaço",
    subtitle: "Suas respostas sugerem que, depois de alguns momentos com a comida, aparece uma conversa interna exigente ou crítica.",
    body: "A culpa raramente ajuda a compreender o que aconteceu — muitas vezes, ela só deixa tudo mais pesado.\n\nTrocar o julgamento pela curiosidade é algo que se aprende aos poucos. Você não precisa acertar tudo para começar a se tratar com mais gentileza.",
    points: ["Autocobrança e culpa apareceram nas suas respostas.", "Promessas do tipo \"amanhã vai ser diferente\" podem manter o ciclo de cobrança.", "O tom com que você fala consigo mesma também faz parte da sua relação com a comida."],
    reflection: "O que eu diria a uma amiga querida que estivesse passando pela mesma situação?",
    exercise:
      "Na próxima vez que perceber uma frase dura sobre você mesma, se isso for confortável, faça uma pausa e observe: de onde vem essa cobrança? Como eu me sinto ao ouvi-la?\n\nDepois, experimente reescrever a frase com o tom que você usaria com alguém que ama. Não existe resposta certa.",
  },
  {
    key: "variadas",
    title: "Quando você quer se compreender melhor",
    subtitle: "Suas respostas mostram experiências variadas — e uma vontade genuína de entender melhor o que acontece com você.",
    body: "Nem sempre existe um único padrão, e está tudo bem. Os momentos mudam de acordo com o dia, o contexto e o que você está sentindo.\n\nObservar com calma, sem pressa de se rotular, já é um ótimo começo para se conhecer melhor.",
    points: ["Suas respostas não apontam um único padrão — elas variam conforme o momento.", "A curiosidade sobre si mesma apareceu como ponto de partida.", "Pequenas observações ao longo dos dias podem revelar o que antes não era visível."],
    reflection: "Em quais momentos da semana a comida aparece com outro significado para mim?",
    exercise: EXERCISE_PAUSE,
  },
];

const QUESTIONS: { title: string; options: [string, string | null][] }[] = [
  {
    title: "Em quais momentos você sente mais vontade de comer, mesmo sem perceber fome física?",
    options: [
      ["Depois de um dia cansativo ou estressante.", "estresse"],
      ["Quando estou triste, ansiosa, sozinha ou lidando com emoções difíceis.", "emocoes"],
      ["Quando estou entediada ou procurando uma distração.", "controle"],
      ["Quando começo a comer e tenho dificuldade de perceber quando quero parar.", "controle"],
      ["Varia muito; ainda não consigo identificar.", "variadas"],
    ],
  },
  {
    title: "Olhando para esses momentos, o que costuma estar acontecendo com você?",
    options: [
      ["Estou cansada, sobrecarregada ou sob pressão.", "estresse"],
      ["Estou lidando com emoções difíceis.", "emocoes"],
      ["Estou entediada ou buscando uma distração.", "controle"],
      ["A vontade aparece quase automaticamente.", "controle"],
      ["Não consigo identificar um padrão.", "variadas"],
    ],
  },
  {
    title: "Depois desses momentos, o que costuma passar pela sua cabeça?",
    options: [
      ["Sinto alívio, pelo menos por um tempo.", "estresse"],
      ["Fico me cobrando ou sentindo culpa.", "culpa"],
      ["Tenho a sensação de que perdi o controle.", "controle"],
      ["Tento esquecer o que aconteceu e seguir o dia.", "emocoes"],
      ["Depende da situação; não sei explicar.", "variadas"],
    ],
  },
  {
    title: "Quando você pensa na sua relação com a comida, como costuma tratar a si mesma?",
    options: [
      ["Sou muito exigente comigo e me julgo.", "culpa"],
      ["Prometo que amanhã vou fazer tudo diferente.", "culpa"],
      ["Prefiro evitar esse assunto porque ele me incomoda.", "emocoes"],
      ["Tento me compreender, sem me cobrar tanto.", "variadas"],
      ["Ainda não sei bem como me sinto sobre isso.", "variadas"],
    ],
  },
  {
    title: "Se você pudesse começar por uma coisa, o que gostaria de compreender melhor?",
    options: [
      ["Por que sinto vontade de comer em determinados momentos.", "variadas"],
      ["Como reconhecer o que estou sentindo antes de comer.", "emocoes"],
      ["Como lidar com esses momentos sem tanta culpa.", "culpa"],
      ["Como construir uma relação mais consciente com a comida.", "controle"],
    ],
  },
];

const resultData = (r: (typeof RESULTS)[number], i: number) => ({ ...r, points: j(r.points), ctaLabel: "Conhecer o e-book Além da Fome", ctaTarget: "/e-book", active: true, sortOrder: i + 1 });

async function createQuestions() {
  for (const [i, q] of QUESTIONS.entries()) {
    await db.quizQuestion.create({ data: { title: q.title, type: "single", sortOrder: i + 1, options: { create: q.options.map(([label, resultKey], k) => ({ label, resultKey, weight: 1, sortOrder: k })) } } });
  }
}

async function publishQuiz() {
  const { buildDraftQuizFrom } = await import("./seed-quiz");
  await db.quizVersion.create({ data: { data: j(await buildDraftQuizFrom(db)), publishedBy: "seed" } });
}

// ───────────── Execução ─────────────

async function freshContent() {
  for (const s of SECTIONS) await db.landingSection.upsert({ where: { key: s.key }, update: {}, create: s });
  if ((await db.faq.count()) === 0) await db.faq.createMany({ data: FAQS.map(([question, answer], i) => ({ question, answer, sortOrder: i + 1 })) });
  for (const [i, r] of RESULTS.entries()) await db.quizResult.upsert({ where: { key: r.key }, update: {}, create: resultData(r, i) });
  if ((await db.quizQuestion.count()) === 0) await createQuestions();
  if (!(await db.setting.findUnique({ where: { key: "quiz_texts_draft" } }))) await db.setting.create({ data: { key: "quiz_texts_draft", value: j(QUIZ_TEXTS) } });
  if ((await db.quizVersion.count()) === 0) await publishQuiz();
}

/** Versão 2 do conteúdo: quiz na entrada, nova landing, oferta única, resultados com reflexão e exercício. */
async function upgradeToV2() {
  for (const s of SECTIONS) {
    const { key, ...data } = s;
    await db.landingSection.upsert({ where: { key }, update: { ...data, active: true }, create: s });
  }
  await db.landingSection.updateMany({ where: { key: { in: RETIRED_SECTIONS } }, data: { active: false } });

  await db.faq.deleteMany({});
  await db.faq.createMany({ data: FAQS.map(([question, answer], i) => ({ question, answer, sortOrder: i + 1 })) });

  for (const [i, r] of RESULTS.entries()) await db.quizResult.upsert({ where: { key: r.key }, update: resultData(r, i), create: resultData(r, i) });
  await db.quizResult.updateMany({ where: { key: { notIn: RESULTS.map((r) => r.key) } }, data: { active: false } });
  // Respostas já gravadas guardam o texto da pergunta/opção, então o histórico continua legível
  await db.quizOption.deleteMany({});
  await db.quizQuestion.deleteMany({});
  await createQuestions();
  const saved = await db.setting.findUnique({ where: { key: "quiz_texts_draft" } });
  const prev = saved?.value && typeof saved.value === "object" && !Array.isArray(saved.value) ? (saved.value as Record<string, unknown>) : {};
  await db.setting.upsert({ where: { key: "quiz_texts_draft" }, update: { value: j({ ...prev, ...QUIZ_TEXTS }) }, create: { key: "quiz_texts_draft", value: j(QUIZ_TEXTS) } });
  await publishQuiz();

  await db.product.updateMany({
    where: { slug: "alem-da-fome-ebook" },
    data: {
      subtitle: "Um convite para olhar além da fome",
      shortDescription: "E-book educativo que convida você a reconhecer padrões, compreender melhor suas emoções e explorar formas mais conscientes de cuidar de si — sem culpa e sem regras rígidas.",
      deliveryFormat: "E-book digital (PDF)",
      featured: true,
    },
  });
  // "PIX com confirmação na hora" sai da página e do checkout
  await db.setting.updateMany({ where: { key: "pix_badge", value: { equals: "confirmação na hora" } }, data: { value: j("") } });
}

async function main() {
  const isFresh = (await db.landingSection.count()) === 0;
  await product();
  await disableCompleteOffer();
  const row = await db.setting.findUnique({ where: { key: "content_version" } });
  const current = isFresh ? 0 : Number(row?.value ?? 1);
  if (isFresh) await freshContent();
  else if (current < 2) await upgradeToV2();
  if (current < CONTENT_VERSION) await db.setting.upsert({ where: { key: "content_version" }, update: { value: j(String(CONTENT_VERSION)) }, create: { key: "content_version", value: j(String(CONTENT_VERSION)) } });
  console.log(`Seed ok — oferta única E-book (R$ 67), conteúdo v${CONTENT_VERSION}${isFresh ? " (banco novo)" : current < 2 ? " (atualizado)" : " (já atualizado)"}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
