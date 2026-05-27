import { supabaseApi } from "@/integrations/supabase";
import type { Database, Json } from "@/integrations/supabase";

export type RecommendationFilter = "Todos" | "Rotina" | "Produtos" | "Habitos";
export type ProductType = "mask" | "leave-in" | "oil" | "shampoo" | "tonic" | "scalp-care" | "protective";
export type ClimateLabel = "seco" | "equilibrado" | "umido";
export type HabitId = string;

export type MetricScores = {
  hydration: number;
  strength: number;
  definition: number;
  ends: number;
};

export type Profile = {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
  softAccent: string;
  texture: string;
  porosity: string;
  density: string;
  currentGoal: string;
  baseScores: MetricScores;
  scalpOiliness: string;
  styles: string[];
  chemistry: string[];
  climateRegion: string;
};

export type RoutineStep = {
  id: string;
  title: string;
  hint: string;
  duration: string;
  benefits: Partial<MetricScores>;
};

export type Symptom = {
  id: string;
  label: string;
  icon: string;
  impact: Partial<MetricScores>;
};

export type Product = {
  id: string;
  type: ProductType;
  name: string;
  label: string;
  description: string;
  effects: Partial<MetricScores>;
};

export type HistoryEntry = {
  date: string;
  hydration: number;
  strength: number;
  definition: number;
  ends: number;
  symptoms: string[];
  completedSteps: string[];
  products: string[];
  habits: HabitId[];
  note: string;
  photoLogged: boolean;
  humidity: number;
  temperature: number;
};

export type UserContext = {
  selectedSymptoms: string[];
  completedSteps: string[];
  selectedProducts: string[];
  selectedHabits: HabitId[];
  dailyNote: string;
  photoLogged: boolean;
  weeklyCareSessions: number;
  humidity: number;
  temperature: number;
  remindersEnabled: boolean;
  history: HistoryEntry[];
};

export type PersistedState = {
  recommendationFilter: RecommendationFilter;
  progressRange: "7 dias" | "30 dias" | "90 dias";
  user: UserContext;
};

export type AnalysisContext = {
  profile: Profile;
  user: UserContext;
  scores: MetricScores;
  completionRatio: number;
  climateLabel: ClimateLabel;
  consistencyScore: number;
  overallScore: number;
  progressDelta: number;
  topConcerns: string[];
  summaryTitle: string;
  summaryDescription: string;
  focusLabel: string;
  insights: string[];
};

export type Recommendation = {
  id: string;
  title: string;
  description: string;
  category: RecommendationFilter;
  cta: string;
  icon: string;
  ranking: number;
};

export type RecommendationModalData = {
  title: string;
  subtitle: string;
  reason: string;
  protocolTitle: string;
  protocolSteps: string[];
  matchedProducts: Product[];
  whyNow: string[];
  gaps: string[];
};

export type QuickCheckinDraft = {
  selectedSymptoms: string[];
  selectedProducts: string[];
  completedSteps: string[];
  selectedHabits: HabitId[];
  dailyNote: string;
  photoLogged: boolean;
};

export type OnboardingDraft = {
  displayName: string;
  ageRange: string;
  genderIdentity: string;
  hairType: string;
  isTransitioning: boolean;
  texture: string;
  porosity: string;
  density: string;
  volumePerception: string;
  currentLength: string;
  scalpOiliness: string;
  washFrequency: string;
  careFrequency: string;
  timeAvailable: string;
  routinePreference: string;
  consistencyFeeling: string;
  blowDryerFrequency: string;
  flatIronFrequency: string;
  nighttimeHabits: string[];
  sleepsWithBonnet: boolean;
  usesHairProtection: boolean;
  protectiveStyles: string[];
  protectiveStyleDuration: string;
  washesWhileProtectiveStyle: boolean | null;
  chemicalProcesses: string[];
  currentGoals: string[];
  desiredDayToDayResults: string[];
  mainChallenges: string[];
  recurringSymptoms: string[];
  regionClimate: string;
  cityOrRegion: string;
  climateImpactsHair: boolean | null;
  feelingsAboutHair: string[];
  hairKnowledgeLevel: string;
  notes: string;
  productsText: string;
};

type DbProfile = Database["public"]["Tables"]["raiz_profiles"]["Row"];
type DbProduct = Database["public"]["Tables"]["raiz_products"]["Row"];
type DbCheckin = Database["public"]["Tables"]["raiz_checkins"]["Row"];

export const symptomLibrary: Symptom[] = [
  { id: "ressecado", label: "Ressecado", icon: "💧", impact: { hydration: -18, definition: -6, ends: -8 } },
  { id: "frizz", label: "Frizz", icon: "✨", impact: { definition: -18, hydration: -5 } },
  { id: "quebra", label: "Quebra", icon: "✂", impact: { strength: -18, ends: -16 } },
  { id: "sem-brilho", label: "Sem brilho", icon: "◌", impact: { hydration: -10, definition: -7 } },
  { id: "raiz-oleosa", label: "Raiz oleosa", icon: "🌿", impact: { definition: -4, strength: -3 } },
  { id: "sem-volume", label: "Sem volume", icon: "≈", impact: { definition: -12 } },
  { id: "descamacao", label: "Descamacao", icon: "❄", impact: { hydration: -8, strength: -6 } },
  { id: "coceira", label: "Coceira", icon: "⚪", impact: { strength: -4, definition: -4 } },
];

export const habitLibrary: Array<{ id: HabitId; label: string; description: string }> = [
  { id: "fronha-cetim", label: "Fronha de cetim", description: "reduz atrito durante a noite" },
  { id: "baixa-manipulacao", label: "Baixa manipulacao", description: "evita frizz e quebra ao longo do dia" },
  { id: "protecao-noturna", label: "Protecao noturna", description: "preserva definicao e pontas" },
  { id: "difusor-frio", label: "Difusor frio", description: "ajuda a segurar forma sem ressecar" },
  { id: "touca-satin", label: "Touca de cetim", description: "mantem o cuidado durante o sono" },
  { id: "termoprotecao", label: "Termoprotecao", description: "protege contra secador, chapinha e escova" },
  { id: "massagem-couro", label: "Massagem no couro", description: "estimula conforto e limpeza do couro cabeludo" },
  { id: "manutencao-estilo", label: "Manutencao do estilo", description: "cuida da base quando o cabelo esta em lace, trancas ou dread" },
];

