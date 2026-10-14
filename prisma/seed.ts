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
const CONTENT_VERSION = 3;

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

// ───────────── Landing (versão 3: visual, menos texto, compra direta) ─────────────

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
    ctaTarget: "checkout",
    config: j({ eyebrow: "E-book digital educativo", badges: ["Leitura no seu ritmo", "Pagamento via PIX", "Acesso por e-mail"], secondaryLabel: "Descobrir meu ponto de partida", secondaryTarget: "/", imageAlt: "" }),
  },
  {
    key: "identificacao",
    type: "identification",
    label: "Identificação (cards)",
    sortOrder: 2,
    title: "Às vezes, entender o que acontece é um bom começo.",
    subtitle: "Nem sempre é simples distinguir fome física, vontade de comer, hábito e busca por conforto. Observar esses momentos sem julgamento pode ajudar você a conhecer melhor a própria experiência.",
    body: "Nada disso define quem você é. São pistas que podem ajudar você a se conhecer melhor.",
    config: j({
      eyebrow: "Talvez você se reconheça",
      items: [
        { icon: "moon", title: "Depois de um dia cansativo, a comida pode virar o momento de conforto.", text: "Quando o dia pesa, comer às vezes é a primeira pausa possível.", image: "", alt: "" },
        { icon: "play", title: "Às vezes, comer vira uma forma de distração.", text: "No tédio ou na correria, a vontade aparece quase sem perceber.", image: "", alt: "" },
        { icon: "spiral", title: "Nem sempre é fácil perceber os próprios padrões.", text: "Muitas vezes, só notamos o que aconteceu depois.", image: "", alt: "" },
        { icon: "heart", title: "Depois de certas escolhas, pode surgir a autocobrança.", text: "E, junto com ela, a vontade de entender melhor o que está acontecendo.", image: "", alt: "" },
      ],
    }),
  },
  {
    key: "ciclo",
    type: "cycle",
    label: "Ciclo interativo",
    sortOrder: 3,
    title: "Um ciclo que vale a pena observar",
    subtitle: "Uma forma simples de olhar para alguns momentos com a comida.",
    body: "Este ciclo é uma possibilidade de reflexão, não uma regra nem um diagnóstico. Cada pessoa vive essas experiências de um jeito.",
    config: j({
      eyebrow: "Como funciona",
      anchor: "como-funciona",
      steps: [
        { icon: "sun", title: "Situação", text: "Algo acontece: um dia corrido, uma cobrança, um momento de solidão.", detail: "Perceber o contexto — a hora do dia, o lugar, o cansaço — ajuda a reconhecer quando esses momentos costumam aparecer." },
        { icon: "heart", title: "Emoção", text: "Surge uma sensação, às vezes sem nome: tensão, tristeza, tédio.", detail: "Dar nome ao que se sente já é uma forma de cuidado. Nem toda emoção precisa ser resolvida na hora; às vezes, ela só precisa ser notada." },
        { icon: "hand", title: "Comportamento", text: "A comida aparece como uma resposta rápida e conhecida.", detail: "Não se trata de proibir ou controlar, e sim de perceber o que a comida está oferecendo naquele momento: pausa, conforto ou distração." },
        { icon: "eye", title: "Reflexão posterior", text: "Depois, vem o que fica: alívio, culpa ou cobrança.", detail: "Olhar para esse momento com curiosidade, e não com julgamento, ajuda a entender o ciclo inteiro — e o que você precisa." },
      ],
    }),
  },
  {
    key: "topicos",
    type: "topics",
    label: "O que é o Além da Fome (ajuste os temas ao sumário real)",
    sortOrder: 4,
    title: "Um e-book educativo para olhar com mais atenção",
    subtitle: "Um material de leitura e reflexão sobre a relação com a comida, as emoções, os hábitos e o autoconhecimento.",
    body: "Sem dietas, sem regras rígidas e sem promessas de resultado: um convite para observar a sua experiência no seu próprio ritmo.",
    config: j({
      eyebrow: "O que é o Além da Fome",
      items: [
        { icon: "eye", title: "Reconhecer seus padrões", text: "Observar em quais situações a vontade de comer aparece além da fome física." },
        { icon: "heart", title: "Emoções e comida", text: "Entender como estresse, cansaço e emoções podem fazer parte da sua relação com a comida." },
        { icon: "compass", title: "Fome do corpo e outras necessidades", text: "Perceber os sinais de fome física e diferenciá-los de necessidades como descanso, pausa ou acolhimento." },
        { icon: "hand", title: "Menos julgamento, mais gentileza", text: "Refletir sobre a autocobrança e experimentar um olhar mais gentil para si mesma." },
        { icon: "leaf", title: "Um cuidado mais consciente", text: "Explorar formas mais conscientes de cuidar de si, respeitando o seu ritmo." },
      ],
    }),
  },
  {
    key: "produto",
    type: "showcase",
    label: "Por dentro do e-book (galeria)",
    sortOrder: 5,
    title: "Veja o que você vai receber",
    body: "O Além da Fome é um e-book digital. Depois da confirmação do pagamento, o acesso chega por e-mail e você pode ler no celular, tablet ou computador.",
    ctaLabel: "Quero o e-book",
    ctaTarget: "checkout",
    config: j({
      eyebrow: "Por dentro do e-book",
      formatItems: ["E-book digital (PDF)", "Leia no celular, tablet ou computador", "Acesso por e-mail após o pagamento", "Link também na página do pedido"],
      previewTitle: "Folheie algumas páginas",
      excerpts: [],
    }),
  },
  {
    key: "autora",
    type: "author",
    label: "Sobre a autora (só aparece com autoria confirmada)",
    sortOrder: 6,
    title: "Geneen Roth",
    body:
      "**Geneen Roth** é escritora bestseller, palestrante e pioneira na abordagem da alimentação emocional e do *mindful eating*. Autora de obras que exploram a relação entre comida, emoções, corpo e autoaceitação, Geneen utiliza sua própria jornada e décadas de experiência em retiros para convidar leitores a refletirem sobre seus hábitos alimentares com mais consciência e menos culpa.",
    imageUrl: null,
    config: j({ eyebrow: "Sobre a autora", name: "Geneen Roth", role: "", context: "", imageAlt: "Fotografia de Geneen Roth", confirmed: "false" }),
  },
  {
    key: "o-que-esperar",
    type: "method",
    label: "O que você pode esperar",
    sortOrder: 7,
    title: "Um convite à reflexão, no seu ritmo",
    subtitle: "O valor do e-book está nas perguntas e reflexões que ele propõe — sem promessas de resultado.",
    body: "O e-book é educativo e não substitui acompanhamento médico, psicológico ou nutricional.",
    config: j({
      eyebrow: "O que você pode esperar",
      items: [
        { icon: "compass", title: "Refletir sobre o que influencia sua relação com a comida", text: "Situações, contextos e momentos do dia que fazem diferença." },
        { icon: "eye", title: "Observar emoções e hábitos com mais atenção", text: "Notar o que acontece antes, durante e depois." },
        { icon: "spiral", title: "Reconhecer padrões sem transformar isso em culpa", text: "Curiosidade no lugar do julgamento." },
        { icon: "pen", title: "Encontrar perguntas úteis para se conhecer", text: "Reflexões para levar para o seu dia a dia." },
        { icon: "leaf", title: "Começar a cuidar de si de forma mais consciente", text: "Sem regras rígidas, respeitando o seu tempo." },
      ],
    }),
  },
  {
    key: "oferta",
    type: "offer",
    label: "Oferta",
    sortOrder: 8,
    title: "Comece hoje, no seu ritmo",
    subtitle: "Um único pagamento. O acesso ao e-book é liberado depois da confirmação do pagamento.",
    ctaLabel: "Quero acessar o e-book",
    body: "Além da Fome é um conteúdo educativo e não substitui acompanhamento psicológico, nutricional ou médico.",
    config: j({
      eyebrow: "Oferta",
      includes: ["E-book Além da Fome em formato digital (PDF)", "Acesso pela página do pedido e por e-mail"],
      steps: [
        { title: "Pagamento via PIX", text: "Você preenche seus dados e recebe o QR Code e o código copia e cola." },
        { title: "Confirmação automática", text: "Assim que o pagamento é confirmado, o acesso é liberado." },
        { title: "Leitura no seu ritmo", text: "O link chega por e-mail e também fica na página do seu pedido." },
      ],
    }),
  },
  {
    key: "transparencia",
    type: "facts",
    label: "Transparência",
    sortOrder: 9,
    title: "Tudo o que você precisa saber antes de comprar",
    config: j({
      eyebrow: "Transparência",
      items: [
        { icon: "book", title: "O que você compra", text: "O e-book digital Além da Fome (PDF). Não inclui curso, comunidade ou bônus." },
        { icon: "download", title: "Como recebe", text: "Depois da confirmação do pagamento, o acesso chega por e-mail e fica na página do pedido." },
        { icon: "lock", title: "Preço", text: "{preco}, pagamento único via PIX. Sem mensalidade." },
        { icon: "chat", title: "Suporte", text: "Dúvidas sobre acesso ou pagamento? [Fale com o suporte](/suporte)." },
        { icon: "shield", title: "Termos e privacidade", text: "Consulte os [termos](/termos), a [privacidade](/politica-de-privacidade) e o [reembolso](/trocas-e-devolucoes)." },
        { icon: "leaf", title: "Limites do material", text: "Conteúdo educativo: não diagnostica, não trata e não substitui acompanhamento profissional." },
      ],
    }),
  },
  { key: "faq", type: "faq", label: "Perguntas frequentes", sortOrder: 10, title: "Perguntas frequentes", config: j({ eyebrow: "Dúvidas" }) },
  {
    key: "cta-final",
    type: "final_cta",
    label: "CTA final",
    sortOrder: 11,
    title: "Você não precisa entender tudo de uma vez. *Pode começar observando.*",
    subtitle: "O Além da Fome é um convite para olhar com mais atenção para sua relação com a comida, reconhecer padrões e abrir espaço para uma compreensão mais consciente de si.",
    ctaLabel: "Quero conhecer o e-book",
    ctaTarget: "checkout",
  },
];

