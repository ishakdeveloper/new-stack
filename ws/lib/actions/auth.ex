defmodule WS.Actions.Auth do
  require Logger
  import Ecto.Changeset
  use WS.Message.Types.Operator
  alias WS.Message

  def handle(changeset, state) do
    # Get the user data from the changeset
    user_data = Ecto.Changeset.apply_changes(changeset)

    # Create a new session ID using Ecto.UUID
    session_id = Ecto.UUID.generate()

    # Create the ready response using the Ready struct
    ready_message = WS.Messages.Auth.Ready.changeset(%{
      user: Map.from_struct(user_data),
      session_id: session_id,
      guilds: [],  # Add guild data if needed
      private_channels: []  # Add channel data if needed
    })
    |> Ecto.Changeset.apply_changes()

    {:reply, ready_message, %{state | session_id: session_id}}
  end

  defp register_user_session(user_id) do
    Logger.debug("Registering user session for #{user_id}")

    case WS.Workers.UserSession.register_user(user_id: user_id) do
      {:ok, pid} ->
        Logger.debug("User session registered with pid: #{inspect(pid)}")
        {:ok, pid}
      {:error, {:already_started, pid}} ->
        Logger.debug("User session already exists with pid: #{inspect(pid)}")
        {:ok, pid}
      error ->
        Logger.error("Failed to register user session: #{inspect(error)}")
        {:error, "Failed to create user session"}
    end
  end

  defp set_active_websocket(user_id, ws_pid) do
    Logger.debug("Setting active websocket for user #{user_id} to #{inspect(ws_pid)}")

    try do
      WS.Workers.UserSession.set_active_ws(user_id, ws_pid)
      :ets.insert(:ws_connections, {user_id, ws_pid})
      :ok
    catch
      kind, reason ->
        Logger.error("Failed to set active websocket: #{inspect({kind, reason})}")
        {:error, "Failed to set active websocket"}
    end
  end
end
