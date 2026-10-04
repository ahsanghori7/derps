import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isChunkLoadError } from "./lazyWithRetry.js";

describe("isChunkLoadError", () => {
  it("detects Vite dynamic import failures", () => {
    assert.equal(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://derps.gotmsolutions.com/assets/index-DP_l8KwW.js"
        )
      ),
      true
    );
  });

  it("ignores unrelated fetch errors", () => {
    assert.equal(isChunkLoadError(new TypeError("Failed to fetch")), false);
    assert.equal(isChunkLoadError(new Error("Network Error")), false);
  });
});
