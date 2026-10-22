import Stripe from 'stripe';
export const config={api:{bodyParser:false}};
async function getRaw(req){const chunks=[];for await(const chunk of req)chunks.push(typeof chunk==='string'?Buffer.from(chunk):chunk);return Buffer.concat(chunks);}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).send('Méthode non autorisée');
 const {STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET}=process.env;
 if(!STRIPE_SECRET_KEY||!STRIPE_WEBHOOK_SECRET)return res.status(503).send('Webhook non configuré');
 try{
  const stripe=new Stripe(STRIPE_SECRET_KEY);
  const event=stripe.webhooks.constructEvent(await getRaw(req),req.headers['stripe-signature'],STRIPE_WEBHOOK_SECRET);
  // À relier à un stockage transactionnel persistant et idempotent avant activation réelle.
  // Un 503 empêche d'acquitter des paiements que le système ne sait pas enregistrer.
  if(['checkout.session.completed','invoice.paid','invoice.payment_failed','customer.subscription.deleted'].includes(event.type)){
   console.error('WEBHOOK_STORAGE_NOT_CONFIGURED',event.type,event.id);
   return res.status(503).send('Stockage des événements non configuré');
  }
  return res.status(200).json({received:true});
 }catch(e){return res.status(400).send('Signature webhook invalide');}
}
