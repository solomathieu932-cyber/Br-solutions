import Stripe from 'stripe';
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Méthode non autorisée'});
  const sessionId=req.query.session_id;
  if(typeof sessionId!=='string'||!/^cs_live_[A-Za-z0-9_]{15,}$/.test(sessionId))return res.status(400).json({error:'Identifiant de session invalide'});
  const {STRIPE_SECRET_KEY,STRIPE_PRICE_ID}=process.env;
  if(!STRIPE_SECRET_KEY?.startsWith('sk_live_')||!STRIPE_PRICE_ID)return res.status(503).json({error:'Stripe non configuré'});
  try{
    const stripe=new Stripe(STRIPE_SECRET_KEY);
    const session=await stripe.checkout.sessions.retrieve(sessionId,{expand:['subscription']});
    const sub=session.subscription;
    const good=session.livemode===true&&session.mode==='subscription'&&session.status==='complete'&&session.payment_status==='paid'&&sub&&typeof sub==='object'&&['active','trialing'].includes(sub.status)&&Boolean(session.client_reference_id)&&sub.metadata?.signwell_document_id===session.client_reference_id&&sub.items?.data?.some(i=>i.price?.id===STRIPE_PRICE_ID&&i.price?.unit_amount===6900&&i.price?.currency==='eur'&&i.price?.recurring?.interval==='year'&&i.price?.recurring?.interval_count===1);
    return res.status(200).json({confirmed:Boolean(good)});
  }catch(e){console.error('stripe_session_verification',e?.type||e?.name);return res.status(502).json({error:'Vérification temporairement indisponible'});}
}
