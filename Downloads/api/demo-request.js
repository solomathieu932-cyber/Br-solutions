// BR Solutions — envoi sécurisé d'une demande de démonstration via Resend.
// Configuration Vercel : RESEND_API_KEY ; vérifier brsolutionstempeos.com dans Resend.
const RECIPIENT = 'lixcroville@gmail.com';
const FROM = 'BR Solutions <contact@brsolutionstempeos.com>';
const pick=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
  const contentType=req.headers['content-type']||'';
  if(!contentType.startsWith('application/json'))return res.status(415).json({error:'Format invalide.'});
  if(Number(req.headers['content-length']||0)>8192)return res.status(413).json({error:'Demande trop volumineuse.'});
  const origin=req.headers.origin;
  const allowed=new Set(['https://brsolutionstempeos.com','https://www.brsolutionstempeos.com']);
  if(origin&&!allowed.has(origin))return res.status(403).json({error:'Origine non autorisée.'});
  if(!process.env.RESEND_API_KEY)return res.status(503).json({error:'Envoi e-mail non configuré. Réessayez plus tard.'});
  const b=req.body||{};
  // Champ piège pour les robots. Ne pas envoyer de courriel.
  if(b.website)return res.status(200).json({ok:true});
  const d={
    nom:pick(b.nom,80),prenom:pick(b.prenom,80),code_postal:pick(b.code_postal,5),
    ville:pick(b.ville,100),email:pick(b.email,180),telephone:pick(b.telephone,32)
  };
  if(!d.nom||!d.prenom||!/^[0-9]{5}$/.test(d.code_postal)||!d.ville||
     !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)||!/^\+?[0-9 ()+.-]{8,25}$/.test(d.telephone)||
     b.consent!==true||b.purpose!=='demonstration'){
    return res.status(400).json({error:'Veuillez compléter les champs et autoriser la prise de contact.'});
  }
  const label={prenom:'Prénom',nom:'Nom',code_postal:'Code postal',ville:'Ville',email:'E-mail',telephone:'Téléphone'};
  const message=[
    'NOUVELLE DEMANDE DE DÉMONSTRATION — BR SOLUTIONS','',
    ...Object.keys(label).map(k=>label[k]+' : '+d[k]),'',
    'Motif : souhaite une démonstration (sans souscription).',
    'Consentement : OUI, autorise BR Solutions à le/la recontacter pour cette demande.',
    'Date de réception : '+new Date().toISOString(),
    'Origine : https://brsolutionstempeos.com/'
  ].join('\n');
  try{
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{'Authorization':'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({from:FROM,to:[RECIPIENT],reply_to:[d.email],
        subject:'[BR Solutions] Démonstration demandée — '+d.prenom+' '+d.nom,
        text:message}),
      signal:AbortSignal.timeout(15000)
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.id){
      console.error('demo_mail_failed',response.status,data?.name||'unknown');
      return res.status(502).json({error:'Envoi impossible pour le moment. Veuillez réessayer plus tard.'});
    }
    return res.status(200).json({ok:true});
  }catch(e){
    console.error('demo_mail_exception',e?.name||'unknown');
    return res.status(502).json({error:'Le service e-mail est temporairement indisponible.'});
  }
}
