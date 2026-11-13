"""Straighten the 40 faces of assets/decks/fournier-spanish.jpg into individual images.

The photographed cards are slightly rotated, so fixed rectangular windows cut part of
some faces. Each card is located on the felt, rotated upright and trimmed to its edge.
Usage: python3 scripts/extract-spanish-faces.py   (needs numpy, opencv-python-headless, pillow)
"""
import os, cv2, numpy as np
from PIL import Image

root = os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', 'assets', 'decks')
img = cv2.imread(os.path.join(root, 'fournier-spanish.jpg'))
out = os.path.join(root, 'fournier'); os.makedirs(out, exist_ok=True)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
felt = ((hsv[:, :, 0] > 50) & (hsv[:, :, 0] < 95) & (hsv[:, :, 1] > 90)).astype(np.uint8)
cards = cv2.morphologyEx((1 - felt) * 255, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
contours, _ = cv2.findContours(cards, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
rects = [cv2.minAreaRect(c) for c in contours if cv2.contourArea(c) > 15000]
assert len(rects) == 40, len(rects)
rects.sort(key=lambda r: (round(r[0][1] / 230), r[0][0]))
suits = ['oros', 'espadas', 'copas', 'bastos']
ranks = ['1', '2', '3', '4', '5', '6', '7', '10', '11', '12']
W, H, radius = 208, 320, 14
alpha = np.zeros((H, W), np.uint8)
cv2.rectangle(alpha, (radius, 0), (W - 1 - radius, H - 1), 255, -1)
cv2.rectangle(alpha, (0, radius), (W - 1, H - 1 - radius), 255, -1)
for x, y in [(radius, radius), (W - 1 - radius, radius), (radius, H - 1 - radius), (W - 1 - radius, H - 1 - radius)]:
    cv2.circle(alpha, (x, y), radius, 255, -1, cv2.LINE_AA)
for i, ((cx, cy), (w, h), angle) in enumerate(rects):
    if w > h: w, h, angle = h, w, angle + 90
    w -= 6; h = min(h - 6, w / 0.632)  # trim felt and shadow, keep the card ratio
    box = cv2.boxPoints(((cx, cy), (w, h), angle))
    s, d = box.sum(1), np.diff(box, axis=1).ravel()
    src = np.float32([box[s.argmin()], box[d.argmin()], box[s.argmax()], box[d.argmax()]])
    dst = np.float32([[0, 0], [W - 1, 0], [W - 1, H - 1], [0, H - 1]])
    face = cv2.warpPerspective(img, cv2.getPerspectiveTransform(src, dst), (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    rgba = cv2.cvtColor(np.dstack([face, alpha]), cv2.COLOR_BGRA2RGBA)
    Image.fromarray(rgba).save(os.path.join(out, f'{ranks[i % 10]}{suits[i // 10]}.webp'), quality=88, method=6)
print('40 faces written to', out)
