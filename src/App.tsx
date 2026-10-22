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
  const taxTotal=calc.duty+calc.vat+calc.levy;
  return <div className="app-shell">
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#top" aria-label="Import Auto MG accueil">
          <span className="brand-mark" aria-hidden="true">IA</span>
          <span className="brand-copy"><strong>Import Auto MG</strong><small>Calculateur d’importation</small></span>
        </a>
        <div className={'status '+(online?'online':'offline')} role="status">
          <span className="status-dot" aria-hidden="true" />{online?'En ligne':'Mode hors ligne'}
        </div>
      </div>
    </header>
    <main className="page" id="top">
      <section className="hero">
        <div>
          <p className="eyebrow">CALCULATEUR D’IMPORTATION</p>
          <h1>Estimez votre importation<span>.</span></h1>
          <p className="hero-copy">Centralisez vos coûts, simulez votre marge et prenez une décision éclairée avant l’achat. Vos calculs restent disponibles hors ligne.</p>
          <div className="tags"><span>Calcul instantané</span><span>Données sauvegardées localement</span><span>Utilisable hors ligne</span></div>
        </div>
      </section>
      <section className="financial-summary" aria-labelledby="summary-title">
        <div className="summary-head">
          <div>
            <p className="summary-eyebrow">APERÇU FINANCIER</p>
            <h2 id="summary-title">Votre estimation actuelle</h2>
            <p className="summary-caption">Les montants évoluent avec chaque paramètre saisi.</p>
          </div>
          <div className="summary-controls">
            <div className="currency-toggle" aria-label="Devise d’affichage">
              <button type="button" className={currency==='MGA'?'active':''} aria-pressed={currency==='MGA'} onClick={()=>setCurrency('MGA')}>MGA</button>
              <button type="button" className={currency==='USD'?'active':''} aria-pressed={currency==='USD'} onClick={()=>setCurrency('USD')}>USD</button>
            </div>
            <button type="button" className="summary-copy" onClick={copy}>Copier le récapitulatif</button>
          </div>
        </div>
        <div className="summary-grid">
          <article className="summary-metric">
            <div className="metric-top"><span>Coût total</span><span className="metric-mark" aria-hidden="true">01</span></div>
            <strong>{display(calc.total)}</strong><small>Achat, import et taxes</small>
          </article>
          <article className="summary-metric">
            <div className="metric-top"><span>Taxes &amp; douane</span><span className="metric-mark" aria-hidden="true">02</span></div>
            <strong>{display(taxTotal)}</strong><small>Droits et prélèvements estimés</small>
          </article>
          <article className="summary-metric">
            <div className="metric-top"><span>Bénéfice estimé</span><span className="metric-mark" aria-hidden="true">03</span></div>
            <strong>{display(calc.profit)}</strong><small>Marge cible de {pct(calc.margin)}</small>
          </article>
          <article className="summary-metric is-highlight">
            <div className="metric-top"><span>Prix de vente cible</span><span className="metric-mark" aria-hidden="true">04</span></div>
            <strong>{display(calc.sale)}</strong><small>Objectif de rentabilité</small>
          </article>
        </div>
      </section>
      <div className="notice">
        <span className="notice-icon" aria-hidden="true">!</span>
        <div><strong>Estimation indicative — pas une liquidation douanière.</strong><p>Le code SH, la base taxable et les taux doivent être vérifiés auprès des Douanes de Madagascar. Le taux de marché USD/MGA ne remplace pas le taux officiel douanier.</p></div>
      </div>
      <div className="layout">
        <div className="forms">
          <section className="panel">
            <div className="panel-title"><span className="step-mark">01</span><div><h2>Profil du véhicule</h2><p>Caractéristiques pour proposer un code tarifaire candidat.</p></div></div>
            <div className="grid two">
              <label className="field">Marque<input value={form.make} onChange={e=>update('make',e.target.value)} placeholder="Ex. Toyota" /></label>
              <label className="field">Modèle<input value={form.model} onChange={e=>update('model',e.target.value)} placeholder="Ex. Hilux" /></label>
            </div>
            <div className="grid three">
              <label className="field">Année<input type="number" min="1950" max="2035" value={form.year} onChange={e=>update('year',Number(e.target.value))} /></label>
              <label className="field">Cylindrée (L)<input type="number" min="0" step=".1" value={form.engine} onChange={e=>update('engine',Number(e.target.value))} /></label>
              <label className="field">Carburant<select value={form.fuel} onChange={e=>update('fuel',e.target.value)}>{['Diesel','Essence','Hybride','Électrique','Autre'].map(f=><option key={f}>{f}</option>)}</select></label>
            </div>
            <div className="grid two">
              <label className="field">État<select defaultValue="used"><option value="used">Occasion</option><option value="new">Neuf</option></select></label>
              <label className="field">Places (chauffeur inclus)<select value={form.seats} onChange={e=>update('seats',Number(e.target.value))}>{[5,7,9,11,12,16,22].map(n=><option key={n} value={n}>{n===22?'22+':n}</option>)}</select></label>
            </div>
            <div className="hs-box">
              <div className="hs-top"><span>CODE SH CANDIDAT</span><b>À CONFIRMER</b></div>
              <strong className="hs-code">{hs}</strong>
              <p>{hs==='À déterminer'?'La position tarifaire dépend notamment de la motorisation, de la cylindrée, des places et de la conception du véhicule.':'Position candidate basée sur les caractéristiques saisies ; la sous-position nationale doit être vérifiée.'}</p>
              <a href="https://etariff.douanes.gov.mg/tariff-search" target="_blank" rel="noreferrer">Vérifier sur eTariff ↗</a>
            </div>
          </section>
          <section className="panel">
            <div className="panel-title"><span className="step-mark">02</span><div><h2>Prix d’achat et transport</h2><p>Prix CFR (fret inclus) ou prix FOB + fret séparé.</p></div></div>
            <div className="segmented">
              <button type="button" className={form.mode==='CFR'?'selected':''} aria-pressed={form.mode==='CFR'} onClick={()=>update('mode','CFR')}>Prix CFR<small>Fret inclus</small></button>
              <button type="button" className={form.mode==='FOB'?'selected':''} aria-pressed={form.mode==='FOB'} onClick={()=>update('mode','FOB')}>Prix FOB<small>Fret séparé</small></button>
            </div>
            {form.mode==='CFR'
              ? <Field label="Prix CFR (USD)" value={form.cfr} onChange={num('cfr')} step={.01} suffix="USD"/>
              : <div className="grid two"><Field label="Prix FOB (USD)" value={form.fob} onChange={num('fob')} step={.01} suffix="USD"/><Field label="Fret maritime (USD)" value={form.freight} onChange={num('freight')} step={.01} suffix="USD"/></div>}
            <Field label="Assurance maritime (USD)" value={form.insurance} onChange={num('insurance')} step={.01} suffix="USD"/>
          </section>
          <section className="panel">
            <div className="panel-title"><span className="step-mark gold">03</span><div><h2>Change et fiscalité</h2><p>Les taux restent modifiables et doivent être validés.</p></div></div>
            <div className="rate-panel">
              <div className="rate-header"><label htmlFor="fx">Taux USD → MGA</label><span className="rate-current">{form.rate.toLocaleString('fr-FR')} MGA</span></div>
              <div className="rate-row"><input id="fx" aria-label="Taux USD vers MGA" type="number" min=".01" step=".01" value={form.rate} onChange={e=>update('rate',Number(e.target.value))}/><button type="button" className="button outline" onClick={refreshRate} disabled={rateBusy}>{rateBusy?'Actualisation…':'Actualiser le taux'}</button></div>
              <p className="muted">{rateNote}</p>
            </div>
            <div className="grid two"><Field label="Droits de douane (%)" value={form.duty} onChange={num('duty')} step={.1} suffix="%"/><Field label="TVA (%)" value={form.vat} onChange={num('vat')} step={.1} suffix="%"/></div>
            <label className="field">Prélèvement complémentaire<select value={form.levy} onChange={e=>update('levy',e.target.value as Levy)}><option value="iri">Hypothèse IRI 5 %</option><option value="ars">Hypothèse acompte ARS 2 %</option><option value="none">Ne pas inclure</option></select></label>
            <div className="grid two"><Field label="Autres frais (USD)" value={form.fees} onChange={num('fees')} step={.01} suffix="USD"/><Field label="Bénéfice visé (%)" value={form.profit} onChange={num('profit')} step={.5} suffix="%"/></div>
            <button type="button" className="text-button" aria-expanded={manualTaxes} onClick={()=>setManualTaxes(!manualTaxes)}>{manualTaxes?'Masquer les détails fiscaux −':'Comment sont calculés les impôts ? +'}</button>
            {manualTaxes&&<p className="muted tax-help">Les droits sont estimés sur la valeur CAF. La TVA indicative est calculée sur CAF + droits. Les frais supplémentaires sont saisis séparément en USD. Ces bases simplifiées doivent être confirmées par un transitaire ou les Douanes.</p>}
          </section>
        </div>
        <aside className="results">
          <section className="panel results-panel">
            <div className="results-heading"><div><p className="eyebrow">DÉCOMPOSITION</p><h2>Détail du calcul</h2></div><span className="result-badge">Estimation</span></div>
            <div className="breakdown">
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
              ].map(([label,value,detail],i)=><div className={'breakdown-row '+(i===7?'total-row':i===9?'sale-row':'')} key={String(label)}><div className="row-number">{i===7?'Σ':i===9?'↗':String(i+1).padStart(2,'0')}</div><div className="row-copy"><b>{label}</b><small>{detail}</small></div><strong>{display(Number(value))}</strong></div>)}
            </div>
            <div className="actions"><button type="button" className="button primary" onClick={copy}>Copier le récapitulatif</button><button type="button" className="button outline" onClick={()=>window.print()}>Imprimer / PDF</button><button type="button" className="button quiet" onClick={reset}>Réinitialiser</button></div>
            <p className="footnote">Taux utilisé : {form.rate.toLocaleString('fr-FR')} MGA/USD. Cours de marché indicatif, à confirmer avant toute décision.</p>
          </section>
          <div className="offline-card"><span className="offline-icon" aria-hidden="true">↯</span><div><strong>Vos calculs restent sur cet appareil</strong><p>Les valeurs sont sauvegardées localement. La mise à jour du taux nécessite une connexion.</p></div></div>
        </aside>
      </div>
      <footer><strong>IMPORT AUTO MG</strong><span>Outil d’aide à la décision · Hypothèses douanières à vérifier.</span></footer>
    </main>
  </div>;
}
