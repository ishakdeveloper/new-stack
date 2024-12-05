defmodule WS.SocketHandler do
  @behaviour :cowboy_websocket

  alias WS.PubSub
  alias WS.Room
  alias WS.UserSession

  def init(req, state) do
    {:cowboy_websocket, req, %{user_id: nil, room_id: nil}}
  end

  def websocket_init(state) do
    {:ok, state}
  end

  def websocket_handle({:text, message}, state) do
    case Jason.decode(message) do
      {:ok, %{"type" => "register", "user_id" => user_id}} ->
        # Register the user and subscribe to their channel
        PubSub.subscribe("user:#{user_id}")
        UserSession.register_user(user_id, self())

        response = %{
          "status" => "success",
          "message" => "Registered as #{user_id}",
          "user_id" => user_id
        }

        # Update state with user_id
        {:reply, {:text, Jason.encode!(response)}, %{state | user_id: user_id}}

      {:ok, %{"type" => "join", "room_id" => room_id}} ->
        case state.user_id do
          nil ->
            # User is not registered
            response = %{
              "status" => "error",
              "message" => "You must register first"
            }

            {:reply, {:text, Jason.encode!(response)}, state}

          user_id ->
            # Add the user to the room and update the state
            Room.add_user(room_id, user_id)
            response = %{
              "status" => "success",
              "message" => "Joined room #{room_id}"
            }

            {:reply, {:text, Jason.encode!(response)}, %{state | room_id: room_id}}
        end

      {:ok, %{"type" => "leave", "room_id" => room_id}} ->
        case state.room_id do
          nil ->
            response = %{
              "status" => "error",
              "message" => "You are not in a room"
            }

            {:reply, {:text, Jason.encode!(response)}, state}

          ^room_id ->
            PubSub.broadcast("room:#{room_id}", "#{state.user_id} has left the room.")
            response = %{
              "status" => "success",
              "message" => "Left room #{room_id}"
            }

            {:reply, {:text, Jason.encode!(response)}, %{state | room_id: nil}}
        end

      _ ->
        response = %{
          "status" => "error",
          "message" => "Invalid message format"
        }

        {:reply, {:text, Jason.encode!(response)}, state}
    end
  end

  def websocket_info({:broadcast, message}, state) do
    {:reply, {:text, message}, state}
  end

  def terminate(_reason, _req, %{room_id: room_id, user_id: user_id} = state) do
    if room_id do
      WS.Room.remove_user(room_id, user_id)
    end

    if user_id do
      WS.UserSession.remove_user(user_id)
    end

    :ok
  end
end
