defmodule WS.Message do
  @moduledoc """
  Defines the structure and validation for WebSocket messages.

  Format (both directions):
  {
    "op": opcode_number,
    "d": data_payload,
    "s": sequence_number (optional),
    "t": event_name (optional)
  }
  """
  use Ecto.Schema
  import Ecto.Changeset
  require Logger

  @primary_key false
  embedded_schema do
    field :op, :integer
    field :d, :map
    field :s, :integer
    field :t, :string
  end

  @type t :: %__MODULE__{
    op: integer(),
    d: map(),
    s: integer() | nil,
    t: String.t() | nil
  }

  def changeset(data, _state) do
    %__MODULE__{}
    |> cast(data, [:op, :d, :s, :t])
    |> validate_required([:op, :d])
    |> validate_number(:op, greater_than_or_equal_to: 0)
  end

  @doc """
  Creates a message for sending to the client
  """
  def create(opcode, data, sequence \\ nil, event_type \\ nil) do
    %{
      op: opcode,
      d: data,
      s: sequence,
      t: event_type
    }
  end

  @doc """
  Encodes and compresses a message for sending
  """
  def encode(message) when is_struct(message) do
    # Get the module's opcode
    opcode = message.__struct__.opcode()

    # Get the event name if it exists
    event_name = if function_exported?(message.__struct__, :event_name, 0) do
      message.__struct__.event_name()
    else
      nil
    end

    # Build the message payload
    payload = %{
      "op" => opcode,
      "d" => message,
      "t" => event_name
    }

    Jason.encode!(payload)
  end

  # Handle map case (for heartbeat responses)
  def encode(message) when is_map(message) do
    # For non-struct messages, assume it's a simple response
    payload = %{
      "op" => :heartbeat_ack,
      "d" => message,
      "t" => nil
    }

    Jason.encode!(payload)
  end

  @doc """
  Decodes and decompresses a received message
  """
  def decode(binary) do
    with {:ok, decompressed} <- decompress(binary),
         {:ok, decoded} <- Jason.decode(decompressed) do
      {:ok, decoded}
    end
  end

  defp decompress(data) do
    try do
      {:ok, :zlib.uncompress(data)}
    rescue
      _ -> {:error, :decompression_failed}
    end
  end

  def handle(message, state) when is_map(message) do
    Logger.debug("Handling message: #{inspect(message)}")

    # Validate the message structure
    with {:ok, validated} <- validate_payload(message),
         {:ok, handler} <- get_handler(validated["op"]),
         {:ok, changeset} <- create_changeset(handler, validated["d"]) do
      # Execute the handler with the validated changeset
      handler.execute(changeset, state)
    else
      {:error, reason} ->
        Logger.error("Error handling message: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp validate_payload(message) do
    Logger.debug("Validating payload: #{inspect(message)}")

    case message do
      %{"op" => op} when not is_nil(op) ->
        Logger.debug("Payload valid with op: #{inspect(op)} and data: #{inspect(message["d"])}")
        {:ok, message}
      _ ->
        {:error, :invalid_payload}
    end
  end

  defp get_handler(opcode) do
    Logger.debug("Getting handler for opcode: #{inspect(opcode)}")

    case WS.Message.Manifest.get_handler(opcode) do
      {:ok, handler} ->
        Logger.debug("Found handler: #{inspect(handler)}")
        {:ok, handler}
      {:error, reason} ->
        Logger.debug("No handler found: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp create_changeset(handler, data) do
    Logger.debug("Creating changeset with handler: #{inspect(handler)} and data: #{inspect(data)}")

    try do
      changeset = handler.changeset(data)
      if changeset.valid? do
        Logger.debug("Changeset valid: #{inspect(Ecto.Changeset.apply_changes(changeset))}")
        {:ok, changeset}
      else
        Logger.error("Changeset invalid: #{inspect(changeset.errors)}")
        {:error, :validation_failed}
      end
    rescue
      e ->
        Logger.error("Error creating changeset: #{inspect(e)}")
        {:error, :changeset_error}
    end
  end
end
