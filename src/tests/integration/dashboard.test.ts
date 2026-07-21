import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";

import { buildApp } from "../../app";
import { buildContainer } from "../../container";
import prisma from "../../libs/prisma";
import { clearDatabase, disconnectDatabase } from "../helpers";
import { clearRateLimits } from "../../middleware/rateLimit";
import type { CorralType, FoodPhase, Turn } from "../../../generated/prisma/enums";

async function authenticatedAgent(app: Express, email = "user@example.com") {
  const agent = request.agent(app);
  await agent.post("/auth/register").send({ email, password: "password123" });
  return agent;
}

async function createDiseaseInDb(name: string, active = true) {
  return prisma.disease.create({
    data: { name, active },
  });
}

type DeceasedOverrides = Partial<{
  note: string | null;
  weight: number;
  corralNumber: string;
  dateOfDeath: Date;
  active: boolean;
  sale: boolean;
  corralType: CorralType;
  food_phase: FoodPhase;
  turn: Turn;
}>;

async function createDeceasedInDb(
  diseaseId: number,
  overrides: DeceasedOverrides = {},
) {
  return prisma.deceased.create({
    data: {
      note: overrides.note ?? null,
      weight: overrides.weight ?? 12.5,
      corralNumber: overrides.corralNumber ?? "C-001",
      dateOfDeath: overrides.dateOfDeath ?? new Date("2026-01-15T10:00:00Z"),
      active: overrides.active ?? true,
      sale: overrides.sale ?? false,
      diseaseId,
      corralType: overrides.corralType ?? "Corral",
      food_phase: overrides.food_phase ?? "InicioCorriente",
      turn: overrides.turn ?? "Mañana",
    },
  });
}

