"use client";

import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
} from "lucide-react";
import { Button } from "@web/components/ui/button";
import { useVoice } from "@web/providers/VoiceProvider";
import { cn } from "@web/lib/utils";

interface VoiceVideoControlsProps {
  channelId: string;
  isGroup?: boolean;
}

export const VoiceVideoControls = ({
  channelId,
  isGroup,
}: VoiceVideoControlsProps) => {
  const {
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    isMuted,
    currentChannelId,
    isSpeaking,
  } = useVoice();

  const isInCall = currentChannelId === channelId;

  const handleVoiceClick = async () => {
    if (isInCall) {
      leaveVoiceChannel();
    } else {
      await joinVoiceChannel(channelId);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "hover:bg-emerald-500/10 transition-colors",
          isInCall && "text-emerald-500 bg-emerald-500/10"
        )}
        onClick={handleVoiceClick}
      >
        {isInCall ? (
          <PhoneOff className="h-5 w-5" />
        ) : (
          <Phone className="h-5 w-5" />
        )}
      </Button>

      {isInCall && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "hover:bg-red-500/10 transition-colors",
            isMuted && "text-red-500 bg-red-500/10"
          )}
          onClick={toggleMute}
        >
          {isMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className={cn("h-5 w-5", isSpeaking && "text-green-500")} />
          )}
        </Button>
      )}

      {!isGroup && (
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-emerald-500/10 transition-colors"
        >
          <Video className="h-5 w-5" />
        </Button>
      )}

      {isGroup && isInCall && (
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-emerald-500/10 transition-colors"
        >
          <Monitor className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};
