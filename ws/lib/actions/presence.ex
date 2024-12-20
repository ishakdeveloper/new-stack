defmodule WS.Actions.Presence do
  import Ecto.Changeset

  def handle(changeset, state) do
    with {:ok, presence} <- apply_changes(changeset) do
      WS.PubSub.broadcast("presence:#{state.user.id}", {
        :presence_update,
        presence
      })
      {:noreply, state}
    end
  end
end
