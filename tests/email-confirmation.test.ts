import { test } from "node:test";
import assert from "node:assert/strict";
import { emailConfirmationError, needsEmailConfirmation } from "@/lib/email-confirmation";

test("a new contractor always needs the email confirmed", () => {
  assert.equal(needsEmailConfirmation(null, "a@b.com"), true);
  assert.equal(needsEmailConfirmation(undefined, "a@b.com"), true);
});

test("an unchanged email on edit needs no confirmation, ignoring case and spaces", () => {
  assert.equal(needsEmailConfirmation("Jake@Gmail.com", " jake@gmail.com "), false);
});

test("a changed email on edit needs confirmation", () => {
  assert.equal(needsEmailConfirmation("jake@gmail.com", "jake@gmial.com"), true);
});

test("the server gate: unchanged email saves without a confirm value", () => {
  assert.equal(emailConfirmationError("jake@gmail.com", "jake@gmail.com", ""), null);
});

test("the server gate: a changed email must match its confirmation", () => {
  assert.notEqual(emailConfirmationError("jake@gmail.com", "new@gmail.com", ""), null);
  assert.notEqual(emailConfirmationError("jake@gmail.com", "new@gmail.com", "new@gmial.com"), null);
  assert.equal(emailConfirmationError("jake@gmail.com", "new@gmail.com", " NEW@gmail.com"), null);
});

test("the server gate: a new contractor must confirm", () => {
  assert.notEqual(emailConfirmationError(null, "a@b.com", ""), null);
  assert.equal(emailConfirmationError(null, "a@b.com", "a@b.com"), null);
});
