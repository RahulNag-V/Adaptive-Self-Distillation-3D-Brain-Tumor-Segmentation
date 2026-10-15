import os
import sys
from pathlib import Path
from PIL import Image
import hashlib
from collections import defaultdict

archive_dir = Path(r"c:\Users\rahul\Downloads\archive")
training_dir = archive_dir / "Training"
testing_dir = archive_dir / "Testing"

classes = ["glioma", "meningioma", "notumor", "pituitary"]

print(f"Archive directory: {archive_dir}")
print(f"Training exists: {training_dir.exists()}")
print(f"Testing exists: {testing_dir.exists()}")

def inspect_split(split_dir, split_name):
    print(f"\n==================== Inspecting {split_name} ====================")
    counts = {}
    corrupted = []
    dimensions = defaultdict(int)
    modes = defaultdict(int)
    hashes = {}
    duplicates = []
    
    total_images = 0
    for cls in classes:
        cls_dir = split_dir / cls
        if not cls_dir.exists():
            print(f"ERROR: {cls_dir} does not exist!")
            continue
        
        files = list(cls_dir.glob("*"))
        counts[cls] = len(files)
        total_images += len(files)
        
        for f in files:
            if not f.is_file():
                continue
            # Check corrupted
            try:
                with Image.open(f) as img:
                    img.verify() # verify integrity
                # re-open to check size & mode
                with Image.open(f) as img:
                    dimensions[img.size] += 1
                    modes[img.mode] += 1
                
                # Check md5 hash
                with open(f, "rb") as fp:
                    h = hashlib.md5(fp.read()).hexdigest()
                if h in hashes:
                    duplicates.append((str(f), hashes[h]))
                else:
                    hashes[h] = str(f)
            except Exception as e:
                corrupted.append((str(f), str(e)))
                
    print(f"Total samples in {split_name}: {total_images}")
    for cls, cnt in counts.items():
        print(f"  - {cls}: {cnt} ({cnt / total_images * 100:.2f}%)")
    
    print(f"Corrupted images: {len(corrupted)}")
    if corrupted:
        for c in corrupted[:5]:
            print(f"    {c}")
            
    print(f"Duplicates within {split_name}: {len(duplicates)}")
    
    print("Color Modes distribution:")
    for mode, cnt in modes.items():
        print(f"  - {mode}: {cnt}")
        
    print(f"Top 5 Image Dimensions (width, height):")
    sorted_dims = sorted(dimensions.items(), key=lambda x: x[1], reverse=True)
    for dim, cnt in sorted_dims[:5]:
        print(f"  - {dim}: {cnt} ({cnt / total_images * 100:.2f}%)")
        
    return counts, total_images, corrupted, duplicates

train_counts, train_total, train_corrupt, train_dups = inspect_split(training_dir, "Training")
test_counts, test_total, test_corrupt, test_dups = inspect_split(testing_dir, "Testing")
