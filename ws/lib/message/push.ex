defmodule WS.Message.Push do
  @moduledoc """
  Defines server-initiated messages to clients.
  Example: New messages, presence updates, notifications.
  """

  defmacro __using__(opts) do
    quote do
      use Ecto.Schema
      import Ecto.Changeset
      use WS.Message.Types.Operator

      @behaviour WS.Message.Push

      Module.register_attribute(__MODULE__, :directions, accumulate: true, persist: true)
      @directions [:outbound]

      # Get opcode from module attribute or options
      @opcode unquote(opts[:opcode]) || raise "Push messages must specify an opcode"

      unquote(schema_ast(opts))

      @impl true
      def opcode, do: @opcode

      @impl true
      def encode(data) do
        %{
          "op" => opcode(),
          "d" => data,
          "t" => event_name()
        }
      end

      @impl true
      def event_name, do: __MODULE__ |> Module.split() |> List.last() |> String.upcase()

      defoverridable [event_name: 0]
    end
  end

  def __after_compile__(%{module: module}, _bin) do
    # Add any compile-time validations here if needed
    :ok
  end

  defp schema_ast(opts), do: WS.Message.Cast.schema_ast(opts)

  @callback opcode() :: integer()
  @callback encode(map()) :: map()
  @callback event_name() :: String.t()
  @callback changeset(map()) :: Ecto.Changeset.t()

  @optional_callbacks [changeset: 1]
end