export const onboardingOptions = {
  ageRanges: ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"],
  genderIdentities: ["Mulher", "Homem", "Pessoa nao binaria", "Prefiro nao dizer"],
  hairTypes: ["Liso", "Ondulado", "Cacheado", "Crespo", "Em transicao", "Com estilo protetivo"],
  textures: ["Fino", "Medio", "Grosso", "Misto"],
  porosities: ["Baixa", "Media", "Alta", "Nao sei ainda"],
  densities: ["Leve", "Media", "Alta"],
  volumes: ["Bem controlado", "Medio", "Cheio", "Muda muito"],
  lengths: ["Curtinho", "Na altura da orelha", "Nos ombros", "Abaixo dos ombros", "Bem longo"],
  oiliness: ["Seco", "Equilibrado", "Oleoso", "Misto"],
  washFrequencies: ["1x por semana", "2x por semana", "3x por semana", "Dia sim dia nao", "Diariamente", "Conforme o estilo"],
  careFrequencies: ["1x por semana", "2x por semana", "3x por semana", "4x ou mais por semana", "Quando consigo"],
  timeAvailable: ["5 minutos", "10 a 15 minutos", "20 a 30 minutos", "Mais de 30 minutos", "Depende do dia"],
  routinePreferences: ["Quero o mais pratico possivel", "Gosto de algo equilibrado", "Amo rotina completa quando vale a pena"],
  consistencyFeelings: ["Tenho facilidade", "Oscilo um pouco", "Quase sempre me perco", "Quero ajuda para manter"],
  heatFrequencies: ["Nunca", "Raramente", "1x por semana", "2x por semana", "3x ou mais por semana"],
  nightHabits: ["Dorme com cabelo solto", "Prende para dormir", "Usa fronha de cetim", "Faz protecao noturna", "Acorda e faz refresh"],
  protectiveStyles: ["Lace", "Trancas", "Dread", "Nina soft", "Natural solto", "Twist", "Braid-out"],
  protectiveStyleDuration: ["Menos de 2 semanas", "2 a 4 semanas", "1 a 2 meses", "Mais de 2 meses", "Nao se aplica"],
  chemicalProcesses: ["Coloracao", "Descoloracao", "Relaxamento", "Progressiva", "Botox", "Nenhuma"],
  goals: [
    "Mais hidratacao",
    "Mais definicao",
    "Reduzir quebra",
    "Controlar oleosidade",
    "Cuidar do couro cabeludo",
    "Manter o estilo protetivo",
    "Crescimento saudavel",
    "Brilho e maciez",
  ],
  challenges: [
    "Frizz frequente",
    "Ressecamento recorrente",
    "Queda ou quebra",
    "Oleosidade na raiz",
    "Pontas asperas",
    "Sensibilidade no couro cabeludo",
    "Manter lace ou trancas bonitas",
    "Falta de tempo para cuidar",
  ],
  climates: ["Seco", "Equilibrado", "Umido", "Muito quente", "Frio", "Litoraneo"],
  dayResults: ["Mais definicao", "Mais volume", "Mais praticidade", "Retencao de crescimento", "Brilho e leveza", "Menos frizz", "Durar bonito ate o fim do dia"],
  feelings: ["Confiante", "Em reconstrucao", "Frustrada", "Curiosa", "Cansada de testar", "Carinhosa com meu cabelo", "Desconectada dele"],
  knowledgeLevels: ["Entendo bem meu cabelo", "Entendo algumas coisas", "Ainda fico confusa", "Quero aprender do zero"],
  productCategories: ["Mascara", "Leave-in", "Oleo", "Shampoo", "Tonico", "Protetor termico", "Spray de couro cabeludo"],
};

const emptyUserContext: UserContext = {
  selectedSymptoms: [],
  completedSteps: [],
  selectedProducts: [],
  selectedHabits: [],
  dailyNote: "",
  photoLogged: false,
  weeklyCareSessions: 2,
  humidity: 60,
  temperature: 24,
  remindersEnabled: true,
  history: [],
};

export function createInitialUiState(): PersistedState {
  return {
    recommendationFilter: "Todos",
    progressRange: "30 dias",
    user: emptyUserContext,
  };
}

export function createInitialOnboardingDraft(email = ""): OnboardingDraft {
  const fallbackName = email.split("@")[0]?.replace(/[._-]+/g, " ") || "";
  return {
    displayName: fallbackName ? titleCase(fallbackName) : "",
    ageRange: "",
    genderIdentity: "",
    hairType: "",
    isTransitioning: false,
    texture: "",
    porosity: "",
    density: "",
    volumePerception: "",
    currentLength: "",
    scalpOiliness: "",
    washFrequency: "",
    careFrequency: "",
    timeAvailable: "",
    routinePreference: "",
    consistencyFeeling: "",
    blowDryerFrequency: "Nunca",
    flatIronFrequency: "Nunca",
    nighttimeHabits: [],
    sleepsWithBonnet: false,
    usesHairProtection: false,
    protectiveStyles: [],
    protectiveStyleDuration: "",
    washesWhileProtectiveStyle: null,
    chemicalProcesses: [],
    currentGoals: [],
    desiredDayToDayResults: [],
    mainChallenges: [],
    recurringSymptoms: [],
    regionClimate: "",
    cityOrRegion: "",
    climateImpactsHair: null,
    feelingsAboutHair: [],
    hairKnowledgeLevel: "",
    notes: "",
    productsText: "",
  };
}

