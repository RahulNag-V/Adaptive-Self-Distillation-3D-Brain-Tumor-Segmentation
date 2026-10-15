import json
from pathlib import Path
from PIL import Image
import matplotlib.pyplot as plt

def main():
    splits_file = Path("data/classifier/splits.json")
    with open(splits_file, "r") as f:
        splits = json.load(f)
        
    class_names = splits["class_names"]
    train_items = splits["train"]
    
    samples_per_class = {c: [] for c in class_names}
    for item in train_items:
        cls = item["class"]
        if len(samples_per_class[cls]) < 3:
            samples_per_class[cls].append(item["path"])
            
    fig, axes = plt.subplots(4, 3, figsize=(9, 12))
    for row, cls in enumerate(class_names):
        for col in range(3):
            ax = axes[row, col]
            img_path = samples_per_class[cls][col]
            with Image.open(img_path) as img:
                img_rgb = img.convert("RGB")
                ax.imshow(img_rgb)
                ax.set_title(f"{cls.capitalize()} (Sample {col+1})\n{img.size[0]}x{img.size[1]} | {img.mode}", fontsize=10)
                ax.axis("off")
                
    plt.tight_layout()
    out_path = Path("results/classifier/sample_class_images.png")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out_path, dpi=150)
    plt.close()
    print(f"Sample class images saved to {out_path}")

if __name__ == "__main__":
    main()
