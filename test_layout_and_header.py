import socket
import base64
import os
import json
import time
import subprocess
import urllib.request
import urllib.parse
import sys

def verify():
    port = 9666
    proc = subprocess.Popen([
        '/usr/bin/chromium',
        '--headless=new',
        f'--remote-debugging-port={port}',
        '--remote-allow-origins=*',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        'http://localhost:8080/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        targets = []
        for _ in range(25):
            time.sleep(0.2)
            try:
                res = urllib.request.urlopen(f'http://127.0.0.1:{port}/json', timeout=1).read()
                targets = json.loads(res)
                if targets:
                    break
            except Exception:
                pass
        page_targets = [t for t in targets if t.get('type') == 'page']
        if not page_targets:
            raise RuntimeError("No page target found")
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
        assert '101' in resp

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
                    raise RuntimeError("Connection closed")
                if msg.get('id') == cid:
                    res = msg.get('result', {})
                    if 'exceptionDetails' in res:
                        raise RuntimeError(str(res['exceptionDetails']))
                    return res.get('result', {}).get('value')

        send_cmd('DOM.enable')
        send_cmd('CSS.enable')
        time.sleep(1)

        # 1. Set viewport to 1920x1080
        send_cmd('Emulation.setDeviceMetricsOverride', {
            'width': 1920,
            'height': 1080,
            'deviceScaleFactor': 1,
            'mobile': False
        })
        time.sleep(0.5)

        print("\n--- 1. VERIFYING TOP HEADER AT 1920x1080 ---")
        header_info = exec_js('''(() => {
            const header = document.querySelector('.top-header');
            const rect = header.getBoundingClientRect();
            const brandTitle = document.querySelector('.brand-logo__title');
            const brandTagline = document.querySelector('.brand-logo__tagline');
            const nav = document.querySelector('.desktop-nav');
            const navBtns = Array.from(document.querySelectorAll('.desktop-nav .nav-btn'));
            const activeNav = document.querySelector('.desktop-nav .nav-btn.is-active');
            const chips = Array.from(document.querySelectorAll('.header-actions .action-chip'));
            
            // Check for emoji in navBtns
            const emojiRegex = /[\\u{1F300}-\\u{1F9FF}]|[\\u{2600}-\\u{26FF}]|[\\u{2700}-\\u{27BF}]/u;
            const navEmojis = navBtns.map(b => ({
                text: b.textContent.trim(),
                hasEmoji: emojiRegex.test(b.textContent)
            }));

            const activeStyle = activeNav ? window.getComputedStyle(activeNav) : null;
            
            return {
                headerW: rect.width,
                headerH: rect.height,
                brandTitle: brandTitle.textContent.trim(),
                brandFont: window.getComputedStyle(brandTitle).fontFamily,
                brandTagline: brandTagline.textContent.trim(),
                navBtnsCount: navBtns.length,
                navEmojis,
                activeRoute: activeNav ? activeNav.dataset.route : null,
                activeBg: activeStyle ? activeStyle.backgroundColor : null,
                activeColor: activeStyle ? activeStyle.color : null,
                chipsCount: chips.length
            };
        })()''')

        print(f"Header dimensions: {header_info['headerW']}x{header_info['headerH']}px")
        print(f"Brand logo: '{header_info['brandTitle']}' (Font: {header_info['brandFont']}) - '{header_info['brandTagline']}'")
        print(f"Desktop nav button count: {header_info['navBtnsCount']}")
        print(f"Active nav item: {header_info['activeRoute']} (Color: {header_info['activeColor']})")
        print(f"Nav buttons and emoji status:")
        for b in header_info['navEmojis']:
            print(f"  - '{b['text']}': hasEmoji={b['hasEmoji']}")
            assert not b['hasEmoji'], f"Emoji found in desktop nav: {b['text']}"

        assert header_info['navBtnsCount'] == 9, "Expected 9 nav buttons"
        assert header_info['chipsCount'] >= 4, "Expected action chips"

        print("\n--- 2. VERIFYING TWO-COLUMN LAYOUT AND MILESTONES (STEP 1) AT 1920x1080 ---")
        exec_js('window.routeTo("quest?cult=tatarstan&step=1", false);')
        time.sleep(0.3)

        quest_metrics = exec_js('''(() => {
            const step1 = document.getElementById('questStepSub1');
            const splitLayout = step1.querySelector('.split-layout-2col');
            const cols = splitLayout.children;
            const leftCol = cols[0];
            const rightCol = cols[1];
            const leftRect = leftCol.getBoundingClientRect();
            const rightRect = rightCol.getBoundingClientRect();
            const milestonesCard = document.getElementById('questMilestonesCard');
            const mItems = Array.from(document.querySelectorAll('#questMilestonesTimeline .milestone-item'));

            const mData = mItems.map(item => ({
                year: item.querySelector('.milestone-year')?.textContent.trim(),
                title: item.querySelector('.milestone-title')?.textContent.trim(),
                desc: item.querySelector('.milestone-desc')?.textContent.trim()
            }));

            const splitStyle = window.getComputedStyle(splitLayout);

            return {
                alignItems: splitStyle.alignItems,
                leftTop: leftRect.top,
                rightTop: rightRect.top,
                leftH: leftRect.height,
                rightH: rightRect.height,
                heightDiff: Math.abs(leftRect.height - rightRect.height),
                milestonesVisible: !!milestonesCard && window.getComputedStyle(milestonesCard).display !== 'none',
                milestonesCount: mData.length,
                mData
            };
        })()''')

        print(f"split-layout-2col alignItems: {quest_metrics['alignItems']}")
        print(f"Left col: top={quest_metrics['leftTop']}px, height={quest_metrics['leftH']}px")
        print(f"Right col: top={quest_metrics['rightTop']}px, height={quest_metrics['rightH']}px")
        print(f"Height difference: {quest_metrics['heightDiff']}px (Balanced, void eliminated)")
        print(f"Milestones card visible: {quest_metrics['milestonesVisible']}, items count: {quest_metrics['milestonesCount']}")
        for m in quest_metrics['mData']:
            print(f"  * [{m['year']}] {m['title']}: {m['desc']}")

        assert quest_metrics['alignItems'] == 'start', f"Expected align-items: start, got {quest_metrics['alignItems']}"
        assert abs(quest_metrics['leftTop'] - quest_metrics['rightTop']) < 2, "Columns not top-aligned"
        assert quest_metrics['heightDiff'] < 120, f"Columns not balanced! diff={quest_metrics['heightDiff']}px"
        assert quest_metrics['milestonesCount'] == 3, f"Expected 3 milestones, got {quest_metrics['milestonesCount']}"

        print("\n--- 3. VERIFYING MILESTONES ACROSS ALL 8 CULTURES IN RU & EN ---")
        cultures = ['tatarstan', 'pomorye', 'caucasus', 'altai', 'yakutia', 'kamchatka', 'kazakhstan', 'uzbekistan']
        for cult in cultures:
            exec_js(f'setupQuestCulture("{cult}", false);')
            ru_count = exec_js('document.querySelectorAll("#questMilestonesTimeline .milestone-item").length')
            assert ru_count == 3, f"Culture {cult} missing RU milestones"
            
        # Switch to EN and verify zero Cyrillic in milestones
        exec_js('window.I18N.setLanguage("en");')
        cyrillic_regex = '/[а-яА-ЯёЁ]/'
        for cult in cultures:
            exec_js(f'setupQuestCulture("{cult}", false);')
            en_milestones = exec_js('''(() => {
                const items = Array.from(document.querySelectorAll("#questMilestonesTimeline .milestone-item"));
                return items.map(it => it.textContent);
            })()''')
            print(f"  -> EN {cult}: {len(en_milestones)} milestones loaded")
            assert len(en_milestones) == 3, f"Culture {cult} missing EN milestones"
            for txt in en_milestones:
                has_cyrillic = exec_js(f'{cyrillic_regex}.test({json.dumps(txt)})')
                assert not has_cyrillic, f"Cyrillic found in EN milestone for {cult}: {txt}"

        exec_js('window.I18N.setLanguage("ru");')

        print("\n--- 4. VERIFYING STEPS 2, 3, 4, 5 VERTICAL ALIGNMENT ---")
        for step in [2, 3, 4, 5]:
            exec_js(f'switchQuestStep({step}, false);')
            s_metrics = exec_js(f'''(() => {{
                const sub = document.getElementById("questStepSub{step}");
                const split = sub.querySelector(".split-layout-2col");
                const style = window.getComputedStyle(split);
                const cols = split.children;
                const r0 = cols[0].getBoundingClientRect();
                const r1 = cols[1].getBoundingClientRect();
                return {{
                    alignItems: style.alignItems,
                    topDiff: Math.abs(r0.top - r1.top),
                    h0: r0.height,
                    h1: r1.height
                }};
            }})()''')
            print(f"  -> Step {step}: alignItems={s_metrics['alignItems']}, topDiff={s_metrics['topDiff']}px, h0={s_metrics['h0']}px, h1={s_metrics['h1']}px")
            assert s_metrics['alignItems'] == 'start'
            assert s_metrics['topDiff'] < 2, f"Step {step} columns not aligned at top"

        print("\n--- 5. CAPTURING HIGH-RES SCREENSHOTS ---")
        os.makedirs('screenshots', exist_ok=True)
        
        # 1920x1080 Quest Step 1
        exec_js('window.routeTo("quest?cult=tatarstan&step=1", false);')
        time.sleep(0.3)
        shot_res = send_cmd('Page.captureScreenshot', {'format': 'png'})
        while True:
            msg = recv_frame()
            if msg and msg.get('id') == shot_res:
                b64 = msg['result']['data']
                with open('screenshots/quest_step1_1920x1080_balanced.png', 'wb') as f:
                    f.write(base64.b64decode(b64))
                print("Saved screenshots/quest_step1_1920x1080_balanced.png")
                break

        # 1920x1080 Hero Header
        exec_js('window.routeTo("hero", false);')
        time.sleep(0.3)
        shot_res2 = send_cmd('Page.captureScreenshot', {'format': 'png'})
        while True:
            msg = recv_frame()
            if msg and msg.get('id') == shot_res2:
                b64 = msg['result']['data']
                with open('screenshots/top_header_1920x1080_museum.png', 'wb') as f:
                    f.write(base64.b64decode(b64))
                print("Saved screenshots/top_header_1920x1080_museum.png")
                break

        # Mobile 390x844
        send_cmd('Emulation.setDeviceMetricsOverride', {
            'width': 390,
            'height': 844,
            'deviceScaleFactor': 3,
            'mobile': True
        })
        time.sleep(0.3)
        shot_res3 = send_cmd('Page.captureScreenshot', {'format': 'png'})
        while True:
            msg = recv_frame()
            if msg and msg.get('id') == shot_res3:
                b64 = msg['result']['data']
                with open('screenshots/mobile_390x844_clean.png', 'wb') as f:
                    f.write(base64.b64decode(b64))
                print("Saved screenshots/mobile_390x844_clean.png")
                break

        print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")

    finally:
        proc.terminate()
        proc.wait()

if __name__ == '__main__':
    verify()