export function parseProductsText(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isOnboardingComplete(profile: DbProfile | null) {
  return Boolean(profile?.onboarding_completed_at);
}

export async function loadUserWorkspace(userId: string) {
  const profile = await supabaseApi.getById<DbProfile>("raiz_profiles", userId, "user_id");

  const productsQuery = await supabaseApi.list<DbProduct>("raiz_products", {
    filters: [{ column: "user_id", value: userId }],
    orderBy: { column: "created_at", ascending: true },
  });

  const checkinsQuery = await supabaseApi.list<DbCheckin>("raiz_checkins", {
    filters: [{ column: "user_id", value: userId }],
    orderBy: { column: "checkin_date", ascending: true },
    range: { from: 0, to: 89 },
  });

  return {
    profile,
    products: productsQuery.data ?? [],
    checkins: checkinsQuery.data ?? [],
  };
}

export async function saveOnboarding(userId: string, draft: OnboardingDraft) {
  const productNames = parseProductsText(draft.productsText);

  const profilePayload: Database["public"]["Tables"]["raiz_profiles"]["Insert"] = {
    user_id: userId,
    display_name: draft.displayName.trim(),
    age_range: draft.ageRange || null,
    gender_identity: draft.genderIdentity || null,
    hair_type: draft.hairType,
    is_transitioning: draft.isTransitioning,
    texture: draft.texture,
    porosity: draft.porosity,
    density: draft.density,
    volume_perception: draft.volumePerception || null,
    current_length: draft.currentLength || null,
    scalp_oiliness: draft.scalpOiliness,
    wash_frequency: draft.washFrequency,
    care_frequency: draft.careFrequency,
    time_available: draft.timeAvailable || null,
    routine_preference: draft.routinePreference || null,
    consistency_feeling: draft.consistencyFeeling || null,
    blow_dryer_frequency: draft.blowDryerFrequency,
    flat_iron_frequency: draft.flatIronFrequency,
    nighttime_habits: draft.nighttimeHabits,
    sleeps_with_bonnet: draft.sleepsWithBonnet,
    uses_hair_protection: draft.usesHairProtection,
    protective_styles: draft.protectiveStyles,
    protective_style_duration: draft.protectiveStyleDuration || null,
    washes_while_protective_style: draft.washesWhileProtectiveStyle,
    chemical_processes: draft.chemicalProcesses,
    current_goals: draft.currentGoals,
    desired_day_to_day_results: draft.desiredDayToDayResults,
    main_challenges: draft.mainChallenges,
    recurring_symptoms: draft.recurringSymptoms,
    region_climate: draft.regionClimate,
    city_or_region: draft.cityOrRegion.trim() || null,
    climate_impacts_hair: draft.climateImpactsHair,
    feelings_about_hair: draft.feelingsAboutHair,
    hair_knowledge_level: draft.hairKnowledgeLevel || null,
    notes: draft.notes.trim() || null,
    reminders_enabled: true,
    onboarding_completed_at: new Date().toISOString(),
  };

  await supabaseApi.client().from("raiz_profiles").upsert(profilePayload).select().single();

  await supabaseApi.remove("raiz_products", { user_id: userId });

  if (productNames.length) {
    const productPayload = productNames.map((name) => ({
      user_id: userId,
      name,
      category: inferProductCategory(name),
      brand: null,
      purpose: inferProductPurpose(name),
      is_active: true,
    }));

    await supabaseApi.insertMany("raiz_products", productPayload);
  }
}

export async function persistCheckin(
  userId: string,
  draft: QuickCheckinDraft,
  currentUser: UserContext,
  analysis: AnalysisContext,
  profile: Profile,
) {
  const payload: Database["public"]["Tables"]["raiz_checkins"]["Insert"] = {
    user_id: userId,
    checkin_date: new Date().toISOString().slice(0, 10),
    humidity: currentUser.humidity,
    temperature: currentUser.temperature,
    selected_symptoms: draft.selectedSymptoms,
    completed_steps: draft.completedSteps.map((stepId) => ({ id: stepId })),
    selected_product_ids: draft.selectedProducts,
    selected_habits: draft.selectedHabits,
    daily_note: draft.dailyNote,
    photo_logged: draft.photoLogged,
    hydration_score: analysis.scores.hydration,
    strength_score: analysis.scores.strength,
    definition_score: analysis.scores.definition,
    ends_score: analysis.scores.ends,
    overall_score: analysis.overallScore,
    summary_title: analysis.summaryTitle,
    summary_description: analysis.summaryDescription,
    focus_label: profile.currentGoal ? `${analysis.focusLabel} · ${profile.currentGoal}` : analysis.focusLabel,
  };

  await supabaseApi.client()
    .from("raiz_checkins")
    .upsert(payload, { onConflict: "user_id,checkin_date" })
    .select()
    .single();
}

export function mapProfileRecordToProfile(record: DbProfile, fallbackName: string): Profile {
  const name = record.display_name?.trim() || fallbackName || "Voce";
  const accent = profileAccent(record);
  const subtitleParts = [record.hair_type, record.porosity.toLowerCase(), record.region_climate.toLowerCase()].filter(Boolean);

  return {
    id: record.user_id,
    name,
    subtitle: subtitleParts.join(" · "),
    accent,
    softAccent: accentSoft(accent),
    texture: record.texture,
    porosity: record.porosity,
    density: record.density,
    currentGoal: record.current_goals[0] ?? "Cuidado personalizado",
    baseScores: buildBaseScores(record),
    scalpOiliness: record.scalp_oiliness,
    styles: record.protective_styles,
    chemistry: record.chemical_processes,
    climateRegion: record.region_climate,
  };
}

export function mapProductRecordsToProducts(records: DbProduct[]): Product[] {
  return records.map((product) => ({
    id: product.id,
    type: normalizeProductType(product.category),
    name: product.name,
    label: shortenName(product.name),
    description: product.purpose ?? buildProductDescription(product.category),
    effects: buildProductEffects(product.category),
  }));
}

export function mapWorkspaceToUiState(
  profileRecord: DbProfile,
  checkins: DbCheckin[],
): PersistedState {
  const latest = checkins.at(-1);
  const history = checkins.map((entry) => ({
    date: entry.checkin_date,
    hydration: entry.hydration_score,
    strength: entry.strength_score,
    definition: entry.definition_score,
    ends: entry.ends_score,
    symptoms: entry.selected_symptoms,
    completedSteps: parseCompletedSteps(entry.completed_steps),
    products: entry.selected_product_ids,
    habits: entry.selected_habits,
    note: entry.daily_note,
    photoLogged: entry.photo_logged,
    humidity: entry.humidity,
    temperature: entry.temperature,
  }));

  return {
    recommendationFilter: "Todos",
    progressRange: "30 dias",
    user: {
      selectedSymptoms: latest?.selected_symptoms ?? profileRecord.recurring_symptoms ?? [],
      completedSteps: latest ? parseCompletedSteps(latest.completed_steps) : [],
      selectedProducts: latest?.selected_product_ids ?? [],
      selectedHabits: latest?.selected_habits ?? deriveInitialHabits(profileRecord),
      dailyNote: latest?.daily_note ?? "",
      photoLogged: latest?.photo_logged ?? false,
      weeklyCareSessions: frequencyToCount(profileRecord.care_frequency),
      humidity: latest?.humidity ?? climateToHumidity(profileRecord.region_climate),
      temperature: latest?.temperature ?? climateToTemperature(profileRecord.region_climate),
      remindersEnabled: profileRecord.reminders_enabled,
      history,
    },
  };
}

export function buildRoutineSteps(profile: Profile, products: Product[]): RoutineStep[] {
  const styleSet = new Set(profile.styles.map(normalizeToken));
  const chemistrySet = new Set(profile.chemistry.map(normalizeToken));

  if (["lace", "trancas", "dread", "nina soft"].some((style) => styleSet.has(normalizeToken(style)))) {
    return [
      {
        id: "scalp-cleanse",
        title: "Higienizar o couro com suavidade",
        hint: "Mantem o couro cabeludo limpo sem comprometer o estilo protetivo.",
        duration: "6 min",
        benefits: { strength: 4, definition: 2 },
      },
      {
        id: "hydration-mist",
        title: "Replicar hidratacao leve na base e no comprimento",
        hint: "Use spray, tonico ou creme leve para devolver conforto e maciez.",
        duration: "5 min",
        benefits: { hydration: 7, ends: 4 },
      },
      {
        id: "protective-seal",
        title: "Selar e reduzir atrito",
        hint: "Uma camada leve ajuda a proteger acabamento, baby hair e pontos de tensao.",
        duration: "3 min",
        benefits: { ends: 6, strength: 4 },
      },
      {
        id: "style-check",
        title: "Observar tensao, brilho e conforto do estilo",
        hint: "Cheque raiz, nuca e bordas para evitar incomodo acumulado.",
        duration: "2 min",
        benefits: { definition: 3, strength: 3 },
      },
    ];
  }

  if (chemistrySet.size) {
    return [
      {
        id: "gentle-wash",
        title: "Lavar com limpeza gentil",
        hint: "Preserva o fio sensibilizado e evita ressecar ainda mais.",
        duration: "5 min",
        benefits: { strength: 3, definition: 2 },
      },
      {
        id: "repair-mask",
        title: "Aplicar tratamento de reparacao",
        hint: "Foque em formula hidratante com reforco estrutural equilibrado.",
        duration: "12 min",
        benefits: { hydration: 5, strength: 8, ends: 3 },
      },
      {
        id: "leave-in-protection",
        title: "Finalizar com protecao e elasticidade",
        hint: "O leave-in certo ajuda a manter maleabilidade e menos quebra no dia.",
        duration: "4 min",
        benefits: { definition: 5, ends: 6 },
      },
      {
        id: "heat-guard",
        title: "Blindar contra calor e friccao",
        hint: "Mesmo sem calor hoje, proteger reduz dano acumulado.",
        duration: "2 min",
        benefits: { strength: 4, ends: 4 },
      },
    ];
  }

  const oilProduct = products.find((product) => product.type === "oil");
  return [
    {
      id: "wash",
      title: profile.scalpOiliness === "Oleoso" ? "Lavar com shampoo equilibrante" : "Lavar com shampoo suave",
      hint: profile.scalpOiliness === "Oleoso" ? "Ajuda a regular a raiz sem sacrificar o comprimento." : "Remove residuos sem sensibilizar o fio.",
      duration: "5 min",
      benefits: { strength: 3, definition: 2 },
    },
    {
      id: "mask",
      title: "Mascara de tratamento guiado",
      hint: profile.porosity === "Alta" ? "Reposicao de agua e alguma selagem ajudam muito no seu perfil." : "Mantenha maciez e elasticidade sem pesar.",
      duration: "10 min",
      benefits: { hydration: 8, ends: 3 },
    },
    {
      id: "finish",
      title: "Finalizar com creme ou leave-in",
      hint: "Segura frizz e melhora a definicao ao longo do dia.",
      duration: "4 min",
      benefits: { definition: 7, hydration: 2 },
    },
    {
      id: "seal",
      title: oilProduct ? `Selar com ${oilProduct.label.toLowerCase()}` : "Proteger com oleo leve",
      hint: "Sela a fibra e reduz atrito nas pontas.",
      duration: "2 min",
      benefits: { ends: 7, strength: 4 },
    },
  ];
}

export function buildAnalysis(profile: Profile, user: UserContext, products: Product[], routineSteps: RoutineStep[]): AnalysisContext {
  const completionRatio = routineSteps.length ? user.completedSteps.length / routineSteps.length : 0;
  const productEffects = sumMetricEffects(products.filter((product) => user.selectedProducts.includes(product.id)).map((product) => product.effects));
  const routineEffects = sumMetricEffects(routineSteps.filter((step) => user.completedSteps.includes(step.id)).map((step) => step.benefits));
  const symptomEffects = sumMetricEffects(symptomLibrary.filter((symptom) => user.selectedSymptoms.includes(symptom.id)).map((symptom) => symptom.impact));
  const habitEffects = getHabitEffects(user.selectedHabits);
  const climateLabel = getClimateLabel(user.humidity);
  const climateEffects = getClimateEffects(user.humidity, user.temperature, profile);
  const consistencyScore = clamp(
    42 + user.weeklyCareSessions * 7 + Math.round(completionRatio * 18) + user.selectedHabits.length * 2 + user.history.length,
    0,
    100,
  );
  const historyTrend = getHistoryTrend(user.history);

  const scores = normalizeScores({
    hydration:
      profile.baseScores.hydration +
      routineEffects.hydration +
      productEffects.hydration +
      symptomEffects.hydration +
      habitEffects.hydration +
      climateEffects.hydration +
      Math.round(historyTrend / 2),
    strength:
      profile.baseScores.strength +
      routineEffects.strength +
      productEffects.strength +
      symptomEffects.strength +
      habitEffects.strength +
      climateEffects.strength +
      Math.round(historyTrend / 2),
    definition:
      profile.baseScores.definition +
      routineEffects.definition +
      productEffects.definition +
      symptomEffects.definition +
      habitEffects.definition +
      climateEffects.definition +
      Math.round(historyTrend / 2),
    ends:
      profile.baseScores.ends +
      routineEffects.ends +
      productEffects.ends +
      symptomEffects.ends +
      habitEffects.ends +
      climateEffects.ends +
      Math.round(historyTrend / 2),
  });

  const overallScore = Math.round((scores.hydration + scores.strength + scores.definition + scores.ends) / 4);
  const topConcerns = getTopConcerns(scores);
  const focusLabel = buildFocusLabel(profile, topConcerns, overallScore);
  const summaryTitle = buildSummaryTitle(profile, topConcerns, climateLabel, completionRatio);
  const summaryDescription = buildSummaryDescription(profile, topConcerns, climateLabel, consistencyScore);
  const insights = buildInsights(profile, topConcerns, user, scores, climateLabel, historyTrend);

  return {
    profile,
    user,
    scores,
    completionRatio,
    climateLabel,
    consistencyScore,
    overallScore,
    progressDelta: historyTrend,
    topConcerns,
    summaryTitle,
    summaryDescription,
    focusLabel,
    insights,
  };
}

export function buildRecommendations(profile: Profile, analysis: AnalysisContext, products: Product[]): Recommendation[] {
  const styleSet = new Set(profile.styles.map(normalizeToken));
  const chemistrySet = new Set(profile.chemistry.map(normalizeToken));

  const items: Recommendation[] = [
    {
      id: "hydrate-now",
      title: profile.porosity === "Alta" ? "Seu perfil pede reposicao de agua com selagem inteligente" : "Seu cabelo responde bem a hidratacao leve hoje",
      description:
        profile.porosity === "Alta"
          ? "Seu contexto atual indica perda de agua facil. Hidratacao com selagem leve tende a render mais."
          : "A combinacao entre sintomas e rotina mostra que maciez e toque vao responder bem a uma reposicao equilibrada.",
      category: "Produtos",
      cta: "Ver combinacao",
      icon: "🧴",
      ranking: 80 - analysis.scores.hydration + (analysis.user.selectedSymptoms.includes("ressecado") ? 12 : 0),
    },
    {
      id: "repair-structure",
      title: chemistrySet.size ? "Seu fio quimicamente tratado precisa de reparacao com delicadeza" : "Reforco estrutural para conter quebra",
      description:
        chemistrySet.size
          ? "Como ha quimica no seu contexto, a reconstruicao precisa ser bem dosada para fortalecer sem endurecer."
          : "Seu historico mostra que reforco estrutural e menos atrito podem proteger melhor sua fibra agora.",
      category: "Rotina",
      cta: "Abrir rotina",
      icon: "🛠",
      ranking: 82 - analysis.scores.strength + (analysis.user.selectedSymptoms.includes("quebra") ? 10 : 0),
    },
    {
      id: "scalp-balance",
      title: "Seu couro cabeludo pede uma leitura mais cuidadosa hoje",
      description: "Oleosidade, clima e frequencia de lavagem sugerem ajustar conforto do couro e leveza da raiz.",
      category: "Habitos",
      cta: "Quero testar",
      icon: "🌿",
      ranking: profile.scalpOiliness === "Oleoso" ? 76 - analysis.scores.definition + 12 : 54 - analysis.scores.strength,
    },
    {
      id: "style-protection",
      title: "Seu estilo atual precisa de manutencao contextual",
      description: "Lace, trancas, dread ou nina soft mudam completamente o jeito ideal de cuidar da base e do comprimento.",
      category: "Rotina",
      cta: "Ver rotina personalizada",
      icon: "🪮",
      ranking: styleSet.size ? 85 - analysis.consistencyScore / 2 : 10,
    },
    {
      id: "consistency-habit",
      title: "Sua frequencia de cuidados ainda pode trabalhar a seu favor",
      description: "Mais regularidade ajuda o app a diferenciar clima, produto e resposta real do seu cabelo.",
      category: "Habitos",
      cta: "Montar frequencia",
      icon: "🗓",
      ranking: 76 - analysis.consistencyScore,
    },
    {
      id: "heat-protection",
      title: "O uso de calor pede uma blindagem melhor da fibra",
      description: "Quando secador ou chapinha entram na rotina, termoprotecao e reposicao de elasticidade viram prioridade.",
      category: "Produtos",
      cta: "Ver sugestoes",
      icon: "🔥",
      ranking:
        profile.currentGoal.toLowerCase().includes("forca") || normalizeToken(profile.subtitle).includes("oleosa")
          ? 40
          : 20,
    },
  ];

  const filtered = items
    .filter((item) => {
      if (item.id === "style-protection" && !styleSet.size) return false;
      if (item.id === "heat-protection" && !usesFrequentHeat(profile)) return false;
      return true;
    })
    .map((item) => ({
      ...item,
      ranking: item.id === "heat-protection" ? item.ranking + (products.some((product) => product.type === "protective") ? 6 : 12) : item.ranking,
    }))
    .sort((a, b) => b.ranking - a.ranking || a.title.localeCompare(b.title));

  return filtered;
}

export function buildRecommendationModalData(
  recommendation: Recommendation,
  analysis: AnalysisContext,
  products: Product[],
  profile: Profile,
): RecommendationModalData {
  const missingData: string[] = [];

  if (products.length < 2) {
    missingData.push("Cadastre os produtos que realmente entram na sua rotina para o app diferenciar sugestao ideal de sugestao apenas possivel.");
  }
  if (analysis.user.history.length < 5) {
    missingData.push("Com mais check-ins o sistema vai separar melhor o que vem do clima, do estilo atual e do efeito real dos produtos.");
  }
  if (!analysis.user.selectedSymptoms.length) {
    missingData.push("Marcar sintomas do dia deixa a leitura menos generica e muito mais fiel ao estado atual do seu cabelo.");
  }

  if (recommendation.id === "style-protection") {
    return {
      title: recommendation.title,
      subtitle: "Leitura guiada pelo seu estilo atual",
      reason: `Seu perfil indica ${profile.styles.join(", ").toLowerCase()} e isso muda o eixo do cuidado. O sistema priorizou conforto da base, limpeza correta e manutencao do estilo antes de rotinas genericas para cabelo solto.`,
      protocolTitle: "Ajuste pratico para hoje",
      protocolSteps: [
        "Observe base, nuca e bordas antes de decidir produto ou frequencia.",
        "Priorize limpeza gentil do couro e hidratacao leve em vez de peso acumulado.",
        "Se houver tensao, coceira ou descamacao, reduza manipulacao e reavalie o tempo entre manutencoes.",
      ],
      matchedProducts: products.filter((product) => product.type === "tonic" || product.type === "scalp-care" || product.type === "protective"),
      whyNow: [
        `Seu estilo atual pede leitura diferente de um cabelo natural solto.`,
        `Consistencia atual em ${analysis.consistencyScore} pontos.`,
        `O sistema cruzou estilo, frequencia, sintomas e historico recente para montar esse protocolo.`,
      ],
      gaps: missingData,
    };
  }

  if (recommendation.id === "repair-structure") {
    return {
      title: recommendation.title,
      subtitle: "Protecao de fibra com contexto real",
      reason: `Forca e pontas estao entre os pontos mais sensiveis agora. O app cruzou quebra marcada, frequencia de cuidados, historico e sinais do seu perfil para evitar uma recomendacao pesada demais.`,
      protocolTitle: "Protocolo sugerido para hoje",
      protocolSteps: [
        "Reforce a fibra apenas no nivel que seu historico aguenta hoje.",
        "Reduza atrito em finalizacao e sono para nao desperdiçar o tratamento.",
        "Se houve calor ou quimica recente, prefira combinacoes que preservem elasticidade.",
      ],
      matchedProducts: products.filter((product) => product.type === "mask" || product.type === "oil" || product.type === "protective"),
      whyNow: [
        `Forca atual em ${analysis.scores.strength}% e pontas em ${analysis.scores.ends}%.`,
        `Seu historico recente mudou ${analysis.progressDelta} pontos.`,
        `O sistema priorizou seguranca de fibra antes de excesso de tratamento.`,
      ],
      gaps: missingData,
    };
  }

  if (recommendation.id === "scalp-balance") {
    return {
      title: recommendation.title,
      subtitle: "Couro cabeludo no centro da leitura",
      reason: `Seu perfil atual junta ${profile.scalpOiliness.toLowerCase()} com clima ${analysis.climateLabel}. Isso altera conforto, frequencia de lavagem e leveza da finalizacao.`,
      protocolTitle: "Como ajustar sem pesar",
      protocolSteps: [
        "Reavalie se a raiz precisa de limpeza ou apenas reequilibrio.",
        "Evite empilhar muito produto na base se a oleosidade sobe rapido.",
        "Registre se o desconforto aparece junto de clima, suor, lace ou manutencao do estilo.",
      ],
      matchedProducts: products.filter((product) => product.type === "shampoo" || product.type === "tonic" || product.type === "scalp-care"),
      whyNow: [
        `Umidade atual em ${analysis.user.humidity}% e temperatura em ${analysis.user.temperature} C.`,
        `Seu couro cabeludo influencia diretamente definicao, conforto e tempo entre lavagens.`,
        `Essa leitura usa perfil, clima e sintomas do dia ao mesmo tempo.`,
      ],
      gaps: missingData,
    };
  }

  return {
    title: recommendation.title,
    subtitle: "Combinacao guiada pelo seu contexto",
    reason: `O sistema cruzou porosidade, objetivos, sintomas atuais, consistencia e historico para chegar a essa direcao. A recomendacao existe porque o seu perfil real sustenta esse ajuste hoje.`,
    protocolTitle: "Proximo movimento sugerido",
    protocolSteps: [
      "Escolha o produto ou habito com mais aderencia ao seu momento de hoje.",
      "Observe se o resultado muda quando voce distribui melhor os cuidados pela semana.",
      "Continue registrando sintomas e produtos para o app reduzir ruído e aumentar a precisao.",
    ],
    matchedProducts: products.slice(0, 3),
    whyNow: [
      `Top preocupacoes atuais: ${analysis.topConcerns.join(" e ")}.`,
      `Score geral em ${analysis.overallScore}% com consistencia em ${analysis.consistencyScore} pontos.`,
      `Seu objetivo principal hoje e ${profile.currentGoal.toLowerCase()}.`,
    ],
    gaps: missingData,
  };
}

export function syncHistory(
  user: UserContext,
  profile: Profile,
  products: Product[],
  routineSteps: RoutineStep[],
): UserContext {
  const today = new Date().toISOString().slice(0, 10);
  const scores = buildAnalysis(profile, { ...user, history: user.history }, products, routineSteps).scores;

  const todaysEntry: HistoryEntry = {
    date: today,
    hydration: scores.hydration,
    strength: scores.strength,
    definition: scores.definition,
    ends: scores.ends,
    symptoms: user.selectedSymptoms,
    completedSteps: user.completedSteps,
    products: user.selectedProducts,
    habits: user.selectedHabits,
    note: user.dailyNote,
    photoLogged: user.photoLogged,
    humidity: user.humidity,
    temperature: user.temperature,
  };

  const withoutToday = user.history.filter((entry) => entry.date !== today);
  return {
    ...user,
    history: [...withoutToday, todaysEntry].sort((a, b) => a.date.localeCompare(b.date)).slice(-30),
  };
}

export function buildSeriesFromHistory(history: HistoryEntry[], count: number) {
  if (!history.length) return [50];
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const series = sorted.map((entry) => Math.round((entry.hydration + entry.strength + entry.definition + entry.ends) / 4));
  if (count <= series.length) return series.slice(-count);

  const padded = [...series];
  while (padded.length < count) {
    padded.unshift(padded[0]);
  }
  return padded;
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parseCompletedSteps(value: Json) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "object" && item && "id" in item ? String((item as { id: unknown }).id) : ""))
    .filter(Boolean);
}

