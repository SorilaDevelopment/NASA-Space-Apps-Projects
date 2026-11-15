// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
// terra.pura — farm machinery fuel use & emissions, and post-harvest storage.
// Fuel rates are typical working averages (ASABE D497 / AHDB / extension guides).
// Emission factors: UK DEFRA/DESNZ 2024 GHG conversion factors (kg CO2e per litre, well-to-wheel excluded).
export const FUEL = {
  diesel: { label: 'gas oil / red diesel', co2: 2.76, unit: 'L' },
  petrol: { label: 'petrol', co2: 2.34, unit: 'L' },
  electric: { label: 'electricity', co2: null, unit: 'kWh' }, // grid intensity depends on country
};
export const MACHINES = [
  { id: 'tractor-s', name: 'Compact tractor', note: 'under 50 hp', fuel: 'diesel', rate: 4, hours: 300 },
  { id: 'tractor-m', name: 'Utility tractor', note: '50–120 hp', fuel: 'diesel', rate: 9, hours: 450 },
  { id: 'tractor-l', name: 'Large tractor', note: '120–250 hp', fuel: 'diesel', rate: 18, hours: 500 },
  { id: 'tractor-xl', name: 'Articulated / track tractor', note: 'over 250 hp', fuel: 'diesel', rate: 35, hours: 400 },
  { id: 'combine', name: 'Combine harvester', note: '', fuel: 'diesel', rate: 30, hours: 150 },
  { id: 'forager', name: 'Forage harvester', note: 'self-propelled', fuel: 'diesel', rate: 60, hours: 100 },
  { id: 'sprayer', name: 'Self-propelled sprayer', note: '', fuel: 'diesel', rate: 12, hours: 120 },
  { id: 'loader', name: 'Telehandler / loader', note: '', fuel: 'diesel', rate: 6, hours: 400 },
  { id: 'pump-d', name: 'Diesel irrigation pump', note: '', fuel: 'diesel', rate: 5, hours: 300 },
  { id: 'dryer', name: 'Grain dryer', note: 'oil-fired', fuel: 'diesel', rate: 25, hours: 120 },
  { id: 'pickup', name: 'Pickup / farm truck', note: '', fuel: 'diesel', rate: 3, hours: 300 },
  { id: 'atv', name: 'ATV / quad bike', note: '', fuel: 'petrol', rate: 1.5, hours: 250 },
  { id: 'pump-e', name: 'Electric irrigation pump', note: '', fuel: 'electric', rate: 7.5, hours: 300 },
  { id: 'tractor-e', name: 'Electric tractor / robot', note: '', fuel: 'electric', rate: 15, hours: 300 },
];
export const machineById = Object.fromEntries(MACHINES.map(m => [m.id, m]));

/** fleet: [{id, count, hours}] -> yearly litres by fuel, kWh, kg CO2e */
export function fleetYear(fleet = [], gridCo2 = 0.4) {
  let diesel = 0, petrol = 0, kwh = 0;
  for (const f of fleet) {
    const m = machineById[f.id]; if (!m || !f.count) continue;
    const use = m.rate * (f.hours ?? m.hours) * f.count;
    if (m.fuel === 'diesel') diesel += use; else if (m.fuel === 'petrol') petrol += use; else kwh += use;
  }
  const co2 = diesel * FUEL.diesel.co2 + petrol * FUEL.petrol.co2 + kwh * gridCo2;
  return { diesel, petrol, kwh, co2 };
}

// Post-harvest storage. Costs in USD per tonne per month (converted to local currency in the UI).
export const STORAGE = [
  { id: 'none', name: 'Sell straight from the field', note: 'No storage cost, but you sell at harvest-time prices.', usd: 0, kwh: 0 },
  { id: 'ambient', name: 'On-farm store', note: 'Barn, shed or silo. Ventilation and handling.', usd: 1.2, kwh: 1.5 },
  { id: 'cold', name: 'On-farm cold store', note: 'Refrigerated, for potatoes, carrots, onions, cabbage.', usd: 2.5, kwh: 10 },
  { id: 'rented', name: 'Rented / co-op store', note: 'Pay a merchant or co-operative per tonne.', usd: 4, kwh: 0 },
];
export const storageById = Object.fromEntries(STORAGE.map(s => [s.id, s]));
