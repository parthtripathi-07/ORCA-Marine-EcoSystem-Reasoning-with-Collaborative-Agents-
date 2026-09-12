/**
 * ORCA Maritime Platform — Shared Navigation, PWA, & Cross-Page State Engine
 * Unifies Top Utility Bar, Desktop Nav, Mobile Sticky Bottom Nav, High-Sunlight Mode, and LocalStorage State.
 */

(function() {
    // 0. Strict Authentication Route Guard
    // Protects all portal pages; redirects unauthenticated visitors to login.html
    (function enforceRouteGuard() {
        const path = window.location.pathname.split('/').pop() || 'index.html';
        if (path === 'login.html') return;

        const sessionStr = localStorage.getItem('orca_auth_session');
        if (!sessionStr) {
            window.location.replace('login.html?redirect=' + encodeURIComponent(path));
            return;
        }

        try {
            const session = JSON.parse(sessionStr);
            const nowSec = Math.floor(Date.now() / 1000);
            if (!session || !session.token || !session.user || (session.expires_at && nowSec > session.expires_at)) {
                localStorage.removeItem('orca_auth_session');
                window.location.replace('login.html?redirect=' + encodeURIComponent(path));
            }
        } catch(e) {
            localStorage.removeItem('orca_auth_session');
            window.location.replace('login.html?redirect=' + encodeURIComponent(path));
        }
    })();

    // 1. Initialize State from LocalStorage & Verified Session
    let authUser = null;
    try {
        const s = JSON.parse(localStorage.getItem('orca_auth_session') || '{}');
        if (s && s.user) authUser = s.user;
    } catch(e) {}

    const DEFAULT_PORT = (authUser && authUser.harbor) || 'chennai';
    let currentPort = localStorage.getItem('orca_active_port') || DEFAULT_PORT;
    if (!window.PORT_COORDINATES || !window.PORT_COORDINATES[currentPort]) {
        currentPort = DEFAULT_PORT;
    }
    localStorage.setItem('orca_active_port', currentPort);

    let currentUsername = (authUser && authUser.name) || localStorage.getItem('orca_username') || 'Capt. Murugan';
    let currentRole = (authUser && authUser.role) || 'fisher';
    let currentVessel = (authUser && authUser.vessel) || localStorage.getItem('orca_vessel_id') || '';
    localStorage.setItem('orca_username', currentUsername);

    let currentLanguage = localStorage.getItem('orca_language') || 'en';
    localStorage.setItem('orca_language', currentLanguage);

    let isSunlightMode = localStorage.getItem('orca_sunlight_mode') === 'true';

    // Helpers exposed globally
    window.getActivePortKey = function() {
        return localStorage.getItem('orca_active_port') || DEFAULT_PORT;
    };

    window.getActivePort = function() {
        const key = window.getActivePortKey();
        return (window.PORT_COORDINATES && window.PORT_COORDINATES[key]) ? window.PORT_COORDINATES[key] : {
            id: 'goa', name: 'Goa (Malim / Panaji)', state: 'Goa', lat: 15.5036, lon: 73.8344, region: 'Konkan Coast (Arabian Sea)'
        };
    };

    window.switchPort = function(key) {
        if (!key) return;
        key = key.toLowerCase();
        localStorage.setItem('orca_active_port', key);
        
        // Sync any select element on the page
        const selects = document.querySelectorAll('.orca-port-select');
        selects.forEach(s => { s.value = key; });

        // Dispatch custom event so active page updates map/weather/telemetry without page reload
        window.dispatchEvent(new CustomEvent('orca:port_changed', {
            detail: {
                portKey: key,
                port: window.PORT_COORDINATES[key] || window.getActivePort()
            }
        }));
    };

    window.setLanguage = function(lang) {
        localStorage.setItem('orca_language', lang);
        window.dispatchEvent(new CustomEvent('orca:language_changed', { detail: { language: lang } }));
        location.reload();
    };

    window.changeUsername = function() {
        const current = localStorage.getItem('orca_username') || 'Capt. Murugan';
        const newName = prompt("Enter your Fisherman / Vessel Name:", current);
        if (newName && newName.trim()) {
            localStorage.setItem('orca_username', newName.trim());
            const userBadges = document.querySelectorAll('.orca-username-badge');
            userBadges.forEach(el => { el.textContent = newName.trim(); });
        }
    };

    // Secure Platform Logout
    window.orcaLogout = async function() {
        if (confirm("Are you sure you want to securely logout from the ORCA Maritime Platform?")) {
            try {
                const sessionStr = localStorage.getItem('orca_auth_session');
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    const baseUrl = window.ORCA_BASE_URL || 'http://127.0.0.1:8000';
                    fetch(`${baseUrl}/api/auth/logout`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
                        body: JSON.stringify({ token: session.token })
                    }).catch(() => {});
                }
            } catch(e) {}
            localStorage.removeItem('orca_auth_session');
            window.location.replace('login.html');
        }
    };

    // High-Sunlight Outdoor Contrast Mode Toggle
    window.toggleSunlightMode = function() {
        isSunlightMode = !isSunlightMode;
        localStorage.setItem('orca_sunlight_mode', isSunlightMode ? 'true' : 'false');
        applySunlightMode();
    };

    function applySunlightMode() {
        if (isSunlightMode) {
            document.documentElement.classList.add('orca-sunlight-contrast');
        } else {
            document.documentElement.classList.remove('orca-sunlight-contrast');
        }
        const btn = document.getElementById('btn-sunlight-toggle');
        if (btn) {
            btn.className = isSunlightMode 
                ? "flex items-center gap-1 font-mono text-[10px] bg-amber-400 text-black font-extrabold px-2.5 py-0.5 rounded shadow cursor-pointer border border-white"
                : "flex items-center gap-1 font-mono text-[10px] bg-white/10 hover:bg-white/20 text-yellow-300 px-2 py-0.5 rounded cursor-pointer";
        }
    }

    // Inject High-Sunlight CSS once
    function injectSunlightStyles() {
        if (document.getElementById('orca-sunlight-styles')) return;
        const style = document.createElement('style');
        style.id = 'orca-sunlight-styles';
        style.textContent = `
            html.orca-sunlight-contrast body {
                filter: contrast(135%) saturate(120%) !important;
                background-color: #ffffff !important;
                color: #000000 !important;
                font-weight: 500 !important;
            }
            html.orca-sunlight-contrast .bg-white,
            html.orca-sunlight-contrast .bg-slate-50 {
                border-color: #000000 !important;
                border-width: 2px !important;
                box-shadow: 0 4px 0 #000000 !important;
            }
            html.orca-sunlight-contrast button,
            html.orca-sunlight-contrast a {
                font-weight: 700 !important;
            }
        `;
        document.head.appendChild(style);
    }

    // 1.5. Inject Global Mobile-Friendly Viewport & Overflow-X Prevention CSS
    (function injectGlobalMobileStyles() {
        if (document.getElementById('orca-mobile-viewport-styles')) return;
        const style = document.createElement('style');
        style.id = 'orca-mobile-viewport-styles';
        style.textContent = `
            *, *:before, *:after {
                box-sizing: border-box !important;
            }
            html, body {
                overflow-x: hidden !important;
                max-width: 100vw !important;
                width: 100% !important;
                position: relative;
                margin: 0;
                padding: 0;
            }
            @media screen and (max-width: 640px) {
                input, select, textarea {
                    font-size: 16px !important;
                }
            }
        `;
        document.head.appendChild(style);
    })();

    // 2. Identify Current Page
    function getCurrentPageName() {
        const path = window.location.pathname;
        const file = path.split('/').pop() || 'index.html';
        if (file === '' || file === '/') return 'index.html';
        return file.toLowerCase();
    }

    const currentPage = getCurrentPageName();

    // 3. Render Top Navigation Bar (Utility Bar + Main Navbar)
    function renderTopNav() {
        const mount = document.getElementById('orca-header-mount');
        if (!mount) return;

        const portOptions = Object.values(window.PORT_COORDINATES || {}).map(p => {
            const selected = (p.id === currentPort) ? 'selected' : '';
            return `<option value="${p.id}" ${selected}>${p.name} - ${p.state}</option>`;
        }).join('');

        const mainNavItems = [
            { href: 'index.html', label: 'Home', icon: 'home' },
            { href: 'advisor.html', label: 'AI Advisor', icon: 'psychology' },
            { href: 'map.html', label: 'Ocean GIS', icon: 'explore' },
            { href: 'weather.html', label: 'Weather', icon: 'air' },
            { href: 'sos.html', label: 'Emergency SOS', icon: 'emergency', isDanger: true }
        ];

        const moreNavItems = [
            { href: 'catch_log.html', label: 'Catch Diary & Diesel', icon: 'menu_book' },
            { href: 'market.html', label: 'Daily Fish Mandi Rates', icon: 'storefront' },
            { href: 'regulations.html', label: 'Marine Protected Laws', icon: 'gavel' },
            { href: 'command_center.html', label: 'Coast Guard Command Console', icon: 'monitoring' }
        ];

        const navPillsHtml = mainNavItems.map(item => {
            const isActive = (currentPage === item.href);
            if (item.isDanger) {
                return `
                    <a href="${item.href}" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                        isActive ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }">
                        <span class="material-symbols-outlined text-sm">emergency</span>
                        <span>${item.label}</span>
                    </a>
                `;
            }
            return `
                <a href="${item.href}" class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive ? 'bg-[#00264b] text-white shadow-xs' : 'text-slate-600 hover:text-[#00264b] hover:bg-slate-100'
                }">
                    <span class="material-symbols-outlined text-sm">${item.icon}</span>
                    <span>${item.label}</span>
                </a>
            `;
        }).join('');

        const moreDropdownHtml = `
            <div class="relative group">
                <button class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#00264b] hover:bg-slate-100 transition-all cursor-pointer">
                    <span class="material-symbols-outlined text-sm">more_horiz</span>
                    <span>More</span>
                    <span class="material-symbols-outlined text-xs">expand_more</span>
                </button>
                <div class="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 hidden group-hover:block z-50">
                    ${moreNavItems.map(m => `
                        <a href="${m.href}" class="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 transition-colors">
                            <span class="material-symbols-outlined text-sm text-cyan-700">${m.icon}</span>
                            <span>${m.label}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;

        mount.innerHTML = `
            <!-- 🇮🇳 Top Government of India & ISRO Utility Bar (Zero Mobile Overflow) -->
            <div class="bg-[#00172e] text-slate-300 text-[10px] sm:text-[11px] px-2.5 sm:px-6 py-1 border-b border-white/10 flex items-center justify-between gap-1.5 w-full overflow-hidden">
                <div class="flex items-center gap-1.5 min-w-0">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                    <span class="font-semibold text-white tracking-wide truncate max-w-[155px] xs:max-w-[210px] sm:max-w-none">
                        <span class="hidden sm:inline">Department of Space · </span>ISRO MOSDAC
                    </span>
                    <span class="hidden md:inline text-white/30">|</span>
                    <span class="hidden md:inline text-cyan-300/90 font-mono">SIH #26176</span>
                    <span class="hidden xl:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300 ml-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        NavIC: 7 L5/S Locked
                    </span>
                </div>
                <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <!-- High-Sunlight Contrast Mode Button -->
                    <button
                        id="btn-sunlight-toggle"
                        onclick="window.toggleSunlightMode()"
                        title="Toggle High-Sunlight Outdoor Contrast Mode"
                        class="flex items-center gap-1 font-mono text-[9px] sm:text-[10px] bg-white/10 hover:bg-white/20 text-yellow-300 px-2 py-0.5 rounded cursor-pointer shrink-0"
                    >
                        <span class="material-symbols-outlined text-xs">wb_sunny</span>
                        <span class="hidden xs:inline">SUNLIGHT</span>
                    </button>

                    <!-- Language Switcher -->
                    <div class="flex items-center gap-1 font-mono text-[9px] sm:text-[10px] bg-white/10 px-1.5 sm:px-2 py-0.5 rounded shrink-0">
                        <span class="text-slate-300">LANG:</span>
                        <select onchange="window.setLanguage(this.value)" class="bg-transparent text-white font-bold outline-none cursor-pointer">
                            <option value="en" ${currentLanguage === 'en' ? 'selected' : ''} class="text-black">English</option>
                            <option value="hi" ${currentLanguage === 'hi' ? 'selected' : ''} class="text-black">हिन्दी (Hindi)</option>
                            <option value="ta" ${currentLanguage === 'ta' ? 'selected' : ''} class="text-black">தமிழ் (Tamil)</option>
                            <option value="te" ${currentLanguage === 'te' ? 'selected' : ''} class="text-black">తెలుగు (Telugu)</option>
                            <option value="bn" ${currentLanguage === 'bn' ? 'selected' : ''} class="text-black">বাংলা (Bengali)</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- ⚓ Main Header Navbar (Ultra-Compact on Mobile, Never Shifts Right) -->
            <header class="bg-white border-b border-slate-200 px-2.5 sm:px-6 py-2 shadow-xs sticky top-0 z-40 w-full overflow-hidden">
                <div class="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3 w-full min-w-0">
                    
                    <!-- Left: Brand Logo & Title -->
                    <div class="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
                        <a href="index.html" class="flex items-center gap-2 group">
                            <img src="assets/orca_logo.jpg" alt="ORCA" class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shadow-sm border border-slate-200 group-hover:scale-105 transition-transform shrink-0"/>
                            <div class="flex flex-col min-w-0">
                                <div class="flex items-center gap-1">
                                    <span class="text-sm sm:text-base font-extrabold tracking-tight text-[#00264b]">ORCA</span>
                                    <span class="text-[8px] sm:text-[9px] bg-cyan-50 text-cyan-700 border border-cyan-300 px-1.5 py-0.2 rounded-full font-bold uppercase shrink-0">ISRO AI</span>
                                </div>
                                <span class="hidden md:inline text-[10px] text-slate-500 font-medium -mt-0.5 truncate">Marine Decision Support System</span>
                            </div>
                        </a>
                    </div>

                    <!-- Center / Right: Harbor Selector & Nav Pills -->
                    <div class="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
                        
                        <!-- Base Fishing Harbor Dropdown (Truncated for small phones) -->
                        <div class="flex items-center gap-1 sm:gap-2 bg-slate-50 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 hover:border-cyan-500 transition-colors max-w-[120px] xs:max-w-[155px] sm:max-w-none">
                            <span class="material-symbols-outlined text-cyan-700 text-sm sm:text-base shrink-0">anchor</span>
                            <div class="flex flex-col min-w-0">
                                <span class="hidden sm:inline text-[8px] text-slate-400 uppercase font-bold tracking-wider leading-none">Base Harbor</span>
                                <select onchange="window.switchPort(this.value)" class="orca-port-select bg-transparent text-[11px] sm:text-xs font-bold text-[#00264b] border-none p-0 outline-none cursor-pointer truncate max-w-full">
                                    ${portOptions}
                                </select>
                            </div>
                        </div>

                        <!-- Desktop Nav Pills (hidden on mobile, visible on desktop/laptop) -->
                        <nav class="hidden md:flex items-center gap-1 bg-slate-50/80 p-1 rounded-xl border border-slate-200 shrink-0">
                            ${navPillsHtml}
                            ${moreDropdownHtml}
                        </nav>

                        <!-- Authenticated User Profile Avatar & Logout -->
                        <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            <div class="flex items-center gap-1 sm:gap-1.5 bg-slate-100 text-[#00264b] text-xs font-bold p-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200">
                                <span class="w-6 h-6 rounded-full ${currentRole === 'officer' ? 'bg-blue-700' : 'bg-[#00264b]'} text-white flex items-center justify-center text-[10px] shrink-0">
                                    <span class="material-symbols-outlined text-xs">${currentRole === 'officer' ? 'local_police' : 'sailing'}</span>
                                </span>
                                <div class="hidden sm:flex flex-col text-left min-w-0">
                                    <span class="orca-username-badge font-bold leading-tight max-w-[90px] truncate">${currentUsername}</span>
                                    <span class="text-[8px] text-cyan-800 font-mono leading-none">${currentVessel || (currentRole === 'officer' ? 'Coast Guard' : 'Fisherman')}</span>
                                </div>
                            </div>
                            <button onclick="window.orcaLogout()" title="Secure Logout" class="flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold w-7 h-7 sm:w-auto sm:h-auto sm:px-2 sm:py-1.5 rounded-lg border border-rose-200 transition-colors cursor-pointer shrink-0">
                                <span class="material-symbols-outlined text-xs sm:text-sm">logout</span>
                                <span class="hidden xl:inline text-[10px] ml-1">Logout</span>
                            </button>
                        </div>

                    </div>
                </div>
            </header>
        `;

        applySunlightMode();
    }

    // 4. Render Mobile & Tablet Sticky 5-Tab Bottom Navigation Bar (< 768px)
    function renderMobileBottomNav() {
        const mount = document.getElementById('orca-bottom-nav-mount');
        if (!mount) return;

        const mobileTabs = [
            { href: 'index.html', label: 'Home', icon: 'home' },
            { href: 'advisor.html', label: 'Advisor', icon: 'psychology' },
            { href: 'map.html', label: 'GIS Map', icon: 'explore' },
            { href: 'weather.html', label: 'Weather', icon: 'air' },
            { href: 'sos.html', label: 'SOS', icon: 'emergency', isSos: true }
        ];

        const tabsHtml = mobileTabs.map(tab => {
            const isActive = (currentPage === tab.href) || 
                             (currentPage === '' && tab.href === 'index.html') ||
                             (currentPage === '/' && tab.href === 'index.html');

            if (tab.isSos) {
                return `
                    <a href="${tab.href}" class="relative flex flex-col items-center justify-center flex-1 py-1 group">
                        <div class="w-10 h-10 -mt-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                            <span class="material-symbols-outlined text-xl">emergency</span>
                        </div>
                        <span class="text-[10px] font-extrabold text-rose-600 tracking-wider mt-0.5">SOS</span>
                    </a>
                `;
            }

            return `
                <a href="${tab.href}" class="flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors ${
                    isActive ? 'text-[#00264b]' : 'text-slate-400 hover:text-slate-600'
                }">
                    <div class="relative">
                        <span class="material-symbols-outlined text-xl ${isActive ? 'text-cyan-600 font-bold' : ''}">${tab.icon}</span>
                        ${isActive ? '<span class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-600"></span>' : ''}
                    </div>
                    <span class="text-[10px] font-semibold mt-0.5 ${isActive ? 'text-[#00264b] font-bold' : ''}">${tab.label}</span>
                </a>
            `;
        }).join('');

        mount.innerHTML = `
            <!-- Mobile Quick Sections Floating Action Row (< 768px) -->
            <div class="md:hidden fixed bottom-[calc(3.4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 px-3 py-1 bg-slate-900/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between text-[11px] text-white">
                <div class="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5 w-full">
                    <a href="catch_log.html" class="flex items-center gap-1 text-cyan-300 font-bold whitespace-nowrap hover:text-white">
                        <span class="material-symbols-outlined text-xs">menu_book</span>
                        <span>Catch Diary</span>
                    </a>
                    <span class="text-white/20">|</span>
                    <a href="market.html" class="flex items-center gap-1 text-amber-300 font-bold whitespace-nowrap hover:text-white">
                        <span class="material-symbols-outlined text-xs">storefront</span>
                        <span>Mandi Rates</span>
                    </a>
                    <span class="text-white/20">|</span>
                    <a href="regulations.html" class="flex items-center gap-1 text-emerald-300 font-bold whitespace-nowrap hover:text-white">
                        <span class="material-symbols-outlined text-xs">gavel</span>
                        <span>Rules</span>
                    </a>
                    <span class="text-white/20">|</span>
                    <a href="command_center.html" class="flex items-center gap-1 text-slate-300 font-bold whitespace-nowrap hover:text-white">
                        <span class="material-symbols-outlined text-xs">monitoring</span>
                        <span>Command</span>
                    </a>
                    <span class="text-white/20">|</span>
                    <button onclick="window.orcaLogout()" class="flex items-center gap-1 text-rose-300 font-bold whitespace-nowrap hover:text-white cursor-pointer">
                        <span class="material-symbols-outlined text-xs">logout</span>
                        <span>Exit</span>
                    </button>
                </div>
            </div>

            <!-- Sticky 5-Tab Bottom Bar (Safe Area Padding for iPhone Home Indicator & Android Gestures) -->
            <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around">
                ${tabsHtml}
            </nav>
        `;
    }

    // 5. PWA Service Worker Registration
    function registerServiceWorker() {
        if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(reg => console.log('[ORCA PWA] Service Worker Active. Scope:', reg.scope))
                    .catch(err => console.warn('[ORCA PWA] SW registration notice:', err));
            });
        }
    }

    // Auto-Mount on DOM Load
    document.addEventListener('DOMContentLoaded', () => {
        injectSunlightStyles();
        renderTopNav();
        renderMobileBottomNav();
        registerServiceWorker();
    });

})();