function inferProductCategory(name: string) {
  const normalized = normalizeToken(name);
  if (normalized.includes("oleo")) return "Oleo";
  if (normalized.includes("leave") || normalized.includes("creme")) return "Leave-in";
  if (normalized.includes("tonic") || normalized.includes("tonico")) return "Tonico";
  if (normalized.includes("shampoo")) return "Shampoo";
  if (normalized.includes("term")) return "Protetor termico";
  if (normalized.includes("spray")) return "Spray de couro cabeludo";
  return "Mascara";
}

function inferProductPurpose(name: string) {
  const normalized = normalizeToken(name);
  if (normalized.includes("oleo")) return "selar e reduzir aspereza";
  if (normalized.includes("leave") || normalized.includes("creme")) return "definir e proteger no dia";
  if (normalized.includes("shampoo")) return "limpar sem sensibilizar";
  if (normalized.includes("tonic") || normalized.includes("tonico")) return "equilibrar o couro cabeludo";
  return "tratar e responder ao seu momento atual";
}

function profileAccent(record: DbProfile) {
  const type = normalizeToken(record.hair_type);
  if (type.includes("crespo")) return "#f2568a";
  if (type.includes("cacheado")) return "#8e66ff";
  if (type.includes("ondulado")) return "#37a87d";
  if (record.protective_styles.length) return "#d1648a";
  return "#f2568a";
}

