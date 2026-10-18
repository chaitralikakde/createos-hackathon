import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pageFor } from "./course.mjs";

const payment = JSON.parse(readFileSync(new URL("./payment.json", import.meta.url), "utf8"));
assert.equal(payment.paid, true, "Stripe sandbox payment is not paid");
assert.equal(payment.email, "maya@class.test");

const html = pageFor({
  type: "checkout.session.completed",
  paid: payment.paid === true,
  student: payment.student,
  email: payment.email,
  studentId: payment.studentId,
  course: payment.course,
  fee: payment.fee,
});

function row(email) {
  const match = html.match(new RegExp(`data-email="${email}" data-status="([^"]+)" data-id="([^"]+)"`));
  return { status: match?.[1], id: match?.[2] };
}

const maya = row("maya@class.test");
const ava = row("ava@class.test");
const summary = `Maya=${maya.status}, Ava=${ava.status}`;

assert.equal(maya.status, "paid", `payment wrote the wrong row: ${summary}`);
assert.equal(ava.status, "unpaid", `payment wrote the wrong row: ${summary}`);
assert.equal(maya.id, "stu_maya");
assert.equal(ava.id, "stu_ava");
assert.equal(html.match(/data-email=/g)?.length, 2);
console.log(`passed: Maya's payment ${payment.id} updates Maya only`);
