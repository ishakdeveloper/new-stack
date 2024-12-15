defmodule MyApp.PubSub do
  use GenServer

  # API

  @doc """
  Starts the PubSub manager and its supervision tree.
  """
  def start_link(_) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  @doc """
  Subscribes the caller process to a topic.
  """
  def subscribe(topic) do
    :ok = Registry.register(MyApp.PubSub.Registry, topic, [])
    :ok
  end

  @doc """
  Unsubscribes the caller process from a topic.
  """
  def unsubscribe(topic) do
    Registry.unregister(MyApp.PubSub.Registry, topic)
  end

  @doc """
  Broadcasts a message to all subscribers of a topic.
  """
  def broadcast(topic, message) do
    subscribers = Registry.lookup(MyApp.PubSub.Registry, topic)

    for {pid, _} <- subscribers do
      send(pid, {:pubsub, topic, message})
    end

    :ok
  end

  # GenServer Callbacks

  def init(_) do
    {:ok, %{}}
  end
end
