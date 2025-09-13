import type { FastifyPluginAsync } from 'fastify';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const PortalSchema = z.object({
  customerId: z.string(),
  returnUrl: z.string().url(),
});

const portalRoutes: FastifyPluginAsync = async (fastify) => {
  // Create customer portal session
  fastify.post('/portal', {
    schema: {
      body: PortalSchema,
      response: {
        200: z.object({
          url: z.string().url(),
        }),
      },
    },
  }, async (request, reply) => {
    const { customerId, returnUrl } = request.body as z.infer<typeof PortalSchema>;
    
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      
      return reply.code(200).send({
        url: session.url,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create portal session');
      return reply.code(500).send({
        error: 'Failed to create portal session',
      });
    }
  });
  
  // Get customer portal link (simplified GET endpoint)
  fastify.get('/portal/:customerId', async (request, reply) => {
    const { customerId } = request.params as { customerId: string };
    const returnUrl = request.query.returnUrl || 'https://vislzr.com/dashboard';
    
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl as string,
      });
      
      // Redirect to portal
      return reply.redirect(303, session.url);
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create portal session');
      return reply.code(500).send({
        error: 'Failed to create portal session',
      });
    }
  });
};

export default portalRoutes;
