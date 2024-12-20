defmodule WS.PubSub do
  @moduledoc """
  A distributed PubSub system using Phoenix.PubSub for better scalability.
  """

  require Logger

  @pubsub_name WS.PubSub

  def child_spec(_opts) do
    %{
      id: Phoenix.PubSub.Supervisor,
      start: {Phoenix.PubSub.Supervisor, :start_link, [[name: @pubsub_name]]},
      type: :supervisor
    }
  end

  def subscribe(topic) when is_atom(topic) or is_binary(topic) do
    Logger.debug("Subscribing to topic: #{topic}")
    Phoenix.PubSub.subscribe(@pubsub_name, to_string(topic))
  end

  def unsubscribe(topic) when is_atom(topic) or is_binary(topic) do
    Phoenix.PubSub.unsubscribe(@pubsub_name, to_string(topic))
  end

  def broadcast(topic, message) when is_atom(topic) or is_binary(topic) do
    Logger.debug("Broadcasting to #{topic}: #{inspect(message)}")
    Phoenix.PubSub.broadcast(@pubsub_name, to_string(topic), message)
  end

  def broadcast_from(from_pid, topic, message) when is_pid(from_pid) do
    Phoenix.PubSub.broadcast_from(@pubsub_name, from_pid, to_string(topic), message)
  end

  def broadcast_from!(from_pid, topic, message) when is_pid(from_pid) do
    Phoenix.PubSub.broadcast_from!(@pubsub_name, from_pid, to_string(topic), message)
  end

  def local_broadcast(topic, message) do
    Phoenix.PubSub.local_broadcast(@pubsub_name, to_string(topic), message)
  end

  # Handle PubSub messages after authentication (READY)
  def subscribe_to_user_topics(user_id) do
    Logger.debug("Subscribing to topics for user #{user_id}")

    # User-specific topics
    WS.PubSub.subscribe(WS.PubSub.Topics.user_topic(user_id))
    WS.PubSub.subscribe(WS.PubSub.Topics.presence_topic())
    WS.PubSub.subscribe(WS.PubSub.Topics.friends_topic(user_id))
    WS.PubSub.subscribe(WS.PubSub.Topics.friend_requests_topic(user_id))
  end
end
