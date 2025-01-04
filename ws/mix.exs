defmodule Ws.MixProject do
  use Mix.Project

  def project do
    [
      app: :ws,
      version: "0.1.0",
      elixir: "~> 1.17",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      extra_applications: [:logger],
      mod: {WS.Application, []}
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:plug_cowboy, "~> 2.7"},
      {:jason, "~> 1.4"},
      {:prometheus_ex, "~> 3.1"},
      {:prometheus_plugs, "~> 1.1.5"},
      {:ecto, "~> 3.10"},
      {:ecto_enum, "~> 1.4"},
      {:amqp, "~> 4.0.0"},
      {:ranch, "~> 2.1.0", override: true},
      {:phoenix_pubsub, "~> 2.1.3"},
      {:ex_webrtc, "~> 0.7.0"}
    ]
  end
end
