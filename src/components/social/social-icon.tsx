"use client";

import {
  ArrowCounterClockwise,
  ArrowUp,
  Broadcast,
  Camera,
  CameraRotate,
  CaretLeft,
  CaretRight,
  ChatCircle,
  Check,
  CheckCircle,
  Compass,
  DownloadSimple,
  FilmSlate,
  FilmStrip,
  Heart,
  House,
  Image,
  Lightning,
  Link,
  MagnifyingGlass,
  PaperPlaneTilt,
  Pause,
  PencilSimple,
  Play,
  SpeakerHigh,
  SpeakerSlash,
  Plus,
  ShareNetwork,
  SquaresFour,
  TextT,
  Trash,
  Tray,
  UploadSimple,
  User,
  VideoCamera,
  Users,
  WarningCircle,
  X,
  type Icon,
} from "@phosphor-icons/react";

import type { SocialPhosphorIconName } from "@/lib/social-icons";

const ICONS: Record<SocialPhosphorIconName, Icon> = {
  house: House,
  compass: Compass,
  plus: Plus,
  "chat-circle": ChatCircle,
  user: User,
  check: Check,
  image: Image,
  users: Users,
  "film-strip": FilmStrip,
  "film-slate": FilmSlate,
  "squares-four": SquaresFour,
  "magnifying-glass": MagnifyingGlass,
  tray: Tray,
  "paper-plane-tilt": PaperPlaneTilt,
  play: Play,
  pause: Pause,
  "speaker-high": SpeakerHigh,
  "speaker-slash": SpeakerSlash,
  "share-network": ShareNetwork,
  link: Link,
  "download-simple": DownloadSimple,
  "text-t": TextT,
  "warning-circle": WarningCircle,
  camera: Camera,
  "video-camera": VideoCamera,
  "camera-rotate": CameraRotate,
  lightning: Lightning,
  "pencil-simple": PencilSimple,
  "check-circle": CheckCircle,
  trash: Trash,
  "upload-simple": UploadSimple,
  "arrow-counter-clockwise": ArrowCounterClockwise,
  "arrow-up": ArrowUp,
  "caret-left": CaretLeft,
  "caret-right": CaretRight,
  x: X,
  heart: Heart,
  broadcast: Broadcast,
};

export function SocialIcon({
  name,
  active = false,
  size = 20,
  weight = "regular",
  className,
}: {
  name: SocialPhosphorIconName;
  active?: boolean;
  size?: number;
  /** Regular on the light canvas and cards; "bold" opt-in on media and the dark stage. */
  weight?: "regular" | "bold";
  className?: string;
}) {
  const Icon = ICONS[name];
  return (
    <Icon
      data-social-icon={name}
      data-social-icon-active={active ? "" : undefined}
      className={className}
      size={size}
      weight={active ? "fill" : weight}
    />
  );
}
