defmodule WS.User do
  @moduledoc """
  User management module for handling user-related operations and state.
  """

  defstruct [:id, :name, :email, :image, :created_at, :updated_at]

  @type t :: %__MODULE__{
    id: String.t(),
    name: String.t(),
    email: String.t(),
    image: String.t() | nil,
    created_at: String.t(),
    updated_at: String.t()
  }

  @doc """
  Registers a new user session.
  """
  def register(user_data) do
    WS.UserSession.register_user(user_id: user_data.id)
  end

  @doc """
  Removes a user session.
  """
  def remove(user_id) when is_binary(user_id) do
    WS.UserSession.remove_user(user_id)
  end

  @doc """
  Sets the active WebSocket connection for a user.
  """
  def set_active_socket(user_id, socket_pid) when is_binary(user_id) and is_pid(socket_pid) do
    WS.UserSession.set_active_ws(user_id, socket_pid)
  end

  @doc """
  Sends a WebSocket message to a user.
  """
  def send_message(user_id, payload) when is_binary(user_id) do
    WS.UserSession.send_ws(user_id, payload)
  end

  @doc """
  Sends a friend request from one user to another.
  """
  def send_friend_request(from_user, to_user_id) when is_binary(to_user_id) do
    notification = %{
      "type" => "friend_request",
      "username" => from_user.name
    }
    send_message(to_user_id, notification)
  end

  @doc """
  Declines a friend request from one user to another.
  """
  def decline_friend_request(from_user, to_user_id) when is_binary(to_user_id) do
    notification = %{
      "type" => "friend_request_declined",
      "username" => from_user.name
    }
    send_message(to_user_id, notification)
  end
end
