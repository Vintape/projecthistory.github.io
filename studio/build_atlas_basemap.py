"""Offline Natural Earth reprojection and matching interactive SVG coordinates.

Usage: python3 studio/build_atlas_basemap.py /path/to/NE1_50M_SR_W.zip
Requires numpy and Pillow; never runs in the browser. Natural Earth is public domain.
"""
import math
from pathlib import Path
import sys
from zipfile import ZipFile

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PHI0, LAM0 = math.radians(57), math.radians(95)
W, H = 1100, 620
XMIN, XMAX, YMIN, YMAX = -1.0, 1.0, -.58, .55


def project(lon, lat):
    """Spherical Lambert azimuthal equal-area, centred on northern Eurasia."""
    p, l = math.radians(lat), math.radians(lon)
    k = math.sqrt(2 / (1 + math.sin(PHI0)*math.sin(p) + math.cos(PHI0)*math.cos(p)*math.cos(l-LAM0)))
    x = k * math.cos(p) * math.sin(l-LAM0)
    y = k * (math.cos(PHI0)*math.sin(p) - math.sin(PHI0)*math.cos(p)*math.cos(l-LAM0))
    return (x-XMIN)/(XMAX-XMIN)*W, (YMAX-y)/(YMAX-YMIN)*H


def main(archive):
    out = ROOT / 'images' / 'atlas'
    out.mkdir(parents=True, exist_ok=True)
    with ZipFile(archive) as z:
        src = np.asarray(Image.open(z.open('NE1_50M_SR_W/NE1_50M_SR_W.tif')).convert('RGB'))
    # Pixel-centre inverse projection, so raster and clickable points share a CRS.
    xx, yy = np.meshgrid(np.linspace(XMIN,XMAX,W*2), np.linspace(YMAX,YMIN,H*2))
    rho = np.maximum(np.hypot(xx,yy), 1e-12)
    cc = 2*np.arcsin(np.minimum(rho/2,1))
    lat = np.arcsin(np.cos(cc)*math.sin(PHI0) + yy*np.sin(cc)*math.cos(PHI0)/rho)
    lon = LAM0 + np.arctan2(xx*np.sin(cc), rho*math.cos(PHI0)*np.cos(cc)-yy*math.sin(PHI0)*np.sin(cc))
    u = ((np.degrees(lon)+180)%360/360*src.shape[1]).astype(int).clip(0,src.shape[1]-1)
    v = ((90-np.degrees(lat))/180*src.shape[0]).astype(int).clip(0,src.shape[0]-1)
    Image.fromarray(src[v,u]).save(out/'natural-earth-eurasia.webp',quality=92,method=6)

    svg = ['<svg viewBox="0 0 1100 620" fill="none" xmlns="http://www.w3.org/2000/svg" id="atlasRussiaSvgMap">',
           '<title>Natural Earth · Eurasia</title>',
           '<image href="./images/atlas/natural-earth-eurasia.webp" width="1100" height="620" preserveAspectRatio="none"/>',
           '<defs><linearGradient id="atlasShade" x2="0" y2="1"><stop stop-color="#081b29" stop-opacity=".12"/><stop offset="1" stop-color="#081b29" stop-opacity=".27"/></linearGradient></defs>',
           '<rect width="1100" height="620" fill="url(#atlasShade)" pointer-events="none"/>',
           '<g class="atlas-graticule" stroke="#173544" stroke-opacity=".18" stroke-width=".7">']
    for lat0 in [40,50,60,70,80]:
        pts=[project(lon0,lat0) for lon0 in range(-5,191,2)]
        svg.append('<path d="'+' '.join(('M' if i==0 else 'L')+f'{x:.1f},{y:.1f}' for i,(x,y) in enumerate(pts))+'"/>')
    for lon0 in range(20,181,20):
        pts=[project(lon0,lat0) for lat0 in range(28,86,2)]
        svg.append('<path d="'+' '.join(('M' if i==0 else 'L')+f'{x:.1f},{y:.1f}' for i,(x,y) in enumerate(pts))+'"/>')
    svg.append('</g>')
    # Physical labels share the same projection, and reuse existing translation keys.
    for lon,lat,key,label in [(108,53.5,'map_geo_baikal','оз. Байкал'),(51,42,'map_geo_caspian','Каспий'),(57,63,'map_geo_ural','УРАЛЬСКИЙ ХРЕБЕТ'),(46,51,'map_geo_volga','р. Волга'),(71,64,'map_geo_ob','р. Обь'),(86,66,'map_geo_yenisei','р. Енисей'),(126,67,'map_geo_lena','р. Лена'),(133,48,'map_geo_amur','р. Амур')]:
        x,y=project(lon,lat)
        svg.append(f'<text x="{x:.1f}" y="{y:.1f}" fill="#1b3c4c" font-size="10" font-family="Montserrat" font-style="italic" paint-order="stroke" stroke="#e6e8d3" stroke-opacity=".65" stroke-width="2" data-i18n="{key}">{label}</text>')
    # Coordinates identify a representative city/locality, not claimed cultural boundaries.
    regions=[('pomorye',40.54,64.54,'Поморье',-48,-36,104),('tatarstan',49.1,55.79,'Татарстан',-48,-37,120),('caucasus',48.29,42.06,'Кавказ',-102,-28,102),('altai',86.3,50.5,'Горный Алтай',16,-12,140),('yakutia',129.7,62,'Якутия',-35,-38,108),('kamchatka',158.65,53,'Камчатка',15,-10,115),('kazakhstan',68.27,43.3,'Казахстан',15,-16,120),('uzbekistan',66.97,39.65,'Узбекистан',-92,18,128)]
    for key,lon,lat,label,dx,dy,lw in regions:
        x,y=project(lon,lat); lx,ly=x+dx,y+dy
        hx,hy=min(x-12,lx-5),min(y-12,ly-5)
        hw,hh=max(x+12,lx+lw+5)-hx,max(y+12,ly+33)-hy
        svg.extend([f'<g class="map-region-node" id="node-{key}" data-region-id="{key}" role="button" tabindex="0" aria-label="Регион: {label}">',
                    f'<circle cx="{x:.1f}" cy="{y:.1f}" r="10" fill="#142a34" fill-opacity=".35" stroke="#fff4de" stroke-opacity=".5"/>',
                    f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="#c79b54" stroke="#fff4de" stroke-width="1.8"/>',
                    f'<rect class="atlas-label" x="{lx:.1f}" y="{ly:.1f}" width="{lw}" height="28" rx="4"/>',
                    f'<text x="{lx+lw/2:.1f}" y="{ly+18:.1f}" text-anchor="middle" data-i18n="atlas_pin_{key}">{label}</text>',
                    f'<rect class="map-node-hitbox" x="{hx:.1f}" y="{hy:.1f}" width="{hw:.1f}" height="{hh:.1f}" fill="transparent"/>',
                    '</g>'])
    svg.append('<text x="18" y="602" fill="#173544" font-size="10" font-family="Montserrat">Natural Earth</text></svg>')
    (out/'atlas-map.svg.inc').write_text('\n'.join(svg))
    print('Built basemap and SVG overlay:',out)


if __name__ == '__main__':
    main(sys.argv[1])
