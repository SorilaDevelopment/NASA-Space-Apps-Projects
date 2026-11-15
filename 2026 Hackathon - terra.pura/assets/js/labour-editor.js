// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
//
// "Staff & wages" editor: a dialog where farmers list who works on the farm and what they're paid.
// Saved to s.labour; every cost on the site then uses these rates.
import { store } from './ui.js';
import { money, incomeBand } from './data.js';
import { labourFor, ROLES, FULL_TIME_HOURS, ON_COST_DEFAULT, annualPay } from './labour.js';

const CSS = `
dialog.lab{width:min(760px,calc(100vw - 32px));max-height:calc(100vh - 40px);padding:0;border:1px solid var(--line);border-radius:var(--r);background:var(--bg);color:var(--ink);overflow:auto}
dialog.lab::backdrop{background:rgba(0,0,0,.6);backdrop-filter:blur(3px)}
dialog.lab[open]{animation:labin .35s var(--ease) both}
@keyframes labin{from{opacity:0;transform:translateY(14px) scale(.98)}}
.lab .in{padding:26px 28px}
.lab h2{margin:0 0 4px;font:400 24px/1.25 var(--display)}
.lab .sub{margin:0 0 18px;font-size:13px;color:var(--ink-mute);line-height:1.5}
.lab table{width:100%;border-collapse:collapse;font-size:13px}
.lab th{font-weight:400;text-align:left;color:var(--ink-mute);font-size:11px;padding:0 6px 6px}
.lab td{padding:4px 6px;border-top:1px solid var(--line-soft);vertical-align:middle}
.lab input,.lab select{height:32px;width:100%;box-sizing:border-box;border:1px solid var(--line-soft);border-radius:6px;background:var(--bg-2);color:var(--ink);padding:0 8px;font:inherit;font-size:13px}
.lab td.n input{text-align:right}
.lab td.cost{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--ink-dim)}
.lab .x{border:0;background:none;color:var(--ink-mute);cursor:pointer;font-size:18px;line-height:1;padding:4px}
.lab .x:hover{color:var(--cost)}
.lab .add{margin:10px 0 18px;border:1px dashed var(--line-soft);background:none;border-radius:6px;height:34px;padding:0 14px;font-size:13px;cursor:pointer;color:var(--ink-dim)}
.lab .add:hover{border-color:var(--ink);color:var(--ink)}
.lab .two{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;margin-bottom:16px}
.lab label.f{display:grid;gap:5px;font-size:12px;color:var(--ink-dim)}
.lab .sum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:14px 0;border-top:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft);margin-bottom:14px}
.lab .sum div{font-size:11px;color:var(--ink-mute)}
.lab .sum b{display:block;font:400 20px/1.25 var(--display);color:var(--ink);font-variant-numeric:tabular-nums}
.lab .note{font-size:12px;color:var(--ink-mute);line-height:1.55;margin:0 0 16px}
.lab .acts{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
.lab .acts .btn{height:44px;min-width:0;font-size:14px}
@media (max-width:620px){.lab .in{padding:20px 16px}.lab .two,.lab .sum{grid-template-columns:1fr}.lab thead{display:none}
  .lab tr{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:8px 0;border-top:1px solid var(--line-soft)}.lab td{border:0;padding:2px}.lab td.role{grid-column:1/-1}}
`;

