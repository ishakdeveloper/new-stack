defmodule WS.Message do
  defmacro __using__(_opts) do
    quote do
      def handler("register", data, state), do: WS.Message.User.register(data, state)
    end
  end
end
