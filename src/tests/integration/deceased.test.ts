import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";

import { buildApp } from "../../app";
import { buildContainer } from "../../container";
import prisma from "../../libs/prisma";
import { clearDatabase, disconnectDatabase } from "../helpers";
import { clearRateLimits } from "../../middleware/rateLimit";
import type { CorralType, FoodPhase } from "../../../generated/prisma/enums";

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
    },
  });
}

const validCreateBody = (diseaseId: number) => ({
  weight: 12.5,
  corralNumber: "C-001",
  dateOfDeath: "2026-01-15T10:00:00Z",
  diseaseId,
  corralType: "Corral" as const,
  food_phase: "InicioCorriente" as const,
});

describe("Deceased integration", () => {
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
    it("POST /deceaseds rechaza sin auth con 401", async () => {
      const disease = await createDiseaseInDb("Neumonía");

      const response = await request(app)
        .post("/deceaseds")
        .send(validCreateBody(disease.id));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("PATCH /deceaseds/:id rechaza sin auth con 401", async () => {
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const response = await request(app)
        .patch(`/deceaseds/${deceased.id}`)
        .send({ note: "otra nota" });

      expect(response.status).toBe(401);
    });

    it("DELETE /deceaseds/:id rechaza sin auth con 401", async () => {
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const response = await request(app).delete(`/deceaseds/${deceased.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /deceaseds", () => {
    it("crea un muerto y responde 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send(validCreateBody(disease.id));

      expect(response.status).toBe(204);
    });

    it("acepta active=false cuando se envía", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), active: false });

      expect(response.status).toBe(204);

      const deceasedInDb = await prisma.deceased.findFirst({
        where: { diseaseId: disease.id },
      });
      expect(deceasedInDb?.active).toBe(false);
    });

    it("acepta sale=true cuando se envía", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), sale: true });

      expect(response.status).toBe(204);

      const deceasedInDb = await prisma.deceased.findFirst({
        where: { diseaseId: disease.id },
      });
      expect(deceasedInDb?.sale).toBe(true);
    });

    it("default active=true cuando se omite", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await agent.post("/deceaseds").send(validCreateBody(disease.id));

      const deceasedInDb = await prisma.deceased.findFirst({
        where: { diseaseId: disease.id },
      });
      expect(deceasedInDb?.active).toBe(true);
    });

    it("default sale=false cuando se omite", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await agent.post("/deceaseds").send(validCreateBody(disease.id));

      const deceasedInDb = await prisma.deceased.findFirst({
        where: { diseaseId: disease.id },
      });
      expect(deceasedInDb?.sale).toBe(false);
    });

    it("acepta note cuando se envía", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), note: "Murió por diarrea" });

      expect(response.status).toBe(204);

      const deceasedInDb = await prisma.deceased.findFirst({
        where: { diseaseId: disease.id },
      });
      expect(deceasedInDb?.note).toBe("Murió por diarrea");
    });

    it("acepta note=null explícito", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), note: null });

      expect(response.status).toBe(204);

      const deceasedInDb = await prisma.deceased.findFirst({
        where: { diseaseId: disease.id },
      });
      expect(deceasedInDb?.note).toBeNull();
    });

    it("default note=null cuando se omite", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await agent.post("/deceaseds").send(validCreateBody(disease.id));

      const deceasedInDb = await prisma.deceased.findFirst({
        where: { diseaseId: disease.id },
      });
      expect(deceasedInDb?.note).toBeNull();
    });

    it("persiste todos los campos en la DB", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const dateOfDeath = new Date("2026-02-01T08:30:00Z");

      await agent.post("/deceaseds").send({
        note: "Murió por complicaciones",
        weight: 18.7,
        corralNumber: "C-042",
        dateOfDeath: dateOfDeath.toISOString(),
        active: false,
        sale: true,
        diseaseId: disease.id,
        corralType: "Hospital",
        food_phase: "Engorde",
      });

      const deceasedInDb = await prisma.deceased.findFirst({
        where: { diseaseId: disease.id },
      });

      expect(deceasedInDb).not.toBeNull();
      expect(deceasedInDb?.note).toBe("Murió por complicaciones");
      expect(deceasedInDb?.weight).toBe(18.7);
      expect(deceasedInDb?.corralNumber).toBe("C-042");
      expect(deceasedInDb?.dateOfDeath.toISOString()).toBe(
        dateOfDeath.toISOString(),
      );
      expect(deceasedInDb?.active).toBe(false);
      expect(deceasedInDb?.sale).toBe(true);
      expect(deceasedInDb?.diseaseId).toBe(disease.id);
      expect(deceasedInDb?.corralType).toBe("Hospital");
      expect(deceasedInDb?.food_phase).toBe("Engorde");
      expect(deceasedInDb?.createdAt).toBeInstanceOf(Date);
      expect(deceasedInDb?.updatedAt).toBeInstanceOf(Date);
    });

    it("rechaza note mayor a 255 caracteres con 400", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), note: "a".repeat(256) });

      expect(response.status).toBe(400);
    });

    it("rechaza body vacío con 400", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await agent.post("/deceaseds").send(validCreateBody(disease.id));

      const response = await agent.post("/deceaseds").send({});

      expect(response.status).toBe(400);
    });

    it("rechaza weight 0 con 400", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), weight: 0 });

      expect(response.status).toBe(400);
    });

    it("rechaza weight negativo con 400", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), weight: -1.5 });

      expect(response.status).toBe(400);
    });

    it("rechaza weight no numérico con 400", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), weight: "12.5" });

      expect(response.status).toBe(400);
    });

    it("rechaza corralNumber vacío con 400", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), corralNumber: "" });

      expect(response.status).toBe(400);
    });

    it("rechaza corralType inválido con 400", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), corralType: "Plaza" });

      expect(response.status).toBe(400);
    });

    it("rechaza food_phase inválido con 400", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), food_phase: "Destete" });

      expect(response.status).toBe(400);
    });

    it("rechaza diseaseId no entero con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(1), diseaseId: 1.5 });

      expect(response.status).toBe(400);
    });

    it("rechaza diseaseId negativo con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(-3) });

      expect(response.status).toBe(400);
    });

    it('rechaza diseaseId "abc" con 400', async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(1), diseaseId: "abc" });

      expect(response.status).toBe(400);
    });

    it("rechaza active con tipo incorrecto con 400", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), active: "true" });

      expect(response.status).toBe(400);
    });

    it("rechaza dateOfDeath inválido con 400", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), dateOfDeath: "no-es-fecha" });

      expect(response.status).toBe(400);
    });

    it("devuelve 404 cuando la enfermedad asociada no existe", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent
        .post("/deceaseds")
        .send(validCreateBody(9999));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/enfermedad asociada no existe/);
    });

    it("ignora campos extra (Zod strip por defecto)", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent.post("/deceaseds").send({
        ...validCreateBody(disease.id),
        id: 999,
        createdAt: "2020-01-01",
        fieldExtra: "ignorar",
      });

      expect(response.status).toBe(204);

      const deceasedInDb = await prisma.deceased.findFirst({
        where: { diseaseId: disease.id },
      });
      expect(deceasedInDb?.id).not.toBe(999);
    });
  });

  describe("PATCH /deceaseds/:id", () => {
    it("actualiza solo la nota con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id, {
        note: "original",
      });

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ note: "renombrado" });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.note).toBe("renombrado");
      expect(updated?.weight).toBe(12.5);
    });

    it("acepta note=null explícito en PATCH", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id, {
        note: "algo",
      });

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ note: null });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.note).toBeNull();
    });

    it("actualiza solo el weight con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id, { weight: 10 });

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ weight: 22.3 });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.weight).toBe(22.3);
    });

    it("actualiza solo el corralNumber con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id, {
        corralNumber: "C-001",
      });

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ corralNumber: "C-999" });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.corralNumber).toBe("C-999");
    });

    it("actualiza solo dateOfDeath con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-01-15T10:00:00Z"),
      });
      const newDate = new Date("2026-03-01T12:00:00Z");

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ dateOfDeath: newDate.toISOString() });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.dateOfDeath.toISOString()).toBe(newDate.toISOString());
    });

    it("actualiza solo active con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id, { active: true });

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ active: false });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.active).toBe(false);
    });

    it("actualiza solo sale con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id, { sale: false });

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ sale: true });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.sale).toBe(true);
    });

    it("actualiza el diseaseId (FK change) con 204", async () => {
      const agent = await authenticatedAgent(app);
      const first = await createDiseaseInDb("Neumonía");
      const second = await createDiseaseInDb("Diarrea");
      const deceased = await createDeceasedInDb(first.id);

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ diseaseId: second.id });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.diseaseId).toBe(second.id);
    });

    it("actualiza corralType con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id, {
        corralType: "Corral",
      });

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ corralType: "Cuna" });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.corralType).toBe("Cuna");
    });

    it("actualiza food_phase con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id, {
        food_phase: "Fase1",
      });

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ food_phase: "Engorde" });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.food_phase).toBe("Engorde");
    });

    it("actualiza múltiples campos a la vez con 204", async () => {
      const agent = await authenticatedAgent(app);
      const first = await createDiseaseInDb("Neumonía");
      const second = await createDiseaseInDb("Diarrea");
      const deceased = await createDeceasedInDb(first.id, { weight: 10 });

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({
          note: "renombrado",
          weight: 25,
          sale: true,
          diseaseId: second.id,
        });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.note).toBe("renombrado");
      expect(updated?.weight).toBe(25);
      expect(updated?.sale).toBe(true);
      expect(updated?.diseaseId).toBe(second.id);
    });

    it("es idempotente con el mismo valor (204)", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id, {
        note: "nota-test",
      });

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ note: "nota-test" });

      expect(response.status).toBe(204);
    });

    it("devuelve 404 cuando el muerto no existe", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.patch("/deceaseds/9999").send({ note: "x" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/Muerto no encontrado/);
    });

    it("devuelve 404 cuando el nuevo diseaseId no existe", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ diseaseId: 9999 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/enfermedad asociada no existe/);
    });

    it("devuelve 400 cuando el body no tiene ningún campo (refine)", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const response = await agent.patch(`/deceaseds/${deceased.id}`).send({});

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando el id no es numérico", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent
        .patch("/deceaseds/abc")
        .send({ note: "x" });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando el id es negativo", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent
        .patch("/deceaseds/-5")
        .send({ note: "x" });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando el id es cero", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.patch("/deceaseds/0").send({ note: "x" });
      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando note supera 255 caracteres", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ note: "a".repeat(256) });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando weight es 0", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ weight: 0 });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando corralType es inválido", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ corralType: "Hangar" });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando food_phase es inválido", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ food_phase: "Crecimiento" });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /deceaseds/:id", () => {
    it("elimina un muerto y responde 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const response = await agent.delete(`/deceaseds/${deceased.id}`);

      expect(response.status).toBe(204);
    });

    it("elimina realmente el muerto de la DB", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      await agent.delete(`/deceaseds/${deceased.id}`);

      const deceasedInDb = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(deceasedInDb).toBeNull();
    });

    it("permite borrar un muerto cuya enfermedad está inactiva", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía", false);
      const deceased = await createDeceasedInDb(disease.id);

      const response = await agent.delete(`/deceaseds/${deceased.id}`);

      expect(response.status).toBe(204);
    });

    it("devuelve 404 cuando el muerto no existe", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.delete("/deceaseds/9999");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/Muerto no encontrado/);
    });

    it("devuelve 400 cuando el id es inválido", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.delete("/deceaseds/abc");

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando el id es negativo", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.delete("/deceaseds/-1");

      expect(response.status).toBe(400);
    });
  });

  describe("GET /deceaseds", () => {
    it("rechaza sin auth con 401", async () => {
      const response = await request(app).get("/deceaseds");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("devuelve lista paginada con defaults cuando no hay query params", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id);

      const response = await agent.get("/deceaseds");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.pageSize).toBe(20);
      expect(response.body.data.totalPages).toBe(1);
    });

    it("devuelve lista vacía con totales en 0 cuando no hay registros", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/deceaseds");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toEqual([]);
      expect(response.body.data.total).toBe(0);
      expect(response.body.data.totalPages).toBe(0);
    });

    it("ordena por dateOfDeath desc y desempata por id desc", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const oldest = await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-01-01T10:00:00Z"),
      });
      const middle = await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-01T10:00:00Z"),
      });
      const newest = await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-03-01T10:00:00Z"),
      });

      const response = await agent.get("/deceaseds");

      expect(response.status).toBe(200);
      expect(response.body.data.items.map((d: { id: number }) => d.id)).toEqual([
        newest.id,
        middle.id,
        oldest.id,
      ]);
    });

    it("incluye la enfermedad joinada con id y name", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const response = await agent.get("/deceaseds");

      expect(response.status).toBe(200);
      const item = response.body.data.items[0];
      expect(item.disease).toEqual({ id: disease.id, name: "Neumonía" });
      expect(deceased.diseaseId).toBe(disease.id);
    });

    it("respeta pageSize custom", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      for (let i = 0; i < 5; i++) {
        await createDeceasedInDb(disease.id, {
          dateOfDeath: new Date(`2026-01-0${i + 1}T10:00:00Z`),
        });
      }

      const response = await agent.get("/deceaseds?pageSize=2");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(5);
      expect(response.body.data.pageSize).toBe(2);
      expect(response.body.data.totalPages).toBe(3);
    });

    it("respeta page custom y arranca desde el offset correcto", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      for (let i = 0; i < 5; i++) {
        await createDeceasedInDb(disease.id, {
          dateOfDeath: new Date(`2026-01-0${i + 1}T10:00:00Z`),
        });
      }

      const response = await agent.get("/deceaseds?pageSize=2&page=2");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.page).toBe(2);
    });

    it("filtra por dateFrom (incluye la fecha desde)", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-01-15T10:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-15T10:00:00Z"),
      });

      const response = await agent.get("/deceaseds?dateFrom=2026-02-01");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(
        new Date(response.body.data.items[0].dateOfDeath).getTime(),
      ).toBeGreaterThanOrEqual(new Date("2026-02-01T00:00:00Z").getTime());
    });

    it("filtra por dateTo (incluye todo el día de la fecha hasta)", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-01-15T23:30:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-15T10:00:00Z"),
      });

      const response = await agent.get("/deceaseds?dateTo=2026-01-31");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(
        new Date(response.body.data.items[0].dateOfDeath).getTime(),
      ).toBeLessThanOrEqual(new Date("2026-01-31T23:59:59Z").getTime());
    });

    it("filtra combinando dateFrom y dateTo", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-01-15T10:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-02-15T10:00:00Z"),
      });
      await createDeceasedInDb(disease.id, {
        dateOfDeath: new Date("2026-03-15T10:00:00Z"),
      });

      const response = await agent.get(
        "/deceaseds?dateFrom=2026-02-01&dateTo=2026-02-28",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
    });

    it("filtra por diseaseId", async () => {
      const agent = await authenticatedAgent(app);
      const first = await createDiseaseInDb("Neumonía");
      const second = await createDiseaseInDb("Diarrea");
      await createDeceasedInDb(first.id);
      await createDeceasedInDb(first.id);
      await createDeceasedInDb(second.id);

      const response = await agent.get(`/deceaseds?diseaseId=${first.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(
        response.body.data.items.every(
          (d: { diseaseId: number }) => d.diseaseId === undefined,
        ),
      ).toBe(true);
      expect(
        response.body.data.items.every(
          (d: { disease: { id: number } }) => d.disease.id === first.id,
        ),
      ).toBe(true);
    });

    it("filtra por food_phase", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, { food_phase: "Fase1" });
      await createDeceasedInDb(disease.id, { food_phase: "Fase1" });
      await createDeceasedInDb(disease.id, { food_phase: "Engorde" });

      const response = await agent.get("/deceaseds?foodPhase=Fase1");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(
        response.body.data.items.every(
          (d: { food_phase: string }) => d.food_phase === "Fase1",
        ),
      ).toBe(true);
    });

    it("filtra por corralType", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, { corralType: "Corral" });
      await createDeceasedInDb(disease.id, { corralType: "Hospital" });
      await createDeceasedInDb(disease.id, { corralType: "Cuna" });

      const response = await agent.get("/deceaseds?corralType=Hospital");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].corralType).toBe("Hospital");
    });

    it("filtra por corralNumber (contains)", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, { corralNumber: "C-001" });
      await createDeceasedInDb(disease.id, { corralNumber: "C-042" });
      await createDeceasedInDb(disease.id, { corralNumber: "H-100" });

      const response = await agent.get("/deceaseds?corralNumber=C-0");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
    });

    it("filtra por sale=true", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, { sale: true });
      await createDeceasedInDb(disease.id, { sale: false });

      const response = await agent.get("/deceaseds?sale=true");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].sale).toBe(true);
    });

    it("filtra por sale=false", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id, { sale: true });
      await createDeceasedInDb(disease.id, { sale: false });

      const response = await agent.get("/deceaseds?sale=false");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].sale).toBe(false);
    });

    it("combina múltiples filtros con paginación", async () => {
      const agent = await authenticatedAgent(app);
      const first = await createDiseaseInDb("Neumonía");
      const second = await createDiseaseInDb("Diarrea");
      for (let i = 0; i < 5; i++) {
        await createDeceasedInDb(first.id, {
          dateOfDeath: new Date(`2026-02-0${i + 1}T10:00:00Z`),
          food_phase: "Fase1",
          corralType: "Corral",
        });
      }
      await createDeceasedInDb(second.id, {
        dateOfDeath: new Date("2026-02-10T10:00:00Z"),
        food_phase: "Engorde",
      });

      const response = await agent.get(
        `/deceaseds?diseaseId=${first.id}&foodPhase=Fase1&corralType=Corral&pageSize=2&page=1`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(5);
      expect(response.body.data.totalPages).toBe(3);
    });

    it("rechaza page=0 con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/deceaseds?page=0");

      expect(response.status).toBe(400);
    });

    it("rechaza pageSize=101 con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/deceaseds?pageSize=101");

      expect(response.status).toBe(400);
    });

    it("rechaza diseaseId no entero con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/deceaseds?diseaseId=1.5");

      expect(response.status).toBe(400);
    });

    it("rechaza foodPhase inválido con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/deceaseds?foodPhase=Destete");

      expect(response.status).toBe(400);
    });

    it("rechaza corralType inválido con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/deceaseds?corralType=Hangar");

      expect(response.status).toBe(400);
    });

    it("rechaza dateFrom inválido con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/deceaseds?dateFrom=no-es-fecha");

      expect(response.status).toBe(400);
    });

    it("rechaza corralNumber vacío con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/deceaseds?corralNumber=");

      expect(response.status).toBe(400);
    });
  });

  describe("GET /deceaseds/diseases", () => {
    it("rechaza sin auth con 401", async () => {
      const response = await request(app).get("/deceaseds/diseases");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("devuelve array vacío cuando no hay enfermedades", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/deceaseds/diseases");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it("devuelve solo las enfermedades activas", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseInDb("Neumonía", true);
      await createDiseaseInDb("Diarrea", true);
      await createDiseaseInDb("Brucelosis", false);

      const response = await agent.get("/deceaseds/diseases");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(
        response.body.data.map((d: { name: string }) => d.name),
      ).toEqual(["Diarrea", "Neumonía"]);
    });

    it("ordena los resultados alfabéticamente por nombre", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseInDb("Neumonía", true);
      await createDiseaseInDb("Absceso", true);
      await createDiseaseInDb("Diarrea", true);

      const response = await agent.get("/deceaseds/diseases");

      expect(response.status).toBe(200);
      expect(
        response.body.data.map((d: { name: string }) => d.name),
      ).toEqual(["Absceso", "Diarrea", "Neumonía"]);
    });

    it("solo expone id y name (omite active, createdAt, updatedAt)", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseInDb("Neumonía", true);

      const response = await agent.get("/deceaseds/diseases");

      expect(response.status).toBe(200);
      const item = response.body.data[0];
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).not.toHaveProperty("active");
      expect(item).not.toHaveProperty("createdAt");
      expect(item).not.toHaveProperty("updatedAt");
    });
  });
});