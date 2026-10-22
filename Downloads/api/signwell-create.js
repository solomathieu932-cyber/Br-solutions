export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
 if(!process.env.SIGNWELL_API_KEY)return res.status(500).json({error:'SIGNWELL_API_KEY manquante dans Vercel'});
 const {name,email,plan}=req.body||{};
 if(typeof name!=='string'||name.trim().length<3||name.length>120||typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||!['79 € - 1 an','129 € - 2 ans'].includes(plan))return res.status(400).json({error:'Informations invalides'});
 const html=`<!doctype html><html lang="fr"><meta charset="utf-8"><style>body{font-family:Arial;padding:40px;line-height:1.6}h1{color:#0a8179}</style><h1>BR Solution — Contrat de test</h1><h2>Club Privé Tempeos</h2><p><strong>MODE TEST — SANS ENGAGEMENT NI PAIEMENT.</strong></p><p>Offre de démonstration : ${plan.startsWith('129')?'129 € pour 2 ans':'79 € pour 1 an'} (montant fictif).</p><p>Ce document sert exclusivement à tester la signature intégrée SignWell. Il ne constitue pas une adhésion ni une commande. Aucune obligation de paiement ou de renouvellement.</p><p>Le signataire confirme avoir participé à un essai technique.</p></html>`;
 const base64=Buffer.from(html,'utf8').toString('base64');
 try{
  const r=await fetch('https://www.signwell.com/api/v1/documents/',{method:'POST',headers:{'Content-Type':'application/json','X-Api-Key':process.env.SIGNWELL_API_KEY},body:JSON.stringify({test_mode:true,embedded_signing:true,with_signature_page:true,draft:false,reminders:false,name:'BR Solution — contrat de test',files:[{name:'contrat-test.html',file_base64:base64}],recipients:[{id:'1',name:name.trim(),email:email.trim()}],language:'fr'})});
  const data=await r.json();
  if(!r.ok)return res.status(502).json({error:'SignWell a refusé le document ('+r.status+'). Vérifiez les paramètres API.'});
  const url=data.recipients?.[0]?.embedded_signing_url;
  if(!url||!url.startsWith('https://www.signwell.com/'))return res.status(502).json({error:'Lien de signature intégrée absent de la réponse SignWell'});
  return res.status(200).json({url,documentId:data.id});
 }catch(e){return res.status(502).json({error:'Connexion SignWell impossible'});}
}
