import re
import os

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Find all occurrences of image files in html/js
matches = set(re.findall(r'[\'"]([^\'"]+?\.(?:jpg|jpeg|png|webp|svg))[\'"]', html))

found = []
missing = []

for m in sorted(matches):
    path = m.strip()
    if path.startswith("http://") or path.startswith("https://") or path.startswith("data:"):
        continue
    clean = path.lstrip("./")
    if os.path.exists(clean) and os.path.isfile(clean):
        sz = os.path.getsize(clean)
        found.append((path, sz))
    else:
        missing.append(path)

print(f"Total images referenced: {len(matches)}")
print(f"Valid on disk: {len(found)}")
print(f"Missing: {len(missing)}")
for m in missing:
    print(f"  MISSING: {m}")

# Also check for images in images/ directory not referenced or suspicious
print("\nChecking all files in images/ for size or issues:")
for root, dirs, files in os.walk("images"):
    for file in sorted(files):
        p = os.path.join(root, file)
        sz = os.path.getsize(p)
        if sz < 500:
            print(f"  Suspiciously small ({sz}b): {p}")
