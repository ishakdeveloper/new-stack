defmodule Ws do
 @moduledoc false
 use Plug.Router

 plug :match
 plug :dispatch

 get "/" do
   send_resp(conn, 200, "Welcome to the WebSocket server!")
  end

  match _ do
    send_resp(conn, 404, "Not Found")
  end
end

defmodule WS.User do
  @moduledoc """
  Represents a user in the system.
  """
  defstruct [:id, :name, :email, :image, :created_at, :updated_at]

  @type t :: %__MODULE__{
          id: String.t(),
          name: String.t(),
          email: String.t(),
          image: nil | String.t(),
          created_at: DateTime.t(),
          updated_at: DateTime.t()
        }
end
