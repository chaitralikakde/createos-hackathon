import assert from "node:assert/strict";
import test from "node:test";
import { rewriteEnroll } from "./fixer.ts";
import { isUnpaidReport } from "./mention.ts";
import { CHANGES_CHANNEL, LOOKING_INTO_IT, foundBugMessage } from "./messages.ts";

const broken = `const row = students.find((student) => student.email !== checkout.email);
row.status = "paid";
row.id = checkout.studentId;
`;

test("Maya's Slack sentence starts the workflow", () => {
  assert.equal(
    isUnpaidReport("<@U123> i paid the fees but still seeing unpaid status"),
    true,
  );
  assert.equal(isUnpaidReport("hello from the community"), false);
});

test("Maya hears that we are looking, and website-changes gets the bug and the pull request", () => {
  assert.equal(LOOKING_INTO_IT, "We're looking into this and will update you soon.");
  assert.equal(CHANGES_CHANNEL, "C0CA552P1C1");
  assert.equal(
    foundBugMessage(
      "https://github.com/chaitralikakde/testing-workflow/pull/2",
      "Stripe project createos ran the check in the createos sandbox (Free).",
      "pi_test_maya",
    ),
    "Found 1 bug.\nhttps://github.com/chaitralikakde/testing-workflow/pull/2\nStripe test payment pi_test_maya ($49, paid).\nStripe project createos ran the check in the createos sandbox (Free).",
  );
});

test("the test output tells the agent it updated Ava instead of Maya", () => {
  const output = `AssertionError [ERR_ASSERTION]: payment wrote the wrong row: Maya=unpaid, Ava=paid
`;
  const fixed = rewriteEnroll(broken, output);
  assert.match(fixed ?? "", /student\.email === checkout\.email/);
});
