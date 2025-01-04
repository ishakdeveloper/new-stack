"use client";
import { Button } from "@web/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@web/components/ui/alert-dialog";
import { Icons } from "@web/components/ui/icons";
import { client } from "@web/utils/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useUserStore } from "@web/stores/useUserStore";
import { useState } from "react";
import { useToast } from "@web/hooks/use-toast";

interface DeleteServerModalProps {
  guildId: string;
  open: boolean;
  onClose: () => void;
}

export function DeleteServerModal({
  guildId,
  open,
  onClose,
}: DeleteServerModalProps) {
  const currentUser = useUserStore((state) => state.currentUser);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  const deleteServerMutation = useMutation({
    mutationFn: async () => {
      const response = await client.api.guilds({ guildId }).delete();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guilds", currentUser?.id] });
      router.push("/channels/me");
      toast({
        title: "Server deleted",
        description: "Your server has been permanently deleted.",
      });
    },
  });

  const handleDelete = async () => {
    try {
      await deleteServerMutation.mutateAsync();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            server and remove all data associated with it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteServerMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteServerMutation.isPending ? (
              <Icons.spinner className="h-4 w-4 animate-spin" />
            ) : (
              "Delete Server"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
