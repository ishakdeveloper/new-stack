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
      mod: {Ws.Application, []}
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:cowboy, "~> 2.9"},
      {:plug_cowboy, "~> 2.5"},
      {:jason, "~> 1.4"},
    ]
  end
end
