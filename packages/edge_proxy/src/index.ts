
import Fastify from "fastify";
import jwt from "jsonwebtoken";
import { request } from "undici";

const fastify = Fastify();

const API_URL = process.env.API_URL || "http://api:8000";

fastify.addHook("onRequest", async (req, reply) => {
  // Simple rate limit stub
  reply.header("x-edge-proxy", "true");
});

fastify.get("/healthz", async () => ({ ok: true }));

fastify.post("/decide", async (req, reply) => {
  const token = req.headers["authorization"]?.toString().replace("Bearer ", "") || "";
  if (!token) return reply.code(401).send({ error: "missing token" });
  try {
    jwt.verify(token, process.env.JWT_SECRET || "changeme");
  } catch {
    return reply.code(401).send({ error: "invalid token" });
  }
  const upstream = await request(`${API_URL}/decide`, { method: "POST", body: JSON.stringify({}), headers: { "content-type": "application/json" }});
  const data = await upstream.body.json();
  return data;
});

fastify.listen({ port: 8080, host: "0.0.0.0" }).then(() => {
  console.log("Edge proxy on :8080");
});
