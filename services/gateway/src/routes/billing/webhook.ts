import type { FastifyPluginAsync } from 'fastify';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Stripe webhook handler
  fastify.post('/webhook', {
    config: {
      // Disable body parsing to access raw body for signature verification
      rawBody: true,
    },
  }, async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string;
    
    if (!sig) {
      return reply.code(400).send({ error: 'Missing stripe-signature header' });
    }
    
    let event: Stripe.Event;
    
    try {
      // Use raw body for signature verification
      const rawBody = request.rawBody || request.body;
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        webhookSecret
      );
    } catch (err) {
      fastify.log.error({ err }, 'Webhook signature verification failed');
      return reply.code(400).send({ error: 'Invalid signature' });
    }
    
    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          
          // Update user subscription in database
          fastify.log.info({
            sessionId: session.id,
            customerId: session.customer,
            subscriptionId: session.subscription,
            metadata: session.metadata,
          }, 'Checkout session completed');
          
          // TODO: Update database with subscription details
          // await updateUserSubscription(session.metadata?.userId, {
          //   stripeCustomerId: session.customer as string,
          //   stripeSubscriptionId: session.subscription as string,
          //   status: 'active',
          // });
          
          break;
        }
        
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          
          fastify.log.info({
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            status: subscription.status,
            metadata: subscription.metadata,
          }, 'Subscription updated');
          
          // TODO: Update subscription status in database
          // await updateSubscriptionStatus(
          //   subscription.metadata?.userId,
          //   subscription.status
          // );
          
          break;
        }
        
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          
          fastify.log.info({
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            metadata: subscription.metadata,
          }, 'Subscription cancelled');
          
          // TODO: Handle subscription cancellation
          // await cancelUserSubscription(subscription.metadata?.userId);
          
          break;
        }
        
        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          
          fastify.log.info({
            invoiceId: invoice.id,
            customerId: invoice.customer,
            amountPaid: invoice.amount_paid,
            subscriptionId: invoice.subscription,
          }, 'Invoice paid');
          
          // TODO: Record payment in database
          // await recordPayment({
          //   invoiceId: invoice.id,
          //   customerId: invoice.customer as string,
          //   amount: invoice.amount_paid,
          //   currency: invoice.currency,
          // });
          
          break;
        }
        
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          
          fastify.log.warn({
            invoiceId: invoice.id,
            customerId: invoice.customer,
            subscriptionId: invoice.subscription,
          }, 'Invoice payment failed');
          
          // TODO: Handle payment failure
          // await handlePaymentFailure(invoice.customer as string);
          
          break;
        }
        
        default:
          fastify.log.info({ type: event.type }, 'Unhandled webhook event type');
      }
      
      return reply.code(200).send({ received: true });
    } catch (error) {
      fastify.log.error({ error, event }, 'Error processing webhook');
      return reply.code(500).send({ error: 'Webhook processing failed' });
    }
  });
};

export default webhookRoutes;
