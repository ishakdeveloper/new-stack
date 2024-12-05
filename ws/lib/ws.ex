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
