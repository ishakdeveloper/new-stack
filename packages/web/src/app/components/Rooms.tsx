"use client";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/utils/client";
import { authClient } from "@/utils/authClient";
import { useRouter } from "next/navigation";
import { useSocket } from "@/providers/SocketProvider";

export default function Rooms() {
  const [name, setName] = useState("");
  const router = useRouter();
  const { data: rooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => client.api.rooms.get(),
  });

  const { socket } = useSocket();

  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const { mutate: createRoom } = useMutation({
    mutationFn: (name: string) =>
      client.api.rooms.post(
        { name },
        {
          query: { userId: session?.data?.user?.id ?? "" },
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const { mutate: joinRoom } = useMutation({
    mutationFn: (roomId: string) =>
      client.api.rooms({ id: roomId }).join.post(
        {
          userId: session?.data?.user?.id ?? "",
        },
        {
          query: { userId: session?.data?.user?.id ?? "" },
        }
      ),
    onSuccess: (data, roomId) => {
      queryClient.setQueryData(["rooms"], (old: any) => {
        if (!old) return old;

        const updatedRooms = old.data.map((room: any) =>
          room.id === roomId
            ? {
                ...room,
                users: [
                  ...(room.users || []),
                  {
                    userId: session?.data?.user?.id,
                    name: session?.data?.user?.name,
                  },
                ],
              }
            : room
        );

        return {
          ...old,
          data: updatedRooms,
        };
      });

      socket?.send({
        type: "room:join",
        data: {
          // @ts-ignore
          roomId: data.data?.[0]?.roomId,
          user: session?.data?.user,
        },
      });
    },
  });

  const handleCreateRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createRoom(name);
    setName("");
  };

  const handleJoinRoom = async (roomId: string) => {
    joinRoom(roomId);
  };

  const handleEnterRoom = (roomId: string) => {
    router.push(`/rooms/${roomId}`);
  };

  useEffect(() => {
    if (!socket) return;
    const handleSocketMessage = async (message: {
      data: { type: string; data: any };
    }) => {
      console.log(message);

      if (message.data.type === "room:update") {
        console.log("room:update", message.data);
        queryClient.setQueryData(["rooms"], (old: any) => {
          return {
            ...old,
            data: old.data.map((room: any) => ({
              ...room,
            })),
          };
        });
      }

      if (message.data.type === "room:join") {
        socket.subscribe(message.data.data.roomId);
      }
    };

    socket?.on("message", handleSocketMessage);

    return () => {
      socket?.off("message", handleSocketMessage);
    };
  }, [socket, queryClient]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Available Rooms</h2>
        <div className="flex gap-2">
          <form onSubmit={handleCreateRoom}>
            <input
              type="text"
              placeholder="Room title"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
              Create Room
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rooms?.data?.map((room) => {
          const isUserMember = room.users?.some(
            (user) => user.userId === session?.data?.user?.id
          );

          return (
            <div
              key={room.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-semibold text-gray-900">
                  {room.name}
                </h3>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {room.users?.length || 0} users
                </span>
              </div>
              <p className="mt-2 text-gray-600 text-sm">
                {/* {room.description || "No description available"} */}
              </p>
              {isUserMember ? (
                <button
                  onClick={() => handleEnterRoom(room.id)}
                  className="mt-4 w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Enter Room
                </button>
              ) : (
                <button
                  onClick={() => handleJoinRoom(room.id)}
                  className="mt-4 w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Join Room
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
