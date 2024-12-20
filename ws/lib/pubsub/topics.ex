defmodule WS.PubSub.Topics do
  @moduledoc """
  Defines all PubSub topics and helpers for subscription/broadcasting
  """

  # User-related topics
  def user_topic(user_id), do: "users:#{user_id}"
  def presence_topic, do: "presence"
  def friends_topic(user_id), do: "friends:#{user_id}"
  def friend_requests_topic(user_id), do: "friend_requests:#{user_id}"

  # Guild-related topics
  def guild_topic(guild_id), do: "guild:#{guild_id}"
  def guild_members_topic(guild_id), do: "guilds:#{guild_id}:members"
  def guild_channel_topic(guild_id, channel_id), do: "guild:#{guild_id}:channel:#{channel_id}"

  # Channel-related topics
  def channel_topic(channel_id), do: "channel:#{channel_id}"
  def direct_message_topic(user1_id, user2_id) do
    [user1_id, user2_id]
    |> Enum.sort()
    |> Enum.join(":")
    |> then(&"dm:#{&1}")
  end

  # Typing indicators
  def typing_topic(channel_id), do: "typing:#{channel_id}"

  # Voice
  def voice_topic(channel_id), do: "voice:#{channel_id}"
end
