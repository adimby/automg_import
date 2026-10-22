export interface ExchangeRateQuote { rate:number; source:string; fetchedAt:string }
export async function fetchUsdMgaRate(fetchImpl:typeof fetch=fetch):Promise<ExchangeRateQuote>{
 const response=await fetchImpl('https://open.er-api.com/v6/latest/USD',{cache:'no-store'});
 if(!response.ok)throw new Error('Le service de change est indisponible.');
 const data=await response.json() as {rates?:{MGA?:number}};const rate=Number(data?.rates?.MGA);
 if(!Number.isFinite(rate)||rate<=0)throw new Error('Le taux MGA reçu est invalide.');
 return{rate,source:'open.er-api.com · cours de marché',fetchedAt:new Date().toISOString()};
}
