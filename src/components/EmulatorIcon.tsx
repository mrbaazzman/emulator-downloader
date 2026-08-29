import { useState } from "react";
import { Gamepad2 } from "lucide-react";

import dolphinIcon from "../assets/icons/dolphin.png";
import pcsx2Icon from "../assets/icons/pcsx2.png";
import duckstationIcon from "../assets/icons/duckstation.png";
import rpcs3Icon from "../assets/icons/rpcs3.png";
import ppssppIcon from "../assets/icons/ppsspp.png";
import shadps4Icon from "../assets/icons/shadps4.png";
import xemuIcon from "../assets/icons/xemu.png";
import edenIcon from "../assets/icons/eden.svg";
import avalonia86Icon from "../assets/icons/avalonia86.png";

interface EmulatorIconProps {
  id: string;
  className?: string;
}

const ICON_MAP: Record<string, string> = {
  dolphin: dolphinIcon,
  pcsx2: pcsx2Icon,
  duckstation: duckstationIcon,
  rpcs3: rpcs3Icon,
  ppsspp: ppssppIcon,
  shadps4: shadps4Icon,
  xemu: xemuIcon,
  eden: edenIcon,
  avalonia86: avalonia86Icon,
};

export default function EmulatorIcon({ id, className = "w-11 h-11" }: EmulatorIconProps) {
  const [error, setError] = useState(false);
  const iconSrc = ICON_MAP[id.toLowerCase()];

  if (iconSrc && !error) {
    return (
      <div
        className={`${className} rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-center p-1.5 shrink-0 shadow-xs overflow-hidden transition-colors`}
      >
        <img
          src={iconSrc}
          alt={`${id} icon`}
          className="w-full h-full object-contain drop-shadow-xs select-none"
          loading="eager"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 p-2 shrink-0 shadow-xs`}
    >
      <Gamepad2 className="w-full h-full stroke-[1.75]" />
    </div>
  );
}
