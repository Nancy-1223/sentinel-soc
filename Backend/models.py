from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    endpoints = relationship("Endpoint", back_populates="user")


class Endpoint(Base):
    __tablename__ = "endpoints"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pc_name = Column(String, nullable=False)
    status = Column(String, default="active")
    last_seen = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="endpoints")
    alerts = relationship("Alert", back_populates="endpoint")
    telemetry = relationship("Telemetry", back_populates="endpoint")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    endpoint_id = Column(Integer, ForeignKey("endpoints.id"), nullable=False)
    pc_name = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_extension = Column(String, nullable=False)
    keyword_count = Column(Integer, nullable=False)
    file_size = Column(Integer, nullable=False)
    prediction = Column(String, nullable=False)
    risk_score = Column(Integer, nullable=False)
    action_taken = Column(String, nullable=False)
    suspicious_content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    endpoint = relationship("Endpoint", back_populates="alerts")


class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, index=True)
    endpoint_id = Column(Integer, ForeignKey("endpoints.id"), nullable=False, index=True)
    pc_name = Column(String, nullable=False)
    cpu = Column(Float, nullable=False)
    ram = Column(Float, nullable=False)
    disk = Column(Float, nullable=False)
    network_sent = Column(Integer, nullable=False)
    network_received = Column(Integer, nullable=False)
    hostname = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    endpoint = relationship("Endpoint", back_populates="telemetry")
