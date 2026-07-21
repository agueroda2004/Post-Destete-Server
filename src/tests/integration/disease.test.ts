import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";

import { buildApp } from "../../app";
import { buildContainer } from "../../container";
import prisma from "../../libs/prisma";
import { clearDatabase, disconnectDatabase } from "../helpers";
import { clearRateLimits } from "../../middleware/rateLimit";

async function authenticatedAgent(app: Express, email = "user@example.com") {
  const agent = request.agent(app);
  await agent.post("/auth/register").send({ email, password: "password123" });
  return agent;
}

async function createDiseaseViaApi(
  agent: ReturnType<typeof request.agent>,
  body: { name: string; active?: boolean },
) {
  return agent.post("/diseases").send(body);
}

async function createDiseaseInDb(name: string, active = true) {
  return prisma.disease.create({
    data: { name, active },
  });
}

async function createDeceasedInDb(
  diseaseId: number,
  overrides: Partial<{
    note: string | null;
    weight: number;
    corralNumber: string;
    dateOfDeath: Date;
  }> = {},
) {
  return prisma.deceased.create({
    data: {
      note: overrides.note ?? null,
      weight: overrides.weight ?? 12.5,
      corralNumber: overrides.corralNumber ?? "C-001",
      dateOfDeath: overrides.dateOfDeath ?? new Date("2026-01-15T10:00:00Z"),
      diseaseId,
      corralType: "Corral",
      food_phase: "InicioCorriente",
      turn: "Mañana",
    },
  });
}

