import socket
import base64
import os
import json
import time
import subprocess
import urllib.request
import urllib.parse
import sys

def run_cdp_test():
    print("=" * 70)
    print("LAUNCHING HEADLESS CHROMIUM FOR DEEP CDP VERIFICATION")
    print("=" * 70)
    
    port = 9555
    proc = subprocess.Popen([
        '/usr/bin/chromium',
        '--headless=new',
        f'--remote-debugging-port={port}',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        'http://localhost:8080/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    console_errors = []
    console_logs = []
    exceptions = []

    try:
        time.sleep(2.0)
        res = urllib.request.urlopen(f'http://127.0.0.1:{port}/json').read()
        targets = json.loads(res)
        page_targets = [t for t in targets if t.get('type') == 'page']
        if not page_targets:
            raise RuntimeError("No page target found in CDP")
        ws_url = page_targets[0]['webSocketDebuggerUrl']
        parsed = urllib.parse.urlparse(ws_url)

        s = socket.create_connection((parsed.hostname, parsed.port))
        key = base64.b64encode(os.urandom(16)).decode('ascii')
        req = (
            f'GET {parsed.path} HTTP/1.1\r\n'
            f'Host: {parsed.hostname}:{parsed.port}\r\n'
            f'Upgrade: websocket\r\n'
            f'Connection: Upgrade\r\n'
            f'Sec-WebSocket-Key: {key}\r\n'
            f'Sec-WebSocket-Version: 13\r\n\r\n'
        )
        s.sendall(req.encode('ascii'))
        resp = s.recv(4096).decode('latin1')
        assert '101' in resp, f"Handshake failed: {resp}"

        msg_id = 100

        def send_cmd(method, params=None):
            nonlocal msg_id
            msg_id += 1
            cid = msg_id
            req_dict = {'id': cid, 'method': method}
            if params:
                req_dict['params'] = params
            payload = json.dumps(req_dict).encode('utf-8')
            frame = bytearray([0x81])
            length = len(payload)
            if length < 126:
                frame.append(0x80 | length)
            elif length < 65536:
                frame.append(0x80 | 126)
                frame.extend(length.to_bytes(2, 'big'))
            else:
                frame.append(0x80 | 127)
                frame.extend(length.to_bytes(8, 'big'))
            mask = os.urandom(4)
            frame.extend(mask)
            masked_payload = bytearray(b ^ mask[i % 4] for i, b in enumerate(payload))
            frame.extend(masked_payload)
            s.sendall(frame)
            return cid

        def recv_frame():
            head = s.recv(2)
            if not head: return None
            b1, b2 = head[0], head[1]
            length = b2 & 0x7F
            if length == 126:
                length = int.from_bytes(s.recv(2), 'big')
            elif length == 127:
                length = int.from_bytes(s.recv(8), 'big')
            data = bytearray()
            while len(data) < length:
                chunk = s.recv(length - len(data))
                if not chunk: break
                data.extend(chunk)
            return json.loads(data.decode('utf-8'))

        def exec_js(expr):
            cid = send_cmd('Runtime.evaluate', {'expression': expr, 'returnByValue': True, 'awaitPromise': True})
            while True:
                msg = recv_frame()
                if not msg:
                    raise RuntimeError("Connection closed while waiting for evaluate result")
                # Check for runtime exceptions or console events
                method = msg.get('method')
                if method == 'Runtime.exceptionThrown':
                    desc = msg.get('params', {}).get('exceptionDetails', {})
                    exceptions.append(desc)
                    print(f"  [ERROR-EXCEPTION] {desc}")
                elif method == 'Runtime.consoleAPICalled':
                    c_type = msg.get('params', {}).get('type')
                    args = [str(a.get('value', '')) for a in msg.get('params', {}).get('args', [])]
                    line = f"[{c_type}] " + " ".join(args)
                    console_logs.append(line)
                    if c_type in ('error', 'assert'):
                        console_errors.append(line)
                        print(f"  [CONSOLE-ERROR] {line}")
                if msg.get('id') == cid:
                    res = msg.get('result', {})
                    if 'exceptionDetails' in res:
                        exceptions.append(res['exceptionDetails'])
                        print(f"  [EVAL-EXCEPTION] {res['exceptionDetails']}")
                    return res.get('result', {}).get('value')

        # 1. Enable domains
        send_cmd('Console.enable')
        send_cmd('Runtime.enable')

        # 2. Check title and readyState
        title = exec_js('document.title')
        print(f"Document title: {title}")
        assert "АРТЕФАКТ" in title, f"Unexpected title: {title}"

        # 3. Test screen transitions across all routes
        screens = ['hero', 'cultures', 'quest', 'atlas', 'restorer', 'decipherer', 'folklore', 'collection', 'workshop']
        print("\nVerifying screen transitions:")
        for sc in screens:
            active_id = exec_js(f'''(async () => {{
                routeTo("{sc}", false);
                await new Promise(r => setTimeout(r, 80));
                const s = document.getElementById("screen-{sc}");
                return s && s.classList.contains("is-visible") ? "OK" : "FAILED";
            }})()''')
            print(f"  -> routeTo('{sc}'): {active_id}")
            assert active_id == "OK", f"Screen {sc} failed to become visible"

        # 4. Test EthnoAtlas Map (Screen 9) & Map pins hover / click stability
        print("\nTesting EthnoAtlas map pins and hover stability (Screen 9):")
        exec_js('routeTo("atlas", false);')
        atlas_regions = ['pomorye', 'tatarstan', 'caucasus', 'altai', 'yakutia', 'kamchatka', 'kazakhstan', 'uzbekistan']
        for reg in atlas_regions:
            sel_res = exec_js(f'''(() => {{
                selectAtlasRegion("{reg}");
                const node = document.getElementById("node-{reg}");
                const isActive = node && node.classList.contains("is-active");
                const dossierTitle = document.getElementById("atlasDossierTitle").textContent;
                return isActive ? dossierTitle : "FAILED";
            }})()''')
            print(f"  -> Atlas region '{reg}': {sel_res}")
            assert sel_res != "FAILED", f"Region {reg} failed activation"

        # Check sonar-ring and hitbox pointer-events rules (jitter-free guarantee)
        sonar_pe = exec_js('''(() => {
            const ring = document.querySelector(".sonar-ring");
            return window.getComputedStyle(ring).pointerEvents;
        })()''')
        print(f"  -> .sonar-ring computed pointer-events: {sonar_pe}")
        assert sonar_pe == "none", f"Expected pointer-events: none on sonar-ring, got {sonar_pe}"

        hitboxes_count = exec_js('document.querySelectorAll(".map-node-hitbox").length')
        print(f"  -> Static map pin hitboxes: {hitboxes_count}")
        assert hitboxes_count == 8, f"Expected 8 hitboxes, got {hitboxes_count}"

        hitbox_pe = exec_js('window.getComputedStyle(document.querySelector(".map-node-hitbox")).pointerEvents')
        circle_pe = exec_js('window.getComputedStyle(document.querySelector(".map-region-node circle:not(.sonar-ring)")).pointerEvents')
        print(f"  -> Hitbox pointer-events: {hitbox_pe} | Circle pointer-events: {circle_pe}")
        assert hitbox_pe == "all" and circle_pe == "none", "Jitter-free pointer-events violation"

        # 5. Test AI Archaeometric Restorer & Spectral Scanner
        print("\nTesting AI Archaeometric Restorer (Screen 10):")
        exec_js('routeTo("restorer", false);')

        # Test artifact switching & dedicated 3D pedestal photos
        for art in ['khasite', 'scythian', 'yakut']:
            art_res = exec_js(f'''(() => {{
                renderRestorerArtifact("{art}");
                const title = document.getElementById("restorerArtTitle").textContent;
                const before = document.getElementById("restorerImgBefore").getAttribute("src");
                const after = document.getElementById("restorerImgAfter").getAttribute("src");
                const d = AI_RESTORER_DATABASE["{art}"];
                return {{ title, before, after, pedestal: d.pedestalImg }};
            }})()''')
            print(f"  -> Artifact '{art}': {art_res['title']} | Before: {art_res['before']} | Pedestal: {art_res['pedestal']}")
            assert art_res['before'] and art_res['after'] and art_res['pedestal'], f"Missing image for {art}"

        # Test spectral modes
        for mode in ['visible', 'uv', 'xray', 'ir']:
            exec_js(f'setSpectralMode("{mode}");')
            applied = exec_js(f'document.getElementById("restorerViewport").classList.contains("spectral-filter--{mode}")')
            print(f"  -> Spectral mode '{mode}' applied: {applied}")
            assert applied, f"Filter class spectral-filter--{mode} not applied"

        # Test slider position
        for pos in [0, 25, 50, 75, 100]:
            exec_js(f'setRestorerSliderPosition({pos});')
            val = exec_js('document.getElementById("restorerDividerKnob").getAttribute("aria-valuenow")')
            assert int(val) == pos, f"Slider pos expected {pos}, got {val}"
        print("  -> Restorer slider range 0% - 100%: verified OK")

        # Test hotspots
        hotspot_count = exec_js('document.querySelectorAll(".restorer-hotspot-pin").length')
        print(f"  -> Active hotspots on artifact: {hotspot_count}")
        assert hotspot_count >= 3, f"Expected at least 3 hotspots, got {hotspot_count}"

        # Test Micro-CT Stratigraphy Slicer
        print("  -> Testing Micro-CT Stratigraphy Slicer...")
        exec_js('''(() => {
            const s = document.getElementById("restorerDepthSlider");
            if (s) {
                s.value = "1.2";
                s.dispatchEvent(new Event("input"));
            }
        })()''')
        depth_val = exec_js('document.getElementById("restorerDepthValText").textContent')
        print(f"  -> Stratigraphy depth 1.2mm readout: {depth_val}")
        assert "1.2" in depth_val, f"Unexpected stratigraphy depth readout: {depth_val}"

        # 5.5 Test AI Petro-Lens & Symbol Decipherer (Screen 11)
        print("\nTesting AI Petro-Lens & Symbol Decipherer (Screen 11):")
        exec_js('routeTo("decipherer", false);')

        # Test switching across all 5 petroglyphs
        petros = ['altai', 'pomorye', 'bulgar', 'yakut', 'scythian']
        for p in petros:
            p_res = exec_js(f'''(() => {{
                renderPetroArtifact("{p}");
                const title = document.getElementById("petroHudTitle").textContent;
                const conf = document.getElementById("petroHudConfidence").textContent;
                const hotspots = document.querySelectorAll("#petroHotspotsList .petro-hotspot-item").length;
                return {{ title, conf, hotspots }};
            }})()''')
            print(f"  -> Petroglyph '{p}': {p_res['title']} | Conf: {p_res['conf']} | Hotspots: {p_res['hotspots']}")
            assert p_res['title'] and p_res['hotspots'] >= 3, f"Petroglyph {p} validation failed"

        # Test lens modes
        for mode in ['edge', 'relief', 'neural', 'original']:
            exec_js(f'''(() => {{
                const btn = document.querySelector('#petroModeTabs .petro-mode-btn[data-mode="{mode}"]');
                if (btn) btn.click();
            }})()''')
            badge = exec_js('document.getElementById("petroLensModeBadge").textContent')
            print(f"  -> Lens mode '{mode}' active badge: {badge}")
            assert badge, f"Lens mode badge empty for {mode}"

        # Test lens movement and coordinates update
        exec_js('updatePetroLensPos(300, 200);')
        coords = exec_js('document.getElementById("petroLensCoords").textContent')
        print(f"  -> Lens coordinates at (300, 200): {coords}")
        assert "300" in coords and "200" in coords, f"Coordinates update failed: {coords}"

        # 5.6 Test Workshop & Vision AI Symbol Decoder (Screen 8)
        print("\nTesting Craft Workshop & Vision AI Symbol Decoder (Screen 8):")
        exec_js('routeTo("workshop", false);')
        exec_js('document.getElementById("runAiSymbolVisionBtn").click();')
        time.sleep(1.4)
        vision_display = exec_js('document.getElementById("aiSymbolVisionResultCard").style.display')
        vision_conf = exec_js('document.getElementById("aiSymbolMatchConfidence").textContent')
        print(f"  -> Vision AI result display: {vision_display} | Match: {vision_conf}")
        assert vision_display == "block", "Vision AI result failed to display"

        # 5.7 Test Relics Treasury persistence (Screen 11)
        print("\nTesting Relics Treasury & Unlocking Persistence:")
        exec_js('routeTo("collection", false);')
        relics_count = exec_js('document.querySelectorAll("#relicsShelfContainer .relic-item-box").length')
        print(f"  -> Relics rendered on shelf: {relics_count}")
        assert relics_count == 8, f"Expected 8 relics, got {relics_count}"

        # 5.8 Test Responsive Mobile Viewport (375x812)
        print("\nTesting Responsive Mobile Viewport (375px):")
        send_cmd('Emulation.setDeviceMetricsOverride', {
            'width': 375,
            'height': 812,
            'deviceScaleFactor': 3,
            'mobile': True
        })
        time.sleep(0.5)
        m_desktop_nav = exec_js('window.getComputedStyle(document.querySelector(".desktop-nav")).display')
        m_burger = exec_js('window.getComputedStyle(document.querySelector(".mobile-burger-btn")).display')
        m_scroll_w = exec_js('document.documentElement.scrollWidth')
        print(f"  -> Mobile desktop_nav display: {m_desktop_nav} (expected 'none')")
        print(f"  -> Mobile burger display: {m_burger} (expected 'flex')")
        print(f"  -> Mobile scrollWidth: {m_scroll_w} (expected <= 376)")
        assert m_desktop_nav == "none", f"desktop-nav not hidden on mobile: {m_desktop_nav}"
        assert m_burger == "flex", f"burger not visible on mobile: {m_burger}"
        assert m_scroll_w <= 376, f"Horizontal overflow on mobile: scrollWidth={m_scroll_w}"

        # Restore desktop viewport
        send_cmd('Emulation.clearDeviceMetricsOverride')
        time.sleep(0.3)

        # 6. Check console errors and exceptions
        print("\n" + "=" * 70)
        print("CDP VERIFICATION SUMMARY")
        print("=" * 70)
        print(f"Total Console logs captured: {len(console_logs)}")
        print(f"Total Console errors: {len(console_errors)}")
        print(f"Total Uncaught exceptions: {len(exceptions)}")
        
        if console_errors:
            print("Console Errors:")
            for err in console_errors:
                print(f"  - {err}")
        if exceptions:
            print("Uncaught Exceptions:")
            for ex in exceptions:
                print(f"  - {ex}")

        assert len(console_errors) == 0, f"Found {len(console_errors)} console errors"
        assert len(exceptions) == 0, f"Found {len(exceptions)} exceptions"
        print("\nALL VERIFICATIONS PASSED WITH ZERO CONSOLE ERRORS!")
        return 0

    finally:
        proc.terminate()
        proc.wait()

if __name__ == '__main__':
    sys.exit(run_cdp_test())
