// Media Chrome warns "No style sheet found on style tag" when a control's
// connectedCallback runs while that control is still disconnected. mux-player
// does that if playback, stream, poster, muted, preload, or style are set
// before the element is in the document — React applies those during
// createElement, before append. Class and playsinline do not. Append first,
// then assign the rest. Tokens, when present, are assigned before play().

export type QuietMuxTokens = {
  playback: string;
  thumbnail: string;
  storyboard: string;
};

// House tokens from playerStyle. Other CSS names and values never reach setProperty.
export type QuietMuxPlayerStyle = {
  readonly aspectRatio: "auto";
  readonly width: "100%";
  readonly height: "100%";
  readonly objectFit: "cover" | "contain";
  readonly "--controls"?: "none";
};

const QUIET_MUX_PLAYER_STYLE_KEYS = ["aspectRatio", "width", "height", "objectFit", "--controls"] as const;

const QUIET_MUX_PLAYER_STYLE_VALUES = {
  aspectRatio: ["auto"],
  width: ["100%"],
  height: ["100%"],
  objectFit: ["cover", "contain"],
  "--controls": ["none"],
} as const satisfies {
  readonly [K in keyof QuietMuxPlayerStyle]-?: readonly NonNullable<QuietMuxPlayerStyle[K]>[];
};

export type QuietMuxPlayerProps = {
  playbackId: string;
  streamType: "on-demand";
  preload: "metadata";
  poster: string;
  autoPlay: boolean;
  muted: boolean;
  onForcedMute?: () => void;
  tokens?: QuietMuxTokens;
  style: QuietMuxPlayerStyle;
  onLoadedData?: () => void;
};

export type QuietMuxPlayerElement = {
  isConnected: boolean;
  className: string;
  playbackId: string;
  streamType: string;
  preload: string;
  poster: string;
  muted: boolean;
  autoplay: boolean;
  tokens?: QuietMuxTokens;
  style: { setProperty(name: string, value: string): void };
  setAttribute(name: string, value: string): void;
  addEventListener(type: "loadeddata", listener: () => void): void;
  removeEventListener(type: "loadeddata", listener: () => void): void;
  pause(): void;
  play(): void | Promise<void>;
  remove(): void;
};

export type QuietMuxHost = {
  appendChild(player: QuietMuxPlayerElement): void;
};

export const QUIET_MUX_PLAYER_CLASS = "size-full object-cover";

export function cssPropertyName(name: string): string {
  if (name.startsWith("--")) return name;
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function assertMuxPlayerConnected(player: QuietMuxPlayerElement): void {
  if (!player.isConnected) {
    throw new Error("Mux player fields are assigned after the element is connected");
  }
}

export function mountQuietMuxPlayer(
  host: QuietMuxHost,
  create: () => QuietMuxPlayerElement,
  props: QuietMuxPlayerProps,
): QuietMuxPlayerElement {
  const player = create();
  player.className = QUIET_MUX_PLAYER_CLASS;
  player.setAttribute("playsinline", "");
  // No captions on Social (founder decision 2026-10-03). Mux Player turns a
  // subtitles track on by default; this keeps any track hidden, including
  // the topic tagger's before it is deleted. The quiet player has no
  // captions control, so viewers cannot turn one on.
  player.setAttribute("default-hidden-captions", "");
  host.appendChild(player);
  assignConnectedMuxPlayer(player, props);
  return player;
}

// Mute and autoplay can change on a story without building a new element.
// The autoplay attribute is a load-time hint. pause() or play() runs when
// autoPlay is first applied or when it changes. A mute-only write does not
// call them.
//
// play() rejections: drop only DOMException AbortError (pause wins the race)
// and DOMException NotAllowedError (the browser blocks playback). Every other
// rejection is rethrown so it stays visible.
// Unmuted play() from an effect is NotAllowedError on iOS. A caller that
// passes onForcedMute gets the element forced muted and one muted play()
// retry. The slash stays tappable. Callers that omit the handler keep the
// swallow, so Stories does not change.
// docs/design-locks/stories-viewer-mute-control-lock-v1.md
function voidQuietMuxPlay(started: void | Promise<void>, onNotAllowed?: () => void): void {
  if (!(started instanceof Promise)) return;
  void started.catch((error: unknown) => {
    if (!(error instanceof DOMException)) throw error;
    if (error.name === "AbortError") return;
    if (error.name === "NotAllowedError") {
      onNotAllowed?.();
      return;
    }
    throw error;
  });
}

export function assignQuietMuxPlaybackFlags(
  player: QuietMuxPlayerElement,
  flags: Pick<QuietMuxPlayerProps, "autoPlay" | "muted" | "onForcedMute"> & { autoPlayChanged?: boolean },
): void {
  assertMuxPlayerConnected(player);
  player.muted = flags.muted;
  player.autoplay = flags.autoPlay;
  // Omit autoPlayChanged, or pass true, to pause or play. Pass false when
  // autoPlay did not change so a mute-only flip does not call play() or pause().
  if (flags.autoPlayChanged === false) return;
  if (!flags.autoPlay) {
    player.pause();
    return;
  }
  voidQuietMuxPlay(player.play(), () => {
    if (flags.muted || !flags.onForcedMute || !player.isConnected) return;
    player.muted = true;
    flags.onForcedMute();
    voidQuietMuxPlay(player.play());
  });
}

export function assignConnectedMuxPlayer(
  player: QuietMuxPlayerElement,
  props: QuietMuxPlayerProps,
): void {
  assertMuxPlayerConnected(player);
  player.playbackId = props.playbackId;
  player.streamType = props.streamType;
  player.preload = props.preload;
  player.poster = props.poster;
  if (props.tokens) player.tokens = props.tokens;
  applyQuietMuxPlayerStyle(player, props.style);
  if (props.onLoadedData) player.addEventListener("loadeddata", props.onLoadedData);
  // First play() sees tokens when the props have them. Calling play() earlier
  // lets a signed story start unsigned and 403.
  assignQuietMuxPlaybackFlags(player, props);
}

function applyQuietMuxPlayerStyle(player: QuietMuxPlayerElement, style: QuietMuxPlayerStyle): void {
  for (const name of QUIET_MUX_PLAYER_STYLE_KEYS) {
    const value = style[name];
    if (value === undefined) continue;
    if (!(QUIET_MUX_PLAYER_STYLE_VALUES[name] as readonly string[]).includes(value)) continue;
    player.style.setProperty(cssPropertyName(name), value);
  }
}
