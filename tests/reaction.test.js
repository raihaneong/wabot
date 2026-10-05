import test from "node:test";
import assert from "node:assert/strict";
import { safeReact } from "../src/reaction.js";

test("safeReact swallows reaction errors", async () => {
  let called = false;
  const msg = {
    from: "123@c.us",
    react: async (emoji) => {
      called = true;
      if (emoji) {
        throw new Error("Reaction send error");
      }
    },
  };

  await assert.doesNotReject(async () => {
    await safeReact(msg, "✅");
  });

  assert.equal(called, true);
});
