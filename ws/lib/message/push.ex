defmodule WS.Message.Push do
  @moduledoc """
  API contract statement for push message modules
  """

  alias WS.Message.Cast

  defmacro __using__(opts) do
    quote do
      use Ecto.Schema
      import Ecto.Changeset

      @behaviour WS.Message.Push

      Module.register_attribute(__MODULE__, :directions, accumulate: true, persist: true)
      @directions [:outbound]

      unquote(Cast.schema_ast(opts))

      @after_compile WS.Message.Push
    end
  end

  @callback changeset(WS.json()) :: Ecto.Changeset.t()
  @callback operation() :: String.t()

  @optional_callbacks [changeset: 1, operation: 0]

  def __after_compile__(%{module: module}, _bin) do
    # checks to make sure you've either declared a schema module, or you have
    # implemented a schema
    Cast.check_for_schema(module, :outbound)
  end
end
