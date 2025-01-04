"use client";

import { useEffect } from "react";
import { Dialog, DialogContent } from "@web/components/ui/dialog";
import { Button } from "@web/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@web/components/ui/avatar";
import { Phone, PhoneOff } from "lucide-react";
import { useVoice } from "@web/providers/VoiceProvider";

interface IncomingCallDialogProps {
  caller: {
    id: string;
    name: string;
    image?: string;
  };
  channelId: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallDialog = ({
  caller,
  channelId,
  onAccept,
  onDecline,
}: IncomingCallDialogProps) => {
  useEffect(() => {
    // Play ringtone
    const audio = new Audio("/sounds/incoming-call.mp3");
    audio.loop = true;
    audio.play();

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center space-y-4 py-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={caller.image} />
            <AvatarFallback>
              {caller.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="text-lg font-semibold">
              {caller.name} is calling...
            </h3>
            <p className="text-sm text-muted-foreground">Incoming voice call</p>
          </div>
          <div className="flex gap-4 mt-4">
            <Button
              variant="default"
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={onAccept}
            >
              <Phone className="h-4 w-4 mr-2" />
              Accept
            </Button>
            <Button variant="destructive" onClick={onDecline}>
              <PhoneOff className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
