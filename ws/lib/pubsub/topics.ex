defmodule WS.PubSub.Topics do
  @moduledoc """
  Defines all PubSub topics and helpers for subscription/broadcasting
  """

  # User-related topics
  def user_topic(user_id), do: "users:#{user_id}"
  def presence_topic, do: "presence"
  def friends_topic(user_id), do: "friends:#{user_id}"
  def friend_requests_topic(user_id), do: "friend_requests:#{user_id}"
  def user_settings_topic(user_id), do: "users:#{user_id}:settings"
  def user_connections_topic(user_id), do: "users:#{user_id}:connections"

  # Guild-related topics
  def guild_topic(guild_id), do: "guild:#{guild_id}"
  def guild_members_topic(guild_id), do: "guilds:#{guild_id}:members"
  def guild_roles_topic(guild_id), do: "guilds:#{guild_id}:roles"
  def guild_channel_topic(guild_id, channel_id), do: "guild:#{guild_id}:channel:#{channel_id}"

  # Channel-related topics
  def channel_topic(channel_id), do: "channel:#{channel_id}"
  def channel_pins_topic(channel_id), do: "channel:#{channel_id}:pins"
  def direct_message_topic(user1_id, user2_id) do
    [user1_id, user2_id]
    |> Enum.sort()
    |> Enum.join(":")
    |> then(&"dm:#{&1}")
  end

  # Message-related topics
  def message_topic(channel_id), do: "messages:#{channel_id}"
  def message_reactions_topic(message_id), do: "messages:#{message_id}:reactions"

  # Thread-related topics
  def thread_topic(thread_id), do: "thread:#{thread_id}"
  def thread_members_topic(thread_id), do: "thread:#{thread_id}:members"

  # Voice-related topics
  def voice_topic(channel_id), do: "voice:#{channel_id}"
  def voice_state_topic(channel_id), do: "voice:#{channel_id}:state"
  def voice_signal_topic(channel_id), do: "voice:#{channel_id}:signal"

  # Typing indicators
  def typing_topic(channel_id), do: "typing:#{channel_id}"
end
