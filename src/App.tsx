import { useEffect, useMemo, useState } from 'react';

type Mode = 'CFR' | 'FOB';
type Levy = 'iri' | 'ars' | 'none';
type FormState = {
  make: string; model: string; year: number; fuel: string; engine: number; seats: number;
  mode: Mode; cfr: number; fob: number; freight: number; insurance: number; rate: number;
  duty: number; vat: number; levy: Levy; fees: number; profit: number;
};
const defaults: FormState = {
  make:'Toyota',model:'Hilux',year:2018,fuel:'Diesel',engine:2.4,seats:5,mode:'CFR',
  cfr:7566,fob:3833,freight:3733,insurance:100,rate:4483.5,duty:20,vat:20,levy:'iri',fees:300,profit:20
};
const money = (n:number, currency:'MGA'|'USD'='MGA') =>
  new Intl.NumberFormat('fr-FR',{style:'currency',currency,maximumFractionDigits:currency==='MGA'?0:2}).format(Number.isFinite(n)?n:0);
const pct = (n:number) => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(n)+' %';
function Field({label, value, onChange, min=0, step=1, suffix}: {
  label:string; value:string|number; onChange:(value:string)=>void; min?:number; step?:number; suffix?:string
}) {
  return <label className="field">{label}<span className="input-wrap"><input type="number" min={min} step={step} value={value}
    onChange={e=>onChange(e.target.value)} /><small>{suffix}</small></span></label>;
}
export default function App() {
  const [form,setForm] = useState<FormState>(() => {
    try { const saved=localStorage.getItem('importAutoMgInputs'); return saved ? {...defaults,...JSON.parse(saved)} : defaults; }
    catch { return defaults; }
  });
  const [online,setOnline]=useState(navigator.onLine);
  const [rateBusy,setRateBusy]=useState(false);
  const [rateNote,setRateNote]=useState('Taux de marché indicatif : il peut différer du taux officiel douanier.');
  const [manualTaxes,setManualTaxes]=useState(false);
  const [currency,setCurrency]=useState<'MGA'|'USD'>('MGA');
  useEffect(()=>{try{localStorage.setItem('importAutoMgInputs',JSON.stringify(form));}catch{}},[form]);
  useEffect(()=>{
    const on=()=>setOnline(true),off=()=>setOnline(false);
    window.addEventListener('online',on);window.addEventListener('offline',off);
    return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off);};
  },[]);
  const update=<K extends keyof FormState>(key:K,value:FormState[K])=>setForm(p=>({...p,[key]:value}));
  const num=(key:keyof FormState)=>(value:string)=>update(key,Number(value) as FormState[typeof key]);
  const calc=useMemo(()=>{
    const goods=form.mode==='CFR'?form.cfr:form.fob+form.freight;
    const cifUsd=Math.max(0,goods)+Math.max(0,form.insurance);
    const cif=cifUsd*Math.max(0,form.rate);
    const duty=cif*Math.max(0,form.duty)/100;
    const vat=(cif+duty)*Math.max(0,form.vat)/100;
    const levy=cif*(form.levy==='iri'?5:form.levy==='ars'?2:0)/100;
    const fees=Math.max(0,form.fees)*Math.max(0,form.rate);
    const total=cif+duty+vat+levy+fees;
    const profit=total*Math.max(0,form.profit)/100;
    const sale=total+profit;
    return {goods,cifUsd,cif,duty,vat,levy,fees,total,profit,sale,margin:sale?profit/sale*100:0};
  },[form]);
  const hs = form.fuel==='Diesel' && form.seats<=9 && form.engine>1.5 && form.engine<=2.5
    ? '87033292' : form.fuel==='Diesel' && form.seats>=10 && form.seats<=11 ? '87021012' : 'À déterminer';
  const display=(mga:number)=>currency==='MGA'?money(mga):money(mga/Math.max(form.rate,1),'USD');
  const refreshRate=async()=>{
    if(!online){setRateNote('Hors ligne : le taux saisi est conservé.');return;}
    setRateBusy(true);setRateNote('Récupération du cours de marché…');
    try{
      const response=await fetch('https://open.er-api.com/v6/latest/USD',{cache:'no-store'});
      if(!response.ok)throw new Error('Service de change indisponible.');
      const json=await response.json() as {rates?:{MGA?:number}};
      const rate=Number(json.rates?.MGA);
      if(!Number.isFinite(rate)||rate<=0)throw new Error('Taux reçu invalide.');
      update('rate',rate);setRateNote('Taux de marché mis à jour le '+new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeZone:'Indian/Antananarivo'}).format(new Date())+'. À confirmer auprès des Douanes.');
    }catch(error){setRateNote((error instanceof Error?error.message:'Erreur réseau')+' Le taux actuel est conservé.');}
    finally{setRateBusy(false);}
  };
  const reset=()=>{if(confirm('Réinitialiser les données du calculateur ?')){setForm(defaults);localStorage.removeItem('importAutoMgInputs');}};
  const copy=async()=>{
    const txt=['IMPORT AUTO MG — ESTIMATION INDICATIVE',form.make+' '+form.model+' ('+form.year+')','Valeur CAF : '+money(calc.cif),'Droits : '+money(calc.duty),'TVA : '+money(calc.vat),'Prélèvement : '+money(calc.levy),'Frais : '+money(calc.fees),'Coût de revient : '+money(calc.total),'Prix de vente cible : '+money(calc.sale),'Marge sur vente : '+pct(calc.margin),'Taux USD/MGA : '+form.rate,'Les hypothèses et le code SH doivent être confirmés auprès des Douanes malgaches.'].join('\n');
    try{await navigator.clipboard.writeText(txt);setRateNote('Récapitulatif copié dans le presse-papiers.');}
    catch{setRateNote('Copie non disponible dans ce navigateur. Utilisez Imprimer / PDF.');}
  };
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">IA</span><span>IMPORT <b>AUTO MG</b><small>ESTIMATION D’IMPORTATION</small></span></a><span className={'status '+(online?'online':'offline')}>{online?'● En ligne':'● Mode hors ligne'}</span></header>
    <main className="page" id="top">
      <section className="hero"><div><p className="eyebrow">CALCULATEUR D’IMPORTATION</p><h1>Chiffrez votre prochain<br/><em>véhicule importé.</em></h1><p className="hero-copy">Estimez le coût de revient, les hypothèses douanières et le prix de revente cible. Les calculs fonctionnent hors ligne.</p><div className="tags"><span>Calcul instantané</span><span>Données locales</span><span>Export PDF</span></div></div><div className="hero-card"><small>COÛT DE REVIENT ESTIMÉ</small><strong>{money(calc.total)}</strong><hr/><small>PRIX DE VENTE CIBLE</small><strong className="sale">{money(calc.sale)}</strong><p>Marge cible {pct(calc.margin)}</p></div></section>
      <div className="notice"><b>À retenir</b><p>Cette estimation n’est pas une liquidation douanière. Le code SH, la base taxable et les taux doivent être vérifiés auprès des Douanes de Madagascar. Le taux de marché USD/MGA ne remplace pas le taux officiel douanier.</p></div>
      <div className="layout">
        <div className="forms">
          <section className="panel"><div className="panel-title"><span>01</span><div><h2>Profil du véhicule</h2><p>Caractéristiques pour proposer un code tarifaire candidat.</p></div></div>
            <div className="grid two"><label className="field">Marque<input value={form.make} onChange={e=>update('make',e.target.value)}/></label><label className="field">Modèle<input value={form.model} onChange={e=>update('model',e.target.value)}/></label></div>
            <div className="grid three"><label className="field">Année<input type="number" min="1950" max="2035" value={form.year} onChange={e=>update('year',Number(e.target.value))}/></label><label className="field">Cylindrée (L)<input type="number" min="0" step=".1" value={form.engine} onChange={e=>update('engine',Number(e.target.value))}/></label><label className="field">Carburant<select value={form.fuel} onChange={e=>update('fuel',e.target.value)}>{['Diesel','Essence','Hybride','Électrique','Autre'].map(f=><option key={f}>{f}</option>)}</select></label></div>
            <div className="grid two"><label className="field">État<select defaultValue="used"><option value="used">Occasion</option><option value="new">Neuf</option></select></label><label className="field">Places (chauffeur inclus)<select value={form.seats} onChange={e=>update('seats',Number(e.target.value))}>{[5,7,9,11,12,16,22].map(n=><option key={n} value={n}>{n===22?'22+':n}</option>)}</select></label></div>
            <div className="hs-box"><small>CODE SH CANDIDAT · À CONFIRMER</small><strong>{hs}</strong><p>{hs==='À déterminer'?'La position tarifaire dépend notamment de la motorisation, de la cylindrée, des places et de la conception du véhicule.':'Position candidate basée sur les caractéristiques saisies ; la sous-position nationale doit être vérifiée.'}</p><a href="https://etariff.douanes.gov.mg/tariff-search" target="_blank" rel="noreferrer">Vérifier sur eTariff ↗</a></div>
          </section>
          <section className="panel"><div className="panel-title"><span>02</span><div><h2>Prix d’achat et transport</h2><p>Prix CFR (fret inclus) ou prix FOB + fret séparé.</p></div></div>
            <div className="segmented"><button className={form.mode==='CFR'?'active':''} onClick={()=>update('mode','CFR')}>Prix CFR <small>Fret inclus</small></button><button className={form.mode==='FOB'?'active':''} onClick={()=>update('mode','FOB')}>Prix FOB <small>Fret séparé</small></button></div>
            {form.mode==='CFR'?<Field label="Prix CFR (USD)" value={form.cfr} onChange={num('cfr')} step={.01} suffix="USD"/>:<div className="grid two"><Field label="Prix FOB (USD)" value={form.fob} onChange={num('fob')} step={.01} suffix="USD"/><Field label="Fret maritime (USD)" value={form.freight} onChange={num('freight')} step={.01} suffix="USD"/></div>}
            <Field label="Assurance maritime (USD)" value={form.insurance} onChange={num('insurance')} step={.01} suffix="USD"/>
          </section>
          <section className="panel"><div className="panel-title"><span>03</span><div><h2>Change et fiscalité</h2><p>Les taux restent modifiables et doivent être validés.</p></div></div>
            <div className="rate-panel"><div className="rate-header"><label htmlFor="fx">Taux USD → MGA</label><b>{form.rate.toLocaleString('fr-FR')} MGA</b></div><div className="rate-row"><input id="fx" type="number" min=".01" step=".01" value={form.rate} onChange={e=>update('rate',Number(e.target.value))}/><button className="button outline" onClick={refreshRate} disabled={rateBusy}>{rateBusy?'Actualisation…':'Actualiser le taux'}</button></div><p className="muted">{rateNote}</p></div>
            <div className="grid two"><Field label="Droits de douane (%)" value={form.duty} onChange={num('duty')} step={.1} suffix="%"/><Field label="TVA (%)" value={form.vat} onChange={num('vat')} step={.1} suffix="%"/></div>
            <label className="field">Prélèvement complémentaire<select value={form.levy} onChange={e=>update('levy',e.target.value as Levy)}><option value="iri">Hypothèse IRI 5 %</option><option value="ars">Hypothèse acompte ARS 2 %</option><option value="none">Ne pas inclure</option></select></label>
            <div className="grid two"><Field label="Autres frais (USD)" value={form.fees} onChange={num('fees')} step={.01} suffix="USD"/><Field label="Bénéfice visé (%)" value={form.profit} onChange={num('profit')} step={.5} suffix="%"/></div>
            <button className="text-button" onClick={()=>setManualTaxes(!manualTaxes)}>{manualTaxes?'Masquer les détails fiscaux −':'Comment sont calculés les impôts ? +'}</button>{manualTaxes&&<p className="muted">Les droits sont estimés sur la valeur CAF. La TVA indicative est calculée sur CAF + droits. Les frais supplémentaires sont saisis séparément en USD. Ces bases simplifiées doivent être confirmées par un transitaire ou les Douanes.</p>}
          </section>
        </div>
        <aside className="results"><section className="panel results-panel"><div className="results-heading"><div><p className="eyebrow">VOTRE ESTIMATION</p><h2>Vue financière</h2></div><div className="currency"><button className={currency==='MGA'?'active':''} onClick={()=>setCurrency('MGA')}>MGA</button><button className={currency==='USD'?'active':''} onClick={()=>setCurrency('USD')}>USD</button></div></div>
            <div className="total-block"><span>Coût de revient estimé</span><strong>{display(calc.total)}</strong><small>Taxes et frais selon les hypothèses</small></div>
            <div className="profit-row"><div><small>Bénéfice estimé</small><strong>{display(calc.profit)}</strong></div><span className="margin">{pct(calc.margin)}<small>Marge sur vente</small></span></div>
            <div className="sale-block"><small>PRIX DE VENTE CIBLE</small><strong>{display(calc.sale)}</strong></div>
            <h3>Détail du calcul</h3><div className="breakdown">
              {[
                ['Prix véhicule + fret',calc.goods*Math.max(0,form.rate),money(calc.goods,'USD')],
                ['Assurance maritime',form.insurance*Math.max(0,form.rate),money(form.insurance,'USD')],
                ['Valeur CAF estimée',calc.cif,money(calc.cifUsd,'USD')],
                ['Droits de douane',calc.duty,pct(form.duty)],
                ['TVA estimée',calc.vat,pct(form.vat)],
                ['Prélèvement',calc.levy,form.levy==='iri'?'Hypothèse 5 %':form.levy==='ars'?'Hypothèse 2 %':'Non inclus'],
                ['Autres frais',calc.fees,money(form.fees,'USD')],
                ['Coût de revient',calc.total,'Total indicatif'],
                ['Bénéfice estimé',calc.profit,pct(form.profit)],
                ['Prix de vente cible',calc.sale,'Marge '+pct(calc.margin)]
              ].map(([label,value,detail],i)=><div className={'row '+(i===7?'total-row':i===9?'sale-row':'')} key={String(label)}><div><b>{label}</b><small>{detail}</small></div><strong>{display(Number(value))}</strong></div>)}
            </div>
            <div className="actions"><button className="button primary" onClick={copy}>Copier le récapitulatif</button><button className="button outline" onClick={()=>window.print()}>Imprimer / PDF</button><button className="button quiet" onClick={reset}>Réinitialiser</button></div>
            <p className="footnote">Taux utilisé : {form.rate.toLocaleString('fr-FR')} MGA/USD. Cours de marché à confirmer avant toute décision.</p>
          </section><div className="offline-card"><b>Vos calculs restent sur cet appareil</b><p>Les valeurs sont sauvegardées localement. La mise à jour du taux nécessite une connexion.</p></div></aside>
      </div>
      <footer><b>IMPORT AUTO MG</b><span>Outil d’aide à la décision · Hypothèses douanières à vérifier.</span></footer>
    </main>
  </div>;
}
