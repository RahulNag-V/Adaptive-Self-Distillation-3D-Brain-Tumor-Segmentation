import os
import json
import random
from pathlib import Path
from collections import defaultdict

def create_dataset_splits():
    random.seed(42)
    
    archive_dir = Path(r"c:\Users\rahul\Downloads\archive")
    training_dir = archive_dir / "Training"
    testing_dir = archive_dir / "Testing"
    
    class_names = ["glioma", "meningioma", "notumor", "pituitary"]
    class_to_idx = {name: i for i, name in enumerate(class_names)}
    
    # 1. Collect training files per class
    train_files = []
    val_files = []
    
    train_counts = defaultdict(int)
    val_counts = defaultdict(int)
    
    for cls in class_names:
        cls_dir = training_dir / cls
        files = sorted([str(p.resolve()) for p in cls_dir.glob("*") if p.is_file()])
        random.shuffle(files)
        
        # 80% train, 20% val
        n_total = len(files)
        n_train = int(n_total * 0.8)
        
        cls_train = files[:n_train]
        cls_val = files[n_train:]
        
        for f in cls_train:
            train_files.append({"path": f, "class": cls, "label": class_to_idx[cls]})
            train_counts[cls] += 1
            
        for f in cls_val:
            val_files.append({"path": f, "class": cls, "label": class_to_idx[cls]})
            val_counts[cls] += 1
            
    # 2. Collect untouched testing files per class
    test_files = []
    test_counts = defaultdict(int)
    for cls in class_names:
        cls_dir = testing_dir / cls
        files = sorted([str(p.resolve()) for p in cls_dir.glob("*") if p.is_file()])
        for f in files:
            test_files.append({"path": f, "class": cls, "label": class_to_idx[cls]})
            test_counts[cls] += 1
            
    # Save split JSON
    out_dir = Path("data/classifier")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    split_data = {
        "random_seed": 42,
        "class_names": class_names,
        "class_to_idx": class_to_idx,
        "counts": {
            "training": dict(train_counts),
            "validation": dict(val_counts),
            "testing": dict(test_counts),
            "total_training": len(train_files),
            "total_validation": len(val_files),
            "total_testing": len(test_files)
        },
        "train": train_files,
        "val": val_files,
        "test": test_files
    }
    
    with open(out_dir / "splits.json", "w") as f:
        json.dump(split_data, f, indent=2)
        
    print(f"Splits saved to {out_dir / 'splits.json'}")
    print("Dataset Summary:")
    print(f"  Training samples:   {len(train_files)} (80% of Training/)")
    for cls in class_names:
        print(f"    - {cls}: {train_counts[cls]}")
    print(f"  Validation samples: {len(val_files)} (20% of Training/)")
    for cls in class_names:
        print(f"    - {cls}: {val_counts[cls]}")
    print(f"  Testing samples:    {len(test_files)} (100% of Testing/ untouched)")
    for cls in class_names:
        print(f"    - {cls}: {test_counts[cls]}")

if __name__ == "__main__":
    create_dataset_splits()
