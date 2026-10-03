import { describe, expect, it } from "vitest";

import {
  assignConnectedMuxPlayer,
  assignQuietMuxPlaybackFlags,
  mountQuietMuxPlayer,
  type QuietMuxPlayerElement,
  type QuietMuxPlayerProps,
  type QuietMuxPlayerStyle,
} from "./social-mux-player-quiet";

const HOUSE_STYLE: QuietMuxPlayerStyle = {
  aspectRatio: "auto",
  width: "100%",
  height: "100%",
  objectFit: "cover",
  "--controls": "none",
};

const PROPS: QuietMuxPlayerProps = {
  playbackId: "abc12345xx",
  streamType: "on-demand",
  preload: "metadata",
  poster: "https://image.mux.com/abc12345xx/thumbnail.webp",
  autoPlay: false,
  muted: true,
  tokens: { playback: "play.jwt", thumbnail: "thumb.jwt", storyboard: "board.jwt" },
  style: HOUSE_STYLE,
};

function fakePlayer(): QuietMuxPlayerElement & { calls: string[] } {
  const calls: string[] = [];
  let tokens: QuietMuxPlayerProps["tokens"];
  return {
    calls,
    isConnected: false,
    className: "",
    playbackId: "",
    streamType: "",
    preload: "",
    poster: "",
    muted: false,
    autoplay: false,
    get tokens() {
      return tokens;
    },
    set tokens(value: QuietMuxPlayerProps["tokens"]) {
      tokens = value;
      calls.push("tokens");
    },
    style: {
      setProperty(name: string, value: string) {
        calls.push(`style:${name}=${value}`);
      },
    },
    setAttribute(name: string, value: string) {
      calls.push(`attr:${name}=${value}`);
    },
    addEventListener(type: "loadeddata") {
      calls.push(`listen:${type}`);
    },
    removeEventListener() {},
    pause() {
      calls.push("pause");
    },
    play() {
      calls.push("play");
    },
    remove() {},
  };
}