function accentSoft(accent: string) {
  if (accent === "#8e66ff") return "#f4efff";
  if (accent === "#37a87d") return "#eefaf5";
  return "#fff0f5";
}

function buildBaseScores(record: DbProfile): MetricScores {
  let hydration = 66;
  let strength = 64;
  let definition = 65;
  let ends = 63;

  if (record.porosity === "Alta") {
    hydration -= 8;
    ends -= 6;
  }
  if (record.porosity === "Baixa") {
    definition += 4;
  }
  if (record.scalp_oiliness === "Oleoso") {
    definition -= 3;
  }
  if (record.chemical_processes.some((item) => normalizeToken(item) !== "nenhuma")) {
    strength -= 8;
    ends -= 6;
  }
  if (record.protective_styles.some((item) => !["natural solto", "braid-out"].includes(normalizeToken(item)))) {
    strength += 2;
    definition -= 2;
  }
  if (["2x por semana", "3x ou mais por semana"].includes(record.flat_iron_frequency) || ["2x por semana", "3x ou mais por semana"].includes(record.blow_dryer_frequency)) {
    hydration -= 5;
    ends -= 4;
  }

  return normalizeScores({ hydration, strength, definition, ends });
}

function normalizeProductType(category: string): ProductType {
  const normalized = normalizeToken(category);
  if (normalized.includes("oleo")) return "oil";
  if (normalized.includes("leave")) return "leave-in";
  if (normalized.includes("shampoo")) return "shampoo";
  if (normalized.includes("tonic") || normalized.includes("tonico")) return "tonic";
  if (normalized.includes("term")) return "protective";
  if (normalized.includes("spray")) return "scalp-care";
  return "mask";
}

