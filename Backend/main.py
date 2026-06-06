from fastapi import FastAPI, Depends, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from pathlib import Path
from functools import wraps
from io import BytesIO
import json
import logging
import os
import re
import base64
import hmac
import shutil
import zipfile

from database import Base, get_db, init_database
from models import User, Team, Endpoint, Alert, Telemetry
from auth import SECRET_KEY, get_password_hash, verify_password, get_user_by_email, create_access_token, get_current_user, normalize_role, require_admin, require_endpoint_user
from detector import predict_file

init_database(Base)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
AGENT_DIR = PROJECT_ROOT / "agent"
QUARANTINE_DIR = PROJECT_ROOT / "quarantine"
ENDPOINT_ONLINE_TIMEOUT_SECONDS = 15
DEFAULT_AGENT_BACKEND_URL = "https://sentinel-soc-backend-fxb8.onrender.com"
ALERT_DEDUP_WINDOW_SECONDS = int(os.getenv("ALERT_DEDUP_WINDOW_SECONDS", "60"))
telemetry_events = []

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("soc_api")

app = FastAPI(
    title="AI-Based SOC Threat Detection Backend",
    description="Simple backend for demo SOC threat detection and endpoint protection",
)

DEFAULT_ALLOWED_ORIGINS = [
    "https://sentinel-soc-nine.vercel.app",
    "http://10.170.117.155:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5174",
]


def get_allowed_origins() -> list[str]:
    """Comma-separated ALLOWED_ORIGINS lets Render accept your Vercel domain."""
    raw_origins = os.getenv("ALLOWED_ORIGINS", "")
    configured_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return sorted(set(DEFAULT_ALLOWED_ORIGINS + configured_origins))


