defmodule WS.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    import Supervisor.Spec, warn: false

    :ets.new(:ws_connections, [:set, :public, :named_table])

    WS.Metric.PrometheusExporter.setup()
    WS.Metric.PipelineInstrumenter.setup()
    WS.Metric.UserSessions.setup()

    children = [
      WS.Workers.Supervisors.RegistrySupervisor,
      WS.Workers.Supervisors.UserSessionSupervisor,
      WS.Workers.SessionStore,
      WS.Workers.Supervisors.RabbitSupervisor,
      WS.PubSub,
      WS.Workers.Supervisors.ChatSupervisor,
      WS.Workers.Supervisors.GuildSessionSupervisor,
      WS.Workers.Supervisors.ChannelSupervisor,
      WS.Workers.Telemetry,
      {Plug.Cowboy, scheme: :http, plug: WS, options: [port: 4001, dispatch: dispatch(), protocol_options: [idle_timeout: :infinity]]},
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

  defp dispatch do
    [
      {:_, [
        {"/ws", WS.Message.SocketHandler, []},
        {:_, Plug.Cowboy.Handler, {WS.Router, []}}
      ]}
    ]
  end
end
