defmodule WS.PubSub.Broadcaster do
  @moduledoc """
  Helper module for broadcasting messages through PubSub
  """
  alias WS.PubSub.Topics
  require Logger

  # User & Presence Events
  def broadcast_presence(user_id, presence) do
    WS.PubSub.broadcast(Topics.presence_topic(), {:pubsub, :presence_update, %{
      user_id: user_id,
      presence: presence
    }})
  end

  def broadcast_user_update(user_id, update) do
    WS.PubSub.broadcast(Topics.user_topic(user_id),
      {:pubsub, :user_updated, update})
  end

  def broadcast_user_settings_update(user_id, settings) do
    WS.PubSub.broadcast(Topics.user_settings_topic(user_id),
      {:pubsub, :user_settings_updated, settings})
  end

  def broadcast_user_connections_update(user_id, connections) do
    WS.PubSub.broadcast(Topics.user_connections_topic(user_id),
      {:pubsub, :user_connections_updated, connections})
  end

  # Guild Events
  def broadcast_guild_update(guild_id, update) do
    WS.PubSub.broadcast(Topics.guild_topic(guild_id),
      {:pubsub, :guild_updated, update})
  end

  def broadcast_guild_member_update(guild_id, member) do
    WS.PubSub.broadcast(Topics.guild_members_topic(guild_id),
      {:pubsub, :guild_member_updated, member})
  end

  def broadcast_guild_role_update(guild_id, role) do
    WS.PubSub.broadcast(Topics.guild_roles_topic(guild_id),
      {:pubsub, :guild_role_updated, role})
  end

  # Channel Events
  def broadcast_channel_create(guild_id, channel) do
    WS.PubSub.broadcast(Topics.guild_topic(guild_id),
      {:pubsub, :user_created_channel, channel})
  end

  def broadcast_channel_update(channel_id, update) do
    WS.PubSub.broadcast(Topics.channel_topic(channel_id),
      {:pubsub, :user_updated_channel, update})
  end

  def broadcast_channel_delete(guild_id, channel_id) do
    WS.PubSub.broadcast(Topics.guild_topic(guild_id),
      {:pubsub, :user_deleted_channel, %{channel_id: channel_id}})
  end

  def broadcast_channel_pins_update(channel_id, pins) do
    WS.PubSub.broadcast(Topics.channel_pins_topic(channel_id),
      {:pubsub, :channel_pins_updated, pins})
  end

  # Message Events
  def broadcast_message(channel_id, message) do
    WS.PubSub.broadcast(Topics.message_topic(channel_id),
      {:pubsub, :message_create, message})
  end

  def broadcast_message_update(channel_id, message) do
    WS.PubSub.broadcast(Topics.message_topic(channel_id),
      {:pubsub, :message_updated, message})
  end

  def broadcast_message_delete(channel_id, message_id) do
    WS.PubSub.broadcast(Topics.message_topic(channel_id),
      {:pubsub, :message_deleted, %{message_id: message_id}})
  end

  def broadcast_message_reaction(message_id, reaction) do
    WS.PubSub.broadcast(Topics.message_reactions_topic(message_id),
      {:pubsub, :message_reaction_added, reaction})
  end

  # Thread Events
  def broadcast_thread_create(channel_id, thread) do
    WS.PubSub.broadcast(Topics.channel_topic(channel_id),
      {:pubsub, :thread_created, thread})
  end

  def broadcast_thread_update(thread_id, update) do
    WS.PubSub.broadcast(Topics.thread_topic(thread_id),
      {:pubsub, :thread_updated, update})
  end

  def broadcast_thread_members_update(thread_id, members) do
    WS.PubSub.broadcast(Topics.thread_members_topic(thread_id),
      {:pubsub, :thread_members_updated, members})
  end

  # Voice Events
  def broadcast_voice_state(guild_id, state) do
    WS.PubSub.broadcast(Topics.voice_state_topic(guild_id),
      {:pubsub, :voice_state_updated, state})
  end

  def broadcast_voice_event(channel_id, event) do
    WS.PubSub.broadcast(Topics.voice_topic(channel_id),
      {:pubsub, :voice_event, event})
  end

  # Friend Events (keeping existing implementations)
  def broadcast_friend_request(from_user_id, to_user_id, request) do
    WS.PubSub.broadcast(Topics.friend_requests_topic(to_user_id),
      {:pubsub, :friend_request_received, %{from: from_user_id, request: request}})
  end

  def broadcast_friend_accept(user_id, friend_id, request) do
    WS.PubSub.broadcast(Topics.friends_topic(user_id),
      {:pubsub, :friend_accept, %{friend_id: friend_id, request: request}})
    WS.PubSub.broadcast(Topics.friends_topic(friend_id),
      {:pubsub, :friend_accept, %{friend_id: user_id, request: request}})
  end

  def broadcast_friend_decline(from_user_id, to_user_id, request) do
    WS.PubSub.broadcast(Topics.friend_requests_topic(to_user_id),
      {:pubsub, :friend_request_declined, %{from: from_user_id, request: request}})
  end

  def broadcast_friend_remove(from_user_id, friend_id, request) do
    WS.PubSub.broadcast(Topics.friends_topic(friend_id),
      {:pubsub, :friend_removed, %{
        removed_by: from_user_id,
        friend_id: friend_id,
        request: request
      }})
  end

  # Typing Indicators
  def broadcast_typing(channel_id, user_id) do
    WS.PubSub.broadcast(Topics.typing_topic(channel_id),
      {:pubsub, :typing_started, %{user_id: user_id}})
  end

  def broadcast_typing_stop(channel_id, user_id) do
    WS.PubSub.broadcast(Topics.typing_topic(channel_id),
      {:pubsub, :typing_stopped, %{user_id: user_id}})
  end

  def broadcast_to_guild(guild_id, message) do
    WS.PubSub.broadcast(Topics.guild_topic(guild_id), message)
  end
end
