defmodule WS.Message.Types.Operator do
  @moduledoc """
  Defines WebSocket opcodes similar to Discord's Gateway opcodes.
  Both client->server and server->client use numeric opcodes.
  """

  # Connection & Authentication (0-9)
  @dispatch 0            # Server -> Client: Events
  @heartbeat 1          # Both: Ping/Pong
  @identify 2           # Client -> Server: Initial auth
  @presence 3           # Client -> Server: Update presence
  @ready 4             # Server -> Client: Auth success
  @resume 6            # Client -> Server: Resume connection
  @reconnect 7         # Server -> Client: Reconnect needed
  @request_guild_members 8  # Client -> Server: Request members
  @invalid_session 9   # Server -> Client: Session invalid

  # Connection Lifecycle (10-14)
  @hello 10           # Server -> Client: Initial connection
  @heartbeat_ack 11   # Server -> Client: Heartbeat received

  # Guild Events (15-29)
  @guild_create 15
  @guild_update 16
  @guild_delete 17
  @guild_member_add 24
  @guild_member_update 25
  @guild_member_remove 26
  @guild_role_create 27
  @guild_role_update 28
  @guild_role_delete 29

  # Channel Events (30-39)
  @channel_create 30
  @channel_update 31
  @channel_delete 32
  @channel_pins_update 33
  @channel_join 34     # Voice channel join
  @channel_leave 35    # Voice channel leave
  @channel_typing 36   # User started typing

  # Message Events (40-49)
  @message_create 40
  @message_update 41
  @message_delete 42
  @message_delete_bulk 43
  @message_reaction_add 44
  @message_reaction_remove 45
  @message_reaction_remove_all 46

  # Friend/Relationship Events (50-59)
  @friend_request 50
  @friend_accept 51
  @friend_decline 52
  @friend_remove 53
  @relationship_add 54    # For other relationship types (blocked, etc)
  @relationship_remove 55

  # Voice Events (60-69)
  @voice_state_update 60
  @voice_server_update 61
  @voice_connect 62
  @voice_disconnect 63
  @voice_mute 64
  @voice_deafen 65
  @voice_signal 66

  # User Events (70-79)
  @user_update 70        # User settings/profile update
  @user_note_update 71   # Update note on user
  @user_settings_update 72
  @user_connections_update 73

  # Presence Events (80-89)
  @presence_update 80    # User presence change (online, away, etc)
  @sessions_replace 81   # Active sessions update
  @typing_start 82
  @typing_stop 83

  # Thread Events (90-99)
  @thread_create 90
  @thread_update 91
  @thread_delete 92
  @thread_member_update 93
  @thread_members_update 94

  # Make opcodes available via use macro for pattern matching
  defmacro __using__(_opts) do
    quote do
      # Connection & Authentication
      @dispatch unquote(@dispatch)
      @heartbeat unquote(@heartbeat)
      @identify unquote(@identify)
      @presence unquote(@presence)
      @ready unquote(@ready)
      @resume unquote(@resume)
      @reconnect unquote(@reconnect)
      @request_guild_members unquote(@request_guild_members)
      @invalid_session unquote(@invalid_session)

      # Connection Lifecycle
      @hello unquote(@hello)
      @heartbeat_ack unquote(@heartbeat_ack)

      # Guild Events
      @guild_create unquote(@guild_create)
      @guild_update unquote(@guild_update)
      @guild_delete unquote(@guild_delete)
      @guild_member_add unquote(@guild_member_add)
      @guild_member_update unquote(@guild_member_update)
      @guild_member_remove unquote(@guild_member_remove)
      @guild_role_create unquote(@guild_role_create)
      @guild_role_update unquote(@guild_role_update)
      @guild_role_delete unquote(@guild_role_delete)

      # Channel Events
      @channel_create unquote(@channel_create)
      @channel_update unquote(@channel_update)
      @channel_delete unquote(@channel_delete)
      @channel_pins_update unquote(@channel_pins_update)
      @channel_join unquote(@channel_join)
      @channel_leave unquote(@channel_leave)
      @channel_typing unquote(@channel_typing)

      # Message Events
      @message_create unquote(@message_create)
      @message_update unquote(@message_update)
      @message_delete unquote(@message_delete)
      @message_delete_bulk unquote(@message_delete_bulk)
      @message_reaction_add unquote(@message_reaction_add)
      @message_reaction_remove unquote(@message_reaction_remove)
      @message_reaction_remove_all unquote(@message_reaction_remove_all)

      # Friend/Relationship Events
      @friend_request unquote(@friend_request)
      @friend_accept unquote(@friend_accept)
      @friend_decline unquote(@friend_decline)
      @friend_remove unquote(@friend_remove)
      @relationship_add unquote(@relationship_add)
      @relationship_remove unquote(@relationship_remove)

      # Voice Events
      @voice_state_update unquote(@voice_state_update)
      @voice_server_update unquote(@voice_server_update)
      @voice_connect unquote(@voice_connect)
      @voice_disconnect unquote(@voice_disconnect)
      @voice_mute unquote(@voice_mute)
      @voice_deafen unquote(@voice_deafen)
      @voice_signal unquote(@voice_signal)

      # User Events
      @user_update unquote(@user_update)
      @user_note_update unquote(@user_note_update)
      @user_settings_update unquote(@user_settings_update)
      @user_connections_update unquote(@user_connections_update)

      # Presence Events
      @presence_update unquote(@presence_update)
      @sessions_replace unquote(@sessions_replace)
      @typing_start unquote(@typing_start)
      @typing_stop unquote(@typing_stop)

      # Thread Events
      @thread_create unquote(@thread_create)
      @thread_update unquote(@thread_update)
      @thread_delete unquote(@thread_delete)
      @thread_member_update unquote(@thread_member_update)
      @thread_members_update unquote(@thread_members_update)
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
  def code(:guild_member_add), do: @guild_member_add
  def code(:guild_member_update), do: @guild_member_update
  def code(:guild_member_remove), do: @guild_member_remove
  def code(:guild_role_create), do: @guild_role_create
  def code(:guild_role_update), do: @guild_role_update
  def code(:guild_role_delete), do: @guild_role_delete
  def code(:channel_create), do: @channel_create
  def code(:channel_update), do: @channel_update
  def code(:channel_delete), do: @channel_delete
  def code(:channel_pins_update), do: @channel_pins_update
  def code(:channel_join), do: @channel_join
  def code(:channel_leave), do: @channel_leave
  def code(:channel_typing), do: @channel_typing
  def code(:message_create), do: @message_create
  def code(:message_update), do: @message_update
  def code(:message_delete), do: @message_delete
  def code(:message_delete_bulk), do: @message_delete_bulk
  def code(:message_reaction_add), do: @message_reaction_add
  def code(:message_reaction_remove), do: @message_reaction_remove
  def code(:message_reaction_remove_all), do: @message_reaction_remove_all
  def code(:friend_request), do: @friend_request
  def code(:friend_accept), do: @friend_accept
  def code(:friend_decline), do: @friend_decline
  def code(:friend_remove), do: @friend_remove
  def code(:relationship_add), do: @relationship_add
  def code(:relationship_remove), do: @relationship_remove
  def code(:voice_state_update), do: @voice_state_update
  def code(:voice_server_update), do: @voice_server_update
  def code(:voice_connect), do: @voice_connect
  def code(:voice_disconnect), do: @voice_disconnect
  def code(:voice_mute), do: @voice_mute
  def code(:voice_deafen), do: @voice_deafen
  def code(:voice_signal), do: @voice_signal
  def code(:user_update), do: @user_update
  def code(:user_note_update), do: @user_note_update
  def code(:user_settings_update), do: @user_settings_update
  def code(:user_connections_update), do: @user_connections_update
  def code(:presence_update), do: @presence_update
  def code(:sessions_replace), do: @sessions_replace
  def code(:typing_start), do: @typing_start
  def code(:typing_stop), do: @typing_stop
  def code(:thread_create), do: @thread_create
  def code(:thread_update), do: @thread_update
  def code(:thread_delete), do: @thread_delete
  def code(:thread_member_update), do: @thread_member_update
  def code(:thread_members_update), do: @thread_members_update

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
      @guild_member_add -> :guild_member_add
      @guild_member_update -> :guild_member_update
      @guild_member_remove -> :guild_member_remove
      @guild_role_create -> :guild_role_create
      @guild_role_update -> :guild_role_update
      @guild_role_delete -> :guild_role_delete
      @channel_create -> :channel_create
      @channel_update -> :channel_update
      @channel_delete -> :channel_delete
      @channel_pins_update -> :channel_pins_update
      @channel_join -> :channel_join
      @channel_leave -> :channel_leave
      @channel_typing -> :channel_typing
      @message_create -> :message_create
      @message_update -> :message_update
      @message_delete -> :message_delete
      @message_delete_bulk -> :message_delete_bulk
      @message_reaction_add -> :message_reaction_add
      @message_reaction_remove -> :message_reaction_remove
      @message_reaction_remove_all -> :message_reaction_remove_all
      @friend_request -> :friend_request
      @friend_accept -> :friend_accept
      @friend_decline -> :friend_decline
      @friend_remove -> :friend_remove
      @relationship_add -> :relationship_add
      @relationship_remove -> :relationship_remove
      @voice_state_update -> :voice_state_update
      @voice_server_update -> :voice_server_update
      @voice_connect -> :voice_connect
      @voice_disconnect -> :voice_disconnect
      @voice_mute -> :voice_mute
      @voice_deafen -> :voice_deafen
      @voice_signal -> :voice_signal
      @user_update -> :user_update
      @user_note_update -> :user_note_update
      @user_settings_update -> :user_settings_update
      @user_connections_update -> :user_connections_update
      @presence_update -> :presence_update
      @sessions_replace -> :sessions_replace
      @typing_start -> :typing_start
      @typing_stop -> :typing_stop
      @thread_create -> :thread_create
      @thread_update -> :thread_update
      @thread_delete -> :thread_delete
      @thread_member_update -> :thread_member_update
      @thread_members_update -> :thread_members_update
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
      guild_member_add: @guild_member_add,
      guild_member_update: @guild_member_update,
      guild_member_remove: @guild_member_remove,
      guild_role_create: @guild_role_create,
      guild_role_update: @guild_role_update,
      guild_role_delete: @guild_role_delete,
      channel_create: @channel_create,
      channel_update: @channel_update,
      channel_delete: @channel_delete,
      channel_pins_update: @channel_pins_update,
      channel_join: @channel_join,
      channel_leave: @channel_leave,
      channel_typing: @channel_typing,
      message_create: @message_create,
      message_update: @message_update,
      message_delete: @message_delete,
      message_delete_bulk: @message_delete_bulk,
      message_reaction_add: @message_reaction_add,
      message_reaction_remove: @message_reaction_remove,
      message_reaction_remove_all: @message_reaction_remove_all,
      friend_request: @friend_request,
      friend_accept: @friend_accept,
      friend_decline: @friend_decline,
      friend_remove: @friend_remove,
      relationship_add: @relationship_add,
      relationship_remove: @relationship_remove,
      voice_state_update: @voice_state_update,
      voice_server_update: @voice_server_update,
      voice_connect: @voice_connect,
      voice_disconnect: @voice_disconnect,
      voice_mute: @voice_mute,
      voice_deafen: @voice_deafen,
      voice_signal: @voice_signal,
      user_update: @user_update,
      user_note_update: @user_note_update,
      user_settings_update: @user_settings_update,
      user_connections_update: @user_connections_update,
      presence_update: @presence_update,
      sessions_replace: @sessions_replace,
      typing_start: @typing_start,
      typing_stop: @typing_stop,
      thread_create: @thread_create,
      thread_update: @thread_update,
      thread_delete: @thread_delete,
      thread_member_update: @thread_member_update,
      thread_members_update: @thread_members_update
    }
  end
end
