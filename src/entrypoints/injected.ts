import { defineUnlistedScript } from "#imports";

type TickerTask = TickerQueuedTask | TickerScheduledTask;

type TickerQueuedTask = {
  kind: "queued";
  callback: FrameRequestCallback;
};

type TickerScheduledTask = {
  kind: "scheduled";
  id: number;
};

export default defineUnlistedScript(() => {
  const { requestAnimationFrame, cancelAnimationFrame } = window;

  const generatePseudoKey = () => {
    return requestAnimationFrame(() => {});
  };

  const extractCallbacks = (tasks: Map<number, TickerTask>) => {
    const m = new Map<number, FrameRequestCallback>();
    for (const [key, task] of tasks) {
      if (task.kind === "queued") {
        m.set(key, task.callback);
      }
    }
    return m;
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

    const tickerTasks = new Map<number, TickerTask>();
    let timer: number | null = null;

    window.requestAnimationFrame = new Proxy(window.requestAnimationFrame, {
      apply: (target, thisArg, argumentsList) => {
        const [cb] = argumentsList;
        if (typeof cb !== "function" || !tickerUpdates.has(cb)) {
          return Reflect.apply(target, thisArg, argumentsList);
        }
        requestIdleCallback(() => tickerUpdates.delete(cb));

        const key = generatePseudoKey();
        tickerTasks.set(key, { kind: "queued", callback: cb });

        if (timer === null) {
          timer = window.setTimeout(() => {
            timer = null;
            for (const [key, cb] of extractCallbacks(tickerTasks)) {
              const id = requestAnimationFrame((time) => {
                cb(time);
                requestIdleCallback(() => tickerTasks.delete(key));
              });
              tickerTasks.set(key, { kind: "scheduled", id });
            }
          }, 2_000);
        }

        return key;
      },
    });

    window.cancelAnimationFrame = new Proxy(window.cancelAnimationFrame, {
      apply: (target, thisArg, argumentsList) => {
        Reflect.apply(target, thisArg, argumentsList);

        const [key] = argumentsList;
        if (tickerTasks.has(key)) {
          const task = tickerTasks.get(key);
          if (task && task.kind === "scheduled") {
            cancelAnimationFrame(task.id);
          }
          tickerTasks.delete(key);
        }
      },
    });
  });
});
