import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableChannel } from "./SortableChannel";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@web/components/ui/context-menu";
import { Fragment, useState } from "react";
import { CreateChannelModal } from "./CreateChannelModal";

interface SortableCategoryProps {
  category: {
    id: string;
    name: string;
    channels: any[];
  };
  isCollapsed: boolean;
  onToggle: () => void;
  dragOverId: string | null;
}

export const SortableCategory = ({
  category,
  isCollapsed,
  onToggle,
  dragOverId,
}: SortableCategoryProps) => {
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.id,
    data: {
      type: "category",
      category,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-1">
      <ContextMenu modal={false}>
        <ContextMenuTrigger>
          <div
            className="flex items-center text-sm font-semibold cursor-pointer hover:bg-accent/50 p-1 rounded"
            onClick={onToggle}
            {...attributes}
            {...listeners}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            {category.name}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setIsCreateChannelOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Channel
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {!isCollapsed && (
        <div className="space-y-0.5 ml-3">
          <SortableContext
            items={category.channels.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {category.channels.map((channel) => (
              <Fragment key={channel.id}>
                {dragOverId === channel.id && (
                  <div className="h-0.5 bg-blue-500 rounded-full mx-2" />
                )}
                <SortableChannel channel={channel} categoryId={category.id} />
              </Fragment>
            ))}
          </SortableContext>
        </div>
      )}

      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        categoryId={category.id}
        categoryName={category.name}
      />
    </div>
  );
};
