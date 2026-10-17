import urllib.request
import json

patients = ['BraTS2021_01017', 'BraTS2021_01018', 'BraTS2021_01019', 'BraTS2021_01020', 'BraTS2021_01021']

print("=" * 80)
print(f"{'PATIENT ID':<18} | {'WT (cm3)':<10} | {'TC (cm3)':<10} | {'ET (cm3)':<10} | {'PEAK SLICE':<10} | {'REL %':<8} | {'CATEGORY'}")
print("-" * 80)

for pid in patients:
    url = f"http://127.0.0.1:8000/api/patients/{pid}/tumor-burden?seg_source=ground_truth"
    req = urllib.request.urlopen(url)
    data = json.loads(req.read().decode())
    
    wt = data["whole_tumor"]
    tc = data["tumor_core"]
    et = data["enhancing_tumor"]
    cat = data["burden_category"]
    rel = data["relative_tumor_burden"]
    peak = wt["maximum_cross_sectional_area"]["peak_axial_slice_index"]
    
    print(f"{pid:<18} | {wt['volume_cm3']:<10.2f} | {tc['volume_cm3']:<10.2f} | {et['volume_cm3']:<10.2f} | {peak:<10} | {rel['relative_burden_percentage']:<8.2f} | {cat['category']}")

print("=" * 80)
