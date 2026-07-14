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
  name: string;
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
      name: overrides.name ?? "cerdo-test",
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
  name: "cerdo-test",
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
        .send({ name: "otro" });

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

    it("persiste todos los campos en la DB", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const dateOfDeath = new Date("2026-02-01T08:30:00Z");

      await agent.post("/deceaseds").send({
        name: "cerdo-001",
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
        where: { name: "cerdo-001" },
      });

      expect(deceasedInDb).not.toBeNull();
      expect(deceasedInDb?.name).toBe("cerdo-001");
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

    it("rechaza nombre vacío con 400", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), name: "" });

      expect(response.status).toBe(400);
    });

    it("rechaza nombre mayor a 255 caracteres con 400", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .post("/deceaseds")
        .send({ ...validCreateBody(disease.id), name: "a".repeat(256) });

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

    it("rechaza diseaseId \"abc\" con 400", async () => {
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
    it("actualiza solo el nombre con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id, {
        name: "original",
      });

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ name: "renombrado" });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.name).toBe("renombrado");
      expect(updated?.weight).toBe(12.5);
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
          name: "renombrado",
          weight: 25,
          sale: true,
          diseaseId: second.id,
        });

      expect(response.status).toBe(204);

      const updated = await prisma.deceased.findUnique({
        where: { id: deceased.id },
      });
      expect(updated?.name).toBe("renombrado");
      expect(updated?.weight).toBe(25);
      expect(updated?.sale).toBe(true);
      expect(updated?.diseaseId).toBe(second.id);
    });

    it("es idempotente con el mismo valor (204)", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id, {
        name: "cerdo-test",
      });

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ name: "cerdo-test" });

      expect(response.status).toBe(204);
    });

    it("devuelve 404 cuando el muerto no existe", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.patch("/deceaseds/9999").send({ name: "x" });

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
        .send({ name: "x" });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando el id es negativo", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent
        .patch("/deceaseds/-5")
        .send({ name: "x" });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando el id es cero", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.patch("/deceaseds/0").send({ name: "x" });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando name está vacío", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ name: "" });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando name supera 255 caracteres", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const response = await agent
        .patch(`/deceaseds/${deceased.id}`)
        .send({ name: "a".repeat(256) });

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
});