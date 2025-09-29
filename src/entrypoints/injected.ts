import { defineUnlistedScript } from "#imports";

export default defineUnlistedScript(() => {
  const { requestAnimationFrame } = window;

  const generatePseudoKey = () => {
    return requestAnimationFrame(() => {});
  };

  window.addEventListener("load", () => {
    const tickerUpdates = new WeakSet();

    Function.prototype.bind = new Proxy(Function.prototype.bind, {
      apply: (target, thisArg, argumentsList) => {
        const bound = Reflect.apply(target, thisArg, argumentsList);

        const [self] = argumentsList;
        if (self && "countdownDurationMs" in self) {
          tickerUpdates.add(bound);
        }

        return bound;
      },
    });

    const tickerTasks = new Map();

    window.requestAnimationFrame = new Proxy(window.requestAnimationFrame, {
      apply: (target, thisArg, argumentsList) => {
        const [cb] = argumentsList;
        if (typeof cb !== "function" || !tickerUpdates.has(cb)) {
          return Reflect.apply(target, thisArg, argumentsList);
        }
        requestIdleCallback(() => tickerUpdates.delete(cb));

        const key = generatePseudoKey();
        const controller = new AbortController();
        // Ticker run after 2 seconds
        setTimeout(
          (signal) => {
            if (!signal.aborted) {
              const id = Reflect.apply(target, thisArg, argumentsList);
              signal.addEventListener("abort", () =>
                window.cancelAnimationFrame(id),
              );
            }
            setTimeout(() => tickerTasks.delete(key), 1000);
          },
          2 * 1000,
          controller.signal,
        );
        tickerTasks.set(key, controller);
        return key;
      },
    });

    window.cancelAnimationFrame = new Proxy(window.cancelAnimationFrame, {
      apply: (target, thisArg, argumentsList) => {
        const [key] = argumentsList;
        const abortController = tickerTasks.get(key);
        if (abortController) {
          abortController.abort();
        }
        Reflect.apply(target, thisArg, argumentsList);
      },
    });
  });
});
