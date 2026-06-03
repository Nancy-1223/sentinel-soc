"""
Day 2 Endpoint Agent for the AI-Based SOC Virus Detection System.

This agent is for safe college-demo testing only. Use EICAR test files or fake
suspicious scripts. Do not test with real malware.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import socket
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import psutil
import requests
from requests import RequestException
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer


AGENT_DIR = Path(__file__).resolve().parent
LOG_PATH = AGENT_DIR / "agent.log"
STATUS_PATH = AGENT_DIR / "agent_status.json"


def append_log_file(level: str, message: str) -> None:
    timestamp = datetime.utcnow().isoformat() + "Z"
    try:
        with LOG_PATH.open("a", encoding="utf-8") as log_file:
            log_file.write(f"{timestamp} [{level}] {message}\n")
    except OSError:
        pass


def write_status(state: str, message: str) -> None:
    status_payload = {
        "state": state,
        "message": message,
        "endpoint_id": ENDPOINT_ID if "ENDPOINT_ID" in globals() else None,
        "pc_name": PC_NAME if "PC_NAME" in globals() else None,
        "backend_url": BACKEND_URL if "BACKEND_URL" in globals() else None,
        "pid": os.getpid(),
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    try:
        STATUS_PATH.write_text(json.dumps(status_payload, indent=2), encoding="utf-8")
    except OSError:
        pass


def load_env_file() -> None:
    """Load agent/.env values without overriding real environment variables."""
    env_path = AGENT_DIR / ".env"
    if not env_path.exists():
        return

    try:
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
    except OSError as exc:
        append_log_file("WARNING", f"Could not read agent .env file: {exc}")


load_env_file()

BACKEND_URL = os.getenv("SOC_BACKEND_URL", "http://10.170.117.155:8000")
ENDPOINT_ID = int(os.getenv("SOC_ENDPOINT_ID", "1"))
PC_NAME = os.getenv("SOC_PC_NAME", socket.gethostname())

DOWNLOADS_DIR = Path.home() / "Downloads"
PROJECT_ROOT = Path(__file__).resolve().parent.parent
QUARANTINE_DIR = PROJECT_ROOT / "quarantine"
HASH_BLACKLIST_PATH = AGENT_DIR / "malicious_hashes.json"

SCAN_DELAY_SECONDS = 0.5
REQUEST_TIMEOUT_SECONDS = 8
TELEMETRY_INTERVAL_SECONDS = 5
TELEMETRY_API_PATH = "/telemetry"
CONTROL_POLL_INTERVAL_SECONDS = 3
MAX_TEXT_READ_BYTES = 1_000_000
HASH_CACHE_SECONDS = 60
DUPLICATE_ALERT_SECONDS = 30
EVENT_DEBOUNCE_SECONDS = 30
EICAR_SIGNATURE = "EICAR-STANDARD-ANTIVIRUS-TEST-FILE"

SUSPICIOUS_KEYWORDS = [
    "powershell",
    "cmd",
    "delete",
    "registry",
    "encrypt",
    "startup",
    "taskkill",
    "download",
]

EXECUTABLE_EXTENSIONS = {
    ".exe",
    ".bat",
    ".ps1",
    ".vbs",
    ".scr",
    ".dll",
    ".js",
    ".jar",
}

AGGRESSIVE_PROTECTION_EXTENSIONS = {
    ".bat",
    ".cmd",
    ".ps1",
    ".exe",
    ".vbs",
    ".scr",
    ".js",
}

TEXT_LIKE_EXTENSIONS = {
    ".txt",
    ".log",
    ".csv",
    ".json",
    ".xml",
    ".html",
    ".htm",
    ".bat",
    ".cmd",
    ".ps1",
    ".vbs",
    ".js",
    ".jar",
    ".py",
    ".sh",
}

REPORT_NAME_PREFIXES = (
    "incident-report-",
    "soc-incident-report-",
    "ai-soc-report-",
)

processed_files: Dict[str, float] = {}
files_in_progress: set[str] = set()
recent_path_events: Dict[str, float] = {}
malicious_hashes: set[str] = set()
cache_lock = threading.Lock()
control_lock = threading.Lock()
control_state = {
    "detection_enabled": True,
    "agent_mode": "running",
    "heartbeat_enabled": True,
}


def log(level: str, message: str) -> None:
    """Write clean SOC-style logs to console when visible and always to disk."""
    if sys.stdout:
        try:
            print(f"[{level}] {message}", flush=True)
        except OSError:
            pass
    append_log_file(level, message)


def get_control_state() -> Dict[str, object]:
    with control_lock:
        return dict(control_state)


def apply_control_state(next_state: Dict[str, object]) -> None:
    with control_lock:
        previous = dict(control_state)
        control_state["detection_enabled"] = bool(next_state.get("detection_enabled", True))
        control_state["agent_mode"] = str(next_state.get("agent_mode") or "running").lower()
        control_state["heartbeat_enabled"] = bool(next_state.get("heartbeat_enabled", True))
        current = dict(control_state)

    if previous != current:
        log(
            "INFO",
            (
                "Control updated: "
                f"detection_enabled={current['detection_enabled']}, "
                f"agent_mode={current['agent_mode']}, "
                f"heartbeat_enabled={current['heartbeat_enabled']}"
            ),
        )


def poll_control_status() -> Dict[str, object]:
    try:
        response = requests.get(
            f"{BACKEND_URL}/endpoints/{ENDPOINT_ID}/control/status",
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        apply_control_state(response.json())
    except RequestException as exc:
        log("WARNING", f"Could not poll endpoint control status: {exc}")
    except ValueError:
        log("WARNING", "Endpoint control status returned invalid JSON")

    return get_control_state()


def detection_is_active() -> bool:
    state = get_control_state()
    return state.get("agent_mode") == "running" and bool(state.get("detection_enabled"))


def ensure_agent_folders() -> None:
    QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)


def load_malicious_hashes() -> None:
    global malicious_hashes
    try:
        if HASH_BLACKLIST_PATH.exists():
            data = json.loads(HASH_BLACKLIST_PATH.read_text(encoding="utf-8"))
            malicious_hashes = {str(item).lower() for item in data if item}
            log("INFO", f"Loaded {len(malicious_hashes)} malicious hash blacklist entries")
    except (OSError, json.JSONDecodeError) as exc:
        log("WARNING", f"Could not load malicious hash blacklist: {exc}")


def save_malicious_hashes() -> None:
    try:
        HASH_BLACKLIST_PATH.write_text(
            json.dumps(sorted(malicious_hashes), indent=2),
            encoding="utf-8",
        )
    except OSError as exc:
        log("WARNING", f"Could not save malicious hash blacklist: {exc}")


def add_malicious_hash(file_hash: str) -> None:
    """Remember a malicious file hash so future copies are blocked locally."""
    normalized_hash = file_hash.lower()
    with cache_lock:
        if normalized_hash in malicious_hashes:
            return
        malicious_hashes.add(normalized_hash)
        save_malicious_hashes()


def is_blacklisted_hash(file_hash: str) -> bool:
    with cache_lock:
        return file_hash.lower() in malicious_hashes


def notify_threat_blocked(file_name: str) -> None:
    """Show a simple Windows popup without blocking the scanning thread."""
    def show_message() -> None:
        try:
            if sys.platform.startswith("win"):
                import ctypes

                ctypes.windll.user32.MessageBoxW(
                    0,
                    f"Threat blocked by Sentinel SOC\n\n{file_name}",
                    "Sentinel SOC",
                    0x30,
                )
        except Exception as exc:
            log("WARNING", f"Could not show Windows popup notification: {exc}")

    threading.Thread(target=show_message, daemon=True).start()


def collect_system_info() -> Dict[str, object]:
    """Collect lightweight endpoint health telemetry for the SOC dashboard."""
    network = psutil.net_io_counters()
    hostname = socket.gethostname()

    return {
        "endpoint_id": ENDPOINT_ID,
        "pc_name": PC_NAME,
        "cpu": psutil.cpu_percent(interval=None),
        "ram": psutil.virtual_memory().percent,
        "disk": psutil.disk_usage(str(Path.home().anchor or Path.home())).percent,
        "network_sent": network.bytes_sent,
        "network_received": network.bytes_recv,
        "hostname": hostname,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


def send_telemetry_once() -> None:
    try:
        response = requests.post(
            f"{BACKEND_URL}{TELEMETRY_API_PATH}",
            json=collect_system_info(),
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        log("INFO", "Telemetry sent successfully")
        write_status("running", "Telemetry sent successfully")
    except RequestException as exc:
        log("WARNING", f"Telemetry backend is offline or unreachable: {exc}")
        write_status("running_offline", f"Telemetry backend is offline or unreachable: {exc}")
    except Exception as exc:
        log("ERROR", f"Telemetry collection failed: {exc}")
        write_status("error", f"Telemetry collection failed: {exc}")


def send_heartbeat_once(agent_mode: str) -> None:
    payload = {
        "endpoint_id": ENDPOINT_ID,
        "pc_name": PC_NAME,
        "agent_mode": agent_mode,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    try:
        response = requests.post(
            f"{BACKEND_URL}/heartbeat",
            json=payload,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        write_status("paused" if agent_mode == "paused" else "running", "Heartbeat sent successfully")
    except RequestException as exc:
        log("WARNING", f"Heartbeat backend is offline or unreachable: {exc}")
        write_status("heartbeat_offline", f"Heartbeat backend is offline or unreachable: {exc}")


def telemetry_loop(stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        state = get_control_state()
        agent_mode = str(state.get("agent_mode") or "running")

        if agent_mode == "stopped":
            break

        if not bool(state.get("heartbeat_enabled", True)):
            write_status("heartbeat_disabled", "Heartbeat disabled by dashboard control")
        elif agent_mode == "paused":
            send_heartbeat_once("paused")
        else:
            send_telemetry_once()

        stop_event.wait(TELEMETRY_INTERVAL_SECONDS)


def wait_for_file_ready(file_path: Path) -> bool:
    """
    Wait until the browser has likely finished writing the file.
    Returns False when the file is locked, missing, or unreadable.
    """
    time.sleep(SCAN_DELAY_SECONDS)
    last_signature = None
    stable_checks = 0

    for _ in range(6):
        try:
            if not file_path.exists() or not file_path.is_file():
                return False

            with file_path.open("rb"):
                stat = file_path.stat()
                signature = (stat.st_size, stat.st_mtime_ns)

            if signature == last_signature:
                stable_checks += 1
            else:
                stable_checks = 0
                last_signature = signature

            if stable_checks >= 1:
                return True
        except PermissionError:
            log("WARNING", f"Permission denied while reading {file_path.name}; retrying...")
        except OSError:
            log("WARNING", f"File appears locked: {file_path.name}; retrying...")

        time.sleep(1)

    return False


def calculate_sha256(file_path: Path) -> str:
    sha256 = hashlib.sha256()
    with file_path.open("rb") as file_obj:
        for block in iter(lambda: file_obj.read(1024 * 1024), b""):
            sha256.update(block)
    return sha256.hexdigest()


def cleanup_old_cache_entries(now: float) -> None:
    expired_hashes = [
        file_hash
        for file_hash, last_scan_time in processed_files.items()
        if now - last_scan_time > HASH_CACHE_SECONDS
    ]
    for file_hash in expired_hashes:
        processed_files.pop(file_hash, None)

    expired_paths = [
        path
        for path, last_event_time in recent_path_events.items()
        if now - last_event_time > EVENT_DEBOUNCE_SECONDS
    ]
    for path in expired_paths:
        recent_path_events.pop(path, None)


def should_suppress_duplicate_alert(file_hash: str) -> bool:
    """
    Avoid spamming the SOC dashboard with the same hash repeatedly.
    Blocking still happens; only the alert upload is suppressed.
    """
    now = time.monotonic()
    with cache_lock:
        cleanup_old_cache_entries(now)
        last_upload_time = processed_files.get(file_hash)
        if last_upload_time and now - last_upload_time < DUPLICATE_ALERT_SECONDS:
            log("INFO", "Suppressing duplicate backend alert for recently reported hash")
            return True
        return False


def should_ignore_path(file_path: Path) -> bool:
    name = file_path.name.lower()
    suffix = file_path.suffix.lower()

    if suffix in {".tmp", ".crdownload", ".part"}:
        log("INFO", f"Ignoring temporary download file: {file_path.name}")
        return True

    if name.endswith(".quarantine.json"):
        log("INFO", f"Ignoring quarantine metadata file: {file_path.name}")
        return True

    if name.endswith(".report.txt") or any(name.startswith(prefix) for prefix in REPORT_NAME_PREFIXES):
        log("INFO", f"Ignoring generated report file: {file_path.name}")
        return True

    try:
        if file_path.resolve().is_relative_to(QUARANTINE_DIR.resolve()):
            log("INFO", f"Ignoring quarantine file: {file_path.name}")
            return True
    except OSError:
        return True

    return False


def should_debounce_event(file_path: Path) -> bool:
    now = time.monotonic()
    try:
        cache_key = str(file_path.resolve()).lower()
    except OSError:
        cache_key = str(file_path).lower()

    with cache_lock:
        cleanup_old_cache_entries(now)
        last_event_time = recent_path_events.get(cache_key)
        if last_event_time and now - last_event_time < EVENT_DEBOUNCE_SECONDS:
            log("INFO", f"Ignoring duplicate filesystem event for {file_path.name}")
            return True

        recent_path_events[cache_key] = now
        return False


def begin_hash_processing(file_hash: str) -> bool:
    now = time.monotonic()
    with cache_lock:
        cleanup_old_cache_entries(now)
        last_upload_time = processed_files.get(file_hash)
        if last_upload_time and now - last_upload_time < HASH_CACHE_SECONDS:
            log("INFO", "Skipping duplicate alert upload for recently processed file hash")
            return False

        if file_hash in files_in_progress:
            log("INFO", "Skipping duplicate scan already in progress for this file hash")
            return False

        files_in_progress.add(file_hash)
        return True


def mark_hash_uploaded(file_hash: str) -> None:
    """Record that this hash has already produced a backend alert recently."""
    with cache_lock:
        processed_files[file_hash] = time.monotonic()
        files_in_progress.discard(file_hash)


def clear_hash_processing(file_hash: str) -> None:
    with cache_lock:
        files_in_progress.discard(file_hash)


def build_eicar_prediction() -> Dict[str, object]:
    return {
        "prediction": "Malicious",
        "risk_score": 95,
        "reason": "Manual EICAR antivirus test-file rule",
    }


def build_aggressive_rule_prediction(features: Dict[str, object]) -> Dict[str, object]:
    return {
        "prediction": "Malicious",
        "risk_score": 90,
        "reason": (
            "Aggressive protection rule matched executable script type "
            f"{features.get('file_extension')} with suspicious keywords"
        ),
    }


def build_hash_blacklist_prediction() -> Dict[str, object]:
    return {
        "prediction": "Malicious",
        "risk_score": 100,
        "reason": "SHA256 matched local malicious hash blacklist",
    }


def decide_final_prediction(features: Dict[str, object]) -> Dict[str, object] | None:
    """
    Local deterministic rules run before ML so one file gets one final verdict.
    EICAR never uploads an earlier Suspicious/Allowed result first.
    """
    if is_eicar_test_file(features):
        if features.get("eicar_detected"):
            log("INFO", "EICAR test signature detected")
        else:
            log("INFO", "EICAR test file detected")
        return build_eicar_prediction()

    if should_aggressively_block(features):
        log("BLOCKED", f"{features['filename']} matched aggressive protection rules")
        return build_aggressive_rule_prediction(features)

    return send_prediction_request(features)


def read_text_sample(file_path: Path, extension: str) -> str:
    """
    Read a safe, bounded text sample. Binary files are not decoded fully.
    """
    if extension not in TEXT_LIKE_EXTENSIONS:
        return ""

    try:
        with file_path.open("rb") as file_obj:
            raw_content = file_obj.read(MAX_TEXT_READ_BYTES)
        return raw_content.decode("utf-8", errors="ignore").lower()
    except PermissionError:
        log("WARNING", f"Permission denied while reading content from {file_path.name}")
    except OSError as exc:
        log("WARNING", f"Could not read content from {file_path.name}: {exc}")

    return ""


def file_contains_eicar_signature(file_path: Path) -> bool:
    try:
        with file_path.open("rb") as file_obj:
            raw_content = file_obj.read(MAX_TEXT_READ_BYTES)
        return EICAR_SIGNATURE.encode("ascii") in raw_content.upper()
    except PermissionError:
        log("WARNING", f"Permission denied while checking EICAR signature in {file_path.name}")
    except OSError as exc:
        log("WARNING", f"Could not check EICAR signature in {file_path.name}: {exc}")

    return False


def count_suspicious_keywords(content: str) -> Tuple[int, List[str]]:
    matched_keywords = []
    total_count = 0

    for keyword in SUSPICIOUS_KEYWORDS:
        count = content.count(keyword)
        if count > 0:
            matched_keywords.append(keyword)
            total_count += count

    return total_count, matched_keywords


def should_aggressively_block(features: Dict[str, object]) -> bool:
    """Block script/executable file types when they contain suspicious text."""
    extension = str(features.get("file_extension", "")).lower()
    return extension in AGGRESSIVE_PROTECTION_EXTENSIONS and int(features.get("keyword_count", 0)) > 0


def extract_file_features(file_path: Path) -> Dict[str, object]:
    log("INFO", "Extracting file features...")

    extension = file_path.suffix.lower()
    file_size = file_path.stat().st_size
    content_sample = read_text_sample(file_path, extension)
    keyword_count, matched_keywords = count_suspicious_keywords(content_sample)
    sha256_hash = calculate_sha256(file_path)
    is_executable = extension in EXECUTABLE_EXTENSIONS
    eicar_detected = file_contains_eicar_signature(file_path)

    return {
        "filename": file_path.name,
        "file_extension": extension,
        "keyword_count": keyword_count,
        "file_size": file_size,
        "is_executable": is_executable,
        "sha256": sha256_hash,
        "matched_keywords": matched_keywords,
        "eicar_detected": eicar_detected,
    }


def send_prediction_request(features: Dict[str, object]) -> Dict[str, object] | None:
    predict_payload = {
        "filename": features["filename"],
        "file_extension": features["file_extension"],
        "keyword_count": features["keyword_count"],
        "file_size": features["file_size"],
        "is_executable": features["is_executable"],
    }

    try:
        response = requests.post(
            f"{BACKEND_URL}/predict",
            json=predict_payload,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response.json()
    except RequestException as exc:
        log("ERROR", f"Backend prediction API is offline or unreachable: {exc}")
    except ValueError:
        log("ERROR", "Backend prediction API returned invalid JSON")

    return None


def is_eicar_test_file(features: Dict[str, object]) -> bool:
    return bool(features.get("eicar_detected")) or "eicar" in str(features.get("filename", "")).lower()


def normalized_process_paths(process: psutil.Process) -> set[str]:
    """
    Return executable/cmdline values that look like paths.
    Exact path matching is safer than killing any process with a filename
    substring somewhere in its command line.
    """
    paths = set()
    try:
        exe = process.exe()
        if exe:
            paths.add(str(Path(exe).resolve()).lower())
    except (OSError, psutil.AccessDenied, psutil.NoSuchProcess):
        pass

    try:
        for argument in process.cmdline():
            try:
                candidate = Path(argument.strip('"'))
                if candidate.exists():
                    paths.add(str(candidate.resolve()).lower())
            except OSError:
                continue
    except (psutil.AccessDenied, psutil.NoSuchProcess, psutil.ZombieProcess):
        pass

    return paths


def process_matches_file(process: psutil.Process, target_path: str) -> bool:
    """Only match processes whose executable or argument path is the threat file."""
    return target_path in normalized_process_paths(process)


def terminate_related_processes(file_path: Path) -> int:
    """
    Try to stop the exact file if it is already running.
    This intentionally avoids killing broad parent shells unless the malicious
    file path is one of their command-line arguments.
    """
    terminated_count = 0
    terminating_processes = []
    try:
        target = str(file_path.resolve()).lower()
    except OSError:
        target = str(file_path).lower()

    current_pid = os.getpid()
    for process in psutil.process_iter(["pid", "name"]):
        try:
            if process.info.get("pid") == current_pid:
                continue

            if not process_matches_file(process, target):
                continue

            process.terminate()
            terminating_processes.append(process)
            terminated_count += 1
            log("PROCESS TERMINATED", f"{process.info.get('name') or process.pid} using {file_path.name}")
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    if terminating_processes:
        _, alive = psutil.wait_procs(terminating_processes, timeout=1)
        for process in alive:
            try:
                if process_matches_file(process, target):
                    process.kill()
                    log("PROCESS TERMINATED", f"Force killed process {process.pid}")
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

    return terminated_count


def force_delete_file(file_path: Path) -> bool:
    """Last-resort containment if moving into quarantine fails."""
    try:
        if file_path.exists():
            file_path.unlink()
            log("BLOCKED", f"Force deleted {file_path.name} after quarantine failure")
        return True
    except PermissionError:
        log("ERROR", f"Permission denied while force deleting {file_path.name}")
    except OSError as exc:
        log("ERROR", f"Could not force delete {file_path.name}: {exc}")

    return False


def build_unique_quarantine_path(file_name: str) -> Path:
    """Avoid overwriting an older quarantined sample with the same name."""
    target_path = QUARANTINE_DIR / file_name

    if not target_path.exists():
        return target_path

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    stem = target_path.stem
    suffix = target_path.suffix
    counter = 1

    while True:
        candidate = QUARANTINE_DIR / f"{stem}_{timestamp}_{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def quarantine_file(file_path: Path, features: Dict[str, object]) -> Tuple[str, str | None]:
    """
    Move the threat out of Downloads and write restore metadata.
    If the move fails, force-delete the original file so it cannot execute.
    """
    try:
        ensure_agent_folders()
        quarantine_path = build_unique_quarantine_path(file_path.name)
        terminate_related_processes(file_path)
        shutil.move(str(file_path), str(quarantine_path))

        timestamp = datetime.utcnow().isoformat() + "Z"
        metadata = {
            "original_path": str(file_path),
            "quarantined_path": str(quarantine_path),
            "quarantine_timestamp": timestamp,
            "sha256": features["sha256"],
        }
        metadata_path = quarantine_path.with_suffix(quarantine_path.suffix + ".quarantine.json")
        metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        log("QUARANTINED", file_path.name)
        return "Quarantined", str(quarantine_path)
    except PermissionError:
        log("ERROR", f"Permission denied while quarantining {file_path.name}")
    except OSError as exc:
        log("ERROR", f"Could not quarantine {file_path.name}: {exc}")

    if force_delete_file(file_path):
        return "Quarantine Failure - Force Deleted", None

    return "Quarantine Failure", None


def enforce_blocking_protection(file_path: Path, features: Dict[str, object]) -> str:
    """Local protection action: notify, remember hash, terminate, quarantine."""
    log("BLOCKED", features["filename"])
    notify_threat_blocked(features["filename"])
    add_malicious_hash(str(features["sha256"]))
    action_taken, _ = quarantine_file(file_path, features)
    return action_taken


def build_suspicious_content_summary(features: Dict[str, object], prediction_result: Dict[str, object]) -> str:
    matched_keywords = features.get("matched_keywords", [])
    keyword_text = ", ".join(matched_keywords) if matched_keywords else "none"

    return (
        f"SHA256={features['sha256']}; "
        f"keywords={keyword_text}; "
        f"reason={prediction_result.get('reason', 'No reason provided')}"
    )


def upload_alert(
    features: Dict[str, object],
    prediction_result: Dict[str, object],
    action_taken: str,
) -> bool:
    """Send one live incident event to the central SOC backend."""
    alert_payload = {
        "endpoint_id": ENDPOINT_ID,
        "pc_name": PC_NAME,
        "filename": features["filename"],
        "file_extension": features["file_extension"],
        "keyword_count": features["keyword_count"],
        "file_size": features["file_size"],
        "prediction": prediction_result.get("prediction", "Unknown"),
        "risk_score": int(prediction_result.get("risk_score", 0)),
        "action_taken": action_taken,
        "suspicious_content": build_suspicious_content_summary(features, prediction_result),
    }

    try:
        response = requests.post(
            f"{BACKEND_URL}/upload-alert",
            json=alert_payload,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        log("INFO", "Alert uploaded successfully")
        return True
    except RequestException as exc:
        log("ERROR", f"Could not upload alert to backend: {exc}")
        return False


def should_quarantine(prediction_result: Dict[str, object]) -> bool:
    """Malicious or high-risk files are blocked immediately."""
    prediction = str(prediction_result.get("prediction", "")).lower()
    risk_score = int(prediction_result.get("risk_score", 0))
    return prediction == "malicious" or risk_score >= 70


def scan_file(file_path: Path) -> None:
    """
    Main protection workflow for one filesystem event.
    Order matters: identify the file, apply local block rules, contain it,
    then report the incident to the central SOC backend.
    """
    file_hash = None
    processing_started = False
    try:
        if not detection_is_active():
            log("INFO", f"Detection paused; skipping scan for {file_path.name}")
            return

        if not file_path.is_file():
            return

        if should_ignore_path(file_path):
            return

        log("INFO", f"New file detected: {file_path.name}")

        if not wait_for_file_ready(file_path):
            log("WARNING", f"Skipping unreadable or incomplete file: {file_path.name}")
            return

        if should_debounce_event(file_path):
            return

        features = extract_file_features(file_path)
        file_hash = str(features["sha256"])

        if is_blacklisted_hash(file_hash):
            log("HASH BLACKLIST MATCH", features["filename"])
            prediction_result = build_hash_blacklist_prediction()
        else:
            if not begin_hash_processing(file_hash):
                return
            processing_started = True
            prediction_result = decide_final_prediction(features)

        if prediction_result is None:
            if processing_started:
                clear_hash_processing(file_hash)
            log("WARNING", "Scan completed locally, but backend prediction was not available")
            return

        prediction = prediction_result.get("prediction", "Unknown")
        risk_score = prediction_result.get("risk_score", 0)
        log("INFO", f"Prediction: {prediction}")
        log("INFO", f"Risk score: {risk_score}")

        action_taken = "Allowed"
        if should_quarantine(prediction_result):
            action_taken = enforce_blocking_protection(file_path, features)

        if should_suppress_duplicate_alert(file_hash):
            if processing_started:
                clear_hash_processing(file_hash)
            return

        if upload_alert(features, prediction_result, action_taken):
            mark_hash_uploaded(file_hash)
        else:
            if processing_started:
                clear_hash_processing(file_hash)
    except PermissionError:
        if file_hash and processing_started:
            clear_hash_processing(file_hash)
        log("ERROR", f"Permission denied while scanning {file_path.name}")
    except OSError as exc:
        if file_hash and processing_started:
            clear_hash_processing(file_hash)
        log("ERROR", f"File scan failed for {file_path.name}: {exc}")
    except Exception as exc:
        if file_hash and processing_started:
            clear_hash_processing(file_hash)
        log("ERROR", f"Unexpected scan error for {file_path.name}: {exc}")


class DownloadsEventHandler(FileSystemEventHandler):
    def on_created(self, event) -> None:
        if event.is_directory:
            return
        scan_file(Path(event.src_path))

    def on_modified(self, event) -> None:
        if event.is_directory:
            return
        scan_file(Path(event.src_path))

    def on_moved(self, event) -> None:
        if event.is_directory:
            return
        scan_file(Path(event.dest_path))


def start_monitoring() -> None:
    if not DOWNLOADS_DIR.exists():
        log("ERROR", f"Downloads folder not found: {DOWNLOADS_DIR}")
        write_status("error", f"Downloads folder not found: {DOWNLOADS_DIR}")
        return

    ensure_agent_folders()
    load_malicious_hashes()
    write_status("starting", "Sentinel SOC Agent is starting")

    log("INFO", f"Endpoint ID: {ENDPOINT_ID}")
    log("INFO", f"PC Name: {PC_NAME}")
    log("INFO", f"Backend URL: {BACKEND_URL}")
    log("INFO", f"Monitoring Downloads folder: {DOWNLOADS_DIR}")
    poll_control_status()

    observer = Observer()
    observer.schedule(DownloadsEventHandler(), str(DOWNLOADS_DIR), recursive=False)
    observer.start()
    stop_event = threading.Event()
    telemetry_thread = threading.Thread(target=telemetry_loop, args=(stop_event,), daemon=True)
    telemetry_thread.start()
    write_status("running", "Monitoring Downloads and sending telemetry")

    try:
        while True:
            state = poll_control_status()
            if state.get("agent_mode") == "stopped":
                log("INFO", "Full Stop Agent command received; exiting agent process")
                write_status("stopping", "Full Stop Agent command received")
                break
            time.sleep(CONTROL_POLL_INTERVAL_SECONDS)
    except KeyboardInterrupt:
        log("INFO", "Stopping endpoint agent...")
        write_status("stopping", "Sentinel SOC Agent is stopping")
    finally:
        stop_event.set()
        observer.stop()
        observer.join()
        telemetry_thread.join(timeout=2)
        write_status("stopped", "Sentinel SOC Agent stopped")


if __name__ == "__main__":
    start_monitoring()
