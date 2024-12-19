defmodule WS.Message.Types.Operator do
  @moduledoc """
  Represents the operator type for the websocket server.

  Auth: 0-15
  Friend operations: 16-31
  Guild operations: 32-63
  Chat operations: 64-95
  Guild Category operations: 96-111
  Guild Channel operations: 112-127
  """
  alias WS.Message.Auth
  alias WS.Message.Friends
  alias WS.Message.Guilds

  use Ecto.ParameterizedType

  @operators %{
    # Auth operations: 0..15
    Auth.StartSession => 1,

    # Friend operations: 16..31
    Friends.SendRequest => 16,
    Friends.AcceptRequest => 17,
    Friends.DeclineRequest => 18,
    Friends.RemoveFriend => 19,

    # Guild operations: 32..63
    Guilds.JoinGuild => 32,
    Guilds.LeaveGuild => 33,
    Guilds.DestroyGuild => 34,
    Guilds.UserJoinedGuild => 35,
    Guilds.UserLeftGuild => 36,

    # Chat operations: 64..95
    Chat.SendMessage => 64,
    Chat.SendPrivateMessage => 65,
    Chat.SendGroupMessage => 66,

    # Guild Category operations: 96..111
    Categories.CreateCategory => 96,
    Categories.DeleteCategory => 97,

    # Guild Channel operations: 112..127
    Channels.CreateChannel => 112,
    Channels.DeleteChannel => 113,
    Channels.SendMessage => 114,
    Channels.DeleteMessage => 115,
    Channels.EditMessage => 116,
    Channels.ReactMessage => 117,
    Channels.DeleteReaction => 118,
    Channels.EditReaction => 119
  }

  def type(_params), do: :integer

  def init(opts), do: Enum.into(opts, %{})

  def cast(nil, _params), do: {:ok, nil}
  def cast(module, _params) when is_atom(module), do: {:ok, module}
  def cast(_, _), do: :error

  def load(nil, _, _), do: {:ok, nil}
  def load(code, _, _) when is_integer(code), do: {:ok, type(code)}
  def load(_, _, _), do: :error

  def dump(nil, _, _), do: {:ok, nil}
  def dump(module, _, _) when is_atom(module), do: {:ok, code(module)}
  def dump(_, _, _), do: :error

  # Our existing functions
  def operators, do: @operators
  def valid_value?(type), do: Map.has_key?(@operators, type)
  def code(type), do: @operators[type]
  def type(code), do: Enum.find(@operators, fn {_k, v} -> v == code end) |> elem(0)
end
