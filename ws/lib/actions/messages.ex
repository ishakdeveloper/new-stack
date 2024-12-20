defmodule WS.Actions.Messages do
  alias WS.Messages.MessageCreate
  import Ecto.Changeset

  def handle(changeset, state) do
    with {:ok, message} <- apply_changes(changeset),
         encoded_message <- MessageCreate.encode(message) do

      WS.PubSub.broadcast("channel:#{message.channel_id}", encoded_message)
      {:noreply, state}
    end
  end
end
