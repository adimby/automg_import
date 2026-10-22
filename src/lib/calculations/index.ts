import type { AppState, CalculationResult, HsCandidate } from '../../types';
const safe=(n:number)=>Number.isFinite(n)&&n>=0?n:0;
export function getCandidateHsCode(vehicle:AppState['vehicle']):HsCandidate{
  if(vehicle.useCustomHsCode&&vehicle.customHsCode.trim())return{code:vehicle.customHsCode.replace(/\s/g,''),description:'Code saisi manuellement. Désignation et taux à vérifier dans eTariff.',dutyRatePct:null,vatRatePct:null};
  const engine=safe(Number(vehicle.engineCapacity||0));
  if(vehicle.fuel==='Diesel'&&vehicle.seats<=9&&engine>1.5&&engine<=2.5)return{code:'87033292',dutyRatePct:20,vatRatePct:20,description:'Véhicule diesel pour personnes, ≤ 9 places, cylindrée > 1 500 cm³ et ≤ 2 500 cm³. Code candidat à confirmer.'};
  if(vehicle.fuel==='Diesel'&&vehicle.seats>=10&&vehicle.seats<=11)return{code:'87021012',dutyRatePct:20,vatRatePct:20,description:'Candidat diesel pour 10 à 11 personnes, chauffeur inclus. Sous-position nationale à vérifier.'};
  if(vehicle.fuel==='Diesel'&&vehicle.seats>=12&&vehicle.seats<=40)return{code:'87021022',dutyRatePct:10,vatRatePct:20,description:'Candidat diesel pour 12 à 40 personnes, chauffeur inclus. Sous-position nationale à vérifier.'};
  return{code:'À déterminer',dutyRatePct:null,vatRatePct:null,description:'La position tarifaire dépend de la motorisation, de la cylindrée, des places et de la conception homologuée. Vérification manuelle nécessaire.'};
}
export function calculate(state:AppState):CalculationResult{
 const fx=Number.isFinite(state.exchangeRate)&&state.exchangeRate>0?state.exchangeRate:0;
 const goods=state.purchaseMode==='CFR'?safe(state.cfr):safe(state.fob)+safe(state.freight);
 const insurance=safe(state.insurance);const cifUsd=goods+insurance;const cifMga=cifUsd*fx;
 const dutyMga=cifMga*safe(state.dutyRatePct)/100;const vatMga=(cifMga+dutyMga)*safe(state.vatRatePct)/100;
 const levyMga=cifMga*(state.levyType==='iri'?5:state.levyType==='ars'?2:0)/100;const feesMga=safe(state.fees)*fx;
 const totalTaxMga=dutyMga+vatMga+levyMga;const totalCostMga=cifMga+totalTaxMga+feesMga;
 const profitMga=state.profitMode==='percentage'?totalCostMga*safe(state.profitPct)/100:safe(state.fixedProfitUsd)*fx;
 const salePriceMga=totalCostMga+profitMga;
 const values={goodsAndFreightUsd:goods,insuranceUsd:insurance,cifUsd,cifMga,dutyMga,vatMga,levyMga,feesMga,totalTaxMga,totalCostMga,profitMga,salePriceMga,marginPct:salePriceMga>0?profitMga/salePriceMga*100:0};
 return Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Number.isFinite(v)?v:0])) as unknown as CalculationResult;
}
export function formatMoney(value:number,currency:'MGA'|'USD'='MGA'):string{return new Intl.NumberFormat('fr-FR',{style:'currency',currency,maximumFractionDigits:currency==='MGA'?0:2}).format(Number.isFinite(value)?value:0)}
