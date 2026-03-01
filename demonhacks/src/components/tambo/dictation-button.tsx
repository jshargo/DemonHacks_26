import React from "react";

/**
 * DictationButton stub — the real implementation imports useTamboVoice which
 * pulls in react-media-recorder → extendable-media-recorder → media-encoder-host.
 * That last package calls `new Worker()` at module scope, crashing Metro's SSR
 * evaluation. Voice dictation isn't needed for ExploreChi, so we render nothing.
 */
export default function DictationButton() {
  return null;
}
