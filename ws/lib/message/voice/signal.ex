defmodule WS.Messages.Voice.Signal do
  use WS.Message.Push,
    opcode: :voice_signal

  embedded_schema do
    field :channel_id, :string
    field :to_user, :string
    field :signal, :map
  end

  def execute(changeset, state) do
    with {:ok, data} <- apply_action(changeset, :validate) do
      WS.Workers.Voice.handle_signal(
        data.channel_id,
        state.user_id,
        data.to_user,
        data.signal
      )
      {:ok, state}
    end
  end
end
