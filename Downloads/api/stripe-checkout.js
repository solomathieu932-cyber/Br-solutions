import Stripe from 'stripe';
import { createHmac, timingSafeEqual } from 'node:crypto';

const err = (res,status,error) => res.status(status).json({error});
const validId = id => typeof id === 'string' && /^[a-f\d-]{36}$/i.test(id);

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return err(res,405,'Méthode non autorisée');
  const {STRIPE_SECRET_KEY,STRIPE_PRICE_ID,STRIPE_WEBHOOK_SECRET,SIGNWELL_API_KEY,SIGNING_PROOF_SECRET}=process.env;
  if(!STRIPE_SECRET_KEY||!STRIPE_PRICE_ID||!STRIPE_WEBHOOK_SECRET||!SIGNWELL_API_KEY||!SIGNING_PROOF_SECRET)
    return err(res,503,'Configuration Stripe incomplète');
  if(!STRIPE_SECRET_KEY.startsWith('sk_live_'))return err(res,503,'Clé Stripe de production requise');
  const {documentId,proof}=req.body||{};
  if(!validId(documentId)||typeof proof!=='string')return err(res,400,'Signature invalide');
  const [stamp,emailHash,received,extra]=proof.split('.');
  if(extra||!/^\d{13}$/.test(stamp||'')|| !/^[a-f0-9]{64}$/.test(emailHash||'')|| !/^[a-f0-9]{64}$/.test(received||''))return err(res,400,'Preuve invalide');
  const age=Date.now()-Number(stamp);
  if(age< -60000 || age>60*60*1000)return err(res,403,'Session expirée : veuillez recommencer');
  const expected=createHmac('sha256',SIGNING_PROOF_SECRET).update(`${documentId}.${stamp}.${emailHash}`).digest('hex');
  if(!timingSafeEqual(Buffer.from(received,'hex'),Buffer.from(expected,'hex')))return err(res,403,'Preuve invalide');
  try {
    const sw=await fetch('https://www.signwell.com/api/v1/documents/'+encodeURIComponent(documentId),{headers:{'X-Api-Key':SIGNWELL_API_KEY},signal:AbortSignal.timeout(12000)});
    if(!sw.ok)return err(res,502,'Signature SignWell non vérifiable');
    const document=await sw.json();
    if(document.test_mode!==false||String(document.status||'').toLowerCase()!=='completed')return err(res,403,'Veuillez terminer les signatures du contrat');
    const email=document.recipients?.[0]?.email;
    if(typeof email!=='string'||createHmac('sha256',SIGNING_PROOF_SECRET).update(email.trim().toLowerCase()).digest('hex')!==emailHash)return err(res,403,'Signataire non confirmé');
    const stripe=new Stripe(STRIPE_SECRET_KEY);
    const price=await stripe.prices.retrieve(STRIPE_PRICE_ID);
    if(!price.livemode||!price.active||price.currency!=='eur'||price.unit_amount!==6900||price.recurring?.interval!=='year'||price.recurring?.interval_count!==1)return err(res,503,'Le tarif Stripe doit être de 69 € TTC par an');
    const origin='https://brsolutionstempeos.com';
    const session=await stripe.checkout.sessions.create({
      mode:'subscription',customer_email:email,line_items:[{price:STRIPE_PRICE_ID,quantity:1}],
      success_url:origin+'/?payment=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url:origin+'/?payment=cancel',
      client_reference_id:documentId,
      metadata:{signwell_document_id:documentId},subscription_data:{metadata:{signwell_document_id:documentId}},
      billing_address_collection:'required',allow_promotion_codes:false
    },{idempotencyKey:'brsolutions-annual-'+documentId});
    if(!session.url||!/^https:\/\/checkout\.stripe\.com\//.test(session.url))return err(res,502,'URL Stripe inattendue');
    return res.status(200).json({url:session.url});
  }catch(e){console.error('stripe_checkout_error',e?.type||e?.name);return err(res,502,'Stripe indisponible : veuillez réessayer');}
}
