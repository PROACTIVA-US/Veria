import type { FastifyPluginAsync } from 'fastify';
import checkoutRoutes from './checkout.js';
import webhookRoutes from './webhook.js';
import portalRoutes from './portal.js';

const billingRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(checkoutRoutes);
  await fastify.register(webhookRoutes);
  await fastify.register(portalRoutes);
};

export default billingRoutes;
