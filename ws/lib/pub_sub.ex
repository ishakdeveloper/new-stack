defmodule WS.PubSub do
  @moduledoc """
  A simple PubSub module using Elixir Registry for broadcasting messages to subscribers.
  """

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
    Registry.register(WS.Registry, topic, [])
  end

  @doc """
  Unsubscribes a process from a given topic.
  """
  def unsubscribe(topic) do
    Registry.unregister(WS.Registry, topic)
  end

  @doc """
  Broadcasts a message to all processes subscribed to a topic.
  """
  def broadcast(topic, message) do
    IO.inspect(topic, label: "TOPIC")
    IO.inspect(message, label: "MESSAGE")
    Registry.dispatch(WS.Registry, topic, fn entries ->
      for {pid, _} <- entries do
        send(pid, {:broadcast, message})
      end
    end)
  end
end
