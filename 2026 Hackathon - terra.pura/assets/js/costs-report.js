// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
//
// Turns one crop evaluation (model.js evaluate) into an itemised, explained cost report:
// every line says how it was calculated, which numbers are assumptions, and where to change them.
import { PUMP_KWH_PER_M3, RETURN_TO_SEWER } from './model.js';
import { IMPLICIT_USD_PER_H } from './labour.js';
import { storageById } from './farm.js';

const n0 = v => Math.abs(v) < 10 && v % 1 ? (Math.round(v * 10) / 10).toLocaleString() : Math.round(v).toLocaleString();
const n1 = v => (Math.round(v * 10) / 10).toLocaleString();

/** @returns [{ k, label, cost, qty, how: string[], assume: string[], edit: {href|action, text} }] */
export function costLines(e, I, fmt) {
  const d = e.detail, c = e.costs, crop = e.crop, L = I.labour;
  const ret = encodeURIComponent(location.pathname.split('/').pop() + location.search);
  const ob = k => ({ href: `onboarding.html?edit=${k}&return=${ret}`, text: 'Change' });
  const lines = [];

  lines.push({
    k: 'energy', label: 'Energy', cost: c.energy, qty: `${n0(d.billableKwh)} kWh billed`,
    how: [
      `Irrigation pumping: ${n0(e.waterM3)} m³ × ${PUMP_KWH_PER_M3} kWh/m³ = ${n0(d.pumpKwh)} kWh`,
      d.fleetKwh ? `Electric machinery: ${n0(d.fleetKwh)} kWh (your fleet's yearly use × ${Math.round(d.fleetShare * 100)}% of the year this crop is in the ground)` : null,
      d.storeKwh ? `Storage: ${n1(e.tonnes)} t × ${d.stMonths} months × ${I.storage.kwh} kWh per tonne-month = ${n0(d.storeKwh)} kWh` : null,
      d.ownKwh ? `Minus your own generation: ${n0(d.ownKwh)} kWh` : null,
      `${n0(d.billableKwh)} kWh × ${fmt(I.energy, 4)}/kWh = ${fmt(c.energy)}`,
    ].filter(Boolean),
    assume: [`Pumping uses ${PUMP_KWH_PER_M3} kWh per m³ (typical sprinkler/drip pump at moderate head)`, `Price from your energy provider (${I.s.energy?.name || 'not set'})`],
    edit: ob('energy'),
  });

  lines.push({
    k: 'water', label: 'Water', cost: c.water, qty: `${n0(d.billableWater)} m³ billed`,
    how: [
      crop.irrigated ? `Irrigation need from the simulation (rain and soil water first): ${n0(e.waterM3)} m³` : `${crop.name} is normally grown rain-fed, so no irrigation is charged`,
      d.ownWater ? `Minus your own water: ${n0(d.ownWater)} m³` : null,
      crop.irrigated ? `${n0(d.billableWater)} m³ × ${fmt(I.water, 2)}/m³ = ${fmt(c.water)}` : null,
    ].filter(Boolean),
    assume: ['Irrigation tops the root zone up to field capacity whenever the soil gets dry (FAO-56 water balance)', `Price from your water provider (${I.s.water?.name || 'not set'})`],
    edit: ob('water'),
  });

  lines.push({
    k: 'sewage', label: 'Sewage', cost: c.sewage, qty: `${n0(d.sewerM3)} m³`,
    how: [`${Math.round(RETURN_TO_SEWER * 100)}% of billed water returned to sewer: ${n0(d.sewerM3)} m³ × ${fmt(I.sewage, 2)}/m³ = ${fmt(c.sewage)}`],
    assume: [`Only ${Math.round(RETURN_TO_SEWER * 100)}% of field water is charged as sewage (most soaks into the ground; washing and yard water go to the sewer)`],
    edit: ob('sewage'),
  });

  lines.push({
    k: 'seeds', label: 'Seeds', cost: c.seeds, qty: `${n0(e.seedKg)} kg`,
    how: [`${n1(d.ha)} ha × ${crop.seed} kg/ha${I.seedsScale ? ` × (your ${I.seedsScale} seeds/m² ÷ usual ${crop.spacing})` : ''} = ${n0(e.seedKg)} kg`, `${n0(e.seedKg)} kg × ${fmt(e.seedPrice, 2)}/kg = ${fmt(c.seeds)}`],
    assume: [`Seed rate ${crop.seed} kg/ha and price US$${crop.seedUSD}/kg are typical certified-seed figures, converted to ${I.cur}`],
    edit: { href: 'dash.html#estimates', text: 'Edit seeds per m²' },
  });

  lines.push({
    k: 'fuel', label: 'Machinery fuel', cost: c.fuel, qty: e.fuelL ? `${n0(e.fuelL)} L` : 'no machinery',
    how: e.fuelL ? [`Your fleet's yearly diesel + petrol × ${Math.round(d.fleetShare * 100)}% of the year (${e.days} days) = ${n0(e.fuelL)} L`, `${n0(e.fuelL)} L × ${fmt(I.diesel, 2)}/L = ${fmt(c.fuel)}`] : ['You told us you have no fuel-burning machinery'],
    assume: ['Fuel per hour and hours per year per machine are typical working averages (ASABE D497, AHDB)', 'Machinery cost is split across crops by how long each is in the ground'],
    edit: ob('machinery'),
  });

  const st = storageById[I.storage.id] || storageById.none;
  lines.push({
    k: 'storage', label: 'Storage', cost: c.storage, qty: d.stMonths ? `${n1(e.tonnes)} t × ${d.stMonths} mo` : 'none',
    how: d.stMonths ? [`${n1(e.tonnes)} t × ${d.stMonths} months × ${fmt(I.storage.rate || 0, 2)} per tonne-month = ${fmt(c.storage)}`] : ['Sold straight from the field'],
    assume: [`${st.name}: ${st.note}`],
    edit: ob('storage'),
  });

  lines.push({
    k: 'other', label: 'Fertiliser, sprays & packing', cost: c.other, qty: `${n1(d.ha)} ha`,
    how: [
      `Typical ${crop.name.toLowerCase()} input cost: US$${n0(d.otherPerHaUSD)}/ha (US$${crop.otherUSD.toLocaleString()} all-in minus the labour part, ${crop.labourH} h × US$${IMPLICIT_USD_PER_H})`,
      `× ${n1(d.ha)} ha × ${d.workFactor.toFixed(2)} (scaled by the simulated harvest) × ${I.fx.toFixed(3)} ${I.cur}/USD = ${fmt(c.other)}`,
    ],
    assume: ['Per-hectare input costs are farm-business-survey ballparks for conventional growing, not your own invoices', 'A poor harvest still uses ~40% of the inputs'],
    edit: null,
  });

  const lab = d.lab;
  lines.push({
    k: 'labour', label: 'Labour', cost: c.labour, qty: `${n0(d.labourH)} h`,
    how: [
      `${crop.labourH} work hours per ha × ${n1(d.ha)} ha × ${d.workFactor.toFixed(2)} = ${n0(d.labourH)} h`,
      lab.staffH ? `${n0(lab.staffH)} h by your staff × ${fmt(L.staffRate, 2)}/h = ${fmt(lab.staffH * L.staffRate)}` : null,
      lab.seasonalH ? `${n0(lab.seasonalH)} h ${L.staffRate ? 'of seasonal help' : ''} × ${fmt(L.seasonalRate, 2)}/h = ${fmt(lab.seasonalH * L.seasonalRate)}` : null,
    ].filter(Boolean),
    assume: [
      L.custom ? `Your staff list: wage bill ${fmt(L.wageBill)}/year incl. ${L.onCost}% on-costs, ${n0(L.staffHours)} h/year` : `National average all-in farm labour cost (${fmt(L.defaultRate, 2)}/h), until you enter your own staff and wages`,
      `Hours per ha are typical for ${crop.name.toLowerCase()} with ${['grain', 'legume'].includes(crop.form) ? 'full mechanisation' : 'hand harvesting and grading'}`,
    ],
    edit: { action: 'labour', text: 'Edit staff & wages' },
  });
  return lines;
}

