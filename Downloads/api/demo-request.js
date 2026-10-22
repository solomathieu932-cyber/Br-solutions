// BR Solutions — notification premium des demandes de démonstration via Resend.
// Aucune clé n'est exposée au navigateur. Configuration : RESEND_API_KEY dans Vercel.
const TO = 'benoit.richard@tempeos.com';
const FROM = 'BR Solutions <contact@brsolutionstempeos.com>';
const pick = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const reply = (res,status,error) => res.status(status).json({error});
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function buildEmail(d, timestamp){
 const safe = Object.fromEntries(Object.entries(d).map(([k,v]) => [k,escapeHtml(v)]));
 const fullName = `${safe.prenom} ${safe.nom}`;
 const telHref = 'tel:' + d.telephone.replace(/[^\d+]/g,'');
 const mailHref = 'mailto:' + encodeURIComponent(d.email).replace(/%40/g,'@');
 const localDate = new Intl.DateTimeFormat('fr-FR',{
  timeZone:'Europe/Paris',day:'2-digit',month:'long',year:'numeric',
  hour:'2-digit',minute:'2-digit',hour12:false
 }).format(timestamp);
 const rows = [
  ['Nom et prénom',fullName],
  ['Code postal',safe.code_postal],
  ['Ville',safe.ville],
  ['Adresse e-mail',safe.email],
  ['Téléphone',safe.telephone]
 ].map(([label,value],i) => `<tr><td style="padding:13px 16px;background:${i%2?'#ffffff':'#f6fafa'};border-bottom:1px solid #e6eeee;color:#586977;font:600 13px Arial,sans-serif;width:38%;vertical-align:top">${label}</td><td style="padding:13px 16px;background:${i%2?'#ffffff':'#f6fafa'};border-bottom:1px solid #e6eeee;color:#142b37;font:700 15px Arial,sans-serif;word-break:break-word;vertical-align:top">${value}</td></tr>`).join('');
 const html = `<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nouvelle demande de démonstration — BR Solutions</title></head>
<body style="margin:0;padding:0;background:#eef3f4;font-family:Arial,Helvetica,sans-serif;color:#142b37">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Nouvelle demande de démonstration : ${fullName} — ${safe.ville}</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#eef3f4"><tr><td align="center" style="padding:34px 14px">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%;max-width:600px;background:#fff;border-collapse:separate;border-spacing:0;border-radius:20px;overflow:hidden">
<tr><td style="padding:0;background:linear-gradient(100deg,#06b9ae,#0d7a78);height:7px;font-size:1px">&nbsp;</td></tr>
<tr><td style="padding:28px 32px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:26px;font-weight:800;letter-spacing:-.8px;color:#0e837f">BR <span style="color:#122536">Solutions</span></td><td align="right" style="font-size:11px;font-weight:700;letter-spacing:1.3px;color:#e87612">CLUB PRIVÉ TEMPEOS</td></tr></table></td></tr>
<tr><td style="padding:14px 32px 5px"><span style="display:inline-block;padding:8px 12px;border-radius:30px;background:#fff0e2;color:#a84b08;font-size:12px;font-weight:800">NOUVEAU PROSPECT</span></td></tr>
<tr><td style="padding:14px 32px 6px;font-size:27px;line-height:1.22;font-weight:800;color:#122536">Demande de démonstration</td></tr>
<tr><td style="padding:0 32px 24px;color:#60717c;font-size:15px;line-height:1.65">${fullName} souhaite découvrir les avantages du Club Privé Tempeos et être recontacté. Voici ses coordonnées.</td></tr>
<tr><td style="padding:0 32px 8px;color:#172d39;font-weight:800;font-size:16px">Informations du prospect</td></tr>
<tr><td style="padding:0 32px 22px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #e6eeee;border-radius:12px;overflow:hidden">${rows}</table></td></tr>
<tr><td align="center" style="padding:0 32px 20px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:5px"><a href="${escapeHtml(telHref)}" style="display:inline-block;box-sizing:border-box;width:100%;padding:15px 10px;border-radius:11px;background:#0bafa5;color:#fff;text-decoration:none;font-size:14px;font-weight:800;text-align:center">📞 Appeler le prospect</a></td><td align="center" style="padding:5px"><a href="${escapeHtml(mailHref)}" style="display:inline-block;box-sizing:border-box;width:100%;padding:14px 10px;border-radius:11px;border:1px solid #d6e5e7;background:#fff;color:#0c7471;text-decoration:none;font-size:14px;font-weight:800;text-align:center">✉ Répondre par e-mail</a></td></tr></table></td></tr>
<tr><td style="padding:0 32px 25px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0faf8;border-radius:12px"><tr><td style="padding:17px 19px;font-size:13px;line-height:1.7;color:#28615e"><strong style="color:#126b64">Consentement confirmé</strong><br>Le prospect autorise BR Solutions à le recontacter par téléphone ou e-mail uniquement pour organiser une démonstration.<br><strong>Date de la demande :</strong> ${escapeHtml(localDate)} (heure de Paris)</td></tr></table></td></tr>
<tr><td style="background:#f8fafb;border-top:1px solid #e7edef;padding:20px 32px;text-align:center;color:#82919a;font-size:12px;line-height:1.7">Notification automatique envoyée depuis <a href="https://brsolutionstempeos.com/" style="color:#0b948d;text-decoration:none">brsolutionstempeos.com</a><br>Message interne destiné à BR Solutions — informations personnelles à traiter confidentiellement.</td></tr>
</table></td></tr></table></body></html>`;
 return {html,localDate};
}

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
 const now=new Date();
 const {html,localDate}=buildEmail(d,now);
 const values=[
  'NOUVEAU PROSPECT — DEMANDE DE DÉMONSTRATION BR SOLUTIONS','',
  'Nom : '+d.nom, 'Prénom : '+d.prenom, 'Code postal : '+d.code_postal,
  'Ville : '+d.ville, 'E-mail : '+d.email, 'Téléphone : '+d.telephone,'',
  'Objet : demande de démonstration sans souscription.',
  'Consentement au recontact : OUI.',
  'Date : '+localDate+' (heure de Paris)', 'Site : https://brsolutionstempeos.com/'
 ];
 try{
  const response=await fetch('https://api.resend.com/emails',{
   method:'POST',
   headers:{'Authorization':'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({from:FROM,to:[TO],reply_to:d.email,subject:'🔔 Nouveau prospect — '+d.prenom+' '+d.nom,html,text:values.join('\n')}),
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
