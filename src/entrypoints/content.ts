import { defineContentScript, injectScript } from "#imports";

export default defineContentScript({
  matches: [
    "https://www.youtube.com/live_chat?*",
    "https://www.youtube.com/live_chat_replay?*",
  ],
  runAt: "document_start",
  allFrames: true,

  main() {
    injectScript("/injected.js");
  },
});
