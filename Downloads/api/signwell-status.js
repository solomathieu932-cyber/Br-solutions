export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Méthode non autorisée'});
 const id=req.query.id;
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))return res.status(400).json({error:'ID invalide'});
 if(!process.env.SIGNWELL_API_KEY)return res.status(500).json({error:'Configuration manquante'});
 try{const r=await fetch('https://www.signwell.com/api/v1/documents/'+encodeURIComponent(id),{headers:{'X-Api-Key':process.env.SIGNWELL_API_KEY}});if(!r.ok)return res.status(502).json({error:'Vérification SignWell indisponible'});const d=await r.json();return res.status(200).json({completed:String(d.status||'').toLowerCase()==='completed'&&d.test_mode===true});}catch(e){return res.status(502).json({error:'SignWell indisponible'});}
}
