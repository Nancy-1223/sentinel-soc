from pathlib import Path
from typing import Dict
import joblib

MODEL_PATH = Path(__file__).parent / "model.pkl"

EXTENSION_MAP = {
    ".txt": 1,
    ".pdf": 2,
    ".doc": 3,
    ".docx": 4,
    ".xls": 5,
    ".xlsx": 6,
    ".zip": 7,
    ".rar": 8,
    ".js": 9,
    ".jar": 10,
    ".exe": 11,
    ".bat": 12,
    ".ps1": 13,
    ".vbs": 14,
    ".scr": 15,
    ".dll": 16,
    ".sys": 17,
    ".bin": 18,
}

DANGEROUS_EXTENSIONS = {".exe", ".bat", ".ps1", ".vbs", ".scr", ".js", ".jar", ".dll", ".sys"}

_model = None


def load_model():
    global _model
    if _model is None:
        try:
            _model = joblib.load(MODEL_PATH)
        except Exception:
            _model = None
    return _model


def encode_extension(file_extension: str) -> int:
    extension = file_extension.lower().strip()
    if not extension.startswith("."):
        extension = f".{extension}"
    return EXTENSION_MAP.get(extension, 0)


def calculate_risk(file_extension: str, keyword_count: int, is_executable: bool, file_size: int) -> Dict[str, object]:
    risk_score = 10
    reasons = []
    extension = file_extension.lower().strip()
    if not extension.startswith("."):
        extension = f".{extension}"

    if extension in DANGEROUS_EXTENSIONS:
        risk_score += 40
        reasons.append(f"Dangerous extension {extension} detected.")

    if keyword_count >= 3:
        risk_score += 30
        reasons.append(f"High keyword count ({keyword_count}) suggests suspicious content.")
    elif keyword_count > 0:
        risk_score += 10
        reasons.append(f"Suspicious keyword count ({keyword_count}) is above zero.")

    if is_executable:
        risk_score += 20
        reasons.append("File is executable, which increases risk.")

    if file_size > 20_000_000:
        risk_score += 10
        reasons.append("Large file size adds a little extra risk.")

    if not reasons:
        reasons.append("No strong risk indicators found in the request.")

    if risk_score > 100:
        risk_score = 100

    return {
        "risk_score": risk_score,
        "reasons": reasons,
    }


def predict_file(filename: str, file_extension: str, keyword_count: int, file_size: int, is_executable: bool) -> Dict[str, object]:
    model = load_model()
    ext_code = encode_extension(file_extension)
    features = [[ext_code, keyword_count, file_size, int(is_executable)]]

    if model is None:
        return {
            "prediction": "Safe",
            "risk_score": 10,
            "reason": "Model not trained yet. Run train_model.py to create model.pkl.",
        }

    try:
        raw_prediction = model.predict(features)[0]
    except Exception:
        raw_prediction = "Safe"

    risk_info = calculate_risk(file_extension, keyword_count, is_executable, file_size)
    prediction = raw_prediction

    if raw_prediction == "Safe" and risk_info["risk_score"] >= 75:
        prediction = "Malicious"
    elif raw_prediction == "Suspicious" and risk_info["risk_score"] >= 85:
        prediction = "Malicious"

    return {
        "prediction": prediction,
        "risk_score": risk_info["risk_score"],
        "reason": " ".join(risk_info["reasons"]),
    }
