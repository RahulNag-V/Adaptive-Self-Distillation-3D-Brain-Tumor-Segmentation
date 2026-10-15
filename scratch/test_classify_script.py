import subprocess
import sys
from pathlib import Path

def test_classify_samples():
    testing_dir = Path(r"c:\Users\rahul\Downloads\archive\Testing")
    
    samples = [
        ("glioma", list((testing_dir / "glioma").glob("*.jpg"))[0]),
        ("meningioma", list((testing_dir / "meningioma").glob("*.jpg"))[0]),
        ("notumor", list((testing_dir / "notumor").glob("*.jpg"))[0]),
        ("pituitary", list((testing_dir / "pituitary").glob("*.jpg"))[0]),
        ("pituitary_2", list((testing_dir / "pituitary").glob("*.jpg"))[1]),
    ]
    
    python_exe = sys.executable
    script_path = Path("scripts/classify_image.py")
    
    print("Testing `scripts/classify_image.py` on 5 real test images:")
    print("=" * 60)
    
    for label, img_path in samples:
        print(f"\n[Test Image] True Class: {label}")
        print(f"Path: {img_path}")
        
        cmd = [python_exe, str(script_path), "--image", str(img_path)]
        res = subprocess.run(cmd, capture_output=True, text=True)
        
        print("Exit Code:", res.returncode)
        print("Output:\n" + res.stdout.strip())
        if res.stderr:
            print("Stderr:\n" + res.stderr.strip())
            
if __name__ == "__main__":
    test_classify_samples()
