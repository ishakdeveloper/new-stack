defmodule WS.PubSub do
  @moduledoc """
  A simple PubSub module using Elixir Registry for broadcasting messages to subscribers.
  """
  require Logger

  def start_link(_) do
    Registry.start_link(keys: :duplicate, name: WS.Registry)
  end

  def child_spec(_opts) do
    %{
      id: WS.PubSub,
      start: {Registry, :start_link, [[keys: :duplicate, name: WS.Registry]]},
      type: :supervisor,
      restart: :permanent
    }
  end

  @doc """
  Subscribes a process to a given topic.
  """
  def subscribe(topic) do
    Logger.debug("PubSub.subscribe: Subscribing to topic: #{topic}")
    Registry.register(WS.Registry, topic, [])
  end

  @doc """
  Unsubscribes a process from a given topic.
  """
  def unsubscribe(topic) do
    Logger.debug("PubSub.unsubscribe: Unsubscribing from topic: #{topic}")
    Registry.unregister(WS.Registry, topic)
  end

  @doc """
  Broadcasts a message to all processes subscribed to a topic.
  """
  def broadcast(topic, message) do
    Logger.debug("PubSub.broadcast: Broadcasting message to topic: #{topic}, message: #{inspect(message)}")
    IO.inspect(topic, label: "TOPIC")
    IO.inspect(message, label: "MESSAGE")
    Registry.dispatch(WS.Registry, topic, fn entries ->
      for {pid, _} <- entries do
        Task.start(fn ->
          send(pid, {:broadcast, message})
        end)
      end
    end)
  end

  @doc """
  Lists all active topics in the PubSub system.
  """
  def list_topics do
    Registry.keys(WS.Registry, self())
    |> Enum.uniq()
  end

  @doc """
  Checks if the current process is subscribed to a given topic.
  """
  def subscribed?(topic) do
    Registry.keys(WS.Registry, self())
    |> Enum.member?(topic)
  end

  def subscribed?(topic, pid) do
    Registry.keys(WS.Registry, pid)
    |> Enum.member?(topic)
  end
end
