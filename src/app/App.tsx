import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudSun,
  Droplets,
  Flame,
  Gift,
  Home,
  LineChart,
  ListTodo,
  Minus,
  Plus,
  Scissors,
  Settings2,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { supabaseApi, type Session } from "@/integrations/supabase";
import { useIsMobile } from "@/app/components/ui/use-mobile";
import { HairCharacter } from "./components/HairCharacter";
import {
  buildAnalysis as buildPersonalizedAnalysis,
  buildRecommendationModalData as buildPersonalizedRecommendationModalData,
  buildRecommendations as buildPersonalizedRecommendations,
  buildRoutineSteps as buildPersonalizedRoutineSteps,
  buildSeriesFromHistory as buildPersonalizedSeriesFromHistory,
  createInitialOnboardingDraft,
  createInitialUiState,
  habitLibrary,
  isOnboardingComplete,
  loadUserWorkspace,
  mapProductRecordsToProducts,
  mapProfileRecordToProfile,
  mapWorkspaceToUiState,
  onboardingOptions,
  parseProductsText,
  persistCheckin,
  saveOnboarding,
  symptomLibrary,
  syncHistory as syncPersonalizedHistory,
  type OnboardingDraft as PersonalizedOnboardingDraft,
} from "./raiz-personalization";

type TabKey = "home" | "routine" | "analysis" | "progress" | "recommendations" | "profile";
type ProfileId = string;
type RecommendationFilter = "Todos" | "Rotina" | "Produtos" | "Habitos";
type ProductType = "mask" | "leave-in" | "oil" | "shampoo" | "tonic" | "scalp-care" | "protective";
type ClimateLabel = "seco" | "equilibrado" | "umido";
type HabitId = string;

type Profile = {
  id: ProfileId;
  name: string;
  subtitle: string;
  accent: string;
  softAccent: string;
  texture: string;
  porosity: string;
  density: string;
  currentGoal: string;
  baseScores: MetricScores;
};

type MetricScores = {
  hydration: number;
  strength: number;
  definition: number;
  ends: number;
};

type RoutineStep = {
  id: string;
  title: string;
  hint: string;
  duration: string;
  benefits: Partial<MetricScores>;
};

type Symptom = {
  id: string;
  label: string;
  icon: string;
  impact: Partial<MetricScores>;
};

type Product = {
  id: string;
  type: ProductType;
  name: string;
  label: string;
  description: string;
  effects: Partial<MetricScores>;
};

