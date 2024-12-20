defmodule WS.Workers.SessionStore do
  use GenServer
  require Logger

  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def init(_) do
    :ets.new(:ws_session_lookup, [:named_table, :public, :set])
    :ets.new(:ws_temp_sessions, [:named_table, :public, :set])
    :ets.new(:ws_pid_sessions, [:named_table, :public, :set])
    :ets.new(:ws_active_connections, [:named_table, :public, :set])
    :ets.new(:session_user_mapping, [:named_table, :public, :set])
    {:ok, %{}}
  rescue
    ArgumentError ->
      Logger.warn("ETS tables already exist")
      {:ok, %{}}
  end

  def map_session_to_user(session_token, user_id) do
    :ets.insert(:session_user_mapping, {session_token, user_id})
  end

  def get_user_by_session(session_token) do
    case :ets.lookup(:session_user_mapping, session_token) do
      [{^session_token, user_id}] -> {:ok, user_id}
      [] -> {:error, :not_found}
    end
  end
end
