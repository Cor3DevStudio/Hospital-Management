import { strict as assert } from 'assert';
import { todayISO } from './store';
import { getCaseRateByCode } from './caseRateService';

// Small smoke tests for date-aware lookup logic.
function run() {
  // Construct a fake state with multiple revisions for a code
  const state: any = {
    caseRates: [
      { id: '1', code: 'X100', description: 'Old Rate', amount: 100, effectiveDate: '2025-01-01', category: 'Medical' },
      { id: '2', code: 'X100', description: 'New Rate', amount: 150, effectiveDate: '2026-06-01', category: 'Medical' },
    ],
  };

  // before new rate
  const r1 = getCaseRateByCode(state, 'X100', '2026-05-30');
  assert(r1 && r1.amount === 100, 'Expected old rate before new effective date');

  // on/after new rate
  const r2 = getCaseRateByCode(state, 'X100', '2026-06-01');
  assert(r2 && r2.amount === 150, 'Expected new rate on effective date');

  // no asOf provided => today
  const r3 = getCaseRateByCode(state, 'X100');
  // r3 may be new or old depending on todays date, just ensure it returns an object
  assert(r3 != null, 'Expected a rate for code');

  console.log('caseRateService tests passed');
}

if (require.main === module) run();

export {};
