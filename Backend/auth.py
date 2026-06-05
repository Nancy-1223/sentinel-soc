from datetime import datetime, timedelta
from typing import Optional
import hashlib
import logging
import os
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User

logger = logging.getLogger("soc_auth")

# Render/Vercel deployments should set SECRET_KEY in environment variables.
# The fallback keeps the existing local demo working for beginners.
SECRET_KEY = os.getenv("SECRET_KEY", "soc-demo-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 30)))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_password_hash(password: str):
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed_password: str):
    return get_password_hash(password) == hashed_password


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.strip().lower()).first()


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("Token validation failed: subject missing")
            raise credentials_exception
    except JWTError:
        logger.warning("Token validation failed: JWT decode error")
        raise credentials_exception
    try:
        user = db.get(User, int(user_id))
    except (TypeError, ValueError):
        logger.warning("Token validation failed: invalid subject value")
        raise credentials_exception
    if user is None:
        logger.warning("Token validation failed: user id %s not found in database", user_id)
        raise credentials_exception
    logger.info("Token validation succeeded: user_id=%s role=%s", user.id, normalize_role(user.role))
    return user


def normalize_role(role: str | None) -> str:
    value = str(role or "admin").strip().lower()
    if value in {"endpoint_user", "endpoint-user", "user"}:
        return "endpoint"
    if value not in {"admin", "endpoint"}:
        return "admin"
    return value


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if normalize_role(current_user.role) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Admin only.")
    return current_user


def require_endpoint_user(current_user: User = Depends(get_current_user)) -> User:
    if normalize_role(current_user.role) != "endpoint":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Endpoint users only.")
    return current_user


def endpoint_access_filter(current_user: User, requested_endpoint_id: int | None = None) -> int | None:
    if normalize_role(current_user.role) == "admin":
        return requested_endpoint_id
    if current_user.endpoint_id is None:
        return None
    if requested_endpoint_id is not None and int(requested_endpoint_id) != int(current_user.endpoint_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Endpoint users can only access their own endpoint.")
    return int(current_user.endpoint_id)
