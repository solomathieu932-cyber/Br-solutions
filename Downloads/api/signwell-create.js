import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createHmac } from 'node:crypto';

const API = 'https://www.signwell.com/api/v1/documents/';
const clean = (v, max=120) => typeof v==='string' ? v.trim().slice(0,max) : '';
const valid = (v,min=1)=>v.length>=min;

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée'});
 const key=process.env.SIGNWELL_API_KEY;
 if(!key)return res.status(503).json({error:'Signature non configurée'});
 if(!process.env.SIGNING_PROOF_SECRET)return res.status(503).json({error:'Configuration de sécurité incomplète : SIGNING_PROOF_SECRET manquant.'});
 const b=req.body||{};
 const d={prenom:clean(b.prenom,70),nom:clean(b.nom,70),voie:clean(b.voie,140),code_postal:clean(b.code_postal,5),ville:clean(b.ville,90),telephone:clean(b.telephone,30),email:clean(b.email,150)};
 if(!Object.entries(d).every(([k,v])=>valid(v,k==='email'?5:1))||!/^[0-9]{5}$/.test(d.code_postal)||!/^\S+@\S+\.\S+$/.test(d.email)||b.plan!=='69 € - abonnement annuel')return res.status(400).json({error:'Coordonnées invalides'});
 try{
  const pdfBytes=await readFile(join(process.cwd(),'assets','contrat-individuel-vierge.pdf'));
  const pdf=await PDFDocument.load(pdfBytes);
  const page=pdf.getPages()[0], font=await pdf.embedFont(StandardFonts.Helvetica);
  // A4, coordinates measured against the submitted PDF's first page.
  const entries=[
   [110,677,d.prenom],[110,660,d.nom],[110,643,d.voie],[110,626,d.code_postal],
   [110,610,d.ville],[110,593,d.telephone],[110,576,d.email]
  ];
  const put=(x,y,value)=>{
    // WinAnsi fonts cannot display all Unicode characters; use a safe fallback.
    const t=value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E\xA0-\xFF]/g,' ');
    const size= Math.min(10, Math.max(7, 10*205/Math.max(205,font.widthOfTextAtSize(t,10))));
    page.drawText(t,{x,y,size,font,color:rgb(.08,.16,.23)});
  };
  for(const [x,y,value] of entries)put(x,y,value);
  // Signing date and handwritten signature are collected by SignWell, not prefilled.
  const base64=Buffer.from(await pdf.save()).toString('base64');
  const payload={test_mode:false,embedded_signing:true,with_signature_page:true,draft:false,expires_in:30,reminders:false,
   name:'BR SOLUTIONS — Contrat individuel — 69 euros annuel',
   files:[{name:'contrat-individuel-pre-rempli.pdf',file_base64:base64}],
   recipients:[{id:'1',name:`${d.prenom} ${d.nom}`,email:d.email}],language:'fr'};
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','X-Api-Key':key},body:JSON.stringify(payload)});
  const result=await r.json().catch(()=>({}));
  if(!r.ok)return res.status(502).json({error:`SignWell a refusé le document (HTTP ${r.status}). Vérifiez la configuration et le compte.`});
  const url=result.recipients?.[0]?.embedded_signing_url;
  if(!url||!url.startsWith('https://www.signwell.com/'))return res.status(502).json({error:'Lien de signature intégrée non fourni par SignWell',documentId:result.id||null});
  const stamp=Date.now().toString();
  const emailHash=createHmac('sha256',process.env.SIGNING_PROOF_SECRET).update(d.email.toLowerCase()).digest('hex');
  const message=[result.id,stamp,emailHash].join('.');
  const signature=createHmac('sha256',process.env.SIGNING_PROOF_SECRET).update(message).digest('hex');
  return res.status(200).json({url,documentId:result.id,status:result.status,proof:[stamp,emailHash,signature].join('.')});
 }catch(e){console.error('SignWell document error',e?.message);return res.status(502).json({error:'Impossible de préparer le contrat PDF ou joindre SignWell.'});}
}