function shortenName(value: string) {
  return value.length > 14 ? value.slice(0, 14).trim() : value;
}

function buildProductDescription(category: string) {
  const normalized = normalizeToken(category);
  if (normalized.includes("oleo")) return "ajuda a selar e proteger as pontas";
  if (normalized.includes("leave")) return "segura definicao e conforto ao longo do dia";
  if (normalized.includes("shampoo")) return "limpa respeitando o equilibrio do fio";
  if (normalized.includes("tonic") || normalized.includes("tonico")) return "cuida do couro cabeludo e da raiz";
  return "entra como apoio principal no seu protocolo";
}

function buildProductEffects(category: string): Partial<MetricScores> {
  const normalized = normalizeToken(category);
  if (normalized.includes("oleo")) return { ends: 10, hydration: 3 };
  if (normalized.includes("leave")) return { definition: 10, hydration: 3 };
  if (normalized.includes("shampoo")) return { strength: 3, definition: 2 };
  if (normalized.includes("tonic") || normalized.includes("tonico")) return { strength: 4, definition: 2 };
  if (normalized.includes("term")) return { strength: 5, ends: 4 };
  if (normalized.includes("spray")) return { hydration: 5, strength: 2 };
  return { hydration: 12, definition: 2, ends: 3 };
}

function deriveInitialHabits(profile: DbProfile) {
  const habits = new Set<string>();
  if (profile.sleeps_with_bonnet) habits.add("touca-satin");
  if (profile.uses_hair_protection) habits.add("termoprotecao");
  if (profile.nighttime_habits.some((item) => normalizeToken(item).includes("cetim"))) habits.add("fronha-cetim");
  if (profile.protective_styles.some((item) => !["natural solto", "braid-out"].includes(normalizeToken(item)))) habits.add("manutencao-estilo");
  return Array.from(habits);
}

