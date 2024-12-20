defmodule WS.Messages.User.Presence do
  use WS.Message.Push,
    opcode: :presence_update

  use WS.Message.Types.Operator

  @derive Jason.Encoder
  embedded_schema do
    field :status, :string
    field :custom_status, :string
  end

  def changeset(params) do
    %__MODULE__{}
    |> cast(params, [:status, :custom_status])
    |> validate_required([:status])
    |> validate_inclusion(:status, ["online", "dnd", "offline"])
  end

  def execute(changeset, state) do
    with {:ok, presence_data} <- apply_action(changeset, :update) do
      # Update presence in global Presence
      WS.Workers.Presence.update_presence(state.user_id, presence_data)

      # Update user session
      WS.Workers.UserSession.update_presence(state.user_id, presence_data)

      # Return updated state
      {:ok, %{state | presence: presence_data}}
    end
  end

  def event_name, do: "PRESENCE_UPDATE"
end
