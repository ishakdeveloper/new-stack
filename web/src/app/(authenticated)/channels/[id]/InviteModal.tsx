"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@web/components/ui/dialog";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { client } from "@web/utils/client";
import { Check, Copy } from "lucide-react";
import { useState, useEffect } from "react";
interface InvitePeopleModalProps {
  isOpen: boolean;
  onClose: () => void;
  guildId: string;
}

export const InvitePeopleModal = ({
  isOpen,
  onClose,
  guildId,
}: InvitePeopleModalProps) => {
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  const { data: invite } = useQuery({
    queryKey: ["invite", guildId],
    queryFn: async () => {
      const invite = await client.api.invites.post({
        guildId: guildId,
        maxUses: 0,
      });
      return invite.data?.[200].inviteCode;
    },
    enabled: isOpen && !!guildId,
  });

  useEffect(() => {
    if (typeof window !== "undefined" && invite) {
      setInviteUrl(`${window.location.origin}/invite/${invite}`);
    }
  }, [invite]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite People</DialogTitle>
          <DialogDescription>
            Share this link with others to invite them to your server
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Input readOnly value={inviteUrl} className="flex-1" />
            <Button size="icon" onClick={handleCopy} className="shrink-0">
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Your invite link expires in 7 days
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
