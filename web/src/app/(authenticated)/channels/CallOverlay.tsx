"use client";

import { useVoice } from "@web/providers/VoiceProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@web/components/ui/avatar";
import { cn } from "@web/lib/utils";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "@web/components/ui/button";

interface CallOverlayProps {
  channelId: string;
  participants: any[];
  isGroup?: boolean;
}

export const CallOverlay = ({
  channelId,
  participants,
  isGroup,
}: CallOverlayProps) => {
  const {
    currentChannelId,
    connectedUsers,
    speakingUsers,
    isMuted,
    isVideoEnabled,
    toggleMute,
    toggleVideo,
    leaveVoiceChannel,
  } = useVoice();

  const isInCall = currentChannelId === channelId;

  if (!isInCall) return null;

  const handleLeaveCall = () => {
    leaveVoiceChannel();
  };

  return (
    <div className="absolute top-0 left-0 right-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Voice Connected</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className={cn(
                "hover:bg-red-500/10 transition-colors",
                isMuted && "text-red-500 bg-red-500/10"
              )}
            >
              {isMuted ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            {!isGroup && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleVideo}
                className={cn(
                  "hover:bg-emerald-500/10 transition-colors",
                  isVideoEnabled && "text-emerald-500 bg-emerald-500/10"
                )}
              >
                {isVideoEnabled ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <VideoOff className="h-4 w-4" />
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeaveCall}
              className="hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          {participants.map((participant) => {
            const isConnected = connectedUsers.includes(participant.user.id);
            const isSpeaking = speakingUsers.has(participant.user.id);

            return (
              <div
                key={participant.user.id}
                className={cn(
                  "flex flex-col items-center p-2 rounded transition-all",
                  !isConnected && "opacity-50",
                  isSpeaking && "bg-emerald-500/10"
                )}
              >
                <div className="relative">
                  <Avatar
                    className={cn(
                      "h-16 w-16 ring-2 transition-all duration-300",
                      isSpeaking ? "ring-emerald-500" : "ring-transparent"
                    )}
                  >
                    <AvatarImage src={participant.user.image} />
                    <AvatarFallback>
                      {participant.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {participant.isMuted && (
                    <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1">
                      <MicOff className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium mt-2">
                  {participant.user.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isConnected
                    ? isSpeaking
                      ? "Speaking"
                      : "Connected"
                    : "Not Connected"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
