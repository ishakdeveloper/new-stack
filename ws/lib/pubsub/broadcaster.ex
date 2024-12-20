defmodule WS.PubSub.Broadcaster do
  @moduledoc """
  Helper module for broadcasting messages through PubSub
  """
  alias WS.PubSub.Topics
  require Logger

  # Presence updates
  def broadcast_presence(user_id, presence) do
    WS.PubSub.broadcast(Topics.presence_topic(), {:pubsub, :presence_update, %{
      user_id: user_id,
      presence: presence
    }})
  end

  # Friend-related broadcasts
  def broadcast_friend_request(from_user_id, to_user_id, request) do
    WS.PubSub.broadcast(Topics.friend_requests_topic(to_user_id),
      {:pubsub, :friend_request_received, %{from: from_user_id, request: request}})
  end

  def broadcast_friend_request_declined(from_user_id, to_user_id, request) do
    WS.PubSub.broadcast(Topics.friend_requests_topic(to_user_id),
      {:pubsub, :friend_request_declined, %{from: from_user_id, request: request}})
  end

  def broadcast_friend_added(user_id, friend_id, request) do
    # Broadcast to both users
    WS.PubSub.broadcast(Topics.friends_topic(user_id),
      {:pubsub, :friend_accept, %{friend_id: friend_id, request: request}})
    WS.PubSub.broadcast(Topics.friends_topic(friend_id),
      {:pubsub, :friend_accept, %{friend_id: user_id, request: request}})
  end

  def broadcast_friend_removed(from_user_id, friend_id, request) do
    Logger.debug("""
    Broadcasting friend_removed:
      Remover ID (from_user_id): #{from_user_id}
      Removed friend ID: #{friend_id}
    """)

    # Broadcast to the friend being removed
    topic = Topics.friends_topic(friend_id)

    payload = %{
      removed_by: from_user_id,
      friend_id: friend_id,
      request: %{
        id: request.id,
        from_user_id: from_user_id,
        friend_id: friend_id
      }
    }

    Logger.debug("Broadcasting to #{topic} with payload: #{inspect(payload)}")
    WS.PubSub.broadcast(topic, {:pubsub, :friend_removed, payload})
  end

  # Guild-related broadcasts
  def broadcast_guild_update(guild_id, update) do
    WS.PubSub.broadcast(Topics.guild_topic(guild_id),
      {:pubsub, :guild_update, update})
  end

  # Channel-related broadcasts
  def broadcast_message(channel_id, message) do
    WS.PubSub.broadcast(Topics.channel_topic(channel_id),
      {:pubsub, :message_create, message})
  end

  def broadcast_channel_join(channel_id, user_id) do
    WS.PubSub.broadcast(Topics.channel_topic(channel_id),
      {:pubsub, :channel_join, %{user_id: user_id}})
  end

  def broadcast_typing(channel_id, user_id) do
    WS.PubSub.broadcast(Topics.typing_topic(channel_id),
      {:pubsub, :typing_start, %{user_id: user_id}})
  end

  # Direct messages
  def broadcast_dm(from_user_id, to_user_id, message) do
    topic = Topics.direct_message_topic(from_user_id, to_user_id)
    WS.PubSub.broadcast(topic, {:pubsub, :message_create, message})
  end

  def broadcast_guild_message(guild_id, channel_id, message) do
    Logger.debug("Broadcasting message to guild channel: #{guild_id}:#{channel_id}")

    WS.PubSub.broadcast(
      Topics.guild_channel_topic(guild_id, channel_id),
      {:pubsub, :message_create, message}
    )
  end

  def broadcast_dm_message(channel_id, message) do
    Logger.debug("Broadcasting message to DM channel: #{channel_id}")

    WS.PubSub.broadcast(
      Topics.channel_topic(channel_id),
      {:pubsub, :message_create, message}
    )
  end

  # Guild events
  def broadcast_guild_event(guild_id, event) do
    Logger.debug("Broadcasting guild event to #{guild_id}: #{inspect(event)}")

    WS.PubSub.broadcast(
      Topics.guild_topic(guild_id),
      {:pubsub, :guild_event, event}
    )
  end

  def broadcast_guild_message(guild_id, channel_id, message) do
    Logger.debug("Broadcasting message to guild channel: #{guild_id}:#{channel_id}")

    WS.PubSub.broadcast(
      Topics.guild_channel_topic(guild_id, channel_id),
      {:pubsub, :message_create, message}
    )
  end

  def broadcast_channel_event(channel_id, event) do
    Logger.debug("Broadcasting channel event: #{inspect(event)}")

    WS.PubSub.broadcast(
      Topics.channel_topic(channel_id),
      {:pubsub, :channel_event, event}
    )
  end

  # Friend-related broadcasts
  def broadcast_friend_request(from_user_id, to_user_id, request) do
    WS.PubSub.broadcast(
      Topics.friend_requests_topic(to_user_id),
      {:pubsub, :friend_request_received, %{from: from_user_id, request: request}}
    )
  end

  def broadcast_friend_accept(user_id, friend_id, request) do
    # Broadcast to both users
    WS.PubSub.broadcast(
      Topics.friends_topic(user_id),
      {:pubsub, :friend_accept, %{friend_id: friend_id, request: request}}
    )
    WS.PubSub.broadcast(
      Topics.friends_topic(friend_id),
      {:pubsub, :friend_accept, %{friend_id: user_id, request: request}}
    )
  end

  def broadcast_friend_decline(from_user_id, to_user_id, request) do
    WS.PubSub.broadcast(
      Topics.friend_requests_topic(to_user_id),
      {:pubsub, :friend_request_declined, %{from: from_user_id, request: request}}
    )
  end

  def broadcast_friend_remove(from_user_id, friend_id, request) do
    WS.PubSub.broadcast(
      Topics.friends_topic(friend_id),
      {:pubsub, :friend_removed, %{
        removed_by: from_user_id,
        friend_id: friend_id,
        request: request
      }}
    )
  end
end
