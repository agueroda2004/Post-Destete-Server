import "dotenv/config";

import * as bcrypt from "bcrypt";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../generated/prisma/client";

const SEED_USER_EMAIL = "admin@postdestete.local";
const SEED_USER_PASSWORD = "admin1234";
const BCRYPT_SALT_ROUNDS = 10;

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST!,
  user: process.env.DATABASE_USER!,
  password: process.env.DATABASE_PASSWORD!,
  database: process.env.DATABASE_NAME!,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

type DiseaseSeed = {
  name: string;
  active: boolean;
};

type DiseasesDistribution = {
  name: string;
  weight: number;
};

const DISEASES: DiseaseSeed[] = [
  { name: "PRRS (Síndrome Reproductivo y Respiratorio Porcino)", active: true },
  { name: "Circovirosis porcina (PCV2)", active: true },
  { name: "Neumonía enzoótica (Mycoplasma hyopneumoniae)", active: true },
  { name: "Enfermedad de Glässer (Haemophilus parasuis)", active: true },
  { name: "Colibacilosis post-destete", active: true },
  { name: "Salmonelosis porcina", active: true },
  { name: "Ileítis (Lawsonia intracellularis)", active: true },
  { name: "Diarrea epidémica porcina (PED)", active: true },
  { name: "Influenza porcina", active: true },
  { name: "Pleuropneumonía (Actinobacillus pleuropneumoniae)", active: true },
  { name: "Rinitis atrófica", active: true },
  { name: "Estreptococosis (Streptococcus suis)", active: true },
  { name: "Erisipela porcina", active: true },
  { name: "Coccidiosis", active: true },
  { name: "Síndrome del desmedro multisistémico post-destete", active: false },
  { name: "Pleuroneumonía crónica (residual)", active: false },
];

const DISEASES_DISTRIBUTION: DiseasesDistribution[] = [
  { name: "Neumonía enzoótica (Mycoplasma hyopneumoniae)", weight: 18 },
  { name: "PRRS (Síndrome Reproductivo y Respiratorio Porcino)", weight: 15 },
  { name: "Circovirosis porcina (PCV2)", weight: 12 },
  { name: "Colibacilosis post-destete", weight: 10 },
  { name: "Enfermedad de Glässer (Haemophilus parasuis)", weight: 8 },
  { name: "Influenza porcina", weight: 7 },
  { name: "Salmonelosis porcina", weight: 6 },
  { name: "Ileítis (Lawsonia intracellularis)", weight: 5 },
  { name: "Pleuropneumonía (Actinobacillus pleuropneumoniae)", weight: 5 },
  { name: "Diarrea epidémica porcina (PED)", weight: 4 },
  { name: "Estreptococosis (Streptococcus suis)", weight: 4 },
  { name: "Rinitis atrófica", weight: 3 },
  { name: "Erisipela porcina", weight: 2 },
  { name: "Coccidiosis", weight: 1 },
];

const CORRAL_TYPES = ["Corral", "Hospital", "Cuna"] as const;
type CorralType = (typeof CORRAL_TYPES)[number];

const FOOD_PHASES = [
  "Fase1",
  "Fase2",
  "Fase3",
  "InicioMedicado",
  "InicioCorriente",
  "DesarrolloMedicado",
  "DesarrolloCorriente",
  "Engorde",
] as const;
type FoodPhase = (typeof FOOD_PHASES)[number];

const CORRAL_TYPE_WEIGHTS: Record<CorralType, number> = {
  Corral: 60,
  Hospital: 25,
  Cuna: 15,
};

const FOOD_PHASE_WEIGHTS: Record<FoodPhase, number> = {
  InicioMedicado: 18,
  InicioCorriente: 17,
  Fase1: 12,
  Fase2: 10,
  Fase3: 8,
  DesarrolloMedicado: 14,
  DesarrolloCorriente: 11,
  Engorde: 10,
};

const NOTES = [
  "Hallado sin signos clínicos previos durante la recorrida matutina.",
  "Muestra enviada a laboratorio para confirmación diagnóstica.",
  "Caso aislado, sin otros cerdos con síntomas en el corral.",
  "Presentaba tos seca y decaimiento desde el día anterior.",
  "Diarrea líquida con restos de mucus, tratado sin respuesta.",
  "Coordinó con veterinario; se aplicó protocolo del establecimiento.",
  "Muerte súbita, sin signos premonitorios claros.",
  "Lesiones compatibles con proceso respiratorio crónico.",
  "Brotó un foco en el corral lindante, se reforzaron medidas biosanitarias.",
  "Se descartó intervención por bajo peso al momento de la muerte.",
  "Animal con antecedentes de fallo en el destete, camadas previas con incidencia.",
  "Marcada pérdida de condición corporal en los últimos 7 días.",
  "Sin respuesta al tratamiento con antibiótico del stock del criadero.",
  "Se aplicó eutanasia por compromiso respiratorio severo.",
  "Caso sospechoso, se aisló el corral hasta resultados.",
  null,
  null,
  null,
];

function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pickWeighted<T extends string>(
  rng: () => number,
  weights: Record<T, number>,
): T {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll <= 0) return key;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error("pickWeighted: weights vacío");
  return last[0];
}

function pickFrom<T>(rng: () => number, items: T[]): T {
  if (items.length === 0) throw new Error("pickFrom: items vacío");
  return items[Math.floor(rng() * items.length)] as T;
}

