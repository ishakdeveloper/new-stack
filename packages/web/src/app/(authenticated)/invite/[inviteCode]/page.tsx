"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { client } from "@/utils/client";
import { useToast } from "@/hooks/use-toast";
import { useGuildStore } from "@/stores/useGuildStore";

export default function InvitePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function fetchParams() {
    const { inviteCode } = await params;
    return inviteCode;
  }

  const { data: guild, isLoading } = useQuery({
    queryKey: ["guild", fetchParams()],
    queryFn: async () => {
      const inviteCode = await fetchParams();
      const res = await client.api.invite({ inviteCode }).guild.get();
      return res.data;
    },
  });

  const joinServerMutation = useMutation({
    mutationFn: async () => {
      const inviteCode = await fetchParams();
      const res = await client.api.invites({ inviteCode }).use.post();
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "You have joined the server",
      });
      if (guild) {
        router.push(`/channels/${guild?.guilds.id}`);
      }
    },
    onError: (error: any) => {
      if (error.message === "You are already a member of this server") {
        toast({
          title: "Already a member",
          description: "You are already a member of this server",
        });
        router.push(`/channels/${guild?.guilds.id}`);
      } else {
        toast({
          title: "Error",
          description: "Failed to join server",
          variant: "destructive",
        });
      }
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!guild) {
    return <div>Invalid invite</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold">
            You&apos;ve been invited to join
          </h2>
          <h1 className="text-3xl font-bold mt-2">{guild.guilds.name}</h1>
        </div>

        <Button
          className="w-full"
          onClick={() => joinServerMutation.mutate()}
          disabled={joinServerMutation.isPending}
        >
          {joinServerMutation.isPending ? "Joining..." : "Join Server"}
        </Button>
      </div>
    </div>
  );
}
