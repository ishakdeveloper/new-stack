defmodule WsTest do
  use ExUnit.Case
  doctest Ws

  test "greets the world" do
    assert Ws.hello() == :world
  end
end
