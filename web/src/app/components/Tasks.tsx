"use client";

import { authClient } from "@/utils/authClient";
import { client } from "@/utils/client";
import { InsertTask } from "@repo/server/src/database/schema/";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

function Tasks() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [editingTaskID, setEditingTaskID] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  const session = authClient.useSession();

  const { data } = useQuery({
    queryKey: ["tasks", session?.data?.user?.id],
    queryFn: () =>
      client.api.tasks.get({
        query: { userId: session?.data?.user?.id ?? "" },
      }),
  });

  useEffect(() => {
    console.log(data);
  }, [data]);

  const deleteTask = useMutation({
    mutationFn: (id: string) =>
      client.api.tasks({ id }).delete(id, {
        query: { userId: session?.data?.user.id ?? "" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", session?.data?.user.id],
      });
    },
  });

  const createTask = useMutation({
    mutationFn: (body: InsertTask) =>
      client.api.tasks.post(body, {
        query: { userId: session?.data?.user.id ?? "" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", session?.data?.user.id],
      });
      setTitle("");
    },
  });

  const updateTask = useMutation({
    mutationFn: (body: InsertTask) =>
      client.api.tasks({ id: editingTaskID }).put(body, {
        query: { userId: session?.data?.user.id ?? "" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", session?.data?.user.id],
      });
      setIsEditing(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createTask.mutate({
      title,
      userId: session?.data?.user.id,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteTask.mutate(id);
  };

  const handleEdit = async (id: string) => {
    setEditingTaskID(id);
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateTask.mutate({
      title: editedTitle,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="p-2 rounded-md bg-white"
        />
        <button type="submit" className="p-2 rounded-md bg-white">
          {createTask.isPending ? "Creating..." : "Create"}
        </button>
      </form>
      {data?.data?.map((task) => (
        <div key={task.id} className="p-4 rounded-md flex gap-2">
          {isEditing && editingTaskID === task.id ? (
            <div className="flex gap-2">
              <form onSubmit={handleUpdate}>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="p-2 rounded-md bg-white"
                />
                <button type="submit" className="p-2 rounded-md bg-white">
                  {updateTask.isPending ? "Updating..." : "Update"}
                </button>
              </form>
            </div>
          ) : (
            <div onClick={() => handleEdit(task.id)}>
              <h1 className="text-2xl font-bold">{task.title}</h1>
            </div>
          )}
          <button onClick={() => handleDelete(task.id)}>
            {deleteTask.isPending && task.id === deleteTask.variables
              ? "Deleting..."
              : "Delete"}
          </button>
        </div>
      ))}
    </div>
  );
}

export default Tasks;
