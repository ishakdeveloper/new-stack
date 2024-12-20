defmodule WS.Message.Types.Operator do
  @moduledoc """
  Defines WebSocket opcodes similar to Discord's Gateway opcodes.
  Both client->server and server->client use numeric opcodes.
  """

  # Define all opcodes as module attributes so they can be used in guards
  @dispatch 0        # Server -> Client: Events
  @heartbeat 1       # Both: Ping/Pong
  @identify 2        # Client -> Server: Initial auth
  @presence 3        # Client -> Server: Update presence
  @ready 4          # Server -> Client: Auth success
  @resume 6         # Client -> Server: Resume connection
  @reconnect 7      # Server -> Client: Reconnect needed
  @request_guild_members 8  # Client -> Server: Request members
  @invalid_session 9       # Server -> Client: Session invalid
  @hello 10               # Server -> Client: Initial connection
  @heartbeat_ack 11      # Server -> Client: Heartbeat received
  @guild_create 15
  @guild_update 16
  @guild_delete 17
  @channel_create 18
  @channel_update 19
  @channel_delete 20
  @message_create 21
  @message_update 22
    @message_delete 23
    @friend_request 30
  @friend_accept 31
  @friend_decline 32
  @friend_remove 33
  @channel_join 40
  @channel_leave 41
  @start_typing 50
  # Make opcodes available via use macro for pattern matching
  defmacro __using__(_opts) do
    quote do
      # Connection & State
      @dispatch unquote(@dispatch)
      @heartbeat unquote(@heartbeat)
      @identify unquote(@identify)
      @presence unquote(@presence)
      @ready unquote(@ready)
      @resume unquote(@resume)
      @reconnect unquote(@reconnect)
      @request_guild_members unquote(@request_guild_members)
      @invalid_session unquote(@invalid_session)
      @hello unquote(@hello)
      @heartbeat_ack unquote(@heartbeat_ack)

      # Custom Events
      @guild_create unquote(@guild_create)
      @guild_update unquote(@guild_update)
      @guild_delete unquote(@guild_delete)
      @channel_join unquote(@channel_join)
      @channel_leave unquote(@channel_leave)
      @channel_create unquote(@channel_create)
      @channel_update unquote(@channel_update)
      @channel_delete unquote(@channel_delete)
      @message_create unquote(@message_create)
      @message_update unquote(@message_update)
      @message_delete unquote(@message_delete)

      # Friendship
      @friend_request unquote(@friend_request)
      @friend_accept unquote(@friend_accept)
      @friend_decline unquote(@friend_decline)
      @friend_remove unquote(@friend_remove)

      # Typing
      @start_typing unquote(@start_typing)

      # Export the operators map
      @operators %{
        unquote(@heartbeat) => :heartbeat,
        unquote(@identify) => :identify,
        unquote(@friend_request) => :friend_request
      }
    end
  end

  # Convert atom to opcode number
  def code(:dispatch), do: @dispatch
  def code(:heartbeat), do: @heartbeat
  def code(:identify), do: @identify
  def code(:presence), do: @presence
  def code(:ready), do: @ready
  def code(:resume), do: @resume
  def code(:reconnect), do: @reconnect
  def code(:request_guild_members), do: @request_guild_members
  def code(:invalid_session), do: @invalid_session
  def code(:hello), do: @hello
  def code(:heartbeat_ack), do: @heartbeat_ack
  def code(:guild_create), do: @guild_create
  def code(:guild_update), do: @guild_update
  def code(:guild_delete), do: @guild_delete
  def code(:channel_join), do: @channel_join
  def code(:channel_leave), do: @channel_leave
  def code(:channel_create), do: @channel_create
  def code(:channel_update), do: @channel_update
  def code(:channel_delete), do: @channel_delete
  def code(:message_create), do: @message_create
  def code(:message_update), do: @message_update
  def code(:message_delete), do: @message_delete
  def code(:friend_request), do: @friend_request
  def code(:friend_accept), do: @friend_accept
  def code(:friend_decline), do: @friend_decline
  def code(:friend_remove), do: @friend_remove
  def code(:start_typing), do: @start_typing

  # Legacy string support
  def code("ping"), do: @heartbeat
  def code("pong"), do: @heartbeat_ack
  def code("auth:login"), do: @identify
  def code("auth:success"), do: @ready
  def code(op) when is_binary(op), do: string_to_opcode(op)

  # Get operation name from code (for debugging)
  def name(code) when is_integer(code) do
    case code do
      @dispatch -> :dispatch
      @heartbeat -> :heartbeat
      @identify -> :identify
      @presence -> :presence
      @ready -> :ready
      @resume -> :resume
      @reconnect -> :reconnect
      @request_guild_members -> :request_guild_members
      @invalid_session -> :invalid_session
      @hello -> :hello
      @heartbeat_ack -> :heartbeat_ack
      @guild_create -> :guild_create
      @guild_update -> :guild_update
      @guild_delete -> :guild_delete
      @channel_create -> :channel_create
      @channel_update -> :channel_update
      @channel_delete -> :channel_delete
      @channel_join -> :channel_join
      @channel_leave -> :channel_leave
      @message_create -> :message_create
      @message_update -> :message_update
      @message_delete -> :message_delete
      @friend_request -> :friend_request
      @friend_accept -> :friend_accept
      @friend_decline -> :friend_decline
      @friend_remove -> :friend_remove
      @start_typing -> :start_typing
      _ -> :unknown
    end
  end

  # Convert string event to opcode
  defp string_to_opcode(op) do
    op
    |> String.replace(":", "_")
    |> String.to_atom()
    |> code()
  end

  # Get all opcodes
  def opcodes do
    %{
      dispatch: @dispatch,
      heartbeat: @heartbeat,
      identify: @identify,
      presence: @presence,
      ready: @ready,
      resume: @resume,
      reconnect: @reconnect,
      request_guild_members: @request_guild_members,
      invalid_session: @invalid_session,
      hello: @hello,
      heartbeat_ack: @heartbeat_ack,
      guild_create: @guild_create,
      guild_update: @guild_update,
      guild_delete: @guild_delete,
      channel_join: @channel_join,
      channel_leave: @channel_leave,
      channel_create: @channel_create,
      channel_update: @channel_update,
      channel_delete: @channel_delete,
      message_create: @message_create,
      message_update: @message_update,
      message_delete: @message_delete,
      friend_request: @friend_request,
      friend_accept: @friend_accept,
      friend_decline: @friend_decline,
      friend_remove: @friend_remove,
      start_typing: @start_typing
    }
  end
end
