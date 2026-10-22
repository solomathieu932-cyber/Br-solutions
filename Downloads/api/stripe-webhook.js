import Stripe from 'stripe';
// Stripe keeps the authoritative subscription/payment records. This endpoint
// verifies webhooks and logs identifiers only; it does NOT provision access
// or synchronize an external CRM/dashboard.
export const config = {api:{bodyParser:false}};
async function rawBody(req){const parts=[];for await(const part of req)parts.push(Buffer.isBuffer(part)?part:Buffer.from(part));return Buffer.concat(parts);}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
 const {STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET}=process.env;
 if(!STRIPE_SECRET_KEY||!STRIPE_WEBHOOK_SECRET)return res.status(503).json({error:'Webhook non configuré'});
 if(!STRIPE_SECRET_KEY.startsWith('sk_live_'))return res.status(503).json({error:'Clé Stripe réelle requise'});
 let event;
 try{
  const stripe=new Stripe(STRIPE_SECRET_KEY);
  event=stripe.webhooks.constructEvent(await rawBody(req),req.headers['stripe-signature'],STRIPE_WEBHOOK_SECRET);
 }catch(err){console.error('stripe_webhook_invalid',err?.type||err?.name);return res.status(400).json({error:'Signature webhook invalide'});}
 // Idempotent by design: no local write or fulfillment. Events and invoice/subscription
 // states remain available in Stripe and can be replayed to a future CRM integration.
 const tracked=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','invoice.paid','invoice.payment_failed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted']);
 if(tracked.has(event.type)){
  const obj=event.data?.object||{};
  console.info('stripe_event_verified',event.id,event.type,obj.id||'');
 }
 return res.status(200).json({received:true});
}
