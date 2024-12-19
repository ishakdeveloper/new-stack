defmodule WS.Message.Manifest do
  @moduledoc """
  Manages the message manifest for the websocket server.
  """
  alias WS.Message.{Auth, Friends, Guilds, Chat}
  alias Guilds.{Categories, Channels}

  @handlers %{
    "auth:login" => WS.Actions.Auth,
    "guild:message" => WS.Actions.Guild,
    "channel:message" => WS.Actions.Channel,
    "chat:message" => WS.Actions.Chat
    # ... other handlers ...
  }

  def get_handler(op) do
    case Map.get(@handlers, op) do
      nil -> {:error, "Unknown operation: #{op}"}
      handler -> {:ok, handler}
    end
  end

  def actions, do: @actions
end
