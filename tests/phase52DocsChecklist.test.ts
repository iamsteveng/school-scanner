import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const evidenceDocPath = resolve(
  process.cwd(),
  "docs/tasks/phase-5-2-whatsapp-delivery-scheduler-ci-evidence.md",
);

describe("Phase 5.2 CI evidence docs checklist", () => {
  it("documents scheduler test matrix coverage", () => {
    const content = readFileSync(evidenceDocPath, "utf8");

    expect(content).toContain("Coverage Matrix");
    expect(content).toContain("tests/dailyPremiumScheduler.test.ts");
    expect(content).toContain("tests/weeklyFreeScheduler.test.ts");
    expect(content).toContain("tests/schedulerDeliveryProcessing.test.ts");
    expect(content).toContain("tests/whatsappDispatch.test.ts");
  });

  it("includes local quality gate command evidence", () => {
    const content = readFileSync(evidenceDocPath, "utf8");

    expect(content).toContain("npm run lint");
    expect(content).toContain("npx tsc --noEmit");
    expect(content).toContain("npm test");
    expect(content).toContain("Test Files:");
    expect(content).toContain("Tests:");
  });
});