/** Itemised refinery (processing) report lines. r = market.js processing() result. */
export function processingLines(r, opts, fmt) {
  const P = r.P, flour = r.products.find(o => o.id === 'flour'), oil = r.products.find(o => o.id === 'oil');
  const t = r.tonnes; // tonnes of crop going in
  const bulkT = t - (flour?.t || 0) - (oil?.t || 0);
  return [
    { label: 'Crop you no longer sell raw', cost: r.rawValue, how: `${n1(t)} t × ${fmt(opts.rawPricePerT)}/t farm-gate price` },
    { label: 'Electricity', cost: r.energy, how: `${n1(t)} t × ${P.kwhPerT} kWh/t = ${n0(t * P.kwhPerT)} kWh × ${fmt(opts.energyPrice, 4)}/kWh` },
    { label: 'Labour', cost: r.labour, how: `${n1(t)} t × ${P.labourHPerT} h/t = ${n0(t * P.labourHPerT)} h × ${fmt(opts.labourPerH, 2)}/h` },
    { label: 'Packaging', cost: r.packing, how: opts.mode === 'premium'
      ? [flour ? `${n1(flour.t)} t flour in retail bags × US$${P.premiumPackUSDPerT}/t` : null, oil ? `${n1(oil.t)} t oil in bottles × US$${P.oilBottleUSDPerT}/t` : null, bulkT > 0.05 ? `${n1(bulkT)} t by-product in bulk bags × US$${P.packUSDPerT}/t` : null].filter(Boolean).join(' + ')
      : `${n1(t)} t in bulk bags × US$${P.packUSDPerT}/t` },
    { label: 'Maintenance & spares', cost: r.upkeep, how: `4% of the ${fmt(r.capex)} equipment cost a year` },
  ];
}
