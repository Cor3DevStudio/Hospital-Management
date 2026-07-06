import assert from "node:assert/strict";
import { allocatePhilhealthToSoaRows } from "./soaPhilhealthAllocation";

const allocation = allocatePhilhealthToSoaRows({
  hciRows: [
    { label: "Room", actual: 4000, vatExempt: 0, discountScPwd: 0, discountAgency: 0, phicFirst: 0, phicSecond: 0, outOfPocket: 4000 },
    { label: "Drugs", actual: 2000, vatExempt: 0, discountScPwd: 0, discountAgency: 0, phicFirst: 0, phicSecond: 0, outOfPocket: 2000 },
  ],
  professionalFeeRows: [
    { label: "Dr. A", actual: 3000, vatExempt: 0, discountScPwd: 0, discountAgency: 0, phicFirst: 0, phicSecond: 0, outOfPocket: 3000 },
  ],
  totalPhic: 5000,
  caseRate: {
    id: "1",
    code: "X",
    description: "Test",
    amount: 5000,
    category: "Medical",
    healthFacilityFee: 3500,
    professionalFeeAmount: 1500,
  },
});

assert.equal(allocation.hciBenefit, 3500);
assert.equal(allocation.pfBenefit, 1500);
assert.equal(allocation.totalBenefit, 5000);
assert.equal(allocation.hciRows.reduce((s, r) => s + r.phicFirst, 0), 3500);
assert.equal(allocation.hciRows[0]?.phicFirst, 3500);
assert.equal(allocation.hciRows[1]?.phicFirst, 0);

// M00.98 — Pyogenic Arthritis sample (HF + PF case-rate caps, excess at HCI subtotal)
const arthritis = allocatePhilhealthToSoaRows({
  hciRows: [
    { label: "Room and Board", actual: 1000, vatExempt: 0, discountScPwd: 0, discountAgency: 0, phicFirst: 0, phicSecond: 0, outOfPocket: 1000 },
    { label: "Pharmacy", actual: 11873, vatExempt: 0, discountScPwd: 0, discountAgency: 0, phicFirst: 0, phicSecond: 0, outOfPocket: 11873 },
    { label: "Supplies", actual: 10573.5, vatExempt: 0, discountScPwd: 0, discountAgency: 0, phicFirst: 0, phicSecond: 0, outOfPocket: 10573.5 },
    { label: "Laboratory", actual: 5000, vatExempt: 0, discountScPwd: 0, discountAgency: 0, phicFirst: 0, phicSecond: 0, outOfPocket: 5000 },
    { label: "Radiology", actual: 8750, vatExempt: 0, discountScPwd: 0, discountAgency: 0, phicFirst: 0, phicSecond: 0, outOfPocket: 8750 },
    { label: "Miscellaneous", actual: 1200, vatExempt: 0, discountScPwd: 0, discountAgency: 0, phicFirst: 0, phicSecond: 0, outOfPocket: 1200 },
    { label: "Operating Room fee", actual: 3500, vatExempt: 0, discountScPwd: 0, discountAgency: 0, phicFirst: 0, phicSecond: 0, outOfPocket: 3500 },
  ],
  professionalFeeRows: [
    { label: "Professional Fee", actual: 5674.5, vatExempt: 0, discountScPwd: 0, discountAgency: 0, phicFirst: 0, phicSecond: 0, outOfPocket: 5674.5 },
  ],
  totalPhic: 18915,
  caseRate: {
    id: "m0098",
    code: "M00.98",
    description: "PYOGENIC ARTHRITIS",
    amount: 18915,
    category: "Medical",
    healthFacilityFee: 13240.5,
    professionalFeeAmount: 5674.5,
  },
});
assert.equal(arthritis.hciBenefit, 13240.5);
assert.equal(arthritis.pfBenefit, 5674.5);
assert.equal(arthritis.totalBenefit, 18915);
assert.equal(arthritis.hciRows[0]?.phicFirst, 1000);
const hciActual = arthritis.hciRows.reduce((s, r) => s + r.actual, 0);
assert.equal(hciActual, 41896.5);
assert.equal(hciActual - arthritis.hciBenefit, 28656);
assert.equal(arthritis.pfRows[0]?.phicFirst, 5674.5);

console.log("soaPhilhealthAllocation.test.ts: all assertions passed");