describe("Disease integration", () => {
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
    it("POST /diseases rechaza sin auth con 401", async () => {
      const response = await request(app)
        .post("/diseases")
        .send({ name: "Neumonía" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("PATCH /diseases/:id rechaza sin auth con 401", async () => {
      const disease = await createDiseaseInDb("Neumonía");

      const response = await request(app)
        .patch(`/diseases/${disease.id}`)
        .send({ active: false });

      expect(response.status).toBe(401);
    });

    it("DELETE /diseases/:id rechaza sin auth con 401", async () => {
      const disease = await createDiseaseInDb("Neumonía");

      const response = await request(app).delete(`/diseases/${disease.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /diseases", () => {
    it("crea una enfermedad y responde 204", async () => {
      const agent = await authenticatedAgent(app);

      const response = await createDiseaseViaApi(agent, { name: "Neumonía" });

      expect(response.status).toBe(204);
    });

    it("acepta active=false cuando se envía", async () => {
      const agent = await authenticatedAgent(app);

      const response = await createDiseaseViaApi(agent, {
        name: "Neumonía",
        active: false,
      });

      expect(response.status).toBe(204);
    });

    it("default active=true cuando se omite", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseViaApi(agent, { name: "Neumonía" });

      const diseaseInDb = await prisma.disease.findUnique({
        where: { name: "Neumonía" },
      });

      expect(diseaseInDb).not.toBeNull();
      expect(diseaseInDb?.active).toBe(true);
    });

    it("persiste la enfermedad en la DB", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseViaApi(agent, { name: "Diarrea" });

      const diseaseInDb = await prisma.disease.findUnique({
        where: { name: "Diarrea" },
      });

      expect(diseaseInDb).not.toBeNull();
      expect(diseaseInDb?.name).toBe("Diarrea");
      expect(diseaseInDb?.createdAt).toBeInstanceOf(Date);
      expect(diseaseInDb?.updatedAt).toBeInstanceOf(Date);
    });

    it("rechaza nombre duplicado con 409", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseViaApi(agent, { name: "Neumonía" });

      const response = await createDiseaseViaApi(agent, { name: "Neumonía" });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it("rechaza nombre vacío con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await createDiseaseViaApi(agent, { name: "" });

      expect(response.status).toBe(400);
    });

    it("rechaza nombre mayor a 255 caracteres con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await createDiseaseViaApi(agent, {
        name: "a".repeat(256),
      });

      expect(response.status).toBe(400);
    });

    it("rechaza body vacío con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.post("/diseases").send({});

      expect(response.status).toBe(400);
    });

    it("rechaza active con tipo incorrecto con 400", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.post("/diseases").send({
        name: "Neumonía",
        active: "no-es-booleano",
      });

      expect(response.status).toBe(400);
    });

    it("ignora campos extra (Zod strip por defecto)", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.post("/diseases").send({
        name: "Neumonía",
        id: 999,
        createdAt: "2020-01-01",
      });

      expect(response.status).toBe(204);

      const diseaseInDb = await prisma.disease.findUnique({
        where: { name: "Neumonía" },
      });
      expect(diseaseInDb?.id).not.toBe(999);
    });
  });

  describe("GET /diseases", () => {
    it("rechaza sin auth con 401", async () => {
      const response = await request(app).get("/diseases");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("devuelve lista paginada con defaults cuando no hay query params", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseInDb("Neumonía");
      await createDiseaseInDb("Diarrea");
      await createDiseaseInDb("Brucelosis");

      const response = await agent.get("/diseases");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.pageSize).toBe(10);
      expect(response.body.data.totalPages).toBe(1);
      expect(response.body.data.items.map((d: { name: string }) => d.name)).toEqual([
        "Brucelosis",
        "Diarrea",
        "Neumonía",
      ]);
    });

    it("omite createdAt/updatedAt en la respuesta (no leak de auditoría)", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseInDb("Neumonía");

      const response = await agent.get("/diseases");

      expect(response.status).toBe(200);
      const item = response.body.data.items[0];
      expect(item).not.toHaveProperty("createdAt");
      expect(item).not.toHaveProperty("updatedAt");
    });

    it("respeta pageSize custom", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseInDb("A");
      await createDiseaseInDb("B");
      await createDiseaseInDb("C");

      const response = await agent.get("/diseases?pageSize=2");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.pageSize).toBe(2);
      expect(response.body.data.totalPages).toBe(2);
    });

    it("respeta page custom y arranca desde el offset correcto", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseInDb("A");
      await createDiseaseInDb("B");
      await createDiseaseInDb("C");
      await createDiseaseInDb("D");

      const response = await agent.get("/diseases?pageSize=2&page=2");

      expect(response.status).toBe(200);
      expect(response.body.data.items.map((d: { name: string }) => d.name)).toEqual([
        "C",
        "D",
      ]);
      expect(response.body.data.page).toBe(2);
    });

    it("filtra por name (contains, case-insensitive por collation MariaDB)", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseInDb("Neumonía severa");
      await createDiseaseInDb("Neumonía leve");
      await createDiseaseInDb("Diarrea");

      const response = await agent.get("/diseases?name=neum");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });

    it("filtra por active=true", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseInDb("Activa1", true);
      await createDiseaseInDb("Activa2", true);
      await createDiseaseInDb("Inactiva1", false);

      const response = await agent.get("/diseases?active=true");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });

    it("filtra por active=false", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseInDb("Activa1", true);
      await createDiseaseInDb("Inactiva1", false);
      await createDiseaseInDb("Inactiva2", false);

      const response = await agent.get("/diseases?active=false");

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });

    it("combina filtros de name y active con paginación", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseInDb("Neumonía A", true);
      await createDiseaseInDb("Neumonía B", false);
      await createDiseaseInDb("Neumonía C", true);
      await createDiseaseInDb("Diarrea", true);

      const response = await agent.get(
        "/diseases?name=neum&active=true&pageSize=2&page=1",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });

    it("rechaza page=0 con 400 (Zod positive)", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/diseases?page=0");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("rechaza pageSize=101 con 400 (Zod max)", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/diseases?pageSize=101");

      expect(response.status).toBe(400);
    });

    it("rechaza name vacío con 400 (Zod min 1)", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.get("/diseases?name=");

      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /diseases/:id", () => {
    it("actualiza solo el nombre con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía", false);

      const response = await agent
        .patch(`/diseases/${disease.id}`)
        .send({ name: "Neumonía severa" });

      expect(response.status).toBe(204);

      const updated = await prisma.disease.findUnique({
        where: { id: disease.id },
      });
      expect(updated?.name).toBe("Neumonía severa");
      expect(updated?.active).toBe(false);
    });

    it("actualiza solo active con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía", true);

      const response = await agent
        .patch(`/diseases/${disease.id}`)
        .send({ active: false });

      expect(response.status).toBe(204);

      const updated = await prisma.disease.findUnique({
        where: { id: disease.id },
      });
      expect(updated?.active).toBe(false);
      expect(updated?.name).toBe("Neumonía");
    });

    it("actualiza ambos campos con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía", true);

      const response = await agent
        .patch(`/diseases/${disease.id}`)
        .send({ name: "Neumonía severa", active: false });

      expect(response.status).toBe(204);

      const updated = await prisma.disease.findUnique({
        where: { id: disease.id },
      });
      expect(updated?.name).toBe("Neumonía severa");
      expect(updated?.active).toBe(false);
    });

    it("devuelve 204 cuando el nuevo nombre es igual al actual (idempotente)", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .patch(`/diseases/${disease.id}`)
        .send({ name: "Neumonía" });

      expect(response.status).toBe(204);
    });

    it("devuelve 404 cuando la enfermedad no existe", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.patch("/diseases/9999").send({ active: false });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it("devuelve 409 cuando el nombre pertenece a otra enfermedad", async () => {
      const agent = await authenticatedAgent(app);
      await createDiseaseInDb("Neumonía");
      const other = await createDiseaseInDb("Diarrea");

      const response = await agent
        .patch(`/diseases/${other.id}`)
        .send({ name: "Neumonía" });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it("devuelve 400 cuando el body no tiene ningún campo (refine)", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent.patch(`/diseases/${disease.id}`).send({});

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando el id no es numérico", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent
        .patch("/diseases/abc")
        .send({ active: false });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando el id es negativo", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent
        .patch("/diseases/-5")
        .send({ active: false });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando el id es cero", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.patch("/diseases/0").send({ active: false });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando name está vacío", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .patch(`/diseases/${disease.id}`)
        .send({ name: "" });

      expect(response.status).toBe(400);
    });

    it("devuelve 400 cuando name supera 255 caracteres", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent
        .patch(`/diseases/${disease.id}`)
        .send({ name: "a".repeat(256) });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /diseases/:id", () => {
    it("elimina una enfermedad sin Deceaseds con 204", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      const response = await agent.delete(`/diseases/${disease.id}`);

      expect(response.status).toBe(204);
    });

    it("elimina realmente la enfermedad de la DB", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");

      await agent.delete(`/diseases/${disease.id}`);

      const diseaseInDb = await prisma.disease.findUnique({
        where: { id: disease.id },
      });
      expect(diseaseInDb).toBeNull();
    });

    it("devuelve 404 cuando la enfermedad no existe", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.delete("/diseases/9999");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it("devuelve 409 cuando hay Deceaseds enlazados", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      await createDeceasedInDb(disease.id);

      const response = await agent.delete(`/diseases/${disease.id}`);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/registros de muertos enlazados/);
    });

    it("permite eliminar después de borrar los Deceaseds enlazados", async () => {
      const agent = await authenticatedAgent(app);
      const disease = await createDiseaseInDb("Neumonía");
      const deceased = await createDeceasedInDb(disease.id);

      const blocked = await agent.delete(`/diseases/${disease.id}`);
      expect(blocked.status).toBe(409);

      await prisma.deceased.delete({ where: { id: deceased.id } });

      const allowed = await agent.delete(`/diseases/${disease.id}`);
      expect(allowed.status).toBe(204);

      const diseaseInDb = await prisma.disease.findUnique({
        where: { id: disease.id },
      });
      expect(diseaseInDb).toBeNull();
    });

    it("devuelve 400 cuando el id es inválido", async () => {
      const agent = await authenticatedAgent(app);

      const response = await agent.delete("/diseases/abc");

      expect(response.status).toBe(400);
    });
  });
});