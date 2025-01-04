defmodule WS.Workers.Voice do
  use GenServer
  require Logger
  alias WS.PubSub.{Topics, Broadcaster}

  defmodule State do
    defstruct [:channel_id, :guild_id, :sessions, :ice_servers]

    @type t() :: %__MODULE__{
      channel_id: String.t(),
      guild_id: String.t() | nil,
      sessions: %{String.t() => ExWebRTC.PeerConnection.t()},
      ice_servers: list()
    }
  end

  defp via_tuple(channel_id) do
    {:via, Registry, {WS.Workers.VoiceRegistry, channel_id}}
  end

  def start_voice_channel(channel_id, guild_id \\ nil) do
    DynamicSupervisor.start_child(
      WS.Workers.Supervisors.VoiceSupervisor,
      {__MODULE__, %{
        channel_id: channel_id,
        guild_id: guild_id,
        sessions: %{},
        ice_servers: [
          %{urls: ["stun:stun.l.google.com:19302"]}
          # Add your TURN servers here
        ]
      }}
    )
  end

  def join_voice(channel_id, user_id) do
    GenServer.call(via_tuple(channel_id), {:join, user_id})
  end

  def leave_voice(channel_id, user_id) do
    GenServer.cast(via_tuple(channel_id), {:leave, user_id})
  end

  def handle_signal(channel_id, from_user, to_user, signal) do
    GenServer.cast(via_tuple(channel_id), {:signal, from_user, to_user, signal})
  end

  def update_voice_state(channel_id, user_id, voice_state) do
    GenServer.cast(via_tuple(channel_id), {:update_state, user_id, voice_state})
  end

  @impl true
  def init(state) do
    {:ok, struct(State, state)}
  end

  @impl true
  def handle_call({:join, user_id}, _from, state) do
    # Create new WebRTC peer connection
    {:ok, peer} = ExWebRTC.PeerConnection.start_link(
      ice_servers: state.ice_servers,
      on_ice_candidate: fn candidate ->
        Broadcaster.broadcast_voice_state(state.channel_id, %{
          type: "ice_candidate",
          from: user_id,
          candidate: candidate
        })
      end
    )

    new_state = put_in(state.sessions[user_id], peer)

    # Notify others in channel
    Broadcaster.broadcast_voice_state(state.channel_id, %{
      type: "user_joined",
      user_id: user_id
    })

    {:reply, {:ok, %{ice_servers: state.ice_servers}}, new_state}
  end

  @impl true
  def handle_cast({:leave, user_id}, state) do
    # Cleanup peer connection
    if peer = state.sessions[user_id] do
      ExWebRTC.PeerConnection.close(peer)
    end

    new_state = %{state | sessions: Map.delete(state.sessions, user_id)}

    # Notify others
    Broadcaster.broadcast_voice_state(state.channel_id, %{
      type: "user_left",
      user_id: user_id
    })

    {:noreply, new_state}
  end

  @impl true
  def handle_cast({:signal, from_user, to_user, signal}, state) do
    case {state.sessions[from_user], state.sessions[to_user], signal} do
      {from_peer, to_peer, %{"type" => "offer"} = offer} when not is_nil(from_peer) and not is_nil(to_peer) ->
        {:ok, answer} = ExWebRTC.PeerConnection.handle_offer(to_peer, offer)

        # Send answer back
        Broadcaster.broadcast_voice_state(state.channel_id, %{
          type: "answer",
          from: to_user,
          to: from_user,
          answer: answer
        })

      {from_peer, to_peer, %{"type" => "answer"} = answer} when not is_nil(from_peer) and not is_nil(to_peer) ->
        ExWebRTC.PeerConnection.handle_answer(from_peer, answer)

      {_from_peer, to_peer, %{"type" => "ice_candidate"} = ice} when not is_nil(to_peer) ->
        ExWebRTC.PeerConnection.add_ice_candidate(to_peer, ice["candidate"])

      _ ->
        Logger.warn("Invalid signal or peer not found")
    end

    {:noreply, state}
  end

  @impl true
  def handle_cast({:update_state, user_id, voice_state}, state) do
    if peer = state.sessions[user_id] do
      # Broadcast state update to other users
      Broadcaster.broadcast_voice_state(state.channel_id, %{
        type: "state_update",
        user_id: user_id,
        self_mute: voice_state.self_mute,
        self_deaf: voice_state.self_deaf,
        speaking: voice_state.speaking
      })
    end

    {:noreply, state}
  end
end

defmodule WS.Workers.Supervisors.VoiceSupervisor do
  use DynamicSupervisor
  require Logger

  def start_link(init_arg) do
    Logger.debug("Starting Voice supervisor")
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      {Registry, keys: :unique, name: WS.Workers.VoiceRegistry}
    ]

    DynamicSupervisor.init(
      strategy: :one_for_one,
      extra_arguments: [children]
    )
  end
end
