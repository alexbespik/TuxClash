#!/usr/bin/env python3
"""
TUX: ROOT PURGE - Model Context Protocol (MCP) Server (JSON-RPC 2.0 Stdio)
Provides external LLMs with complete real-time Game Master powers and non-vision spatial radar.

Connects to the local game runtime via http://localhost:8080/api/
"""

import sys
import json
import urllib.request
import urllib.error
import os

SERVER_NAME = "tux-roguelike-gm"
SERVER_VERSION = "4.0.0"
GAME_API_BASE = os.environ.get("TUX_API_BASE", "http://localhost:8080")

def load_tools_schema():
    schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mcp_tools", "roguelike_gm_mcp.json")
    if os.path.exists(schema_path):
        with open(schema_path, "r") as f:
            data = json.load(f)
            return data.get("tools", [])
    return []

def http_get(path):
    url = f"{GAME_API_BASE}{path}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "TuxMCPServer/4.0"})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        return {"error": f"Game connection failed: {e}. Is 'python3 start.py' running?"}
    except Exception as e:
        return {"error": str(e)}

def http_post(path, payload):
    url = f"{GAME_API_BASE}{path}"
    data = json.dumps(payload).encode("utf-8")
    try:
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "TuxMCPServer/4.0"}
        )
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        return {"error": f"Game connection failed: {e}. Is 'python3 start.py' running?"}
    except Exception as e:
        return {"error": str(e)}

def handle_tool_call(tool_name, arguments):
    if tool_name == "game_get_radar":
        res = http_get("/api/radar")
        if "error" in res:
            return f"Error: {res['error']}"
        ascii_map = res.get("asciiMap", "No radar data available yet.")
        pos = res.get("playerGridPos", {})
        legend = res.get("legend", {})
        return (
            f"=== 2D TACTICAL ASCII RADAR MAP (Centered on Player @ Tx={pos.get('tx', 0)}, Ty={pos.get('ty', 0)}) ===\n"
            f"{ascii_map}\n\n"
            f"Legend: {json.dumps(legend)}"
        )

    elif tool_name == "game_get_tactical_overview":
        res = http_get("/api/tactical")
        if "error" in res:
            return f"Error: {res['error']}"
        return json.dumps(res, indent=2)

    elif tool_name == "game_command_enemy":
        directive = {
            "action": "command_enemy",
            "enemy": arguments.get("enemy"),
            "command": arguments.get("command"),
            "params": arguments.get("params", {})
        }
        res = http_post("/api/directive", directive)
        return json.dumps(res, indent=2)

    elif tool_name == "game_command_all_enemies":
        directive = {
            "action": "command_all_enemies",
            "command": arguments.get("command")
        }
        res = http_post("/api/directive", directive)
        return json.dumps(res, indent=2)

    elif tool_name == "game_mutate_enemy":
        directive = {
            "action": "mutate_enemy",
            "enemy": arguments.get("enemy"),
            "modifiers": arguments.get("modifiers", {})
        }
        res = http_post("/api/directive", directive)
        return json.dumps(res, indent=2)

    elif tool_name == "game_force_boss_phase":
        directive = {
            "action": "force_boss_phase",
            "boss": arguments.get("boss"),
            "phase": arguments.get("phase")
        }
        res = http_post("/api/directive", directive)
        return json.dumps(res, indent=2)

    elif tool_name == "game_warp_realm":
        directive = {
            "action": "warp_biome",
            "biome": arguments.get("biome"),
            "objective": arguments.get("objective", "DEFEND_SERVERS"),
            "tier": arguments.get("tier", 1)
        }
        res = http_post("/api/directive", directive)
        return json.dumps(res, indent=2)

    elif tool_name == "game_grant_buff":
        directive = {
            "action": "grant_buff",
            "buff": arguments.get("buff"),
            "duration": arguments.get("duration", 999999)
        }
        res = http_post("/api/directive", directive)
        return json.dumps(res, indent=2)

    elif tool_name == "game_give_weapon":
        directive = {
            "action": "give_weapon",
            "weapon": arguments.get("weapon")
        }
        res = http_post("/api/directive", directive)
        return json.dumps(res, indent=2)

    elif tool_name == "game_set_attack_tokens":
        directive = {
            "action": "set_attack_tokens",
            "maxTokens": arguments.get("maxTokens", 4)
        }
        res = http_post("/api/directive", directive)
        return json.dumps(res, indent=2)

    elif tool_name == "game_trigger_hitstop":
        directive = {
            "action": "trigger_hitstop",
            "duration": arguments.get("duration", 0.05)
        }
        res = http_post("/api/directive", directive)
        return json.dumps(res, indent=2)

    elif tool_name == "game_spawn_boss":
        directive = {
            "action": "spawn_boss",
            "bossId": arguments.get("bossId"),
            "x": arguments.get("x"),
            "y": arguments.get("y")
        }
        res = http_post("/api/directive", directive)
        return json.dumps(res, indent=2)

    elif tool_name == "game_inject_comms":
        directive = {
            "action": "comms",
            "speaker": arguments.get("speaker"),
            "message": arguments.get("message"),
            "color": arguments.get("color", "#38bdf8"),
            "icon": arguments.get("icon", "📻")
        }
        res = http_post("/api/directive", directive)
        return json.dumps(res, indent=2)

    return f"Unknown tool: {tool_name}"

def send_json_rpc(response_dict):
    out = json.dumps(response_dict)
    sys.stdout.write(out + "\n")
    sys.stdout.flush()

def main():
    tools = load_tools_schema()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except Exception as e:
            continue

        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params", {})

        if method == "initialize":
            send_json_rpc({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "serverInfo": {
                        "name": SERVER_NAME,
                        "version": SERVER_VERSION
                    },
                    "capabilities": {
                        "tools": {}
                    }
                }
            })

        elif method == "notifications/initialized":
            # Handshake complete
            pass

        elif method == "tools/list":
            send_json_rpc({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "tools": tools
                }
            })

        elif method == "tools/call":
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            try:
                result_text = handle_tool_call(tool_name, arguments)
                send_json_rpc({
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": str(result_text)
                            }
                        ]
                    }
                })
            except Exception as e:
                send_json_rpc({
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {
                        "code": -32000,
                        "message": str(e)
                    }
                })

        elif req_id is not None:
            send_json_rpc({
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32601,
                    "message": f"Method '{method}' not found"
                }
            })

if __name__ == "__main__":
    main()
