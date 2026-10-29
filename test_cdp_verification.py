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
                window.routeTo("{sc}", false);
                await new Promise(r => setTimeout(r, 80));
                const s = document.getElementById("screen-{sc}");
                return s && s.classList.contains("is-visible") ? "OK" : "FAILED";
            }})()''')
            print(f"  -> window.routeTo('{sc}'): {active_id}")
            assert active_id == "OK", f"Screen {sc} failed to become visible"

        # 4. Test EthnoAtlas Map (Screen 9) & Map pins hover / click stability
        print("\nTesting EthnoAtlas map pins and hover stability (Screen 9):")
        exec_js('window.routeTo("atlas", false);')
        atlas_regions = ['pomorye', 'tatarstan', 'caucasus', 'altai', 'yakutia', 'kamchatka', 'kazakhstan', 'uzbekistan']
        for reg in atlas_regions:
            sel_res = exec_js(f'''(() => {{
                window.selectAtlasRegion("{reg}");
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
        exec_js('window.routeTo("restorer", false);')

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
        exec_js('window.routeTo("decipherer", false);')

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
        exec_js('window.routeTo("workshop", false);')
        exec_js('document.getElementById("runAiSymbolVisionBtn").click();')
        time.sleep(1.4)
        vision_display = exec_js('document.getElementById("aiSymbolVisionResultCard").style.display')
        vision_conf = exec_js('document.getElementById("aiSymbolMatchConfidence").textContent')
        print(f"  -> Vision AI result display: {vision_display} | Match: {vision_conf}")
        assert vision_display == "block", "Vision AI result failed to display"

        # 5.7 Test Relics Treasury persistence (Screen 11)
        print("\nTesting Relics Treasury & Unlocking Persistence:")
        exec_js('window.routeTo("collection", false);')
        relics_count = exec_js('document.querySelectorAll("#relicsShelfContainer .relic-item-box").length')
        print(f"  -> Relics rendered on shelf: {relics_count}")
        assert relics_count == 8, f"Expected 8 relics, got {relics_count}"

        # 5.8 Test Responsive Mobile Viewports (375px SE & 390px iPhone 14/15 Pro)
        print("\nTesting Responsive Mobile Viewports (375px SE & 390px iPhone 14/15 Pro):")
        for width, height, name in [(375, 812, "iPhone SE/Mini"), (390, 844, "iPhone 14/15 Pro")]:
            send_cmd('Emulation.setDeviceMetricsOverride', {
                'width': width,
                'height': height,
                'deviceScaleFactor': 3,
                'mobile': True
            })
            time.sleep(0.4)
            m_desktop_nav = exec_js('window.getComputedStyle(document.querySelector(".desktop-nav")).display')
            m_burger = exec_js('window.getComputedStyle(document.querySelector(".mobile-burger-btn")).display')
            m_scroll_w = exec_js('document.documentElement.scrollWidth')
            print(f"  -> [{name} {width}x{height}] desktop_nav: {m_desktop_nav} | burger: {m_burger} | scrollWidth: {m_scroll_w} (expected <= {width})")
            assert m_desktop_nav == "none", f"desktop-nav not hidden on {name}: {m_desktop_nav}"
            assert m_burger == "flex", f"burger not visible on {name}: {m_burger}"
            assert m_scroll_w <= width, f"Horizontal overflow on {name}: scrollWidth={m_scroll_w} > {width}"

        # 5.9 Test iOS Native Haptic Feedback Bridge
        print("\nTesting iOS Native WebKit Haptic Bridge:")
        exec_js('''(() => {
            window._hapticCalls = [];
            window.webkit = {
                messageHandlers: {
                    haptic: {
                        postMessage: function(msg) {
                            window._hapticCalls.push(msg);
                        }
                    }
                }
            };
        })()''')

        # Trigger haptics via bridge calls
        exec_js('triggerHaptic("medium");')
        exec_js('triggerHaptic("success");')
        haptic_count = exec_js('window._hapticCalls.length')
        last_haptic = exec_js('window._hapticCalls[window._hapticCalls.length - 1].type')
        print(f"  -> Haptic bridge calls recorded: {haptic_count} | Last type: {last_haptic}")
        assert haptic_count >= 2 and last_haptic == "success", "Haptic bridge failed"

        # 5.10 Test Mobile Drawer Navigation & Drawer Language Switch
        print("\nTesting Mobile Drawer Navigation & Language Switch:")
        exec_js('document.getElementById("mobileMenuOpenBtn").click();')
        time.sleep(0.3)
        drawer_active = exec_js('document.getElementById("mobileDrawerMenu").classList.contains("is-open")')
        print(f"  -> Mobile drawer open: {drawer_active}")
        assert drawer_active, "Mobile drawer failed to open"

        # Switch language to English from mobile drawer
        exec_js('document.getElementById("mobileDrawerLangBtn").click();')
        time.sleep(0.3)
        current_lang = exec_js('window.I18N.getLang()')
        stored_lang = exec_js('localStorage.getItem("artefact_lang")')
        print(f"  -> Lang switched via drawer: {current_lang} | LocalStorage: {stored_lang}")
        assert current_lang == "en" and stored_lang == "en", "Language switch failed"

        # Close drawer
        exec_js('document.getElementById("mobileDrawerCloseBtn").click();')
        time.sleep(0.3)
        drawer_closed = not exec_js('document.getElementById("mobileDrawerMenu").classList.contains("is-open")')
        print(f"  -> Mobile drawer closed: {drawer_closed}")
        assert drawer_closed, "Mobile drawer failed to close"

        # Restore desktop viewport
        send_cmd('Emulation.clearDeviceMetricsOverride')
        time.sleep(0.3)

        # 5.11 Comprehensive English Localization Verification across All Screens
        print("\nVerifying Complete English Localization across All Screens:")
        en_title = exec_js('document.title')
        print(f"  -> English Document title: {en_title}")
        assert "History Leaves a Trace" in en_title or "ARTEFACT" in en_title, f"Unexpected title: {en_title}"

        lang_btn_lbl = exec_js('document.getElementById("langLabelText").textContent')
        print(f"  -> Desktop Lang Toggle button label: {lang_btn_lbl} (should suggest switching to RU)")
        assert lang_btn_lbl == "RU", f"Expected 'RU' toggle label in English mode, got '{lang_btn_lbl}'"

        # Screen 1: Hero
        exec_js('window.routeTo("hero", false);')
        hero_tag = exec_js('document.querySelector(\'[data-i18n="hero_badge"]\').textContent')
        print(f"  -> Hero tag: {hero_tag}")
        assert "Digital Cultural Heritage" in hero_tag, f"Hero tag not translated: {hero_tag}"

        # Screen 2: Cultures Catalog
        exec_js('window.routeTo("cultures", false);')
        first_cult_card_tag = exec_js('document.querySelector(".culture-item-card__tag").textContent')
        first_cult_card_footer = exec_js('document.querySelector(".culture-item-card__footer span").textContent')
        print(f"  -> Cultures catalog card: tag='{first_cult_card_tag}', footer='{first_cult_card_footer}'")
        assert first_cult_card_tag in ("Russia", "Silk Road"), f"Culture tag not in English: {first_cult_card_tag}"
        assert "Expedition" in first_cult_card_footer, f"Culture footer not in English: {first_cult_card_footer}"

        # Screen 3: Quest
        exec_js('window.routeTo("quest", false);')
        exec_js('setupQuestCulture("pomorye", false);')
        quest_badge = exec_js('document.getElementById("questCultureCategoryBadge").textContent')
        quest_title = exec_js('document.getElementById("questCultureMainTitle").textContent')
        print(f"  -> Quest Pomorye badge: '{quest_badge}' | Title: '{quest_title}'")
        assert "Master Heritage" in quest_title, f"Quest title missing Master Heritage: {quest_title}"

        # Screen 4: EthnoAtlas
        exec_js('window.routeTo("atlas", false);')
        exec_js('window.selectAtlasRegion("pomorye");')
        atlas_title = exec_js('document.getElementById("atlasDossierTitle").textContent')
        print(f"  -> Atlas Dossier title: '{atlas_title}'")
        assert "Expedition Dossier" in atlas_title, f"Atlas title not in English: {atlas_title}"

        # Screen 5: AI Restorer
        exec_js('window.routeTo("restorer", false);')
        exec_js('renderRestorerArtifact("khasite");')
        rest_title = exec_js('document.getElementById("restorerArtTitle").textContent')
        print(f"  -> AI Restorer title: '{rest_title}'")
        assert "Khasite" in rest_title or "Breast" in rest_title, f"Restorer title not in English: {rest_title}"

        # Screen 6: AI Petro-Lens Decipherer
        exec_js('window.routeTo("decipherer", false);')
        exec_js('renderPetroArtifact("altai");')
        petro_title = exec_js('document.getElementById("petroHudTitle").textContent')
        print(f"  -> Petro Decipherer title: '{petro_title}'")
        assert "Deer" in petro_title or "Kalbak-Tash" in petro_title, f"Petro title not in English: {petro_title}"

        # Screen 7: Folklore Anthology
        exec_js('window.routeTo("folklore", false);')
        folk_story_title = exec_js('document.querySelector("#folkloreCardsContainer h3").textContent')
        folk_moral_label = exec_js('document.querySelector("#folkloreCardsContainer strong").textContent')
        print(f"  -> Folklore story title: '{folk_story_title}' | Moral label: '{folk_moral_label}'")
        assert "Moral:" in folk_moral_label, f"Folklore moral label not in English: {folk_moral_label}"

        # Screen 8: Relics Collection
        exec_js('window.routeTo("collection", false);')
        relic_name = exec_js('document.querySelector("#relicsShelfContainer strong").textContent')
        print(f"  -> Relic shelf item: '{relic_name}'")
        assert relic_name, "Relic shelf empty in English"

        # Screen 9: Craft Workshop
        exec_js('window.routeTo("workshop", false);')
        exec_js('document.getElementById("runAiPostcardGenerationBtn").click();')
        time.sleep(0.3)
        amulet_title = exec_js('document.getElementById("aiPostcardTitleHeading").textContent')
        print(f"  -> Workshop amulet title: '{amulet_title}'")
        assert "Amulet:" in amulet_title, f"Amulet title missing prefix: {amulet_title}"
        assert "Kazan Tulip" in amulet_title or "Tulip" in amulet_title, f"Motif names not translated in amulet title: {amulet_title}"

        # Test EthnoAtlas Territory Cards in English
        exec_js('window.routeTo("atlas", false);')
        first_card_btn = exec_js('document.querySelector("#atlasTerritoryGrid .atlas-territory-card div:last-child span:last-child").textContent')
        print(f"  -> Atlas territory card action label: '{first_card_btn}'")
        assert "Select →" in first_card_btn, f"Atlas territory card not in English: {first_card_btn}"

        # Test EthnoAtlas Map Compass & Geographic Features in English
        compass_n = exec_js('document.querySelector(\'[data-i18n="map_compass_n"]\').textContent')
        geo_baikal = exec_js('document.querySelector(\'[data-i18n="map_geo_baikal"]\').textContent')
        geo_ural = exec_js('document.querySelector(\'[data-i18n="map_geo_ural"]\').textContent')
        print(f"  -> Atlas map compass N: '{compass_n}' | Baikal: '{geo_baikal}' | Ural: '{geo_ural}'")
        assert compass_n == "N", f"Compass North not translated: {compass_n}"
        assert geo_baikal == "Lake Baikal", f"Baikal not translated: {geo_baikal}"
        assert geo_ural == "URAL MOUNTAINS", f"Ural not translated: {geo_ural}"

        # Test Quest Step 4 Era Tag
        exec_js('window.routeTo("quest", false);')
        exec_js('switchQuestStep(4);')
        era_tag_val = exec_js('document.getElementById("artifactEraTag").textContent')
        print(f"  -> Quest Step 4 Era Tag: '{era_tag_val}'")
        assert ("19th" in era_tag_val or "century" in era_tag_val.lower() or "c." in era_tag_val), f"Era tag not localized in English: {era_tag_val}"

        # Test Folklore Read Time in English
        exec_js('window.routeTo("folklore", false);')
        folk_span = exec_js('document.querySelector("#folkloreCardsContainer span").textContent')
        print(f"  -> Folklore card header: '{folk_span}'")
        assert "min" in folk_span and "мин" not in folk_span, f"Folklore read time not localized: {folk_span}"

        # Test Zero-Cyrillic Scan Across All 9 Screens in English
        print("\nVerifying Zero Cyrillic Nodes Across All 9 Screens (English Mode):")
        screens_to_check = ["hero", "cultures", "quest", "atlas", "restorer", "decipherer", "folklore", "collection", "workshop"]
        for sc in screens_to_check:
            exec_js(f'window.routeTo("{sc}", false);')
            time.sleep(0.05)
            cyr_count = exec_js(f'''(() => {{
                const el = document.getElementById("screen-{sc}");
                if (!el) return 0;
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
                let count = 0;
                let node;
                while (node = walker.nextNode()) {{
                    const parent = node.parentElement;
                    if (!parent) continue;
                    const style = window.getComputedStyle(parent);
                    if (style.display === "none" || style.visibility === "hidden") continue;
                    const txt = node.nodeValue.trim();
                    if (txt && /[\\u0400-\\u04FF]/.test(txt)) count++;
                }}
                return count;
            }})()''')
            print(f"  -> Screen '{sc}': {cyr_count} Cyrillic text nodes")
            assert cyr_count == 0, f"Found {cyr_count} Cyrillic text nodes on screen '{sc}' in English mode"

        # Test Field Passport Modal in English
        exec_js('window.routeTo("quest", false);')
        exec_js('const btn = document.getElementById("exportPassportBtn"); if (btn) btn.click();')
        time.sleep(0.2)
        passport_title = exec_js('document.getElementById("passportModalTitle").textContent')
        passport_res = exec_js('document.getElementById("passportResearcherName").textContent')
        print(f"  -> Field passport modal title: '{passport_title}' | Researcher: '{passport_res}'")
        assert "Field Ethnographer Dossier" in passport_title or "Dossier" in passport_title, f"Passport title not localized: {passport_title}"
        assert "Artefact Pathfinder" in passport_res, f"Passport researcher not localized: {passport_res}"
        exec_js('document.getElementById("closePassportModalBtn").click();')

        # 5.12 Switch back to Russian and verify restore
        print("\nTesting Language Switch back to Russian:")
        exec_js('document.getElementById("langToggleBtn").click();')
        time.sleep(0.3)
        ru_lang = exec_js('window.I18N.getLang()')
        ru_title = exec_js('document.title')
        ru_btn_lbl = exec_js('document.getElementById("langLabelText").textContent')
        print(f"  -> Switched back to: {ru_lang} | Title: {ru_title} | Toggle Button: {ru_btn_lbl}")
        assert ru_lang == "ru", "Failed switching back to Russian"
        assert "АРТЕФАКТ" in ru_title, f"Unexpected Russian title: {ru_title}"
        assert ru_btn_lbl == "EN", f"Expected toggle button 'EN' in Russian mode, got '{ru_btn_lbl}'"

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
