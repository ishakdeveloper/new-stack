defmodule Ws.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Registry, keys: :unique, name: WS.SocketRegistry},
      WS.PubSub,
      {WS.SessionSupervisor, []},
      WS.Room,
      {Plug.Cowboy, scheme: :http, plug: Ws, options: [port: 4001, dispatch: dispatch()]}
    ]

    opts = [strategy: :one_for_one, name: Ws.Supervisor]
    Supervisor.start_link(children, opts)
  end

  def init(req, opts) do
    {:ok, req, opts}
  end

  def call(conn, _opts) do
    Plug.Conn.send_resp(conn, 404, "Not Found")
  end

  def dispatch do
    [
      {:_, [
        {"/ws", WS.SocketHandler, []}
      ]}
    ]
  end
end
