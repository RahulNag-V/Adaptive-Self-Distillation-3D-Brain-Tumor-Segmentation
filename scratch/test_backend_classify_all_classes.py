import json
from pathlib import Path
import httpx

BASE_URL = "http://127.0.0.1:8000"

def test_all_classes():
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
        # 1. Health
        h_res = client.get("/api/health")
        print(f"Backend Health: {h_res.status_code} -> {h_res.json()}")
        assert h_res.status_code == 200

        # 2. Test images
        test_dir = Path(r"c:\Users\rahul\Downloads\archive\Testing")
        cases = [
            ("glioma", test_dir / "glioma" / "Te-gl_10.jpg"),
            ("meningioma", test_dir / "meningioma" / "Te-aug-me_1.jpg"),
            ("notumor", test_dir / "notumor" / "Te-no_1.jpg"),
            ("pituitary", test_dir / "pituitary" / "Te-pi_1.jpg"),
        ]

        print("\nTesting POST /api/classify with real test images across all 4 classes:")
        print("=" * 70)

        for true_cls, img_path in cases:
            print(f"\n--- Testing class: {true_cls} ---")
            print(f"File: {img_path}")
            assert img_path.exists(), f"Image not found: {img_path}"

            with open(img_path, "rb") as f:
                files = {"file": (img_path.name, f.read(), "image/jpeg")}
                res = client.post("/api/classify", files=files)

            print(f"Status Code: {res.status_code}")
            assert res.status_code == 200, f"Failed with {res.status_code}: {res.text}"
            data = res.json()
            print(f"Predicted Class:        {data['predicted_class']}")
            print(f"Confidence:             {data['confidence'] * 100:.2f}%")
            print(f"Model:                  {data.get('model')}")
            print(f"Device:                 {data.get('device')}")
            print(f"Inference Time:         {data.get('inference_time_ms', round(data['inference_time_seconds']*1000, 2))} ms")
            print(f"Probabilities:")
            for k, v in data["probabilities"].items():
                print(f"  - {k:<12}: {v * 100:.2f}%")

        print("\n" + "=" * 70)
        print("ALL 4 CLASSES TESTED SUCCESSFULLY OVER HTTP!")

if __name__ == "__main__":
    test_all_classes()
