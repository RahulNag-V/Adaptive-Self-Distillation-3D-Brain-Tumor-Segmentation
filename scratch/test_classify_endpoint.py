import sys
import os
import json
import io
import urllib.request
import urllib.error
from pathlib import Path
from PIL import Image

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "dashboard" / "backend"
VENV_PYTHON = PROJECT_ROOT / ".venv" / "Scripts" / "python.exe"

def get_test_image_bytes():
    """
    Finds a real test image from archive or data/classifier/splits.json,
    or generates a fallback synthetic test image.
    """
    candidates = [
        Path(r"c:\Users\rahul\Downloads\archive\Testing\pituitary\Te-pi_1.jpg"),
        Path(r"c:\Users\rahul\Downloads\archive\Testing\glioma\Te-gl_10.jpg"),
        Path(r"c:\Users\rahul\Downloads\archive\Testing\meningioma\Te-aug-me_1.jpg"),
        Path(r"c:\Users\rahul\Downloads\archive\Testing\notumor\Te-no_1.jpg"),
    ]
    for c in candidates:
        if c.exists():
            with open(c, "rb") as f:
                return f.read(), c.name

    splits_file = PROJECT_ROOT / "data" / "classifier" / "splits.json"
    if splits_file.exists():
        try:
            with open(splits_file, "r", encoding="utf-8") as f:
                splits = json.load(f)
            if splits.get("test"):
                p = Path(splits["test"][0]["path"])
                if p.exists():
                    with open(p, "rb") as f:
                        return f.read(), p.name
        except Exception:
            pass

    # Fallback synthetic image
    buf = io.BytesIO()
    img = Image.new("RGB", (224, 224), color=(128, 128, 128))
    img.save(buf, format="JPEG")
    return buf.getvalue(), "synthetic_test.jpg"

def is_live_server_running(url="http://127.0.0.1:8000/api/health"):
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False

def make_multipart_body(field_name, filename, file_bytes, content_type):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    header = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8")
    footer = f"\r\n--{boundary}--\r\n".encode("utf-8")
    return header + file_bytes + footer, f"multipart/form-data; boundary={boundary}"

def test_via_http():
    print("Detected live backend server running at http://127.0.0.1:8000.")
    print("Testing POST /api/classify via HTTP...")
    
    # 1. Valid image test
    img_bytes, filename = get_test_image_bytes()
    print(f"\n[Test 1] Classifying valid image: {filename} ({len(img_bytes)} bytes)")
    
    body, ctype = make_multipart_body("file", filename, img_bytes, "image/jpeg")
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/classify",
        data=body,
        headers={"Content-Type": ctype},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=30.0) as resp:
        status_code = resp.status
        data = json.loads(resp.read().decode("utf-8"))

    print(f"Status Code: {status_code}")
    print("Response JSON:")
    print(json.dumps(data, indent=2))

    assert status_code == 200
    assert "predicted_class" in data
    assert "confidence" in data
    assert "probabilities" in data
    assert len(data["probabilities"]) == 4
    assert data.get("model") == "EfficientNet-B0"
    print("\n--> [PASS] Valid image classification verified successfully.")

    # 2. Invalid file test
    print("\n[Test 2] Testing rejection of invalid file type (.txt)")
    bad_body, bad_ctype = make_multipart_body("file", "test.txt", b"plain text", "text/plain")
    bad_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/classify",
        data=bad_body,
        headers={"Content-Type": bad_ctype},
        method="POST"
    )
    try:
        urllib.request.urlopen(bad_req, timeout=5.0)
        assert False, "Expected HTTP 400 but request succeeded"
    except urllib.error.HTTPError as e:
        print(f"Status Code: {e.code}")
        err_data = json.loads(e.read().decode("utf-8"))
        print(f"Detail: {err_data.get('detail')}")
        assert e.code == 400
        print("--> [PASS] Invalid file rejection verified successfully.")

    print("\n" + "=" * 65)
    print("ALL CLASSIFY ENDPOINT TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)

def test_via_testclient():
    # If not using .venv python, re-execute with .venv python
    if VENV_PYTHON.exists() and sys.executable.lower() != str(VENV_PYTHON).lower():
        import subprocess
        print(f"Re-executing test with project virtualenv: {VENV_PYTHON}")
        cmd = [str(VENV_PYTHON), str(__file__)] + sys.argv[1:]
        res = subprocess.run(cmd)
        sys.exit(res.returncode)

    # Ensure backend and project root are in sys.path
    for p in [str(PROJECT_ROOT), str(BACKEND_DIR)]:
        if p not in sys.path:
            sys.path.insert(0, p)

    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as client:
        img_bytes, filename = get_test_image_bytes()
        print(f"\n[Test 1] Classifying valid image: {filename} ({len(img_bytes)} bytes)")
        files = {"file": (filename, img_bytes, "image/jpeg")}
        resp = client.post("/api/classify", files=files)
        print(f"Status Code: {resp.status_code}")
        data = resp.json()
        print("Response JSON:")
        print(json.dumps(data, indent=2))
        assert resp.status_code == 200
        assert "predicted_class" in data
        assert len(data["probabilities"]) == 4

        print("\n[Test 2] Testing rejection of invalid file type (.txt)")
        err_resp = client.post("/api/classify", files={"file": ("test.txt", b"text", "text/plain")})
        print(f"Status Code: {err_resp.status_code}")
        print(f"Detail: {err_resp.json().get('detail')}")
        assert err_resp.status_code == 400

    print("\n" + "=" * 65)
    print("ALL CLASSIFY ENDPOINT TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)

def main():
    print("=" * 65)
    print("TESTING CLASSIFICATION ENDPOINT (POST /api/classify)")
    print("=" * 65)

    if is_live_server_running():
        test_via_http()
    else:
        test_via_testclient()

if __name__ == "__main__":
    main()
