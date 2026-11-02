import { expect, it } from "vitest";
import { advanceSpring } from "./motion";

it("settles at the destination without overshooting", () => {
  let state = { value: 0, velocity: 0 };
  for (let frame = 0; frame < 60; frame++) {
    const next = advanceSpring(state, 1, 1 / 60);
    expect(next.value).toBeGreaterThanOrEqual(state.value);
    expect(next.value).toBeLessThanOrEqual(1);
    state = next;
  }
  expect(state.value).toBeCloseTo(1, 5);
});
it("can reverse an opening transition without jumping to either endpoint", () => {
  let state = { value: 0, velocity: 0 };
  for (let frame = 0; frame < 5; frame++)
    state = advanceSpring(state, 1, 1 / 60);
  const reversed = advanceSpring(state, 0, 1 / 60);
  expect(Math.abs(reversed.value - state.value)).toBeLessThan(0.1);
  state = reversed;
  for (let frame = 0; frame < 60; frame++)
    state = advanceSpring(state, 0, 1 / 60);
  expect(state.value).toBeCloseTo(0, 5);
});
