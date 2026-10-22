export type PurchaseMode = 'CFR' | 'FOB';
export type LevyType = 'iri' | 'ars' | 'none';
export type Currency = 'MGA' | 'USD';
export interface VehicleInput { make:string; model:string; year:number|''; engineCapacity:number|''; fuel:string; condition:'used'|'new'; seats:number; customHsCode:string; useCustomHsCode:boolean }
export interface AppState { vehicle:VehicleInput; purchaseMode:PurchaseMode; cfr:number; fob:number; freight:number; insurance:number; exchangeRate:number; exchangeRateSource:'manual'|'market'; exchangeRateDate:string|null; fees:number; dutyRatePct:number; vatRatePct:number; levyType:LevyType; levyRatePct:number; ratesVerified:boolean; profitMode:'percentage'|'fixed'; profitPct:number; fixedProfitUsd:number; currency:Currency }
export interface CalculationResult { goodsAndFreightUsd:number; insuranceUsd:number; cifUsd:number; cifMga:number; dutyMga:number; vatMga:number; levyMga:number; feesMga:number; totalTaxMga:number; totalCostMga:number; profitMga:number; salePriceMga:number; marginPct:number }
export interface HsCandidate { code:string; description:string; dutyRatePct:number|null; vatRatePct:number|null }