/** Seções de versões anteriores que saem da página (ficam desativadas no admin, não são apagadas). */
const RETIRED_SECTIONS = ["padroes", "metodo", "conteudo", "experiencia", "confianca", "depoimentos", "limites", "olhar-alem", "para-quem"];

const FAQS: [string, string][] = [
  ["O que é o Além da Fome?", "É um e-book digital educativo sobre a relação entre emoções e alimentação. Ele convida você a reconhecer padrões, compreender melhor suas emoções e explorar formas mais conscientes de cuidar de si — sem culpa e sem regras rígidas."],
  ["O que o e-book aborda?", "A relação entre emoções e alimentação, os hábitos do dia a dia, a autocobrança e formas mais conscientes de cuidar de si. Veja os temas em [O que é o Além da Fome](#conteudo-do-ebook)."],
  ["Para quem o conteúdo pode ser relevante?", "Para quem deseja compreender melhor a relação entre emoções e alimentação, observar os próprios hábitos e começar uma reflexão no seu ritmo, com uma abordagem acolhedora e sem dietas."],
  ["Como funciona o acesso?", "Depois que o pagamento é confirmado, o acesso é liberado automaticamente e você recebe um e-mail com o link da sua área de acesso, onde abre ou baixa o e-book. Se perder o link, peça um novo em [Meu acesso](/acesso)."],
  ["Qual é o valor?", "{preco}, em pagamento único. Não há mensalidade nem cobrança recorrente."],
  ["Como funciona o pagamento?", "Por PIX. O QR Code e o código copia e cola aparecem logo após você preencher seus dados, e a confirmação é feita automaticamente pelo sistema de pagamento."],
  ["E se eu me arrepender?", "Você pode desistir da compra em até 7 dias após o pagamento e receber o valor de volta, conforme o direito de arrependimento do Código de Defesa do Consumidor. É só escrever para o suporte informando o número do pedido."],
  ["O e-book substitui acompanhamento profissional?", "Não. O Além da Fome é educativo: não diagnostica, não trata e não substitui psicoterapia, acompanhamento nutricional ou médico. Se você sente sofrimento intenso, procure um profissional de saúde. Em situação de crise, ligue 188 (CVV, gratuito, 24h)."],
  ["Como entro em contato em caso de dúvidas?", "Pela página [Suporte](/suporte). Respondemos pelo e-mail que você informar."],
];

