"""Build the Perovoistochnik MVP for a GitHub Pages subdirectory."""

import argparse
from pathlib import Path
import re
from shutil import copy2
from urllib.parse import urlsplit


PUBLIC = Path(__file__).resolve().parents[1] / "public"
MVP_FILES = (
    "atlas.css",
    "atlas.js",
    "map-view.js",
    "style.css",
    "assets/atlas-icons.svg",
    "assets/chevron.svg",
    "assets/fonts/Golos-OFL.txt",
    "assets/fonts/Montserrat-OFL.txt",
    "assets/fonts/PT-Serif-OFL.txt",
    "assets/fonts/golos-cyr.woff2",
    "assets/fonts/golos-lat.woff2",
    "assets/fonts/montserrat-cyr.woff2",
    "assets/fonts/montserrat-lat.woff2",
    "assets/fonts/pt-serif-cyr.woff2",
    "assets/fonts/pt-serif-italic-cyr.woff2",
    "assets/ladoga-credits.md",
    "assets/ladoga-map.svg",
    "assets/meshkov-house.jpg",
    "assets/oak-emblem.svg",
    "assets/oleg-vasnetsov.jpg",
    "assets/peter-paul-fortress.jpg",
    "assets/russia-illustration.jpg",
    "assets/staraya-ladoga.jpg",
    "assets/taltsy.jpg",
    "assets/volkonsky-house.jpg",
)
CONFIG_MARKER = "  <!-- pages-config -->"


def api_url(value):
    if not re.fullmatch(r"https://[a-zA-Z0-9.-]+(?::[0-9]{1,5})?(?:/[a-zA-Z0-9_-]+)+/?", value):
        raise argparse.ArgumentTypeError("use an HTTPS API base URL with a host and path")
    try:
        parsed = urlsplit(value)
        parsed.port
    except ValueError as error:
        raise argparse.ArgumentTypeError(str(error)) from error
    return value.rstrip("/")


def render_index(base):
    csp = "; ".join((
        "default-src 'self'",
        f"connect-src {base}/",
        "frame-src https://rutube.ru",
        "media-src 'self' https://streammtk.prlib.ru",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
    ))
    config = "\n".join((
        f'  <meta http-equiv="Content-Security-Policy" content="{csp}">',
        '  <meta name="referrer" content="no-referrer">',
        f'  <meta name="atlas-api" content="{base}">',
    ))
    template = (PUBLIC / "index.html").read_text(encoding="utf-8")
    if template.count(CONFIG_MARKER) != 1:
        raise ValueError("expected one Pages configuration marker in public/index.html")
    return template.replace(CONFIG_MARKER, config)


def copy_mvp_file(filename, output):
    destination = output / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    copy2(PUBLIC / filename, destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", required=True, type=api_url, help="public Edge Function base URL")
    parser.add_argument("--output", required=True, type=Path, help="directory for the MVP")
    args = parser.parse_args()
    output = args.output.resolve()
    if output.is_relative_to(PUBLIC):
        parser.error("--output must be outside public")
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error("--output must be a new or empty directory")

    index = render_index(args.api_url)
    for filename in MVP_FILES:
        copy_mvp_file(filename, output)
    for asset in sorted((PUBLIC / "assets" / "slide-466").iterdir()):
        if asset.is_file():
            copy_mvp_file(asset.relative_to(PUBLIC), output)
    (output / "index.html").write_text(index, encoding="utf-8")


if __name__ == "__main__":
    main()
