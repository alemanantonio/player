export interface SpringState {
  value: number;
  velocity: number;
}

// Critically damped: settles without bouncing and preserves velocity on reversal.
export function advanceSpring(
  state: SpringState,
  target: number,
  elapsed: number,
): SpringState {
  const frequency = 27;
  const delta = Math.max(0, Math.min(elapsed, 1 / 30));
  const distance = state.value - target;
  const impulse = state.velocity + frequency * distance;
  const decay = Math.exp(-frequency * delta);
  return {
    value: target + (distance + impulse * delta) * decay,
    velocity: (state.velocity - frequency * impulse * delta) * decay,
  };
}

export function animateSpring(
  onUpdate: (value: number) => void,
  onRest: (value: number) => void,
) {
  let state: SpringState = { value: 0, velocity: 0 };
  let target = 1;
  let previous: number | undefined;
  let frame = 0;
  let stopped = false;
  const tick = (time: number) => {
    if (stopped) return;
    state = advanceSpring(
      state,
      target,
      previous === undefined ? 1 / 60 : (time - previous) / 1000,
    );
    previous = time;
    if (
      Math.abs(state.value - target) < 0.001 &&
      Math.abs(state.velocity) < 0.01
    ) {
      state = { value: target, velocity: 0 };
      frame = 0;
      onUpdate(target);
      onRest(target);
      return;
    }
    onUpdate(state.value);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return {
    to(value: number) {
      target = value;
      if (!frame && !stopped) {
        previous = undefined;
        frame = requestAnimationFrame(tick);
      }
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(frame);
    },
  };
}
