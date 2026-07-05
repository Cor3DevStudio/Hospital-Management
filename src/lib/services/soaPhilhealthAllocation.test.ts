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
assert.equal(allocation.pfRows[0]?.phicFirst, 1500);

console.log("soaPhilhealthAllocation.test.ts: all assertions passed");
