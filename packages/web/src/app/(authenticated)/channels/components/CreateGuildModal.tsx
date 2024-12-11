"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { client } from "@/utils/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/useUserStore";
import { useState } from "react";
import { Icons } from "@/components/ui/icons";
import { useGuildStore } from "@/stores/useGuildStore";
import { useToast } from "@/hooks/use-toast";

const createGuildSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

type CreateGuildForm = z.infer<typeof createGuildSchema>;

export function CreateGuildModal() {
  const currentUser = useUserStore((state) => state.currentUser);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateGuildForm>({
    resolver: zodResolver(createGuildSchema),
  });

  const router = useRouter();

  const setCurrentGuildId = useGuildStore((state) => state.setCurrentGuildId);
  const setLastVisitedChannel = useGuildStore(
    (state) => state.setLastVisitedChannel
  );

  const createGuildMutation = useMutation({
    mutationFn: async (data: CreateGuildForm) => {
      const response = await client.api.guilds.post({
        name: data.name,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["guilds", currentUser?.id] });
      reset();
      setOpen(false);
      setCurrentGuildId(data?.guild.id ?? "");
      setLastVisitedChannel(
        data?.guild.id ?? "",
        data?.defaultChannel.id ?? ""
      );
      router.push(`/channels/${data?.guild.id}/${data?.defaultChannel.id}`);
      toast({
        title: "Server Created",
        description: `Successfully created server "${data?.guild.name}"`,
      });
    },
  });

  const onSubmit = async (data: CreateGuildForm) => {
    try {
      await createGuildMutation.mutateAsync(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-primary/10 hover:bg-primary/20"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Add a server</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Server</DialogTitle>
          <DialogDescription>
            Create a new server to start chatting with others.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="name"
                  {...register("name")}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createGuildMutation.isPending}>
              {createGuildMutation.isPending ? (
                <Icons.spinner className="h-4 w-4 animate-spin" />
              ) : (
                "Create Server"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
