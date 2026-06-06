"""
Windows installer for the Sentinel SOC endpoint agent.

This script stores endpoint settings in agent/.env and creates a Startup folder
shortcut so agent.py begins running when the Windows user signs in.
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
from pathlib import Path


AGENT_DIR = Path(__file__).resolve().parent
ENV_PATH = AGENT_DIR / ".env"
START_BAT = AGENT_DIR / "start_agent.bat"
SILENT_LAUNCHER = AGENT_DIR / "start_agent_silent.vbs"
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


def load_existing_env() -> dict[str, str]:
    if not ENV_PATH.exists():
        return {}

    values = {}
    for raw_line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def env_quote(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def save_env(backend_url: str, endpoint_id: str, pc_name: str, endpoint_token: str) -> None:
    ENV_PATH.write_text(
        "\n".join(
            [
                f"SOC_BACKEND_URL={env_quote(backend_url)}",
                f"SOC_ENDPOINT_ID={env_quote(endpoint_id)}",
                f"SOC_PC_NAME={env_quote(pc_name)}",
                f"SOC_ENDPOINT_TOKEN={env_quote(endpoint_token)}",
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

    target_path = SILENT_LAUNCHER if SILENT_LAUNCHER.exists() else START_BAT
    powershell = f"""
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut('{shortcut_path}')
$Shortcut.TargetPath = '{target_path}'
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


def install_dependencies() -> None:
    requirements_path = AGENT_DIR / "requirements.txt"
    if not requirements_path.exists():
        return

    print("Checking agent dependencies...")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", str(requirements_path)],
            check=True,
        )
    except Exception as exc:
        print(f"Could not install dependencies automatically: {exc}")
        print("If the agent does not start, install Python dependencies manually.")


def start_agent_now() -> None:
    launcher = SILENT_LAUNCHER if SILENT_LAUNCHER.exists() else START_BAT
    if not launcher.exists():
        return

    try:
        subprocess.Popen(
            ["wscript.exe", str(launcher)] if launcher.suffix.lower() == ".vbs" else ["cmd", "/c", "start", "Sentinel SOC Agent", str(launcher)],
            cwd=str(AGENT_DIR),
            shell=False,
        )
        print("Started Sentinel SOC Agent in the background.")
    except Exception as exc:
        print(f"Could not start the agent automatically: {exc}")
        print("You can still start it by double-clicking start_agent.bat.")


def main() -> int:
    print("Sentinel SOC Agent Setup")
    print("========================")
    existing_env = load_existing_env()

    backend_url = existing_env.get("SOC_BACKEND_URL", "").rstrip("/")
    endpoint_id = existing_env.get("SOC_ENDPOINT_ID", "")
    pc_name = existing_env.get("SOC_PC_NAME", "")
    endpoint_token = existing_env.get("SOC_ENDPOINT_TOKEN", "")

    if not all([backend_url, endpoint_id, pc_name, endpoint_token]):
        print("Enter the endpoint values shown in the SOC dashboard.")
        print()
        backend_url = prompt_value("Backend URL", backend_url or "http://127.0.0.1:8000").rstrip("/")
        endpoint_id = prompt_value("Endpoint ID", endpoint_id or None)
        pc_name = prompt_value("PC name", pc_name or socket.gethostname())
        endpoint_token = prompt_value("Endpoint token", endpoint_token or None)
    else:
        print(f"Using dashboard configuration for endpoint {endpoint_id} ({pc_name}).")

    try:
        int(endpoint_id)
    except ValueError:
        print("Endpoint ID must be a number.")
        return 1

    save_env(backend_url, endpoint_id, pc_name, endpoint_token)
    print(f"Saved settings to: {ENV_PATH}")
    install_dependencies()

    try:
        shortcut_path = create_startup_shortcut()
        print(f"Created Windows startup shortcut: {shortcut_path}")
    except Exception as exc:
        print(f"Could not create startup shortcut: {exc}")
        print("You can still start the agent by double-clicking start_agent.bat.")
        return 1

    print()
    print("Setup complete.")
    start_agent_now()
    print("The agent will also start automatically when Windows signs in.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