def auth_debug_enabled() -> bool:
    return os.getenv("AUTH_DEBUG", "").strip().lower() in {"1", "true", "yes"} or os.getenv(
        "DEBUG_AUTH_TOOLS", ""
    ).strip().lower() in {"1", "true", "yes"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.get("/health")
def health_check():
    return {"status": "online"}


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning("%s %s failed with %s: %s", request.method, request.url.path, exc.status_code, exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("%s %s validation error: %s", request.method, request.url.path, exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("%s %s unhandled API error", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error. Please check backend logs."},
    )


def rollback_db_sessions(args, kwargs):
    for value in list(args) + list(kwargs.values()):
        if isinstance(value, Session):
            value.rollback()


def safe_endpoint(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except HTTPException:
            raise
        except SQLAlchemyError:
            rollback_db_sessions(args, kwargs)
            logger.exception("Database error in %s", func.__name__)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error while processing request",
            )
        except Exception:
            rollback_db_sessions(args, kwargs)
            logger.exception("Unexpected error in %s", func.__name__)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unexpected backend error while processing request",
            )

    return wrapper


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    team_password: str | None = None
    team_password_confirm: str | None = None
    pc_name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class DebugPasswordResetRequest(BaseModel):
    email: str
    new_password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token: str
    user: dict


class EndpointRegisterRequest(BaseModel):
    pc_name: str = Field(..., min_length=1)


class PredictRequest(BaseModel):
    filename: str
    file_extension: str
    keyword_count: int
    file_size: int
    is_executable: bool = False


class AlertUploadRequest(BaseModel):
    endpoint_id: int
    pc_name: str
    filename: str
    file_path: str | None = None
    file_hash: str | None = None
    alert_key: str | None = None
    file_extension: str
    keyword_count: int
    file_size: int
    prediction: str
    risk_score: int
    action_taken: str
    suspicious_content: str


class TelemetryRequest(BaseModel):
    endpoint_id: int
    pc_name: str = Field(..., min_length=1)
    cpu: float = Field(..., ge=0)
    ram: float = Field(..., ge=0)
    disk: float = Field(..., ge=0)
    network_sent: int = Field(..., ge=0)
    network_received: int = Field(..., ge=0)
    hostname: str = Field(..., min_length=1)
    timestamp: datetime


class HeartbeatRequest(BaseModel):
    endpoint_id: int
    pc_name: str = Field(..., min_length=1)
    agent_mode: str = "running"
    timestamp: datetime | None = None


class ConnectTeamRequest(BaseModel):
    team_passcode: str | None = None
    team_password: str | None = None
    pc_name: str | None = None


def serialize_telemetry(row: Telemetry):
    return {
        "id": row.id,
        "endpoint_id": row.endpoint_id,
        "pc_name": row.pc_name,
        "cpu": row.cpu,
        "ram": row.ram,
        "disk": row.disk,
        "network_sent": row.network_sent,
        "network_received": row.network_received,
        "hostname": row.hostname,
        "timestamp": serialize_datetime(row.timestamp),
        "agent_version": row.agent_version,
        "uptime_seconds": row.uptime_seconds,
        "created_at": serialize_datetime(row.created_at),
    }


def serialize_alert(alert: Alert) -> dict:
    return {
        "id": alert.id,
        "endpoint_id": alert.endpoint_id,
        "pc_name": alert.pc_name,
        "filename": alert.filename,
        "file_extension": alert.file_extension,
        "keyword_count": alert.keyword_count,
        "file_size": alert.file_size,
        "prediction": alert.prediction,
        "risk_score": alert.risk_score,
        "action_taken": alert.action_taken,
        "suspicious_content": alert.suspicious_content,
        "created_at": serialize_datetime(alert.created_at),
    }


def extract_alert_file_hash(request: AlertUploadRequest) -> str | None:
    raw_hash = (request.file_hash or "").strip().lower()
    if re.fullmatch(r"[a-f0-9]{64}", raw_hash):
        return raw_hash

    match = re.search(r"SHA256=([a-fA-F0-9]{64})", request.suspicious_content or "")
    if match:
        return match.group(1).lower()
    return None


def build_alert_key(endpoint_id: int, file_hash: str | None) -> str | None:
    if not file_hash:
        return None
    return f"{endpoint_id}:{file_hash}"


def find_recent_duplicate_alert(db: Session, request: AlertUploadRequest, file_hash: str | None) -> Alert | None:
    cutoff = datetime.utcnow() - timedelta(seconds=ALERT_DEDUP_WINDOW_SECONDS)
    query = (
        db.query(Alert)
        .filter(Alert.endpoint_id == request.endpoint_id, Alert.created_at >= cutoff)
        .order_by(Alert.created_at.desc())
    )

    if file_hash:
        duplicate = query.filter(Alert.suspicious_content.ilike(f"%SHA256={file_hash}%")).first()
        if duplicate:
            return duplicate

    return (
        query.filter(
            Alert.filename == request.filename,
            Alert.file_size == request.file_size,
            Alert.file_extension == request.file_extension,
        )
        .first()
    )


def update_duplicate_alert(alert: Alert, request: AlertUploadRequest, file_hash: str | None) -> None:
    alert.pc_name = request.pc_name
    alert.keyword_count = request.keyword_count
    alert.prediction = request.prediction
    alert.risk_score = request.risk_score
    alert.action_taken = request.action_taken.strip()
    suspicious_content = request.suspicious_content
    if file_hash and f"SHA256={file_hash}" not in suspicious_content:
        suspicious_content = f"SHA256={file_hash}; {suspicious_content}"
    alert.suspicious_content = suspicious_content


def is_quarantine_action(action_taken: str | None) -> bool:
    return "quarantine" in str(action_taken or "").strip().lower()


def quarantine_alert_query(db: Session, allowed_ids: set[int] | None = None):
    query = db.query(Alert).filter(Alert.action_taken.ilike("%quarantine%")).order_by(Alert.created_at.desc())
    if allowed_ids is not None:
        if not allowed_ids:
            return []
        query = query.filter(Alert.endpoint_id.in_(allowed_ids))
    return query.all()


def serialize_datetime(value: datetime | None):
    if not value:
        return None
    return value.replace(tzinfo=None).isoformat() + "Z"


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": normalize_role(user.role),
        "endpoint_id": user.endpoint_id,
        "team_id": user.team_id,
        "admin_id": user.admin_id,
        "created_at": serialize_datetime(user.created_at),
    }


def get_primary_team(db: Session) -> Team | None:
    return db.query(Team).order_by(Team.id.asc()).first()


def authenticate_team_passcode(team: Team, passcode: str) -> bool:
    return get_password_hash(passcode.strip()) == team.passcode_hash


def find_team_by_passcode(db: Session, passcode: str) -> Team | None:
    passcode_hash = get_password_hash(passcode.strip())
    return db.query(Team).filter(Team.passcode_hash == passcode_hash).first()


def team_exists(db: Session) -> bool:
    return db.query(Team.id).first() is not None


def visible_endpoint_ids(db: Session, current_user: User) -> set[int] | None:
    role = normalize_role(current_user.role)
    if role == "admin":
        if current_user.team_id is None:
            return None
        return {row.id for row in db.query(Endpoint.id).filter(Endpoint.team_id == current_user.team_id).all()}
    if current_user.endpoint_id is None:
        return set()
    return {int(current_user.endpoint_id)}


def ensure_endpoint_visible(db: Session, current_user: User, endpoint_id: int) -> None:
    allowed_ids = visible_endpoint_ids(db, current_user)
    if allowed_ids is not None and int(endpoint_id) not in allowed_ids:
        raise HTTPException(status_code=403, detail="Access denied. Endpoint is outside your team scope.")


def require_team_for_endpoint_user(current_user: User) -> None:
    if normalize_role(current_user.role) == "endpoint" and (current_user.team_id is None or current_user.admin_id is None):
        raise HTTPException(status_code=403, detail="Endpoint user must connect to a team first")


def latest_telemetry_rows(db: Session):
    latest_ids = (
        db.query(func.max(Telemetry.id).label("id"))
        .group_by(Telemetry.endpoint_id)
        .subquery()
    )
    return (
        db.query(Telemetry)
        .join(latest_ids, Telemetry.id == latest_ids.c.id)
        .order_by(Telemetry.endpoint_id.asc())
        .all()
    )


def endpoint_status_rows(db: Session, allowed_ids: set[int] | None = None):
    alert_stats = (
        db.query(
            Alert.endpoint_id,
            func.count(Alert.id).label("total_alerts"),
            func.max(Alert.risk_score).label("max_risk_score"),
        )
        .group_by(Alert.endpoint_id)
        .all()
    )
    stats_by_endpoint = {
        row.endpoint_id: {
            "total_alerts": row.total_alerts or 0,
            "max_risk_score": row.max_risk_score or 0,
        }
        for row in alert_stats
    }
    latest_alert_ids = (
        db.query(func.max(Alert.id).label("id"))
        .group_by(Alert.endpoint_id)
        .subquery()
    )
    latest_alerts = {
        alert.endpoint_id: alert
        for alert in db.query(Alert).join(latest_alert_ids, Alert.id == latest_alert_ids.c.id).all()
    }
    latest_by_endpoint = {row.endpoint_id: row for row in latest_telemetry_rows(db)}
    endpoint_query = db.query(Endpoint).order_by(Endpoint.id.asc())
    if allowed_ids is not None:
        if not allowed_ids:
            return []
        endpoint_query = endpoint_query.filter(Endpoint.id.in_(allowed_ids))
    endpoints = endpoint_query.all()

    return [
        {
            "endpoint_id": endpoint.id,
            "pc_name": latest_by_endpoint.get(endpoint.id, endpoint).pc_name,
            "status": endpoint_live_status(endpoint),
            "protection_status": alert_protection_status(latest_alerts.get(endpoint.id)),
            "last_seen": serialize_datetime(endpoint.last_seen),
            "detection_enabled": bool(endpoint.detection_enabled),
            "agent_mode": endpoint.agent_mode or "running",
            "heartbeat_enabled": bool(endpoint.heartbeat_enabled),
            "removed_at": serialize_datetime(endpoint.removed_at),
            "telemetry": serialize_telemetry(latest_by_endpoint[endpoint.id]) if endpoint.id in latest_by_endpoint else None,
            "total_alerts": stats_by_endpoint.get(endpoint.id, {}).get("total_alerts", 0),
            "max_risk_score": stats_by_endpoint.get(endpoint.id, {}).get("max_risk_score", 0),
        }
        for endpoint in endpoints
    ]


def endpoint_live_status(endpoint: Endpoint) -> str:
    if endpoint.agent_mode == "removed":
        return "Removed"
    if endpoint.agent_mode == "stopped":
        return "Offline"
    if not endpoint.last_seen:
        return "Offline"

    latest_time = endpoint.last_seen.replace(tzinfo=None)
    return "Online" if datetime.utcnow() - latest_time <= timedelta(seconds=ENDPOINT_ONLINE_TIMEOUT_SECONDS) else "Offline"


def alert_protection_status(alert: Alert | None) -> str:
    if not alert:
        return "Protected"

    action_taken = str(alert.action_taken or "").lower()
    prediction = str(alert.prediction or "").lower()
    if "quarantine failure" in action_taken:
        return "Quarantine Failure"
    if prediction == "malicious" or int(alert.risk_score or 0) >= 70:
        return "Under Attack"
    return "Protected"


def get_quarantine_paths(filename: str):
    safe_name = Path(filename).name
    if not safe_name or safe_name != filename:
        raise HTTPException(status_code=400, detail="Invalid quarantine filename")

    file_path = (QUARANTINE_DIR / safe_name).resolve()
    metadata_path = file_path.with_suffix(file_path.suffix + ".quarantine.json")
    quarantine_root = QUARANTINE_DIR.resolve()

    if quarantine_root not in file_path.parents:
        raise HTTPException(status_code=400, detail="Invalid quarantine path")

    return file_path, metadata_path


def build_unique_restore_path(original_path: Path) -> Path:
    if not original_path.exists():
        return original_path

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    counter = 1

    while True:
        candidate = original_path.with_name(f"{original_path.stem}_restored_{timestamp}_{counter}{original_path.suffix}")
        if not candidate.exists():
            return candidate
        counter += 1


def public_backend_url(request: Request) -> str:
    return DEFAULT_AGENT_BACKEND_URL


def env_quote(value: str) -> str:
    if value and all(char not in value for char in [' ', "\t", '"', "'"]):
        return value
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def generate_agent_token(endpoint_id: int) -> str:
    digest = hmac.new(
        SECRET_KEY.encode("utf-8"),
        f"sentinel-endpoint-agent:{endpoint_id}".encode("utf-8"),
        digestmod="sha256",
    ).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def hash_agent_token(token: str) -> str:
    return get_password_hash(token.strip())


def verify_agent_token(token: str, token_hash: str | None) -> bool:
    return bool(token and token_hash and hash_agent_token(token) == token_hash)


def issue_endpoint_agent_token(endpoint: Endpoint, db: Session) -> str:
    token = generate_agent_token(endpoint.id)
    next_hash = hash_agent_token(token)
    if endpoint.agent_token_hash != next_hash:
        endpoint.agent_token_hash = next_hash
        db.commit()
        db.refresh(endpoint)
        logger.info("Issued endpoint agent token: endpoint_id=%s", endpoint.id)
    return token


def build_agent_env(backend_url: str, endpoint: Endpoint, agent_token: str) -> str:
    return "\n".join(
        [
            f"SOC_BACKEND_URL={env_quote(backend_url)}",
            f"SOC_ENDPOINT_ID={env_quote(str(endpoint.id))}",
            f"SOC_PC_NAME={env_quote(endpoint.pc_name)}",
            f"SOC_ENDPOINT_TOKEN={env_quote(agent_token)}",
            "",
        ]
    )


def build_agent_package(endpoint: Endpoint, backend_url: str, db: Session) -> tuple[BytesIO, str]:
    required_files = [
        "agent.exe",
        "install_agent.bat",
        "start_agent_silent.vbs",
        "stop_agent.bat",
        "uninstall_agent.bat",
        "README_AGENT_SETUP.txt",
    ]
    missing_files = [name for name in required_files if not (AGENT_DIR / name).is_file()]
    if missing_files:
        raise HTTPException(status_code=500, detail=f"Agent package files missing: {', '.join(missing_files)}")

    package = BytesIO()
    agent_token = issue_endpoint_agent_token(endpoint, db)
    with zipfile.ZipFile(package, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for filename in required_files:
            archive.write(AGENT_DIR / filename, arcname=filename)

        archive.writestr(".env", build_agent_env(backend_url, endpoint, agent_token))
    package.seek(0)

    safe_pc_name = "".join(char if char.isalnum() or char in {"-", "_"} else "-" for char in endpoint.pc_name).strip("-")
    filename = f"sentinel-agent-endpoint-{endpoint.id}-{safe_pc_name or 'pc'}.zip"
    return package, filename


def get_endpoint_or_404(endpoint_id: int, db: Session) -> Endpoint:
    endpoint = db.get(Endpoint, endpoint_id)
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    return endpoint


def default_endpoint_name(user: User, requested_pc_name: str | None = None) -> str:
    pc_name = (requested_pc_name or "").strip()
    if pc_name:
        return pc_name
    base_name = (user.name or user.email or "Endpoint").strip()
    return f"{base_name}'s Endpoint"


def create_endpoint_for_user(db: Session, user: User, pc_name: str | None = None, assign_to_user: bool = True) -> Endpoint:
    endpoint = Endpoint(
        user_id=user.id,
        pc_name=default_endpoint_name(user, pc_name),
        status="Registered",
        last_seen=None,
        detection_enabled=True,
        agent_mode="running",
        heartbeat_enabled=True,
        team_id=user.team_id,
    )
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)
    if assign_to_user:
        user.endpoint_id = endpoint.id
        db.commit()
        db.refresh(user)
    return endpoint


def serialize_endpoint_control(endpoint: Endpoint) -> dict:
    return {
        "endpoint_id": endpoint.id,
        "pc_name": endpoint.pc_name,
        "detection_enabled": bool(endpoint.detection_enabled),
        "agent_mode": endpoint.agent_mode or "running",
        "heartbeat_enabled": bool(endpoint.heartbeat_enabled),
        "status": endpoint_live_status(endpoint),
        "last_seen": serialize_datetime(endpoint.last_seen),
        "removed_at": serialize_datetime(endpoint.removed_at),
    }


def update_endpoint_control(
    endpoint_id: int,
    db: Session,
    *,
    detection_enabled: bool | None = None,
    agent_mode: str | None = None,
    heartbeat_enabled: bool | None = None,
) -> dict:
    endpoint = get_endpoint_or_404(endpoint_id, db)
    if detection_enabled is not None:
        endpoint.detection_enabled = detection_enabled
    if agent_mode is not None:
        endpoint.agent_mode = agent_mode
        endpoint.status = agent_mode.title()
        if agent_mode == "removed":
            endpoint.removed_at = datetime.utcnow()
        elif agent_mode == "running":
            endpoint.removed_at = None
    if heartbeat_enabled is not None:
        endpoint.heartbeat_enabled = heartbeat_enabled
    db.commit()
    db.refresh(endpoint)
    return serialize_endpoint_control(endpoint)


def validate_endpoint_agent_access(endpoint_id: int, db: Session, endpoint_token: str | None) -> Endpoint:
    endpoint = get_endpoint_or_404(endpoint_id, db)

    if not endpoint_token:
        logger.warning(
            "Endpoint control auth using legacy missing-token access: endpoint_id=%s. Download a fresh agent package to enable endpoint tokens.",
            endpoint_id,
        )
        return endpoint

    if endpoint.agent_token_hash:
        if not verify_agent_token(endpoint_token, endpoint.agent_token_hash):
            logger.warning("Endpoint control auth failed: endpoint_id=%s token_present=%s", endpoint_id, bool(endpoint_token))
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid endpoint token")
        logger.info("Endpoint control auth succeeded: endpoint_id=%s", endpoint_id)
        return endpoint

    logger.warning(
        "Endpoint control auth using legacy tokenless access: endpoint_id=%s. Download a fresh agent package to enable endpoint tokens.",
        endpoint_id,
    )
    return endpoint


@app.post("/register", status_code=status.HTTP_201_CREATED)
@safe_endpoint
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    role = normalize_role(request.role)
    admin_count = db.query(User).filter(func.lower(User.role) == "admin").count()
    password_hash = get_password_hash(request.password)
    logger.info(
        "Register attempt: email=%s normalized_email=%s role=%s password_hash_exists=%s password_hash_length=%s",
        request.email,
        email,
        role,
        bool(password_hash),
        len(password_hash),
    )
    logger.info("Admin count before registration: %s", admin_count)

    existing_user = db.query(User).filter(User.email == email).first()
    logger.info("Register existing email found: email=%s found=%s", email, bool(existing_user))
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    primary_team = get_primary_team(db)
    endpoint_team = None
    endpoint_admin_id = None
    if role == "admin":
        team_password = (request.team_password or "").strip()
        if not team_password:
            raise HTTPException(status_code=400, detail="Team passcode is required for admin registration")
        if primary_team:
            if not authenticate_team_passcode(primary_team, team_password):
                raise HTTPException(status_code=403, detail="Invalid team passcode")
        else:
            if team_password != (request.team_password_confirm or "").strip():
                raise HTTPException(status_code=400, detail="Team passcodes do not match")
    elif role == "endpoint":
        team_password = (request.team_password or "").strip()
        if not team_password:
            raise HTTPException(status_code=400, detail="Team passcode is required for endpoint registration")
        endpoint_team = find_team_by_passcode(db, team_password)
        if not endpoint_team:
            raise HTTPException(status_code=400, detail="Invalid Team Passcode")
        endpoint_admin_id = endpoint_team.owner_admin_id
        if endpoint_admin_id is None:
            admin = (
                db.query(User)
                .filter(User.team_id == endpoint_team.id, func.lower(User.role) == "admin")
                .order_by(User.id.asc())
                .first()
            )
            endpoint_admin_id = admin.id if admin else None
        if endpoint_admin_id is None:
            raise HTTPException(status_code=400, detail="Invalid Team Passcode")

    user = User(
        name=request.name.strip(),
        email=email,
        password_hash=password_hash,
        role=role,
    )
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        if role == "admin":
            if primary_team:
                user.team_id = primary_team.id
                user.admin_id = primary_team.owner_admin_id or user.id
            else:
                primary_team = Team(
                    name=f"{user.name}'s Team",
                    passcode_hash=get_password_hash((request.team_password or "").strip()),
                    owner_admin_id=user.id,
                )
                db.add(primary_team)
                db.commit()
                db.refresh(primary_team)
                user.team_id = primary_team.id
                user.admin_id = user.id
            db.commit()
            db.refresh(user)
        elif role == "endpoint":
            user.team_id = endpoint_team.id
            user.admin_id = endpoint_admin_id
            db.commit()
            db.refresh(user)
            create_endpoint_for_user(db, user, request.pc_name)
        logger.info("User saved successfully: id=%s email=%s role=%s", user.id, user.email, user.role)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not register user")

    return {"message": "User registered successfully", "user_id": user.id}


@app.post("/login", response_model=LoginResponse)
@safe_endpoint
def login(request: LoginRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    logger.info("Login attempt: email=%s normalized_email=%s", request.email, email)
    user = get_user_by_email(db, email)
    if not user:
        logger.info("Login user found: email=%s found=false", email)
        detail = "User not found" if auth_debug_enabled() else "Invalid email or password"
        raise HTTPException(status_code=401, detail=detail)
    logger.info(
        "Login user found: email=%s found=true id=%s role=%s password_hash_exists=%s password_hash_length=%s",
        email,
        user.id,
        user.role,
        bool(user.password_hash),
        len(user.password_hash or ""),
    )
    password_ok = verify_password(request.password, user.password_hash)
    logger.info("Login password verify result: email=%s result=%s", email, password_ok)
    if not password_ok:
        detail = "Invalid password" if auth_debug_enabled() else "Invalid email or password"
        raise HTTPException(status_code=401, detail=detail)

    user.role = normalize_role(user.role)
    db.commit()
    db.refresh(user)
    token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "email": user.email,
        "endpoint_id": user.endpoint_id,
        "team_id": user.team_id,
        "admin_id": user.admin_id,
    })
    logger.info("Login success: user_id=%s role=%s token_returned=%s", user.id, user.role, bool(token))
    return {
        "access_token": token,
        "token": token,
        "user": serialize_user(user),
    }


