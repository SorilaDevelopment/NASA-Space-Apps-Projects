// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
//
// Labour: the farmer's own staff and wages (stored as s.labour), turned into hourly rates.
// s.labour = { staff: [{ role, count, pay, per: 'hour'|'month'|'year', hours }], seasonal: perHour, onCost: % }

import { incomeBand } from './data.js';

// Typical all-in farm labour cost per hour in USD by income band (used until the farmer enters their own).
export const LABOUR_USD = { high: 20, mid: 6, low: 2 };
// Hours a full-time worker is paid for in a year (≈ 40 h × 46 working weeks).
export const FULL_TIME_HOURS = 1840;
// Employer extras on top of wages (national insurance / social security, pension, holiday pay), %.
export const ON_COST_DEFAULT = { high: 20, mid: 15, low: 5 };
// The labour already baked into crops.otherUSD, removed so it isn't counted twice.
export const IMPLICIT_USD_PER_H = 15;

export const ROLES = ['Farm manager', 'Tractor driver', 'General farm worker', 'Picker / packer', 'Mill / press operator', 'Family member (unpaid)'];

export const annualPay = w => (Number(w.pay) || 0) * (w.per === 'hour' ? (Number(w.hours) || 0) : w.per === 'month' ? 12 : 1);

/** Hourly rates and wage bill from the farmer's staff list (or national defaults). */
export function labourFor(s, cc, fx = 1) {
  const band = incomeBand(cc);
  const L = s?.labour || {};
  const defaultRate = LABOUR_USD[band] * fx;
  const onCost = L.onCost ?? ON_COST_DEFAULT[band];
  const staff = (L.staff || []).filter(w => (Number(w.count) || 0) > 0);
  let wageBill = 0, staffHours = 0;
  for (const w of staff) {
    const n = Number(w.count) || 0;
    wageBill += annualPay(w) * n * (1 + onCost / 100);
    staffHours += (Number(w.hours) || FULL_TIME_HOURS) * n;
  }
  const staffRate = staffHours > 0 ? wageBill / staffHours : null;
  const seasonalRate = L.seasonal != null ? Number(L.seasonal) : defaultRate; // defaults are already all-in
  return {
    custom: !!(staff.length || L.seasonal != null),
    staff, onCost, wageBill, staffHours, staffRate, seasonalRate, defaultRate,
    /** best single hourly rate to quote (staff average if any staff, else seasonal) */
    rate: staffRate ?? seasonalRate,
    /** cost of `needH` hours of work during a `days`-long season: staff hours first, then seasonal help */
    split(needH, days = 365) {
      const avail = staffRate ? staffHours * Math.min(1, days / 365) : 0;
      const staffH = Math.min(needH, avail), seasonalH = Math.max(0, needH - staffH);
      return { staffH, seasonalH, cost: staffH * (staffRate || 0) + seasonalH * seasonalRate };
    },
  };
}