function frequencyToCount(value: string) {
  if (value.startsWith("1x")) return 1;
  if (value.startsWith("2x")) return 2;
  if (value.startsWith("3x")) return 3;
  if (value.startsWith("4x")) return 4;
  if (normalizeToken(value).includes("dia sim")) return 4;
  if (normalizeToken(value).includes("diariamente")) return 7;
  return 2;
}

function climateToHumidity(value: string) {
  const normalized = normalizeToken(value);
  if (normalized.includes("seco")) return 36;
  if (normalized.includes("umido") || normalized.includes("litoraneo")) return 78;
  return 60;
}

function climateToTemperature(value: string) {
  const normalized = normalizeToken(value);
  if (normalized.includes("frio")) return 18;
  if (normalized.includes("muito quente")) return 31;
  return 24;
}

function usesFrequentHeat(profile: Profile) {
  return profile.currentGoal.toLowerCase().includes("term") || profile.chemistry.some((item) => normalizeToken(item).includes("color"));
}

function sumMetricEffects(items: Partial<MetricScores>[]) {
  return items.reduce<MetricScores>(
    (acc, item) => ({
      hydration: acc.hydration + (item.hydration ?? 0),
      strength: acc.strength + (item.strength ?? 0),
      definition: acc.definition + (item.definition ?? 0),
      ends: acc.ends + (item.ends ?? 0),
    }),
    { hydration: 0, strength: 0, definition: 0, ends: 0 },
  );
}

