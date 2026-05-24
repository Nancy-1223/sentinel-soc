"""
Windows installer for the Sentinel SOC endpoint agent.

This script stores endpoint settings in agent/.env and creates a Startup folder
shortcut so agent.py begins running when the Windows user signs in.
"""

from __future__ import annotations

import os
import socket
import subprocess
from pathlib import Path


AGENT_DIR = Path(__file__).resolve().parent
ENV_PATH = AGENT_DIR / ".env"
START_BAT = AGENT_DIR / "start_agent.bat"
SHORTCUT_NAME = "Sentinel SOC Agent.lnk"


def prompt_value(label: str, default: str | None = None) -> str:
    prompt = f"{label}"
    if default:
        prompt += f" [{default}]"
    prompt += ": "

    value = input(prompt).strip()
    if value:
        return value
    if default:
        return default
    return prompt_value(label, default)


def env_quote(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def save_env(backend_url: str, endpoint_id: str, pc_name: str) -> None:
    ENV_PATH.write_text(
        "\n".join(
            [
                f"SOC_BACKEND_URL={env_quote(backend_url)}",
                f"SOC_ENDPOINT_ID={env_quote(endpoint_id)}",
                f"SOC_PC_NAME={env_quote(pc_name)}",
                "",
            ]
        ),
        encoding="utf-8",
    )


def get_startup_folder() -> Path:
    appdata = os.environ.get("APPDATA")
    if not appdata:
        raise RuntimeError("APPDATA is not set; cannot find the Windows Startup folder.")

    return (
        Path(appdata)
        / "Microsoft"
        / "Windows"
        / "Start Menu"
        / "Programs"
        / "Startup"
    )


def create_startup_shortcut() -> Path:
    startup_folder = get_startup_folder()
    startup_folder.mkdir(parents=True, exist_ok=True)
    shortcut_path = startup_folder / SHORTCUT_NAME

    powershell = f"""
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut('{shortcut_path}')
$Shortcut.TargetPath = '{START_BAT}'
$Shortcut.WorkingDirectory = '{AGENT_DIR}'
$Shortcut.WindowStyle = 7
$Shortcut.Description = 'Starts the Sentinel SOC endpoint agent'
$Shortcut.Save()
"""
    subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", powershell],
        check=True,
    )
    return shortcut_path


def main() -> int:
    print("Sentinel SOC Agent Setup")
    print("========================")
    print("Enter the endpoint values shown in the SOC dashboard.")
    print()

    backend_url = prompt_value("Backend URL", "http://127.0.0.1:8000").rstrip("/")
    endpoint_id = prompt_value("Endpoint ID")
    pc_name = prompt_value("PC name", socket.gethostname())

    try:
        int(endpoint_id)
    except ValueError:
        print("Endpoint ID must be a number.")
        return 1

    save_env(backend_url, endpoint_id, pc_name)
    print(f"Saved settings to: {ENV_PATH}")

    try:
        shortcut_path = create_startup_shortcut()
        print(f"Created Windows startup shortcut: {shortcut_path}")
    except Exception as exc:
        print(f"Could not create startup shortcut: {exc}")
        print("You can still start the agent by double-clicking start_agent.bat.")
        return 1

    print()
    print("Setup complete.")
    print("Double-click start_agent.bat to start now, or restart/sign in to start automatically.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
