defmodule WS.GuildSupervisor do
  use DynamicSupervisor
  require Logger

  def start_link(init_arg) do
    Logger.debug("Starting Guild supervisor")
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start_guild(guild_id) do
    Logger.debug("Starting guild process under supervisor for guild_id: #{guild_id}")

    # Start a new Guild process dynamically under the supervisor
    case DynamicSupervisor.start_child(__MODULE__, {WS.Guild, guild_id}) do
      {:ok, pid} ->
        Logger.debug("Successfully started guild process for guild_id: #{guild_id} with PID: #{inspect(pid)}")
        {:ok, pid}

      {:error, reason} ->
        Logger.error("Failed to start guild process for guild_id: #{guild_id}. Reason: #{reason}")
        {:error, reason}
    end
  end

  def terminate_guild(guild_id) do
    Logger.debug("Terminating guild process for guild_id: #{guild_id}")
    case Registry.lookup(WS.GuildSessionRegistry, "guild:#{guild_id}") do
      [{pid, _}] -> DynamicSupervisor.terminate_child(__MODULE__, pid)
      [] -> {:error, :not_found}
    end
  end
end
