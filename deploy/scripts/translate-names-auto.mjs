#!/usr/bin/env node
/**
 * Rule-based EN -> RU/HY name translator for remaining product names.
 * Preserves brand names (Smeg, Porsche, Dolce&Gabbana, aesthetic lines, SKUs).
 */
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:8000";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function api(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "",
      ...(opts.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`${path} ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

const COLORS = {
  Black: ["Черный", "Սև"],
  Cream: ["Кремовый", "Կրեմագույն"],
  White: ["Белый", "Սպիտակ"],
  Red: ["Красный", "Կարմիր"],
  Pink: ["Розовый", "Վարդագույն"],
  Steel: ["Сталь", "Պողպատ"],
  "Pastel blue": ["Пастельный голубой", "Պաստել երկնագույն"],
  "Pastel green": ["Пастельный зеленый", "Պաստել կանաչ"],
  "Emerald Green": ["Изумрудно-зеленый", "Զմրուխտ կանաչ"],
  "Storm Blue": ["Грозовой синий", "Փոթորկային կապույտ"],
  "Navy Blue": ["Темно-синий", "Մուգ կապույտ"],
  Moonlight: ["Лунный свет", "Լուսնի լույս"],
  Champagne: ["Шампань", "Շամպայն"],
  "Lime green": ["Лаймовый зеленый", "Լայմ կանաչ"],
  Orange: ["Оранжевый", "Նարնջագույն"],
  Blue: ["Синий", "Կապույտ"],
  Silver: ["Серебристый", "Արծաթագույն"],
  "Ruby Red": ["Рубиново-красный", "Սուտակ կարմիր"],
  Rust: ["Ржаво-оранжевый", "Ժանգագույն"],
  "Sea Salt Green": ["Зеленый «морская соль»", "Ծովի աղի կանաչ"],
  Taupe: ["Серо-коричневый", "Մոխրագորշ"],
  "Perfectly Pale": ["Нежно-пастельный", "Նուրբ գունատ"],
  Anthracite: ["Антрацит", "Անտրասիտ"],
  "Neptune Grey": ["Серый «Нептун»", "Նեպտուն մոխրագույն"],
  "Blu Mediterraneo": ["Blu Mediterraneo", "Blu Mediterraneo"],
};

const AESTHETICS = [
  "50's Style", "Classica", "Coloniale", "Cortina", "Dolce Stil Novo", "Linea",
  "Musa", "Victoria", "Universale", "Selezione", "Portofino", "Isola",
  "Contemporanea", "Collezione", "Mista",
];

function norm(s) {
  return s.replace(/\u2011/g, "-").replace(/\s+/g, " ").trim();
}

function translateName(en) {
  en = norm(en);
  let ru = en;
  let hy = en;

  // Accessory for: X
  const acc = en.match(/^(.+?) Accessory for: (.+)$/);
  if (acc) {
    const [, what, forWhat] = acc;
    const whatRu = translateFragment(what, "ru");
    const whatHy = translateFragment(what, "hy");
    const forRu = translateFragment(forWhat, "ru");
    const forHy = translateFragment(forWhat, "hy");
    return [`${whatRu}, аксессуар для: ${forRu}`, `${whatHy}, պարագա՝ ${forHy} համար`];
  }

  // Refrigerator patterns
  const fridgeGlossy = en.match(/^(.+?) Glossy refrigerator (\d+x\d+x\d+) mm Free standing( 50's Style)?$/);
  if (fridgeGlossy) {
    const [cRu, cHy] = colorPair(fridgeGlossy[1]);
    const style = fridgeGlossy[3] ? ", 50's Style" : "";
    return [
      `Холодильник, ${cRu} глянцевый, ${fridgeGlossy[2]} мм, отдельностоящий${style}`,
      `Սառնարան, ${cHy} փայլուն, ${fridgeGlossy[2]} մմ, առանձին կանգնող${style}`,
    ];
  }
  const fridgeMatt = en.match(/^(.+?) Matt refrigerator (\d+x\d+x\d+) mm Free standing 50's Style$/);
  if (fridgeMatt) {
    const [cRu, cHy] = colorPair(fridgeMatt[1]);
    return [
      `Холодильник, ${cRu} матовый, ${fridgeMatt[2]} мм, отдельностоящий, 50's Style`,
      `Սառնարան, ${cHy} մատ, ${fridgeMatt[2]} մմ, առանձին կանգնող, 50's Style`,
    ];
  }
  const minibar = en.match(/^(.+?) Minibar Refrigerator One Door, Free standing( 50's Style)?$/);
  if (minibar) {
    const [cRu, cHy] = colorPair(minibar[1]);
    const style = minibar[2] ? ", 50's Style" : "";
    return [
      `Холодильник-минибар, ${cRu}, одна дверь, отдельностоящий${style}`,
      `Մինիբար սառնարան, ${cHy}, մեկ դուռ, առանձին կանգնող${style}`,
    ];
  }
  const whiteFridge = en.match(/^White refrigerator (\d+x\d+x\d+) mm Free standing 50's Style$/);
  if (whiteFridge) {
    return [
      `Холодильник, белый, ${whiteFridge[1]} мм, отдельностоящий, 50's Style`,
      `Սառնարան, սպիտակ, ${whiteFridge[1]} մմ, առանձին կանգնող, 50's Style`,
    ];
  }

  // Toaster/kettle small appliances
  const toaster = en.match(/^(.+?) (Glossy|Matt) toaster 2-slice, 2-slot toaster 50's Style aesthetic$/);
  if (toaster) {
    const [cRu, cHy] = colorPair(toaster[1]);
    const fin = toaster[2] === "Glossy" ? ["глянцевый", "փայլուն"] : ["матовый", "մատ"];
    return [
      `Тостер на 2 ломтика, ${cRu}, ${fin[0]}, эстетика 50's Style`,
      `Տոստեր 2 կտորի, ${cHy}, ${fin[1]}, 50's Style էսթետիկա`,
    ];
  }
  const kettle = en.match(/^(.+?) electric kettle 50's Style aesthetic$/);
  if (kettle) {
    const [cRu, cHy] = colorPair(kettle[1]);
    return [`Электрический чайник, ${cRu}, эстетика 50's Style`, `Էլեկտրական թեյնիկ, ${cHy}, 50's Style էսթետիկա`];
  }
  const miniKettle = en.match(/^Mini electric kettle (.+?) 50's Style Aesthetic$/);
  if (miniKettle) {
    const [cRu, cHy] = colorPair(miniKettle[1]);
    return [`Мини электрический чайник, ${cRu}, эстетика 50's Style`, `Մինի էլեկտրական թեյնիկ, ${cHy}, 50's Style էսթետիկա`];
  }
  const varKettle = en.match(/^Variable temperature kettle (.+?) 50's Style Aesthetic$/);
  if (varKettle) {
    const [cRu, cHy] = colorPair(varKettle[1]);
    return [
      `Электрический чайник с регулировкой температуры, ${cRu}, эстетика 50's Style`,
      `Ջերմաստիճանի կարգավորմամբ էլեկտրական թեյնիկ, ${cHy}, 50's Style էսթետիկա`,
    ];
  }
  const milkF = en.match(/^Milk Frother (.+?) 50's Style Aesthetic$/);
  if (milkF && !en.includes("Dolce")) {
    const [cRu, cHy] = colorPair(milkF[1]);
    return [`Вспениватель молока, ${cRu}, эстетика 50's Style`, `Կաթի փրփրացուցիչ, ${cHy}, 50's Style էսթետիկա`];
  }
  const handMixer = en.match(/^Hand Mixer (.+?) 50's Style Aesthetic$/);
  if (handMixer) {
    const [cRu, cHy] = colorPair(handMixer[1]);
    return [`Ручной миксер, ${cRu}, эстетика 50's Style`, `Ձեռքի միքսեր, ${cHy}, 50's Style էսթետիկա`];
  }
  const standMixer = en.match(/^Stand Mixer( full color)? (.+?) 50's Style Aesthetic$/);
  if (standMixer) {
    const [cRu, cHy] = colorPair(standMixer[2]);
    const fc = standMixer[1] ? " полноцветный" : "";
    return [
      `Планетарный миксер${fc}, ${cRu}, эстетика 50's Style`,
      `Պլանետար միքսեր${standMixer[1] ? " լիագույն" : ""}, ${cHy}, 50's Style էսթետիկա`,
    ];
  }
  const whistling = en.match(/^Whistling Kettle (.+?) 50's Style Aesthetic$/);
  if (whistling) {
    const [cRu, cHy] = colorPair(whistling[1]);
    return [`Свистящий чайник, ${cRu}, эстетика 50's Style`, `Սուզակային թեյնիկ, ${cHy}, 50's Style էսթետիկա`];
  }

  // Induction hob patterns
  const ind1 = en.match(/^Induction hob (\d+(?:\/\d+)? cm) (.+?) color, (.+?) finish (.+?) aesthetic$/);
  if (ind1) {
    const [cRu, cHy] = colorPair(ind1[2]);
    const finRu = finishRu(ind1[3]);
    const finHy = finishHy(ind1[3]);
    return [
      `Индукционная варочная панель ${ind1[1]}, ${cRu}, отделка ${finRu}, эстетика ${ind1[4]}`,
      `Ինդուկցիոն կերակրասալ ${ind1[1]}, ${cHy}, ${finHy} ավարտ, ${ind1[4]} էսթետիկա`,
    ];
  }
  const ind2 = en.match(/^Induction hob \| (.+?) aesthetic (\d+(?:\/\d+)? cm) (.+?) frame$/);
  if (ind2) {
    const [fRu, fHy] = framePair(ind2[3]);
    return [
      `Индукционная варочная панель | эстетика ${ind2[1]}, ${ind2[2]}, рамка ${fRu}`,
      `Ինդուկցիոն կերակրասալ | ${ind2[1]} էսթետիկա, ${ind2[2]}, ${fHy} շրջանակ`,
    ];
  }

  // Hood patterns
  const intHood = en.match(/^Integrated \(semi\) hood (\d+ cm) Universale Aesthetic$/);
  if (intHood) {
    return [
      `Встраиваемая (полувстраиваемая) вытяжка ${intHood[1]}, эстетика Universale`,
      `Ներկառուցվող (կիսաներկառուցվող) օդաքաշ ${intHood[1]}, Universale էսթետիկա`,
    ];
  }
  const intHood2 = en.match(/^Integrated hood (\d+ cm) Universale Aesthetic$/);
  if (intHood2) {
    return [
      `Встраиваемая вытяжка ${intHood2[1]}, эстетика Universale`,
      `Ներկառուցվող օդաքաշ ${intHood2[1]}, Universale էսթետիկա`,
    ];
  }

  // Oven lines with Galileo
  const galileo = en.match(/^(.+?) \| Galileo technology (\d+ cm) (.+?) aesthetic line$/);
  if (galileo) {
    const typeRu = ovenTypeRu(galileo[1]);
    const typeHy = ovenTypeHy(galileo[1]);
    return [`${typeRu} | Galileo technology ${galileo[2]}, линия ${galileo[3]}`, `${typeHy} | Galileo technology ${galileo[2]}, ${galileo[3]} էսթետիկա`];
  }
  const thermo = en.match(/^Thermo-ventilated Oven( .+?)? (\d+ cm) (.+?) aesthetic line$/);
  if (thermo) {
    const extra = thermo[1] ? thermo[1].trim() + " " : "";
    const extraRu = extra.includes("Reduced height") ? "пониженной высоты " : extra.includes("Double in column") ? "двойной колонный " : extra.includes("Double under-counter") ? "двойной подстольный " : "";
    const extraHy = extra.includes("Reduced height") ? "ցածր բարձրության " : extra.includes("Double in column") ? "կրկնակի սյունակային " : extra.includes("Double under-counter") ? "կրկնակի սեղանի տակ " : "";
    return [
      `Духовой шкаф с термовентиляцией ${extraRu}${thermo[2]}, линия ${thermo[3]}`,
      `Ջեռոց տերմովենտիլյացիայով ${extraHy}${thermo[2]}, ${thermo[3]} էսթետիկա`,
    ];
  }

  // Bottles
  const bottle = en.match(/^(Clima Bottle 500 ml|Urban Bottle one-litre) \| (.+?) SMEG x 24Bottles 50's style aesthetic$/);
  if (bottle) {
    const [cRu, cHy] = colorPair(bottle[2]);
    const size = bottle[1].includes("500") ? "500 мл" : "1 л";
    return [
      `${bottle[1].split("|")[0].trim()}, ${cRu}, SMEG x 24Bottles, ${size}, эстетика 50's Style`,
      `${bottle[1].split("|")[0].trim()}, ${cHy}, SMEG x 24Bottles, ${size}, 50's Style էսթետիկա`,
    ];
  }

  // Porsche collab - keep mostly English brand names
  const porsche = en.match(/^(Fridge FAB28|Kettle KLF03|Toaster TSF01) \| (.+?) Porsche x SMEG/);
  if (porsche) {
    const type = { "Fridge FAB28": ["Холодильник FAB28", "Սառնարան FAB28"], "Kettle KLF03": ["Чайник KLF03", "Թեյնիկ KLF03"], "Toaster TSF01": ["Тостер TSF01", "Տոստեր TSF01"] };
    const [ru, hy] = type[porsche[1]];
    return [`${ru} | ${porsche[2]} Porsche x SMEG`, `${hy} | ${porsche[2]} Porsche x SMEG`];
  }

  // Kitchen sink
  const sink = en.match(/^Kitchen sink (.+?) (Universale|Linea) Aesthetic$/);
  if (sink) {
    return [
      `Кухонная мойка ${translateSinkType(sink[1], "ru")}, эстетика ${sink[2]}`,
      `Խոհանոցային լվացարան ${translateSinkType(sink[1], "hy")}, ${sink[2]} էսթետիկա`,
    ];
  }

  // Microwave with grill built-in/countertop
  const mwGrill = en.match(/^Microwave with grill (Built-in|Countertop) (.+?) (Classica|Universale|Linea|Musa|Coloniale|Cortina|Selezione)? ?aesthetic line$/);
  if (mwGrill) {
    const loc = mwGrill[1] === "Built-in" ? ["Встраиваемая", "Ներկառուցվող"] : ["Настольная", "Սեղանի"];
    const color = mwGrill[2].replace("Stainless steel", "нержавеющая сталь").replace("Dark Inox", "темный инокс").replace("Neptune Grey", "серый «Нептун»").replace("Black", "черный").replace("Cream", "кремовый").replace("Anthracite", "антрацит");
    const colorHy = mwGrill[2].replace("Stainless steel", "չժանգոտվող պողպատ").replace("Dark Inox", "մուգ ինոքս").replace("Neptune Grey", "նեպտուն մոխրագույն").replace("Black", "սև").replace("Cream", "կրեմագույն").replace("Anthracite", "անտրասիտ");
    const aest = mwGrill[3] ? `, линия ${mwGrill[3]}` : "";
    const aestHy = mwGrill[3] ? `, ${mwGrill[3]} էսթետիկա` : "";
    return [
      `${loc[0]} микроволновая печь с грилем, ${color}${aest}`,
      `${loc[1]} միկրոալիքային վառարան գրիլով, ${colorHy}${aestHy}`,
    ];
  }
  const mwCombi = en.match(/^Microwave combi oven \| (.+?) Countertop installation, matt finishing Collezione aesthetic$/);
  if (mwCombi) {
    const [cRu, cHy] = colorPair(mwCombi[1]);
    return [
      `Комбинированная микроволновая печь, ${cRu}, настольная, матовая, эстетика Collezione`,
      `Համակցված միկրոալիքային վառարան, ${cHy}, սեղանի, մատ, Collezione էսթետիկա`,
    ];
  }
  const mwGrillCol = en.match(/^Microwave oven with grill \| (.+?) Countertop installation, matt finishing Collezione aesthetic$/);
  if (mwGrillCol) {
    const [cRu, cHy] = colorPair(mwGrillCol[1]);
    return [
      `Микроволновая печь с грилем, ${cRu}, настольная, матовая, эстетика Collezione`,
      `Միկրոալիքային վառարան գրիլով, ${cHy}, սեղանի, մատ, Collezione էսթետիկա`,
    ];
  }

  // Mixed hob
  const mixed = en.match(/^Mixed Hob (\d+(?:\/\d+)? cm) (.+?) aesthetic$/);
  if (mixed) {
    return [
      `Комбинированная варочная панель ${mixed[1]}, эстетика ${mixed[2]}`,
      `Խառն կերակրասալ ${mixed[1]}, ${mixed[2]} էսթետիկա`,
    ];
  }

  // Taps
  const tap = en.match(/^(.+?) kitchen tap (50's Style|Coloniale|Universale) Aesthetic$/);
  if (tap) {
    return [
      `Кухонный смеситель ${translateTapType(tap[1], "ru")}, эстетика ${tap[2]}`,
      `Խոհանոցային ծորակ ${translateTapType(tap[1], "hy")}, ${tap[2]} էսթետիկա`,
    ];
  }

  // Portable induction
  const portable = en.match(/^Portable induction cooker (.+?), Matt Collezione Aesthetic$/);
  if (portable) {
    const [cRu, cHy] = colorPair(portable[1]);
    return [
      `Переносная индукционная плита, ${cRu}, матовая, эстетика Collezione`,
      `Շարժական ինդուկցիոն սալիկ, ${cHy}, մատ, Collezione էսթետիկա`,
    ];
  }

  // Soda maker
  const soda = en.match(/^Soda Maker, (.+?) Matt finish Collezione Aesthetic$/);
  if (soda) {
    const [cRu, cHy] = colorPair(soda[1]);
    return [
      `Сифон для газирования, ${cRu}, матовый, эстетика Collezione`,
      `Գազավորման սարք, ${cHy}, մատ, Collezione էսթետիկա`,
    ];
  }

  // Fallback: phrase-by-phrase replacement
  ru = phraseReplace(en, "ru");
  hy = phraseReplace(en, "hy");
  return [ru, hy];
}

function colorPair(c) {
  const t = COLORS[c.trim()];
  return t || [c, c];
}

function framePair(f) {
  const m = {
    "Stainless Steel": ["нержавеющая сталь", "չժանգոտվող պողպատ"],
    "Steel effect": ["под нержавеющую сталь", "չժանգոտվող պողպատի էֆեկտով"],
    Black: ["черная", "սև"],
    Cream: ["кремовая", "կրեմագույն"],
    Anthracite: ["антрацит", "անտրասիտ"],
  };
  return m[f] || [f, f];
}

function finishRu(f) {
  return { Glass: "стекло", Matt: "матовая", Copper: "медь" }[f] || f;
}
function finishHy(f) {
  return { Glass: "ապակի", Matt: "մատ", Copper: "պղինձ" }[f] || f;
}

function ovenTypeRu(t) {
  const m = {
    "Combi Microwave Oven": "Комбинированная микроволновая печь",
    "Combi Steam Oven": "Комбинированный пароварочный шкаф",
    "Multitech Oven": "Мультитехнологичный духовой шкаф",
    "Thermo-ventilated Oven": "Духовой шкаф с термовентиляцией",
    "Microwave with grill Oven": "Микроволновая печь с грилем",
  };
  return m[t] || t;
}
function ovenTypeHy(t) {
  const m = {
    "Combi Microwave Oven": "Համակցված միկրոալիքային վառարան",
    "Combi Steam Oven": "Համակցված գոլորշու ջեռոց",
    "Multitech Oven": "Բազմատեխնոլոգիական ջեռոց",
    "Thermo-ventilated Oven": "Ջեռոց տերմովենտիլյացիայով",
    "Microwave with grill Oven": "Միկրոալիքային վառարան գրիլով",
  };
  return m[t] || t;
}

function translateSinkType(s, lang) {
  const ru = {
    "Flat built-in": "плоская встраиваемая",
    "Flush fitted, Flat built-in": "встраиваемая заподлицо, плоская",
    "Flush fitted, Flat, Undermount built-in": "встраиваемая заподлицо, плоская, подстольная",
    "Standard built-in": "стандартная встраиваемая",
    "Standard, Undermount built-in": "стандартная подстольная встраиваемая",
    "Ultra-low profile built-in": "встраиваемая сверхнизкого профиля",
    "Undermount built-in": "подстольная встраиваемая",
  };
  const hy = {
    "Flat built-in": "հարթ ներկառուցվող",
    "Flush fitted, Flat built-in": "հարթ ներկառուցվող, հարթ",
    "Flush fitted, Flat, Undermount built-in": "հարթ ներկառուցվող, սեղանի տակ",
    "Standard built-in": "ստանդարտ ներկառուցվող",
    "Standard, Undermount built-in": "ստանդարտ, սեղանի տակ ներկառուցվող",
    "Ultra-low profile built-in": "գերլցված պրոֆիլով ներկառուցվող",
    "Undermount built-in": "սեղանի տակ ներկառուցվող",
  };
  return (lang === "ru" ? ru : hy)[s] || s;
}

function translateTapType(s, lang) {
  const ru = {
    "Double lever filtered water": "с двумя рычагами и фильтрованной водой",
    "Double lever": "с двумя рычагами",
    "Semi-professional single lever": "полупрофессиональный однорычажный",
    "Single lever": "однорычажный",
    "Remote lever and telescopic mixer": "с дистанционным рычагом и телескопическим смесителем",
  };
  const hy = {
    "Double lever filtered water": "երկու լծակով և զտված ջրով",
    "Double lever": "երկու լծակով",
    "Semi-professional single lever": "կիսապրոֆեսիոնալ մեկ լծակով",
    "Single lever": "մեկ լծակով",
    "Remote lever and telescopic mixer": "հեռակառավարման լծակով և տելեսկոպիկ խառնիչով",
  };
  return (lang === "ru" ? ru : hy)[s] || s;
}

function translateFragment(s, lang) {
  const ru = {
    Hoods: "вытяжки", Hobs: "варочные панели", Ovens: "духовые шкафы", Cookers: "плиты",
    Sinks: "мойки", Dishwashers: "посудомоечные машины", Drawers: "ящики",
    "Hand Blenders": "погружные блендеры", "Stand Mixer": "планетарный миксер",
    "Coffee Machines": "кофемашины", "Fridges and freezers": "холодильники и морозильники",
    "Wine coolers": "винные холодильники", "Blast chillers": "шкафы шоковой заморозки",
    "Dryers, Washing machines": "сушильные и стиральные машины", Blender: "блендер",
    Toaster: "тостер",
  };
  const hy = {
    Hoods: "օդաքաշներ", Hobs: "կերակրասալեր", Ovens: "ջեռոցներ", Cookers: "սալօջախներ",
    Sinks: "լվացարաններ", Dishwashers: "ամանլվացքի մեքենաներ", Drawers: "դարակներ",
    "Hand Blenders": "ձեռքի բլենդերներ", "Stand Mixer": "պլանետար միքսեր",
    "Coffee Machines": "սրճեփ մեքենաներ", "Fridges and freezers": "սառնարաններ և սառցարաններ",
    "Wine coolers": "գինու սառնարաններ", "Blast chillers": "շոկային սառեցման պահարաններ",
    "Dryers, Washing machines": "չորացման և լվացքի մեքենաներ", Blender: "բլենդեր",
    Toaster: "տոստեր",
  };
  let out = s;
  const dict = lang === "ru" ? ru : hy;
  for (const [en, tr] of Object.entries(dict)) {
    out = out.replace(new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), tr);
  }
  return out;
}

const PHRASES_RU = [
  ["Wi-Fi Built-in Wine Cooler SmegConnect Dolce Stil Novo Aesthetic", "Встраиваемый винный холодильник Wi-Fi SmegConnect, эстетика Dolce Stil Novo"],
  ["Hand Blender with Accessories Black 50's Style Aesthetic", "Погружной блендер с аксессуарами, черный, эстетика 50's Style"],
  ["Hand Blender with Accessories White 50's Style Aesthetic", "Погружной блендер с аксессуарами, белый, эстетика 50's Style"],
  ["Manual espresso coffee machine Black 50's Style aesthetic", "Ручная эспрессо-кофемашина, черный, эстетика 50's Style"],
  ["Milk Frother Blu Mediterraneo Smeg & Dolce&Gabbana", "Вспениватель молока Blu Mediterraneo Smeg & Dolce&Gabbana"],
  ["Stand Mixer Sicily is my love 50's Style Aesthetic", "Планетарный миксер Sicily is my love, эстетика 50's Style"],
  ["Mini Personal Blender Pink colour, Glossy finishing 50's Style Aesthetic", "Мини-блендер персональный, розовый, глянцевый, эстетика 50's Style"],
  ["Knife block 50's Style", "Подставка для ножей 50's Style"],
  ["Non-stick Wok Diameter 30 cm Black", "Вок с антипригарным покрытием, диаметр 30 см, черный"],
  ["Multisense Blast chiller 45 cm compact Classica Aesthetic", "Шкаф шоковой заморозки Multisense 45 см компактный, эстетика Classica"],
  ["Multisense Blast chiller 45 cm compact Dolce Stil Novo Aesthetic", "Шкаф шоковой заморозки Multisense 45 см компактный, эстетика Dolce Stil Novo"],
  ["Teppanyaki Hob 30 cm Classica aesthetic", "Варочная панель Teppanyaki 30 см, эстетика Classica"],
  ["Suspended hood with lighting system 100 cm Isola aesthetic line", "Подвесная вытяжка со световой системой 100 см, линия Isola"],
  ["Suspended hood with lighting system 180 cm Isola aesthetic line", "Подвесная вытяжка со световой системой 180 см, линия Isola"],
  ["Suspended lighting rail Matt Black frame Isola aesthetic", "Подвесная световая рейка, матовая черная рамка, эстетика Isola"],
  ["Suspended lighting rail Stainless steel frame Isola aesthetic", "Подвесная световая рейка, рамка из нержавеющей стали, эстетика Isola"],
  ["Partially-integrated built-in dishwasher 60 cm width Universale Aesthetic", "Частично встраиваемая посудомоечная машина шириной 60 см, эстетика Universale"],
  ["Under counter built-in dishwasher 60 cm width 50's Style Aesthetic", "Встраиваемая подстольная посудомоечная машина шириной 60 см, эстетика 50's Style"],
  ["Under counter built-in dishwasher 60 cm width Universale Aesthetic", "Встраиваемая подстольная посудомоечная машина шириной 60 см, эстетика Universale"],
  ["Microwave Built-in Anthracite Coloniale aesthetic line", "Встраиваемая микроволновая печь, антрацит, линия Coloniale"],
  ["Microwave Built-in Cream Coloniale aesthetic line", "Встраиваемая микроволновая печь, кремовая, линия Coloniale"],
];

const PHRASES_HY = [
  ["Wi-Fi Built-in Wine Cooler SmegConnect Dolce Stil Novo Aesthetic", "Ներկառուցվող Wi-Fi գինու սառնարան SmegConnect, Dolce Stil Novo էսթետիկա"],
  ["Hand Blender with Accessories Black 50's Style Aesthetic", "Ձեռքի բլենդեր պարագաներով, սև, 50's Style էսթետիկա"],
  ["Hand Blender with Accessories White 50's Style Aesthetic", "Ձեռքի բլենդեր պարագաներով, սպիտակ, 50's Style էսթետիկա"],
  ["Manual espresso coffee machine Black 50's Style aesthetic", "Ձեռքի էսպրեսո սրճեփ մեքենա, սև, 50's Style էսթետիկա"],
  ["Milk Frother Blu Mediterraneo Smeg & Dolce&Gabbana", "Կաթի փրփրացուցիչ Blu Mediterraneo Smeg & Dolce&Gabbana"],
  ["Stand Mixer Sicily is my love 50's Style Aesthetic", "Պլանետար միքսեր Sicily is my love, 50's Style էսթետիկա"],
  ["Mini Personal Blender Pink colour, Glossy finishing 50's Style Aesthetic", "Մինի անձնական բլենդեր, վարդագույն, փայլուն, 50's Style էսթետիկա"],
  ["Knife block 50's Style", "Դանակների կանգնակ 50's Style"],
  ["Non-stick Wok Diameter 30 cm Black", "Չկպչող վոկ, տրամագիծ 30 սմ, սև"],
  ["Multisense Blast chiller 45 cm compact Classica Aesthetic", "Multisense շոկային սառեցման պահարան 45 սմ կոմպակտ, Classica էսթետիկա"],
  ["Multisense Blast chiller 45 cm compact Dolce Stil Novo Aesthetic", "Multisense շոկային սառեցման պահարան 45 սմ կոմպակտ, Dolce Stil Novo էսթետիկա"],
  ["Teppanyaki Hob 30 cm Classica aesthetic", "Teppanyaki կերակրասալ 30 սմ, Classica էսթետիկա"],
  ["Suspended hood with lighting system 100 cm Isola aesthetic line", "Կախված օդաքաշ լուսավորության համակարգով 100 սմ, Isola էսթետիկա"],
  ["Suspended hood with lighting system 180 cm Isola aesthetic line", "Կախված օդաքաշ լուսավորության համակարգով 180 սմ, Isola էսթետիկա"],
  ["Suspended lighting rail Matt Black frame Isola aesthetic", "Կախված լուսավորության ռելս, մատ սև շրջանակ, Isola էսթետիկա"],
  ["Suspended lighting rail Stainless steel frame Isola aesthetic", "Կախված լուսավորության ռելս, չժանգոտվող պողպատի շրջանակ, Isola էսթետիկա"],
  ["Partially-integrated built-in dishwasher 60 cm width Universale Aesthetic", "Մասնակի ներկառուցվող ամանլվացքի մեքենա 60 սմ լայնք, Universale էսթետիկա"],
  ["Under counter built-in dishwasher 60 cm width 50's Style Aesthetic", "Սեղանի տակ ներկառուցվող ամանլվացքի մեքենա 60 սմ, 50's Style էսթետիկա"],
  ["Under counter built-in dishwasher 60 cm width Universale Aesthetic", "Սեղանի տակ ներկառուցվող ամանլվացքի մեքենա 60 սմ, Universale էսթետիկա"],
  ["Microwave Built-in Anthracite Coloniale aesthetic line", "Ներկառուցվող միկրոալիքային վառարան, անտրասիտ, Coloniale էսթետիկա"],
  ["Microwave Built-in Cream Coloniale aesthetic line", "Ներկառուցվող միկրոալիքային վառարան, կրեմագույն, Coloniale էսթետիկա"],
];

function phraseReplace(en, lang) {
  const phrases = lang === "ru" ? PHRASES_RU : PHRASES_HY;
  for (const [e, t] of phrases) {
    if (norm(e) === norm(en)) return t;
  }
  return translateFragment(en, lang);
}

// --- main ---
const rows = await api("products?select=sku,name&name_en=is.null&limit=5000");

const byName = new Map();
for (const r of rows) {
  if (!r.name) continue;
  if (!byName.has(r.name)) byName.set(r.name, []);
  byName.get(r.name).push(r.sku);
}

let ok = 0;
let fallback = 0;
const updates = [];

for (const [en, skus] of byName) {
  const [ru, hy] = translateName(en);
  const usedFallback = ru === en || ru === translateFragment(en, "ru");
  if (usedFallback && !PHRASES_RU.find(([e]) => norm(e) === norm(en))) fallback++;
  else ok++;
  updates.push({ skus, name_en: en, name: ru, name_hy: hy });
}

console.log(`Unique names: ${byName.size}, pattern-matched: ${ok}, fallback: ${fallback}`);

const BATCH = 50;
for (let i = 0; i < updates.length; i += BATCH) {
  const chunk = updates.slice(i, i + BATCH);
  for (const u of chunk) {
    try {
      const skuFilter = u.skus.map((s) => `sku.eq.${encodeURIComponent(s)}`).join(",");
      await api(`products?or=(${skuFilter})`, {
        method: "PATCH",
        body: JSON.stringify({
          name_en: u.name_en,
          name: u.name,
          name_hy: u.name_hy,
          translated_at: new Date().toISOString(),
        }),
        prefer: "return=minimal",
      });
    } catch (e) {
      console.error("update failed", u.name_en.slice(0, 40), e.message);
    }
  }
  console.log(`Updated batch ${i / BATCH + 1}/${Math.ceil(updates.length / BATCH)}`);
}

if (fallback > 0) {
  console.log("\n--- Names needing manual review (fallback) ---");
  for (const [en] of byName) {
    const [ru] = translateName(en);
    if (ru === en || (ru === translateFragment(en, "ru") && !PHRASES_RU.find(([e]) => norm(e) === norm(en)))) {
      console.log(en);
    }
  }
}

console.log("Done.");
