import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@web/components/ui/dialog";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Switch } from "@web/components/ui/switch";
import { Button } from "@web/components/ui/button";
import { Hash } from "lucide-react";
import { useGuildStore } from "@web/stores/useGuildStore";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { client } from "@web/utils/client";
import { useState } from "react";
import { useSocket } from "@web/providers/SocketProvider";
import { Opcodes } from "@repo/api";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId?: string;
  categoryName?: string;
}

export const CreateChannelModal = ({
  isOpen,
  onClose,
  categoryId,
  categoryName,
}: CreateChannelModalProps) => {
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const queryClient = useQueryClient();
  const [channelName, setChannelName] = useState("");
  const { sendMessage } = useSocket();
  const { mutate: createChannel } = useMutation({
    mutationFn: async () => {
      return client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .channels.post({
          name: channelName,
          categoryId: categoryId,
        });
    },
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ["channels", currentGuildId] });
      onClose();
      setChannelName("");

      sendMessage({
        op: Opcodes.ChannelCreate,
        d: {
          channel_id: channel?.data?.id ?? "",
          guild_id: currentGuildId ?? "",
        },
      });
    },
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>
            Create a new channel{" "}
            {categoryName ? `in ${categoryName}` : "in this server"}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (channelName.trim()) {
              createChannel();
            }
          }}
        >
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">CHANNEL NAME</Label>
              <div className="flex items-center">
                <Hash className="w-4 h-4 mr-2 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="new-channel"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!channelName.trim()}>
              Create Channel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
