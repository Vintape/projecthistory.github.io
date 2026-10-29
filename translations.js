/* ========================================================================
   АРТЕФАКТ / ARTEFACT: АКАДЕМИЧЕСКАЯ МУЛЬТИЯЗЫЧНАЯ СИСТЕМА (RU / EN)
   ZERO AI AT CLIENT RUNTIME · COMPLETE BILINGUAL ETHNOGRAPHIC CORPUS
   ======================================================================== */

(function(root) {
  "use strict";

  const UI = {
  "brand_title": {
    "ru": "АРТЕФАКТ",
    "en": "ARTEFACT"
  },
  "brand_tagline": {
    "ru": "История оставляет след",
    "en": "History leaves a trace"
  },
  "nav_hero": {
    "ru": "🏛️ Главная",
    "en": "🏛️ Home"
  },
  "nav_cultures": {
    "ru": "🗺️ Культуры",
    "en": "🗺️ Cultures"
  },
  "nav_quest": {
    "ru": "🧭 Маршрут",
    "en": "🧭 Route"
  },
  "nav_atlas": {
    "ru": "🌐 Этноатлас",
    "en": "🌐 EthnoAtlas"
  },
  "nav_restorer": {
    "ru": "🔬 AI-Лаборатория",
    "en": "🔬 AI Lab"
  },
  "nav_decipherer": {
    "ru": "⚡ AI-Дешифратор",
    "en": "⚡ AI Decipherer"
  },
  "nav_folklore": {
    "ru": "📜 Фольклор",
    "en": "📜 Folklore"
  },
  "nav_collection": {
    "ru": "💎 Награды",
    "en": "💎 Treasury"
  },
  "nav_workshop": {
    "ru": "✨ Мастерская",
    "en": "✨ Workshop"
  },
  "sound_ambient": {
    "ru": "Эмбиент",
    "en": "Ambient"
  },
  "sound_playing": {
    "ru": "Играет",
    "en": "Playing"
  },
  "theme_light": {
    "ru": "Светлая",
    "en": "Light"
  },
  "theme_dark": {
    "ru": "Тёмная",
    "en": "Dark"
  },
  "view_mode": {
    "ru": "Вид",
    "en": "View"
  },
  "lang_btn_lbl": {
    "ru": "EN",
    "en": "RU"
  },
  "lang_drawer_lbl": {
    "ru": "Language: English (EN)",
    "en": "Язык: Русский (RU)"
  },
  "bnav_hero": {
    "ru": "Главная",
    "en": "Home"
  },
  "bnav_cultures": {
    "ru": "Культуры",
    "en": "Cultures"
  },
  "bnav_quest": {
    "ru": "Маршрут",
    "en": "Route"
  },
  "bnav_folklore": {
    "ru": "Фольклор",
    "en": "Folklore"
  },
  "bnav_collection": {
    "ru": "Награды",
    "en": "Treasury"
  },
  "hero_badge": {
    "ru": "✦ Цифровая платформа культурного наследия",
    "en": "✦ Digital Cultural Heritage Platform"
  },
  "hero_h1": {
    "ru": "История <em>оставляет след</em>",
    "en": "History <em>Leaves a Trace</em>"
  },
  "hero_lead": {
    "ru": "Интерактивная антология этнографии, мифологии и живых ремёсел народов Евразии. Исследуйте сакральные памятники, восстанавливайте утраченные шедевры в AI-лаборатории и получайте персональные билеты в музеи.",
    "en": "Interactive anthology of ethnography, mythology, and living crafts of Eurasian cultures. Explore sacred monuments, restore lost masterpieces in the AI laboratory, and claim personalized museum tickets."
  },
  "hero_stat_1_val": {
    "ru": "8 этнокультур",
    "en": "8 Cultures"
  },
  "hero_stat_1_lbl": {
    "ru": "Полевые экспедиции",
    "en": "Field Expeditions"
  },
  "hero_stat_2_val": {
    "ru": "3D-артефакты",
    "en": "3D Artifacts"
  },
  "hero_stat_2_lbl": {
    "ru": "Музейная точность",
    "en": "Museum Accuracy"
  },
  "hero_stat_3_val": {
    "ru": "AI-Лаборатория",
    "en": "AI Laboratory"
  },
  "hero_stat_3_lbl": {
    "ru": "Спектральный анализ",
    "en": "Spectral Analysis"
  },
  "hero_stat_4_val": {
    "ru": "AI-Дешифратор",
    "en": "AI Decipherer"
  },
  "hero_stat_4_lbl": {
    "ru": "Компьютерное зрение",
    "en": "Computer Vision"
  },
  "hero_cta_start": {
    "ru": "Начать маршрут экспедиции →",
    "en": "Start Expedition Route →"
  },
  "hero_cta_atlas": {
    "ru": "Интерактивный этноатлас 🌐",
    "en": "Interactive EthnoAtlas 🌐"
  },
  "hero_card_restorer_title": {
    "ru": "🔬 AI-Реставратор",
    "en": "🔬 AI Restorer"
  },
  "hero_card_restorer_desc": {
    "ru": "Мультиспектральная реконструкция утрат",
    "en": "Multispectral loss reconstruction"
  },
  "hero_card_petro_title": {
    "ru": "⚡ AI-Петролинза",
    "en": "⚡ AI Petro-Lens"
  },
  "hero_card_petro_desc": {
    "ru": "Дешифровка древней наскальной эпиграфики",
    "en": "Deciphering ancient rock epigraphy"
  },
  "cult_badge": {
    "ru": "✦ Каталог экспедиций",
    "en": "✦ Expedition Catalog"
  },
  "cult_heading": {
    "ru": "Культуры и народы",
    "en": "Cultures & Peoples"
  },
  "cult_lead": {
    "ru": "Погрузитесь в этнографические маршруты: от поморских мореходов до казанских ювелиров и скифских курганов.",
    "en": "Immerse yourself in ethnographic routes: from Pomeranian seafarers to Kazan jewelers and Scythian kurgans."
  },
  "cult_search_ph": {
    "ru": "Поиск по культуре, региону, артефакту...",
    "en": "Search culture, region, artifact..."
  },
  "cult_filter_all": {
    "ru": "Все регионы",
    "en": "All Regions"
  },
  "cult_filter_russia": {
    "ru": "Россия",
    "en": "Russia"
  },
  "cult_filter_silk": {
    "ru": "Шёлковый путь",
    "en": "Silk Road"
  },
  "cult_tag_russia": {
    "ru": "Россия",
    "en": "Russia"
  },
  "cult_tag_silk": {
    "ru": "Шёлковый путь",
    "en": "Silk Road"
  },
  "cult_card_exp": {
    "ru": "Экспедиция 01–05",
    "en": "Expedition 01–05"
  },
  "step_pill_1": {
    "ru": "01 · Регион",
    "en": "01 · Region"
  },
  "step_pill_2": {
    "ru": "02 · Миф и видео",
    "en": "02 · Myth & Video"
  },
  "step_pill_3": {
    "ru": "03 · Найди след",
    "en": "03 · Find Trace"
  },
  "step_pill_4": {
    "ru": "04 · 3D-артефакт",
    "en": "04 · 3D Artifact"
  },
  "step_pill_5": {
    "ru": "05 · Билет в музей",
    "en": "05 · Museum Ticket"
  },
  "quest_title_suffix": {
    "ru": "· Наследие мастеров",
    "en": "· Master Heritage"
  },
  "q1_badge": {
    "ru": "Шаг 01 · Временной срез",
    "en": "Step 01 · Time Slice"
  },
  "q1_heading": {
    "ru": "Город сквозь столетия",
    "en": "City Across Centuries"
  },
  "q1_greeting_lbl": {
    "ru": "Живое традиционное приветствие:",
    "en": "Living Traditional Greeting:"
  },
  "q1_listen_btn": {
    "ru": "🗣️ Слушать голос",
    "en": "🗣️ Listen Voice"
  },
  "q1_next_btn": {
    "ru": "Смотреть сказание и кино →",
    "en": "Watch Tale & Video →"
  },
  "q1_change_cult_btn": {
    "ru": "Выбрать другой регион",
    "en": "Choose Another Region"
  },
  "q1_archive_tag": {
    "ru": "Архив XIX в.",
    "en": "19th c. Archive"
  },
  "q1_modern_tag": {
    "ru": "Наши дни",
    "en": "Present Day"
  },
  "q1_slider_hint_left": {
    "ru": "← Потяните слайдер или коснитесь пальцем",
    "en": "← Drag slider or touch swipe"
  },
  "q1_slider_hint_right": {
    "ru": "Архив vs Современность →",
    "en": "Archive vs Present →"
  },
  "q2_badge": {
    "ru": "Шаг 02 · Сакральное сказание",
    "en": "Step 02 · Sacred Tale"
  },
  "q2_video_status": {
    "ru": "Режиссёрская экспозиция · 16:9",
    "en": "Director's Cut · 16:9"
  },
  "q2_tab_story": {
    "ru": "История",
    "en": "Story"
  },
  "q2_tab_symbols": {
    "ru": "Символика",
    "en": "Symbols"
  },
  "q2_tab_words": {
    "ru": "Словарь",
    "en": "Glossary"
  },
  "q2_tab_rituals": {
    "ru": "Обряды",
    "en": "Rituals"
  },
  "q2_next_btn": {
    "ru": "Перейти к квесту «Найди след» →",
    "en": "Proceed to «Find Trace» Quest →"
  },
  "q3_badge": {
    "ru": "Шаг 03 · Испытание этнографа",
    "en": "Step 03 · Ethnographer Trial"
  },
  "q3_heading": {
    "ru": "Найди след мастера",
    "en": "Find the Master's Trace"
  },
  "q3_verify_btn": {
    "ru": "Проверить гипотезу ✓",
    "en": "Verify Hypothesis ✓"
  },
  "q3_loupe_hint": {
    "ru": "✦ Водите пальцем или курсором по холсту для фиксации сакрального фрагмента (удерживайте 1 сек)",
    "en": "✦ Drag finger or cursor across canvas to lock onto sacred motif (hold 1 sec)"
  },
  "q4_badge": {
    "ru": "Шаг 04 · Научная паспортизация",
    "en": "Step 04 · Scientific Dossier"
  },
  "q4_heading": {
    "ru": "3D-Инспектор артефакта",
    "en": "3D Artifact Inspector"
  },
  "q4_desc": {
    "ru": "Вращайте экспонат свайпом пальца или ползунком ракурса. Исследуйте глубину шва, сафьяновую кожу и растительные пигменты.",
    "en": "Rotate exhibit with touch swipe or rotation slider. Examine stitch depth, morocco leather, and mineral pigments."
  },
  "q4_slider_lbl": {
    "ru": "Ракурс поворота экспоната:",
    "en": "Artifact rotation angle:"
  },
  "q4_storage_lbl": {
    "ru": "Музейное хранение:",
    "en": "Museum Repository:"
  },
  "q4_next_btn": {
    "ru": "Получить персональный билет в музей →",
    "en": "Claim Personalized Museum Ticket →"
  },
  "q5_badge": {
    "ru": "Именной пропуск исследователя",
    "en": "Researcher Personalized Pass"
  },
  "q5_hologram": {
    "ru": "✦ ЛЬГОТА -15%",
    "en": "✦ PRIVILEGE -15%"
  },
  "q5_pass_info": {
    "ru": "Предъявите цифровой пропуск смотрителю или на кассе музейного филиала для регистрации в реестре исследователей.",
    "en": "Present this digital pass to the docent or ticket desk to register in the researcher registry."
  },
  "q5_keeper_title": {
    "ru": "Секретный пароль смотрителю зала:",
    "en": "Secret passkey for hall docent:"
  },
  "q5_keeper_hint": {
    "ru": "(Назовите смотрителю в зале этнографии и получите памятный физический стикерпак экспедиции)",
    "en": "(Tell the docent in the ethnographic hall to receive a commemorative physical expedition sticker pack)"
  },
  "q5_maps_btn": {
    "ru": "📍 Маршрут на карте",
    "en": "📍 Map Route"
  },
  "q5_geo_btn": {
    "ru": "🛰️ Спутниковый чекин",
    "en": "🛰️ Satellite Check-in"
  },
  "q5_passport_btn": {
    "ru": "📜 Полевой паспорт",
    "en": "📜 Field Dossier"
  },
  "q5_stub_ctrl": {
    "ru": "КОНТРОЛЬ",
    "en": "CONTROL"
  },
  "q5_tear_btn": {
    "ru": "Оторвать корешок",
    "en": "Tear Stub"
  },
  "q5_exp_num": {
    "ru": "№ ЭКСПЕДИЦИИ",
    "en": "EXPEDITION #"
  },
  "atlas_badge": {
    "ru": "✦ Панорама культур Евразии",
    "en": "✦ Panorama of Eurasian Cultures"
  },
  "atlas_heading": {
    "ru": "Интерактивный Этноатлас",
    "en": "Interactive EthnoAtlas"
  },
  "atlas_filter_all": {
    "ru": "Все регионы",
    "en": "All Regions"
  },
  "atlas_filter_north_volga": {
    "ru": "Север и Волга",
    "en": "North & Volga"
  },
  "atlas_filter_east": {
    "ru": "Кавказ и Восток",
    "en": "Caucasus & East"
  },
  "atlas_filter_siberia_altai": {
    "ru": "Сибирь и Алтай",
    "en": "Siberia & Altai"
  },
  "atlas_filter_silk": {
    "ru": "Шелковый путь",
    "en": "Silk Road"
  },
  "atlas_dossier_title_suffix": {
    "ru": "· Паспорт экспедиции",
    "en": "· Expedition Dossier"
  },
  "atlas_greeting_lbl": {
    "ru": "Живое приветствие:",
    "en": "Living Greeting:"
  },
  "atlas_artifact_lbl": {
    "ru": "Ключевой артефакт:",
    "en": "Key Artifact:"
  },
  "atlas_museum_lbl": {
    "ru": "Музей:",
    "en": "Museum:"
  },
  "atlas_launch_exp_btn": {
    "ru": "Перейти к экспедиции →",
    "en": "Launch Expedition →"
  },
  "atlas_audioguide_btn": {
    "ru": "Аудиогид",
    "en": "Audio Guide"
  },
  "restorer_badge": {
    "ru": "✦ Археометрический аналитический комплекс · Zero API Key Runtime",
    "en": "✦ Archaeometric Analytical Suite · Zero API Key Runtime"
  },
  "restorer_heading": {
    "ru": "Нейрореставрационная Лаборатория",
    "en": "AI Restoration Laboratory"
  },
  "restorer_lead": {
    "ru": "Интерактивное исследование сакральных экспонатов: оптическая деконволюция, мультиспектральный анализ (UV 365 nm / X-Ray / IR 950 nm) и обратимая цифровая реконструкция музейных утрат.",
    "en": "Interactive investigation of sacred exhibits: optical deconvolution, multispectral analysis (UV 365 nm / X-Ray / IR 950 nm), and reversible digital reconstruction of museum lacunae."
  },
  "restorer_btn_hotspots": {
    "ru": "📍 Метки анализа",
    "en": "📍 Analysis Hotspots"
  },
  "restorer_btn_pedestal": {
    "ru": "🏺 Пьедестал 3D",
    "en": "🏺 3D Pedestal"
  },
  "restorer_art_khasite": {
    "ru": "🌷 01 · Казанское хасите (XIX в.)",
    "en": "🌷 01 · Kazan Khasite (19th c.)"
  },
  "restorer_art_scythian": {
    "ru": "🦅 02 · Скифская золотая пектораль (IV в. до н.э.)",
    "en": "🦅 02 · Scythian Gold Pectoral (4th c. BC)"
  },
  "restorer_art_yakut": {
    "ru": "❄️ 03 · Якутское илин кэбисэр (XVIII в.)",
    "en": "❄️ 03 · Yakut Ilin Kebiser (18th c.)"
  },
  "restorer_spectral_lbl": {
    "ru": "Спектральный режим:",
    "en": "Spectral Mode:"
  },
  "restorer_mode_visible": {
    "ru": "👁️ Оптический RGB",
    "en": "👁️ Optical RGB"
  },
  "restorer_mode_uv": {
    "ru": "🟣 УФ Люминесценция (365 nm)",
    "en": "🟣 UV Luminescence (365 nm)"
  },
  "restorer_mode_xray": {
    "ru": "⚡ Рентген (X-Ray)",
    "en": "⚡ X-Ray Radiography"
  },
  "restorer_mode_ir": {
    "ru": "🔴 Инфракрасный (950 nm)",
    "en": "🔴 Infrared (950 nm)"
  },
  "restorer_tag_before": {
    "ru": "◄ До реставрации",
    "en": "◄ Before Restoration"
  },
  "restorer_tag_after": {
    "ru": "ИИ-реконструкция ►",
    "en": "AI Reconstruction ►"
  },
  "restorer_hint": {
    "ru": "💡 Перетаскивайте золотую стрелку или кликайте по изображению",
    "en": "💡 Drag golden handle or tap image to compare"
  },
  "restorer_lbl_storage": {
    "ru": "Хранение:",
    "en": "Repository:"
  },
  "restorer_lbl_materials": {
    "ru": "Материалы:",
    "en": "Materials:"
  },
  "restorer_lbl_dating": {
    "ru": "Датировка:",
    "en": "Dating:"
  },
  "restorer_lbl_status": {
    "ru": "Статус сохранности:",
    "en": "Conservation status:"
  },
  "restorer_strat_lbl": {
    "ru": "Микро-КТ стратиграфия слоев",
    "en": "Micro-CT Layer Stratigraphy"
  },
  "restorer_strat_hint": {
    "ru": "Сдвигайте ползунок для послойного виртуального среза микроструктуры экспоната",
    "en": "Slide to reveal layer-by-layer virtual cross-sections of artifact microstructure"
  },
  "petro_badge": {
    "ru": "⚡ НЕЙРОСЕТЕВАЯ АРХЕОМЕТРИЯ · КОМПЬЮТЕРНОЕ ЗРЕНИЕ В БРАУЗЕРЕ",
    "en": "⚡ NEURAL ARCHAEOMETRY · IN-BROWSER COMPUTER VISION"
  },
  "petro_chip_sobel": {
    "ru": "✦ Фильтр Собеля 60 FPS",
    "en": "✦ Sobel Filter 60 FPS"
  },
  "petro_chip_sonar": {
    "ru": "✦ Верифицировано Perplexity Sonar",
    "en": "✦ Verified Perplexity Sonar"
  },
  "petro_heading": {
    "ru": "AI-Петролинза: Дешифратор Древних Символов",
    "en": "AI Petro-Lens: Ancient Symbol Decipherer"
  },
  "petro_lead": {
    "ru": "Исследуйте древнейшую наскальную эпиграфику Евразии в реальном времени. Перемещайте интерактивную линзу нейросканера по поверхности древнего камня: алгоритмы компьютерного зрения выделяют скрытые линии высечки, анализируют глубину рельефа и расшифровывают сакральный смысл знаков.",
    "en": "Explore the most ancient Eurasian rock epigraphy in real time. Move the interactive neuroscanner lens across ancient petroglyph surfaces: computer vision algorithms isolate faint carving lines, analyze depth relief, and decode sacred symbol semantics."
  },
  "petro_mode_edge": {
    "ru": "⚡ AI-Контур (Собель)",
    "en": "⚡ AI Edge (Sobel)"
  },
  "petro_mode_relief": {
    "ru": "🔬 Топография рельефа",
    "en": "🔬 Depth Relief"
  },
  "petro_mode_neural": {
    "ru": "✨ Нейросетевой граф",
    "en": "✨ Neural Graph"
  },
  "petro_mode_original": {
    "ru": "👁️ Естественный свет",
    "en": "👁️ Natural Light"
  },
  "petro_hint": {
    "ru": "💡 Перемещайте линзу курсором или свайпом пальца по камню",
    "en": "💡 Move lens with cursor or finger swipe across stone"
  },
  "petro_lbl_hud_title": {
    "ru": "Паспорт петроглифа",
    "en": "Petroglyph Dossier"
  },
  "petro_lbl_hud_conf": {
    "ru": "Точность идентификации нейросети:",
    "en": "Neural identification accuracy:"
  },
  "petro_lbl_loc": {
    "ru": "Локация:",
    "en": "Location:"
  },
  "petro_lbl_era": {
    "ru": "Эпоха:",
    "en": "Era:"
  },
  "petro_lbl_cat": {
    "ru": "Канон:",
    "en": "Canon:"
  },
  "petro_lbl_sacred": {
    "ru": "Сакральный смысл:",
    "en": "Sacred Meaning:"
  },
  "petro_lbl_nodes": {
    "ru": "Ключевые узлы и частоты:",
    "en": "Key Nodes & Frequencies:"
  },
  "petro_btn_export": {
    "ru": "Экспорт векторного слепка (SVG)",
    "en": "Export Vector Trace (SVG)"
  },
  "folklore_badge": {
    "ru": "✦ Живое устное наследие",
    "en": "✦ Living Oral Heritage"
  },
  "folklore_heading": {
    "ru": "Антология фольклора и эпоса",
    "en": "Anthology of Folklore & Epics"
  },
  "folklore_filter_all": {
    "ru": "Все сказания",
    "en": "All Tales"
  },
  "folklore_filter_epics": {
    "ru": "Богатырский эпос",
    "en": "Heroic Epics"
  },
  "folklore_filter_tales": {
    "ru": "Сказки и притчи",
    "en": "Fairy Tales & Parables"
  },
  "folklore_filter_nature": {
    "ru": "Мифы о сотворении",
    "en": "Creation Myths"
  },
  "folklore_btn_read": {
    "ru": "Читать и исследовать →",
    "en": "Read & Explore →"
  },
  "folklore_lbl_moral": {
    "ru": "Мораль:",
    "en": "Moral:"
  },
  "col_badge": {
    "ru": "Личный кабинет этнографа",
    "en": "Ethnographer Treasury"
  },
  "col_heading": {
    "ru": "Витрина наград и артефактов",
    "en": "Relics & Artifacts Showcase"
  },
  "col_btn_unlock_all": {
    "ru": "✨ Открыть все реликвии",
    "en": "✨ Unlock All Relics"
  },
  "col_status_unlocked": {
    "ru": "✓ Разблокировано",
    "en": "✓ Unlocked"
  },
  "col_status_locked": {
    "ru": "🔒 Заблокировано",
    "en": "🔒 Locked"
  },
  "col_family_badge": {
    "ru": "Совместный прогресс",
    "en": "Collective Progress"
  },
  "col_family_heading": {
    "ru": "Семейная экспедиция",
    "en": "Family Expedition"
  },
  "col_btn_add_companion": {
    "ru": "➕ Добавить спутника",
    "en": "➕ Add Companion"
  },
  "col_solved_count": {
    "ru": "артефактов разгадано",
    "en": "artifacts deciphered"
  },
  "ws_badge": {
    "ru": "✦ Процедурная сакральная орнаментика",
    "en": "✦ Procedural Sacred Ornamentation"
  },
  "ws_heading": {
    "ru": "Мастерская оберегов",
    "en": "Amulet Workshop"
  },
  "ws_lead": {
    "ru": "Сформируйте подлинный сакральный оберег на основе этнографических мотивов народов России. Процедурный генератор синтезирует вековую геометрию, розеточную симметрию и родовые знаки защиты.",
    "en": "Synthesize an authentic sacred amulet based on traditional motifs of Eurasian cultures. The procedural engine weaves ancient geometry, rosette symmetries, and ancestral protection emblems."
  },
  "ws_step1_lbl": {
    "ru": "1. Выберите сакральные мотивы:",
    "en": "1. Select Sacred Motifs:"
  },
  "ws_motif_tulip": {
    "ru": "🌷 Тюльпан (Возрождение)",
    "en": "🌷 Tulip (Renewal)"
  },
  "ws_motif_horse": {
    "ru": "🐎 Мезенский конь (Сила)",
    "en": "🐎 Mezen Horse (Strength)"
  },
  "ws_motif_bird": {
    "ru": "🕊️ Птица Сирин (Мир)",
    "en": "🕊️ Bird Sirin (Peace)"
  },
  "ws_motif_rhomb": {
    "ru": "☀️ Солярный ромб (Семья)",
    "en": "☀️ Solar Rhomb (Family)"
  },
  "ws_motif_kharyskhal": {
    "ru": "🌿 Харысхал (Здоровье)",
    "en": "🌿 Kharyskhal (Health)"
  },
  "ws_step2_lbl": {
    "ru": "2. Симметрия розетки:",
    "en": "2. Rosette Symmetry:"
  },
  "ws_sym_8": {
    "ru": "8 лучей (Земля)",
    "en": "8 Rays (Earth)"
  },
  "ws_sym_12": {
    "ru": "12 лучей (Космос)",
    "en": "12 Rays (Cosmos)"
  },
  "ws_sym_16": {
    "ru": "16 лучей (Вечность)",
    "en": "16 Rays (Eternity)"
  },
  "ws_step3_lbl": {
    "ru": "3. Цветовой канон:",
    "en": "3. Color Palette:"
  },
  "ws_pal_gold": {
    "ru": "✨ Золото и сапфир",
    "en": "✨ Gold & Sapphire"
  },
  "ws_pal_ruby": {
    "ru": "🔥 Северная киноварь",
    "en": "🔥 Northern Cinnabar"
  },
  "ws_pal_linen": {
    "ru": "📜 Поморский лён",
    "en": "📜 Pomeranian Linen"
  },
  "ws_btn_gen": {
    "ru": "✨ Синтезировать оберег",
    "en": "✨ Synthesize Amulet"
  },
  "ws_btn_download": {
    "ru": "📥 Скачать оберег (PNG)",
    "en": "📥 Download Amulet (PNG)"
  },
  "ws_btn_share": {
    "ru": "🔗 Скопировать ссылку",
    "en": "🔗 Copy Share Link"
  },
  "ws_vision_title": {
    "ru": "Интерактивный ИИ-сканер символики",
    "en": "Interactive Vision AI Symbol Scanner"
  },
  "ws_vision_lead": {
    "ru": "Запустите нейросетевой анализ созданного оберега: алгоритм сравнит сгенерированную геометрию с академическим каталогом РЭМ и верифицирует сакральную точность.",
    "en": "Run neural vision analysis on the created amulet: the algorithm cross-references generated geometry against the REM academic catalog to verify sacred accuracy."
  },
  "ws_vision_btn": {
    "ru": "✨ Запустить сканер символики",
    "en": "✨ Run Symbol Vision AI"
  }
};

  const ETHNO_DATABASE_EN = {
  "tatarstan": {
    "sub": "✦ 01 / 08 · Volga & Urals",
    "title": "Tatarstan",
    "lead": "Crossroads of Eastern and Western civilizations, the grand legacy of Volga Bulgaria, virtuoso leather mosaic craft, and poetry of the ancient sacred forest (urman).",
    "greeting": "«Isänmesez! Räxim itegez!»",
    "speechText": "Isanmesez! Rakhim itegez! Kazan masters have preserved the sacred secrets of gold embroidery and mosaic leather for centuries. Welcome to the treasury of Tatarstan.",
    "mythTitle": "Legend of the Shurale",
    "artTitle": "Kazan Filigree Chest Plaque (Khasite)",
    "artDesc": "A 19th-century masterpiece of Kazan Tatar silversmith art from the National Museum of the Republic of Tatarstan. Tuberous filigree (chyolter) and protective Quran containers were passed down through generations as ancestral family talismans.",
    "era": "19th Century",
    "museumName": "National Museum of the Republic of Tatarstan",
    "museumCity": "Kazan, 2 Kremlyovskaya St.",
    "invNumber": "Inv. No. KP-7482/ET · 19th c. Kazan Tatar Ethnography Hall",
    "keeperSecretWord": "«BYLTYR-1892»",
    "loupeScannerClue": "Hover the lens over the central filigree Quran capsule: observe volumetric solder droplets and floral tendrils forming trefoils and lotus palmettes.",
    "quizOptions": [
      {
        "id": "1",
        "name": "Zoomorphic motif depicting a winged snow leopard",
        "desc": "Although the leopard was a Bulgar dynastic emblem, 19th-century Kazan Tatar jewelry strictly avoided zoomorphic imagery in adherence to Islamic aniconism."
      },
      {
        "id": "2",
        "name": "Tuberous filigree with tulip and palmette motifs",
        "desc": "Volumetric tuberous filigree (syrly chyolter) featuring tulip silhouettes and teardrop soldered nodes is the authentic hallmark of 19th-century Kazan goldsmiths, symbolizing vernal rebirth and prosperity."
      },
      {
        "id": "3",
        "name": "Niello geometric knotwork ribbon ornament",
        "desc": "Complex braided knot ribbons are characteristic of pre-Mongol Scandinavian and Old Rus ornaments rather than Kazan Tatar khasite breastplates."
      },
      {
        "id": "4",
        "name": "Polychrome cloisonné enamel with solar discs",
        "desc": "Cloisonné enamel was prevalent in Byzantine and Kievan jewelry traditions; Tatar khasite was adorned with filigree, granulation, chasing, and carnelian cabochons."
      }
    ],
    "chapters": {
      "story": "In archaic Turko-Bulgar cosmology, Shurale is not merely a woodland spirit, but a vigilant warden of primordial balance in the virgin forest (urman). According to the celebrated poem by Gabdulla Tuqay, a clever young woodcutter outsmarted the spirit by wedging its fingers into an oak log split and naming himself «Byltyr» («Last Year»). Ancient wisdom teaches: the spirit never harms those who honor ancestral patterns and forest harmony.",
      "symbols": "The heart of Tatar ornamentation is the «Tulip» (emblem of spring awakening and fertility) alongside the trefoil («Öçyapraq»), embodying the unbroken continuum of ancestors, the living, and future generations.",
      "words": "«Möñ» — a profound spiritual state of sublime harmony with the cosmos; «Ichigi» — traditional patterned boots crafted with morocco leather mosaic; «Urman» — sacred primeval forest.",
      "rituals": "The plow festival «Sabantuy»: the ceremonial gathering of embroidered towels («Sölge cıyu»). The finest towel adorned with the Kazan tulip was awarded to the supreme champion of national kuresh wrestling."
    }
  },
  "pomorye": {
    "sub": "✦ 02 / 08 · Russian North & White Sea",
    "title": "Pomorye",
    "lead": "Epic harsh realm of intrepid seafarers, wood chip Birds of Happiness, Mezen red-and-black horse petroglyphic paintings, and ancient naval karbas boats.",
    "greeting": "«Zdorovo zhivete, zemlyaki!»",
    "speechText": "Zdorovo zhivete! The White Sea has forged unbreakable wills for centuries. Here seafarers built ships without a single iron nail and carved wooden birds of happiness to protect every family hearth.",
    "mythTitle": "Tale of the Tsar-Maiden Ring & Bird Sirin",
    "artTitle": "Arkhangelsk Wood Chip Bird of Happiness",
    "artDesc": "A sacred talisman of Northern maritime masters. Made from seasoned northern pine without glue or fasteners using precision radial fan cleavage. Placed under ceiling beams to bless the hearth.",
    "era": "Late 19th – Early 20th c.",
    "museumName": "State Museum of Wooden Architecture «Malye Korely»",
    "museumCity": "Arkhangelsk, Malye Korely Village",
    "invNumber": "Inv. No. MK-1904/DR · Northern Crafts & Marine Hall",
    "keeperSecretWord": "«STUDEONOYE-1703»",
    "loupeScannerClue": "Inspect the delicate fan plumage: see how thin pine splints interlock in a radial continuum resembling the celestial solar halo.",
    "quizOptions": [
      {
        "id": "1",
        "name": "Carved pine wood chip bird with radial plumage",
        "desc": "The authentic Northern Bird of Happiness is crafted from a single piece of pine using split-chip techniques, symbolizing the spiritual warmth of the hearth and celestial protection."
      },
      {
        "id": "2",
        "name": "Clay painted whistle with Gorodets floral swirls",
        "desc": "Gorodets clay whistles belong to the Volga handicraft tradition rather than the maritime wood-carving canon of the White Sea Pomors."
      },
      {
        "id": "3",
        "name": "Cast bronze zoomorphic bear amulet in Perm animal style",
        "desc": "The Perm animal style bronze casting belongs to ancient Uralic Finno-Ugric archaeology, distinct from Pomor wooden architectural crafts."
      },
      {
        "id": "4",
        "name": "Ivory carved walrus tusk triptych with hunting scenes",
        "desc": "While Kholmogory bone carving is celebrated in the North, the sacred hearth guardian of every Pomor peasant dwelling was the fan-carved pine bird."
      }
    ],
    "chapters": {
      "story": "Pomor seafarers navigating the treacherous Arctic Ocean («Studyonoye More») believed that the celestial bird brought the warmth of spring sun to break through months of polar winter. Legend tells of a hunter who carved the feather-winged bird to heal his ailing son, bringing back the light.",
      "symbols": "The radial plumage represents solar rays dispelling frost, while the stylized Mezen red horse signifies ceaseless vitality against Arctic tempests.",
      "words": "«Karbas» — seaworthy open wooden sailboat; «Tonya» — traditional coastal fishing settlement; «Kormshchik» — master navigator steering by northern star compass.",
      "rituals": "Blessing the new karbas before launching into the White Sea: carving protective solar rosettes upon the bowsprit to ensure safe passage across freezing waters."
    }
  },
  "caucasus": {
    "sub": "✦ 03 / 08 · High Caucasus & Kubachi",
    "title": "Caucasus (Dagestan)",
    "lead": "Mountain fortress of master artisans, legendary Kubachi chased silverware, Nart epic heroes, and sacred forge fires of craftsman Tlepsh.",
    "greeting": "«Assalamu alaykum! Salam to guests!»",
    "speechText": "Assalamu alaykum! The mountain peaks of Dagestan have cradled secret metalworking traditions since antiquity. Welcome to Kubachi, the legendary village of gold and weapon smiths.",
    "mythTitle": "Nart Epic & The Sacred Forge of Tlepsh",
    "artTitle": "Kubachi Chased Silver Pitcher (Muchal)",
    "artDesc": "Monumental bronze and chased silver ceremonial water vessel from the mountain aul of Kubachi. Adorned with delicate niello, gold damascening, and stylized arabesque «tuta» foliate motifs.",
    "era": "18th – 19th Century",
    "museumName": "Dagestan Museum of Fine Arts named after P.S. Gamzatova",
    "museumCity": "Makhachkala, 28 Gorkogo St.",
    "invNumber": "Inv. No. DMI-4318/MET · Caucasian Chased Silver Gallery",
    "keeperSecretWord": "«TLEPSH-1840»",
    "loupeScannerClue": "Direct the lens at the slender pitcher neck: examine the fine niello inlay intertwined with chased gold arabesque tendrils.",
    "quizOptions": [
      {
        "id": "1",
        "name": "Embossed geometric zigzags with turquoise studs",
        "desc": "Turquoise-studded geometric repoussé is typical of Central Asian silversmithing rather than classic Kubachi chased vessels."
      },
      {
        "id": "2",
        "name": "Engraved niello floral arabesque «Tuta» and «Marhai»",
        "desc": "The classic Kubachi ornamental canon is characterized by asymmetric flourishing branches («marhai») and bilateral tree-of-life palmettes («tuta») filled with deep niello and gold shading."
      },
      {
        "id": "3",
        "name": "Zoomorphic dragon handles with red carnelian eyes",
        "desc": "Dragon handle motifs reflect Scythian or Persian antiquities, whereas Kubachi muchal vessels feature elegant architectural s-curves without mythical beasts."
      },
      {
        "id": "4",
        "name": "Champlevé enamel with Cyrillic protective inscriptions",
        "desc": "Champlevé enamel with Slavic inscriptions belongs to Russian Imperial goldsmithing of Moscow and Veliky Ustyug."
      }
    ],
    "chapters": {
      "story": "In the Nart epics, the divine celestial smith Tlepsh forged magic steel weapons for legendary champions, tempering them in mountain thunderclouds. Kubachi craftsmen consider themselves heirs to his supernatural furnace.",
      "symbols": "The «Tuta» ornament symbolizes the sacred Tree of Life connecting deep ancestral roots with flourishing mountain branches reaching toward heaven.",
      "words": "«Muchal» — ceremonial bronze vessel carried by Dagestani brides; «Zerkash» — master engraver of precious metals; «Aul» — ancient stone mountain fortress village.",
      "rituals": "The bridal procession to the mountain spring: young women carry water in ancestral muchals, celebrating the perpetual flow of life and matrimonial purity."
    }
  },
  "altai": {
    "sub": "✦ 04 / 08 · Sacred Altai & Pazyryk",
    "title": "Gorny Altai",
    "lead": "Sacred cradle of ancient nomads, Kalbak-Tash petroglyphs, Pazyryk ice mummies, master felt syrmaks, and resonant shamanic vargans (komus).",
    "greeting": "«Ezenler! Tolu buyan bolzyn!»",
    "speechText": "Ezenler! Welcome to sacred Altai, where the snowy peaks of Belukha guard the eternal memory of nomads. Listen to the stone whisperings of petroglyphs and the resonance of the komus.",
    "mythTitle": "Celestial Elk & World Mountain Uch-Sumer",
    "artTitle": "Pazyryk Nomadic Wool Carpet & Sacred Griffin",
    "artDesc": "The world's oldest surviving pile carpet (5th c. BC) discovered frozen in a Pazyryk kurgan permafrost tomb. Hand-knotted fine wool depicting majestic spotted stags and royal horsemen.",
    "era": "5th Century BC",
    "museumName": "National Museum of the Altai Republic named after A.V. Anokhin",
    "museumCity": "Gorno-Altaysk, 46 Choros-Gurkina St.",
    "invNumber": "Inv. No. NMAR-8812/ARKH · Pazyryk Hall",
    "keeperSecretWord": "«KALBAK-TASH-2500»",
    "loupeScannerClue": "Examine the knotting density and border frieze: observe the graceful gait of stags with antler branches curling in solar spirals.",
    "quizOptions": [
      {
        "id": "1",
        "name": "Nomadic frieze of royal horsemen and solar stags",
        "desc": "The Pazyryk wool carpet features symmetrical knots depicting mounted horsemen in Persian-Scythian dress and sacred stags marching along border bands."
      },
      {
        "id": "2",
        "name": "Geometric diamond lattices with Greek meander borders",
        "desc": "Classic Greek meanders characterized Mediterranean textiles, whereas Altai nomads depicted animalian dynamism."
      },
      {
        "id": "3",
        "name": "Stylized silk dragons amidst cloud scrolls",
        "desc": "Chinese cloud-and-dragon silk scrolls belong to Han dynasty diplomatic gifts rather than the wool pile carpet woven in the nomadic world."
      },
      {
        "id": "4",
        "name": "Silver wire embroidered falconer silhouettes",
        "desc": "Metallic wire embroidery on felt is a much later medieval development; Pazyryk relied on high-density wool knotting."
      }
    ],
    "chapters": {
      "story": "According to Altai legend, the constellation of the Great Bear represents three celestial hunters pursuing the sacred golden elk whose horns brush the stars. The hunt preserves the eternal cycle of seasons.",
      "symbols": "The flying stag with sweeping spiral antlers signifies solar flight, spiritual transcendence, and guidance into higher celestial planes.",
      "words": "«Komus» — ancestral brass jaw harp; «Kurgan» — monumental stone burial mound; «Arzhan» — sacred healing mountain spring.",
      "rituals": "Tying white ribbons («kyira») upon mountain passes: honoring the spirit masters of the mountain trails and requesting safe passage through steep gorges."
    }
  },
  "yakutia": {
    "sub": "✦ 05 / 08 · Sakha (Yakutia) & Olonkho",
    "title": "Yakutia (Sakha)",
    "lead": "Diamond heart of northern Siberia, epic Olonkho chants recognized by UNESCO, silver pectoral ornaments (ilin kebisêr), and solar Yhyakh rituals.",
    "greeting": "«Egorordo! Urduk ayyyttan algys!»",
    "speechText": "Egorordo! Greetings from the diamond kingdom of Sakha. In the land where permafrost holds mammoth bones, our silversmiths weave sacred jingling ornaments to protect against dark spirits.",
    "mythTitle": "Creation of Middle World in Olonkho Epic",
    "artTitle": "Yakut Silver Pectoral (Ilin Kebisêr)",
    "artDesc": "Sacred ceremonial silver pectoral and dorsal jewelry worn by Yakut women during Yhyakh festival. Multi-tiered filigree chains, stamped discs, and chiming silver pendants warding off ill fortune.",
    "era": "18th – 19th Century",
    "museumName": "Museum of Archaeology & Ethnography of NEFU",
    "museumCity": "Yakutsk, 58 Kulakovskogo St.",
    "invNumber": "Inv. No. MAE-Yak-342/SV · Treasury of Sakha",
    "keeperSecretWord": "«YHYAKH-AYYY-1640»",
    "loupeScannerClue": "Focus the scanner on the central rectangular chest medallion: note the lyre-shaped «kharyskhal» engraving symbolizing longevity and ancestral blessing.",
    "quizOptions": [
      {
        "id": "1",
        "name": "Multi-row openwork silver chains with lyre-shaped medallion",
        "desc": "The authentic Yakut ilin kebisêr features a heavy central pectoral plate with branching openwork chains and clinking bells that scare away evil spirits."
      },
      {
        "id": "2",
        "name": "Beaded velvet kokoshnik with river pearls",
        "desc": "River pearl kokoshnik headdresses are traditional northern Russian bridal adornments, not Yakut metalwork."
      },
      {
        "id": "3",
        "name": "Carved mammoth tusk comb with walrus tooth studs",
        "desc": "While Yakut bone carving is world-renowned, the ilin kebisêr is forged exclusively from sterling silver."
      },
      {
        "id": "4",
        "name": "Gilded bronze belt with turquoise cabochon inlays",
        "desc": "Turquoise-inlaid belts are typical of Central Asian steppe cavalry rather than Siberian female ceremonial attire."
      }
    ],
    "chapters": {
      "story": "The heroic epic Olonkho tells of the primordial battle between radiant deities of Upper World (Aiyy) and monstrous underworld beings (Abaasy) for the soul of the Middle Earth. Hero Nyurgun Bootur defends humanity with an iron spirit.",
      "symbols": "The lyre-shaped «Kharyskhal» symbol represents sacred birch branches and cow horns, promising prosperity, maternal protection, and enduring health.",
      "words": "«Choron» — sacred wooden goblet on three carved horse hooves for kumis; «Serge» — ritual horse tethering post; «Olonkho» — monumental heroic epic.",
      "rituals": "The summer solstice festival Yhyakh: communal circle dance Ohuokhai welcoming the rising sun and pouring kumis libations to the fertility gods."
    }
  },
  "kamchatka": {
    "sub": "✦ 06 / 08 · Kamchatka & Volcanic Realm",
    "title": "Kamchatka",
    "lead": "Land of erupting volcanoes and Pacific tides, Raven Kutkh creation mythology, Itelmen sea grass weaving, and master fur mosaic kukhlyankas.",
    "greeting": "«Torova! Kutkh welcomes all travelers!»",
    "speechText": "Torova! Welcome to Kamchatka, land of boiling geysers and mighty volcanoes. Hear the tale of Raven Kutkh who pulled our peninsula straight from the ocean depths.",
    "mythTitle": "The Wise Raven Kutkh & Birth of Volcanoes",
    "artTitle": "Itelmen Shamanic Sea Otter Coat (Kukhlyanka)",
    "artDesc": "Double-layered Arctic parka tailored from reindeer suede, sea otter fur, and dog skin, adorned with dyed sea mammal throat leather and bone beads.",
    "era": "19th Century",
    "museumName": "Kamchatka Regional United Museum",
    "museumCity": "Petropavlovsk-Kamchatsky, 20 Leninskaya St.",
    "invNumber": "Inv. No. KROM-6291/ET · Northern Peoples Collection",
    "keeperSecretWord": "«KUTKH-VULCAN-1854»",
    "loupeScannerClue": "Examine the fur mosaic geometric border: look for triangular sawtooth chevrons representing Pacific ocean waves and volcanic peaks.",
    "quizOptions": [
      {
        "id": "1",
        "name": "Geometric fur mosaic with sawtooth wave chevrons",
        "desc": "Kamchatka kukhlyankas are decorated along hem and cuffs with complex geometric mosaics combining contrasting dark seal and white reindeer fur."
      },
      {
        "id": "2",
        "name": "Embroidered scarlet satin with golden phoenix birds",
        "desc": "Gold phoenix embroidery is characteristic of East Asian imperial robes, not subarctic leather garments."
      },
      {
        "id": "3",
        "name": "Chased copper plates attached with iron rivets",
        "desc": "Copper plate armor belonged to Northwest Coast Tlingit warriors rather than Kamchatka fur parkas."
      },
      {
        "id": "4",
        "name": "Fine silk tapestry with Japanese wave prints",
        "desc": "Silk tapestries were imported luxury items from Japan, while indigenous attire was handcrafted strictly from local animal hides."
      }
    ],
    "chapters": {
      "story": "Raven Kutkh flew across the boundless primordial ocean, dropping pebbles from his beak that swelled into fiery volcanoes and fertile river valleys. His laughter shook the earth and carved geyser canyons.",
      "symbols": "The triangular chevron embodies the eternal dialogue between smoking volcano peaks and cold ocean breakers.",
      "words": "«Kukhlyanka» — double-layered reindeer fur parka; «Kutkh» — supreme creator raven deity; «Narta» — dog sled adapted for deep volcanic snow.",
      "rituals": "The autumn thanksgiving festival Alkhalalalai: dancing for hours until exhaustion to cleanse evil spirits and celebrating the sea's bounty."
    }
  },
  "kazakhstan": {
    "sub": "✦ 07 / 08 · Steppes of Kazakhstan",
    "title": "Kazakhstan",
    "lead": "Boundless Great Steppe, Golden Warrior of Issyk, felt syrmak master rugs, silver besbilezik bracelets, and poetic dombra melodies.",
    "greeting": "«Salemetsiz be! Kosh keldinizder!»",
    "speechText": "Salemetsiz be! The Great Steppe welcomes you. From the golden armor of Saka kings to the intricate felt syrmaks, nomadic wisdom honors freedom, hospitality, and brotherhood.",
    "mythTitle": "The Golden Man of Issyk & Flying Steed Tulpar",
    "artTitle": "Nomadic Wool Felt Inlay Carpet (Syrmak)",
    "artDesc": "Masterpiece of Kazakh applied art. Two layers of thick wool felt cut in mirror symmetry using ancient mosaic applique techniques, stitched with twisted wool cord.",
    "era": "Late 19th – Early 20th c.",
    "museumName": "National Museum of the Republic of Kazakhstan",
    "museumCity": "Astana, 54 Tauelsizdik Ave.",
    "invNumber": "Inv. No. NMRK-1094/TX · Steppe Ethnography Hall",
    "keeperSecretWord": "«ISSYK-TULPAR-1969»",
    "loupeScannerClue": "Trace the central swirling spiral motif: identify the iconic «Koshkar muyiz» (ram horns) curling outward in symmetrical harmony.",
    "quizOptions": [
      {
        "id": "1",
        "name": "Two-tone felt mosaic with «Koshkar Muyiz» ram horn spirals",
        "desc": "The authentic Kazakh syrmak features bold contrasting felt inlays forming ram horn scrolls (koshkar muyiz), symbolizing pastoral wealth and vitality."
      },
      {
        "id": "2",
        "name": "Golden brocade weave with Persian floral medallions",
        "desc": "Persian brocades were woven on urban royal looms, whereas syrmak was created by steppe nomads using pure sheep wool felt."
      },
      {
        "id": "3",
        "name": "Knotted silk prayer rug with niche mihrab design",
        "desc": "Silk prayer rugs belong to sedentary Islamic urban centers of Bukhara and Samarkand."
      },
      {
        "id": "4",
        "name": "Silver studded bridle with tiger stripe engravings",
        "desc": "While silver horse tackle was prized, syrmak floor carpets were soft felt textiles designed for yurt comfort."
      }
    ],
    "chapters": {
      "story": "The Saka prince, clad in pure gold armor with a high pointed headdress, rode the winged steed Tulpar across the starry steppes. His insignia signified supreme harmony of heaven, earth, and sovereign dignity.",
      "symbols": "The ram horn («Koshkar muyiz») is the root archetype of all steppe ornamentation, signifying vitality, perseverance, and ancestral abundance.",
      "words": "«Syrmak» — mosaic felt carpet; «Dombra» — two-stringed musical instrument of the steppes; «Tulpar» — mythical winged steed.",
      "rituals": "Nauryz celebration: cooking traditional Nauryz-kozhe from seven ingredients, forgiving past grievances, and blessing yurt elders."
    }
  },
  "uzbekistan": {
    "sub": "✦ 08 / 08 · Silk Road Oasis & Samarkand",
    "title": "Uzbekistan",
    "lead": "Sparkling turquoise domes of Samarkand and Khiva, UNESCO heritage of Registan, master silk ikat suzani, and thousand-year ceramic glaze secrets.",
    "greeting": "«Assalomu alaykum! Xush kelibsiz!»",
    "speechText": "Assalomu alaykum! Welcome to the heart of the Great Silk Road. The sun-drenched gardens of Samarkand and Bukhara have inspired masters of gold embroidery and silk weaving for millennia.",
    "mythTitle": "Tale of Rustam, Simurgh & The Golden Pomegranate",
    "artTitle": "Bukhara Embroidered Silk Tapestry (Suzani)",
    "artDesc": "Ceremonial bridal wall panel crafted on handwoven cotton fabric using crimson and golden silk threads. Features the flaming solar disc and flowering pomegranate motifs.",
    "era": "19th Century",
    "museumName": "State Museum of Applied Arts of Uzbekistan",
    "museumCity": "Tashkent, 15 Rakatboshi St.",
    "invNumber": "Inv. No. SMAU-Bukh-782 · Silk Tapestry Hall",
    "keeperSecretWord": "«SAMARKAND-IKAT-1888»",
    "loupeScannerClue": "Inspect the center of the medallion: see the pomegranate blossom with numerous miniature seed nodes representing marital bliss and family prosperity.",
    "quizOptions": [
      {
        "id": "1",
        "name": "Chain-stitched silk pomegranate medallions and sunbursts",
        "desc": "Bukhara suzani panels are renowned for grand crimson pomegranate rounds («anar») and solar rosettes symbolizing fertility, love, and protection."
      },
      {
        "id": "2",
        "name": "Geometric diamond niello medallions on raw linen",
        "desc": "Linen diamond embroidery is common in Slavic folklore, whereas Central Asian suzanis feature lush silk botanical arabesques."
      },
      {
        "id": "3",
        "name": "Golden dragon embroidery upon midnight black satin",
        "desc": "Dragon emblems on satin belong to Chinese courtly textiles traded along caravan routes."
      },
      {
        "id": "4",
        "name": "Woven kilim with step-sided cross lozenges",
        "desc": "Suzani is defined by tambour hook needle embroidery rather than flat tapestry weaving."
      }
    ],
    "chapters": {
      "story": "Legend says the mystical giant bird Simurgh nested atop the sacred Tree of All Seeds, showering life-giving seeds across the oasis valleys and shielding righteous travelers.",
      "symbols": "The pomegranate («Anar») is a universal Eastern talisman of flourishing abundance, eternal life, and deep matrimonial joy.",
      "words": "«Suzani» — hand-embroidered textile hanging; «Ikat (Abrbandi)» — cloud-tied resist dyeing silk technique; «Caravanserai» — ancient roadside inn for Silk Road merchants.",
      "rituals": "Bridal dowry presentation: the bride's family presents the embroidered suzani to adorn the wedding chamber, keeping evil eyes away from the new family."
    }
  }
};

  const AI_RESTORER_DATABASE_EN = {
  "khasite": {
    "title": "Kazan Filigree Chest Plaque (Khasite)",
    "era": "19th Century · Kazan",
    "museum": "National Museum of the Republic of Tatarstan (KP-10492)",
    "material": "Silver 875°, gold plating, filigree, turquoise, carnelian, silk velvet",
    "dating": "1842 ± 5 AD (XRF Fluorescence Method)",
    "status": "98.7% authentic structure",
    "spectralLayers": {
      "visible": "Natural visible light (RGB). 380–740 nm spectrum. Photogrammetric reconstruction of velvet texture and silver filigree.",
      "uv": "Ultraviolet luminescence (365 nm). Detection of organic resins and early adhesive restoration attempts from the 1950s.",
      "xray": "X-Ray radiography. Revealing hollow embossed plaques, skeletal mounting pins, and chased metal sheet thickness.",
      "ir": "Infrared reflectography (950 nm). Penetration beneath surface oxides, uncovering hidden master silversmith hallmark «B.A.»."
    },
    "hotspots": [
      {
        "id": "koran_box",
        "title": "Quran Capsule «Bötü» (Silver Box)",
        "tag": "Filigree & Granulation",
        "desc": "Hexagonal amulet case for sacred prayers, embellished with fine wirework and a turquoise cabochon. Neural filter removed oxide films and restored lost filigree pendants."
      },
      {
        "id": "carnelian",
        "title": "Astrakhan & Indian Carnelians",
        "tag": "Mineralogy",
        "desc": "Natural chalcedony cabochons featuring signature flame-orange undertones. Spectral colorimetry confirms provenance along the Great Volga trade artery."
      },
      {
        "id": "coins",
        "title": "Chased Silver Coin Pendants",
        "tag": "Numismatics",
        "desc": "Turn-of-the-19th-century commemorative silver coins. Monogram reliefs have been clarified and edge micro-corrosion eliminated without abrasive metal loss."
      }
    ]
  },
  "scythian": {
    "title": "Scythian Royal Gold Pectoral",
    "era": "4th Century BC · Black Sea Steppes",
    "museum": "Museum of Historical Treasures (SHM / MHT)",
    "material": "Gold 950° high purity, micro-casting, soldering, wire drawing, glass enamel",
    "dating": "ca. 350 BC (Radioisotope analysis)",
    "status": "99.4% microrelief preservation",
    "spectralLayers": {
      "visible": "High-resolution macro photogrammetry. Multi-tiered composition: mythological griffins, domestic pastoral scenes, and floral cosmos.",
      "uv": "Ultraviolet luminescence. Revealing microscopic solder junctions (gold-copper eutectic alloy) and ancient burnishing abrasions.",
      "xray": "Micro-CT volume radiography. Full visualization of hollow cast animal cores and internal reinforcing wire armatures.",
      "ir": "Infrared reflectography. Isolating residual blue glass enamel traces within minute floral palmette recesses."
    },
    "hotspots": [
      {
        "id": "pastoral",
        "title": "Upper Tier: Scythian Pastoral Milking",
        "tag": "Micro-casting",
        "desc": "Two kneeling Scythians in sheepskin tunics sewing a fleece bag. Neural restorer sharpened anatomical details and muscle tension."
      },
      {
        "id": "palmette",
        "title": "Middle Tier: Sacred Floral Palmette Scroll",
        "tag": "Filigree & Soldering",
        "desc": "Incredible floral arabesque with 5 miniature birds perched among lotus flowers. Micro-lacunae have been algorithmically synthesized."
      },
      {
        "id": "griffins",
        "title": "Lower Tier: Mythical Griffin Combat",
        "tag": "Zoomorphic Dynamism",
        "desc": "Ferocious winged griffins tearing at horses and stags. Reconstructed claw sharpness and wing feather engraving."
      }
    ]
  },
  "yakut": {
    "title": "Yakut Silver Pectoral (Ilin Kebisêr)",
    "era": "18th Century · Yakutia (Sakha)",
    "museum": "Museum of Archaeology and Ethnography (NEFU)",
    "material": "Silver 900°, chasing, stamping, granulation, brass wire, suede straps",
    "dating": "1785 ± 10 AD (Archaeometric thermoluminescence)",
    "status": "97.9% structural integrity",
    "spectralLayers": {
      "visible": "Visible light photogrammetry. Tiered silver chains with bells, repoussé central medallion, and dorsal counterweights.",
      "uv": "UV luminescence (365 nm). Identifying ancient smoke patina, animal fat protection coats, and sulfur tarnishing.",
      "xray": "X-Ray stereoradiography. Examining hollow stamped beads and chain link welding without dismantling the necklace.",
      "ir": "Infrared reflectography. Revealing hand-engraved solar glyphs on the reverse of the main chest plaque."
    },
    "hotspots": [
      {
        "id": "sun_disc",
        "title": "Central Solar Cross «Kün»",
        "tag": "Silversmith Chasing",
        "desc": "Sacred disc radiating solar benevolence. The neural restorer restored fine radial chasing lines lost to ritual polishing over centuries."
      },
      {
        "id": "bells",
        "title": "Acoustic Chiming Bells",
        "tag": "Spiritual Defense",
        "desc": "Silver bell drops engineered to emit protective high-frequency frequencies (880–1200 Hz) that ward off dark spirits."
      },
      {
        "id": "chain_mesh",
        "title": "Chain Interlink Nodes",
        "tag": "Jewelry Weave",
        "desc": "Intricate loop-in-loop hand-forged chains supporting the heavy medallion across the chest and shoulders."
      }
    ]
  }
};

  const PETROGLYPHS_DATABASE_EN = {
  "altai": {
    "title": "Kalbak-Tash Tract · Majestic Solar Stag",
    "region": "Gorny Altai (Chuya Highway) · ca. 1800 BC",
    "era": "Bronze Age (2nd millennium BC)",
    "category": "Karakol Culture",
    "confidence": "99.4%",
    "sacredMeaning": "In ancient Altai nomadic cosmology, the stag served as a celestial psychopomp carrying souls to the upper world. Its branching antlers represent the World Tree connecting cosmic spheres.",
    "source": "Institute of Archaeology & Ethnography SB RAS",
    "motifs": [
      {
        "name": "Branching Antlers as World Tree",
        "desc": "Cosmic bridge between Upper, Middle, and Underworld. Antler geometry mirrors the sacred crown of the Tree of Life."
      },
      {
        "name": "Solar Disc on Rump",
        "desc": "Symbol of the Sun's voyage across the sky, cycle of seasons, and clan fertility."
      },
      {
        "name": "Flying Bent Hooves",
        "desc": "Dynamic gallop conveying spiritual flight across sacred Altai mountain passes."
      }
    ]
  },
  "pomorye": {
    "title": "White Sea · Sacred Demiurge Swan & Karbas",
    "region": "Pomorye (Lake Onega / Cape Besov Nos)",
    "era": "Neolithic (4th–3rd millennium BC)",
    "category": "Onega Rock Art Canon (UNESCO)",
    "confidence": "98.8%",
    "sacredMeaning": "The swan is the sacred demiurge waterfowl of northern peoples, bridging water, earth, and sky. The vessel represents ancient Arctic navigation.",
    "source": "Karelian Research Centre RAS / «Petroglyphs of Onega» Reserve",
    "motifs": [
      {
        "name": "Graceful Long-Necked Waterfowl",
        "desc": "Mother bird that brought the primordial soil up from the bottom of the cosmic ocean."
      },
      {
        "name": "Multi-Oared Maritime Boat",
        "desc": "Earliest evidence of arctic seafaring: elk-headed prow and synchronous rowing oars."
      },
      {
        "name": "Solar Dawn Glyphs",
        "desc": "Ritual calendar marks honoring the vernal thawing of northern waters."
      }
    ]
  },
  "bulgar": {
    "title": "Volga Bulgaria · Princely Tamga & Palmette",
    "region": "Middle Volga (Great Bolgar) · ca. 1314 AD",
    "era": "Golden Horde Period (13th–14th c.)",
    "category": "Bulgar-Tatar Monumental Epigraphy",
    "confidence": "99.1%",
    "sacredMeaning": "The tamga served as a sovereign heraldic seal of clan dynastic authority. The palmette embodies the flowering tree of life and paradisiacal gardens.",
    "source": "Institute of Archaeology named after A.Kh. Khalikov AS RT",
    "motifs": [
      {
        "name": "Dynastic Royal Tamga",
        "desc": "Princely sovereign emblem carved upon white limestone monumental steles."
      },
      {
        "name": "Lotus-Shaped Palmette",
        "desc": "Sacred trefoil representing continuous resurrection and spiritual abundance."
      },
      {
        "name": "Infinite Braided Knot",
        "desc": "Sufi emblem of divine geometric harmony and endless eternity."
      }
    ]
  },
  "yakut": {
    "title": "Lena Pillars · Solar Glyph «Kün» & Shaman",
    "region": "Yakutia (Lena Pillars UNESCO Park) · ca. 1000 BC",
    "era": "Late Bronze / Early Iron Age",
    "category": "Lena Rock Art Epigraphic Canon",
    "confidence": "99.5%",
    "sacredMeaning": "Ochre rock drawings painted on sheer river cliffs depicting sun priests in communion with celestial spirits and horned elk spirit-guides.",
    "source": "Yakut State Museum of the History and Culture of Northern Peoples",
    "motifs": [
      {
        "name": "Solar Disc with Radiating Beams",
        "desc": "Source of heat and life in sub-zero Siberian winters, blessing the hunters."
      },
      {
        "name": "Shamanic Figure with Sacred Staff",
        "desc": "Spiritual mediator wearing ritual horned headdress and holding the sacred tree staff."
      },
      {
        "name": "Prancing Taiga Elk",
        "desc": "Sacred game animal painted with red iron oxide ochre as a prayer for good hunting."
      }
    ]
  },
  "scythian": {
    "title": "Arzhan Kurgan · Flying Royal Stag",
    "region": "Tuva & Sayan Canyon (Arzhan Valley) · 8th c. BC",
    "era": "Early Scythian Period (Saka-Siberian Style)",
    "category": "Steppe Animal Style Epigraphy",
    "confidence": "99.7%",
    "sacredMeaning": "Quintessence of the Scythian animal style: stag flying on bent hooves with stylized antler curls sweeping backward along its spine.",
    "source": "State Hermitage Museum & Tuvan Archaeological Expedition",
    "motifs": [
      {
        "name": "Crested Flame Antlers",
        "desc": "Sweeping flame-shaped antler spirals embodying solar radiance and speed."
      },
      {
        "name": "Tucked Hooves in Levitation",
        "desc": "Artistic convention conveying supernatural flight between earth and starry heaven."
      },
      {
        "name": "Eagle Beak Muzzle",
        "desc": "Hybrid zoomorphism combining stag agility with the piercing gaze of a raptor."
      }
    ]
  }
};

  const FOLKLORE_ANTHOLOGY_EN = {
  "shurale": {
    "title": "Animated Tale «Su Anasy» (Water Mother) & Legend of Shurale",
    "region": "Tatarstan (Volga)",
    "category": "Fairy Tales & Cartoons",
    "synopsis": "Classic Tatar tales by Gabdulla Tuqay about the cunning forest warden Shurale and the river enchantress Su Anasy with her golden hair comb.",
    "moral": "Respect for nature's elements, honesty, and victory of quick wit over fear.",
    "characters": [
      "Shurale",
      "Su Anasy",
      "Woodcutter Byltyr",
      "Boy"
    ],
    "museumSource": "Gabdulla Tuqay Literary Museum (Kazan)"
  },
  "sirin": {
    "title": "Tale of the Tsar-Maiden Ring & The Bird of Happiness Sirin",
    "region": "Pomorye (White Sea)",
    "category": "Northern Maritime Tales",
    "synopsis": "Ancient Pomor tale of a treasured heirloom ring, the carved pine Bird of Happiness, and sea navigators braving the freezing Arctic Ocean.",
    "moral": "Unwavering loyalty to one's word, indomitable courage, and hope amidst icy tempests.",
    "characters": [
      "Sirin",
      "Tsar-Maiden",
      "Pomor Navigator"
    ],
    "museumSource": "Malye Korely Open-Air Museum of Wooden Architecture"
  },
  "dzhangar": {
    "title": "Kalmyk Heroic Epic «Dzhangar»",
    "region": "Kalmykia (Steppes)",
    "category": "Heroic Epics",
    "synopsis": "Monumental epic describing the utopian land of Bumba where age and death are unknown, defended by twelve champion knights led by Khan Dzhangar.",
    "moral": "Selfless dedication to one's people, fidelity in brotherhood, and defense of the homeland.",
    "characters": [
      "Khan Dzhangar",
      "Khongor Scarlet Sword",
      "Knight Savar"
    ],
    "museumSource": "National Museum of the Republic of Kalmykia named after N.N. Palmov"
  },
  "geser": {
    "title": "Tale «Altan Khaisha» (Golden Scissors) & Epic «Geser»",
    "region": "Buryatia & Baikal",
    "category": "Heroic Epics",
    "synopsis": "Buryat folk wisdom of the enchanted golden scissors «Altan Khaisha» and celestial deeds of warrior Abai Geser vanquishing chaotic demons.",
    "moral": "Triumph of higher cosmic justice, modesty, and purity of heart.",
    "characters": [
      "Abai Geser",
      "Wise Maiden",
      "Demon Khan"
    ],
    "museumSource": "National Museum of the Republic of Buryatia (Ulan-Ude)"
  },
  "geakchaval": {
    "title": "Evenk Epic: «Geakchaval — Hunter of the White Ice»",
    "region": "Evenkia & Chukotka",
    "category": "Northern Legends",
    "synopsis": "Saga of Arctic hunter Geakchaval, single combat with the great polar bear, and the ancestral covenant to protect the fragile tundra.",
    "moral": "Harmonious co-existence of humans with arctic elements and reverence for clan elders.",
    "characters": [
      "Geakchaval",
      "Lord of Hummocks",
      "Clan Shaman"
    ],
    "museumSource": "Museum of the Arctic and Antarctic (Saint Petersburg)"
  },
  "kuigorozh": {
    "title": "«Mountain of Gems: The Tale of the Kuigorozh»",
    "region": "Mordovia (Moksha)",
    "category": "Folk Tales",
    "synopsis": "Instructive tale of the miraculous creature Kuigorozh who bestows boundless fortune only upon those who practice honest labor and moderation.",
    "moral": "A warning against blind greed: authentic happiness is built only through purposeful creation.",
    "characters": [
      "Kuigorozh",
      "Elder Pyataka",
      "Old Woman"
    ],
    "museumSource": "Mordovian Republican Museum of Local Lore"
  },
  "bayanay": {
    "title": "Blessing of Bayanay & The Olonkho Epic",
    "region": "Yakutia (Sakha)",
    "category": "Cosmology & Spirits",
    "synopsis": "Yakut epic of the benevolent forest spirit Bayanay and the birth of the Middle World from the roots of the sacred tree Aal Luuk Mas.",
    "moral": "Sacred ecological equilibrium uniting mankind and the living wilderness.",
    "characters": [
      "Bayanay",
      "Hunter Bergen",
      "Aiyy Deities"
    ],
    "museumSource": "Mammoth and Ethnography Museum of NEFU (Yakutsk)"
  },
  "narty": {
    "title": "Saga of the Narts & Celestial Blacksmith Tlepsh",
    "region": "Caucasus (Dagestan)",
    "category": "Heroic Epics",
    "synopsis": "Ancient legend recounting the birth of invincible warrior Sasrykwa, wise mother of the Narts Satana, and the enchanted forge of Tlepsh.",
    "moral": "Devotion to one's native mountains, reverence for ancestors, and the sanctity of oaths.",
    "characters": [
      "Satana",
      "Sasrykwa",
      "Blacksmith Tlepsh"
    ],
    "museumSource": "North Caucasus Branch of the State Museum of the East"
  }
};

  const RELICS_DATABASE_EN = {
  "tatarstan": {
    "name": "Kazan Tulip",
    "reg": "Tatarstan"
  },
  "kamchatka": {
    "name": "Raven Kutkh",
    "reg": "Kamchatka"
  },
  "pomorye": {
    "name": "Bird of Happiness",
    "reg": "Pomorye"
  },
  "altai": {
    "name": "Pazyryk Sphinx",
    "reg": "Altai"
  },
  "yakutia": {
    "name": "Silver Choron",
    "reg": "Yakutia"
  },
  "kazakhstan": {
    "name": "Koshkar Ornament",
    "reg": "Kazakhstan"
  },
  "uzbekistan": {
    "name": "Khiva Pomegranate",
    "reg": "Uzbekistan"
  },
  "caucasus": {
    "name": "Kubachi Muchal",
    "reg": "Caucasus"
  }
};

  const STRATIGRAPHY_EN = {
  "0.4": "0.4 mm · Superficial organic oxide patina (Restored)",
  "1.2": "1.2 mm · Micro-amalgam fire gilding layer (Au 84.6%)",
  "2.6": "2.6 mm · Chased sterling silver plate substrate (Ag 875°)",
  "3.8": "3.8 mm · High-density embossed copper-alloy core",
  "5.0": "5.0 mm · Supporting base mounting pins & solder joint"
};

  let currentLang = 'ru';
  try {
    const saved = localStorage.getItem('artefact_lang');
    if (saved === 'en' || saved === 'ru') {
      currentLang = saved;
    }
  } catch (e) {}

  function getLang() {
    return currentLang;
  }

  function t(key, fallback) {
    if (UI[key] && UI[key][currentLang]) {
      return UI[key][currentLang];
    }
    return fallback !== undefined ? fallback : key;
  }

  function getEthnoData(id, defaultDatabase) {
    const base = defaultDatabase ? defaultDatabase[id] : null;
    if (!base) return null;
    if (currentLang === 'en' && ETHNO_DATABASE_EN[id]) {
      return Object.assign({}, base, ETHNO_DATABASE_EN[id]);
    }
    return base;
  }

  function getRestorerData(id, defaultDatabase) {
    const base = defaultDatabase ? defaultDatabase[id] : null;
    if (!base) return null;
    if (currentLang === 'en' && AI_RESTORER_DATABASE_EN[id]) {
      const en = AI_RESTORER_DATABASE_EN[id];
      const merged = Object.assign({}, base, en);
      if (en.spectralLayers && base.spectralLayers) {
        merged.spectralLayers = Object.assign({}, base.spectralLayers, en.spectralLayers);
      }
      if (en.hotspots && base.hotspots) {
        merged.hotspots = base.hotspots.map((h, i) => {
          return en.hotspots[i] ? Object.assign({}, h, en.hotspots[i]) : h;
        });
      }
      return merged;
    }
    return base;
  }

  function getPetroData(id, defaultDatabase) {
    const base = defaultDatabase ? defaultDatabase[id] : null;
    if (!base) return null;
    if (currentLang === 'en' && PETROGLYPHS_DATABASE_EN[id]) {
      const en = PETROGLYPHS_DATABASE_EN[id];
      const merged = Object.assign({}, base, en);
      if (en.motifs && base.motifs) {
        merged.motifs = base.motifs.map((m, i) => {
          return en.motifs[i] ? Object.assign({}, m, en.motifs[i]) : m;
        });
      }
      return merged;
    }
    return base;
  }

  function getFolkloreList(defaultList) {
    if (!defaultList) return [];
    if (currentLang === 'en') {
      return defaultList.map(item => {
        const en = FOLKLORE_ANTHOLOGY_EN[item.id];
        return en ? Object.assign({}, item, en) : item;
      });
    }
    return defaultList;
  }

  function getRelicInfo(id, defaultRelic) {
    if (currentLang === 'en' && RELICS_DATABASE_EN[id]) {
      return Object.assign({}, defaultRelic, RELICS_DATABASE_EN[id]);
    }
    return defaultRelic;
  }

  function getStratigraphyDepth(depth, defaultText) {
    if (currentLang === 'en' && STRATIGRAPHY_EN[depth]) {
      return STRATIGRAPHY_EN[depth];
    }
    return defaultText;
  }

  function setLanguage(lang) {
    if (lang !== 'ru' && lang !== 'en') return;
    currentLang = lang;
    try {
      localStorage.setItem('artefact_lang', lang);
    } catch (e) {}

    document.documentElement.lang = lang;

    // Обновляем все элементы с data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key, null);
      if (val !== null) {
        el.innerHTML = val;
      }
    });

    // Обновляем атрибуты с data-i18n-ph (placeholder)
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      const val = t(key, null);
      if (val !== null) {
        el.placeholder = val;
      }
    });

    // Обновляем атрибуты с data-i18n-aria
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      const val = t(key, null);
      if (val !== null) {
        el.setAttribute('aria-label', val);
      }
    });

    // Обновляем заголовок документа
    document.title = (lang === 'en')
      ? 'ARTEFACT — History Leaves a Trace | Digital Ethnographic Museum'
      : 'АРТЕФАКТ — История оставляет след | Цифровой этнографический музей';

    // Обновляем кнопки переключения в хедере и дровере
    const langBtnLbl = document.getElementById('langLabelText');
    if (langBtnLbl) {
      langBtnLbl.textContent = (lang === 'ru') ? 'EN' : 'RU';
    }
    const drawerLangLbl = document.getElementById('mobileDrawerLangLabel');
    if (drawerLangLbl) {
      drawerLangLbl.textContent = (lang === 'ru') ? 'Language: English (EN)' : 'Язык: Русский (RU)';
    }

    // Триггерим событие смены языка для динамических модулей
    window.dispatchEvent(new CustomEvent('artefact:languageChanged', { detail: { lang: lang } }));
  }

  function toggleLanguage() {
    const nextLang = (currentLang === 'ru') ? 'en' : 'ru';
    setLanguage(nextLang);
    return nextLang;
  }

  root.I18N = {
    getLang: getLang,
    setLanguage: setLanguage,
    toggleLanguage: toggleLanguage,
    t: t,
    getEthnoData: getEthnoData,
    getRestorerData: getRestorerData,
    getPetroData: getPetroData,
    getFolkloreList: getFolkloreList,
    getRelicInfo: getRelicInfo,
    getStratigraphyDepth: getStratigraphyDepth,
    UI: UI,
    ETHNO_DATABASE_EN: ETHNO_DATABASE_EN,
    AI_RESTORER_DATABASE_EN: AI_RESTORER_DATABASE_EN,
    PETROGLYPHS_DATABASE_EN: PETROGLYPHS_DATABASE_EN,
    FOLKLORE_ANTHOLOGY_EN: FOLKLORE_ANTHOLOGY_EN,
    RELICS_DATABASE_EN: RELICS_DATABASE_EN
  };

})(typeof window !== 'undefined' ? window : this);
