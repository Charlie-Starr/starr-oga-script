// ==UserScript==
// @name          Starr (User API Key Edition) - Modified
// @namespace     http://tampermonkey.net/
// @version       6.2.1
// @description   Starr: A real human woman. Seductive, witty, naughty, cheeky, flirty. Now powered by your own OpenRouter API Key. Cone ID access, animated UI, notifications & dark mode.
// @match         *://*/*
// @downloadURL   https://starr-oga-script-m0k7ikznt-lifted-charlies-projects.vercel.app/starr-oga-script.js
// @updateURL     https://starr-oga-script-m0k7ikznt-lifted-charlies-projects.vercel.app/starr-oga-script.js
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_notification
// @grant         GM_xmlhttpRequest
// @grant         GM_setClipboard
// @connect       *
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURATION ---
    const VERCEL_FUNCTION_URL = 'https://starr-oga-script-m0k7ikznt-lifted-charlies-projects.vercel.app/api/starr';

    // CSS Selectors for the dating site's input text area where you type replies
    const REPLY_INPUT_SELECTOR = '#reply-textarea';

    // CSS Selector for the CONE ID displayed on the UI
    const CONE_ID_UI_SELECTOR = '#app > main > div.flex-shrink-1 > nav > div:nth-child(3) > div > div.col-auto.navbar-text.fw-bold';

    // CSS Selectors for getting all customer messages for context
    const ALL_CUSTOMER_MESSAGES_SELECTOR = 'p[style="word-wrap: break-word"]';

    // Dynamic Customer Info Selectors
    const CUSTOMER_INFO_SELECTORS = {
        location: 'h6.text-black-50.mb-1',
        age: 'td.p-1.ps-3:not(.bg-light-subtle)',
        status: 'td.p-1.ps-3.bg-light-subtle',
        gender: null,
        localTime: '#memberTime',
        aboutUser: '#about-user'
    };

    // PI Detection (Client-Side)
    const PI_DETECTION_CONFIG = {
        soundUrl: 'https://charlie-starr.github.io/starr-sound-assets/mixkit-elevator-tone-2863.wav',
        regex: {
            'Phone Number': /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g,
            'Email': /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            'Socials': /(@[a-zA-Z0-9_]{4,})/g,
            'Name': /my name is\s+([A-Z][a-z]+)/ig,
        }
    };

    // Cinematic Timer Warnings Configuration
    const TIMER_WARNING_CONFIG = {
        selector: '#timeoutTimer',
        sounds: {
            warning: 'https://charlie-starr.github.io/starr-sound-assets/mixkit-classic-alarm-995.wav',
            emergency: 'https://charlie-starr.github.io/starr-sound-assets/mixkit-facility-alarm-sound-999.wav'
        }
    };
    
    // Violation Sound URL
    const VIOLATION_SOUND_URL = 'https://charlie-starr.github.io/starr-sound-assets/mixkit-interface-option-select-2573.wav';

    // Theme Auto-Switch Configuration
    const AUTO_THEME_MAP = {
        night: 'theme-midnight',
        morning: 'bubblegum',
        afternoon: 'theme-valentine',
        evening: 'theme-halloween'
    };
    // --- END CONFIGURATION ---

    let isAuthorized = false;
    let storedUserConeId = null;
    let waitingForUiDetectionAndMessage = false;
    let accessDeniedPermanent = false;
    let isAutoThemeEnabled = false;
    let textUnderScrutiny = '';
    let isScrutinyEnabled = true;
    let isUIPopulated = false;
    let isTimerWarningEnabled = true;
    let isAudioUnlocked = false;

    // --- UI & STYLES ---
    const style = document.createElement("style");
    style.textContent = `
        /* Base styles for the popup and its elements */
        #starr-button {
            position: fixed; bottom: 20px; right: 20px;
            background: linear-gradient(135deg, #ff66cc 0%, #cc66ff 100%);
            color: white; padding: 12px 20px; font-size: 16px; font-weight: bold;
            border: none; border-radius: 30px; cursor: pointer; z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); display: block;
        }
        #starr-popup {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 840px; max-height: 90vh; background: var(--starr-popup-background);
            border: 2px solid var(--starr-border-color); border-radius: 20px; padding: 20px;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); z-index: 10001; display: none !important;
            flex-direction: column; font-family: Arial, sans-serif; overflow-y: auto; /* FIX: Allow vertical scrolling */
            justify-content: space-between; color: var(--starr-text-color);
            transition: background-color 0.5s ease, border-color 0.5s ease, color 0.5s ease;
        }
        /* ✅ NEW: Minimize Button */
        #starr-minimize-button {
            position: absolute;
            top: 15px;
            right: 15px;
            background: #e0e0e0;
            color: #555;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            font-size: 20px;
            font-weight: bold;
            line-height: 24px;
            text-align: center;
            cursor: pointer;
            z-index: 10002;
            transition: transform 0.2s ease, background-color 0.2s ease;
        }
        #starr-minimize-button:hover {
            transform: scale(1.1);
            background-color: #d0d0d0;
        }
        .dark-mode #starr-minimize-button {
            background: #5a5a5a;
            color: #e0e0e0;
        }
        .dark-mode #starr-minimize-button:hover {
            background-color: #6a6a6a;
        }
        .starr-reply.selected-reply {
            border-color: var(--starr-send-button-bg);
            box-shadow: 0 0 5px var(--starr-send-button-bg);
        }
        .starr-reply.checking {
            opacity: 0.6; cursor: wait; position: relative;
        }
        .starr-reply.checking::after {
            content: '🧐'; position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%); font-size: 24px; animation: pulse 1s infinite;
        }
        @keyframes pulse {
            0% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.2); }
            100% { transform: translate(-50%, -50%) scale(1); }
        }
        /* Styles for Summary Box and PI Scan Button */
        #summary-and-pi-wrapper { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        #summary-and-pi-wrapper #starr-summary-container { flex-grow: 1; margin-bottom: 0; }
        #starr-summary-container { display: none; align-items: center; gap: 10px; margin-bottom: 10px; }
        #starr-summary-box {
            flex-grow: 1; padding: 8px; background-color: #f0f0f0; border-left: 3px solid #ccc;
            font-style: italic; color: #555; font-size: 0.9em; border-radius: 4px;
        }
        .dark-mode #starr-summary-box { background-color: #3a3a3a; border-left-color: #555; color: #ccc; }
        #starr-pi-scan-button {
            background: var(--starr-regenerate-button-bg); color: white; border: none;
            border-radius: 50%; width: 36px; height: 36px; font-size: 18px; cursor: pointer;
            flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 0;
            transition: transform 0.2s ease, background-color 0.3s ease;
        }
        #starr-pi-scan-button:hover { transform: scale(1.1) rotate(90deg); }
        #starr-pi-scan-button:disabled { cursor: not-allowed; filter: brightness(0.7); }
        #starr-input-container { display: flex; align-items: center; gap: 10px; }
        /* Styles for Spicy Regeneration Dropdown */
        .spicy-regen-dropdown { position: relative; display: inline-block; }
        .spicy-regen-dropdown-content {
            display: none; position: absolute; bottom: 100%; right: 0;
            background-color: var(--starr-popup-background); min-width: 160px;
            box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2); z-index: 10002;
            border-radius: 4px; border: 1px solid var(--starr-border-color); overflow: hidden;
        }
        .spicy-regen-dropdown-content a { color: var(--starr-text-color); padding: 12px 16px; text-decoration: none; display: block; text-align: left; }
        .spicy-regen-dropdown-content a:hover { background-color: var(--starr-reply-background); }
        #starr-popup h3 {
            font-family: 'Georgia', serif; font-size: 26px; color: var(--starr-header-color);
            text-align: center; margin-bottom: 20px; padding-bottom: 10px;
            border-bottom: 2px solid var(--starr-header-border); background: var(--starr-header-background);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            transition: color 0.3s ease, border-color 0.3s ease, all 0.5s ease;
        }
        #starr-input, #cone-id-input {
            width: 100%; padding: 10px; margin-top: 10px; border-radius: 8px;
            border: 1px solid var(--starr-input-border); resize: vertical; min-height: 80px;
            font-size: 14px; margin-bottom: 15px; box-sizing: border-box; order: 1;
            background-color: var(--starr-input-background); color: var(--starr-input-text);
            transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
        }
        #starr-input { flex-grow: 1; }
        #cone-id-input { min-height: unset; }
        .starr-replies {
            margin-top: 0; display: flex; flex-direction: column; gap: 12px; width: 100%;
            flex-grow: 1; overflow-y: auto; padding-right: 5px; order: 2;
        }
        .starr-reply {
            background: var(--starr-reply-background); padding: 12px; border-radius: 12px;
            border: 1px solid var(--starr-reply-border); color: var(--starr-reply-text);
            white-space: pre-wrap; position: relative; font-size: 14px; cursor: pointer;
            transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, opacity 0.3s ease;
        }
        #starr-buttons {
            display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
            margin-top: 15px; width: 100%; gap: 5px; order: 3;
        }
        #starr-send, #starr-close, #starr-regenerate, #starr-force-key, #submit-cone-id, #starr-settings-button, .theme-button, .spicy-regen-main-button {
            padding: 8px 12px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer;
            flex-grow: 1; flex-shrink: 1; flex-basis: auto; min-width: 70px; max-width: 100px;
            text-align: center; font-size: 12px;
            transition: background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
        }
        .spicy-regen-main-button { max-width: 40px; min-width: 40px; padding: 8px 0; }
        #starr-send {
            background: var(--starr-send-button-bg); color: white; position: relative; overflow: hidden;
        }
        #starr-send.glow::before {
            content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
            background: radial-gradient(circle, var(--starr-send-button-glow-color) 0%, transparent 70%);
            animation: heatGlow 1.5s infinite alternate; z-index: 0; opacity: 0.7;
        }
        @keyframes heatGlow { 0% { transform: scale(0.8); opacity: 0.7; } 100% { transform: scale(1.2); opacity: 1; } }
        #starr-close { background: var(--starr-close-button-bg); color: var(--starr-close-button-text); }
        #starr-regenerate, .spicy-regen-main-button { background: var(--starr-regenerate-button-bg); color: white; }
        #starr-force-key { background: var(--starr-force-key-button-bg); color: white; }
        #submit-cone-id { background: var(--starr-submit-cone-id-button-bg); color: white; }
        /* Loading animation */
        .starr-loading {
            text-align: center; margin-top: 15px; font-size: 30px; color: var(--starr-loading-color);
            height: 40px; display: flex; justify-content: center; align-items: center; gap: 5px; order: 4;
            transition: color 0.3s ease;
        }
        .starr-loading .emoji { display: inline-block; animation: bounceEmoji 1s infinite alternate; }
        .starr-loading .emoji:nth-child(2) { animation-delay: 0.2s; }
        .starr-loading .emoji:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounceEmoji { from { transform: translateY(0); } to { transform: translateY(-5px); } }
        /* PI Editor Popup Styles */
        #starr-pi-editor-popup {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 450px; background: var(--starr-popup-background); border: 2px solid var(--starr-border-color);
            border-radius: 15px; padding: 20px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10003; display: none; flex-direction: column; gap: 10px; color: var(--starr-text-color);
            max-height: 80vh;
        }
        #starr-pi-editor-popup h4 { text-align: center; margin: 0 0 5px 0; color: var(--starr-header-color); }
        #starr-pi-editor-popup p { text-align: center; margin: 0 0 10px 0; font-size: 14px; }
        #starr-pi-editor-list {
            flex-grow: 1; overflow-y: auto; margin-bottom: 10px; display: flex;
            flex-direction: column; gap: 5px; padding-right: 5px;
        }
        .starr-pi-item { display: flex; align-items: center; gap: 8px; }
        .starr-pi-item input[type="checkbox"] { flex-shrink: 0; width: 16px; height: 16px; }
        .starr-pi-item input[type="text"] {
            flex-grow: 1; border: 1px solid var(--starr-input-border);
            background-color: var(--starr-input-background); color: var(--starr-input-text);
            padding: 4px; border-radius: 4px; font-size: 14px;
        }
        .pi-editor-buttons { display: flex; justify-content: flex-end; gap: 10px; margin-top: 5px; }
        .pi-editor-buttons button {
            padding: 8px 15px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer;
            transition: background-color 0.3s ease, color 0.3s ease, content 0.3s ease;
        }
        #starr-pi-log-close { background: var(--starr-send-button-bg); color: white; }
        #starr-pi-close { background: var(--starr-close-button-bg); color: var(--starr-close-button-text); }
        /* ✅ NEW: Violation Warning Popup */
        #starr-violation-warning-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 10003;
            display: none; justify-content: center; align-items: center;
        }
        #starr-violation-warning {
            width: 400px; background: #fff; border: 3px solid #d32f2f;
            border-radius: 15px; padding: 25px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
            display: flex; flex-direction: column; align-items: center; text-align: center;
            font-family: Arial, sans-serif;
        }
        .dark-mode #starr-violation-warning { background: #3c2f2f; border-color: #ff5252; color: #f2f2f2; }
        #violation-title { font-size: 24px; color: #d32f2f; margin: 0 0 10px 0; font-weight: bold; }
        .dark-mode #violation-title { color: #ff5252; }
        #violation-reason { font-size: 15px; margin: 0 0 20px 0; line-height: 1.4; }
        #violation-buttons { display: flex; justify-content: center; gap: 15px; width: 100%; }
        #violation-buttons button {
            padding: 10px 20px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer;
            font-size: 14px; transition: transform 0.2s ease;
        }
        #violation-buttons button:hover { transform: scale(1.05); }
        #violation-edit-anyway { background: #ffc107; color: #000; }
        #violation-regenerate { background: #4caf50; color: #fff; }
        /* Theme Variables & Themes */
        :root {
            --starr-popup-background: #ffffff; --starr-border-color: #ff66cc;
            --starr-header-color: #d10082; --starr-header-border: #ff99cc;
            --starr-header-background: linear-gradient(45deg, #f0e6f5, #ffe6f2);
            --starr-input-border: #ff99cc; --starr-input-background: #ffffff; --starr-input-text: #333333;
            --starr-reply-background: #ffe6f2; --starr-reply-border: #ff99cc; --starr-reply-text: #b10082;
            --starr-send-button-bg: #cc66ff; --starr-send-button-glow-color: #ff3399;
            --starr-close-button-bg: #ffd6f5; --starr-close-button-text: #b10082;
            --starr-regenerate-button-bg: #66ccff; --starr-force-key-button-bg: #ff5e5e;
            --starr-submit-cone-id-button-bg: #cc66ff; --starr-loading-color: #ff66cc;
            --starr-auth-message-color: red; --starr-waiting-message-color: #d10082;
            --starr-settings-button-bg: #8844ee; --starr-settings-button-text: white;
            --starr-settings-panel-background: #f8f8f8; --starr-settings-panel-border: #cccccc;
        }
        .dark-mode {
            --starr-popup-background: #2b2b2b; --starr-border-color: #6a0572;
            --starr-header-color: #e0b0ff; --starr-header-border: #a13d99;
            --starr-header-background: linear-gradient(45deg, #3a1c71, #4c268a);
            --starr-input-border: #a13d99; --starr-input-background: #3a3a3a; --starr-input-text: #e0e0e0;
            --starr-reply-background: #4a4a4a; --starr-reply-border: #6a0572; --starr-reply-text: #e0b0ff;
            --starr-send-button-bg: #7f00ff; --starr-send-button-glow-color: #e0b0ff;
            --starr-close-button-bg: #5a1c8f; --starr-close-button-text: #e0b0ff;
            --starr-regenerate-button-bg: #007bff; --starr-force-key-button-bg: #cc0000;
            --starr-submit-cone-id-button-bg: #7f00ff; --starr-loading-color: #e0b0ff;
            --starr-auth-message-color: #ff6666; --starr-waiting-message-color: #e0b0ff;
            --starr-settings-panel-background: #3a3a3a; --starr-settings-panel-border: #555555;
        }
        .theme-midnight {
            --starr-popup-background: #1a1a2e; --starr-border-color: #0f3460;
            --starr-header-color: #e0f2f7; --starr-header-border: #2e6099;
            --starr-header-background: linear-gradient(45deg, #0f3460, #16213e);
            --starr-input-border: #2e6099; --starr-input-background: #0f3460; --starr-input-text: #e0f2f7;
            --starr-reply-background: #2e6099; --starr-reply-border: #0f3460; --starr-reply-text: #e0f2f7;
            --starr-send-button-bg: #007bff; --starr-send-button-glow-color: #6495ed;
            --starr-close-button-bg: #16213e; --starr-close-button-text: #e0f2f7;
            --starr-regenerate-button-bg: #00bcd4; --starr-force-key-button-bg: #dc3545;
            --starr-submit-cone-id-button-bg: #007bff; --starr-loading-color: #6495ed;
            --starr-settings-panel-background: #16213e; --starr-settings-panel-border: #0f3460;
        }
        .theme-halloween {
            --starr-popup-background: #1a1a1a; --starr-border-color: #8b0000;
            --starr-header-color: #ff4500; --starr-header-border: #cc0000;
            --starr-header-background: linear-gradient(45deg, #330000, #440000);
            --starr-input-border: #cc0000; --starr-input-background: #330000; --starr-input-text: #ff8c00;
            --starr-reply-background: #440000; --starr-reply-border: #8b0000; --starr-reply-text: #ff4500;
            --starr-send-button-bg: #ff4500; --starr-send-button-glow-color: #ffa500;
            --starr-close-button-bg: #660000; --starr-close-button-text: #ff8c00;
            --starr-regenerate-button-bg: #4b0082; --starr-force-key-button-bg: #8b0000;
            --starr-submit-cone-id-button-bg: #ff4500; --starr-loading-color: #ffa500;
            --starr-settings-panel-background: #333333; --starr-settings-panel-border: #444444;
        }
        .theme-valentine {
            --starr-popup-background: #ffe6f2; --starr-border-color: #e04482;
            --starr-header-color: #a02040; --starr-header-border: #ff69b4;
            --starr-header-background: linear-gradient(45deg, #ffc0cb, #ffb6c1);
            --starr-input-border: #ff69b4; --starr-input-background: #ffffff; --starr-input-text: #333333;
            --starr-reply-background: #fbc2eb; --starr-reply-border: #e04482; --starr-reply-text: #a02040;
            --starr-send-button-bg: #ff1493; --starr-send-button-glow-color: #ff69b4;
            --starr-close-button-bg: #f7a2d6; --starr-close-button-text: #a02040;
            --starr-regenerate-button-bg: #b364e7; --starr-force-key-button-bg: #cc3333;
            --starr-submit-cone-id-button-bg: #ff1493; --starr-loading-color: #ff69b4;
            --starr-settings-panel-background: #fff0f5; --starr-settings-panel-border: #e04482;
        }
        /* ✅ NEW: Timer Warning Themes */
        .theme-warning-orange {
            --starr-popup-background: #3d2c20; --starr-border-color: #ff8c00;
            --starr-header-color: #ffae42; --starr-header-border: #e67e22;
            --starr-header-background: linear-gradient(45deg, #4d3625, #5a3f2a);
            --starr-input-border: #e67e22; --starr-input-background: #4d3625; --starr-input-text: #ffd3a1;
            --starr-reply-background: #5a3f2a; --starr-reply-border: #ff8c00; --starr-reply-text: #ffae42;
            --starr-send-button-bg: #ff8c00; --starr-send-button-glow-color: #ffa500;
            --starr-close-button-bg: #6b4b32; --starr-close-button-text: #ffae42;
            --starr-regenerate-button-bg: #e67e22;
        }
        .theme-warning-orange #starr-popup { animation: pulseGlowOrange 2s infinite alternate; }
        .theme-warning-orange #starr-popup h3 { animation: blinkOrangeText 1.5s infinite; }
        @keyframes pulseGlowOrange {
            from { box-shadow: 0 0 15px rgba(255, 140, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.2); }
            to { box-shadow: 0 0 30px rgba(255, 165, 0, 0.8), 0 8px 20px rgba(0, 0, 0, 0.2); }
        }
        @keyframes blinkOrangeText { 50% { opacity: 0.6; } }
        .theme-emergency-red {
            --starr-popup-background: #3b1e1e; --starr-border-color: #ff1111;
            --starr-header-color: #ff4f4f; --starr-header-border: #cc0000;
            --starr-header-background: linear-gradient(45deg, #4b2323, #5a2a2a);
            --starr-input-border: #cc0000; --starr-input-background: #4b2323; --starr-input-text: #ffc2c2;
            --starr-reply-background: #5a2a2a; --starr-reply-border: #ff1111; --starr-reply-text: #ff4f4f;
            --starr-send-button-bg: #ff1111; --starr-send-button-glow-color: #ff4f4f;
            --starr-close-button-bg: #6a3131; --starr-close-button-text: #ff4f4f;
            --starr-regenerate-button-bg: #cc0000;
        }
        .theme-emergency-red #starr-popup { border-width: 3px; animation: blinkRedBorder 1s infinite; }
        .theme-emergency-red #starr-popup h3 { animation: blinkRedText 1s infinite; }
        @keyframes blinkRedBorder { 50% { border-color: #990000; } }
        @keyframes blinkRedText { 50% { color: #cc0000; -webkit-text-fill-color: #cc0000; } }

        /* Settings Panel */
        #starr-settings-panel {
            display: none; flex-direction: column; gap: 10px; margin-top: 15px; padding: 15px;
            border: 1px solid var(--starr-settings-panel-border); border-radius: 10px;
            background-color: var(--starr-settings-panel-background);
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        #starr-settings-panel label { display: flex; align-items: center; gap: 8px; color: var(--starr-text-color); }
        #starr-settings-panel input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
        .theme-buttons-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
        .theme-button {
            background-color: var(--starr-settings-button-bg); color: var(--starr-settings-button-text);
            padding: 6px 10px; flex-grow: 0; min-width: unset; max-width: unset;
        }
        /* ✅ REVISED: Mobile UI Styles */
        .ui-portrait #starr-popup {
            width: 95vw !important;
            max-width: 380px !important; /* Trimmed width */
            max-height: 85vh;
            flex-direction: column;
        }
        .ui-portrait #chat-section {
             min-height: 0;
             flex-shrink: 1;
        }
        .ui-portrait #starr-popup h3 {
            font-size: 22px;
            margin-bottom: 10px;
        }
        .ui-portrait #starr-input {
            min-height: 60px;
            margin-bottom: 10px;
        }
        .ui-portrait #starr-buttons {
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
            margin-top: 10px;
        }
        /* ✅ NEW: Icon Buttons for Mobile */
        .ui-portrait #starr-buttons button, .ui-portrait #starr-buttons .spicy-regen-main-button {
            font-size: 18px !important;
            padding: 8px !important;
            border-radius: 50% !important;
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            max-width: 40px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-grow: 0 !important;
            flex-basis: auto !important;
        }
        .ui-portrait #spicy-regen-container {
             flex-basis: auto;
        }
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "starr-button";
    button.textContent = "Flirt with Starr 🥰";
    document.body.appendChild(button);

    const popup = document.createElement("div");
    popup.id = "starr-popup";
    popup.innerHTML = `
        <button id="starr-minimize-button" title="Minimize (Ctrl+M)">−</button>
        <h3 id="starr-header">Talk to Starr, baby💦...</h3>
        <div id="auth-section">
            <p>Please enter your CONE ID to access Starr:</p>
            <input type="text" id="cone-id-input" placeholder="Enter CONE ID" style="width: 100%; padding: 8px; margin-bottom: 10px; border-radius: 5px; border: 1px solid #ccc;">
            <button id="submit-cone-id">Submit</button>
            <p id="auth-message" style="color: var(--starr-auth-message-color); margin-top: 10px;"></p>
        </div>
        <div id="waiting-message" style="display: none; text-align: center; color: var(--starr-waiting-message-color); font-weight: bold; margin-top: 15px;"></div>
        <div id="chat-section" style="display: none; flex-direction: column; height: 100%;">
            <div id="summary-and-pi-wrapper">
                <div id="starr-summary-container">
                    <div id="starr-summary-box"></div>
                </div>
                <button id="starr-pi-scan-button" title="Intelligently scan for personal info (Tab)">♻️</button>
            </div>
            <textarea id="starr-input" placeholder="Tell Starr something juicy..."></textarea>
            <div class="starr-replies" id="starr-responses"></div>
            <div id="starr-loading" class="starr-loading" style="display: none;">
                <span class="emoji">😘</span><span class="emoji">🥰</span><span class="emoji">💋</span>
            </div>
            <div id="starr-buttons">
                <button id="starr-send" title="Send (Ctrl+Enter)">📤</button>
                <button id="starr-regenerate" title="Regenerate (Ctrl+R)">🔄</button>
                <div id="spicy-regen-container"></div>
                <button id="starr-force-key" title="Force New API Key (Ctrl+K)">🔑</button>
                <button id="starr-settings-button" title="Settings (T)">⚙️</button>
                <button id="starr-close" title="Close (Esc)">❌</button>
            </div>
            <div id="starr-settings-panel">
                <h4>UI Settings</h4>
                <label> <input type="checkbox" id="dark-mode-toggle"> Dark Mode </label>
                <label> <input type="checkbox" id="auto-theme-toggle"> Auto Theme by Time </label>
                <label> <input type="checkbox" id="timer-warning-toggle" checked> Cinematic Timer Alerts </label>
                <label> <input type="checkbox" id="pi-scan-toggle" checked> Show PI Scan Button </label>
                <label> <input type="checkbox" id="summary-toggle" checked> Enable Summary for Long Messages </label>
                <label> <input type="checkbox" id="send-button-glow-toggle" checked> Send Button Glow </label>
                <label> <input type="checkbox" id="voice-reply-toggle" checked> Voice Reply Mode </label>
                <label> <input type="checkbox" id="scrutiny-toggle" checked> Enable Violation Checker </label>
                <div class="engine-switcher" style="margin-top: 10px;">
                    <h5 style="margin-bottom: 5px; font-size: 1em;">Response Style Engine:</h5>
                    <select id="starr-engine-select" style="width: 100%; padding: 5px; border-radius: 4px; border: 1px solid var(--starr-input-border); background-color: var(--starr-input-background); color: var(--starr-input-text);">
                        <option value="zephyr">Zephyr (Recommended)</option>
                        <option value="aurora">Aurora</option>
                        <option value="velora">Velora</option>
                    </select>
                </div>
                <div class="theme-switcher" style="margin-top: 10px;">
                    <h5>Theme:</h5>
                    <div class="theme-buttons-container">
                        <button class="theme-button" data-theme="bubblegum">Bubblegum</button>
                        <button class="theme-button" data-theme="midnight">Midnight</button>
                        <button class="theme-button" data-theme="halloween">Halloween</button>
                        <button class="theme-button" data-theme="valentine">Valentine</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    const piEditorPopup = document.createElement("div");
    piEditorPopup.id = "starr-pi-editor-popup";
    piEditorPopup.innerHTML = `
        <h4>Detected Personal Info</h4>
        <p>Check items to log. You can also edit the text.</p>
        <div id="starr-pi-editor-list"></div>
        <div class="pi-editor-buttons">
            <button id="starr-pi-log-close">Log Checked & Close</button>
            <button id="starr-pi-close">Close</button>
        </div>
    `;
    document.body.appendChild(piEditorPopup);

    const violationWarningOverlay = document.createElement("div");
    violationWarningOverlay.id = "starr-violation-warning-overlay";
    violationWarningOverlay.innerHTML = `
        <div id="starr-violation-warning">
            <div id="violation-title">⚠️ Rule Violation Detected!</div>
            <p id="violation-reason"></p>
            <div id="violation-buttons">
                <button id="violation-edit-anyway">Edit Anyway</button>
                <button id="violation-regenerate">Regenerate</button>
            </div>
        </div>
    `;
    document.body.appendChild(violationWarningOverlay);
    
    const warningSound = new Audio(TIMER_WARNING_CONFIG.sounds.warning);
    warningSound.loop = true;
    const emergencySound = new Audio(TIMER_WARNING_CONFIG.sounds.emergency);
    emergencySound.loop = true;
    const piSound = new Audio(PI_DETECTION_CONFIG.soundUrl);
    const violationSound = new Audio(VIOLATION_SOUND_URL);

    // --- Element Selectors ---
    const starrHeader = document.getElementById("starr-header");
    const starrResponses = document.getElementById("starr-responses");
    const starrInput = document.getElementById("starr-input");
    const starrLoading = document.getElementById("starr-loading");
    const authSection = document.getElementById("auth-section");
    const chatSection = document.getElementById("chat-section");
    const coneIdInput = document.getElementById("cone-id-input");
    const submitConeIdButton = document.getElementById("submit-cone-id");
    const authMessage = document.getElementById("auth-message");
    const waitingMessage = document.getElementById("waiting-message");
    const starrSettingsButton = document.getElementById("starr-settings-button");
    const starrSettingsPanel = document.getElementById("starr-settings-panel");
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    const autoThemeToggle = document.getElementById("auto-theme-toggle");
    const summaryToggle = document.getElementById("summary-toggle");
    const piScanToggle = document.getElementById("pi-scan-toggle");
    const summaryContainer = document.getElementById("starr-summary-container");
    const piScanButton = document.getElementById("starr-pi-scan-button");
    const sendButtonGlowToggle = document.getElementById("send-button-glow-toggle");
    const starrSendButton = document.getElementById("starr-send");
    const themeButtons = document.querySelectorAll(".theme-button");
    const voiceReplyToggle = document.getElementById("voice-reply-toggle");
    const piEditorList = document.getElementById('starr-pi-editor-list');
    const piLogCloseButton = document.getElementById('starr-pi-log-close');
    const piCloseButton = document.getElementById('starr-pi-close');
    const violationReason = document.getElementById('violation-reason');
    const violationEditButton = document.getElementById('violation-edit-anyway');
    const violationRegenerateButton = document.getElementById('violation-regenerate');
    const scrutinyToggle = document.getElementById('scrutiny-toggle');
    const minimizeButton = document.getElementById('starr-minimize-button');
    const timerWarningToggle = document.getElementById('timer-warning-toggle');
    const starrEngineSelect = document.getElementById('starr-engine-select');

    let conversationHistory = [];
    let lastProcessedMessage = '';
    let selectedReplyIndex = -1;

    // --- Core Logic Communication ---
    async function callVercelFunction(data) {
        data.apiKey = GM_getValue("starr_openrouter_api_key", null);

        const response = await new Promise((resolve, reject) => {
             GM_xmlhttpRequest({
                method: 'POST',
                url: VERCEL_FUNCTION_URL,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
                responseType: 'json',
                timeout: 60000,
                onload: (res) => resolve(res),
                onerror: (err) => reject(err),
                ontimeout: (err) => reject(err)
            });
        });

        if (response.status >= 400 || !response.response) {
            console.error("Starr Backend Error:", response);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.response;
    }

    // --- Data Gathering Functions ---
    function getLatestMessage() {
        const messageElements = document.querySelectorAll(ALL_CUSTOMER_MESSAGES_SELECTOR);
        if (messageElements.length > 0) {
            return messageElements[messageElements.length - 1].innerText.trim();
        }
        return '';
    }

    function getLoggedInConeId() {
        const coneIdElement = document.querySelector(CONE_ID_UI_SELECTOR);
        if (coneIdElement) {
            const coneIdText = coneIdElement.textContent.trim();
            const match = coneIdText.match(/(\w+)$/);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }

    function getPersonaInfo() {
        const nameElement = document.querySelector('h5.fw-bold.mb-1');
        const locationElement = document.querySelector('h6.text-black-50');
        const aboutElement = document.querySelector('#about-profile');
        const allSubtleTds = document.querySelectorAll('td.p-1.ps-3.bg-light-subtle');
        let name = nameElement ? nameElement.textContent.trim() : "the other person";

        if (nameElement) {
            let fullText = nameElement.textContent.trim();
            const startIndex = fullText.indexOf('(');
            const endIndex = fullText.indexOf(')');
            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                name = fullText.substring(startIndex + 1, endIndex);
            } else {
                name = fullText;
            }
        }
        let location = locationElement ? locationElement.textContent.trim() : "an unknown location";
        let about = aboutElement ? aboutElement.textContent.trim() : null;
        let status = "unknown";
        let age = "unknown";

        if (allSubtleTds.length > 0) {
            for (let i = 0; i < allSubtleTds.length; i++) {
                const text = allSubtleTds[i].textContent.trim();
                if (text.toLowerCase().includes('married') || text.toLowerCase().includes('single') || text.toLowerCase().includes('divorced') || text.toLowerCase().includes('widowed')) {
                    status = text;
                    if (allSubtleTds.length > i + 1 && !isNaN(parseInt(allSubtleTds[i + 1].textContent.trim()))) {
                        age = allSubtleTds[i + 1].textContent.trim();
                    }
                    break;
                }
                if (!isNaN(parseInt(text)) && text.length < 4) {
                    age = text;
                    if (i > 0 && allSubtleTds[i - 1].textContent.trim().length > 2 && isNaN(parseInt(allSubtleTds[i - 1].textContent.trim()))) {
                        status = allSubtleTds[i - 1].textContent.trim();
                    }
                    if (allSubtleTds.length > i + 1 && allSubtleTds[i + 1].textContent.trim().length > 2 && isNaN(parseInt(allSubtleTds[i + 1].textContent.trim()))) {
                        status = allSubtleTds[i + 1].textContent.trim();
                    }
                    break;
                }
            }
        }
        if (status === "unknown" && allSubtleTds.length > 0) { status = allSubtleTds[0].textContent.trim(); }
        if (age === "unknown" && allSubtleTds.length > 1) { age = allSubtleTds[1].textContent.trim(); }

        return { name, status, age, location, about };
    }

    function getCustomerInfo() {
        const getElementText = (selector) => document.querySelector(selector)?.textContent.trim() || null;
        const location = getElementText(CUSTOMER_INFO_SELECTORS.location);
        const age = getElementText(CUSTOMER_INFO_SELECTORS.age);
        const status = getElementText(CUSTOMER_INFO_SELECTORS.status);
        const gender = getElementText(CUSTOMER_INFO_SELECTORS.gender);
        const about = getElementText(CUSTOMER_INFO_SELECTORS.aboutUser);

        return {
            gender: gender || "male",
            status: status || "unknown",
            age: age || "unknown",
            location: location || "your area",
            about: about
        };
    }

    function getTimeOfDay() {
        const timeElement = document.querySelector(CUSTOMER_INFO_SELECTORS.localTime);
        if (!timeElement) return "the current time";
        const timeString = timeElement.textContent.trim();
        const hour = parseInt(timeString.split(':')[0], 10);
        if (isNaN(hour)) return "the current time";
        if (hour >= 5 && hour < 12) return "morning";
        if (hour >= 12 && hour < 18) return "afternoon";
        if (hour >= 18 && hour < 21) return "evening";
        return "night";
    }

    function isPersonaIntro(msgEl, idx) {
        if (idx !== 0) return false;
        const text = msgEl.innerText.toLowerCase();
        const messageContainer = msgEl.closest('div.d-flex.gap-2');
        if (!messageContainer || !messageContainer.querySelector("img")) return false;

        const feminineMarkers = ["baby", "darling", "gorgeous", "honey", "sweetheart"];
        const explicitMarkers = ["wet", "naked", "hard", "cum", "horny", "kiss", "touch", "pussy", "dick"];
        if (feminineMarkers.some(w => text.includes(w)) && explicitMarkers.some(w => text.includes(w))) {
            console.log("Starr Collector: Detected and ignored a likely persona intro message.", text);
            return true;
        }
        return false;
    }

    function getAllCustomerMessages() {
        const messages = document.querySelectorAll(ALL_CUSTOMER_MESSAGES_SELECTOR);
        const processedMessages = [];
        const siteChatInput = document.querySelector(REPLY_INPUT_SELECTOR);
        const siteChatInputValue = siteChatInput ? siteChatInput.value.trim() : '';

        const customerMessages = Array.from(messages).filter((msg, idx) => !isPersonaIntro(msg, idx));

        customerMessages.forEach(messageElement => {
            const messageText = messageElement.innerText.trim();
            if (messageText && messageText !== siteChatInputValue) {
                processedMessages.push({ role: "user", content: messageText });
            }
        });
        return processedMessages;
    }

    async function imageToDataURI(url) {
        const response = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                onload: resolve,
                onerror: reject,
            });
        });
        const blob = response.response;
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // --- UI Display & Manipulation ---
    function resetPersona() {
        console.log('Starr Persona Reset: Clearing conversation context for new message.');
        conversationHistory = [];
        starrResponses.innerHTML = '';
        if (summaryContainer) {
            summaryContainer.style.display = 'none';
        }
    }

    function displaySummary(summaryText) {
        const summaryBox = document.getElementById('starr-summary-box');
        if (summaryBox && summaryContainer) {
            summaryContainer.style.display = 'flex';
            summaryBox.innerHTML = `<strong>Summary:</strong> ${summaryText}`;
        }
    }

    function detectAndNotifyPI(textToScan, source) {
        let foundPI = [];
        for (const [label, regex] of Object.entries(PI_DETECTION_CONFIG.regex)) {
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(textToScan)) !== null) {
                const piValue = match[1] ? match[1] : match[0];
                foundPI.push(`${label}: ${piValue}`);
            }
        }
        if (foundPI.length === 0) return;
        const formattedPI = foundPI.join('\n');
        console.log(`PI Detected in ${source} Message:`, formattedPI);
        const oldNotification = document.getElementById('pi-notification');
        if (oldNotification) oldNotification.remove();
        const notification = document.createElement('div');
        notification.id = 'pi-notification';
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; background-color: #ff4757; color: white;
            padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-family: sans-serif; font-size: 14px; z-index: 10002; cursor: pointer;
            border: 2px solid #ff1f32;
        `;
        notification.innerHTML = '⚠️ <b>Personal Info Detected!</b><br>Click to copy details.';
        document.body.appendChild(notification);
        piSound.play().catch(e => console.error("PI Sound playback failed:", e.name, e.message));
        notification.addEventListener('click', () => {
            GM_setClipboard(formattedPI, 'text');
            notification.style.backgroundColor = '#2ed573';
            notification.innerHTML = '✅ Copied to clipboard!';
            setTimeout(() => notification.remove(), 2000);
        });
    }

    function displayAiPiNotification(piText) {
        if (piEditorPopup && piEditorList) {
            console.log("Starr: Displaying AI PI scan results in editor popup.");
            piEditorList.innerHTML = '';
            const lines = piText.split('\n').filter(line => line.trim() !== '');
            lines.forEach(line => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'starr-pi-item';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                const textInput = document.createElement('input');
                textInput.type = 'text';
                textInput.value = `| ${line.trim()}`;
                itemDiv.appendChild(checkbox);
                itemDiv.appendChild(textInput);
                piEditorList.appendChild(itemDiv);
            });
            piEditorPopup.style.display = 'flex';
            piSound.play().catch(e => console.error("PI Sound playback failed:", e.name, e.message));
        }
    }

    function displayAndVoiceReply(replyContent) {
        starrResponses.innerHTML = "";
        const div = document.createElement("div");
        div.className = "starr-reply";
        div.textContent = replyContent;
        starrResponses.appendChild(div);

        if (voiceReplyToggle.checked) {
            try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(replyContent);
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                const voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    const femaleVoice = voices.find(voice =>
                        voice.lang.startsWith('en') &&
                        (voice.name.includes('Female') || voice.name.includes('Google US English') || voice.name.includes('Zira') || voice.name.includes('Susan')) &&
                        !voice.name.includes('Male')
                    );
                    if (femaleVoice) {
                        utterance.voice = femaleVoice;
                    }
                }
                window.speechSynthesis.speak(utterance);
            } catch (ttsError) {
                console.warn("Starr: Failed to play voice reply:", ttsError);
            }
        }
        isUIPopulated = true;
    }

    function pasteIntoSiteChat(text) {
        const cleanedText = text.replace(/\s*Copy\s*$/, '');
        const siteChatInput = document.querySelector(REPLY_INPUT_SELECTOR);
        if (siteChatInput) {
            siteChatInput.focus();
            siteChatInput.value = cleanedText;
            siteChatInput.dispatchEvent(new Event('input', { bubbles: true }));
            siteChatInput.dispatchEvent(new Event('change', { bubbles: true }));
            siteChatInput.focus();
        } else {
            console.warn("Starr: Could not find the dating site's chat input box (" + REPLY_INPUT_SELECTOR + ").");
            GM_notification({
                text: "Warning: Could not auto-paste. Check " + REPLY_INPUT_SELECTOR + " in script config.",
                timeout: 5000,
                title: "Starr Warning"
            });
        }
    }

    function pasteIntoLogbook(textToPaste) {
        const logbookElement = document.querySelector('textarea[aria-label="member-note-message"]');

        if (logbookElement) {
            logbookElement.focus();
            logbookElement.click();

            const existingLog = logbookElement.value.trim();
            logbookElement.value = existingLog ? `${textToPaste}\n${existingLog}` : textToPaste;

            logbookElement.dispatchEvent(new Event('input', { bubbles: true }));
            logbookElement.dispatchEvent(new Event('change', { bubbles: true }));

            logbookElement.blur();
            return true;
        } else {
            console.error("Starr PI Logger: Member logbook element not found.");
            return false;
        }
    }

    function updatePopupUI() {
        popup.style.setProperty('display', 'flex', 'important');

        if (accessDeniedPermanent) {
            authSection.style.setProperty('display', 'none', 'important');
            chatSection.style.setProperty('display', 'none', 'important');
            waitingMessage.style.setProperty('display', 'block', 'important');
            waitingMessage.style.color = 'red';
            waitingMessage.textContent = "Access denied, babe. Your CONE ID on the site doesn't match the one you entered, or it's not authorized. This Starr isn't for you... 💔";
            return;
        }

        if (!isAuthorized) {
            authSection.style.setProperty('display', 'block', 'important');
            chatSection.style.setProperty('display', 'none', 'important');
            waitingMessage.style.setProperty('display', 'none', 'important');
            authMessage.textContent = "Ogbeni pay money joor... Your sub don finish. You dey whine?";
            coneIdInput.value = storedUserConeId || "";
            coneIdInput.focus();
        } else {
            authSection.style.setProperty('display', 'none', 'important');
            if (waitingForUiDetectionAndMessage) {
                chatSection.style.setProperty('display', 'none', 'important');
                waitingMessage.style.setProperty('display', 'block', 'important');
                waitingMessage.style.color = 'var(--starr-waiting-message-color)';
                waitingMessage.textContent = "Access granted! Now, click operator's service site 'start chatting' button and wait for a customer message to arrive.";
            } else {
                chatSection.style.setProperty('display', 'flex', 'important');
                waitingMessage.style.setProperty('display', 'none', 'important');
                starrInput.focus();
            }
        }
        starrSettingsPanel.style.display = 'none';
    }

    function applyTheme(themeName) {
        const themeClasses = Object.values(AUTO_THEME_MAP)
            .concat(['theme-warning-orange', 'theme-emergency-red'])
            .filter(t => t !== 'bubblegum')
            .map(t => t.startsWith('theme-') ? t : 'theme-' + t);

        document.documentElement.classList.remove(...themeClasses, 'theme-bubblegum');
        if (themeName && themeName !== 'bubblegum' && !themeName.startsWith('theme-')) {
            themeName = 'theme-' + themeName;
        }
        if (themeName && themeName !== 'theme-bubblegum') {
            document.documentElement.classList.add(themeName);
        }
    }

    function updateButtonLabelsForUIMode() {
        const isLandscape = document.body.classList.contains('ui-landscape');
        const sendButton = document.getElementById('starr-send');
        const regenerateButton = document.getElementById('starr-regenerate');
        const forceKeyButton = document.getElementById('starr-force-key');
        const settingsButton = document.getElementById('starr-settings-button');
        const closeButton = document.getElementById('starr-close');

        if (isLandscape) {
            sendButton.innerHTML = 'Send';
            regenerateButton.innerHTML = 'Regenerate';
            forceKeyButton.innerHTML = 'Force New API Key';
            settingsButton.innerHTML = 'Settings';
            closeButton.innerHTML = 'Close';
        } else {
            sendButton.innerHTML = '📤';
            regenerateButton.innerHTML = '🔄';
            forceKeyButton.innerHTML = '🔑';
            settingsButton.innerHTML = '⚙️';
            closeButton.innerHTML = '❌';
        }
    }

    function updateThemeBasedOnTime() {
        if (!isAutoThemeEnabled) return;
        const timePeriod = getTimeOfDay();
        const themeToSet = AUTO_THEME_MAP[timePeriod] || 'bubblegum';
        applyTheme(themeToSet);
        GM_setValue('starr_current_theme', themeToSet);
    }

    function resetTimerState() {
        warningSound.pause();
        emergencySound.pause();
        warningSound.currentTime = 0;
        emergencySound.currentTime = 0;
        starrHeader.innerHTML = "Talk to Starr, baby💦...";
        if (isAutoThemeEnabled) {
            updateThemeBasedOnTime();
        } else {
            const savedTheme = GM_getValue('starr_current_theme', 'bubblegum');
            applyTheme(savedTheme);
        }
        currentTimerState = 'normal';
    }

    async function applySavedUIPreferences() {
        const savedDarkMode = GM_getValue('starr_dark_mode', false);
        darkModeToggle.checked = savedDarkMode;
        if (savedDarkMode) document.documentElement.classList.add("dark-mode");

        const savedSendButtonGlow = GM_getValue('starr_send_button_glow', true);
        sendButtonGlowToggle.checked = savedSendButtonGlow;
        starrSendButton.classList.toggle("glow", savedSendButtonGlow);

        const savedSummaryToggle = GM_getValue('starr_summary_enabled', true);
        summaryToggle.checked = savedSummaryToggle;

        const savedPiScanToggle = GM_getValue('starr_pi_scan_enabled', true);
        piScanToggle.checked = savedPiScanToggle;
        piScanButton.style.display = savedPiScanToggle ? 'flex' : 'none';

        const savedTimerWarning = GM_getValue('starr_timer_warning_enabled', true);
        timerWarningToggle.checked = savedTimerWarning;
        isTimerWarningEnabled = savedTimerWarning;

        voiceReplyToggle.checked = GM_getValue('starr_voice_reply', true);

        const savedScrutiny = GM_getValue('starr_scrutiny_enabled', true);
        scrutinyToggle.checked = savedScrutiny;
        isScrutinyEnabled = savedScrutiny;

        const savedEngine = GM_getValue('starr_engine', 'zephyr');
        if (starrEngineSelect) starrEngineSelect.value = savedEngine;

        isAutoThemeEnabled = await GM_getValue('starr_auto_theme_enabled', false);
        autoThemeToggle.checked = isAutoThemeEnabled;
        if (isAutoThemeEnabled) {
            updateThemeBasedOnTime();
        } else {
            const savedTheme = GM_getValue('starr_current_theme', 'bubblegum');
            applyTheme(savedTheme);
        }
    }
    
    // --- Core Actions & Handlers ---

    async function handleResponseGeneration(input, tone = 'plain') {
        if (accessDeniedPermanent || waitingForUiDetectionAndMessage) return;

        let apiKey = GM_getValue("starr_openrouter_api_key", null);
        if (!apiKey) {
            const entered = prompt("🔑 Please enter your OpenRouter.ai API key:");
            if (entered) {
                apiKey = entered.trim();
                GM_setValue("starr_openrouter_api_key", apiKey);
            } else {
                alert("Starr needs an API key to work.");
                return;
            }
        }
        starrLoading.style.setProperty('display', 'flex', 'important');
        starrResponses.innerHTML = "";

        // Gather image data if present
        let imageUris = [];
        const allMessagePElements = document.querySelectorAll(ALL_CUSTOMER_MESSAGES_SELECTOR);
        if (allMessagePElements.length > 0) {
            const lastMessagePElement = allMessagePElements[allMessagePElements.length - 1];
            const messageContainer = lastMessagePElement.parentElement;
            if (messageContainer) {
                const imagesToProcess = messageContainer.querySelectorAll('img[src*="myoperatorservice.com/uploads/"]');
                if (imagesToProcess.length > 0) {
                    try {
                        imageUris = await Promise.all(Array.from(imagesToProcess).map(img => imageToDataURI(img.src)));
                    } catch (imageError) {
                        console.error("Starr: Failed to process images for API request.", imageError);
                    }
                }
            }
        }

        const dataToSend = {
            action: 'generate_response',
            input: input,
            tone: tone,
            conversationHistory: conversationHistory,
            persona: getPersonaInfo(),
            customer: getCustomerInfo(),
            timeOfDay: getTimeOfDay(),
            engine: GM_getValue("starr_engine", "zephyr"),
            imageUris: imageUris
        };

        try {
            const result = await callVercelFunction(dataToSend);
            if (result.success) {
                displayAndVoiceReply(result.reply);
            } else {
                console.error("Backend generation error:", result.error);
                displayAndVoiceReply("Sorry baby, my mind's a little fuzzy right now... " + (result.error || ""));
            }
        } catch (error) {
            console.error("Network error during generation:", error);
            displayAndVoiceReply("I'm having trouble connecting right now, let's try again in a moment, okay?");
        } finally {
            starrLoading.style.setProperty('display', 'none', 'important');
        }
    }

    async function handleReplyClick(event) {
        if (!event.target.classList.contains('starr-reply') || event.target.classList.contains('checking')) return;

        const clickedReplyElement = event.target;
        textUnderScrutiny = clickedReplyElement.textContent;

        if (!isScrutinyEnabled) {
            pasteIntoSiteChat(textUnderScrutiny);
            conversationHistory.push({ role: "assistant", content: textUnderScrutiny });
            popup.style.setProperty('display', 'none', 'important');
            return;
        }

        clickedReplyElement.classList.add('checking');

        try {
            const result = await callVercelFunction({ action: 'check_violation', text: textUnderScrutiny });
            if (result.success && result.verdict === "block") {
                const reasonText = result.issues.map(issue => issue.reason).join('; ');
                violationReason.textContent = reasonText || "A policy violation was detected.";
                violationWarningOverlay.style.display = 'flex';
                violationSound.play().catch(e => console.error("Violation alarm playback failed:", e));
            } else {
                pasteIntoSiteChat(textUnderScrutiny);
                conversationHistory.push({ role: "assistant", content: textUnderScrutiny });
                popup.style.setProperty('display', 'none', 'important');
            }
        } catch (error) {
            console.error("Violation check failed:", error);
            pasteIntoSiteChat(textUnderScrutiny); // Fail safe: allow paste
            conversationHistory.push({ role: "assistant", content: textUnderScrutiny });
            popup.style.setProperty('display', 'none', 'important');
        } finally {
            clickedReplyElement.classList.remove('checking');
        }
    }

    async function checkAndSummarize() {
        const isSummaryEnabled = GM_getValue('starr_summary_enabled', true);
        const lastMessage = getLatestMessage();
        const longMessageChars = 300;

        if (!isSummaryEnabled || lastMessage.length < longMessageChars) {
            summaryContainer.style.display = 'none';
            return;
        }

        console.log("Starr: Long message detected, generating automatic summary.");
        await forceSummary();
    }

    async function forceSummary() {
        const isSummaryEnabled = GM_getValue('starr_summary_enabled', true);
        const lastMessage = getLatestMessage();
        if (!isSummaryEnabled || lastMessage.length === 0) return;

        const summaryBox = document.getElementById('starr-summary-box');
        if (summaryBox && summaryContainer) {
            summaryContainer.style.display = 'flex';
            summaryBox.innerHTML = `<strong>Summary:</strong> <em>Summarizing...</em>`;
        }

        try {
            const result = await callVercelFunction({ action: 'summarize', text: lastMessage });
            if (result.success) {
                displaySummary(result.summary);
            } else {
                displaySummary("Could not generate a summary.");
            }
        } catch (error) {
            console.error("Starr: Failed to fetch summary.", error);
            displaySummary("Summary failed to load.");
        }
    }

    async function scanMessageForPI() {
        console.log("Starr: Performing intelligent PI scan on message.");
        const text = lastProcessedMessage;
        if (!text) {
            alert("No message detected to scan.");
            return;
        }

        const originalContent = piScanButton.textContent;
        piScanButton.textContent = '⏳';
        piScanButton.disabled = true;

        try {
            const result = await callVercelFunction({ action: 'scan_pi', text: text });
            if (result.success && result.pi_text && result.pi_text.toUpperCase().trim() !== 'NONE') {
                displayAiPiNotification(result.pi_text);
            } else {
                GM_notification({ text: "The intelligent scan found no new personal information.", timeout: 3000, title: "Starr PI Scan" });
            }
        } catch (error) {
            console.error("Starr: AI PI Scan failed:", error);
            alert("Starr: The intelligent PI scan failed. Check the console for details.");
        } finally {
            piScanButton.textContent = originalContent;
            piScanButton.disabled = false;
        }
    }

    async function checkUserAuthorizationStatus() {
        storedUserConeId = GM_getValue('user_cone_id', null);
        const lastAuthTimestamp = GM_getValue('user_auth_last_checked_timestamp', 0);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        if (storedUserConeId && (Date.now() - lastAuthTimestamp > sevenDays)) {
            GM_setValue('user_cone_id', null);
            isAuthorized = false;
            storedUserConeId = null;
            return;
        }

        if (storedUserConeId) {
            try {
                const result = await callVercelFunction({ action: 'check_auth', coneId: storedUserConeId });
                if (result.success && result.isAuthorized) {
                    isAuthorized = true;
                    GM_setValue('user_auth_last_checked_timestamp', Date.now());
                } else {
                    isAuthorized = false;
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                isAuthorized = false;
            }
        } else {
            isAuthorized = false;
        }
    }

    async function handleManualConeIdSubmit() {
        unlockAudio();
        const enteredConeId = coneIdInput.value.trim();
        if (!enteredConeId) {
            authMessage.textContent = "CONE ID cannot be empty.";
            return;
        }

        try {
            const result = await callVercelFunction({ action: 'check_auth', coneId: enteredConeId });
            if (result.success && result.isAuthorized) {
                GM_setValue('user_cone_id', enteredConeId);
                GM_setValue('user_auth_last_checked_timestamp', Date.now());
                storedUserConeId = enteredConeId;
                isAuthorized = true;
                authMessage.textContent = "";
                waitingForUiDetectionAndMessage = true;
                accessDeniedPermanent = false;
                updatePopupUI();
                resetPersona();
            } else {
                GM_setValue('user_cone_id', null);
                isAuthorized = false;
                authMessage.textContent = "Ogbeni pay money joor...";
                updatePopupUI();
            }
        } catch (error) {
            console.error("Manual Auth check failed:", error);
            authMessage.textContent = "Could not verify ID. Please try again.";
        }
    }

    async function performFinalAuthorizationCheck() {
        if (!waitingForUiDetectionAndMessage) return;
        const uiConeId = getLoggedInConeId();

        try {
            const result = await callVercelFunction({ action: 'final_auth_check', uiConeId: uiConeId, storedConeId: storedUserConeId });
            if (result.success && result.isAuthorized) {
                waitingForUiDetectionAndMessage = false;
                accessDeniedPermanent = false;
                updatePopupUI();
                GM_notification({ text: "Starr access fully confirmed! Start chatting, baby.", timeout: 3000, title: "Starr Activated ✨" });
            } else {
                accessDeniedPermanent = true;
                updatePopupUI();
                GM_setValue('user_cone_id', null);
                isAuthorized = false;
            }
        } catch (error) {
            console.error("Final auth check failed:", error);
            accessDeniedPermanent = true;
            updatePopupUI();
        }
    }

    async function pollForNewMessages() {
        if (!isAuthorized) return;
        if (waitingForUiDetectionAndMessage) {
            await performFinalAuthorizationCheck();
            if (accessDeniedPermanent || waitingForUiDetectionAndMessage) return;
        }
        if (accessDeniedPermanent) return;

        const allCustomerMessages = getAllCustomerMessages();
        if (allCustomerMessages.length > 0) {
            const currentLatestMessageText = allCustomerMessages[allCustomerMessages.length - 1].content;
            if (currentLatestMessageText !== lastProcessedMessage) {
                lastProcessedMessage = currentLatestMessageText;
                console.log("Starr: New customer message detected:", currentLatestMessageText);

                resetPersona();
                updateThemeBasedOnTime();
                detectAndNotifyPI(currentLatestMessageText, 'Customer');
                await checkAndSummarize();

                conversationHistory = allCustomerMessages;

                popup.style.setProperty('display', 'flex', 'important');
                updatePopupUI();
                starrInput.value = currentLatestMessageText;
                starrInput.focus();
                try {
                    await handleResponseGeneration(currentLatestMessageText);
                } catch (error) {
                    console.error("Starr: Error in automatic message processing:", error);
                }
            }
        }
    }

    // --- Initialization and Event Listeners ---
    function unlockAudio() {
        if (isAudioUnlocked) return;
        console.log("Starr: Attempting to unlock audio context...");
        const sounds = [warningSound, emergencySound, piSound, violationSound];
        sounds.forEach(sound => {
            const promise = sound.play();
            if (promise !== undefined) {
                promise.then(() => { sound.pause(); sound.currentTime = 0; })
                    .catch(error => console.warn("Starr: Audio unlock failed for one sound.", error.name));
            }
        });
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(' '));
        }
        isAudioUnlocked = true;
    }

    async function initializeStarrPopup() {
        if (!isAudioUnlocked) unlockAudio();
        if (isUIPopulated) {
            popup.style.setProperty('display', 'flex', 'important');
            starrInput.focus();
            return;
        }

        updateButtonLabelsForUIMode();
        await checkUserAuthorizationStatus();

        if (isAuthorized && !waitingForUiDetectionAndMessage && !accessDeniedPermanent) {
            waitingForUiDetectionAndMessage = true;
        }
        updatePopupUI();
        resetPersona();
        starrInput.value = "";
        selectedReplyIndex = -1;
    }

    let currentTimerState = 'normal';
    function pollForTimer() {
        if (!isTimerWarningEnabled || popup.style.display === 'none') {
            if (currentTimerState !== 'normal') resetTimerState();
            return;
        }
        const timerElement = document.querySelector(TIMER_WARNING_CONFIG.selector);
        if (!timerElement) {
            if (currentTimerState !== 'normal') resetTimerState();
            return;
        }
        const timeText = timerElement.textContent.trim();
        const [minutes, seconds] = timeText.split(':').map(Number);
        const totalSeconds = (minutes * 60) + seconds;

        if (totalSeconds <= 0) {
            if (currentTimerState !== 'normal') {
                resetTimerState();
                document.getElementById('starr-close').click();
            }
        } else if (totalSeconds <= 60) {
            if (currentTimerState !== 'emergency') {
                currentTimerState = 'emergency';
                applyTheme('emergency-red');
                starrHeader.innerHTML = "⚠️ REPLY NOW! ⚠️";
                warningSound.pause();
                emergencySound.play().catch(e => console.error("Emergency sound failed:", e));
            }
        } else if (totalSeconds <= 120) {
            if (currentTimerState !== 'warning') {
                currentTimerState = 'warning';
                applyTheme('warning-orange');
                starrHeader.innerHTML = "⚠️ Message time running out...";
                emergencySound.pause();
                warningSound.play().catch(e => console.error("Warning sound failed:", e));
            }
        } else {
            if (currentTimerState !== 'normal') resetTimerState();
        }
    }

    async function displayWelcomeScreen() {
        const welcomeHTML = `
            <div id="starr-welcome-overlay">
                <div id="starr-welcome-popup">
                    <div class="welcome-title">
                        Hey, fucker... <span class="emoji">🔥</span>
                    </div>
                    <div class="starr-replies" id="starr-welcome-features">
                        <div class="starr-reply">
                            <p>I see you're new here. Before we get naughty, let me show you what I can do for you, baby...</p>

                            <strong>My Core Features:</strong>
                            <ul>
                                <li><strong>Advanced AI:</strong> Switch between Response Style Engines (Zephyr, Aurora, Velora) in settings.</li>
                                <li><strong>Smart Collector:</strong> I only reply to real customer messages, ignoring fake persona intros.</li>
                                <li><strong>Violation Checker:</strong> My built-in rules keep me wild but always in character.</li>
                                <li><strong>Conversation Summary:</strong> I'll give you a quick summary of long messages.</li>
                                <li><strong>PI Scanner:</strong> I can intelligently scan for personal info before you send anything risky.</li>
                                <li><strong>Adaptive UI:</strong> Choose between Landscape 💻 or Portrait 📱 mode for your comfort.</li>
                            </ul>

                            <strong>Your Hotkeys to Control Me:</strong>
                            <ul>
                                <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> &mdash; Open or close me anytime.</li>
                                <li><kbd>Ctrl</kbd> + <kbd>M</kbd> &mdash; Minimize my window when you need space.</li>
                                <li><kbd>Ctrl</kbd> + <kbd>Enter</kbd> &mdash; Send your message from anywhere.</li>
                                <li><kbd>Ctrl</kbd> + <kbd>R</kbd> &mdash; Not happy with my reply? Make me try again.</li>
                                <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> &mdash; Trigger a spicy "Naughty" regeneration.</li>
                                <li><kbd>Ctrl</kbd> + <kbd>K</kbd> &mdash; Force a new OpenRouter API Key.</li>
                                <li><kbd>Ctrl</kbd> + <kbd>Q</kbd> &mdash; Force a summary of the latest message.</li>
                                <li><kbd>T</kbd> &mdash; Toggle the Settings panel.</li>
                                <li><kbd>Tab</kbd> &mdash; Trigger the PI Scanner (when I'm open).</li>
                                <li><kbd>↑</kbd> / <kbd>↓</kbd> &mdash; Navigate through my reply options.</li>
                                <li><kbd>Esc</kbd> &mdash; Close my window.</li>
                            </ul>
                             <p>You can find more toggles in the <strong>Settings</strong> panel (⚙️). Now, let's have some fun...</p>
                        </div>
                    </div>
                    <div id="starr-buttons">
                         <button id="starr-welcome-close">Got it, let's go!</button>
                    </div>
                </div>
            </div>
        `;

        const welcomeCSS = `
            #starr-welcome-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.75);
                z-index: 99999; display: flex; justify-content: center; align-items: center;
                font-family: Arial, sans-serif;
            }
            #starr-welcome-popup {
                width: 650px; max-height: 90vh;
                background: var(--starr-popup-background); border: 2px solid var(--starr-border-color);
                border-radius: 20px; padding: 20px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
                display: flex; flex-direction: column; color: var(--starr-text-color);
            }
            #starr-welcome-popup .welcome-title {
                font-family: 'Georgia', serif; font-size: 28px; color: var(--starr-header-color);
                text-align: center; margin-bottom: 20px; padding-bottom: 10px;
                border-bottom: 2px solid var(--starr-header-border);
                font-weight: 900 !important; opacity: 1 !important;
                display: flex; align-items: center; justify-content: center; gap: 8px;
            }
            #starr-welcome-popup .welcome-title .emoji {
                font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
                font-size: 1.1em;
            }
            #starr-welcome-features { overflow-y: auto; padding-right: 10px; margin-bottom: 20px; }
            #starr-welcome-features .starr-reply {
                background: var(--starr-reply-background); border-color: var(--starr-reply-border);
                color: var(--starr-reply-text); font-size: 14px; line-height: 1.6;
                cursor: default; white-space: normal;
            }
            #starr-welcome-features strong {
                color: var(--starr-header-color); display: block;
                margin-top: 15px; margin-bottom: 5px; font-size: 1.1em;
            }
            #starr-welcome-features ul { list-style: none; padding-left: 10px; margin: 0; }
            #starr-welcome-features li { margin-bottom: 8px; }
            #starr-welcome-features p { margin: 15px 0 5px 0; }
            #starr-welcome-features kbd {
                background-color: var(--starr-popup-background); border: 1px solid var(--starr-border-color);
                border-radius: 4px; padding: 2px 6px; font-family: monospace;
                font-size: 0.9em; color: var(--starr-text-color);
                box-shadow: 1px 1px 1px rgba(0,0,0,0.1); margin: 0 2px;
            }
            #starr-welcome-close {
                padding: 12px 25px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer;
                font-size: 16px; width: 100%; background: var(--starr-send-button-bg); color: white;
                position: relative; overflow: hidden; transition: background-color 0.3s ease, box-shadow 0.3s ease;
            }
            #starr-welcome-close::before {
                content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                background: radial-gradient(circle, var(--starr-send-button-glow-color) 0%, transparent 70%);
                animation: heatGlow 1.5s infinite alternate; z-index: 0; opacity: 0.7;
            }
            #starr-welcome-close:hover { box-shadow: 0 0 10px var(--starr-send-button-glow-color); }
        `;

        document.head.insertAdjacentHTML('beforeend', `<style>${welcomeCSS}</style>`);
        document.body.insertAdjacentHTML('beforeend', welcomeHTML);

        document.getElementById('starr-welcome-close').addEventListener('click', async () => {
            document.getElementById('starr-welcome-overlay').remove();
            await GM_setValue('hasSeenWelcomePage', true);
            await displayModeSelection();
        });
    }

    async function displayModeSelection() {
        const modeHTML = `
            <div id="starr-mode-overlay">
                <div id="starr-mode-popup">
                    <h3>Choose Your UI Mode</h3>
                    <p>How do you want Starr’s interface to appear?</p>
                    <div id="starr-mode-buttons">
                        <button id="mode-landscape">💻 Landscape (Desktop)</button>
                        <button id="mode-portrait">📱 Portrait (Mobile)</button>
                    </div>
                </div>
            </div>
        `;

        const modeCSS = `
            #starr-mode-overlay {
                position: fixed; top:0; left:0; width:100%; height:100%;
                background: rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center;
                z-index: 99999; font-family: Arial, sans-serif;
            }
            #starr-mode-popup {
                background: var(--starr-popup-background);
                border: 2px solid var(--starr-border-color);
                border-radius: 20px; padding: 25px;
                color: var(--starr-text-color); width: 90vw; max-width: 400px; text-align: center;
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
            }
             #starr-mode-popup h3 {
                font-family: 'Georgia', serif; font-size: 24px;
                color: var(--starr-header-color);
                text-align: center; margin: 0 0 10px 0;
            }
            #starr-mode-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
            #starr-mode-buttons button {
                padding: 12px; border: none; border-radius: 8px; cursor: pointer;
                font-weight: bold; font-size: 14px; background: var(--starr-send-button-bg); color:white;
                transition: transform 0.2s ease;
            }
            #starr-mode-buttons button:hover {
                transform: scale(1.05);
            }
        `;
        document.head.insertAdjacentHTML('beforeend', `<style>${modeCSS}</style>`);
        document.body.insertAdjacentHTML('beforeend', modeHTML);

        document.getElementById('mode-landscape').onclick = async () => {
            document.body.classList.remove('ui-portrait');
            document.body.classList.add('ui-landscape');
            await GM_setValue('starr_ui_mode', 'landscape');
            updateButtonLabelsForUIMode();
            document.getElementById('starr-mode-overlay').remove();
            await initializeStarrPopup();
        };
        document.getElementById('mode-portrait').onclick = async () => {
            document.body.classList.remove('ui-landscape');
            document.body.classList.add('ui-portrait');
            await GM_setValue('starr_ui_mode', 'portrait');
            updateButtonLabelsForUIMode();
            document.getElementById('starr-mode-overlay').remove();
            await initializeStarrPopup();
        };
    }

    function setupSpicyRegenModes() {
        const container = document.getElementById('spicy-regen-container');
        if (!container) return;
        container.innerHTML = '';

        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'spicy-regen-dropdown';

        const mainButton = document.createElement('button');
        mainButton.innerHTML = '⬇️';
        mainButton.className = 'spicy-regen-main-button';
        mainButton.title = "Spicy Regenerate Options (Ctrl+Shift+R)";

        const dropdownContent = document.createElement('div');
        dropdownContent.className = 'spicy-regen-dropdown-content';

        const modes = [
            { label: '❤️ Sweet', tone: 'sweet' },
            { label: '🔥 Naughty', tone: 'naughty' },
            { label: '↩️ Deflect', tone: 'deflect' },
            { label: '😈 Savage', tone: 'savage' },
            { label: '😠 Sweetly Angry', tone: 'sweetly_angry' }
        ];

        modes.forEach(mode => {
            const link = document.createElement('a');
            link.innerHTML = mode.label;
            link.href = '#';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const input = starrInput.value.trim();
                if (!input) return;
                conversationHistory = conversationHistory.filter(msg => msg.role !== 'assistant');
                handleResponseGeneration(input, mode.tone);
                dropdownContent.style.display = 'none';
            });
            dropdownContent.appendChild(link);
        });

        dropdownContainer.appendChild(mainButton);
        dropdownContainer.appendChild(dropdownContent);
        container.appendChild(dropdownContainer);

        mainButton.addEventListener('click', () => {
            dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
        });

        window.addEventListener('click', (event) => {
            if (!dropdownContainer.contains(event.target)) {
                dropdownContent.style.display = 'none';
            }
        });
    }

    // --- Add Event Listeners ---
    submitConeIdButton.addEventListener("click", handleManualConeIdSubmit);
    coneIdInput.addEventListener("keydown", async (event) => { if (event.key === "Enter") { event.preventDefault(); await handleManualConeIdSubmit(); } });
    document.getElementById("starr-close").addEventListener("click", () => { popup.style.setProperty('display', 'none', 'important'); isUIPopulated = false; resetPersona(); });
    minimizeButton.addEventListener("click", () => { popup.style.setProperty('display', 'none', 'important'); });
    starrResponses.addEventListener("click", handleReplyClick);

    starrSendButton.addEventListener("click", () => {
        const input = starrInput.value.trim();
        if (!input) return;
        conversationHistory = getAllCustomerMessages().length > 0 ? getAllCustomerMessages() : [{ role: "user", content: input }];
        handleResponseGeneration(input, 'plain');
    });

    document.getElementById("starr-regenerate").addEventListener("click", () => {
        const input = starrInput.value.trim();
        if (!input) { alert("Nothing to regenerate, baby."); return; }
        conversationHistory = conversationHistory.filter(msg => msg.role !== 'assistant');
        handleResponseGeneration(input, 'plain');
    });
    
    document.getElementById("starr-force-key").addEventListener("click", () => {
        GM_setValue("starr_openrouter_api_key", null);
        alert("Starr's OpenRouter.ai API key has been cleared. You will be prompted for a new key on next use.");
    });
    
    starrSettingsButton.addEventListener("click", () => {
        starrSettingsPanel.style.display = starrSettingsPanel.style.display === 'flex' ? 'none' : 'flex';
    });
    
    // Settings toggles
    darkModeToggle.addEventListener("change", () => { document.documentElement.classList.toggle("dark-mode", darkModeToggle.checked); GM_setValue('starr_dark_mode', darkModeToggle.checked); });
    autoThemeToggle.addEventListener("change", async () => { isAutoThemeEnabled = autoThemeToggle.checked; await GM_setValue('starr_auto_theme_enabled', isAutoThemeEnabled); if (isAutoThemeEnabled) { updateThemeBasedOnTime(); } else { applyTheme(GM_getValue('starr_current_theme', 'bubblegum')); } });
    starrEngineSelect.addEventListener("change", () => { GM_setValue('starr_engine', starrEngineSelect.value); });
    timerWarningToggle.addEventListener("change", () => { isTimerWarningEnabled = timerWarningToggle.checked; GM_setValue('starr_timer_warning_enabled', isTimerWarningEnabled); if (!isTimerWarningEnabled) { resetTimerState(); } });
    summaryToggle.addEventListener("change", () => { GM_setValue('starr_summary_enabled', summaryToggle.checked); });
    piScanToggle.addEventListener("change", () => { GM_setValue('starr_pi_scan_enabled', piScanToggle.checked); piScanButton.style.display = piScanToggle.checked ? 'flex' : 'none'; });
    sendButtonGlowToggle.addEventListener("change", () => { starrSendButton.classList.toggle("glow", sendButtonGlowToggle.checked); GM_setValue('starr_send_button_glow', sendButtonGlowToggle.checked); });
    voiceReplyToggle.addEventListener("change", () => { GM_setValue('starr_voice_reply', voiceReplyToggle.checked); });
    scrutinyToggle.addEventListener("change", () => { isScrutinyEnabled = scrutinyToggle.checked; GM_setValue('starr_scrutiny_enabled', isScrutinyEnabled); });
    
    themeButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            const theme = event.target.dataset.theme;
            autoThemeToggle.checked = false;
            isAutoThemeEnabled = false;
            GM_setValue('starr_auto_theme_enabled', false);
            applyTheme(theme);
            GM_setValue('starr_current_theme', theme);
        });
    });

    piScanButton.addEventListener('click', scanMessageForPI);
    
    piLogCloseButton.addEventListener('click', () => {
        const itemsToLog = Array.from(piEditorList.querySelectorAll('.starr-pi-item'))
            .filter(item => item.querySelector('input[type="checkbox"]').checked)
            .map(item => item.querySelector('input[type="text"]').value);

        let successMessage = "No items selected.";
        if (itemsToLog.length > 0) {
            const textToLog = itemsToLog.join('\n');
            GM_setClipboard(textToLog, 'text');

            if (pasteIntoLogbook(textToLog)) {
                successMessage = "Logged & Copied!";
                setTimeout(() => {
                    const saveButton = Array.from(document.querySelectorAll('button.btn.btn-secondary')).find(btn => btn.textContent.trim() === 'Save');
                    if (saveButton) {
                        saveButton.click();
                        GM_notification({ text: "PI notes have been auto-pasted!", timeout: 5000, title: "Starr Logbook" });
                    }
                }, 250);
            } else {
                successMessage = "Copied (Logbook not found)!";
            }
        }
        
        const originalText = piLogCloseButton.textContent;
        piLogCloseButton.textContent = successMessage;
        piLogCloseButton.disabled = true;
        setTimeout(() => {
            piLogCloseButton.textContent = originalText;
            piLogCloseButton.disabled = false;
            piEditorPopup.style.display = 'none';
        }, 1500);
    });

    piCloseButton.addEventListener('click', () => { piEditorPopup.style.display = 'none'; });
    
    violationEditButton.addEventListener('click', () => {
        pasteIntoSiteChat(textUnderScrutiny);
        conversationHistory.push({ role: "assistant", content: textUnderScrutiny });
        violationWarningOverlay.style.display = 'none';
        popup.style.setProperty('display', 'none', 'important');
    });

    violationRegenerateButton.addEventListener('click', () => {
        violationWarningOverlay.style.display = 'none';
        document.getElementById('starr-regenerate').click();
    });

    violationWarningOverlay.addEventListener('click', (event) => {
        if (event.target === violationWarningOverlay) {
            violationWarningOverlay.style.display = 'none';
        }
    });

    document.addEventListener('keydown', (event) => {
        const isCtrl = event.ctrlKey || event.metaKey;

        if (violationWarningOverlay.style.display === 'flex') {
            if (event.key === 'Escape') { event.preventDefault(); violationWarningOverlay.style.display = 'none'; }
            else if (event.key === 'Enter') { event.preventDefault(); violationEditButton.click(); }
            return;
        }
        if (piEditorPopup.style.display === 'flex') {
            if (event.key === 'Escape') { event.preventDefault(); piEditorPopup.style.display = 'none'; }
            return;
        }

        if (isCtrl && event.shiftKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            if (popup.style.display === 'none' || popup.style.getPropertyValue('display') === 'none') { button.click(); }
            else { document.getElementById('starr-close').click(); }
            return;
        }

        const popupIsVisible = popup.style.display === 'flex' || popup.style.getPropertyValue('display') === 'flex';

        if (popupIsVisible && event.key.toLowerCase() === 't') {
            const activeEl = document.activeElement.tagName.toLowerCase();
            if (activeEl !== 'input' && activeEl !== 'textarea') {
                event.preventDefault();
                starrSettingsButton.click();
                return;
            }
        }

        if (isCtrl && event.key.toLowerCase() === 'm') {
            event.preventDefault();
            if (popupIsVisible) { minimizeButton.click(); } else { button.click(); }
            return;
        }

        if (event.key === 'Tab' && popupIsVisible) {
            event.preventDefault();
            piScanButton.click();
            return;
        }

        if (isCtrl && event.key.toLowerCase() === 'q') {
            event.preventDefault();
            forceSummary();
            return;
        }

        if (!popupIsVisible) { return; }

        if (isCtrl && event.key.toLowerCase() === 'r') {
            event.preventDefault();
            document.getElementById('starr-regenerate').click();
            return;
        }

        if (isCtrl && event.shiftKey && event.key.toLowerCase() === 'r') {
            event.preventDefault();
            const naughtyButton = document.querySelector('.spicy-regen-dropdown-content a:nth-child(2)');
            if (naughtyButton) naughtyButton.click();
            return;
        }

        if (isCtrl && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            document.getElementById('starr-force-key').click();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            document.getElementById('starr-close').click();
            return;
        }

        const replies = starrResponses.querySelectorAll('.starr-reply');
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (replies.length === 0) return;
            if (selectedReplyIndex > -1 && replies[selectedReplyIndex]) {
                replies[selectedReplyIndex].classList.remove('selected-reply');
            }
            if (event.key === 'ArrowDown') {
                selectedReplyIndex = (selectedReplyIndex + 1) % replies.length;
            } else {
                selectedReplyIndex = (selectedReplyIndex - 1 + replies.length) % replies.length;
            }
            const newSelectedReply = replies[selectedReplyIndex];
            newSelectedReply.classList.add('selected-reply');
            newSelectedReply.scrollIntoView({ block: 'nearest' });
            return;
        }

        if (event.key === 'Enter') {
            if (selectedReplyIndex > -1 && replies[selectedReplyIndex]) {
                event.preventDefault();
                replies[selectedReplyIndex].click();
            } else if (document.activeElement === starrInput && !event.shiftKey) {
                event.preventDefault();
                starrSendButton.click();
            } else if (isCtrl && document.activeElement !== coneIdInput) {
                event.preventDefault();
                starrSendButton.click();
            }
        }
    });

    async function init() {
        await applySavedUIPreferences();
        setupSpicyRegenModes();
        
        const savedMode = await GM_getValue('starr_ui_mode', null);
        if (savedMode) { document.body.classList.add(savedMode === 'portrait' ? 'ui-portrait' : 'ui-landscape'); } 
        else { document.body.classList.add('ui-landscape'); }
        updateButtonLabelsForUIMode();

        button.addEventListener("click", async () => {
            unlockAudio();
            const hasSeenWelcome = await GM_getValue('hasSeenWelcomePage', false);
            const savedUiMode = await GM_getValue('starr_ui_mode', null);

            if (!hasSeenWelcome) { await displayWelcomeScreen(); } 
            else if (!savedUiMode) { await displayModeSelection(); } 
            else { await initializeStarrPopup(); }
        });
        
        setInterval(pollForNewMessages, 3000);
        setInterval(pollForTimer, 1000);
    }

    init();

})();
