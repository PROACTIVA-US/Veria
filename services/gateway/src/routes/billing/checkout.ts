import type { FastifyPluginAsync } from 'fastify';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const CheckoutSchema = z.object({
  priceId: z.string(),
  customerId: z.string().optional(),
  email: z.string().email(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.string()).optional(),
});

const checkoutRoutes: FastifyPluginAsync = async (fastify) => {
  // Create checkout session
  fastify.post('/checkout', {
    schema: {
      body: CheckoutSchema,
      response: {
        200: z.object({
          sessionId: z.string(),
          url: z.string().url(),
        }),
      },
    },
  }, async (request, reply) => {
    const { priceId, customerId, email, successUrl, cancelUrl, metadata } = request.body as z.infer<typeof CheckoutSchema>;
    
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer: customerId,
        customer_email: !customerId ? email : undefined,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          ...metadata,
          userId: request.user?.id || 'anonymous',
        },
        subscription_data: {
          metadata: {
            ...metadata,
            userId: request.user?.id || 'anonymous',
          },
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      });
      
      return reply.code(200).send({
        sessionId: session.id,
        url: session.url!,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create checkout session');
      return reply.code(500).send({
        error: 'Failed to create checkout session',
      });
    }
  });
};

export default checkoutRoutes;
