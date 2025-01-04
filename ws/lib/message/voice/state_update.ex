defmodule WS.Messages.Voice.StateUpdate do
  use WS.Message.Push,
    opcode: :voice_state_update

  embedded_schema do
    field :channel_id, :string
    field :guild_id, :string
    field :self_mute, :boolean, default: false
    field :self_deaf, :boolean, default: false
    field :speaking, :boolean, default: false
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:channel_id, :guild_id, :self_mute, :self_deaf, :speaking])
    |> validate_required([:self_mute, :self_deaf])
  end

  def execute(changeset, state) do
    with {:ok, voice_state} <- apply_action(changeset, :validate) do
      case voice_state.channel_id do
        nil ->
          # User is leaving voice
          WS.Workers.Voice.leave_voice(state.current_voice_channel, state.user_id)
          {:ok, %{state | current_voice_channel: nil}}

        channel_id ->
          # User is joining or updating voice state
          WS.Workers.Voice.update_voice_state(channel_id, state.user_id, voice_state)
          {:ok, %{state | current_voice_channel: channel_id}}
      end
    end
  end
end
