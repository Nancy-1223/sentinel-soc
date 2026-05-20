import joblib
from sklearn.ensemble import RandomForestClassifier

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


def encode_extension(extension: str) -> int:
    ext = extension.lower().strip()
    if not ext.startswith("."):
        ext = f".{ext}"
    return EXTENSION_MAP.get(ext, 0)


def build_training_data():
    samples = [
        (".txt", 0, 1024, False, "Safe"),
        (".pdf", 0, 50_000, False, "Safe"),
        (".docx", 1, 80_000, False, "Safe"),
        (".zip", 0, 1_000_000, False, "Suspicious"),
        (".js", 2, 20_000, True, "Suspicious"),
        (".exe", 0, 5_000_000, True, "Malicious"),
        (".bat", 3, 2_000, True, "Malicious"),
        (".ps1", 5, 10_000, True, "Malicious"),
        (".txt", 4, 700, False, "Suspicious"),
        (".doc", 0, 1_200_000, False, "Suspicious"),
        (".dll", 0, 4_000_000, True, "Malicious"),
        (".pdf", 5, 2_000, False, "Malicious"),
        (".txt", 2, 300, False, "Suspicious"),
        (".scr", 1, 30_000, True, "Malicious"),
        (".jpg", 0, 150_000, False, "Safe"),
    ]

    X = []
    y = []
    for extension, keyword_count, file_size, is_executable, label in samples:
        X.append([encode_extension(extension), keyword_count, file_size, int(is_executable)])
        y.append(label)
    return X, y


def train_and_save_model():
    X, y = build_training_data()
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X, y)
    joblib.dump(model, "model.pkl")
    print("Training complete. Saved model.pkl")


if __name__ == "__main__":
    train_and_save_model()
