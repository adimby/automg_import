import type { AppState } from '../types';
export const STORAGE_KEY='importAutoMgInputs';
export const defaultState:AppState={
 vehicle:{make:'',model:'',year:2018,engineCapacity:2,fuel:'Diesel',condition:'used',seats:7,customHsCode:'',useCustomHsCode:false},
 purchaseMode:'CFR',cfr:7566,fob:3833,freight:3733,insurance:100,exchangeRate:4483.5,exchangeRateSource:'manual',exchangeRateDate:null,fees:300,dutyRatePct:20,vatRatePct:20,levyType:'iri',levyRatePct:5,ratesVerified:false,profitMode:'percentage',profitPct:20,fixedProfitUsd:1500,currency:'MGA'
};
export function loadState(storage:Pick<Storage,'getItem'>=localStorage):AppState{
 try{const raw=storage.getItem(STORAGE_KEY);if(!raw)return structuredClone(defaultState);const saved=JSON.parse(raw) as Partial<AppState>;return{...structuredClone(defaultState),...saved,vehicle:{...defaultState.vehicle,...(saved.vehicle??{})}};}catch{return structuredClone(defaultState)}
}
export function saveState(state:AppState,storage:Pick<Storage,'setItem'>=localStorage):void{try{storage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{/* storage unavailable */}}
export function clearState(storage:Pick<Storage,'removeItem'>=localStorage):void{try{storage.removeItem(STORAGE_KEY);}catch{/* storage unavailable */}}
