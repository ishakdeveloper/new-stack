defmodule WS.PubSub do
  @moduledoc """
  A PubSub module inspired by Phoenix PubSub, using Elixir's :pg module for broadcasting messages.
  """
  require Logger

  @registry WS.Registry

  # Starts the :pg process with the specified registry.
  def start_link(_) do
    :pg.start_link(@registry)
  end

  # Child spec for supervision.
  def child_spec(_opts) do
    %{
      id: WS.PubSub,
      start: {:pg, :start_link, [@registry]},
      type: :supervisor,
      restart: :permanent
    }
  end

  @doc """
  Subscribes the calling process to a topic.
  """
  def subscribe(topic) when is_atom(topic) or is_binary(topic) do
    Logger.debug("PubSub.subscribe: Subscribing to topic: #{topic}")
    :pg.join(@registry, topic, self())
  end

  @doc """
  Unsubscribes the calling process from a topic.
  """
  def unsubscribe(topic) when is_atom(topic) or is_binary(topic) do
    Logger.debug("PubSub.unsubscribe: Unsubscribing from topic: #{topic}")
    :pg.leave(@registry, topic, self())
  end

  @doc """
  Broadcasts a message to all subscribers of a topic.
  """
  def broadcast(topic, message) when is_atom(topic) or is_binary(topic) do
    Logger.debug("PubSub.broadcast: Broadcasting message to topic: #{topic}, message: #{inspect(message)}")

    :pg.get_members(@registry, topic)
    |> Enum.each(fn pid ->
      Task.start(fn -> send(pid, {:pubsub, topic, message}) end)
    end)

    :ok
  end

  @doc """
  Broadcasts a message to all subscribers of a topic, excluding the sender.
  """
  def broadcast_from(from_pid, topic, message) when is_pid(from_pid) do
    Logger.debug("PubSub.broadcast_from: Broadcasting message from #{inspect(from_pid)} to topic: #{topic}")

    :pg.get_members(@registry, topic)
    |> Enum.reject(&(&1 == from_pid)) # Exclude the sender
    |> Enum.each(fn pid ->
      Task.start(fn -> send(pid, {:pubsub, topic, message}) end)
    end)

    :ok
  end

  @doc """
  Same as `broadcast_from/3`, but raises an error if the broadcast fails.
  """
  def broadcast_from!(from_pid, topic, message) when is_pid(from_pid) do
    case broadcast_from(from_pid, topic, message) do
      :ok -> :ok
      _ -> raise "PubSub broadcast_from! failed for topic: #{topic}"
    end
  end

  @doc """
  Broadcasts a message locally, bypassing distribution (for single-node use).
  """
  def local_broadcast(topic, message) do
    Logger.debug("PubSub.local_broadcast: Broadcasting message locally to topic: #{topic}")

    :pg.get_local_members(@registry, topic) # Only local node processes
    |> Enum.each(fn pid ->
      Task.start(fn -> send(pid, {:pubsub, topic, message}) end)
    end)

    :ok
  end

  @doc """
  Lists all topics in the PubSub system.
  """
  def list_topics do
    :pg.which_groups(@registry)
  end

  @doc """
  Checks if the calling process is subscribed to a topic.
  """
  def subscribed?(topic) do
    self() in :pg.get_members(@registry, topic)
  end

  @doc """
  Checks if the given process is subscribed to a topic.
  """
  def subscribed?(topic, pid) do
    pid in :pg.get_members(@registry, topic)
  end
end