export function openLabourEditor({ onSave } = {}) {
  if (!document.getElementById('labCss')) { const st = document.createElement('style'); st.id = 'labCss'; st.textContent = CSS; document.head.append(st); }
  const s = store.get(), cur = s.region?.currency || 'USD', cc = s.region?.cc || '', fx = s.fx?.rates?.[cur] || 1;
  const fmt = (v, dp = 0) => money(v, cur, dp);
  const base = labourFor(s, cc, fx);
  const draft = {
    staff: (s.labour?.staff || []).map(w => ({ ...w })),
    seasonal: s.labour?.seasonal ?? +base.defaultRate.toFixed(2),
    onCost: s.labour?.onCost ?? ON_COST_DEFAULT[incomeBand(cc)],
  };
  const dlg = document.createElement('dialog');
  dlg.className = 'lab';
  dlg.setAttribute('aria-labelledby', 'labTitle');
  document.body.append(dlg);

  const rowHTML = (w, i) => `<tr data-i="${i}">
    <td class="role"><input list="labRoles" data-k="role" value="${(w.role || '').replace(/"/g, '&quot;')}" placeholder="Role" aria-label="Role"></td>
    <td class="n" style="width:62px"><input type="number" min="0" step="1" data-k="count" value="${w.count ?? 1}" aria-label="How many"></td>
    <td class="n" style="width:110px"><input type="number" min="0" step="0.01" data-k="pay" value="${w.pay ?? ''}" aria-label="Pay"></td>
    <td style="width:118px"><select data-k="per" aria-label="Pay period"><option value="hour"${w.per === 'hour' ? ' selected' : ''}>per hour</option><option value="month"${w.per === 'month' ? ' selected' : ''}>per month</option><option value="year"${w.per === 'year' ? ' selected' : ''}>per year</option></select></td>
    <td class="n" style="width:84px"><input type="number" min="0" step="10" data-k="hours" value="${w.hours ?? FULL_TIME_HOURS}" aria-label="Hours a year each"></td>
    <td class="cost" data-cost></td>
    <td style="width:26px"><button class="x" data-del aria-label="Remove">×</button></td></tr>`;

  function render() {
    dlg.innerHTML = `<div class="in">
      <h2 id="labTitle">Staff &amp; wages</h2>
      <p class="sub">List who works on the farm and what you pay them. Every labour cost on terra.pura (crop costs, the cost report and the refinery calculator) then uses your rates instead of the national average of ${fmt(base.defaultRate, 2)}/h.</p>
      <datalist id="labRoles">${ROLES.map(r => `<option value="${r}">`).join('')}</datalist>
      <table><thead><tr><th>Role</th><th>How many</th><th>Pay (${cur})</th><th>Per</th><th>Hours / year each</th><th style="text-align:right">Cost / year</th><th></th></tr></thead>
        <tbody id="labRows">${draft.staff.map(rowHTML).join('')}</tbody></table>
      <button class="add" id="labAdd">+ Add a worker</button>
      <div class="two">
        <label class="f">Seasonal / casual help, all-in cost per hour (${cur})<input type="number" min="0" step="0.1" id="labSeasonal" value="${draft.seasonal}"></label>
        <label class="f">Employer on-costs on top of wages (%)<input type="number" min="0" max="100" step="1" id="labOn" value="${draft.onCost}"></label>
      </div>
      <div class="sum" id="labSum"></div>
      <p class="note">How it's used: each crop needs a typical number of work hours per hectare (e.g. ~7 h for wheat, ~380 h for lettuce). Those hours are charged at your staff's average hourly cost (pay × on-costs ÷ hours) up to the hours your staff work in that season; anything beyond is charged at the seasonal rate. Unpaid family time can be entered with pay 0. On-costs cover national insurance or social security, pension and holiday pay.</p>
      <div class="acts"><button class="btn ghost" id="labReset">Use national averages</button><button class="btn ghost" id="labCancel">Cancel</button><button class="btn" id="labSave">Save</button></div>
    </div>`;
    wire(); summary();
  }
  function summary() {
    const L = labourFor({ labour: draft }, cc, fx);
    dlg.querySelectorAll('#labRows tr').forEach(tr => {
      const w = draft.staff[+tr.dataset.i];
      tr.querySelector('[data-cost]').textContent = fmt(annualPay(w) * (Number(w.count) || 0) * (1 + draft.onCost / 100));
    });
    dlg.querySelector('#labSum').innerHTML = `
      <div><b>${fmt(L.wageBill)}</b>yearly wage bill incl. on-costs</div>
      <div><b>${Math.round(L.staffHours).toLocaleString()} h</b>staff hours a year</div>
      <div><b>${L.staffRate != null ? fmt(L.staffRate, 2) + '/h' : '—'}</b>average staff cost per hour</div>`;
  }
  function wire() {
    dlg.querySelector('#labRows').oninput = ev => {
      const el = ev.target, tr = el.closest('tr'); if (!tr || !el.dataset.k) return;
      const w = draft.staff[+tr.dataset.i];
      w[el.dataset.k] = el.dataset.k === 'role' || el.dataset.k === 'per' ? el.value : Number(el.value);
      if (el.dataset.k === 'per' && el.value !== 'hour' && !w.hours) w.hours = FULL_TIME_HOURS;
      summary();
    };
    dlg.querySelector('#labRows').onchange = dlg.querySelector('#labRows').oninput;
    dlg.querySelector('#labRows').onclick = ev => { const b = ev.target.closest('[data-del]'); if (!b) return; draft.staff.splice(+b.closest('tr').dataset.i, 1); render(); };
    dlg.querySelector('#labAdd').onclick = () => { draft.staff.push({ role: draft.staff.length ? 'General farm worker' : 'Farm manager', count: 1, pay: '', per: 'year', hours: FULL_TIME_HOURS }); render(); dlg.querySelector('#labRows tr:last-child [data-k=pay]')?.focus(); };
    dlg.querySelector('#labSeasonal').oninput = ev => { draft.seasonal = Math.max(0, Number(ev.target.value)); summary(); };
    dlg.querySelector('#labOn').oninput = ev => { draft.onCost = Math.max(0, Number(ev.target.value)); summary(); };
    dlg.querySelector('#labCancel').onclick = () => dlg.close();
    dlg.querySelector('#labReset').onclick = () => { store.set({ labour: null }); dlg.close(); onSave?.(); };
    dlg.querySelector('#labSave').onclick = () => {
      const staff = draft.staff.filter(w => (Number(w.count) || 0) > 0).map(w => ({ role: w.role || 'Worker', count: Number(w.count), pay: Number(w.pay) || 0, per: w.per || 'year', hours: Number(w.hours) || FULL_TIME_HOURS }));
      store.set({ labour: { staff, seasonal: draft.seasonal, onCost: draft.onCost } });
      dlg.close(); onSave?.();
    };
  }
  dlg.addEventListener('close', () => dlg.remove());
  render();
  dlg.showModal();
}