/** Perguntas da versão 2 — se o FAQ ainda for exatamente esse, ele é atualizado; se foi editado no admin, fica como está. */
const FAQ_V2_QUESTIONS = ["O que é o Além da Fome?", "O que está incluído?", "Como funciona o acesso?", "Como o material é entregue?", "Quais são as formas de pagamento?", "O e-book substitui acompanhamento profissional?", "E se eu me arrepender?", "Como falo com o suporte?"];

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

/** Versão 2: quiz novo (perguntas, resultados com reflexão e exercício, e-mail opcional), produto e selo do PIX. */
async function upgradeQuizV2() {
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

/**
 * Versão 3: landing visual (cards, ciclo interativo, galeria, transparência, compra direta).
 * Preserva imagens já enviadas, a seção da autora (texto/foto; volta a exigir confirmação de autoria)
 * e um FAQ que tenha sido editado no admin.
 */
async function upgradeLandingV3(from: number) {
  for (const s of SECTIONS) {
    const { key, ...data } = s;
    const existing = await db.landingSection.findUnique({ where: { key } });
    if (!existing) {
      await db.landingSection.create({ data: s });
      continue;
    }
    const prevCfg = (existing.config ?? {}) as Record<string, unknown>;
    if (key === "autora") {
      await db.landingSection.update({ where: { key }, data: { label: data.label, sortOrder: data.sortOrder, active: true, config: j({ ...prevCfg, confirmed: "false" }) } });
      continue;
    }
    const nextCfg = { ...((data.config ?? {}) as Record<string, unknown>) };
    if (key === "produto" && Array.isArray(prevCfg.excerpts) && prevCfg.excerpts.length) nextCfg.excerpts = prevCfg.excerpts;
    await db.landingSection.update({ where: { key }, data: { ...data, config: j(nextCfg), imageUrl: existing.imageUrl ?? data.imageUrl ?? null, active: true } });
  }
  await db.landingSection.updateMany({ where: { key: { in: RETIRED_SECTIONS } }, data: { active: false } });

  const faqs = await db.faq.findMany({ select: { question: true } });
  const untouched = from < 2 || faqs.every((f) => FAQ_V2_QUESTIONS.includes(f.question));
  if (untouched) {
    await db.faq.deleteMany({});
    await db.faq.createMany({ data: FAQS.map(([question, answer], i) => ({ question, answer, sortOrder: i + 1 })) });
  }
}

async function main() {
  const isFresh = (await db.landingSection.count()) === 0;
  await product();
  await disableCompleteOffer();
  const row = await db.setting.findUnique({ where: { key: "content_version" } });
  const current = isFresh ? 0 : Number(row?.value ?? 1);
  if (isFresh) await freshContent();
  else {
    if (current < 2) await upgradeQuizV2();
    if (current < 3) await upgradeLandingV3(current);
  }
  if (current < CONTENT_VERSION) await db.setting.upsert({ where: { key: "content_version" }, update: { value: j(String(CONTENT_VERSION)) }, create: { key: "content_version", value: j(String(CONTENT_VERSION)) } });
  console.log(`Seed ok — oferta única E-book (R$ 67), conteúdo v${CONTENT_VERSION}${isFresh ? " (banco novo)" : current < CONTENT_VERSION ? ` (atualizado de v${current})` : " (já atualizado)"}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