@app.post("/debug/auth/reset-password")
@safe_endpoint
def debug_reset_password(request: DebugPasswordResetRequest, db: Session = Depends(get_db)):
    if not auth_debug_enabled():
        raise HTTPException(status_code=404, detail="Not found")

    email = request.email.strip().lower()
    logger.warning("Debug password reset requested: email=%s", email)
    user = get_user_by_email(db, email)
    if not user:
        logger.warning("Debug password reset failed: email=%s found=false", email)
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = get_password_hash(request.new_password)
    db.commit()
    logger.warning(
        "Debug password reset completed: email=%s user_id=%s password_hash_exists=%s password_hash_length=%s",
        email,
        user.id,
        bool(user.password_hash),
        len(user.password_hash or ""),
    )
    return {"message": "Password reset for debug user", "user": serialize_user(user)}


@app.get("/me")
@safe_endpoint
def read_current_user(current_user: User = Depends(get_current_user)):
    logger.info("/me success: user_id=%s role=%s", current_user.id, normalize_role(current_user.role))
    return serialize_user(current_user)


@app.get("/team/status")
@safe_endpoint
def get_team_status(db: Session = Depends(get_db)):
    return {"team_exists": team_exists(db)}


@app.post("/connect-team")
@safe_endpoint
def connect_team(request: ConnectTeamRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if normalize_role(current_user.role) != "endpoint":
        raise HTTPException(status_code=403, detail="Only endpoint users can connect to a team")

    passcode = (request.team_passcode or request.team_password or "").strip()
    if not passcode:
        raise HTTPException(status_code=400, detail="Team Passcode is required")

    team = find_team_by_passcode(db, passcode)
    if not team:
        raise HTTPException(status_code=400, detail="Invalid Team Passcode")

    admin_id = team.owner_admin_id
    if admin_id is None:
        admin = (
            db.query(User)
            .filter(User.team_id == team.id, func.lower(User.role) == "admin")
            .order_by(User.id.asc())
            .first()
        )
        admin_id = admin.id if admin else None
    if admin_id is None:
        raise HTTPException(status_code=400, detail="Invalid Team Passcode")

    current_user.team_id = team.id
    current_user.admin_id = admin_id
    if current_user.endpoint_id is not None:
        endpoint = db.get(Endpoint, current_user.endpoint_id)
        if endpoint:
            endpoint.team_id = team.id
            endpoint.pc_name = endpoint.pc_name or default_endpoint_name(current_user, request.pc_name)
    else:
        create_endpoint_for_user(db, current_user, request.pc_name)
    db.commit()
    db.refresh(current_user)
    return {"message": "Team connected successfully", "user": serialize_user(current_user)}


@app.post("/register-endpoint", status_code=status.HTTP_201_CREATED)
@safe_endpoint
def register_endpoint(
    request: EndpointRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pc_name = request.pc_name.strip()
    if not pc_name:
        raise HTTPException(status_code=400, detail="PC name is required")
    if normalize_role(current_user.role) == "endpoint":
        require_team_for_endpoint_user(current_user)
        if current_user.endpoint_id is not None:
            raise HTTPException(status_code=403, detail="Endpoint users can only manage their assigned endpoint")

    endpoint = create_endpoint_for_user(
        db,
        current_user,
        pc_name,
        assign_to_user=normalize_role(current_user.role) == "endpoint",
    )
    return {
        "message": "Endpoint registered successfully",
        "endpoint_id": endpoint.id,
        "pc_name": endpoint.pc_name,
        "status": "Registered",
    }


@app.get("/agent-config/{endpoint_id}")
@safe_endpoint
def get_agent_config(endpoint_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    ensure_endpoint_visible(db, current_user, endpoint_id)
    endpoint = get_endpoint_or_404(endpoint_id, db)
    agent_token = issue_endpoint_agent_token(endpoint, db)
    return {
        "SOC_BACKEND_URL": public_backend_url(request),
        "SOC_ENDPOINT_ID": str(endpoint.id),
        "SOC_PC_NAME": endpoint.pc_name,
        "SOC_ENDPOINT_TOKEN": agent_token,
    }


@app.get("/download-agent/{endpoint_id}")
@safe_endpoint
def download_agent(endpoint_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    ensure_endpoint_visible(db, current_user, endpoint_id)
    endpoint = get_endpoint_or_404(endpoint_id, db)
    package, filename = build_agent_package(endpoint, public_backend_url(request), db)
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(package, media_type="application/zip", headers=headers)


@app.get("/my/download-agent")
@safe_endpoint
def download_my_agent(request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_endpoint_user)):
    require_team_for_endpoint_user(current_user)
    if current_user.endpoint_id is None:
        endpoint = create_endpoint_for_user(db, current_user)
    else:
        endpoint = get_endpoint_or_404(int(current_user.endpoint_id), db)
        ensure_endpoint_visible(db, current_user, endpoint.id)
    package, filename = build_agent_package(endpoint, public_backend_url(request), db)
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(package, media_type="application/zip", headers=headers)


@app.post("/predict")
@safe_endpoint
def predict(request: PredictRequest):
    result = predict_file(
        filename=request.filename,
        file_extension=request.file_extension,
        keyword_count=request.keyword_count,
        file_size=request.file_size,
        is_executable=request.is_executable,
    )
    return result


@app.post("/upload-alert", status_code=status.HTTP_201_CREATED)
@safe_endpoint
def upload_alert(
    request: AlertUploadRequest,
    db: Session = Depends(get_db),
    x_endpoint_token: str | None = Header(default=None, alias="X-Endpoint-Token"),
):
    endpoint = validate_endpoint_agent_access(request.endpoint_id, db, x_endpoint_token)

    action_taken = request.action_taken.strip()
    file_hash = extract_alert_file_hash(request)
    alert_key = request.alert_key or build_alert_key(request.endpoint_id, file_hash)
    logger.info(
        "Alert upload received: endpoint_id=%s endpoint_user_id=%s team_id=%s filename=%s action_taken=%s file_hash=%s alert_key=%s",
        request.endpoint_id,
        endpoint.user_id,
        endpoint.team_id,
        request.filename,
        action_taken,
        file_hash or "missing",
        alert_key or "missing",
    )

    duplicate_alert = find_recent_duplicate_alert(db, request, file_hash)
    if duplicate_alert:
        update_duplicate_alert(duplicate_alert, request, file_hash)
        endpoint.pc_name = request.pc_name
        endpoint.last_seen = datetime.utcnow()
        if endpoint.agent_mode not in {"paused", "stopped", "removed"}:
            endpoint.status = "Online"
            endpoint.agent_mode = "running"
        db.commit()
        db.refresh(duplicate_alert)
        logger.info(
            "Duplicate alert updated: endpoint_id=%s filename=%s alert_id=%s action_taken=%s quarantine=%s alert_key=%s",
            request.endpoint_id,
            request.filename,
            duplicate_alert.id,
            duplicate_alert.action_taken,
            is_quarantine_action(duplicate_alert.action_taken),
            alert_key or "missing",
        )
        return {
            "message": "Duplicate alert ignored",
            "alert_id": duplicate_alert.id,
            "duplicate_ignored": True,
            "alert_key": alert_key,
        }

    endpoint.pc_name = request.pc_name
    endpoint.last_seen = datetime.utcnow()
    if endpoint.agent_mode not in {"paused", "stopped", "removed"}:
        endpoint.status = "Online"
        endpoint.agent_mode = "running"

    alert = Alert(
        endpoint_id=request.endpoint_id,
        pc_name=request.pc_name,
        filename=request.filename,
        file_extension=request.file_extension,
        keyword_count=request.keyword_count,
        file_size=request.file_size,
        prediction=request.prediction,
        risk_score=request.risk_score,
        action_taken=action_taken,
        suspicious_content=(
            request.suspicious_content
            if not file_hash or f"SHA256={file_hash}" in request.suspicious_content
            else f"SHA256={file_hash}; {request.suspicious_content}"
        ),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    logger.info(
        "Alert stored: endpoint_id=%s endpoint_user_id=%s filename=%s alert_id=%s action_taken=%s quarantine=%s alert_key=%s",
        request.endpoint_id,
        endpoint.user_id,
        request.filename,
        alert.id,
        alert.action_taken,
        is_quarantine_action(alert.action_taken),
        alert_key or "missing",
    )
    if is_quarantine_action(alert.action_taken):
        logger.info(
            "Quarantine record stored in alerts table: alert_id=%s endpoint_id=%s filename=%s",
            alert.id,
            alert.endpoint_id,
            alert.filename,
        )
    return {"message": "Alert stored successfully", "alert_id": alert.id, "duplicate_ignored": False, "alert_key": alert_key}


@app.post("/heartbeat")
@safe_endpoint
def receive_heartbeat(
    request: HeartbeatRequest,
    db: Session = Depends(get_db),
    x_endpoint_token: str | None = Header(default=None, alias="X-Endpoint-Token"),
):
    endpoint = validate_endpoint_agent_access(request.endpoint_id, db, x_endpoint_token)

    endpoint.pc_name = request.pc_name
    if endpoint.agent_mode == "removed":
        return {"message": "Heartbeat ignored for removed endpoint", **serialize_endpoint_control(endpoint)}
    if endpoint.agent_mode == "stopped" and request.agent_mode != "stopped":
        return {"message": "Heartbeat ignored for stopped endpoint", **serialize_endpoint_control(endpoint)}

    endpoint.last_seen = datetime.utcnow()
    if request.agent_mode in {"running", "paused", "stopped"}:
        endpoint.agent_mode = request.agent_mode
        endpoint.status = "Paused" if request.agent_mode == "paused" else "Offline" if request.agent_mode == "stopped" else "Online"
    db.commit()

    return {"message": "Heartbeat received", **serialize_endpoint_control(endpoint)}


@app.post("/telemetry")
async def receive_telemetry(
    request: Request,
    db: Session = Depends(get_db),
    x_endpoint_token: str | None = Header(default=None, alias="X-Endpoint-Token"),
):
    payload = await request.json()
    print(f"[TELEMETRY] {payload}")
    telemetry_events.append(payload)

    endpoint_id = payload.get("endpoint_id")
    if endpoint_id is not None:
        endpoint = validate_endpoint_agent_access(int(endpoint_id), db, x_endpoint_token)
        if endpoint:
            endpoint.last_seen = datetime.utcnow()
            if endpoint.agent_mode not in {"paused", "stopped", "removed"}:
                endpoint.agent_mode = "running"
                endpoint.status = "Online"
            timestamp_value = payload.get("timestamp")
            try:
                telemetry_timestamp = datetime.fromisoformat(str(timestamp_value).replace("Z", "+00:00")).replace(tzinfo=None)
            except (TypeError, ValueError):
                telemetry_timestamp = datetime.utcnow()
            telemetry = Telemetry(
                endpoint_id=endpoint.id,
                pc_name=str(payload.get("pc_name") or endpoint.pc_name),
                cpu=float(payload.get("cpu") or 0),
                ram=float(payload.get("ram") or 0),
                disk=float(payload.get("disk") or 0),
                network_sent=int(payload.get("network_sent") or 0),
                network_received=int(payload.get("network_received") or 0),
                hostname=str(payload.get("hostname") or endpoint.pc_name),
                timestamp=telemetry_timestamp,
                agent_version=str(payload.get("agent_version") or "unknown"),
                uptime_seconds=float(payload.get("uptime_seconds") or 0),
            )
            db.add(telemetry)
            db.commit()

    return {"message": "Telemetry received"}


@app.get("/telemetry")
@safe_endpoint
def get_latest_telemetry(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    allowed_ids = visible_endpoint_ids(db, current_user)
    rows = latest_telemetry_rows(db)
    if allowed_ids is not None:
        rows = [row for row in rows if row.endpoint_id in allowed_ids]
    return [serialize_telemetry(row) for row in rows]


@app.get("/telemetry/{endpoint_id}")
@safe_endpoint
def get_endpoint_telemetry(endpoint_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    ensure_endpoint_visible(db, current_user, endpoint_id)
    endpoint = db.get(Endpoint, endpoint_id)
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    rows = (
        db.query(Telemetry)
        .filter(Telemetry.endpoint_id == endpoint_id)
        .order_by(Telemetry.timestamp.desc())
        .limit(120)
        .all()
    )
    return [serialize_telemetry(row) for row in rows]


@app.get("/endpoints/status")
@safe_endpoint
def get_endpoint_status(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    allowed_ids = visible_endpoint_ids(db, current_user)
    return endpoint_status_rows(db, allowed_ids)


@app.get("/endpoints/{endpoint_id}/control/status")
@safe_endpoint
def get_endpoint_control_status(
    endpoint_id: int,
    db: Session = Depends(get_db),
    x_endpoint_token: str | None = Header(default=None, alias="X-Endpoint-Token"),
):
    endpoint = validate_endpoint_agent_access(endpoint_id, db, x_endpoint_token)
    return serialize_endpoint_control(endpoint)


@app.post("/endpoints/{endpoint_id}/detection/pause")
@safe_endpoint
def pause_detection(endpoint_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    ensure_endpoint_visible(db, current_user, endpoint_id)
    return update_endpoint_control(endpoint_id, db, detection_enabled=False)


@app.post("/endpoints/{endpoint_id}/detection/resume")
@safe_endpoint
def resume_detection(endpoint_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    ensure_endpoint_visible(db, current_user, endpoint_id)
    return update_endpoint_control(endpoint_id, db, detection_enabled=True)


@app.post("/endpoints/{endpoint_id}/agent/pause")
@safe_endpoint
def pause_agent(endpoint_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    ensure_endpoint_visible(db, current_user, endpoint_id)
    return update_endpoint_control(endpoint_id, db, agent_mode="paused", heartbeat_enabled=True)


@app.post("/endpoints/{endpoint_id}/agent/resume")
@safe_endpoint
def resume_agent(endpoint_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    ensure_endpoint_visible(db, current_user, endpoint_id)
    return update_endpoint_control(endpoint_id, db, agent_mode="running", heartbeat_enabled=True)


@app.post("/endpoints/{endpoint_id}/agent/stop")
@safe_endpoint
def stop_agent(endpoint_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    ensure_endpoint_visible(db, current_user, endpoint_id)
    return update_endpoint_control(
        endpoint_id,
        db,
        detection_enabled=False,
        agent_mode="stopped",
        heartbeat_enabled=False,
    )


@app.post("/endpoints/{endpoint_id}/agent/remove")
@safe_endpoint
def remove_agent(endpoint_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    ensure_endpoint_visible(db, current_user, endpoint_id)
    return update_endpoint_control(
        endpoint_id,
        db,
        detection_enabled=False,
        agent_mode="removed",
        heartbeat_enabled=False,
    )


@app.delete("/endpoints/{endpoint_id}")
@safe_endpoint
def delete_endpoint(endpoint_id: int, remove_alerts: bool = True, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    ensure_endpoint_visible(db, current_user, endpoint_id)
    endpoint = db.get(Endpoint, endpoint_id)
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    deleted_telemetry = db.query(Telemetry).filter(Telemetry.endpoint_id == endpoint_id).delete(synchronize_session=False)
    deleted_alerts = 0
    if remove_alerts:
        deleted_alerts = db.query(Alert).filter(Alert.endpoint_id == endpoint_id).delete(synchronize_session=False)

    db.delete(endpoint)
    db.commit()
    return {
        "message": "Endpoint deleted successfully",
        "endpoint_id": endpoint_id,
        "deleted_telemetry": deleted_telemetry,
        "deleted_alerts": deleted_alerts,
    }


@app.delete("/demo/reset")
@safe_endpoint
def reset_demo_data(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    deleted_telemetry = db.query(Telemetry).delete(synchronize_session=False)
    deleted_alerts = db.query(Alert).delete(synchronize_session=False)
    deleted_endpoints = db.query(Endpoint).delete(synchronize_session=False)
    db.commit()

    deleted_quarantine_metadata = 0
    QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)
    for item in QUARANTINE_DIR.iterdir():
        if item.is_file() and item.name.endswith(".quarantine.json"):
            try:
                item.unlink()
                deleted_quarantine_metadata += 1
            except OSError as exc:
                logger.warning("Could not delete quarantine metadata %s: %s", item, exc)

    return {
        "message": "Demo data cleared successfully",
        "deleted_endpoints": deleted_endpoints,
        "deleted_telemetry": deleted_telemetry,
        "deleted_alerts": deleted_alerts,
        "deleted_quarantine_metadata": deleted_quarantine_metadata,
    }


@app.get("/get-alerts")
@safe_endpoint
def get_alerts(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    allowed_ids = visible_endpoint_ids(db, current_user)
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if allowed_ids is not None:
        if not allowed_ids:
            logger.info("Alerts requested: user_id=%s role=%s visible_endpoints=0 rows=0", current_user.id, normalize_role(current_user.role))
            return []
        query = query.filter(Alert.endpoint_id.in_(allowed_ids))
    alerts = query.all()
    logger.info(
        "Alerts requested: user_id=%s role=%s visible_endpoints=%s rows=%s quarantine_rows=%s",
        current_user.id,
        normalize_role(current_user.role),
        "all" if allowed_ids is None else sorted(allowed_ids),
        len(alerts),
        sum(1 for alert in alerts if is_quarantine_action(alert.action_taken)),
    )
    return [serialize_alert(alert) for alert in alerts]


@app.get("/quarantine")
@safe_endpoint
def get_quarantine_alerts(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    allowed_ids = visible_endpoint_ids(db, current_user)
    alerts = quarantine_alert_query(db, allowed_ids)
    logger.info(
        "Quarantine requested: user_id=%s role=%s visible_endpoints=%s rows=%s",
        current_user.id,
        normalize_role(current_user.role),
        "all" if allowed_ids is None else sorted(allowed_ids),
        len(alerts),
    )
    return [serialize_alert(alert) for alert in alerts]


@app.get("/users")
@safe_endpoint
def get_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    query = db.query(User).order_by(User.created_at.desc())
    if current_user.team_id is not None:
        query = query.filter(User.team_id == current_user.team_id)
    return [serialize_user(user) for user in query.all()]


@app.get("/my/endpoint")
@safe_endpoint
def get_my_endpoint(db: Session = Depends(get_db), current_user: User = Depends(require_endpoint_user)):
    require_team_for_endpoint_user(current_user)
    endpoint_id = current_user.endpoint_id
    if endpoint_id is None:
        return None
    rows = endpoint_status_rows(db, {int(endpoint_id)})
    return rows[0] if rows else None


@app.get("/my/endpoint/status")
@safe_endpoint
def get_my_endpoint_status(db: Session = Depends(get_db), current_user: User = Depends(require_endpoint_user)):
    require_team_for_endpoint_user(current_user)
    if current_user.endpoint_id is None:
        return []
    return endpoint_status_rows(db, {int(current_user.endpoint_id)})


@app.get("/my/telemetry")
@safe_endpoint
def get_my_telemetry(db: Session = Depends(get_db), current_user: User = Depends(require_endpoint_user)):
    require_team_for_endpoint_user(current_user)
    if current_user.endpoint_id is None:
        return []
    rows = [row for row in latest_telemetry_rows(db) if int(row.endpoint_id) == int(current_user.endpoint_id)]
    return [serialize_telemetry(row) for row in rows]


@app.get("/my/behavior")
@safe_endpoint
def get_my_behavior(db: Session = Depends(get_db), current_user: User = Depends(require_endpoint_user)):
    require_team_for_endpoint_user(current_user)
    if current_user.endpoint_id is None:
        return []
    rows = (
        db.query(Telemetry)
        .filter(Telemetry.endpoint_id == int(current_user.endpoint_id))
        .order_by(Telemetry.timestamp.desc())
        .limit(120)
        .all()
    )
    return [serialize_telemetry(row) for row in rows]


@app.get("/my/alerts")
@safe_endpoint
def get_my_alerts(db: Session = Depends(get_db), current_user: User = Depends(require_endpoint_user)):
    require_team_for_endpoint_user(current_user)
    if current_user.endpoint_id is None:
        logger.info("My alerts requested: user_id=%s endpoint_id=none rows=0", current_user.id)
        return []
    alerts = (
        db.query(Alert)
        .filter(Alert.endpoint_id == int(current_user.endpoint_id))
        .order_by(Alert.created_at.desc())
        .all()
    )
    logger.info(
        "My alerts requested: user_id=%s endpoint_id=%s rows=%s quarantine_rows=%s",
        current_user.id,
        current_user.endpoint_id,
        len(alerts),
        sum(1 for alert in alerts if is_quarantine_action(alert.action_taken)),
    )
    return [serialize_alert(alert) for alert in alerts]


@app.get("/my/quarantine")
@safe_endpoint
def get_my_quarantine(db: Session = Depends(get_db), current_user: User = Depends(require_endpoint_user)):
    require_team_for_endpoint_user(current_user)
    if current_user.endpoint_id is None:
        logger.info("My quarantine requested: user_id=%s endpoint_id=none rows=0", current_user.id)
        return []
    alerts = quarantine_alert_query(db, {int(current_user.endpoint_id)})
    logger.info(
        "My quarantine requested: user_id=%s endpoint_id=%s rows=%s",
        current_user.id,
        current_user.endpoint_id,
        len(alerts),
    )
    return [serialize_alert(alert) for alert in alerts]


@app.get("/my/health")
@safe_endpoint
def get_my_health(db: Session = Depends(get_db), current_user: User = Depends(require_endpoint_user)):
    require_team_for_endpoint_user(current_user)
    if current_user.endpoint_id is None:
        return {"endpoint": None, "telemetry": None, "alerts": 0, "quarantine": 0}
    endpoint_rows = endpoint_status_rows(db, {int(current_user.endpoint_id)})
    alerts_count = db.query(Alert).filter(Alert.endpoint_id == int(current_user.endpoint_id)).count()
    quarantine_count = (
        db.query(Alert)
        .filter(Alert.endpoint_id == int(current_user.endpoint_id), Alert.action_taken.ilike("%quarantine%"))
        .count()
    )
    endpoint = endpoint_rows[0] if endpoint_rows else None
    return {
        "endpoint": endpoint,
        "telemetry": endpoint.get("telemetry") if endpoint else None,
        "alerts": alerts_count,
        "quarantine": quarantine_count,
    }


@app.delete("/alerts/{alert_id}")
@safe_endpoint
def delete_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    ensure_endpoint_visible(db, current_user, alert.endpoint_id)

    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted successfully", "alert_id": alert_id}


@app.delete("/quarantine/{filename}")
@safe_endpoint
def delete_quarantined_file(filename: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    file_path, metadata_path = get_quarantine_paths(filename)
    related_alerts = (
        db.query(Alert)
        .filter(Alert.filename == filename, Alert.action_taken.ilike("%quarantine%"))
        .all()
    )
    for alert in related_alerts:
        ensure_endpoint_visible(db, current_user, alert.endpoint_id)
    logger.info(
        "Delete quarantine requested: user_id=%s filename=%s related_alerts=%s file_exists=%s metadata_exists=%s",
        current_user.id,
        filename,
        len(related_alerts),
        file_path.exists(),
        metadata_path.exists(),
    )

    if not file_path.exists() and not metadata_path.exists():
        raise HTTPException(status_code=404, detail="Quarantined file not found")

    try:
        if file_path.exists():
            file_path.unlink()

        if metadata_path.exists():
            metadata_path.unlink()

        deleted_alerts = (
            db.query(Alert)
            .filter(Alert.filename == filename, Alert.action_taken.ilike("%quarantine%"))
            .delete(synchronize_session=False)
        )
        db.commit()
    except PermissionError:
        db.rollback()
        raise HTTPException(status_code=403, detail="Permission denied while deleting quarantine file")
    except OSError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not delete quarantine file: {exc}")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not remove related alert entry")

    logger.info(
        "Delete quarantine completed: user_id=%s filename=%s deleted_alerts=%s",
        current_user.id,
        filename,
        deleted_alerts,
    )
    return {
        "message": "Quarantined file deleted successfully",
        "filename": filename,
        "deleted_alerts": deleted_alerts,
    }


@app.post("/restore/{filename}")
@safe_endpoint
def restore_quarantined_file(filename: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    file_path, metadata_path = get_quarantine_paths(filename)
    related_alerts = (
        db.query(Alert)
        .filter(Alert.filename == filename, Alert.action_taken.ilike("%quarantine%"))
        .all()
    )
    for alert in related_alerts:
        ensure_endpoint_visible(db, current_user, alert.endpoint_id)
    logger.info(
        "Restore quarantine requested: user_id=%s filename=%s related_alerts=%s file_exists=%s metadata_exists=%s",
        current_user.id,
        filename,
        len(related_alerts),
        file_path.exists(),
        metadata_path.exists(),
    )

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Quarantined file not found")

    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="Quarantine metadata not found")

    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        original_path = Path(metadata.get("original_path", "")).expanduser()
        if not original_path.name:
            raise HTTPException(status_code=400, detail="Invalid original path in quarantine metadata")

        original_path.parent.mkdir(parents=True, exist_ok=True)
        restore_path = build_unique_restore_path(original_path)
        shutil.move(str(file_path), str(restore_path))
        metadata_path.unlink()

        restored_alerts = (
            db.query(Alert)
            .filter(Alert.filename == filename, Alert.action_taken.ilike("%quarantine%"))
            .update({"action_taken": "Restored"}, synchronize_session=False)
        )
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except json.JSONDecodeError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid quarantine metadata JSON")
    except PermissionError:
        db.rollback()
        raise HTTPException(status_code=403, detail="Permission denied while restoring quarantine file")
    except OSError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not restore quarantine file: {exc}")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not update related alert entry")

    logger.info(
        "Restore quarantine completed: user_id=%s filename=%s restored_path=%s updated_alerts=%s",
        current_user.id,
        filename,
        restore_path,
        restored_alerts,
    )
    return {
        "message": "Quarantined file restored successfully",
        "filename": filename,
        "restored_path": str(restore_path),
        "updated_alerts": restored_alerts,
    }


@app.post("/quarantine/{filename}/restore")
@safe_endpoint
def restore_quarantined_file_legacy(filename: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return restore_quarantined_file(filename, db, current_user)
