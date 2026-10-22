import Stripe from 'stripe';
import { createHmac, timingSafeEqual } from 'node:crypto';
const json = (res,status,error)=>res.status(status).json({error});
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return json(res,405,'Méthode non autorisée');
 const {STRIPE_SECRET_KEY,STRIPE_PRICE_ID,SIGNWELL_API_KEY,SIGNING_PROOF_SECRET}=process.env;
 if(process.env.ENABLE_LIVE_CHECKOUT!=='true'||!STRIPE_SECRET_KEY||!STRIPE_PRICE_ID||!SIGNWELL_API_KEY||!SIGNING_PROOF_SECRET)return json(res,503,'Paiement en cours de configuration');
 if(!STRIPE_SECRET_KEY.startsWith('sk_live_'))return json(res,503,'Clé Stripe de production requise');
 const {documentId,proof}=req.body||{};
 if(typeof documentId!=='string'||!/^[0-9a-f-]{36}$/i.test(documentId)||typeof proof!=='string')return json(res,400,'Signature invalide');
 const [stamp,emailHash,received,extra]=proof.split('.');
 if(extra||!/^\d{13}$/.test(stamp||'')||! /^[a-f0-9]{64}$/.test(emailHash||'')||! /^[a-f0-9]{64}$/.test(received||''))return json(res,400,'Preuve invalide');
 if(Date.now()-Number(stamp)>60*60*1000||Number(stamp)>Date.now()+60000)return json(res,403,'Session de signature expirée : recommencez le parcours');
 const expected=createHmac('sha256',SIGNING_PROOF_SECRET).update([documentId,stamp,emailHash].join('.')).digest('hex');
 if(!timingSafeEqual(Buffer.from(received,'hex'),Buffer.from(expected,'hex')))return json(res,403,'Preuve invalide');
 try{
  const sr=await fetch('https://www.signwell.com/api/v1/documents/'+encodeURIComponent(documentId),{headers:{'X-Api-Key':SIGNWELL_API_KEY}});
  if(!sr.ok)return json(res,502,'Signature SignWell non vérifiable');
  const d=await sr.json();
  if(d.test_mode!==false||String(d.status||'').toLowerCase()!=='completed')return json(res,403,'Le contrat doit être signé avant de payer');
  const email=d.recipients?.[0]?.email;
  if(typeof email!=='string'||createHmac('sha256',SIGNING_PROOF_SECRET).update(email.trim().toLowerCase()).digest('hex')!==emailHash)return json(res,403,'Bénéficiaire non confirmé');
  const stripe=new Stripe(STRIPE_SECRET_KEY);
  const price=await stripe.prices.retrieve(STRIPE_PRICE_ID);
  if(!price.active||price.currency!=='eur'||price.unit_amount!==6900||price.recurring?.interval!=='year'||price.recurring?.interval_count!==1)return json(res,503,'Tarif Stripe incompatible avec 69 euros annuels');
  const origin='https://www.br-solutions-dash.fr';
  const session=await stripe.checkout.sessions.create({mode:'subscription',customer_email:email,line_items:[{price:STRIPE_PRICE_ID,quantity:1}],success_url:origin+'/?payment=success&session_id={CHECKOUT_SESSION_ID}',cancel_url:origin+'/?payment=cancel',client_reference_id:documentId,metadata:{signwell_document_id:documentId},subscription_data:{metadata:{signwell_document_id:documentId}},billing_address_collection:'required',allow_promotion_codes:false});
  return res.status(200).json({url:session.url});
 }catch(e){console.error('checkout_error',e?.type||e?.name);return json(res,502,'Impossible de créer le paiement Stripe');}
}
