from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from pathlib import Path
from functools import wraps
import json
import logging
import os
import shutil

from database import Base, get_db, init_database
from models import User, Endpoint, Alert, Telemetry
from auth import get_password_hash, authenticate_user, create_access_token, get_current_user
from detector import predict_file

init_database(Base)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
QUARANTINE_DIR = PROJECT_ROOT / "quarantine"
ENDPOINT_ONLINE_TIMEOUT_SECONDS = 15

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("soc_api")

app = FastAPI(
    title="AI-Based SOC Threat Detection Backend",
    description="Simple backend for demo SOC threat detection and endpoint protection",
)

DEFAULT_ALLOWED_ORIGINS = [
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
    return configured_origins or DEFAULT_ALLOWED_ORIGINS


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user_id: int
    name: str
    email: str
    role: str


class EndpointRegisterRequest(BaseModel):
    user_id: int
    pc_name: str


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
        "created_at": serialize_datetime(row.created_at),
    }


def serialize_datetime(value: datetime | None):
    if not value:
        return None
    return value.replace(tzinfo=None).isoformat() + "Z"


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


def endpoint_live_status(endpoint: Endpoint) -> str:
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


@app.post("/register", status_code=status.HTTP_201_CREATED)
@safe_endpoint
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=request.name.strip(),
        email=email,
        password_hash=get_password_hash(request.password),
        role=request.role.strip().lower(),
    )
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
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
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    return {
        "token": token,
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


@app.get("/me")
@safe_endpoint
def read_current_user(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": current_user.created_at,
    }


@app.post("/register-endpoint", status_code=status.HTTP_201_CREATED)
@safe_endpoint
def register_endpoint(request: EndpointRegisterRequest, db: Session = Depends(get_db)):
    user = db.get(User, request.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    endpoint = Endpoint(
        user_id=request.user_id,
        pc_name=request.pc_name,
        status="Protected",
        last_seen=datetime.utcnow(),
    )
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)
    return {"message": "Endpoint registered successfully", "endpoint_id": endpoint.id}


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
def upload_alert(request: AlertUploadRequest, db: Session = Depends(get_db)):
    endpoint = db.get(Endpoint, request.endpoint_id)
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    action_taken = request.action_taken.strip()
    endpoint.pc_name = request.pc_name
    endpoint.last_seen = datetime.utcnow()
    endpoint.status = "Online"

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
        suspicious_content=request.suspicious_content,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"message": "Alert stored successfully", "alert_id": alert.id}


@app.post("/telemetry", status_code=status.HTTP_201_CREATED)
@safe_endpoint
def receive_telemetry(request: TelemetryRequest, db: Session = Depends(get_db)):
    endpoint = db.get(Endpoint, request.endpoint_id)
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    received_at = datetime.utcnow()
    telemetry = Telemetry(
        endpoint_id=request.endpoint_id,
        pc_name=request.pc_name.strip(),
        cpu=request.cpu,
        ram=request.ram,
        disk=request.disk,
        network_sent=request.network_sent,
        network_received=request.network_received,
        hostname=request.hostname.strip(),
        timestamp=request.timestamp.replace(tzinfo=None),
    )
    endpoint.pc_name = request.pc_name.strip()
    endpoint.last_seen = received_at
    endpoint.status = "Online"

    db.add(telemetry)
    db.commit()
    db.refresh(telemetry)
    return {"message": "Telemetry stored successfully", "telemetry_id": telemetry.id}


@app.get("/telemetry")
@safe_endpoint
def get_latest_telemetry(db: Session = Depends(get_db)):
    return [serialize_telemetry(row) for row in latest_telemetry_rows(db)]


@app.get("/telemetry/{endpoint_id}")
@safe_endpoint
def get_endpoint_telemetry(endpoint_id: int, db: Session = Depends(get_db)):
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
def get_endpoint_status(db: Session = Depends(get_db)):
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
    endpoints = db.query(Endpoint).order_by(Endpoint.id.asc()).all()

    return [
        {
            "endpoint_id": endpoint.id,
            "pc_name": latest_by_endpoint.get(endpoint.id, endpoint).pc_name,
            "status": endpoint_live_status(endpoint),
            "protection_status": alert_protection_status(latest_alerts.get(endpoint.id)),
            "last_seen": serialize_datetime(endpoint.last_seen),
            "telemetry": serialize_telemetry(latest_by_endpoint[endpoint.id]) if endpoint.id in latest_by_endpoint else None,
            "total_alerts": stats_by_endpoint.get(endpoint.id, {}).get("total_alerts", 0),
            "max_risk_score": stats_by_endpoint.get(endpoint.id, {}).get("max_risk_score", 0),
        }
        for endpoint in endpoints
    ]


@app.delete("/endpoints/{endpoint_id}")
@safe_endpoint
def delete_endpoint(endpoint_id: int, remove_alerts: bool = True, db: Session = Depends(get_db)):
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
def reset_demo_data(db: Session = Depends(get_db)):
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
def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).all()
    return [
        {
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
            "created_at": alert.created_at,
        }
        for alert in alerts
    ]


@app.delete("/alerts/{alert_id}")
@safe_endpoint
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted successfully", "alert_id": alert_id}


@app.delete("/quarantine/{filename}")
@safe_endpoint
def delete_quarantined_file(filename: str, db: Session = Depends(get_db)):
    file_path, metadata_path = get_quarantine_paths(filename)

    if not file_path.exists() and not metadata_path.exists():
        raise HTTPException(status_code=404, detail="Quarantined file not found")

    try:
        if file_path.exists():
            file_path.unlink()

        if metadata_path.exists():
            metadata_path.unlink()

        deleted_alerts = (
            db.query(Alert)
            .filter(Alert.filename == filename, Alert.action_taken == "Quarantined")
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

    return {
        "message": "Quarantined file deleted successfully",
        "filename": filename,
        "deleted_alerts": deleted_alerts,
    }


@app.post("/restore/{filename}")
@safe_endpoint
def restore_quarantined_file(filename: str, db: Session = Depends(get_db)):
    file_path, metadata_path = get_quarantine_paths(filename)

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
            .filter(Alert.filename == filename, Alert.action_taken == "Quarantined")
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

    return {
        "message": "Quarantined file restored successfully",
        "filename": filename,
        "restored_path": str(restore_path),
        "updated_alerts": restored_alerts,
    }


@app.post("/quarantine/{filename}/restore")
@safe_endpoint
def restore_quarantined_file_legacy(filename: str, db: Session = Depends(get_db)):
    return restore_quarantined_file(filename, db)