type HistoryEntry = {
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

type UserContext = {
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

type PersistedState = {
  profileIndex?: number;
  recommendationFilter: RecommendationFilter;
  progressRange: "7 dias" | "30 dias" | "90 dias";
  user: UserContext;
};

type Recommendation = {
  id: string;
  title: string;
  description: string;
  category: RecommendationFilter;
  cta: string;
  icon: string;
  ranking: number;
};

type RecommendationModalData = {
  title: string;
  subtitle: string;
  reason: string;
  protocolTitle: string;
  protocolSteps: string[];
  matchedProducts: Product[];
  whyNow: string[];
  gaps: string[];
  nextActions: Array<{ label: string; tab: TabKey }>;
};

type QuickCheckinDraft = {
  selectedSymptoms: string[];
  selectedProducts: string[];
  completedSteps: string[];
  selectedHabits: HabitId[];
  dailyNote: string;
  photoLogged: boolean;
};

type AnalysisContext = {
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

type FocusMetric = {
  id: keyof MetricScores;
  label: string;
  score: number;
  icon: string;
  tint: string;
  softTint: string;
  shortText: string;
  headline: string;
  message: string;
};

const STORAGE_KEY = "raiz-app-state-v2";

const profiles: Profile[] = [
  {
    id: "crespo",
    name: "Camila",
    subtitle: "Crespo · porosidade media",
    accent: "#f2568a",
    softAccent: "#fff0f5",
    texture: "Crespo",
    porosity: "Media",
    density: "Media",
    currentGoal: "Reduzir quebra nas pontas",
    baseScores: { hydration: 68, strength: 63, definition: 66, ends: 61 },
  },
  {
    id: "cacheado",
    name: "Lia",
    subtitle: "Cacheado · definicao sensivel ao clima",
    accent: "#8e66ff",
    softAccent: "#f4efff",
    texture: "Cacheado",
    porosity: "Baixa",
    density: "Alta",
    currentGoal: "Manter definicao por mais tempo",
    baseScores: { hydration: 70, strength: 60, definition: 72, ends: 58 },
  },
  {
    id: "ondulado",
    name: "Bia",
    subtitle: "Ondulado · raiz oleosa",
    accent: "#37a87d",
    softAccent: "#eefaf5",
    texture: "Ondulado",
    porosity: "Media",
    density: "Leve",
    currentGoal: "Equilibrar raiz e brilho",
    baseScores: { hydration: 62, strength: 59, definition: 64, ends: 60 },
  },
];

const routineSteps: RoutineStep[] = [
  {
    id: "wash",
    title: "Lavar com shampoo suave",
    hint: "Remove residuos sem sensibilizar o fio.",
    duration: "5 min",
    benefits: { strength: 3, definition: 2 },
  },
  {
    id: "mask",
    title: "Mascara de hidratacao",
    hint: "Repõe agua e ajuda a recuperar toque e brilho.",
    duration: "10 min",
    benefits: { hydration: 8, ends: 3 },
  },
  {
    id: "finish",
    title: "Finalizar com creme",
    hint: "Segura frizz e melhora a definicao ao longo do dia.",
    duration: "4 min",
    benefits: { definition: 7, hydration: 2 },
  },
  {
    id: "seal",
    title: "Proteger com oleo leve",
    hint: "Sela a fibra e reduz atrito nas pontas.",
    duration: "2 min",
    benefits: { ends: 7, strength: 4 },
  },
];

const symptoms: Symptom[] = [
  { id: "ressecado", label: "Ressecado", icon: "💧", impact: { hydration: -18, definition: -6, ends: -8 } },
  { id: "frizz", label: "Frizz", icon: "✨", impact: { definition: -18, hydration: -5 } },
  { id: "quebra", label: "Quebra", icon: "✂", impact: { strength: -18, ends: -16 } },
  { id: "sem-brilho", label: "Sem brilho", icon: "◌", impact: { hydration: -10, definition: -7 } },
  { id: "raiz-oleosa", label: "Raiz oleosa", icon: "🌿", impact: { definition: -4, strength: -3 } },
  { id: "sem-volume", label: "Sem volume", icon: "〰", impact: { definition: -12 } },
];

const products: Product[] = [
  {
    id: "aloe-mask",
    type: "mask",
    name: "Mascara com babosa",
    label: "Babosa",
    description: "Boa para devolver agua e maciez sem pesar.",
    effects: { hydration: 12, definition: 2, ends: 3 },
  },
  {
    id: "protein-mask",
    type: "mask",
    name: "Mascara reconstrutora",
    label: "Queratina",
    description: "Ajuda quando a fibra esta fraca e quebrando.",
    effects: { strength: 12, ends: 5 },
  },
  {
    id: "light-leavein",
    type: "leave-in",
    name: "Leave-in leve",
    label: "Leave-in",
    description: "Melhora definicao e controle ao longo do dia.",
    effects: { definition: 10, hydration: 3 },
  },
  {
    id: "argan-oil",
    type: "oil",
    name: "Oleo de argan",
    label: "Argan",
    description: "Sela pontas e reduz toque aspero.",
    effects: { ends: 10, hydration: 3 },
  },
  {
    id: "scalp-tonic",
    type: "tonic",
    name: "Tonico de couro cabeludo",
    label: "Tonico",
    description: "Ajuda a equilibrar desconforto e oleosidade.",
    effects: { strength: 4, definition: 2 },
  },
];

const habits: Array<{ id: HabitId; label: string; description: string }> = [
  { id: "fronha-cetim", label: "Fronha de cetim", description: "reduz atrito durante a noite" },
  { id: "baixa-manipulacao", label: "Baixa manipulacao", description: "evita frizz e quebra ao longo do dia" },
  { id: "protecao-noturna", label: "Protecao noturna", description: "preserva definicao e pontas" },
  { id: "difusor-frio", label: "Difusor frio", description: "ajuda a segurar forma sem ressecar" },
];

const tabs: Array<{ key: TabKey; label: string; icon: typeof Home }> = [
  { key: "home", label: "Inicio", icon: Home },
  { key: "routine", label: "Rotina", icon: ListTodo },
  { key: "analysis", label: "Analise", icon: Activity },
  { key: "progress", label: "Progresso", icon: LineChart },
  { key: "recommendations", label: "Para voce", icon: Gift },
  { key: "profile", label: "Perfil", icon: UserRound },
];

const defaultPersistedState: PersistedState = {
  profileIndex: 0,
  recommendationFilter: "Todos",
  progressRange: "30 dias",
  user: {
    selectedSymptoms: ["ressecado", "quebra"],
    completedSteps: ["wash"],
    selectedProducts: ["aloe-mask", "light-leavein"],
    selectedHabits: ["fronha-cetim"],
    dailyNote: "",
    photoLogged: false,
    weeklyCareSessions: 3,
    humidity: 72,
    temperature: 28,
    remindersEnabled: true,
    history: [
      {
        date: "2026-05-16",
        hydration: 54,
        strength: 51,
        definition: 56,
        ends: 50,
        symptoms: ["ressecado", "frizz", "quebra"],
        completedSteps: ["wash"],
        products: ["light-leavein"],
        habits: [],
        note: "",
        photoLogged: false,
        humidity: 68,
        temperature: 29,
      },
      {
        date: "2026-05-19",
        hydration: 58,
        strength: 55,
        definition: 60,
        ends: 53,
        symptoms: ["ressecado", "frizz"],
        completedSteps: ["wash", "mask"],
        products: ["aloe-mask", "light-leavein"],
        habits: ["fronha-cetim"],
        note: "",
        photoLogged: false,
        humidity: 70,
        temperature: 27,
      },
      {
        date: "2026-05-22",
        hydration: 61,
        strength: 58,
        definition: 63,
        ends: 56,
        symptoms: ["quebra", "sem-brilho"],
        completedSteps: ["wash", "mask", "finish"],
        products: ["protein-mask", "argan-oil"],
        habits: ["protecao-noturna"],
        note: "",
        photoLogged: true,
        humidity: 64,
        temperature: 26,
      },
      {
        date: "2026-05-25",
        hydration: 65,
        strength: 60,
        definition: 67,
        ends: 60,
        symptoms: ["ressecado"],
        completedSteps: ["wash", "mask", "finish", "seal"],
        products: ["aloe-mask", "argan-oil", "light-leavein"],
        habits: ["fronha-cetim", "baixa-manipulacao"],
        note: "",
        photoLogged: false,
        humidity: 66,
        temperature: 25,
      },
    ],
  },
};

const recommendations: Recommendation[] = [
  {
    id: "hydrate-now",
    title: "Seu cabelo responde bem a reposicao de agua hoje",
    description: "Use mascara umectante e finalize com selagem leve para manter maciez sem excesso.",
    category: "Produtos",
    cta: "Ver combinacao",
    icon: "🧴",
    score: (ctx) => 80 - ctx.scores.hydration + (ctx.user.selectedSymptoms.includes("ressecado") ? 12 : 0),
  },
  {
    id: "repair-structure",
    title: "Reforco estrutural para conter quebra",
    description: "Seu historico mostra que reconstrucao espaçada funciona melhor do que excesso de proteina.",
    category: "Rotina",
    cta: "Abrir rotina",
    icon: "🛠",
    score: (ctx) => 82 - ctx.scores.strength + (ctx.user.selectedSymptoms.includes("quebra") ? 10 : 0),
  },
  {
    id: "humidity-control",
    title: "Clima umido pede mais controle na finalizacao",
    description: "Com a umidade atual, selagem leve e menos friccao ajudam a proteger definicao e brilho.",
    category: "Habitos",
    cta: "Quero testar",
    icon: "☁",
    score: (ctx) => (ctx.climateLabel === "umido" ? 18 : 0) + (75 - ctx.scores.definition),
  },
  {
    id: "consistency-habit",
    title: "Consistencia semanal esta impactando seu resultado",
    description: "Seu cabelo evolui melhor quando voce distribui os cuidados ao longo da semana, sem concentrar tudo em um dia.",
    category: "Habitos",
    cta: "Montar frequencia",
    icon: "📆",
    score: (ctx) => 76 - ctx.consistencyScore,
  },
  {
    id: "root-balance",
    title: "Ajuste de raiz para manter conforto e leveza",
    description: "Tonico ou lavagem suave ajudam mais quando a raiz pesa e a definicao oscila no mesmo dia.",
    category: "Produtos",
    cta: "Ver opcoes",
    icon: "🌿",
    score: (ctx) => (ctx.user.selectedSymptoms.includes("raiz-oleosa") ? 20 : 0) + (70 - ctx.scores.definition),
  },
];

const dataAdapter = {
  load(): PersistedState {
    if (typeof window === "undefined") return defaultPersistedState;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultPersistedState;

      const parsed = JSON.parse(raw) as PersistedState;
      return sanitizeState(parsed);
    } catch {
      return defaultPersistedState;
    }
  },
  save(state: PersistedState) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};

const LOGIN_ROUTE = "/login";

function getBasePath() {
  return (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
}

function getAppRoute() {
  if (typeof window === "undefined") return "/";

  const pathname = window.location.pathname;
  const basePath = getBasePath();
  const withoutBase =
    basePath && basePath !== "/" && pathname.startsWith(basePath) ? pathname.slice(basePath.length) || "/" : pathname;

  if (!withoutBase || withoutBase === "/") return "/";
  return withoutBase.replace(/\/+$/, "") || "/";
}

function navigateTo(route: string, replace = false) {
  if (typeof window === "undefined") return;

  const basePath = getBasePath();
  const targetRoute = route === "/" ? "" : route;
  const nextUrl = `${basePath}${targetRoute}` || "/";

  window.history[replace ? "replaceState" : "pushState"]({}, "", nextUrl);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function mapAuthErrorMessage(error: unknown, mode: "login" | "register") {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : mode === "login" ? "Nao foi possivel entrar." : "Nao foi possivel criar sua conta.";

  const normalized = rawMessage
    .replace(/^\[Supabase\]\s*/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (mode === "login") {
    if (normalized.includes("invalid login credentials")) {
      return "Nao encontramos uma conta com esse email e essa senha. Verifique os dados ou crie sua conta.";
    }
    if (normalized.includes("email not confirmed") || normalized.includes("email not confirmed")) {
      return "Sua conta existe, mas o email ainda nao foi confirmado. Procure a mensagem de confirmacao na sua caixa de entrada.";
    }
    if (normalized.includes("invalid email")) {
      return "Esse email parece invalido. Revise o endereco digitado.";
    }
    if (normalized.includes("too many requests")) {
      return "Foram feitas muitas tentativas em pouco tempo. Aguarde um pouco e tente novamente.";
    }
  }

  if (mode === "register") {
    if (normalized.includes("user already registered") || normalized.includes("already been registered")) {
      return "Esse email ja possui conta. Tente entrar em vez de criar outra.";
    }
    if (normalized.includes("password should be at least") || normalized.includes("password must")) {
      return "Sua senha precisa atender aos requisitos minimos do projeto. Tente uma senha mais forte.";
    }
    if (normalized.includes("signup is disabled")) {
      return "O cadastro de novas contas esta desativado neste ambiente.";
    }
    if (normalized.includes("invalid email")) {
      return "Esse email parece invalido. Revise o endereco digitado antes de criar a conta.";
    }
  }

  return rawMessage.replace(/^\[Supabase\]\s*/i, "");
}

function LoginRoute({
  session,
  onAuthenticated,
  onBack,
  onSignOut,
}: {
  session: Session | null;
  onAuthenticated: (session: Session | null) => void;
  onBack: () => void;
  onSignOut: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (mode === "register" && password !== confirmPassword) {
      setErrorMessage("As senhas nao conferem.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (mode === "login") {
        const result = await supabaseApi.signInWithPassword(email, password);
        onAuthenticated(result.session);
        navigateTo("/", true);
      } else {
        const result = await supabaseApi.signUp(email, password);

        if (result.session) {
          onAuthenticated(result.session);
          navigateTo("/", true);
        } else {
          setSuccessMessage(
            "Conta criada. Se a confirmacao de email estiver ativa no Supabase, valide seu email antes de entrar.",
          );
          setMode("login");
          setPassword("");
          setConfirmPassword("");
        }
      }
    } catch (error) {
      setErrorMessage(mapAuthErrorMessage(error, mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-screen text-[#2f2230]"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255, 201, 215, 0.45), transparent 22%), radial-gradient(circle at top right, rgba(213, 223, 255, 0.4), transparent 24%), linear-gradient(180deg, #fffdfd 0%, #fff7fa 100%)",
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col justify-center px-4 py-6">
          <div className="px-2 py-3">
            <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-[#b06b87]">Supabase Auth</p>
            <h1 className="mt-2 text-[28px] font-semibold text-[#2b1d33]">
              {mode === "login" ? "Entrar no Raiz" : "Criar conta no Raiz"}
            </h1>
            <p className="mt-2 text-[14px] leading-6 text-[#7c677e]">
              Sua conta agora abre um contexto capilar exclusivo, com onboarding proprio, historico individual e leitura personalizada.
            </p>
          </div>

          <div className="space-y-5 px-2 py-4">
            {session ? (
              <div className="rounded-[24px] border border-[#d8efd7] bg-[#f4fff4] p-4">
                <p className="text-[14px] font-semibold text-[#27543d]">Sessao ativa</p>
                <p className="mt-1 text-[14px] text-[#466853]">
                  Logado como {session.user.email ?? "usuario sem email"}.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#d6e7d7] px-4 text-[14px] font-medium text-[#42604e] transition hover:bg-white"
                  >
                    Ir para o app
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void onSignOut();
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#2b1d33] px-4 text-[14px] font-medium text-white transition hover:bg-[#3a2746]"
                  >
                    Sair
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-[#ead7df] bg-[#fff6fa] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className={`min-h-11 rounded-[16px] px-4 text-[14px] font-medium transition ${
                      mode === "login" ? "bg-white text-[#2b1d33] shadow-sm" : "text-[#7c677e] hover:bg-white/60"
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className={`min-h-11 rounded-[16px] px-4 text-[14px] font-medium transition ${
                      mode === "register" ? "bg-white text-[#2b1d33] shadow-sm" : "text-[#7c677e] hover:bg-white/60"
                    }`}
                  >
                    Criar conta
                  </button>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[14px] font-medium text-[#5f4a60]">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@empresa.com"
                    autoComplete="email"
                    required
                    className="min-h-12 w-full rounded-[18px] border border-[#ead7df] bg-[#fffafb] px-4 text-[15px] text-[#2f2230] outline-none transition focus:border-[#f2568a] focus:ring-2 focus:ring-[#f9bfd1]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[14px] font-medium text-[#5f4a60]">Senha</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    required
                    className="min-h-12 w-full rounded-[18px] border border-[#ead7df] bg-[#fffafb] px-4 text-[15px] text-[#2f2230] outline-none transition focus:border-[#f2568a] focus:ring-2 focus:ring-[#f9bfd1]"
                  />
                </label>

                {mode === "register" ? (
                  <label className="block">
                    <span className="mb-2 block text-[14px] font-medium text-[#5f4a60]">Confirmar senha</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      required
                      className="min-h-12 w-full rounded-[18px] border border-[#ead7df] bg-[#fffafb] px-4 text-[15px] text-[#2f2230] outline-none transition focus:border-[#f2568a] focus:ring-2 focus:ring-[#f9bfd1]"
                    />
                  </label>
                ) : null}

                {errorMessage ? (
                  <div className="rounded-[18px] border border-[#f3c8d6] bg-[#fff2f6] px-4 py-3 text-[14px] text-[#8e3d5f]">
                    {errorMessage}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="rounded-[18px] border border-[#d8efd7] bg-[#f4fff4] px-4 py-3 text-[14px] text-[#27543d]">
                    {successMessage}
                  </div>
                ) : null}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#ead7df] bg-white px-4 text-[14px] font-medium text-[#6f5b71] transition hover:bg-[#fff6fa]"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#2b1d33] px-4 text-[14px] font-medium text-white transition hover:bg-[#3a2746] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (mode === "login" ? "Entrando..." : "Criando conta...") : mode === "login" ? "Entrar" : "Criar conta"}
                  </button>
                </div>
              </form>
            )}

            <div className="rounded-[24px] border border-[#efe4e8] bg-[#fff9fb] p-4 text-[14px] leading-6 text-[#705d71]">
              Cada conta autenticada guarda apenas os proprios dados capilares, produtos, habitos, check-ins e evolucao.
            </div>
          </div>
      </div>
    </main>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <main
      className="min-h-screen text-[#2f2230]"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255, 201, 215, 0.45), transparent 22%), radial-gradient(circle at top right, rgba(213, 223, 255, 0.4), transparent 24%), linear-gradient(180deg, #fffdfd 0%, #fff7fa 100%)",
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[640px] items-center justify-center px-4 py-10">
        <section className="w-full p-8 text-center">
          <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-[linear-gradient(180deg,#f2568a,#ffb4cd)]" />
          <h1 className="mt-6 text-[28px] font-semibold text-[#2b1d33]">Estamos abrindo sua jornada</h1>
          <p className="mt-3 text-[15px] leading-7 text-[#7c677e]">{message}</p>
        </section>
      </div>
    </main>
  );
}

function StatusScreen({
  title,
  description,
  primaryLabel,
  onPrimaryAction,
  secondaryLabel,
  onSecondaryAction,
}: {
  title: string;
  description: string;
  primaryLabel: string;
  onPrimaryAction: () => void;
  secondaryLabel: string;
  onSecondaryAction: () => void;
}) {
  return (
    <main
      className="min-h-screen text-[#2f2230]"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255, 201, 215, 0.45), transparent 22%), radial-gradient(circle at top right, rgba(213, 223, 255, 0.4), transparent 24%), linear-gradient(180deg, #fffdfd 0%, #fff7fa 100%)",
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[680px] items-center justify-center px-4 py-10">
        <section className="w-full p-8">
          <h1 className="text-[28px] font-semibold text-[#2b1d33]">{title}</h1>
          <p className="mt-3 text-[15px] leading-7 text-[#7c677e]">{description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2b1d33] px-5 text-[14px] font-medium text-white transition hover:bg-[#3a2746]"
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#ead7df] px-5 text-[14px] font-medium text-[#6f5b71] transition hover:bg-[#fff6fa]"
            >
              {secondaryLabel}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function OnboardingExperience({
  email,
  draft,
  isSaving,
  onDraftChange,
  onSubmit,
  onSignOut,
}: {
  email: string;
  draft: PersonalizedOnboardingDraft;
  isSaving: boolean;
  onDraftChange: (draft: PersonalizedOnboardingDraft) => void;
  onSubmit: () => Promise<void>;
  onSignOut: () => void;
}) {
  const [step, setStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const productCount = parseProductsText(draft.productsText).length;
  const usesProtectiveStyle = draft.protectiveStyles.some((style) => !["Natural solto", "Braid-out"].includes(style));

  const toggleListValue = (key: keyof PersonalizedOnboardingDraft, value: string) => {
    const list = draft[key] as string[];
    onDraftChange({
      ...draft,
      [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
    });
  };

  const setDraftField = <K extends keyof PersonalizedOnboardingDraft>(key: K, value: PersonalizedOnboardingDraft[K]) => {
    onDraftChange({ ...draft, [key]: value });
  };

  const questions = [
    {
      id: "displayName",
      eyebrow: "Vamos com carinho",
      title: "Como voce prefere ser chamada aqui dentro?",
      description: "Quero falar com voce do jeito certo, como se a gente estivesse se conhecendo aos poucos.",
      isValid: () => Boolean(draft.displayName.trim()),
      render: () => (
        <OnboardingTextInput
          value={draft.displayName}
          placeholder="Ex: Camila"
          onChange={(value) => setDraftField("displayName", value)}
        />
      ),
    },
    {
      id: "ageRange",
      eyebrow: "Seu momento",
      title: "Qual faixa etaria conversa mais com voce hoje?",
      description: "Isso ajuda o Raiz a trazer orientacoes e linguagem mais ajustadas ao seu momento de vida.",
      isValid: () => Boolean(draft.ageRange),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.ageRanges}
          selected={[draft.ageRange]}
          onSelect={(value) => setDraftField("ageRange", value)}
          single
        />
      ),
    },
    {
      id: "genderIdentity",
      eyebrow: "Presenca",
      title: "Como voce gostaria que o app respeitasse sua identidade?",
      description: "Se quiser responder, isso ajuda o cuidado a soar mais humano e alinhado com voce.",
      isValid: () => Boolean(draft.genderIdentity),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.genderIdentities}
          selected={[draft.genderIdentity]}
          onSelect={(value) => setDraftField("genderIdentity", value)}
          single
        />
      ),
    },
    {
      id: "hairType",
      eyebrow: "Leitura da base",
      title: "Hoje, como voce definiria seu cabelo atual?",
      description: "Nao precisa ser tecnico. Me conta do jeito que voce sente quando olha para ele.",
      isValid: () => Boolean(draft.hairType),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.hairTypes}
          selected={[draft.hairType]}
          onSelect={(value) => setDraftField("hairType", value)}
          single
        />
      ),
    },
    {
      id: "isTransitioning",
      eyebrow: "Mudancas importam",
      title: "Voce sente que esta vivendo uma transicao capilar agora?",
      description: "Esse detalhe muda a forma como o app entende constancia, textura e expectativa de resultado.",
      isValid: () => true,
      render: () => (
        <OnboardingBooleanChoice
          value={draft.isTransitioning}
          trueLabel="Sim, estou em transicao"
          falseLabel="Nao, esse nao e meu momento"
          onChange={(value) => setDraftField("isTransitioning", value)}
        />
      ),
    },
    {
      id: "texture",
      eyebrow: "Toque do fio",
      title: "Quando voce toca no fio, que textura percebe mais?",
      description: "Esse tipo de sensacao ajuda o Raiz a decidir peso, leveza e tipo de finalizacao.",
      isValid: () => Boolean(draft.texture),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.textures}
          selected={[draft.texture]}
          onSelect={(value) => setDraftField("texture", value)}
          single
        />
      ),
    },
    {
      id: "density",
      eyebrow: "Corpo do cabelo",
      title: "E a densidade, como voce percebe?",
      description: "Quero entender o quanto de cabelo voce sente de verdade, nao o que parece bonito no espelho.",
      isValid: () => Boolean(draft.density),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.densities}
          selected={[draft.density]}
          onSelect={(value) => setDraftField("density", value)}
          single
        />
      ),
    },
    {
      id: "volumePerception",
      eyebrow: "Presenca visual",
      title: "No dia a dia, como o volume costuma aparecer?",
      description: "Isso muda o tipo de rotina, de refresh e de produto que faz sentido para voce.",
      isValid: () => Boolean(draft.volumePerception),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.volumes}
          selected={[draft.volumePerception]}
          onSelect={(value) => setDraftField("volumePerception", value)}
          single
        />
      ),
    },
    {
      id: "currentLength",
      eyebrow: "Comprimento atual",
      title: "Como esta o comprimento do seu cabelo agora?",
      description: "Comprimento tambem altera friccao, peso, tempo de secagem e manutencao.",
      isValid: () => Boolean(draft.currentLength),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.lengths}
          selected={[draft.currentLength]}
          onSelect={(value) => setDraftField("currentLength", value)}
          single
        />
      ),
    },
    {
      id: "porosity",
      eyebrow: "Absorcao e resposta",
      title: "Se voce tivesse que chutar hoje, como sente a porosidade do seu fio?",
      description: "Pode ser intuicao mesmo. O app usa isso para ajustar hidratacao, selagem e frequencia ideal.",
      isValid: () => Boolean(draft.porosity),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.porosities}
          selected={[draft.porosity]}
          onSelect={(value) => setDraftField("porosity", value)}
          single
        />
      ),
    },
    {
      id: "scalpOiliness",
      eyebrow: "Couro cabeludo",
      title: "Como o seu couro cabeludo costuma se comportar?",
      description: "Quero entender a base do seu cuidado, porque conforto e raiz mudam tudo.",
      isValid: () => Boolean(draft.scalpOiliness),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.oiliness}
          selected={[draft.scalpOiliness]}
          onSelect={(value) => setDraftField("scalpOiliness", value)}
          single
        />
      ),
    },
    {
      id: "recurringSymptoms",
      eyebrow: "Sinais recorrentes",
      title: "Quais sinais aparecem com mais frequencia no seu cabelo ou couro cabeludo?",
      description: "Escolha tudo o que costuma voltar. Esses sinais vao pesar direto nas analises e alertas.",
      isValid: () => draft.recurringSymptoms.length > 0,
      render: () => (
        <OnboardingOptionList
          options={symptomLibrary.map((item) => item.label)}
          selected={draft.recurringSymptoms}
          onSelect={(value) => toggleListValue("recurringSymptoms", value)}
        />
      ),
    },
    {
      id: "mainChallenges",
      eyebrow: "Dores reais",
      title: "O que mais te desafia hoje na relacao com o seu cabelo?",
      description: "Pode marcar mais de uma coisa. O app vai usar isso para priorizar o que realmente importa.",
      isValid: () => draft.mainChallenges.length > 0,
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.challenges}
          selected={draft.mainChallenges}
          onSelect={(value) => toggleListValue("mainChallenges", value)}
        />
      ),
    },
    {
      id: "currentGoals",
      eyebrow: "Direcao",
      title: "E o que voce mais quer conquistar com esse cuidado agora?",
      description: "Nao e sobre perfeicao. E sobre o que faria seu cabelo parecer mais seu no dia a dia.",
      isValid: () => draft.currentGoals.length > 0,
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.goals}
          selected={draft.currentGoals}
          onSelect={(value) => toggleListValue("currentGoals", value)}
        />
      ),
    },
    {
      id: "timeAvailable",
      eyebrow: "Tempo real",
      title: "Quanto tempo voce costuma ter para cuidar do cabelo?",
      description: "Sem culpa, sem idealizacao. O Raiz precisa conhecer a sua rotina de verdade.",
      isValid: () => Boolean(draft.timeAvailable),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.timeAvailable}
          selected={[draft.timeAvailable]}
          onSelect={(value) => setDraftField("timeAvailable", value)}
          single
        />
      ),
    },
    {
      id: "routinePreference",
      eyebrow: "Estilo de rotina",
      title: "Voce prefere uma rotina rapida ou gosta de um ritual mais completo?",
      description: "Isso orienta o ritmo das sugestoes e a duracao das rotinas recomendadas.",
      isValid: () => Boolean(draft.routinePreference),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.routinePreferences}
          selected={[draft.routinePreference]}
          onSelect={(value) => setDraftField("routinePreference", value)}
          single
        />
      ),
    },
    {
      id: "consistencyFeeling",
      eyebrow: "Constancia",
      title: "Como voce se sente em relacao a manter consistencia?",
      description: "Nao quero te cobrar. Quero que o app te acompanhe no ritmo que faz sentido para voce.",
      isValid: () => Boolean(draft.consistencyFeeling),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.consistencyFeelings}
          selected={[draft.consistencyFeeling]}
          onSelect={(value) => setDraftField("consistencyFeeling", value)}
          single
        />
      ),
    },
    {
      id: "washFrequency",
      eyebrow: "Frequencia real",
      title: "Com que frequencia voce costuma lavar?",
      description: "Essa resposta ajuda o app a entender oleosidade, acúmulo e janelas reais de cuidado.",
      isValid: () => Boolean(draft.washFrequency),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.washFrequencies}
          selected={[draft.washFrequency]}
          onSelect={(value) => setDraftField("washFrequency", value)}
          single
        />
      ),
    },
    {
      id: "careFrequency",
      eyebrow: "Ritmo de cuidado",
      title: "E com que frequencia voce consegue cuidar com intencao?",
      description: "Essa diferenca entre lavar e tratar e muito importante para a sua heuristica pessoal.",
      isValid: () => Boolean(draft.careFrequency),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.careFrequencies}
          selected={[draft.careFrequency]}
          onSelect={(value) => setDraftField("careFrequency", value)}
          single
        />
      ),
    },
    {
      id: "blowDryerFrequency",
      eyebrow: "Calor",
      title: "Secador entra nessa rotina com que frequencia?",
      description: "Quero entender o quanto o calor participa da sua vida real, nao do cuidado ideal.",
      isValid: () => Boolean(draft.blowDryerFrequency),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.heatFrequencies}
          selected={[draft.blowDryerFrequency]}
          onSelect={(value) => setDraftField("blowDryerFrequency", value)}
          single
        />
      ),
    },
    {
      id: "flatIronFrequency",
      eyebrow: "Mais calor",
      title: "E chapinha ou fontes mais intensas de calor?",
      description: "Esse detalhe afina muito a leitura de protecao, pontas e resistencia da fibra.",
      isValid: () => Boolean(draft.flatIronFrequency),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.heatFrequencies}
          selected={[draft.flatIronFrequency]}
          onSelect={(value) => setDraftField("flatIronFrequency", value)}
          single
        />
      ),
    },
    {
      id: "usesHairProtection",
      eyebrow: "Blindagem",
      title: "Voce costuma usar alguma protecao capilar ou termica?",
      description: "Isso muda muito a forma como o app interpreta dano, quebra e manutencao de resultado.",
      isValid: () => true,
      render: () => (
        <OnboardingBooleanChoice
          value={draft.usesHairProtection}
          trueLabel="Sim, isso faz parte da minha rotina"
          falseLabel="Nao, quase nunca uso"
          onChange={(value) => setDraftField("usesHairProtection", value)}
        />
      ),
    },
    {
      id: "chemicalProcesses",
      eyebrow: "Historico quimico",
      title: "Ja houve quimica, tintura, descoloracao ou progressiva nesse caminho?",
      description: "Pode marcar tudo o que faz parte da sua historia atual. Isso altera prioridades e tolerancias do sistema.",
      isValid: () => draft.chemicalProcesses.length > 0,
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.chemicalProcesses}
          selected={draft.chemicalProcesses}
          onSelect={(value) => toggleListValue("chemicalProcesses", value)}
        />
      ),
    },
    {
      id: "protectiveStyles",
      eyebrow: "Estrutura atual",
      title: "Hoje voce usa tranças, Nina Softex, lace, twists, dread ou outro estilo protetivo?",
      description: "Aqui o Raiz entende se esta cuidando de fio solto, de um estilo temporario ou de uma estrutura que pede outro tipo de recomendacao.",
      isValid: () => draft.protectiveStyles.length > 0,
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.protectiveStyles}
          selected={draft.protectiveStyles}
          onSelect={(value) => toggleListValue("protectiveStyles", value)}
        />
      ),
    },
    {
      id: "protectiveStyleDuration",
      eyebrow: "Tempo de uso",
      title: "Ha quanto tempo esse estilo faz parte da sua rotina?",
      description: usesProtectiveStyle
        ? "Esse tempo ajuda a calibrar manutencao, tensao, limpeza e duracao segura."
        : "Se nao se aplica, pode escolher isso tambem. O importante e deixar o mapa coerente.",
      isValid: () => Boolean(draft.protectiveStyleDuration),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.protectiveStyleDuration}
          selected={[draft.protectiveStyleDuration]}
          onSelect={(value) => setDraftField("protectiveStyleDuration", value)}
          single
        />
      ),
    },
    {
      id: "washesWhileProtectiveStyle",
      eyebrow: "Manutencao do estilo",
      title: "Quando usa esse estilo, voce costuma lavar durante o uso?",
      description: "Isso ajuda o app a decidir alertas de couro cabeludo, intervalos de manutencao e limpeza.",
      isValid: () => draft.washesWhileProtectiveStyle !== null,
      render: () => (
        <OnboardingBooleanChoice
          value={draft.washesWhileProtectiveStyle}
          trueLabel="Sim, costumo lavar mesmo usando"
          falseLabel="Nao, geralmente espero a manutencao"
          onChange={(value) => setDraftField("washesWhileProtectiveStyle", value)}
        />
      ),
    },
    {
      id: "nighttimeHabits",
      eyebrow: "Noite e atrito",
      title: "Como a noite entra na historia do seu cabelo?",
      description: "Sono, friccao e cuidado noturno mexem muito mais no resultado do que parece.",
      isValid: () => draft.nighttimeHabits.length > 0,
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.nightHabits}
          selected={draft.nighttimeHabits}
          onSelect={(value) => toggleListValue("nighttimeHabits", value)}
        />
      ),
    },
    {
      id: "sleepsWithBonnet",
      eyebrow: "Protecao noturna",
      title: "Voce dorme com touca ou alguma protecao para o cabelo?",
      description: "Esse cuidado muda retenção de definicao, atrito e leitura de pontas.",
      isValid: () => true,
      render: () => (
        <OnboardingBooleanChoice
          value={draft.sleepsWithBonnet}
          trueLabel="Sim, faz parte da minha noite"
          falseLabel="Nao, ainda nao virou habito"
          onChange={(value) => setDraftField("sleepsWithBonnet", value)}
        />
      ),
    },
    {
      id: "regionClimate",
      eyebrow: "Clima ao redor",
      title: "Que clima mais acompanha a sua rotina?",
      description: "O ambiente onde voce vive vai entrar direto nas sugestoes diarias do app.",
      isValid: () => Boolean(draft.regionClimate),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.climates}
          selected={[draft.regionClimate]}
          onSelect={(value) => setDraftField("regionClimate", value)}
          single
        />
      ),
    },
    {
      id: "climateImpactsHair",
      eyebrow: "Resposta ao ambiente",
      title: "Voce sente que o clima realmente muda o comportamento do seu cabelo?",
      description: "Se isso pesa para voce, o app passa a observar clima e cuidado com muito mais prioridade.",
      isValid: () => draft.climateImpactsHair !== null,
      render: () => (
        <OnboardingBooleanChoice
          value={draft.climateImpactsHair}
          trueLabel="Sim, eu sinto bastante"
          falseLabel="Nao, quase nao percebo diferenca"
          onChange={(value) => setDraftField("climateImpactsHair", value)}
        />
      ),
    },
    {
      id: "desiredDayToDayResults",
      eyebrow: "Resultado ideal",
      title: "No dia a dia, como voce gostaria que seu cabelo ficasse?",
      description: "Pode escolher mais de uma sensacao. Esse desejo orienta o comportamento inteiro do app.",
      isValid: () => draft.desiredDayToDayResults.length > 0,
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.dayResults}
          selected={draft.desiredDayToDayResults}
          onSelect={(value) => toggleListValue("desiredDayToDayResults", value)}
        />
      ),
    },
    {
      id: "feelingsAboutHair",
      eyebrow: "Relacao emocional",
      title: "Quais sentimentos passam por voce quando pensa no seu cabelo hoje?",
      description: "Essa parte e importante. O app quer cuidar da rotina, mas tambem da experiencia que voce vive com ela.",
      isValid: () => draft.feelingsAboutHair.length > 0,
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.feelings}
          selected={draft.feelingsAboutHair}
          onSelect={(value) => toggleListValue("feelingsAboutHair", value)}
        />
      ),
    },
    {
      id: "hairKnowledgeLevel",
      eyebrow: "Autoconhecimento",
      title: "Hoje, o quanto voce sente que entende o proprio cabelo?",
      description: "Quero que o Raiz encontre um tom que acompanhe voce sem ser tecnico demais nem superficial demais.",
      isValid: () => Boolean(draft.hairKnowledgeLevel),
      render: () => (
        <OnboardingOptionList
          options={onboardingOptions.knowledgeLevels}
          selected={[draft.hairKnowledgeLevel]}
          onSelect={(value) => setDraftField("hairKnowledgeLevel", value)}
          single
        />
      ),
    },
    {
      id: "cityOrRegion",
      eyebrow: "Contexto local",
      title: "Se quiser, me conta em que cidade ou regiao voce vive",
      description: "Isso deixa o mapa climatico do app mais fino e mais real para voce.",
      isValid: () => Boolean(draft.cityOrRegion.trim()),
      render: () => (
        <OnboardingTextInput
          value={draft.cityOrRegion}
          placeholder="Ex: Salvador, BA"
          onChange={(value) => setDraftField("cityOrRegion", value)}
        />
      ),
    },
    {
      id: "productsText",
      eyebrow: "Sua prateleira real",
      title: "Quais produtos voce costuma usar de verdade?",
      description: "Pode listar do jeito que vier. O app precisa conhecer sua rotina concreta para recomendar sem fantasiar.",
      isValid: () => productCount > 0,
      render: () => (
        <OnboardingTextArea
          value={draft.productsText}
          placeholder={"Ex:\nShampoo equilibrante\nMascara hidratante\nLeave-in\nOleo finalizador"}
          onChange={(value) => setDraftField("productsText", value)}
          caption={`${productCount} produto(s) mapeado(s) ate agora.`}
        />
      ),
    },
    {
      id: "notes",
      eyebrow: "Ultimo toque",
      title: "Tem algo importante sobre o seu cabelo que eu ainda nao perguntei?",
      description: "Pode ser um detalhe sobre lace, academia, sensibilidade, rotina corrida ou qualquer coisa que muda seu cuidado.",
      isValid: () => true,
      render: () => (
        <OnboardingTextArea
          value={draft.notes}
          placeholder="Se quiser, escreva livremente aqui."
          onChange={(value) => setDraftField("notes", value)}
          optional
        />
      ),
    },
  ];

  const currentQuestion = questions[step];
  const progress = Math.round(((step + 1) / questions.length) * 100);
  const answeredCount = countOnboardingAnswers(draft);
  const mapSummary = buildMapSummary(draft, answeredCount);

  const handleContinue = async () => {
    setErrorMessage("");

    if (!currentQuestion.isValid()) {
      setErrorMessage("Responde essa com calma. Ela vai mexer de verdade nas recomendacoes que o Raiz cria para voce.");
      return;
    }

    if (step < questions.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    await onSubmit();
  };

  return (
    <main
      className="min-h-screen text-[#2f2230]"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255, 201, 215, 0.45), transparent 22%), radial-gradient(circle at top right, rgba(213, 223, 255, 0.4), transparent 24%), linear-gradient(180deg, #fffdfd 0%, #fff7fa 100%)",
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[760px] flex-col px-4 py-4 lg:justify-center">
        <section className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-[#f8e5ed]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#f2568a_0%,#ff9bb7_100%)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex min-h-[100dvh] flex-col px-5 pb-6 pt-7 sm:px-7">
            <header className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] uppercase tracking-[0.16em] text-[#b06b87]">Mapa capilar pessoal</p>
                <p className="mt-2 text-[14px] leading-6 text-[#7c677e]">
                  {draft.displayName ? `${draft.displayName}, estamos te conhecendo por inteiro.` : `Essa conversa vai criar uma experiencia so sua em ${email || "sua conta"}.`}
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#ead7df] px-4 text-[14px] font-medium text-[#6f5b71] transition hover:bg-[#fff6fa]"
              >
                Sair
              </button>
            </header>

            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-[14px] text-[#8b7387]">Pergunta {step + 1} de {questions.length}</p>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#fff5f8] px-3 py-2 text-[13px] text-[#915f78]">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#f2568a]" />
                {mapSummary.pulse}
              </div>
            </div>

            <section className="flex flex-1 flex-col justify-center py-8">
              <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center">
                <div className="transition-all duration-300">
                  <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-[#c07a96]">{currentQuestion.eyebrow}</p>
                  <h1 className="mt-4 text-[32px] font-semibold leading-[1.14] text-[#2b1d33] sm:text-[40px]">
                    {currentQuestion.title}
                  </h1>
                  <p className="mt-4 max-w-[38ch] text-[16px] leading-8 text-[#786779]">{currentQuestion.description}</p>

                  <div className="mt-10">{currentQuestion.render()}</div>
                </div>
              </div>
            </section>

            <section className="mt-2 rounded-[28px] bg-[linear-gradient(180deg,#fff8fb_0%,#fffdfd_100%)] p-4">
              <p className="text-[13px] uppercase tracking-[0.16em] text-[#b06b87]">Leitura em formacao</p>
              <h3 className="mt-3 text-[20px] font-semibold text-[#2d2236]">{mapSummary.title}</h3>
              <p className="mt-2 text-[14px] leading-6 text-[#6f5d72]">{mapSummary.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {mapSummary.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[#f1dce5] bg-white px-3 py-2 text-[13px] text-[#7d687d]">
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            {errorMessage ? (
              <div className="mt-4 rounded-[18px] border border-[#f3c8d6] bg-[#fff2f6] px-4 py-3 text-[14px] text-[#8e3d5f]">
                {errorMessage}
              </div>
            ) : null}

            <footer className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
                className="inline-flex min-h-13 shrink-0 items-center justify-center rounded-full border border-[#ead7df] px-5 text-[14px] font-medium text-[#6f5b71] transition hover:bg-[#fff6fa] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleContinue();
                }}
                disabled={isSaving}
                className="inline-flex min-h-13 flex-1 items-center justify-center rounded-full bg-[#2b1d33] px-6 text-[15px] font-medium text-white shadow-[0_18px_40px_rgba(43,29,51,0.16)] transition hover:bg-[#3a2746] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Montando seu mapa..." : step === questions.length - 1 ? "Entrar no meu Raiz" : "Continuar com calma"}
              </button>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

function OnboardingTextInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-15 w-full rounded-[24px] border border-[#ead7df] bg-[#fffafb] px-5 text-[18px] text-[#2f2230] outline-none transition focus:border-[#f2568a] focus:ring-2 focus:ring-[#f9bfd1]"
    />
  );
}

function OnboardingTextArea({
  value,
  placeholder,
  onChange,
  caption,
  optional = false,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  caption?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-40 w-full rounded-[28px] border border-[#ead7df] bg-[#fffafb] px-5 py-5 text-[16px] text-[#2f2230] outline-none transition focus:border-[#f2568a] focus:ring-2 focus:ring-[#f9bfd1]"
      />
      <p className="mt-3 text-[13px] leading-6 text-[#7f6a80]">
        {caption ?? (optional ? "Se quiser pular, tudo bem. O app ja consegue comecar a te conhecer mesmo assim." : "")}
      </p>
    </div>
  );
}

function OnboardingOptionList({
  options,
  selected,
  onSelect,
  single = false,
}: {
  options: string[];
  selected: string[];
  onSelect: (value: string) => void;
  single?: boolean;
}) {
  return (
    <div className="grid gap-3">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className="flex min-h-15 w-full items-center justify-between rounded-[24px] border px-5 py-4 text-left text-[16px] font-medium outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#f2568a]"
            style={{
              background: active ? "linear-gradient(180deg, #ffedf4, #fff7fa)" : "rgba(255,250,251,0.82)",
              borderColor: active ? "#f4bfd0" : "#efe3ea",
              color: active ? "#d9437c" : "#5e4d61",
              boxShadow: active ? "0 18px 36px rgba(242, 86, 138, 0.10)" : "none",
            }}
          >
            <span className="pr-4">{option}</span>
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px]"
              style={{
                borderColor: active ? "#f2568a" : "#dcc8d3",
                background: active ? "#f2568a" : "transparent",
                color: active ? "#ffffff" : "#b0899e",
              }}
            >
              {active ? "✓" : single ? "•" : "+"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OnboardingBooleanChoice({
  value,
  trueLabel,
  falseLabel,
  onChange,
}: {
  value: boolean | null;
  trueLabel: string;
  falseLabel: string;
  onChange: (value: boolean) => void;
}) {
  const isTrue = value === true;
  const isFalse = value === false;

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => onChange(true)}
        className="flex min-h-15 items-center justify-between rounded-[24px] border px-5 py-4 text-left text-[16px] font-medium outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#f2568a]"
        style={{
          background: isTrue ? "linear-gradient(180deg, #ffedf4, #fff7fa)" : "rgba(255,250,251,0.82)",
          borderColor: isTrue ? "#f4bfd0" : "#efe3ea",
          color: isTrue ? "#d9437c" : "#5e4d61",
        }}
      >
        <span>{trueLabel}</span>
        <span className="text-[14px]">{isTrue ? "Escolhido" : ""}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className="flex min-h-15 items-center justify-between rounded-[24px] border px-5 py-4 text-left text-[16px] font-medium outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#f2568a]"
        style={{
          background: isFalse ? "linear-gradient(180deg, #ffedf4, #fff7fa)" : "rgba(255,250,251,0.82)",
          borderColor: isFalse ? "#f4bfd0" : "#efe3ea",
          color: isFalse ? "#d9437c" : "#5e4d61",
        }}
      >
        <span>{falseLabel}</span>
        <span className="text-[14px]">{isFalse ? "Escolhido" : ""}</span>
      </button>
    </div>
  );
}

function countOnboardingAnswers(draft: PersonalizedOnboardingDraft) {
  const values = [
    draft.displayName.trim(),
    draft.ageRange,
    draft.genderIdentity,
    draft.hairType,
    draft.texture,
    draft.density,
    draft.volumePerception,
    draft.currentLength,
    draft.porosity,
    draft.scalpOiliness,
    draft.washFrequency,
    draft.careFrequency,
    draft.timeAvailable,
    draft.routinePreference,
    draft.consistencyFeeling,
    draft.blowDryerFrequency,
    draft.flatIronFrequency,
    draft.protectiveStyleDuration,
    draft.regionClimate,
    draft.cityOrRegion.trim(),
    draft.hairKnowledgeLevel,
  ];

  const booleanCount = [
    draft.isTransitioning,
    draft.sleepsWithBonnet,
    draft.usesHairProtection,
    draft.washesWhileProtectiveStyle,
    draft.climateImpactsHair,
  ].filter((value) => value !== null).length;

  const listCounts = [
    draft.protectiveStyles.length,
    draft.nighttimeHabits.length,
    draft.chemicalProcesses.length,
    draft.currentGoals.length,
    draft.desiredDayToDayResults.length,
    draft.mainChallenges.length,
    draft.recurringSymptoms.length,
    draft.feelingsAboutHair.length,
    parseProductsText(draft.productsText).length,
  ];

  return values.filter(Boolean).length + booleanCount + listCounts.filter((count) => count > 0).length;
}

function buildMapSummary(draft: PersonalizedOnboardingDraft, answeredCount: number) {
  const tags = [
    draft.hairType,
    draft.texture,
    draft.porosity,
    draft.scalpOiliness,
    draft.protectiveStyles[0],
    draft.currentGoals[0],
    draft.regionClimate,
  ].filter(Boolean).slice(0, 5);

  if (answeredCount < 6) {
    return {
      pulse: "aquecendo",
      title: "Seu mapa capilar ainda esta respirando os primeiros sinais",
      description: "Ja comecei a perceber sua linguagem, seu momento e o tipo de cuidado que vai soar natural para voce.",
      tags: tags.length ? tags : ["nome", "momento", "tom de cuidado"],
    };
  }
  if (answeredCount < 16) {
    return {
      pulse: "ganhando forma",
      title: "Ja existe um desenho real da sua rotina e do seu fio",
      description: "Agora o app ja consegue combinar estrutura, sintomas, calor, constancia e contexto do dia a dia para fugir do genérico.",
      tags: tags.length ? tags : ["estrutura", "rotina", "sinais"],
    };
  }
  return {
    pulse: "quase pronto",
    title: "Seu mapa capilar pessoal esta ficando muito nítido",
    description: "Com essas respostas, o Raiz passa a montar rotinas, alertas, duracao de penteados e recomendacoes que fazem sentido para a sua vida real.",
    tags: tags.length ? tags : ["perfil", "objetivos", "clima", "ritmo"],
  };
}

function DashboardApp({ session, onSignOut }: { session: Session; onSignOut: () => Promise<void> }) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [persisted, setPersisted] = useState<PersistedState>(() => createInitialUiState() as PersistedState);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [routineStepsState, setRoutineStepsState] = useState<RoutineStep[]>([]);
  const [activeRecommendationId, setActiveRecommendationId] = useState<string | null>(null);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);
  const [onboardingDraft, setOnboardingDraft] = useState<PersonalizedOnboardingDraft>(() =>
    createInitialOnboardingDraft(session.user.email ?? ""),
  );
  const autoSaveReadyRef = useRef(false);

  const refreshWorkspace = async () => {
    setIsLoadingWorkspace(true);
    setWorkspaceError("");
    autoSaveReadyRef.current = false;

    try {
      const workspace = await loadUserWorkspace(session.user.id);

      if (!workspace.profile || !isOnboardingComplete(workspace.profile)) {
        setNeedsOnboarding(true);
        setProfile(null);
        setAvailableProducts([]);
        setRoutineStepsState([]);
        setPersisted(createInitialUiState() as PersistedState);
        setOnboardingDraft(createInitialOnboardingDraft(session.user.email ?? ""));
        return;
      }

      const nextProfile = mapProfileRecordToProfile(
        workspace.profile as never,
        session.user.user_metadata?.name ?? session.user.email?.split("@")[0] ?? "Voce",
      ) as Profile;
      const nextProducts = mapProductRecordsToProducts(workspace.products as never) as Product[];
      const nextState = mapWorkspaceToUiState(workspace.profile as never, workspace.checkins as never) as PersistedState;
      const nextRoutineSteps = buildPersonalizedRoutineSteps(nextProfile as never, nextProducts as never) as RoutineStep[];

      setProfile(nextProfile);
      setAvailableProducts(nextProducts);
      setPersisted(nextState);
      setRoutineStepsState(nextRoutineSteps);
      setNeedsOnboarding(false);
      autoSaveReadyRef.current = true;
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Nao foi possivel carregar seu contexto.");
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    void refreshWorkspace();
  }, [session.user.id]);

  const user = persisted.user;
  const analysis = useMemo(
    () =>
      profile
        ? (buildPersonalizedAnalysis(profile as never, user as never, availableProducts as never, routineStepsState as never) as AnalysisContext)
        : null,
    [availableProducts, profile, routineStepsState, user],
  );
  const completionRatio = routineStepsState.length ? user.completedSteps.length / routineStepsState.length : 0;
  const recommendationItems = useMemo(() => {
    if (!profile || !analysis) return [];

    return (buildPersonalizedRecommendations(profile as never, analysis as never, availableProducts as never) as Recommendation[]).filter(
      (item) => persisted.recommendationFilter === "Todos" || item.category === persisted.recommendationFilter,
    );
  }, [analysis, availableProducts, persisted.recommendationFilter, profile]);
  const activeRecommendation = useMemo(
    () => recommendationItems.find((item) => item.id === activeRecommendationId) ?? null,
    [activeRecommendationId, recommendationItems],
  );
  const recommendationModalData = useMemo(() => {
    if (!activeRecommendation || !analysis || !profile) return null;

    return {
      ...buildPersonalizedRecommendationModalData(
        activeRecommendation as never,
        analysis as never,
        availableProducts as never,
        profile as never,
      ),
      nextActions: [
        { label: "Abrir Analise do dia", tab: "analysis" as TabKey },
        { label: "Revisar Rotina", tab: "routine" as TabKey },
        { label: "Ver Perfil capilar", tab: "profile" as TabKey },
      ],
    } as RecommendationModalData;
  }, [activeRecommendation, analysis, availableProducts, profile]);
  const progressSeries = useMemo(() => {
    const count = persisted.progressRange === "7 dias" ? 7 : persisted.progressRange === "30 dias" ? 30 : 90;
    return buildPersonalizedSeriesFromHistory(user.history as never, count);
  }, [persisted.progressRange, user.history]);

  useEffect(() => {
    if (!profile || !analysis || needsOnboarding || !autoSaveReadyRef.current) return;

    const draft: QuickCheckinDraft = {
      selectedSymptoms: user.selectedSymptoms,
      selectedProducts: user.selectedProducts,
      completedSteps: user.completedSteps,
      selectedHabits: user.selectedHabits,
      dailyNote: user.dailyNote,
      photoLogged: user.photoLogged,
    };

    void persistCheckin(session.user.id, draft as never, user as never, analysis as never, profile as never).catch(() => {
      // Mantem o app responsivo mesmo se a persistencia falhar momentaneamente.
    });
  }, [analysis, needsOnboarding, profile, session.user.id, user]);

  const patchUser = (updater: (current: UserContext) => UserContext) => {
    if (!profile) return;

    setPersisted((current) => {
      const nextUser = syncPersonalizedHistory(
        updater(current.user) as never,
        profile as never,
        availableProducts as never,
        routineStepsState as never,
      ) as UserContext;
      return { ...current, user: nextUser };
    });
  };

  const toggleSymptom = (symptomId: string) => {
    patchUser((current) => ({
      ...current,
      selectedSymptoms: current.selectedSymptoms.includes(symptomId)
        ? current.selectedSymptoms.filter((id) => id !== symptomId)
        : [...current.selectedSymptoms, symptomId],
    }));
  };

  const toggleStep = (stepId: string) => {
    patchUser((current) => ({
      ...current,
      completedSteps: current.completedSteps.includes(stepId)
        ? current.completedSteps.filter((id) => id !== stepId)
        : [...current.completedSteps, stepId],
    }));
  };

  const toggleProduct = (productId: string) => {
    patchUser((current) => ({
      ...current,
      selectedProducts: current.selectedProducts.includes(productId)
        ? current.selectedProducts.filter((id) => id !== productId)
        : [...current.selectedProducts, productId],
    }));
  };

  const toggleHabit = (habitId: HabitId) => {
    patchUser((current) => ({
      ...current,
      selectedHabits: current.selectedHabits.includes(habitId)
        ? current.selectedHabits.filter((id) => id !== habitId)
        : [...current.selectedHabits, habitId],
    }));
  };

  const updateClimate = (field: "humidity" | "temperature", delta: number) => {
    patchUser((current) => ({
      ...current,
      [field]: clamp(current[field] + delta, field === "humidity" ? 20 : 10, field === "humidity" ? 95 : 40),
    }));
  };

  const updateWeeklyCare = (delta: number) => {
    patchUser((current) => ({
      ...current,
      weeklyCareSessions: clamp(current.weeklyCareSessions + delta, 0, 7),
    }));
  };

  if (isLoadingWorkspace) {
    return <LoadingScreen message="Carregando o contexto capilar da sua conta..." />;
  }

  if (workspaceError) {
    return (
      <StatusScreen
        title="Nao conseguimos carregar sua jornada agora"
        description={workspaceError}
        primaryLabel="Tentar novamente"
        onPrimaryAction={() => {
          void refreshWorkspace();
        }}
        secondaryLabel="Sair"
        onSecondaryAction={() => {
          void onSignOut();
          navigateTo(LOGIN_ROUTE, true);
        }}
      />
    );
  }

  if (needsOnboarding || !profile || !analysis) {
    return (
      <OnboardingExperience
        email={session.user.email ?? ""}
        draft={onboardingDraft}
        isSaving={isSavingOnboarding}
        onDraftChange={setOnboardingDraft}
        onSubmit={async () => {
          setIsSavingOnboarding(true);
          try {
            await saveOnboarding(session.user.id, onboardingDraft);
            await refreshWorkspace();
          } finally {
            setIsSavingOnboarding(false);
          }
        }}
        onSignOut={() => {
          void onSignOut();
          navigateTo(LOGIN_ROUTE, true);
        }}
      />
    );
  }

  return (
    <main
      className="min-h-screen w-full text-[#2f2230]"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255, 201, 215, 0.45), transparent 22%), radial-gradient(circle at top right, rgba(213, 223, 255, 0.4), transparent 24%), linear-gradient(180deg, #fffdfd 0%, #fff7fa 100%)",
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <div
        className={isMobile ? "flex min-h-screen w-full flex-col px-4 pb-6 pt-5" : "flex min-h-screen w-full flex-col px-6 pb-6 pt-6 xl:px-8"}
      >
        <section className="relative flex min-h-0 flex-1 flex-col" aria-label="Aplicativo Raiz">
          <div
            className={
              isMobile
                ? "px-1 py-1"
                : "rounded-[32px] border border-[#f1dae1] bg-white/88 px-7 py-5 shadow-[0_20px_60px_rgba(48,23,53,0.08)]"
            }
          >
            <div className="flex items-start justify-between gap-3 lg:items-center">
              <div>
                <p className="text-[14px] text-[#7c677e]">Ola, {profile.name}!</p>
                <h2 className="mt-1 text-[16px] font-semibold text-[#2b1d33] lg:text-[18px]">{activeTabLabel(activeTab)}</h2>
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#f0dae4] bg-white px-4 text-[14px] text-[#745f76] outline-none transition hover:bg-[#fff6fa] focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                  aria-label="Abrir perfil capilar"
                >
                  <UserRound size={16} />
                  Perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void onSignOut();
                    navigateTo(LOGIN_ROUTE, true);
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#f0dae4] bg-white text-[#745f76] outline-none transition hover:bg-[#fff6fa] focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                  aria-label="Sair da conta"
                >
                  <Settings2 size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className={isMobile ? "flex-1 overflow-y-auto px-1 pb-24 pt-5" : "flex-1 overflow-y-auto px-0 pb-8 pt-6"}>
            {activeTab === "home" ? (
              <HomeTab
                profile={profile}
                completionRatio={completionRatio}
                analysis={analysis}
                historyCount={user.history.length}
                onNavigate={setActiveTab}
                onOpenCheckin={() => setIsCheckinOpen(true)}
              />
            ) : null}

            {activeTab === "routine" ? (
              <RoutineTab
                accent={profile.accent}
                completedSteps={user.completedSteps}
                selectedProducts={user.selectedProducts}
                weeklyCareSessions={user.weeklyCareSessions}
                onToggleStep={toggleStep}
                onToggleProduct={toggleProduct}
                onUpdateWeeklyCare={updateWeeklyCare}
                routineSteps={routineStepsState}
                products={availableProducts}
              />
            ) : null}

            {activeTab === "analysis" ? (
              <AnalysisTab
                analysis={analysis}
                selectedSymptoms={user.selectedSymptoms}
                selectedProducts={user.selectedProducts}
                humidity={user.humidity}
                temperature={user.temperature}
                onToggleSymptom={toggleSymptom}
                onToggleProduct={toggleProduct}
                onUpdateClimate={updateClimate}
                products={availableProducts}
                symptoms={symptomLibrary as never}
              />
            ) : null}

            {activeTab === "progress" ? (
              <ProgressTab
                accent={profile.accent}
                progressRange={persisted.progressRange}
                progressSeries={progressSeries}
                analysis={analysis}
                onSetProgressRange={(range) => setPersisted((current) => ({ ...current, progressRange: range }))}
              />
            ) : null}

            {activeTab === "recommendations" ? (
              <RecommendationsTab
                accent={profile.accent}
                filter={persisted.recommendationFilter}
                items={recommendationItems}
                analysis={analysis}
                onSetFilter={(filter) => setPersisted((current) => ({ ...current, recommendationFilter: filter }))}
                onOpenRecommendation={(recommendationId) => setActiveRecommendationId(recommendationId)}
              />
            ) : null}

            {activeTab === "profile" ? (
              <ProfileTab
                profile={profile}
                user={user}
                analysis={analysis}
                onToggleReminders={() => {
                  patchUser((current) => ({ ...current, remindersEnabled: !current.remindersEnabled }));
                  void supabaseApi.update(
                    "raiz_profiles",
                    { reminders_enabled: !user.remindersEnabled },
                    { user_id: session.user.id },
                  );
                }}
              />
            ) : null}
          </div>

          <nav
            className={
              isMobile
                ? "fixed inset-x-4 bottom-4 z-20 rounded-[26px] border border-[#f3dce4] bg-white/95 px-2 py-2 shadow-[0_20px_40px_rgba(39,20,53,0.14)] backdrop-blur"
                : "sticky bottom-0 mt-6 rounded-[30px] border border-[#f3dce4] bg-white/95 px-3 py-2 shadow-[0_20px_40px_rgba(39,20,53,0.14)] backdrop-blur"
            }
            aria-label="Abas principais"
          >
            <ul className="grid grid-cols-6 gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.key === activeTab;

                return (
                  <li key={tab.key}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      aria-current={isActive ? "page" : undefined}
                      className="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-[18px] outline-none transition hover:bg-[#fff4f8] focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                      style={{
                        background: isActive ? "linear-gradient(180deg, #ffedf4, #fff7fa)" : "transparent",
                        color: isActive ? profile.accent : "#7f6b80",
                      }}
                    >
                      <Icon size={16} />
                      <span className="text-[11px] font-medium">{tab.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <button
            type="button"
            onClick={() => setIsCheckinOpen(true)}
            className={
              isMobile
                ? "absolute bottom-[84px] left-1/2 inline-flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-[0_20px_40px_rgba(242,86,138,0.34)] outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                : "fixed bottom-10 left-1/2 z-10 inline-flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-[0_20px_40px_rgba(242,86,138,0.34)] outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#f2568a]"
            }
            style={{ background: `linear-gradient(180deg, ${profile.accent}, #f2568a)` }}
            aria-label="Abrir check-in diario"
          >
            <Plus size={20} />
          </button>
        </section>
      </div>

      {recommendationModalData ? (
        <RecommendationModal
          accent={profile.accent}
          data={recommendationModalData}
          onClose={() => setActiveRecommendationId(null)}
          onNavigate={(tab) => {
            setActiveRecommendationId(null);
            setActiveTab(tab);
          }}
        />
      ) : null}

      {isCheckinOpen ? (
        <QuickCheckinModal
          accent={profile.accent}
          draft={{
            selectedSymptoms: user.selectedSymptoms,
            selectedProducts: user.selectedProducts,
            completedSteps: user.completedSteps,
            selectedHabits: user.selectedHabits,
            dailyNote: user.dailyNote,
            photoLogged: user.photoLogged,
          }}
          onClose={() => setIsCheckinOpen(false)}
          onSave={(draft) => {
            patchUser((current) => ({
              ...current,
              selectedSymptoms: draft.selectedSymptoms,
              selectedProducts: draft.selectedProducts,
              completedSteps: draft.completedSteps,
              selectedHabits: draft.selectedHabits,
              dailyNote: draft.dailyNote,
              photoLogged: draft.photoLogged,
            }));
            setIsCheckinOpen(false);
          }}
          products={availableProducts}
          routineSteps={routineStepsState}
          symptoms={symptomLibrary as never}
          habits={habitLibrary as never}
          onToggleHabit={toggleHabit}
        />
      ) : null}
    </main>
  );
}

function HomeTab({
  profile,
  completionRatio,
  analysis,
  historyCount,
  onNavigate,
  onOpenCheckin,
}: {
  profile: Profile;
  completionRatio: number;
  analysis: AnalysisContext;
  historyCount: number;
  onNavigate: (tab: TabKey) => void;
  onOpenCheckin: () => void;
}) {
  const [activeMetric, setActiveMetric] = useState<keyof MetricScores>("hydration");
  const positiveDriver = getPositiveDriver(analysis);
  const negativeDriver = getNegativeDriver(analysis);
  const nextActionLabel = getNextActionLabel(analysis);
  const mood = getHairMood(analysis);
  const quickGreeting = getHomeGreeting(analysis);
  const contextualMoment = getContextualMoment(analysis);
  const insightPills = getInsightPills(analysis);
  const focusMetrics = getFocusMetrics(analysis);
  const activeMetricConfig = focusMetrics.find((metric) => metric.id === activeMetric) ?? focusMetrics[0];

  return (
    <div className="space-y-4 lg:space-y-5">
      <section className="overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top_left,#fff6ef_0%,#fff7fb_48%,#f8fbff_100%)] p-4 shadow-[0_22px_50px_rgba(242,86,138,0.12)] lg:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.96fr)_minmax(300px,0.84fr)] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/85 px-3 py-1 text-[13px] font-medium text-[#7b667d] shadow-sm">
                Agora, {profile.name}
              </span>
              <span className="rounded-full bg-[#fff0f5] px-3 py-1 text-[13px] font-medium text-[#d84e82]">
                {contextualMoment}
              </span>
            </div>

            <h3 className="mt-3 max-w-[14ch] text-[28px] font-semibold leading-[1.02] text-[#2e2035] lg:text-[42px]">
              {quickGreeting}
            </h3>
            <p className="mt-3 max-w-[34ch] text-[15px] leading-[1.55] text-[#6b5b70]">{nextActionLabel}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {insightPills.map((pill) => (
                <span
                  key={pill.label}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/90 bg-white/80 px-3 py-2 text-[13px] text-[#5f5165] shadow-sm backdrop-blur"
                >
                  <span aria-hidden="true">{pill.icon}</span>
                  <span className="font-medium text-[#2f2338]">{pill.label}</span>
                  <span className="text-[#7f7183]">{pill.value}</span>
                </span>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ConversationalCard
                title="O que ajuda"
                text={positiveDriver}
                tone="positive"
                icon={<Sparkles size={16} />}
              />
              <ConversationalCard
                title="O que pede atencao"
                text={negativeDriver}
                tone="warning"
                icon={<CloudSun size={16} />}
              />
            </div>
          </div>

          <HairPulsePanel
            accent={profile.accent}
            analysis={analysis}
            mood={mood}
            activeMetric={activeMetric}
            activeMetricConfig={activeMetricConfig}
            metrics={focusMetrics}
            onSelectMetric={setActiveMetric}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
        <section className="rounded-[26px] border border-[#f3e6ec] bg-white p-4 lg:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] uppercase tracking-[0.12em] text-[#958297]">Como ele esta hoje</p>
              <h3 className="mt-2 text-[22px] font-semibold text-[#2e2236]">{analysis.focusLabel}</h3>
            </div>
            <span className="rounded-full bg-[#fef1f5] px-3 py-1 text-[13px] font-medium text-[#d84f82]">
              {Math.round(completionRatio * 100)}% da rotina
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {focusMetrics.map((metric) => (
              <button
                key={metric.id}
                type="button"
                onClick={() => setActiveMetric(metric.id)}
                className="w-full rounded-[22px] border px-4 py-3 text-left outline-none transition hover:border-[#f4bacc] focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                style={{
                  background: metric.id === activeMetric ? "linear-gradient(180deg,#fff7fa,#fffefe)" : "#ffffff",
                  borderColor: metric.id === activeMetric ? "#f5bfd0" : "#f2e6ec",
                  boxShadow: metric.id === activeMetric ? "0 16px 35px rgba(242, 86, 138, 0.10)" : "none",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px]" aria-hidden="true">
                        {metric.icon}
                      </span>
                      <p className="text-[15px] font-semibold text-[#2f2237]">{metric.label}</p>
                    </div>
                    <p className="mt-1 text-[13px] text-[#716173]">{metric.shortText}</p>
                  </div>
                  <span className="text-[18px] font-semibold text-[#2f2237]">{metric.score}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[#f7e9ef]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: metric.tint }}
                    animate={{ width: `${metric.score}%` }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <ActionTile
              eyebrow="Fazer agora"
              title="Check-in rapido"
              description="Atualize sintomas e rotina em segundos."
              actionLabel="Abrir"
              onClick={onOpenCheckin}
            />
            <ActionTile
              eyebrow="Seu proximo passo"
              title={analysis.topConcerns[0] === "hidratacao" ? "Mais agua" : analysis.topConcerns[0] === "forca" ? "Mais protecao" : analysis.topConcerns[0] === "definicao" ? "Mais controle" : "Mais selagem"}
              description={shortenActionLabel(nextActionLabel)}
              actionLabel="Ver sugestoes"
              onClick={() => onNavigate("recommendations")}
            />
          </div>

          <section className="rounded-[26px] border border-[#edf0e8] bg-[linear-gradient(180deg,#fcfff8_0%,#ffffff_100%)] p-4 lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] uppercase tracking-[0.12em] text-[#74836f]">Leitura inteligente</p>
                <h3 className="mt-2 text-[18px] font-semibold text-[#2d2730]">O que mais mexeu no seu resultado</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("progress")}
                className="rounded-full bg-white px-3 py-2 text-[13px] font-medium text-[#54704f] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#f2568a]"
              >
                {historyCount} registros
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniInsightStat
                label="Clima"
                value={analysis.climateLabel === "seco" ? "segurando agua" : analysis.climateLabel === "umido" ? "mexendo na forma" : "mais neutro"}
                icon="☁"
              />
              <MiniInsightStat
                label="Protecao"
                value={analysis.user.selectedHabits.length ? `${analysis.user.selectedHabits.length} habitos ativos` : "baixo hoje"}
                icon="🛏"
              />
              <MiniInsightStat
                label="Consistencia"
                value={`${analysis.consistencyScore} pontos`}
                icon="↗"
              />
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}

function RoutineTab({
  accent,
  completedSteps,
  selectedProducts,
  weeklyCareSessions,
  routineSteps,
  products,
  onToggleStep,
  onToggleProduct,
  onUpdateWeeklyCare,
}: {
  accent: string;
  completedSteps: string[];
  selectedProducts: string[];
  weeklyCareSessions: number;
  routineSteps: RoutineStep[];
  products: Product[];
  onToggleStep: (stepId: string) => void;
  onToggleProduct: (productId: string) => void;
  onUpdateWeeklyCare: (delta: number) => void;
}) {
  const currentIndex = routineSteps.findIndex((step) => !completedSteps.includes(step.id));

  return (
    <div className="space-y-4 lg:space-y-5">
      <section className="rounded-[26px] border border-[#f3e1e8] bg-white p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold text-[#2d2136]">Rotina de hoje</h3>
            <p className="mt-1 text-[14px] text-[#7a687d]">Cada etapa afeta hidratacao, definicao, forca e pontas.</p>
          </div>
          <span className="rounded-full bg-[#fff1f5] px-3 py-1 text-[14px] font-medium text-[#f2568a]">
            {completedSteps.length} de 4
          </span>
        </div>

        <div className="mt-4 h-2 rounded-full bg-[#f7e6ee]" aria-hidden="true">
          <div
            className="h-full rounded-full"
            style={{ width: `${(completedSteps.length / routineSteps.length) * 100}%`, background: accent }}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-start">
        <section className="space-y-3" aria-label="Lista de tarefas">
          {routineSteps.map((step, index) => {
            const done = completedSteps.includes(step.id);
            const isCurrent = currentIndex === index;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onToggleStep(step.id)}
                aria-pressed={done}
                className="w-full rounded-[24px] border bg-white p-4 text-left outline-none transition hover:border-[#f4b9cb] focus-visible:ring-2 focus-visible:ring-[#f2568a] lg:p-5"
                style={{
                  borderColor: isCurrent ? "#f5bfd0" : "#f2e6ec",
                  background: isCurrent ? "linear-gradient(180deg, #fff7fa, #fffefe)" : "#ffffff",
                  boxShadow: isCurrent ? "0 20px 40px rgba(242, 86, 138, 0.10)" : "none",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: done ? "#e7f6eb" : isCurrent ? "#ffe9f0" : "#f6f2f5",
                        color: done ? "#2f9d5a" : isCurrent ? "#f2568a" : "#917e91",
                      }}
                      aria-hidden="true"
                    >
                      {done ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-semibold text-[#2c2136]">{step.title}</h3>
                      <p className="mt-1 text-[14px] leading-[1.5] text-[#7a687d]">{step.hint}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[14px] font-medium text-[#6f5b72]">{step.duration}</p>
                    <span className="mt-2 inline-flex rounded-full bg-[#fff3dc] px-2 py-1 text-[14px] text-[#cc8b26]">
                      {done ? "feito" : isCurrent ? "agora" : "depois"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <div className="space-y-4 lg:space-y-5">
          <section className="rounded-[26px] border border-[#f2e5eb] bg-white p-4 lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[16px] font-semibold text-[#2d2234]">Produtos usados hoje</h3>
              <span className="text-[14px] text-[#7b687d]">{selectedProducts.length} ativos</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {products.map((product) => {
                const active = selectedProducts.includes(product.id);

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onToggleProduct(product.id)}
                    aria-pressed={active}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[14px] outline-none transition hover:border-[#f4bacc] focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                    style={{
                      background: active ? "#ffedf4" : "#ffffff",
                      borderColor: active ? "#f4bfd0" : "#f0e4ea",
                      color: active ? "#d9437c" : "#766577",
                    }}
                  >
                    {product.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[26px] bg-[linear-gradient(180deg,#fff2f7_0%,#fff6ee_100%)] p-4 lg:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[16px] font-semibold text-[#2f2234]">Frequencia de cuidados</h3>
                <p className="mt-1 text-[14px] leading-[1.55] text-[#6e5d70]">
                  O sistema usa essa frequencia para medir consistencia semanal real.
                </p>
              </div>
              <CounterControl value={weeklyCareSessions} onChange={onUpdateWeeklyCare} label="sessoes por semana" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function AnalysisTab({
  analysis,
  selectedSymptoms,
  selectedProducts,
  humidity,
  temperature,
  products,
  symptoms,
  onToggleSymptom,
  onToggleProduct,
  onUpdateClimate,
}: {
  analysis: AnalysisContext;
  selectedSymptoms: string[];
  selectedProducts: string[];
  humidity: number;
  temperature: number;
  products: Product[];
  symptoms: Array<{ id: string; label: string; icon: string }>;
  onToggleSymptom: (symptomId: string) => void;
  onToggleProduct: (productId: string) => void;
  onUpdateClimate: (field: "humidity" | "temperature", delta: number) => void;
}) {
  return (
    <div className="space-y-4 lg:space-y-5">
      <section className="rounded-[28px] border border-[#f3e4ef] bg-white p-4 text-center lg:p-6">
        <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_10deg,#ff8cb1,#ffc86b,#7bc8ff,#8b79ff,#7dd7a3,#ff8cb1)] opacity-85 blur-[2px]" />
          <div className="absolute inset-[12px] rounded-full bg-white/90 backdrop-blur" />
          <div className="relative z-10 max-w-[118px]">
            <p className="text-[14px] text-[#7f6b80]">Seu cabelo esta</p>
            <h3 className="mt-1 text-[16px] font-semibold text-[#2e2236]">{analysis.focusLabel.toLowerCase()}</h3>
            <p className="mt-1 text-[14px] text-[#7f6c81]">com base em sintomas, rotina, clima e historico</p>
          </div>
        </div>

        <p className="mt-2 text-[14px] leading-[1.55] text-[#6f5d71]">{analysis.summaryDescription}</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)] lg:items-start">
        <section className="rounded-[26px] border border-[#f3e6ec] bg-white p-4 lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[16px] font-semibold text-[#2d2234]">Como seu cabelo esta hoje?</h3>
            <span className="text-[14px] text-[#7b687d]">{selectedSymptoms.length} sintomas</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {symptoms.map((symptom) => {
              const active = selectedSymptoms.includes(symptom.id);

              return (
                <button
                  key={symptom.id}
                  type="button"
                  onClick={() => onToggleSymptom(symptom.id)}
                  aria-pressed={active}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[14px] font-medium outline-none transition hover:border-[#f4bacc] focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                  style={{
                    background: active ? "linear-gradient(180deg, #ffebf2, #fff6f9)" : "#ffffff",
                    borderColor: active ? "#f4bfd0" : "#f0e4ea",
                    color: active ? "#d9437c" : "#766577",
                  }}
                >
                  <span aria-hidden="true">{symptom.icon}</span>
                  {symptom.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[26px] border border-[#f3e6ec] bg-white p-4 lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[16px] font-semibold text-[#2d2234]">Contexto do dia</h3>
            <span className="text-[14px] text-[#7b687d]">{analysis.climateLabel}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ClimateControl
              icon={<Droplets size={18} />}
              label="Umidade"
              value={`${humidity}%`}
              onDecrease={() => onUpdateClimate("humidity", -5)}
              onIncrease={() => onUpdateClimate("humidity", 5)}
            />
            <ClimateControl
              icon={<CloudSun size={18} />}
              label="Temperatura"
              value={`${temperature} C`}
              onDecrease={() => onUpdateClimate("temperature", -1)}
              onIncrease={() => onUpdateClimate("temperature", 1)}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {products.map((product) => {
              const active = selectedProducts.includes(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onToggleProduct(product.id)}
                  aria-pressed={active}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[14px] outline-none transition hover:border-[#f4bacc] focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                  style={{
                    background: active ? "#ffedf4" : "#ffffff",
                    borderColor: active ? "#f4bfd0" : "#f0e4ea",
                    color: active ? "#d9437c" : "#766577",
                  }}
                >
                  {product.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={<Droplets size={18} />} label="Hidratacao" score={analysis.scores.hydration} tint="#eef8ff" />
        <MetricCard icon={<Flame size={18} />} label="Forca" score={analysis.scores.strength} tint="#fff6ea" />
        <MetricCard icon={<Sparkles size={18} />} label="Definicao" score={analysis.scores.definition} tint="#f7efff" />
        <MetricCard icon={<Scissors size={18} />} label="Pontas" score={analysis.scores.ends} tint="#fff0f4" />
      </section>

      <section className="rounded-[24px] bg-[linear-gradient(180deg,#fff6fa_0%,#fff4ef_100%)] p-4">
        <h3 className="text-[16px] font-semibold text-[#2f2234]">O que isso significa?</h3>
        <p className="mt-2 text-[14px] leading-[1.55] text-[#6e5d70]">{analysis.insights[1] ?? analysis.insights[0]}</p>
      </section>
    </div>
  );
}

function ProgressTab({
  accent,
  progressRange,
  progressSeries,
  analysis,
  onSetProgressRange,
}: {
  accent: string;
  progressRange: "7 dias" | "30 dias" | "90 dias";
  progressSeries: number[];
  analysis: AnalysisContext;
  onSetProgressRange: (range: "7 dias" | "30 dias" | "90 dias") => void;
}) {
  return (
    <div className="space-y-4 lg:space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start">
        <section className="rounded-[26px] border border-[#f3e4ec] bg-white p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold text-[#2d2236]">Sua evolucao</h3>
            <p className="mt-1 text-[14px] text-[#7b687d]">Historico persistido e recalculado a cada mudanca de contexto.</p>
          </div>
          <div className="flex rounded-full bg-[#faf4f7] p-1" role="tablist" aria-label="Intervalo do grafico">
            {(["7 dias", "30 dias", "90 dias"] as const).map((range) => (
              <button
                key={range}
                type="button"
                role="tab"
                aria-selected={progressRange === range}
                onClick={() => onSetProgressRange(range)}
                className="rounded-full px-3 py-2 text-[14px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                style={{
                  background: progressRange === range ? "#ffffff" : "transparent",
                  color: progressRange === range ? "#f2568a" : "#7b687d",
                  boxShadow: progressRange === range ? "0 8px 20px rgba(39,20,53,0.08)" : "none",
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[14px] font-medium text-[#7f6b80]">Variacao do periodo</p>
          <p className="mt-1 text-[36px] font-semibold leading-none" style={{ color: accent }}>
            {formatDelta(analysis.progressDelta)}
          </p>
          <p className="mt-1 text-[14px] text-[#7f6b80]">comparado com os registros anteriores do proprio usuario</p>
        </div>

        <div className="mt-5 rounded-[24px] bg-[linear-gradient(180deg,#fff9fb_0%,#fffdfd_100%)] p-3">
          <ProgressLineChart values={progressSeries} stroke={accent} />
        </div>
        </section>

        <section className="rounded-[24px] bg-[linear-gradient(180deg,#fff8ea_0%,#fffef8_100%)] p-4 lg:p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-white p-2 text-[#f3a32e] shadow-sm">
              <Star size={18} />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[#2d2234]">Leitura contextual</h3>
              <p className="mt-1 text-[14px] leading-[1.55] text-[#6d5e6f]">{analysis.insights[2] ?? analysis.insights[0]}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[26px] border border-[#f2e6ec] bg-white p-4 lg:p-5">
        <h3 className="text-[16px] font-semibold text-[#2e2336]">Marcos monitorados</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <ProgressBadge icon="💗" label="Maciez" value={`${analysis.scores.hydration}%`} />
          <ProgressBadge icon="🛡" label="Resistencia" value={`${analysis.scores.strength}%`} />
          <ProgressBadge icon="✨" label="Definicao" value={`${analysis.scores.definition}%`} />
          <ProgressBadge icon="✂" label="Pontas" value={`${analysis.scores.ends}%`} />
        </div>
      </section>
    </div>
  );
}

function RecommendationsTab({
  accent,
  filter,
  items,
  analysis,
  onSetFilter,
  onOpenRecommendation,
}: {
  accent: string;
  filter: RecommendationFilter;
  items: Array<Recommendation & { ranking: number }>;
  analysis: AnalysisContext;
  onSetFilter: (filter: RecommendationFilter) => void;
  onOpenRecommendation: (recommendationId: string) => void;
}) {
  return (
    <div className="space-y-4 lg:space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)] lg:items-start">
        <section className="rounded-[26px] border border-[#f1e4ec] bg-white p-4 lg:p-5">
          <h3 className="text-[16px] font-semibold text-[#2d2235]">Para voce</h3>
          <p className="mt-1 text-[14px] leading-[1.55] text-[#79677b]">
            Sugestoes ranqueadas por sintomas, consistencia, clima, produtos e historico.
          </p>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtro de recomendacoes">
            {(["Todos", "Rotina", "Produtos", "Habitos"] as RecommendationFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={filter === option}
                onClick={() => onSetFilter(option)}
                className="whitespace-nowrap rounded-full border px-4 py-2 text-[14px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                style={{
                  background: filter === option ? "#ffeaf2" : "#ffffff",
                  borderColor: filter === option ? "#f4bfd0" : "#efe3ea",
                  color: filter === option ? accent : "#7a697c",
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] bg-[linear-gradient(180deg,#fff7fa_0%,#fffefc_100%)] p-4 lg:p-5">
          <p className="text-[14px] leading-[1.55] text-[#6d5d71]">
            Hoje o sistema priorizou <strong>{analysis.topConcerns.join(" e ")}</strong> porque esses pontos estao mais sensiveis no seu contexto atual.
          </p>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-[26px] border border-[#f1e5eb] bg-white p-4 shadow-[0_14px_30px_rgba(43,24,54,0.05)] lg:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 inline-flex rounded-full bg-[#fff4f8] px-3 py-1 text-[14px] font-medium text-[#f2568a]">
                  {item.category}
                </div>
                <h3 className="text-[16px] font-semibold text-[#2d2236]">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.55] text-[#79687c]">{item.description}</p>
                <p className="mt-2 text-[14px] text-[#8a758a]">Prioridade calculada: {Math.round(item.ranking)}</p>
              </div>
              <div className="text-[32px]" aria-hidden="true">
                {item.icon}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenRecommendation(item.id)}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#f0d8e3] px-4 text-[14px] font-medium text-[#5f5064] outline-none transition hover:bg-[#fff7fa] focus-visible:ring-2 focus-visible:ring-[#f2568a]"
            >
              {item.cta}
              <ChevronRight size={16} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function RecommendationModal({
  accent,
  data,
  onClose,
  onNavigate,
}: {
  accent: string;
  data: RecommendationModalData;
  onClose: () => void;
  onNavigate: (tab: TabKey) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[rgba(38,20,45,0.38)] p-3 backdrop-blur-sm lg:items-center lg:p-6" role="dialog" aria-modal="true" aria-labelledby="recommendation-modal-title">
      <div className="mx-auto max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-[30px] bg-white p-5 shadow-[0_30px_80px_rgba(31,18,42,0.30)] lg:max-w-[960px] lg:rounded-[34px] lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium" style={{ color: accent }}>
              {data.subtitle}
            </p>
            <h2 id="recommendation-modal-title" className="mt-1 text-[20px] font-semibold leading-[1.2] text-[#2c2235]">
              {data.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#eedee6] text-[20px] text-[#705f73] outline-none transition hover:bg-[#fff6fa] focus-visible:ring-2 focus-visible:ring-[#f2568a]"
            aria-label="Fechar recomendacao"
          >
            ×
          </button>
        </div>

        <section className="mt-4 rounded-[22px] bg-[linear-gradient(180deg,#fff7fa_0%,#fffefc_100%)] p-4">
          <h3 className="text-[16px] font-semibold text-[#2d2236]">Por que isso apareceu agora?</h3>
          <p className="mt-2 text-[14px] leading-[1.6] text-[#6f5e72]">{data.reason}</p>
          <div className="mt-3 space-y-2">
            {data.whyNow.map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-[16px] bg-white/80 px-3 py-3">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#ffe7f0] text-[12px] text-[#f2568a]">•</span>
                <p className="text-[14px] leading-[1.55] text-[#6f5e72]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-[22px] border border-[#f1e4eb] p-4">
          <h3 className="text-[16px] font-semibold text-[#2d2236]">{data.protocolTitle}</h3>
          <ol className="mt-3 space-y-3">
            {data.protocolSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ffeaf2] text-[14px] font-medium text-[#f2568a]">
                  {index + 1}
                </span>
                <p className="text-[14px] leading-[1.55] text-[#6f5e72]">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-4 rounded-[22px] border border-[#f1e4eb] p-4">
          <h3 className="text-[16px] font-semibold text-[#2d2236]">Combinacoes compativeis com seu contexto</h3>
          {data.matchedProducts.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.matchedProducts.map((product) => (
                <span key={product.id} className="rounded-full bg-[#fff2f6] px-3 py-2 text-[14px] text-[#ca4e82]">
                  {product.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[14px] leading-[1.55] text-[#6f5e72]">
              Voce ainda nao cadastrou produtos suficientes para montar uma combinacao mais precisa. Comece registrando o que usa hoje.
            </p>
          )}
        </section>

        <section className="mt-4 rounded-[22px] bg-[linear-gradient(180deg,#fff8ec_0%,#fffdf8_100%)] p-4">
          <h3 className="text-[16px] font-semibold text-[#2d2236]">O que melhorar no seu cadastro</h3>
          {data.gaps.length ? (
            <div className="mt-3 space-y-2">
              {data.gaps.map((gap) => (
                <p key={gap} className="rounded-[16px] bg-white/80 px-3 py-3 text-[14px] leading-[1.55] text-[#6f5e72]">
                  {gap}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[14px] leading-[1.55] text-[#6f5e72]">
              Seu contexto ja esta consistente o bastante para recomendacoes mais confiaveis. Continue registrando seus dias para refinar ainda mais.
            </p>
          )}
        </section>

        <section className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
          {data.nextActions.map((action) => (
            <button
              key={`${data.title}-${action.label}`}
              type="button"
              onClick={() => onNavigate(action.tab)}
              className="inline-flex min-h-11 items-center justify-between rounded-[18px] border border-[#f1dfe7] px-4 text-[14px] font-medium text-[#5e5063] outline-none transition hover:bg-[#fff7fa] focus-visible:ring-2 focus-visible:ring-[#f2568a]"
            >
              {action.label}
              <ChevronRight size={16} />
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}

function ProfileTab({
  profile,
  user,
  analysis,
  onToggleReminders,
}: {
  profile: Profile;
  user: UserContext;
  analysis: AnalysisContext;
  onToggleReminders: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <section className="rounded-[26px] border border-[#f1e4ea] bg-white p-4 lg:p-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-[24px] text-white"
            style={{ background: profile.accent }}
            aria-hidden="true"
          >
            {profile.name.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold text-[#2e2236]">{profile.name}</h3>
            <p className="text-[14px] text-[#7a687c]">{profile.subtitle}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-[#f1e5eb] bg-white p-4 lg:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[#2d2236]">Perfil capilar</h3>
          <button
            type="button"
            className="text-[14px] font-medium text-[#f2568a] outline-none focus-visible:ring-2 focus-visible:ring-[#f2568a]"
          >
            Editar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ProfileMetric label="Textura" value={profile.texture} />
          <ProfileMetric label="Porosidade" value={profile.porosity} />
          <ProfileMetric label="Densidade" value={profile.density} />
          <ProfileMetric label="Fase atual" value={analysis.focusLabel} />
        </div>
      </section>

      <section className="rounded-[26px] border border-[#f1e5eb] bg-white p-4 lg:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold text-[#2d2236]">Meta atual</h3>
            <p className="mt-1 text-[14px] leading-[1.55] text-[#79677b]">{profile.currentGoal}</p>
          </div>
          <span className="rounded-full bg-[#fff0f5] px-3 py-1 text-[14px] font-medium text-[#f2568a]">
            {analysis.scores.ends}%
          </span>
        </div>
        <div
          className="mt-4 h-2 rounded-full bg-[#f8e8ef]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={analysis.scores.ends}
          aria-label="Progresso da meta atual"
        >
          <div className="h-full rounded-full bg-[#f2568a]" style={{ width: `${analysis.scores.ends}%` }} />
        </div>
      </section>

      <section className="rounded-[26px] bg-[linear-gradient(180deg,#fff7fa_0%,#fffdfd_100%)] p-4 lg:col-span-2 lg:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white p-2 text-[#8b79ff] shadow-sm">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[#2e2236]">Lembretes afetivos</h3>
              <p className="text-[14px] text-[#766679]">Persistidos junto ao restante do contexto do usuario.</p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={user.remindersEnabled}
            onClick={onToggleReminders}
            className="relative inline-flex h-7 w-12 items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[#f2568a]"
            style={{ background: user.remindersEnabled ? "#f2568a" : "#d6ccd7" }}
          >
            <span
              className="inline-block h-5 w-5 rounded-full bg-white transition"
              style={{ transform: user.remindersEnabled ? "translateX(24px)" : "translateX(4px)" }}
            />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ProfileMetric label="Clima atual" value={`${user.humidity}% / ${user.temperature} C`} />
          <ProfileMetric label="Frequencia" value={`${user.weeklyCareSessions} por semana`} />
          <ProfileMetric label="Produtos ativos" value={`${user.selectedProducts.length}`} />
          <ProfileMetric label="Registros" value={`${user.history.length}`} />
        </div>
      </section>
    </div>
  );
}

function AvatarBubble({ accent, label }: { accent: string; label: string }) {
  return (
    <div
      className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px] text-[40px] font-semibold text-white shadow-[0_20px_40px_rgba(242,86,138,0.18)]"
      style={{ background: `radial-gradient(circle at 30% 30%, #ffdbe7, ${accent})` }}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}

function HairPulsePanel({
  accent,
  analysis,
  mood,
  activeMetric,
  activeMetricConfig,
  metrics,
  onSelectMetric,
}: {
  accent: string;
  analysis: AnalysisContext;
  mood: "feliz" | "sedenta" | "lavagem" | "cansada" | "perfeita";
  activeMetric: keyof MetricScores;
  activeMetricConfig: FocusMetric;
  metrics: FocusMetric[];
  onSelectMetric: (metric: keyof MetricScores) => void;
}) {
  return (
    <div className="rounded-[30px] border border-white/70 bg-white/72 p-4 shadow-[0_24px_50px_rgba(103,73,112,0.10)] backdrop-blur lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] uppercase tracking-[0.14em] text-[#8e7a90]">Seu fio agora</p>
          <h3 className="mt-2 text-[20px] font-semibold text-[#2e2236]">{activeMetricConfig.headline}</h3>
        </div>
        <span className="rounded-full bg-[#fff0f5] px-3 py-1 text-[13px] font-medium text-[#d84f82]">{analysis.overallScore}%</span>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,#fff7fb_0%,#fff3f7_42%,#fffaf5_100%)] p-4">
        <motion.div
          className="absolute left-1/2 top-5 h-36 w-36 -translate-x-1/2 rounded-full opacity-70 blur-2xl"
          style={{ background: activeMetricConfig.id === "definition" ? activeMetricConfig.tint : accent }}
          animate={{ scale: [0.95, 1.06, 0.95], opacity: [0.42, 0.76, 0.42] }}
          transition={{ duration: 5.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-11 h-44 w-44 -translate-x-1/2 rounded-full border border-white/50"
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
        <motion.div
          className="absolute left-1/2 top-14 h-32 w-32 -translate-x-1/2 rounded-full border border-white/45"
          animate={{ rotate: -360 }}
          transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />

        <div className="relative mx-auto flex h-52 w-full max-w-[260px] items-center justify-center">
          <motion.div
            animate={{ y: [-3, 4, -3] }}
            transition={{ duration: 4.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="relative z-10 h-36 w-36 rounded-[36px] bg-white/55 p-3 shadow-[0_18px_40px_rgba(99,71,108,0.12)] backdrop-blur"
          >
            <HairCharacter mood={mood} />
          </motion.div>

          {metrics.map((metric, index) => {
            const positions = [
              "left-0 top-6",
              "right-0 top-8",
              "left-3 bottom-5",
              "right-2 bottom-3",
            ];

            return (
              <button
                key={metric.id}
                type="button"
                onClick={() => onSelectMetric(metric.id)}
                className={`absolute ${positions[index]} rounded-full border px-3 py-2 text-left shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#f2568a]`}
                style={{
                  background: metric.id === activeMetric ? "#2f2237" : "rgba(255,255,255,0.88)",
                  borderColor: metric.id === activeMetric ? "#2f2237" : "#f2e6ec",
                  color: metric.id === activeMetric ? "#ffffff" : "#54485a",
                }}
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden="true">{metric.icon}</span>
                  <div>
                    <p className="text-[11px] font-medium">{metric.label}</p>
                    <p className="text-[12px] font-semibold">{metric.score}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="relative z-10 rounded-[24px] bg-white/82 p-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-semibold text-[#2f2237]">{activeMetricConfig.label}</p>
            <span className="rounded-full px-3 py-1 text-[13px] font-medium text-[#2f2237]" style={{ background: activeMetricConfig.softTint }}>
              {activeMetricConfig.score} / 100
            </span>
          </div>
          <p className="mt-2 text-[14px] leading-[1.5] text-[#6a5b6f]">{activeMetricConfig.message}</p>
        </div>
      </div>
    </div>
  );
}

function ConversationalCard({
  title,
  text,
  tone,
  icon,
}: {
  title: string;
  text: string;
  tone: "positive" | "warning";
  icon: ReactNode;
}) {
  return (
    <div
      className="rounded-[22px] border p-4"
      style={{
        background: tone === "positive" ? "linear-gradient(180deg,#f8fff6,#ffffff)" : "linear-gradient(180deg,#fff6f9,#ffffff)",
        borderColor: tone === "positive" ? "#e6f3df" : "#f5dfe8",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: tone === "positive" ? "#e8f6d6" : "#ffe8f0", color: tone === "positive" ? "#567b3f" : "#d84f82" }}
        >
          {icon}
        </span>
        <p className="text-[14px] font-semibold text-[#2f2237]">{title}</p>
      </div>
      <p className="mt-2 text-[14px] leading-[1.5] text-[#6b5b6f]">{text}</p>
    </div>
  );
}

function ActionTile({
  eyebrow,
  title,
  description,
  actionLabel,
  onClick,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-[#f3e6ec] bg-white p-4 shadow-[0_12px_30px_rgba(34,24,39,0.04)]">
      <p className="text-[12px] uppercase tracking-[0.12em] text-[#958397]">{eyebrow}</p>
      <h4 className="mt-2 text-[20px] font-semibold leading-[1.1] text-[#2d2236]">{title}</h4>
      <p className="mt-2 text-[14px] leading-[1.5] text-[#6c5d70]">{description}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f2568a] px-4 text-[14px] font-medium text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#f2568a]"
      >
        {actionLabel}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function MiniInsightStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_rgba(34,24,39,0.04)]">
      <p className="text-[20px]" aria-hidden="true">
        {icon}
      </p>
      <p className="mt-2 text-[13px] uppercase tracking-[0.12em] text-[#85907c]">{label}</p>
      <p className="mt-2 text-[15px] font-medium leading-[1.35] text-[#2d2730]">{value}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  score,
  tint,
}: {
  icon: ReactNode;
  label: string;
  score: number;
  tint: string;
}) {
  const level = scoreToLevel(score);

  return (
    <article className="rounded-[24px] border border-[#efe4ea] bg-white p-4">
      <div className="inline-flex rounded-full p-2" style={{ background: tint }}>
        <span className="text-[#67556b]">{icon}</span>
      </div>
      <h3 className="mt-3 text-[16px] font-semibold text-[#2e2235]">{label}</h3>
      <p className="mt-1 text-[14px] text-[#7b687d]">{score}%</p>
      <div className="mt-2 flex gap-1" aria-label={`${label} com nota ${level} de 5`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={`${label}-${index}`}
            className="h-3 w-3 rounded-full"
            style={{ background: index < level ? "#f2568a" : "#efe2ea" }}
          />
        ))}
      </div>
    </article>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[#fff9fb] p-3">
      <p className="text-[14px] text-[#7d6c7f]">{label}</p>
      <p className="mt-1 text-[16px] font-semibold text-[#2d2236]">{value}</p>
    </div>
  );
}

function CounterControl({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (delta: number) => void;
  label: string;
}) {
  return (
    <div className="rounded-[20px] bg-white px-3 py-2 text-center shadow-sm">
      <p className="text-[16px] font-semibold text-[#2d2236]">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(-1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eddde7] text-[#6e5e72] outline-none focus-visible:ring-2 focus-visible:ring-[#f2568a]"
          aria-label={`Diminuir ${label}`}
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={() => onChange(1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eddde7] text-[#6e5e72] outline-none focus-visible:ring-2 focus-visible:ring-[#f2568a]"
          aria-label={`Aumentar ${label}`}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function ClimateControl({
  icon,
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="rounded-[22px] bg-[#fff9fb] p-3">
      <div className="flex items-center gap-2 text-[#6e5d71]">
        {icon}
        <p className="text-[14px]">{label}</p>
      </div>
      <p className="mt-2 text-[16px] font-semibold text-[#2d2236]">{value}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onDecrease}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eddde7] text-[#6e5e72] outline-none focus-visible:ring-2 focus-visible:ring-[#f2568a]"
          aria-label={`Diminuir ${label}`}
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={onIncrease}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eddde7] text-[#6e5e72] outline-none focus-visible:ring-2 focus-visible:ring-[#f2568a]"
          aria-label={`Aumentar ${label}`}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function ProgressBadge({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[#fff8fb] p-3 text-center">
      <div className="text-[22px]" aria-hidden="true">
        {icon}
      </div>
      <p className="mt-2 text-[14px] text-[#6e5f71]">{label}</p>
      <p className="mt-1 text-[16px] font-semibold text-[#2d2236]">{value}</p>
    </div>
  );
}

function ImpactMiniCard({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "positive" | "warning";
}) {
  return (
    <div
      className="rounded-[20px] p-3"
      style={{ background: tone === "positive" ? "#f5fbf3" : "#fff7fa", border: "1px solid #f3e4eb" }}
    >
      <p className="text-[14px] font-semibold text-[#2d2236]">{title}</p>
      <p className="mt-1 text-[14px] leading-[1.5] text-[#6f5e72]">{text}</p>
    </div>
  );
}

function HomeActionCard({
  title,
  description,
  actionLabel,
  onClick,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-[22px] border border-[#f6edf1] px-4 py-4">
      <h4 className="text-[16px] font-semibold text-[#2d2236]">{title}</h4>
      <p className="mt-2 text-[14px] leading-[1.55] text-[#6d5c70]">{description}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f2568a] px-4 text-[14px] font-medium text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#f2568a]"
      >
        {actionLabel}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function QuickCheckinModal({
  accent,
  draft,
  products,
  routineSteps,
  symptoms,
  habits,
  onToggleHabit,
  onClose,
  onSave,
}: {
  accent: string;
  draft: QuickCheckinDraft;
  products: Product[];
  routineSteps: RoutineStep[];
  symptoms: Array<{ id: string; label: string; icon: string }>;
  habits: Array<{ id: HabitId; label: string; description: string }>;
  onToggleHabit: (habitId: HabitId) => void;
  onClose: () => void;
  onSave: (draft: QuickCheckinDraft) => void;
}) {
  const [localDraft, setLocalDraft] = useState<QuickCheckinDraft>(draft);

  useEffect(() => {
    setLocalDraft(draft);
  }, [draft]);

  const toggleFromDraft = <T extends string,>(key: keyof QuickCheckinDraft, value: T) => {
    setLocalDraft((current) => {
      const list = current[key] as T[];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[rgba(38,20,45,0.38)] p-3 backdrop-blur-sm lg:items-center lg:p-6" role="dialog" aria-modal="true" aria-labelledby="quick-checkin-title">
      <div className="mx-auto max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-[30px] bg-white p-5 shadow-[0_30px_80px_rgba(31,18,42,0.30)] lg:max-w-[960px] lg:rounded-[34px] lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium" style={{ color: accent }}>
              Check-in diario
            </p>
            <h2 id="quick-checkin-title" className="mt-1 text-[20px] font-semibold text-[#2d2236]">
              Atualize o estado do seu cabelo em segundos
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#eedee6] text-[20px] text-[#705f73] outline-none transition hover:bg-[#fff6fa] focus-visible:ring-2 focus-visible:ring-[#f2568a]"
            aria-label="Fechar check-in"
          >
            ×
          </button>
        </div>

        <section className="mt-4">
          <h3 className="text-[16px] font-semibold text-[#2d2236]">Sintomas de hoje</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {symptoms.map((symptom) => {
              const active = localDraft.selectedSymptoms.includes(symptom.id);
              return (
                <button
                  key={symptom.id}
                  type="button"
                  onClick={() => toggleFromDraft("selectedSymptoms", symptom.id)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[14px] outline-none transition focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                  style={{
                    background: active ? "#ffedf4" : "#ffffff",
                    borderColor: active ? "#f4bfd0" : "#f0e4ea",
                    color: active ? "#d9437c" : "#766577",
                  }}
                >
                  <span aria-hidden="true">{symptom.icon}</span>
                  {symptom.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-[16px] font-semibold text-[#2d2236]">Produtos usados</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {products.map((product) => {
              const active = localDraft.selectedProducts.includes(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggleFromDraft("selectedProducts", product.id)}
                  className="inline-flex min-h-11 items-center rounded-full border px-4 text-[14px] outline-none transition focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                  style={{
                    background: active ? "#ffedf4" : "#ffffff",
                    borderColor: active ? "#f4bfd0" : "#f0e4ea",
                    color: active ? "#d9437c" : "#766577",
                  }}
                >
                  {product.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-[16px] font-semibold text-[#2d2236]">Rotina concluida</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {routineSteps.map((step) => {
              const active = localDraft.completedSteps.includes(step.id);
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => toggleFromDraft("completedSteps", step.id)}
                  className="inline-flex min-h-11 items-center rounded-full border px-4 text-[14px] outline-none transition focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                  style={{
                    background: active ? "#eff9f0" : "#ffffff",
                    borderColor: active ? "#bfe6c6" : "#f0e4ea",
                    color: active ? "#2f9d5a" : "#766577",
                  }}
                >
                  {step.title}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-[16px] font-semibold text-[#2d2236]">Habitos que impactaram hoje</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {habits.map((habit) => {
              const active = localDraft.selectedHabits.includes(habit.id);
              return (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => toggleFromDraft("selectedHabits", habit.id)}
                  className="inline-flex min-h-11 items-center rounded-full border px-4 text-[14px] outline-none transition focus-visible:ring-2 focus-visible:ring-[#f2568a]"
                  style={{
                    background: active ? "#fff3e8" : "#ffffff",
                    borderColor: active ? "#f5d5b8" : "#f0e4ea",
                    color: active ? "#b36a22" : "#766577",
                  }}
                >
                  {habit.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-[16px] font-semibold text-[#2d2236]">Observacao rapida</h3>
          <textarea
            value={localDraft.dailyNote}
            onChange={(event) => setLocalDraft((current) => ({ ...current, dailyNote: event.target.value.slice(0, 180) }))}
            className="mt-3 min-h-24 w-full rounded-[18px] border border-[#f0e4ea] px-4 py-3 text-[14px] text-[#3d2f41] outline-none focus-visible:ring-2 focus-visible:ring-[#f2568a]"
            placeholder="Ex.: senti mais aspereza nas pontas depois do clima seco."
          />
          <div className="mt-3 flex items-center justify-between rounded-[18px] bg-[#fff8fb] px-4 py-3">
            <div>
              <p className="text-[14px] font-medium text-[#2d2236]">Foto registrada hoje</p>
              <p className="text-[14px] text-[#7a687d]">Marque se voce comparou visualmente o cabelo.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={localDraft.photoLogged}
              onClick={() => setLocalDraft((current) => ({ ...current, photoLogged: !current.photoLogged }))}
              className="relative inline-flex h-7 w-12 items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[#f2568a]"
              style={{ background: localDraft.photoLogged ? accent : "#d6ccd7" }}
            >
              <span
                className="inline-block h-5 w-5 rounded-full bg-white transition"
                style={{ transform: localDraft.photoLogged ? "translateX(24px)" : "translateX(4px)" }}
              />
            </button>
          </div>
        </section>

        <button
          type="button"
          onClick={() => onSave(localDraft)}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full text-[14px] font-medium text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#f2568a]"
          style={{ background: `linear-gradient(180deg, ${accent}, #f2568a)` }}
        >
          Salvar e atualizar insights
        </button>
      </div>
    </div>
  );
}

function ProgressLineChart({ values, stroke }: { values: number[]; stroke: string }) {
  const width = 300;
  const height = 150;
  const padding = 14;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  const points = values
    .map((value, index) => {
      const x = padding + (index / Math.max(1, values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[170px] w-full" role="img" aria-label="Grafico de evolucao capilar">
      <defs>
        <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.30" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {[0, 1, 2, 3].map((line) => {
        const y = padding + line * ((height - padding * 2) / 3);
        return <line key={line} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#f1e6eb" strokeDasharray="4 6" />;
      })}

      <polygon points={areaPoints} fill="url(#chart-fill)" />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {values.map((value, index) => {
        const x = padding + (index / Math.max(1, values.length - 1)) * (width - padding * 2);
        const y = height - padding - ((value - min) / range) * (height - padding * 2);

        return <circle key={`${value}-${index}`} cx={x} cy={y} r="5" fill="white" stroke={stroke} strokeWidth="2" />;
      })}
    </svg>
  );
}

function sanitizeState(value: PersistedState): PersistedState {
  return {
    profileIndex: typeof value.profileIndex === "number" ? value.profileIndex : defaultPersistedState.profileIndex,
    recommendationFilter: value.recommendationFilter ?? defaultPersistedState.recommendationFilter,
    progressRange: value.progressRange ?? defaultPersistedState.progressRange,
    user: {
      selectedSymptoms: Array.isArray(value.user?.selectedSymptoms) ? value.user.selectedSymptoms : defaultPersistedState.user.selectedSymptoms,
      completedSteps: Array.isArray(value.user?.completedSteps) ? value.user.completedSteps : defaultPersistedState.user.completedSteps,
      selectedProducts: Array.isArray(value.user?.selectedProducts) ? value.user.selectedProducts : defaultPersistedState.user.selectedProducts,
      selectedHabits: Array.isArray(value.user?.selectedHabits) ? value.user.selectedHabits : defaultPersistedState.user.selectedHabits,
      dailyNote: typeof value.user?.dailyNote === "string" ? value.user.dailyNote : defaultPersistedState.user.dailyNote,
      photoLogged: typeof value.user?.photoLogged === "boolean" ? value.user.photoLogged : defaultPersistedState.user.photoLogged,
      weeklyCareSessions: typeof value.user?.weeklyCareSessions === "number" ? value.user.weeklyCareSessions : defaultPersistedState.user.weeklyCareSessions,
      humidity: typeof value.user?.humidity === "number" ? value.user.humidity : defaultPersistedState.user.humidity,
      temperature: typeof value.user?.temperature === "number" ? value.user.temperature : defaultPersistedState.user.temperature,
      remindersEnabled: typeof value.user?.remindersEnabled === "boolean" ? value.user.remindersEnabled : defaultPersistedState.user.remindersEnabled,
      history: Array.isArray(value.user?.history)
        ? value.user.history.map((entry) => ({
            ...entry,
            habits: Array.isArray(entry.habits) ? entry.habits : [],
            note: typeof entry.note === "string" ? entry.note : "",
            photoLogged: typeof entry.photoLogged === "boolean" ? entry.photoLogged : false,
          }))
        : defaultPersistedState.user.history,
    },
  };
}

function buildAnalysis(profile: Profile, user: UserContext): AnalysisContext {
  const completionRatio = user.completedSteps.length / routineSteps.length;
  const productEffects = sumMetricEffects(products.filter((product) => user.selectedProducts.includes(product.id)).map((product) => product.effects));
  const routineEffects = sumMetricEffects(routineSteps.filter((step) => user.completedSteps.includes(step.id)).map((step) => step.benefits));
  const symptomEffects = sumMetricEffects(symptoms.filter((symptom) => user.selectedSymptoms.includes(symptom.id)).map((symptom) => symptom.impact));
  const habitEffects = getHabitEffects(user.selectedHabits);
  const climateLabel = getClimateLabel(user.humidity);
  const climateEffects = getClimateEffects(user.humidity, user.temperature);
  const consistencyScore = clamp(45 + user.weeklyCareSessions * 7 + Math.round(completionRatio * 18) + user.selectedHabits.length * 3, 0, 100);
  const historyTrend = getHistoryTrend(user.history);

  const scores = normalizeScores({
    hydration: profile.baseScores.hydration + routineEffects.hydration + productEffects.hydration + symptomEffects.hydration + habitEffects.hydration + climateEffects.hydration + Math.round(historyTrend / 2),
    strength: profile.baseScores.strength + routineEffects.strength + productEffects.strength + symptomEffects.strength + habitEffects.strength + climateEffects.strength + Math.round(historyTrend / 2),
    definition: profile.baseScores.definition + routineEffects.definition + productEffects.definition + symptomEffects.definition + habitEffects.definition + climateEffects.definition + Math.round(historyTrend / 2),
    ends: profile.baseScores.ends + routineEffects.ends + productEffects.ends + symptomEffects.ends + habitEffects.ends + climateEffects.ends + Math.round(historyTrend / 2),
  });

  const overallScore = Math.round((scores.hydration + scores.strength + scores.definition + scores.ends) / 4);
  const topConcerns = getTopConcerns(scores);
  const progressDelta = historyTrend;
  const focusLabel = buildFocusLabel(topConcerns, overallScore);
  const summaryTitle = buildSummaryTitle(topConcerns, climateLabel, completionRatio);
  const summaryDescription = buildSummaryDescription(topConcerns, climateLabel, consistencyScore);
  const insights = buildInsights(topConcerns, user, scores, climateLabel, progressDelta);

  return {
    profile,
    user,
    scores,
    completionRatio,
    climateLabel,
    consistencyScore,
    overallScore,
    progressDelta,
    topConcerns,
    summaryTitle,
    summaryDescription,
    focusLabel,
    insights,
  };
}

function syncHistory(user: UserContext, profile: Profile): UserContext {
  const today = new Date().toISOString().slice(0, 10);
  const scores = buildAnalysis(profile, { ...user, history: user.history }).scores;
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
  const nextHistory = [...withoutToday, todaysEntry].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  return { ...user, history: nextHistory };
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

function getClimateEffects(humidity: number, temperature: number): MetricScores {
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
      if (habitId === "fronha-cetim") {
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

function buildFocusLabel(topConcerns: string[], overallScore: number) {
  if (overallScore >= 74) return "Equilibrio guiado";
  if (topConcerns.includes("hidratacao") && topConcerns.includes("pontas")) return "Hidratacao + selagem";
  if (topConcerns.includes("forca")) return "Reforco estrutural";
  if (topConcerns.includes("definicao")) return "Definicao com controle";
  return "Cuidado personalizado";
}

function buildSummaryTitle(topConcerns: string[], climateLabel: ClimateLabel, completionRatio: number) {
  if (completionRatio < 0.5) return "Seu cabelo precisa de mais consistencia hoje";
  if (topConcerns.includes("hidratacao")) return "Seu cabelo esta pedindo mais agua e maciez";
  if (topConcerns.includes("forca")) return "Sua fibra precisa de protecao e menos atrito";
  if (climateLabel === "umido") return "O clima esta influenciando a definicao hoje";
  return "Seu cabelo esta em evolucao cuidadosa";
}

function buildSummaryDescription(topConcerns: string[], climateLabel: ClimateLabel, consistencyScore: number) {
  const concernText = topConcerns.join(" e ");
  const climateText =
    climateLabel === "seco"
      ? "O ar seco esta puxando agua do fio."
      : climateLabel === "umido"
        ? "A umidade alta esta interferindo na forma e no acabamento."
        : "O clima esta mais neutro hoje.";

  return `${climateText} O sistema identificou maior necessidade em ${concernText}. Sua consistencia atual esta em ${consistencyScore} pontos.`;
}

function buildInsights(
  topConcerns: string[],
  user: UserContext,
  scores: MetricScores,
  climateLabel: ClimateLabel,
  progressDelta: number,
) {
  const insights: string[] = [];

  insights.push(
    `Com ${user.completedSteps.length} etapas concluidas e ${user.selectedProducts.length} produtos ativos, sua resposta mais sensivel hoje esta em ${topConcerns[0]}.`,
  );

  insights.push(
    climateLabel === "umido"
      ? "Como a umidade esta alta, finalizacao leve e selagem ajudam a segurar definicao com menos frizz."
      : climateLabel === "seco"
        ? "Como o clima esta seco, manter agua e oleo na medida certa ajuda a proteger toque e pontas."
        : "Seu clima esta equilibrado, entao o resultado de hoje depende mais da consistencia da rotina.",
  );

  insights.push(
    progressDelta >= 0
      ? `Sua media recente subiu ${progressDelta} pontos em relacao ao bloco anterior do historico.`
      : `Sua media recente caiu ${Math.abs(progressDelta)} pontos e merece ajuste de frequencia ou produtos.`,
  );

  insights.push(`Hoje seus indicadores estao em ${scores.hydration}% de hidratacao, ${scores.strength}% de forca, ${scores.definition}% de definicao e ${scores.ends}% de pontas.`);
  return insights;
}

function getPositiveDriver(analysis: AnalysisContext) {
  if (analysis.user.completedSteps.length >= 3) {
    return `Sua rotina de hoje ja soma ${analysis.user.completedSteps.length} etapas concluidas, o que esta sustentando melhor o resultado.`;
  }
  if (analysis.user.selectedHabits.length) {
    return `Seus habitos de ${analysis.user.selectedHabits.length} cuidado(s) extra estao ajudando a proteger o fio hoje.`;
  }
  return `Seu historico recente ${analysis.progressDelta >= 0 ? "melhorou" : "segue estavel"} e isso ajuda o sistema a recomendar com mais precisao.`;
}

function getNegativeDriver(analysis: AnalysisContext) {
  if (analysis.climateLabel === "umido") {
    return `A umidade alta esta pesando mais na definicao e no controle do frizz hoje.`;
  }
  if (analysis.user.selectedSymptoms.length >= 3) {
    return `A soma dos sintomas marcados hoje esta deixando ${analysis.topConcerns[0]} mais sensivel.`;
  }
  return `Sua consistencia ainda pode crescer para dar respostas mais estaveis ao longo da semana.`;
}

function getNextActionLabel(analysis: AnalysisContext) {
  if (analysis.topConcerns.includes("hidratacao")) {
    return "Hoje vale priorizar reposicao de agua e uma finalizacao que segure maciez sem pesar.";
  }
  if (analysis.topConcerns.includes("forca")) {
    return "Hoje o mais importante e proteger a fibra, reduzir atrito e evitar excesso de manipulacao.";
  }
  if (analysis.topConcerns.includes("definicao")) {
    return "Hoje a prioridade e controlar forma e acabamento com menos frizz e mais leveza.";
  }
  return "Hoje a prioridade e selar e observar como as pontas respondem ao cuidado leve.";
}

function getHairMood(analysis: AnalysisContext): "feliz" | "sedenta" | "lavagem" | "cansada" | "perfeita" {
  if (analysis.overallScore >= 80) return "perfeita";
  if (analysis.topConcerns.includes("hidratacao")) return "sedenta";
  if (analysis.topConcerns.includes("forca")) return "cansada";
  if (analysis.topConcerns.includes("definicao")) return "lavagem";
  return "feliz";
}

function getHomeGreeting(analysis: AnalysisContext) {
  if (analysis.overallScore >= 80) return "Seu cabelo acordou alinhado.";
  if (analysis.topConcerns.includes("hidratacao")) return "Seu cabelo quer agua e leveza.";
  if (analysis.topConcerns.includes("forca")) return "Seu fio quer menos atrito hoje.";
  if (analysis.topConcerns.includes("definicao")) return "Sua forma pede controle suave.";
  return "Seu cabelo quer cuidado certeiro.";
}

function getContextualMoment(analysis: AnalysisContext) {
  if (analysis.climateLabel === "seco") return "ar mais seco";
  if (analysis.climateLabel === "umido") return "umidade alta";
  if (analysis.user.selectedHabits.length >= 2) return "boa protecao ativa";
  return "dia equilibrado";
}

function getInsightPills(analysis: AnalysisContext) {
  return [
    {
      icon: "💧",
      label: "Clima",
      value: analysis.climateLabel === "seco" ? "segura menos agua" : analysis.climateLabel === "umido" ? "abre mais frizz" : "mais estavel",
    },
    {
      icon: "🪮",
      label: "Rotina",
      value: `${analysis.user.completedSteps.length} etapa${analysis.user.completedSteps.length === 1 ? "" : "s"}`,
    },
    {
      icon: "✨",
      label: "Consistencia",
      value: `${analysis.consistencyScore} pts`,
    },
  ];
}

function getFocusMetrics(analysis: AnalysisContext): FocusMetric[] {
  return [
    {
      id: "hydration",
      label: "Hidratacao",
      score: analysis.scores.hydration,
      icon: "💧",
      tint: "linear-gradient(90deg,#7dd3fc,#38bdf8)",
      softTint: "#e7f8ff",
      shortText: analysis.scores.hydration >= 72 ? "segurando agua" : "pedindo reposicao",
      headline: analysis.scores.hydration >= 72 ? "Maciez mais estavel" : "Hora de devolver agua",
      message:
        analysis.scores.hydration >= 72
          ? "A fibra esta respondendo bem. Vale manter finalizacao leve para preservar maciez."
          : "O fio esta perdendo agua mais rapido hoje. Uma camada hidratante leve deve render melhor agora.",
    },
    {
      id: "definition",
      label: "Definicao",
      score: analysis.scores.definition,
      icon: "〰️",
      tint: "linear-gradient(90deg,#f9a8d4,#f472b6)",
      softTint: "#fff0f6",
      shortText: analysis.scores.definition >= 72 ? "forma segura" : "acabamento instavel",
      headline: analysis.scores.definition >= 72 ? "Forma em boa leitura" : "Definicao mais sensivel",
      message:
        analysis.climateLabel === "umido"
          ? "A umidade esta mexendo com a forma. Menos toque e mais selagem tendem a ajudar."
          : analysis.scores.definition >= 72
            ? "A forma esta se mantendo bem. Pequenos ajustes bastam para sustentar o visual."
            : "Seu cabelo esta respondendo com mais frizz e menos encaixe. Finalizacao direcionada faz diferenca agora.",
    },
    {
      id: "strength",
      label: "Forca",
      score: analysis.scores.strength,
      icon: "🛡️",
      tint: "linear-gradient(90deg,#fbbf24,#f59e0b)",
      softTint: "#fff6df",
      shortText: analysis.scores.strength >= 72 ? "fibra protegida" : "pedindo menos atrito",
      headline: analysis.scores.strength >= 72 ? "Estrutura bem sustentada" : "Fibra mais vulneravel",
      message:
        analysis.scores.strength >= 72
          ? "A resistencia esta mais estavel. Mantendo protecao e menos manipulacao, o resultado tende a segurar."
          : "Hoje vale evitar atrito, calor excessivo e penteados que puxem a base com mais forca.",
    },
    {
      id: "ends",
      label: "Pontas",
      score: analysis.scores.ends,
      icon: "✂️",
      tint: "linear-gradient(90deg,#c4b5fd,#8b5cf6)",
      softTint: "#f2edff",
      shortText: analysis.scores.ends >= 72 ? "bem seladas" : "mais asperas",
      headline: analysis.scores.ends >= 72 ? "Pontas sob controle" : "Pontas pedindo selagem",
      message:
        analysis.scores.ends >= 72
          ? "As pontas estao comportadas. Um cuidado leve ja ajuda a manter o acabamento."
          : "As pontas estao sentindo mais o dia. Um selante leve ou oleo nas extremidades tende a responder melhor.",
    },
  ];
}

function shortenActionLabel(text: string) {
  return text
    .replace("Hoje vale priorizar ", "")
    .replace("Hoje o mais importante e ", "")
    .replace("Hoje a prioridade e ", "")
    .trim();
}

function buildRecommendationModalData(
  recommendation: Recommendation & { ranking: number },
  analysis: AnalysisContext,
): RecommendationModalData {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const userProducts = analysis.user.selectedProducts.map((id) => productMap.get(id)).filter(Boolean) as Product[];
  const missingData: string[] = [];

  if (analysis.user.selectedProducts.length < 2) {
    missingData.push("Cadastre mais produtos que voce realmente usa. Isso ajuda o app a diferenciar sugestao ideal de sugestao apenas possivel.");
  }
  if (analysis.user.weeklyCareSessions < 2) {
    missingData.push("Sua frequencia semanal ainda esta baixa para entender padrao de resposta do fio. Registrar mais dias vai melhorar a precisao.");
  }
  if (analysis.user.history.length < 5) {
    missingData.push("Seu historico ainda esta curto. Com mais registros o app consegue separar efeito de clima, rotina e produto com mais confianca.");
  }
  if (!analysis.user.selectedSymptoms.length) {
    missingData.push("Marcar sintomas do dia ajuda o sistema a entender melhor o estado atual do cabelo.");
  }

  if (recommendation.id === "repair-structure") {
    return {
      title: recommendation.title,
      subtitle: "Protocolo de rotina contextual",
      reason: `Essa recomendacao apareceu porque sua forca e pontas estao entre os pontos mais sensiveis agora. O sistema cruzou quebra marcada, ${analysis.user.completedSteps.length} etapa(s) concluida(s), ${analysis.user.weeklyCareSessions} cuidado(s) por semana e a evolucao recente do seu historico.`,
      protocolTitle: "Protocolo sugerido para hoje",
      protocolSteps: [
        "Priorize uma mascara reconstrutora apenas se a fibra estiver elastica ou quebrando com facilidade.",
        "Finalize com um produto que reduza atrito nas pontas para evitar perda mecanica ao longo do dia.",
        "Se ja houve reconstrucao recente, mantenha foco em hidratacao e selagem em vez de repetir proteina em excesso.",
      ],
      matchedProducts: userProducts.filter((product) => product.type === "mask" || product.type === "oil"),
      whyNow: [
        `Forca atual em ${analysis.scores.strength}% e pontas em ${analysis.scores.ends}%.`,
        `A quebra marcada hoje esta reduzindo a leitura estrutural do fio.`,
        `Seu historico sugere que consistencia traz mais resultado do que intervencoes pesadas isoladas.`,
      ],
      gaps: missingData,
      nextActions: [
        { label: "Abrir Rotina para ajustar etapas", tab: "routine" },
        { label: "Revisar sintomas de hoje", tab: "analysis" },
        { label: "Ver produtos cadastrados", tab: "profile" },
      ],
    };
  }

  if (recommendation.id === "hydrate-now") {
    return {
      title: recommendation.title,
      subtitle: "Combinacao personalizada de produtos",
      reason: `Essa recomendacao apareceu porque hidratacao esta em ${analysis.scores.hydration}% e ha sinais de perda de agua no seu contexto atual. O sistema cruzou sintomas, clima ${analysis.climateLabel}, produtos ativos e resposta recente do seu cabelo.`,
      protocolTitle: "Combinacao sugerida",
      protocolSteps: [
        "Comece com a mascara mais umectante que voce ja cadastrou para repor agua sem pesar.",
        "Finalize com creme ou leave-in leve para segurar definicao e reduzir ressecamento ao longo do dia.",
        "Se as pontas estiverem asperas, adicione uma camada pequena de oleo apenas no final.",
      ],
      matchedProducts: userProducts.filter((product) => product.type === "mask" || product.type === "leave-in" || product.type === "oil"),
      whyNow: [
        `Hidratacao em ${analysis.scores.hydration}% e clima ${analysis.climateLabel}.`,
        "Os sinais atuais indicam que o fio responde melhor a agua com selagem do que a peso extra.",
        `Voce esta usando ${analysis.user.selectedProducts.length} produto(s) ativo(s), o que permite sugerir combinacoes mais especificas.`,
      ],
      gaps: missingData,
      nextActions: [
        { label: "Ajustar produtos usados hoje", tab: "analysis" },
        { label: "Completar cadastro de rotina", tab: "routine" },
        { label: "Revisar perfil e meta", tab: "profile" },
      ],
    };
  }

  if (recommendation.id === "humidity-control") {
    return {
      title: recommendation.title,
      subtitle: "Habit o e finalizacao guiados pelo clima",
      reason: `Essa recomendacao apareceu porque a umidade atual esta em ${analysis.user.humidity}% e sua definicao esta em ${analysis.scores.definition}%. O sistema identificou interferencia do clima na forma e no acabamento.`,
      protocolTitle: "Ajuste pratico para hoje",
      protocolSteps: [
        "Reduza excesso de manipulação depois da finalizacao para evitar expansão do frizz.",
        "Use menos agua no refresh se o clima estiver muito umido e priorize selagem leve.",
        "Observe se o cabelo perde forma rapido; se sim, registre isso para o sistema diferenciar clima de produto.",
      ],
      matchedProducts: userProducts.filter((product) => product.type === "leave-in" || product.type === "oil" || product.type === "tonic"),
      whyNow: [
        `Umidade atual em ${analysis.user.humidity}% e temperatura em ${analysis.user.temperature} C.`,
        "Seu contexto de hoje favorece perda de definicao e aumento de frizz.",
        "A recomendacao junta comportamento do clima com o que voce marcou e com sua rotina recente.",
      ],
      gaps: missingData,
      nextActions: [
        { label: "Atualizar clima e sintomas", tab: "analysis" },
        { label: "Ajustar frequencia semanal", tab: "routine" },
      ],
    };
  }

  return {
    title: recommendation.title,
    subtitle: "Direcionador inteligente da sua jornada",
    reason: `Essa recomendacao apareceu porque sua consistencia atual esta em ${analysis.consistencyScore} pontos e o sistema percebeu espaco para melhorar a distribuicao dos cuidados ao longo da semana.`,
    protocolTitle: "Como adaptar isso para sua realidade",
    protocolSteps: [
      "Distribua os cuidados de forma mais leve durante a semana em vez de concentrar tudo em um unico dia.",
      "Mantenha registro do que funcionou e do que piorou para o sistema separar habito de resposta do cabelo.",
      "Revise seus objetivos e produtos cadastrados para que as proximas sugestoes fiquem mais precisas.",
    ],
    matchedProducts: userProducts,
    whyNow: [
      `Frequencia atual: ${analysis.user.weeklyCareSessions} cuidado(s) por semana.`,
      `Historico salvo: ${analysis.user.history.length} registro(s).`,
      "Mais regularidade gera leitura melhor da evolucao do fio e produz recomendacoes mais confiaveis.",
    ],
    gaps: missingData,
    nextActions: [
      { label: "Montar frequencia na rotina", tab: "routine" },
      { label: "Revisar historico e progresso", tab: "progress" },
      { label: "Completar perfil", tab: "profile" },
    ],
  };
}

function buildSeriesFromHistory(history: HistoryEntry[], count: number) {
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

function scoreToLevel(score: number) {
  return clamp(Math.round(score / 20), 1, 5);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function activeTabLabel(tab: TabKey) {
  switch (tab) {
    case "home":
      return "Seu cuidado de hoje";
    case "routine":
      return "Rotina interativa";
    case "analysis":
      return "Analise do dia";
    case "progress":
      return "Evolucao real";
    case "recommendations":
      return "Recomendacoes para voce";
    case "profile":
      return "Perfil completo";
    default:
      return "Raiz";
  }
}

function App() {
  const [route, setRoute] = useState(() => getAppRoute());
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const syncRoute = () => setRoute(getAppRoute());

    syncRoute();
    window.addEventListener("popstate", syncRoute);

    return () => {
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabaseApi
      .getSession()
      .then((nextSession) => {
        if (isMounted) {
          setSession(nextSession);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSession(null);
        }
      });

    const {
      data: { subscription },
    } = supabaseApi.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (route === LOGIN_ROUTE || !session) {
    return (
      <LoginRoute
        session={session}
        onAuthenticated={setSession}
        onBack={() => navigateTo(session ? "/" : LOGIN_ROUTE, true)}
        onSignOut={async () => {
          await supabaseApi.signOut();
          setSession(null);
        }}
      />
    );
  }

  return (
    <DashboardApp
      session={session}
      onSignOut={async () => {
        await supabaseApi.signOut();
        setSession(null);
      }}
    />
  );
}

export default App;
