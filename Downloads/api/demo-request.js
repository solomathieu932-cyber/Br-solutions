// BR Solutions — demande de démonstration via Resend (côté serveur uniquement).
const TO = 'lixcroville@gmail.com';
const FROM = 'BR Solutions <contact@brsolutionstempeos.com>';
const pick = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const reply = (res,status,error) => res.status(status).json({error});

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return reply(res,405,'Méthode non autorisée.');
 if(!(req.headers['content-type']||'').startsWith('application/json'))return reply(res,415,'Format invalide.');
 if(Number(req.headers['content-length']||0)>8192)return reply(res,413,'Demande trop volumineuse.');
 const allowed = new Set(['https://brsolutionstempeos.com','https://www.brsolutionstempeos.com']);
 if(req.headers.origin && !allowed.has(req.headers.origin))return reply(res,403,'Origine non autorisée.');
 if(!process.env.RESEND_API_KEY)return reply(res,503,'Envoi non configuré : RESEND_API_KEY manquante dans Vercel.');
 const body=req.body||{};
 if(body.website)return res.status(200).json({ok:true}); // filtre antispam invisible
 const d={nom:pick(body.nom,80),prenom:pick(body.prenom,80),code_postal:pick(body.code_postal,5),ville:pick(body.ville,100),email:pick(body.email,180),telephone:pick(body.telephone,25)};
 if(!d.nom||!d.prenom||!/^[0-9]{5}$/.test(d.code_postal)||!d.ville||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)||!/^\+?[0-9 ()+.-]{8,25}$/.test(d.telephone)||body.consent!==true||body.purpose!=='demonstration')return reply(res,400,'Merci de compléter tous les champs et d’autoriser la prise de contact.');
 const values=[
  'NOUVELLE DEMANDE DE DÉMONSTRATION — BR SOLUTIONS','',
  'Nom : '+d.nom, 'Prénom : '+d.prenom, 'Code postal : '+d.code_postal,
  'Ville : '+d.ville, 'E-mail : '+d.email, 'Téléphone : '+d.telephone,'',
  'Objet : demande de démonstration sans souscription.','Consentement au recontact : OUI.',
  'Date (UTC) : '+new Date().toISOString(), 'Site : https://brsolutionstempeos.com/'
 ];
 try{
  const response=await fetch('https://api.resend.com/emails',{
   method:'POST',
   headers:{'Authorization':'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({from:FROM,to:[TO],reply_to:d.email,subject:'[BR Solutions] Démonstration — '+d.prenom+' '+d.nom,text:values.join('\n')}),
   signal:AbortSignal.timeout(15000)
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||!payload.id){
   console.error('resend_demo_rejected',response.status,payload?.name||'unknown',String(payload?.message||'').slice(0,180));
   if(response.status===401)return reply(res,503,'La clé Resend est invalide ou révoquée. Vérifiez RESEND_API_KEY dans Vercel.');
   if(response.status===403)return reply(res,503,'Resend refuse l’envoi : vérifiez que brsolutionstempeos.com est bien validé dans Resend (Domains).');
   if(response.status===422)return reply(res,503,'Resend refuse l’adresse d’expédition : vérifiez contact@brsolutionstempeos.com et la validation du domaine.');
   if(response.status===429)return reply(res,503,'Trop de demandes pour le moment. Réessayez dans quelques instants.');
   return reply(res,502,'L’envoi a été refusé par Resend. Consultez les logs Vercel / Resend.');
  }
  return res.status(200).json({ok:true});
 }catch(e){
  console.error('resend_demo_network_error',e?.name||'unknown');
  return reply(res,502,'Impossible de joindre Resend pour le moment.');
 }
}
