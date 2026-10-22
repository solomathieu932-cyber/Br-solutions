import Stripe from 'stripe';
export const config={api:{bodyParser:false}};
async function rawBody(req){const parts=[];for await(const c of req)parts.push(Buffer.isBuffer(c)?c:Buffer.from(c));return Buffer.concat(parts);}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
  const {STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET}=process.env;
  if(!STRIPE_SECRET_KEY||!STRIPE_WEBHOOK_SECRET)return res.status(503).json({error:'Webhook non configuré'});
  try{
    const stripe=new Stripe(STRIPE_SECRET_KEY);
    const event=stripe.webhooks.constructEvent(await rawBody(req),req.headers['stripe-signature'],STRIPE_WEBHOOK_SECRET);
    // Stripe est le système de référence. Pas d'accès Tempeos activé ici.
    // Aucun dashboard externe à synchroniser : la vérification de signature suffit
    // à accepter l'événement sans effets secondaires (traitement idempotent).
    if(new Set(['checkout.session.completed','invoice.paid','invoice.payment_failed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted']).has(event.type)){
      console.info('stripe_webhook_verified',event.id,event.type,event.data?.object?.id||'');
    }
    return res.status(200).json({received:true});
  }catch(e){console.error('stripe_webhook_signature_error',e?.type||e?.name);return res.status(400).json({error:'Signature webhook invalide'});}
}