function normalizeScores(scores: MetricScores): MetricScores {
  return {
    hydration: clamp(Math.round(scores.hydration), 18, 98),
    strength: clamp(Math.round(scores.strength), 18, 98),
    definition: clamp(Math.round(scores.definition), 18, 98),
    ends: clamp(Math.round(scores.ends), 18, 98),
  };
}

function getClimateLabel(humidity: number): ClimateLabel {
  if (humidity < 45) return "seco";
  if (humidity > 70) return "umido";
  return "equilibrado";
}

function getClimateEffects(humidity: number, temperature: number, profile: Profile): MetricScores {
  let hydration = 0;
  let strength = 0;
  let definition = 0;
  let ends = 0;

  if (humidity < 45) {
    hydration -= 8;
    ends -= 6;
  }
  if (humidity > 70) {
    definition -= 8;
    if (profile.scalpOiliness === "Oleoso") definition -= 3;
  }
  if (temperature > 30) {
    hydration -= 4;
    ends -= 3;
  }
  if (temperature < 18) {
    strength -= 2;
  }

  return { hydration, strength, definition, ends };
}

function getHabitEffects(selectedHabits: HabitId[]): MetricScores {
  return selectedHabits.reduce<MetricScores>(
    (acc, habitId) => {
      if (habitId === "fronha-cetim" || habitId === "touca-satin") {
        acc.ends += 4;
        acc.definition += 3;
      }
      if (habitId === "baixa-manipulacao") {
        acc.definition += 5;
        acc.strength += 2;
      }
      if (habitId === "protecao-noturna") {
        acc.ends += 5;
        acc.hydration += 2;
      }
      if (habitId === "difusor-frio") {
        acc.definition += 4;
      }
      if (habitId === "termoprotecao") {
        acc.strength += 5;
        acc.ends += 4;
      }
      if (habitId === "massagem-couro") {
        acc.strength += 2;
      }
      if (habitId === "manutencao-estilo") {
        acc.definition += 2;
        acc.strength += 3;
      }
      return acc;
    },
    { hydration: 0, strength: 0, definition: 0, ends: 0 },
  );
}

function getHistoryTrend(history: HistoryEntry[]) {
  if (history.length < 2) return 0;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-3);
  const previous = sorted.slice(-6, -3);
  if (!previous.length) return 0;
  const recentAvg = averageScore(recent);
  const previousAvg = averageScore(previous);
  return Math.round(recentAvg - previousAvg);
}

function averageScore(entries: HistoryEntry[]) {
  const totals = entries.reduce((acc, entry) => acc + (entry.hydration + entry.strength + entry.definition + entry.ends) / 4, 0);
  return totals / entries.length;
}

function getTopConcerns(scores: MetricScores) {
  return Object.entries(scores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([key]) => {
      if (key === "hydration") return "hidratacao";
      if (key === "strength") return "forca";
      if (key === "definition") return "definicao";
      return "pontas";
    });
}

function buildFocusLabel(profile: Profile, topConcerns: string[], overallScore: number) {
  if (profile.styles.length) return "Manutencao guiada do estilo";
  if (overallScore >= 74) return "Equilibrio guiado";
  if (topConcerns.includes("hidratacao") && topConcerns.includes("pontas")) return "Hidratacao + selagem";
  if (topConcerns.includes("forca")) return "Reforco estrutural";
  if (topConcerns.includes("definicao")) return "Definicao com controle";
  return "Cuidado personalizado";
}

function buildSummaryTitle(profile: Profile, topConcerns: string[], climateLabel: ClimateLabel, completionRatio: number) {
  if (profile.styles.length) return "Seu estilo atual pede manutencao e conforto da base";
  if (completionRatio < 0.5) return "Seu cabelo precisa de mais consistencia hoje";
  if (topConcerns.includes("hidratacao")) return "Seu cabelo esta pedindo mais agua e maciez";
  if (topConcerns.includes("forca")) return "Sua fibra precisa de protecao e menos atrito";
  if (climateLabel === "umido") return "O clima esta influenciando a definicao hoje";
  return "Seu cabelo esta em evolucao cuidadosa";
}

function buildSummaryDescription(profile: Profile, topConcerns: string[], climateLabel: ClimateLabel, consistencyScore: number) {
  const concernText = topConcerns.join(" e ");
  const climateText =
    climateLabel === "seco"
      ? "O ar seco esta puxando agua do fio."
      : climateLabel === "umido"
        ? "A umidade alta esta interferindo na forma e no acabamento."
        : "O clima esta mais neutro hoje.";

  return `${climateText} O sistema identificou maior necessidade em ${concernText}. Seu contexto de ${profile.currentGoal.toLowerCase()} esta com consistencia em ${consistencyScore} pontos.`;
}

function buildInsights(
  profile: Profile,
  topConcerns: string[],
  user: UserContext,
  scores: MetricScores,
  climateLabel: ClimateLabel,
  progressDelta: number,
) {
  const insights: string[] = [];

  insights.push(
    `Com ${user.completedSteps.length} etapas concluidas, ${user.selectedProducts.length} produto(s) ativo(s) e foco em ${profile.currentGoal.toLowerCase()}, sua resposta mais sensivel hoje esta em ${topConcerns[0]}.`,
  );
  insights.push(
    climateLabel === "umido"
      ? "Como a umidade esta alta, finalizacao leve e selagem ajudam a segurar definicao com menos expansao."
      : climateLabel === "seco"
        ? "Como o clima esta seco, manter agua e protecao na medida certa ajuda a blindar o toque."
        : "Com clima equilibrado, a diferenca de hoje depende mais da sua consistencia e do contexto do estilo atual.",
  );
  insights.push(
    progressDelta >= 0
      ? `Sua media recente subiu ${progressDelta} pontos em relacao ao bloco anterior do historico.`
      : `Sua media recente caiu ${Math.abs(progressDelta)} pontos e merece ajuste de frequencia, produto ou manejo.`,
  );
  insights.push(
    `Hoje seus indicadores estao em ${scores.hydration}% de hidratacao, ${scores.strength}% de forca, ${scores.definition}% de definicao e ${scores.ends}% de pontas.`,
  );

  return insights;
}

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