describe("mountQuietMuxPlayer", () => {
  it("appends the element before playback, stream, poster, or style", () => {
    const player = fakePlayer();
    const host = {
      appendChild(node: QuietMuxPlayerElement) {
        player.calls.push("append");
        node.isConnected = true;
      },
    };
    mountQuietMuxPlayer(host, () => player, { ...PROPS, onLoadedData: () => {} });
    const appendAt = player.calls.indexOf("append");
    expect(appendAt).toBeGreaterThanOrEqual(0);
    // Captions stay hidden on Social (no auto captions); set before append.
    expect(player.calls.slice(0, appendAt)).toEqual([
      "attr:playsinline=",
      "attr:default-hidden-captions=",
      "attr:hotkeys=noc",
    ]);
    expect(player.playbackId).toBe("abc12345xx");
    expect(player.streamType).toBe("on-demand");
    expect(player.preload).toBe("metadata");
    expect(player.poster).toBe(PROPS.poster);
    expect(player.muted).toBe(true);
    expect(player.autoplay).toBe(false);
    expect(player.tokens).toEqual(PROPS.tokens);
    expect(player.calls.slice(appendAt + 1)).toEqual([
      "tokens",
      "style:aspect-ratio=auto",
      "style:width=100%",
      "style:height=100%",
      "style:object-fit=cover",
      "style:--controls=none",
      "listen:loadeddata",
      "pause",
    ]);
    expect(player.className).toBe("size-full object-cover");
    expect(player.isConnected).toBe(true);
  });

  it("refuses to assign fields while the element is disconnected", () => {
    const player = fakePlayer();
    expect(() => assignConnectedMuxPlayer(player, PROPS)).toThrow(/connected/);
    expect(player.playbackId).toBe("");
    expect(player.calls).toEqual([]);
  });

  it("writes mute and autoplay on the same connected element", () => {
    const player = fakePlayer();
    player.isConnected = true;
    assignConnectedMuxPlayer(player, { ...PROPS, onLoadedData: () => {} });
    const callsAfterMount = [...player.calls];
    assignQuietMuxPlaybackFlags(player, { muted: false, autoPlay: true });
    expect(player.muted).toBe(false);
    expect(player.autoplay).toBe(true);
    expect(player.playbackId).toBe(PROPS.playbackId);
    expect(player.poster).toBe(PROPS.poster);
    expect(player.calls).toEqual([...callsAfterMount, "play"]);
  });

  it("pauses and resumes the same connected element", () => {
    const player = fakePlayer();
    player.isConnected = true;
    player.playbackId = PROPS.playbackId;
    assignQuietMuxPlaybackFlags(player, { muted: true, autoPlay: false });
    expect(player).toMatchObject({ muted: true, autoplay: false, playbackId: PROPS.playbackId });
    expect(player.calls).toEqual(["pause"]);

    assignQuietMuxPlaybackFlags(player, { muted: true, autoPlay: true });
    expect(player).toMatchObject({ muted: true, autoplay: true, playbackId: PROPS.playbackId });
    expect(player.calls).toEqual(["pause", "play"]);

    assignQuietMuxPlaybackFlags(player, { muted: false, autoPlay: false });
    expect(player).toMatchObject({ muted: false, autoplay: false, playbackId: PROPS.playbackId });
    expect(player.calls).toEqual(["pause", "play", "pause"]);
  });

  it("writes tokens before play() on first mount when tokens are present", () => {
    const player = fakePlayer();
    const host = {
      appendChild(node: QuietMuxPlayerElement) {
        node.isConnected = true;
      },
    };
    player.play = () => {
      player.calls.push("play");
      expect(player.tokens).toEqual(PROPS.tokens);
    };
    mountQuietMuxPlayer(host, () => player, { ...PROPS, autoPlay: true });
    const tokensAt = player.calls.indexOf("tokens");
    const playAt = player.calls.indexOf("play");
    expect(tokensAt).toBeGreaterThanOrEqual(0);
    expect(playAt).toBeGreaterThan(tokensAt);
  });

  it("applies muted without play() or pause() when autoPlay did not change", () => {
    const player = fakePlayer();
    player.isConnected = true;
    assignQuietMuxPlaybackFlags(player, { muted: false, autoPlay: true });
    expect(player.calls).toEqual(["play"]);

    assignQuietMuxPlaybackFlags(player, { muted: true, autoPlay: true, autoPlayChanged: false });
    expect(player.muted).toBe(true);
    expect(player.autoplay).toBe(true);
    expect(player.calls).toEqual(["play"]);

    assignQuietMuxPlaybackFlags(player, { muted: true, autoPlay: false, autoPlayChanged: true });
    expect(player.calls).toEqual(["play", "pause"]);

    assignQuietMuxPlaybackFlags(player, { muted: false, autoPlay: false, autoPlayChanged: false });
    expect(player.muted).toBe(false);
    expect(player.autoplay).toBe(false);
    expect(player.calls).toEqual(["play", "pause"]);

    assignQuietMuxPlaybackFlags(player, { muted: false, autoPlay: true, autoPlayChanged: true });
    expect(player.calls).toEqual(["play", "pause", "play"]);
  });

  it("drops only DOMException AbortError and NotAllowedError from play and rethrows every other rejection", async () => {
    const player = fakePlayer();
    player.isConnected = true;
    const seen: unknown[] = [];
    const onUnhandled = (error: unknown) => {
      seen.push(error);
    };
    process.on("unhandledRejection", onUnhandled);
    try {
      const dropped = [
        new DOMException("The operation was aborted.", "AbortError"),
        new DOMException("The request is not allowed by the user agent.", "NotAllowedError"),
      ];
      for (const error of dropped) {
        player.play = () => Promise.reject(error);
        assignQuietMuxPlaybackFlags(player, { muted: true, autoPlay: true });
      }
      await new Promise((resolve) => setImmediate(resolve));
      expect(seen).toEqual([]);
      expect(player.autoplay).toBe(true);

      const spoofedAbort = new Error("not a media play rejection");
      spoofedAbort.name = "AbortError";
      const visible = [
        new Error("decoder failed"),
        new DOMException("The media is not supported.", "NotSupportedError"),
        spoofedAbort,
      ];
      for (const error of visible) {
        player.play = () => Promise.reject(error);
        assignQuietMuxPlaybackFlags(player, { muted: true, autoPlay: true });
      }
      await new Promise((resolve) => setImmediate(resolve));
      expect(seen).toEqual(visible);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("force-mutes and retries play when unmuted autoplay is blocked", async () => {
    const player = fakePlayer();
    player.isConnected = true;
    const forced: string[] = [];
    player.play = () => {
      player.calls.push(`play:${player.muted}`);
      if (!player.muted) {
        return Promise.reject(
          new DOMException("The request is not allowed by the user agent.", "NotAllowedError"),
        );
      }
    };
    assignQuietMuxPlaybackFlags(player, {
      muted: false,
      autoPlay: true,
      onForcedMute: () => {
        forced.push("forced");
      },
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(forced).toEqual(["forced"]);
    expect(player.muted).toBe(true);
    expect(player.calls.filter((call) => call.startsWith("play:"))).toEqual(["play:false", "play:true"]);
  });

  it("leaves a blocked unmuted play muted-off when no force-mute handler is set", async () => {
    const player = fakePlayer();
    player.isConnected = true;
    player.play = () => {
      player.calls.push("play");
      return Promise.reject(new DOMException("The request is not allowed by the user agent.", "NotAllowedError"));
    };
    assignQuietMuxPlaybackFlags(player, { muted: false, autoPlay: true });
    await new Promise((resolve) => setImmediate(resolve));
    expect(player.muted).toBe(false);
    expect(player.calls.filter((call) => call === "play")).toEqual(["play"]);
  });

  it("does not retry when a muted autoplay is blocked", async () => {
    const player = fakePlayer();
    player.isConnected = true;
    const forced: string[] = [];
    player.play = () => {
      player.calls.push("play");
      return Promise.reject(new DOMException("The request is not allowed by the user agent.", "NotAllowedError"));
    };
    assignQuietMuxPlaybackFlags(player, {
      muted: true,
      autoPlay: true,
      onForcedMute: () => {
        forced.push("forced");
      },
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(forced).toEqual([]);
    expect(player.muted).toBe(true);
    expect(player.calls.filter((call) => call === "play")).toEqual(["play"]);
  });

  it("refuses mute and autoplay writes while the element is disconnected", () => {
    const player = fakePlayer();
    expect(() => assignQuietMuxPlaybackFlags(player, { muted: true, autoPlay: true })).toThrow(/connected/);
    expect(player.muted).toBe(false);
    expect(player.autoplay).toBe(false);
    expect(player.calls).toEqual([]);
  });

  it("writes only the house style tokens", () => {
    const player = fakePlayer();
    player.isConnected = true;
    const open: QuietMuxPlayerStyle = {
      aspectRatio: "auto",
      width: "100%",
      height: "100%",
      objectFit: "cover",
    };
    assignConnectedMuxPlayer(player, { ...PROPS, style: open });
    expect(player.calls.filter((call) => call.startsWith("style:"))).toEqual([
      "style:aspect-ratio=auto",
      "style:width=100%",
      "style:height=100%",
      "style:object-fit=cover",
    ]);

    const contained = fakePlayer();
    contained.isConnected = true;
    assignConnectedMuxPlayer(contained, {
      ...PROPS,
      style: { ...open, objectFit: "contain" },
    });
    expect(contained.calls.filter((call) => call.startsWith("style:"))).toEqual([
      "style:aspect-ratio=auto",
      "style:width=100%",
      "style:height=100%",
      "style:object-fit=contain",
    ]);

    const injected = fakePlayer();
    injected.isConnected = true;
    assignConnectedMuxPlayer(injected, {
      ...PROPS,
      style: {
        ...HOUSE_STYLE,
        backgroundImage: "url(https://example.invalid/x)",
        width: "1px",
      } as unknown as QuietMuxPlayerStyle,
    });
    expect(injected.calls.filter((call) => call.startsWith("style:"))).toEqual([
      "style:aspect-ratio=auto",
      "style:height=100%",
      "style:object-fit=cover",
      "style:--controls=none",
    ]);
  });
});
