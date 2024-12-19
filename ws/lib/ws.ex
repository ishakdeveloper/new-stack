defmodule WS do
  @moduledoc false
  import Plug.Conn
  use Plug.Router

  @type json :: String.t() | number | boolean | nil | [json] | %{String.t() => json}

  plug(:set_callers)

  defp get_callers(%Plug.Conn{req_headers: req_headers}) do
    {_, request_bin} = Enum.find(req_headers, fn {key, _} -> key == "user-agent" end)

    List.wrap(
      if is_binary(request_bin) do
        request_bin
        |> Base.decode16!()
        |> :erlang.binary_to_term()
      end
    )
  end

  defp set_callers(conn, _params) do
    Process.put(:"$callers", get_callers(conn))
    conn
  end

  plug WS.Metric.PrometheusExporter

  plug :match
  plug :dispatch

  options _ do
    send_resp(conn, 200, "")
  end

  match _ do
    send_resp(conn, 404, "Not Found")
  end
end
