"use client";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { Icons } from "@/components/ui/icons";
import { client } from "@/utils/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/useUserStore";
import { useState } from "react";

export function DeleteServerModal({ guildId }: { guildId: string }) {
  const currentUser = useUserStore((state) => state.currentUser);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const deleteServerMutation = useMutation({
    mutationFn: async () => {
      const response = await client.api.guilds({ guildId }).delete();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guilds", currentUser?.id] });
      setOpen(false);
      router.push("/channels/me");
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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-red-600">
          Delete Server
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            server and remove all data associated with it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
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