describe("Dashboard integration", () => {
  let app: Express;

  beforeAll(() => {
    const container = buildContainer();
    app = buildApp(container);
  });

  beforeEach(async () => {
    await clearDatabase();
    clearRateLimits();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe("Authentication", () => {
    it("GET /dashboard/kpis rechaza sin auth con 401", async () => {
      const response = await request(app).get("/dashboard/kpis");
      expect(response.status).toBe(401);
    });

    it("GET /dashboard/timeline rechaza sin auth con 401", async () => {
      const response = await request(app).get("/dashboard/timeline");
      expect(response.status).toBe(401);
    });

    it("GET /dashboard/by-disease rechaza sin auth con 401", async () => {
      const response = await request(app).get("/dashboard/by-disease");
      expect(response.status).toBe(401);
    });

    it("GET /dashboard/by-food-phase rechaza sin auth con 401", async () => {
      const response = await request(app).get("/dashboard/by-food-phase");
      expect(response.status).toBe(401);
    });

    it("GET /dashboard/by-corral-type rechaza sin auth con 401", async () => {
      const response = await request(app).get("/dashboard/by-corral-type");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /dashboard/kpis", () => {
    it("devuelve ceros y null cuando no hay datos", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/dashboard/kpis");

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        total: 0,
        avgWeight: 0,
        soldPct: 0,
        topDisease: null,
        deltaVsPrevious: { totalPct: 0, avgWeightPct: 0 },
      });
    });

    it("calcula total, avgWeight, soldPct y topDisease correctamente", async () => {
      const agent = await authenticatedAgent(app);
      const neumonia = await createDiseaseInDb("Neumonía");
      const diarrea = await createDiseaseInDb("Diarrea");

      await createDeceasedInDb(neumonia.id, {
        weight: 10,
        sale: true,
      });
      await createDeceasedInDb(neumonia.id, {
        weight: 20,
        sale: false,
      });
      await createDeceasedInDb(diarrea.id, {
        weight: 30,
        sale: false,
      });

      const response = await agent.get("/dashboard/kpis");

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.avgWeight).toBeCloseTo(20, 2);
      expect(response.body.data.soldPct).toBeCloseTo((1 / 3) * 100, 2);
      expect(response.body.data.topDisease).toEqual({
        id: neumonia.id,
        name: "Neumonía",
        count: 2,
      });
    });

    it("calcula deltaVsPrevious vs el mismo rango hacia atrás", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-15T10:00:00Z"),
        weight: 20,
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-20T10:00:00Z"),
        weight: 30,
      });

      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-01-15T10:00:00Z"),
        weight: 10,
      });

      const response = await agent.get(
        "/dashboard/kpis?dateFrom=2026-02-01&dateTo=2026-02-28",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.avgWeight).toBeCloseTo(25, 2);
      expect(response.body.data.deltaVsPrevious.totalPct).toBe(100);
      expect(response.body.data.deltaVsPrevious.avgWeightPct).toBe(150);
    });

    it("devuelve deltaVsPrevious null cuando el periodo previo no tiene datos", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-15T10:00:00Z"),
      });

      const response = await agent.get(
        "/dashboard/kpis?dateFrom=2026-02-01&dateTo=2026-02-28",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.deltaVsPrevious.totalPct).toBeNull();
      expect(response.body.data.deltaVsPrevious.avgWeightPct).toBeNull();
    });

    it("devuelve deltaVsPrevious 0 cuando ambos periodos están en 0", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get(
        "/dashboard/kpis?dateFrom=2026-02-01&dateTo=2026-02-28",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.deltaVsPrevious).toEqual({
        totalPct: 0,
        avgWeightPct: 0,
      });
    });

    it("respeta dateFrom/dateTo (incluye fin de día)", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-15T10:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-28T23:30:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-03-01T00:00:00Z"),
      });

      const response = await agent.get(
        "/dashboard/kpis?dateFrom=2026-02-01&dateTo=2026-02-28",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(2);
    });
  });

  describe("GET /dashboard/timeline", () => {
    it("devuelve items vacío cuando no hay datos", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/dashboard/timeline");

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        granularity: "day",
        items: [],
      });
    });

    it("agrupa por día por defecto", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-15T08:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-15T18:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-16T10:00:00Z"),
      });

      const response = await agent.get("/dashboard/timeline");

      expect(response.status).toBe(200);
      expect(response.body.data.granularity).toBe("day");
      expect(response.body.data.items).toEqual([
        { bucket: "2026-02-15", count: 2 },
        { bucket: "2026-02-16", count: 1 },
      ]);
    });

    it("agrupa por mes cuando se pide", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-05T10:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-20T10:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-03-01T10:00:00Z"),
      });

      const response = await agent.get(
        "/dashboard/timeline?granularity=month",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.granularity).toBe("month");
      expect(response.body.data.items).toEqual([
        { bucket: "2026-02", count: 2 },
        { bucket: "2026-03", count: 1 },
      ]);
    });

    it("agrupa por semana (formato ISO)", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-02T10:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-04T10:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-09T10:00:00Z"),
      });

      const response = await agent.get(
        "/dashboard/timeline?granularity=week",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.granularity).toBe("week");
      expect(response.body.data.items.length).toBe(2);
      const buckets = response.body.data.items.map(
        (i: { bucket: string }) => i.bucket,
      );
      expect(buckets[0]).toMatch(/^\d{4}-W\d{2}$/);
      expect(response.body.data.items[0].count).toBe(2);
      expect(response.body.data.items[1].count).toBe(1);
    });

    it("respeta dateFrom/dateTo", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-01-15T10:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-15T10:00:00Z"),
      });

      const response = await agent.get(
        "/dashboard/timeline?dateFrom=2026-02-01&dateTo=2026-02-28",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.items).toEqual([
        { bucket: "2026-02-15", count: 1 },
      ]);
    });

    it("rechaza granularity inválida con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get(
        "/dashboard/timeline?granularity=year",
      );

      expect(response.status).toBe(400);
    });

    it("rechaza dateFrom inválido con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get(
        "/dashboard/timeline?dateFrom=no-es-fecha",
      );

      expect(response.status).toBe(400);
    });
  });

  describe("GET /dashboard/by-disease", () => {
    it("devuelve array vacío cuando no hay datos", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/dashboard/by-disease");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toEqual([]);
    });

    it("ordena por count desc e incluye el nombre de la enfermedad", async () => {
      const agent = await authenticatedAgent(app);
      const neumonia = await createDiseaseInDb("Neumonía");
      const diarrea = await createDiseaseInDb("Diarrea");
      const brucelosis = await createDiseaseInDb("Brucelosis");

      await createDeceasedInDb(diarrea.id);
      await createDeceasedInDb(diarrea.id);
      await createDeceasedInDb(neumonia.id);
      await createDeceasedInDb(brucelosis.id);
      await createDeceasedInDb(brucelosis.id);
      await createDeceasedInDb(brucelosis.id);

      const response = await agent.get("/dashboard/by-disease");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(3);
      expect(response.body.data.items[0]).toEqual({
        diseaseId: brucelosis.id,
        name: "Brucelosis",
        count: 3,
      });
      expect(response.body.data.items[1]).toEqual({
        diseaseId: diarrea.id,
        name: "Diarrea",
        count: 2,
      });
      expect(response.body.data.items[2]).toEqual({
        diseaseId: neumonia.id,
        name: "Neumonía",
        count: 1,
      });
    });

    it("cap a top 10 ordenado por count desc", async () => {
      const agent = await authenticatedAgent(app);
      for (let i = 0; i < 12; i++) {
        const disease = await createDiseaseInDb(`Enfermedad ${i}`);
        await createDeceasedInDb(disease.id);
      }
      const lastDisease = await createDiseaseInDb("EnfermedadTop");
      for (let i = 0; i < 5; i++) {
        await createDeceasedInDb(lastDisease.id);
      }

      const response = await agent.get("/dashboard/by-disease");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(10);
      expect(response.body.data.items[0]).toMatchObject({
        name: "EnfermedadTop",
        count: 5,
      });
    });

    it("respeta dateFrom/dateTo", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-01-15T10:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-15T10:00:00Z"),
      });

      const response = await agent.get(
        "/dashboard/by-disease?dateFrom=2026-02-01&dateTo=2026-02-28",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].count).toBe(1);
    });
  });

  describe("GET /dashboard/by-food-phase", () => {
    it("siempre devuelve las 8 fases, con count 0 si no hay datos", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/dashboard/by-food-phase");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(8);
      expect(
        response.body.data.items.map((i: { foodPhase: string }) => i.foodPhase),
      ).toEqual([
        "Fase1",
        "Fase2",
        "Fase3",
        "InicioMedicado",
        "InicioCorriente",
        "DesarrolloMedicado",
        "DesarrolloCorriente",
        "Engorde",
      ]);
      expect(
        response.body.data.items.every(
          (i: { count: number }) => i.count === 0,
        ),
      ).toBe(true);
    });

    it("cuenta correctamente por fase", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, { food_phase: "Fase1" });
      await createDeceasedInDb(disease.id, { food_phase: "Fase1" });
      await createDeceasedInDb(disease.id, { food_phase: "Engorde" });

      const response = await agent.get("/dashboard/by-food-phase");

      expect(response.status).toBe(200);
      const fase1 = response.body.data.items.find(
        (i: { foodPhase: string }) => i.foodPhase === "Fase1",
      );
      const engorde = response.body.data.items.find(
        (i: { foodPhase: string }) => i.foodPhase === "Engorde",
      );
      expect(fase1.count).toBe(2);
      expect(engorde.count).toBe(1);
    });

    it("respeta dateFrom/dateTo", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, {
        food_phase: "Fase1",
        dateOfDeath: new Date("2026-01-15T10:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        food_phase: "Fase1",
        dateOfDeath: new Date("2026-02-15T10:00:00Z"),
      });

      const response = await agent.get(
        "/dashboard/by-food-phase?dateFrom=2026-02-01&dateTo=2026-02-28",
      );

      expect(response.status).toBe(200);
      const fase1 = response.body.data.items.find(
        (i: { foodPhase: string }) => i.foodPhase === "Fase1",
      );
      expect(fase1.count).toBe(1);
    });
  });

  describe("GET /dashboard/by-corral-type", () => {
    it("siempre devuelve los 3 tipos, con count 0 si no hay datos", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/dashboard/by-corral-type");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(3);
      expect(
        response.body.data.items.map((i: { corralType: string }) => i.corralType),
      ).toEqual(["Corral", "Hospital", "Cuna"]);
      expect(
        response.body.data.items.every(
          (i: { count: number }) => i.count === 0,
        ),
      ).toBe(true);
    });

    it("cuenta correctamente por tipo", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, { corralType: "Corral" });
      await createDeceasedInDb(disease.id, { corralType: "Hospital" });
      await createDeceasedInDb(disease.id, { corralType: "Cuna" });

      const response = await agent.get("/dashboard/by-corral-type");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toEqual([
        { corralType: "Corral", count: 1 },
        { corralType: "Hospital", count: 1 },
        { corralType: "Cuna", count: 1 },
      ]);
    });

    it("respeta dateFrom/dateTo", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, {
        corralType: "Hospital",
        dateOfDeath: new Date("2026-01-15T10:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        corralType: "Hospital",
        dateOfDeath: new Date("2026-02-15T10:00:00Z"),
      });

      const response = await agent.get(
        "/dashboard/by-corral-type?dateFrom=2026-02-01&dateTo=2026-02-28",
      );

      expect(response.status).toBe(200);
      const hospital = response.body.data.items.find(
        (i: { corralType: string }) => i.corralType === "Hospital",
      );
      expect(hospital.count).toBe(1);
    });
  });
});