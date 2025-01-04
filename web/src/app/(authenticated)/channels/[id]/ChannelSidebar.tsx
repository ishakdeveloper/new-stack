"use client";

import { ScrollArea } from "@web/components/ui/scroll-area";
import { useGuildStore } from "@web/stores/useGuildStore";
import { useState } from "react";
import { CategoryList } from "./CategoryList";
import { ServerHeader } from "./ServerHeader";
import { CreateChannelModal } from "./CreateChannelModal";
import { CreateCategoryModal } from "./CreateCategoryModal";
import { InvitePeopleModal } from "./InviteModal";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
} from "@web/components/ui/context-menu";
import { ChannelSidebarContextMenu } from "./ChannelSidebarContextMenu";

const ChannelSidebar = () => {
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger className="w-60 bg-background border-r flex flex-col h-full">
        <ServerHeader
          onCreateChannel={() => setIsChannelModalOpen(true)}
          onCreateCategory={() => setIsCategoryModalOpen(true)}
          onInvitePeople={() => setIsInviteModalOpen(true)}
        />

        <ScrollArea className="flex-1">
          <div className="p-2">
            <CategoryList />
          </div>
        </ScrollArea>

        <CreateChannelModal
          isOpen={isChannelModalOpen}
          onClose={() => setIsChannelModalOpen(false)}
        />

        <CreateCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          categoryName={categoryName}
          setCategoryName={setCategoryName}
        />

        <InvitePeopleModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          guildId={currentGuildId ?? ""}
        />
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ChannelSidebarContextMenu
          onCreateChannel={() => setIsChannelModalOpen(true)}
          onCreateCategory={() => setIsCategoryModalOpen(true)}
          onInvitePeople={() => setIsInviteModalOpen(true)}
        />
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ChannelSidebar;
