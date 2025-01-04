import {
  ChevronDown,
  FolderPlus,
  Pencil,
  Plus,
  Settings,
  Trash,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@web/components/ui/dropdown-menu";
import { useGuildStore } from "@web/stores/useGuildStore";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { client } from "@web/utils/client";

interface ServerHeaderProps {
  onCreateChannel: () => void;
  onCreateCategory: () => void;
  onInvitePeople: () => void;
}

export const ServerHeader = ({
  onCreateChannel,
  onCreateCategory,
  onInvitePeople,
}: ServerHeaderProps) => {
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const router = useRouter();

  const { data: guild } = useQuery({
    queryKey: ["guild", currentGuildId],
    queryFn: async () => {
      const guild = await client.api
        .guilds({ guildId: currentGuildId ?? "" })
        .get();
      return guild;
    },
    enabled: !!currentGuildId,
  });

  const { mutate: deleteGuild } = useMutation({
    mutationFn: async () => {
      return client.api.guilds({ guildId: currentGuildId ?? "" }).delete();
    },
    onSuccess: () => {
      router.push("/channels/me");
    },
  });

  const handleDeleteGuild = () => {
    deleteGuild();
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <div className="p-4 font-bold flex items-center justify-between cursor-pointer hover:bg-accent/50">
          <span>{guild?.data?.[0]?.[200].guild.name}</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuItem>
          <Pencil className="mr-2 h-4 w-4" />
          <span>Edit Server</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Server Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onInvitePeople}>
          <UserPlus className="mr-2 h-4 w-4" />
          <span>Invite People</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCreateChannel}>
          <Plus className="mr-2 h-4 w-4" />
          <span>Create Channel</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCreateCategory}>
          <FolderPlus className="mr-2 h-4 w-4" />
          <span>Create Category</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-red-600" onClick={handleDeleteGuild}>
          <Trash className="mr-2 h-4 w-4" />
          <span>Delete Server</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
