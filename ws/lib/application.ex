defmodule WS.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      WS.Message.PubSub,
      WS.Workers.Supervisors.UserSessionSupervisor,
      WS.Workers.Supervisors.ChatSupervisor,
      WS.Workers.Supervisors.GuildSessionSupervisor,
      WS.Workers.Supervisors.ChannelSupervisor,
      {Plug.Cowboy, scheme: :http, plug: WS, options: [port: 4001, dispatch: dispatch()]}
    ]

    opts = [strategy: :one_for_one, name: WS.Supervisor]
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
        {"/ws", WS.Message.SocketHandler, []}
      ]}
    ]
  end
end