function pickWeightedFromList<T>(
  rng: () => number,
  items: Array<{ value: T; weight: number }>,
): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let roll = rng() * total;
  for (const { value, weight } of items) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  const last = items[items.length - 1];
  if (!last) throw new Error("pickWeightedFromList: items vacío");
  return last.value;
}

function randomWeight(rng: () => number, foodPhase: FoodPhase): number {
  let min = 6;
  let max = 12;
  if (foodPhase === "Fase1") {
    min = 7;
    max = 12;
  } else if (foodPhase === "Fase2") {
    min = 10;
    max = 15;
  } else if (foodPhase === "Fase3") {
    min = 13;
    max = 18;
  } else if (foodPhase === "InicioMedicado" || foodPhase === "InicioCorriente") {
    min = 6;
    max = 11;
  } else if (
    foodPhase === "DesarrolloMedicado" ||
    foodPhase === "DesarrolloCorriente"
  ) {
    min = 17;
    max = 25;
  } else {
    min = 24;
    max = 32;
  }
  const value = min + rng() * (max - min);
  return Math.round(value * 100) / 100;
}

function generateDates(rng: () => number, count: number): Date[] {
  const now = new Date();
  const eightMonthsAgo = new Date(now);
  eightMonthsAgo.setMonth(now.getMonth() - 8);

  const windowMs = now.getTime() - eightMonthsAgo.getTime();
  const dates: Date[] = [];
  const winterPeakDays = new Set<number>();

  for (let d = new Date(eightMonthsAgo); d <= now; d.setDate(d.getDate() + 1)) {
    const m = d.getMonth();
    if (m === 5 || m === 6 || m === 7) {
      winterPeakDays.add(Math.floor(d.getTime() / 86400000));
    }
  }

  for (let i = 0; i < count; i++) {
    const usePeak = rng() < 0.35;
    if (usePeak && winterPeakDays.size > 0) {
      const peakDay = pickFrom(rng, Array.from(winterPeakDays));
      const baseMs = peakDay * 86400000;
      const jitter = Math.floor(rng() * 86400000);
      const date = new Date(baseMs + jitter);
      if (date >= eightMonthsAgo && date <= now) {
        dates.push(date);
        continue;
      }
    }
    const date = new Date(eightMonthsAgo.getTime() + rng() * windowMs);
    dates.push(date);
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}

function randomCorralNumber(rng: () => number): string {
  const prefix = pickFrom(rng, ["C", "C", "C", "H"]);
  const number = Math.floor(rng() * 60) + 1;
  return `${prefix}-${String(number).padStart(3, "0")}`;
}

async function main() {
  const rng = makeRng(20260717);

  console.log("Limpiando tablas existentes…");
  await prisma.deceased.deleteMany();
  await prisma.disease.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creando usuario admin…");
  const hashedPassword = await bcrypt.hash(
    SEED_USER_PASSWORD,
    BCRYPT_SALT_ROUNDS,
  );
  await prisma.user.create({
    data: {
      email: SEED_USER_EMAIL,
      password: hashedPassword,
    },
  });

  console.log(`Creando ${DISEASES.length} enfermedades…`);
  const createdDiseases = await Promise.all(
    DISEASES.map((d) =>
      prisma.disease.create({
        data: { name: d.name, active: d.active },
      }),
    ),
  );

  const diseaseIdByName = new Map(
    createdDiseases.map((d) => [d.name, d.id]),
  );

  const distributionItems = DISEASES_DISTRIBUTION.map((d) => ({
    value: diseaseIdByName.get(d.name)!,
    weight: d.weight,
  }));

  console.log("Creando 400 registros de fallecidos…");
  const TOTAL_DECEASED = 400;
  const dates = generateDates(rng, TOTAL_DECEASED);

  const records: Array<{
    note: string | null;
    weight: number;
    corralNumber: string;
    dateOfDeath: Date;
    active: boolean;
    sale: boolean;
    diseaseId: number;
    corralType: CorralType;
    food_phase: FoodPhase;
  }> = [];

  for (const dateOfDeath of dates) {
    const diseaseId = pickWeightedFromList(rng, distributionItems);
    const foodPhase = pickWeighted(rng, FOOD_PHASE_WEIGHTS);
    const corralType = pickWeighted(rng, CORRAL_TYPE_WEIGHTS);

    const sale = rng() < 0.3;
    const active = rng() < 0.92;
    const note = pickFrom(rng, NOTES);

    records.push({
      note,
      weight: randomWeight(rng, foodPhase),
      corralNumber: randomCorralNumber(rng),
      dateOfDeath,
      active,
      sale,
      diseaseId,
      corralType,
      food_phase: foodPhase,
    });
  }

  for (let i = 0; i < records.length; i += 100) {
    const chunk = records.slice(i, i + 100);
    await prisma.deceased.createMany({ data: chunk });
  }

  const summary = {
    user: { email: SEED_USER_EMAIL, password: SEED_USER_PASSWORD },
    diseases: createdDiseases.length,
    activeDiseases: createdDiseases.filter((d) => d.active).length,
    deceased: records.length,
    sold: records.filter((r) => r.sale).length,
    activeRecords: records.filter((r) => r.active).length,
    withNote: records.filter((r) => r.note !== null).length,
  };

  console.log("Seed completado:");
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Error en seed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });