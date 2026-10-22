import Stripe from 'stripe';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Méthode non autorisée'});
 const id=req.query.session_id;
 if(typeof id!=='string'||!/^cs_live_[a-zA-Z0-9_]{15,}$/.test(id))return res.status(400).json({error:'Identifiant de session invalide'});
 const {STRIPE_SECRET_KEY,STRIPE_PRICE_ID}=process.env;
 if(!STRIPE_SECRET_KEY||!STRIPE_PRICE_ID||!STRIPE_SECRET_KEY.startsWith('sk_live_'))return res.status(503).json({error:'Stripe non configuré'});
 try{
  const stripe=new Stripe(STRIPE_SECRET_KEY);
  const session=await stripe.checkout.sessions.retrieve(id,{expand:['subscription']});
  const sub=session.subscription;
  if(session.livemode!==true||session.mode!=='subscription'||session.status!=='complete'||session.payment_status!=='paid'||!sub||typeof sub==='string'||!['active','trialing'].includes(sub.status))return res.status(200).json({confirmed:false});
  // Recheck the configured annual price from the actual subscription, not query parameters.
  const matching=sub.items?.data?.some(i=>i.price?.id===STRIPE_PRICE_ID&&i.price?.unit_amount===6900&&i.price?.currency==='eur'&&i.price?.recurring?.interval==='year');
  if(!matching||!session.client_reference_id||sub.metadata?.signwell_document_id!==session.client_reference_id)return res.status(200).json({confirmed:false});
  return res.status(200).json({confirmed:true});
 }catch(err){console.error('stripe_session_status_error',err?.type||err?.name);return res.status(502).json({error:'Vérification du paiement indisponible'});}
}
