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

            <!-- ⚓ Main Header Navbar (Ultra-Compact on Mobile with Top-Side Menu Drawer) -->
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

                    <!-- Center / Right: Desktop Navbar & Mobile Quick Actions -->
                    <div class="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
                        
                        <!-- Desktop: Base Fishing Harbor Dropdown -->
                        <div class="hidden md:flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-cyan-500 transition-colors">
                            <span class="material-symbols-outlined text-cyan-700 text-base shrink-0">anchor</span>
                            <div class="flex flex-col min-w-0">
                                <span class="text-[8px] text-slate-400 uppercase font-bold tracking-wider leading-none">Base Harbor</span>
                                <select onchange="window.switchPort(this.value)" class="orca-port-select bg-transparent text-xs font-bold text-[#00264b] border-none p-0 outline-none cursor-pointer truncate max-w-full">
                                    ${portOptions}
                                </select>
                            </div>
                        </div>

                        <!-- Desktop Nav Pills (hidden on mobile, visible on desktop/laptop) -->
                        <nav class="hidden md:flex items-center gap-1 bg-slate-50/80 p-1 rounded-xl border border-slate-200 shrink-0">
                            ${navPillsHtml}
                            ${moreDropdownHtml}
                        </nav>

                        <!-- Desktop: User Profile & Logout -->
                        <div class="hidden md:flex items-center gap-1.5 shrink-0">
                            <div class="flex items-center gap-1.5 bg-slate-100 text-[#00264b] text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200">
                                <span class="w-5 h-5 rounded-full ${currentRole === 'officer' ? 'bg-blue-700' : 'bg-[#00264b]'} text-white flex items-center justify-center text-[10px] shrink-0">
                                    <span class="material-symbols-outlined text-xs">${currentRole === 'officer' ? 'local_police' : 'sailing'}</span>
                                </span>
                                <div class="flex flex-col text-left min-w-0">
                                    <span class="orca-username-badge font-bold leading-tight max-w-[90px] truncate">${currentUsername}</span>
                                    <span class="text-[8px] text-cyan-800 font-mono leading-none">${currentVessel || (currentRole === 'officer' ? 'Coast Guard' : 'Fisherman')}</span>
                                </div>
                            </div>
                            <button onclick="window.orcaLogout()" title="Secure Logout" class="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1.5 rounded-lg border border-rose-200 transition-colors cursor-pointer shrink-0">
                                <span class="material-symbols-outlined text-xs">logout</span>
                                <span class="hidden xl:inline text-[10px]">Logout</span>
                            </button>
                        </div>

                        <!-- 📱 Mobile Top Quick Harbor Selector (Compact Pill on Mobile) -->
                        <button onclick="window.toggleMobileDrawer('harbor-section')" class="md:hidden flex items-center gap-1 bg-cyan-50 text-cyan-900 px-2 py-1 rounded-lg border border-cyan-300 text-xs font-bold max-w-[125px] xs:max-w-[155px] cursor-pointer" title="Switch Operational Base Harbor">
                            <span class="material-symbols-outlined text-cyan-700 text-sm shrink-0">anchor</span>
                            <span class="truncate uppercase text-[10px]">${(window.PORT_COORDINATES && window.PORT_COORDINATES[currentPort] ? window.PORT_COORDINATES[currentPort].name.split(' ')[0] : 'Port')}</span>
                        </button>

                        <!-- 📱 Mobile Top-Side Menu Drawer Button (Hamburger) -->
                        <button onclick="window.toggleMobileDrawer()" class="md:hidden w-8 h-8 rounded-lg bg-[#00264b] hover:bg-[#003870] active:scale-95 text-white flex items-center justify-center shadow-xs cursor-pointer shrink-0" aria-label="Open Mobile Menu Sections">
                            <span class="material-symbols-outlined text-lg">menu</span>
                        </button>

                    </div>
                </div>
            </header>

            <!-- ========================================================================= -->
            <!-- 📱 SLIDING OFF-CANVAS MOBILE DRAWER WITH ORGANIZED SECTIONS -->
            <!-- ========================================================================= -->
            <div id="orca-drawer-backdrop" onclick="window.closeMobileDrawer()" class="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 transition-opacity duration-300 opacity-0 pointer-events-none"></div>

            <aside id="orca-drawer-panel" class="fixed top-0 right-0 bottom-0 w-[84%] max-w-[340px] bg-[#001428] text-white z-50 shadow-2xl flex flex-col justify-between transform translate-x-full transition-transform duration-300 ease-in-out border-l border-white/10 overflow-hidden">
                
                <!-- Drawer Top Header -->
                <div class="px-4 py-3 bg-[#001f3f] border-b border-white/10 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-2 min-w-0">
                        <img src="assets/orca_logo.jpg" alt="ORCA" class="w-7 h-7 rounded-lg object-cover ring-1 ring-cyan-400/50 shrink-0"/>
                        <div class="flex flex-col min-w-0">
                            <span class="text-xs font-black tracking-wider text-white uppercase truncate">ORCA PORTAL MENU</span>
                            <span class="text-[9px] text-cyan-300 font-mono">ISRO SIH #26176</span>
                        </div>
                    </div>
                    <button onclick="window.closeMobileDrawer()" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer shrink-0" aria-label="Close Menu">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <!-- Scrollable Body with Categorized Sections -->
                <div class="flex-1 overflow-y-auto p-3.5 flex flex-col gap-4 smooth-scroll text-slate-100">
                    
                    <!-- 👤 SECTION 1: Active User Profile & Vessel Identity -->
                    <div class="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-300">User Identity</span>
                            <span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">Online</span>
                        </div>
                        <div class="flex items-center gap-2.5">
                            <div class="w-10 h-10 rounded-xl ${currentRole === 'officer' ? 'bg-blue-600' : 'bg-cyan-600'} text-white flex items-center justify-center text-base font-bold shadow-md shrink-0">
                                <span class="material-symbols-outlined text-xl">${currentRole === 'officer' ? 'local_police' : 'sailing'}</span>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="text-xs font-bold text-white truncate">${currentUsername}</div>
                                <div class="text-[10px] text-cyan-200/80 font-mono truncate">${currentVessel || (currentRole === 'officer' ? 'Coast Guard Official' : 'Registered Fisher')}</div>
                                <div class="text-[9px] text-slate-400 capitalize mt-0.5 flex items-center gap-1">
                                    <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Role: ${currentRole === 'officer' ? 'Coast Guard' : 'Fisherman'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ⚓ SECTION 2: Operational Base Harbor -->
                    <div id="harbor-section" class="flex flex-col gap-1.5">
                        <div class="flex items-center justify-between px-1">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-200 flex items-center gap-1">
                                <span class="material-symbols-outlined text-xs text-cyan-400">anchor</span> Operational Harbor
                            </span>
                            <span class="text-[9px] font-mono text-cyan-300">${currentPort}</span>
                        </div>
                        <div class="relative">
                            <select onchange="window.switchPort(this.value); window.closeMobileDrawer();" class="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-xs text-cyan-100 font-semibold outline-none focus:border-cyan-400">
                                ${portOptions}
                            </select>
                        </div>
                    </div>

                    <!-- 🧭 SECTION 3: Core Maritime Navigation Hub -->
                    <div class="flex flex-col gap-1.5">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-200/70 px-1 flex items-center gap-1">
                            <span class="material-symbols-outlined text-xs text-cyan-400">explore</span> Core Navigation
                        </span>
                        <div class="flex flex-col gap-1">
                            <a href="index.html" onclick="window.closeMobileDrawer()" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${currentPage === 'index.html' ? 'bg-cyan-600 text-white font-bold shadow-md' : 'bg-white/5 hover:bg-white/10 text-slate-200'}">
                                <span class="material-symbols-outlined text-base text-cyan-300">home</span>
                                <span>Operations Home</span>
                            </a>
                            <a href="advisor.html" onclick="window.closeMobileDrawer()" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${currentPage === 'advisor.html' ? 'bg-cyan-600 text-white font-bold shadow-md' : 'bg-white/5 hover:bg-white/10 text-slate-200'}">
                                <span class="material-symbols-outlined text-base text-cyan-300">psychology</span>
                                <span>AI Decision Assistant</span>
                            </a>
                            <a href="map.html" onclick="window.closeMobileDrawer()" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${currentPage === 'map.html' ? 'bg-cyan-600 text-white font-bold shadow-md' : 'bg-white/5 hover:bg-white/10 text-slate-200'}">
                                <span class="material-symbols-outlined text-base text-cyan-300">map</span>
                                <span>Ocean GIS &amp; PFZ Chart</span>
                            </a>
                            <a href="weather.html" onclick="window.closeMobileDrawer()" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${currentPage === 'weather.html' ? 'bg-cyan-600 text-white font-bold shadow-md' : 'bg-white/5 hover:bg-white/10 text-slate-200'}">
                                <span class="material-symbols-outlined text-base text-cyan-300">air</span>
                                <span>Marine Weather &amp; Waves</span>
                            </a>
                            <a href="sos.html" onclick="window.closeMobileDrawer()" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${currentPage === 'sos.html' ? 'bg-rose-600 text-white shadow-md' : 'bg-rose-950/60 border border-rose-500/40 text-rose-200 hover:bg-rose-900'}">
                                <div class="flex items-center gap-2.5">
                                    <span class="material-symbols-outlined text-base text-rose-400">emergency</span>
                                    <span>Emergency SOS Beacon</span>
                                </div>
                                <span class="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded font-mono">1554</span>
                            </a>
                        </div>
                    </div>

                    <!-- 🎣 SECTION 4: Fisheries & Field Utilities -->
                    <div class="flex flex-col gap-1.5">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-200/70 px-1 flex items-center gap-1">
                            <span class="material-symbols-outlined text-xs text-amber-400">sailing</span> Field &amp; Market Tools
                        </span>
                        <div class="flex flex-col gap-1">
                            <a href="catch_log.html" onclick="window.closeMobileDrawer()" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${currentPage === 'catch_log.html' ? 'bg-cyan-600 text-white font-bold shadow-md' : 'bg-white/5 hover:bg-white/10 text-slate-200'}">
                                <span class="material-symbols-outlined text-base text-cyan-300">menu_book</span>
                                <span>Catch Diary &amp; Diesel Log</span>
                            </a>
                            <a href="market.html" onclick="window.closeMobileDrawer()" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${currentPage === 'market.html' ? 'bg-cyan-600 text-white font-bold shadow-md' : 'bg-white/5 hover:bg-white/10 text-slate-200'}">
                                <span class="material-symbols-outlined text-base text-amber-300">storefront</span>
                                <span>Daily Fish Mandi Rates</span>
                            </a>
                            <a href="regulations.html" onclick="window.closeMobileDrawer()" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${currentPage === 'regulations.html' ? 'bg-cyan-600 text-white font-bold shadow-md' : 'bg-white/5 hover:bg-white/10 text-slate-200'}">
                                <span class="material-symbols-outlined text-base text-emerald-300">gavel</span>
                                <span>Marine Laws &amp; Ban Dates</span>
                            </a>
                            <a href="command_center.html" onclick="window.closeMobileDrawer()" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${currentPage === 'command_center.html' ? 'bg-cyan-600 text-white font-bold shadow-md' : 'bg-white/5 hover:bg-white/10 text-slate-200'}">
                                <span class="material-symbols-outlined text-base text-slate-300">monitoring</span>
                                <span>Command Console</span>
                            </a>
                        </div>
                    </div>

                    <!-- ⚙️ SECTION 5: Preferences & Telemetry -->
                    <div class="flex flex-col gap-2 pt-1 border-t border-white/10">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-200/70 px-1">Settings &amp; Sensors</span>
                        <div class="grid grid-cols-2 gap-2">
                            <button onclick="window.toggleSunlightMode()" class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs flex items-center justify-center gap-1.5 text-yellow-300 cursor-pointer">
                                <span class="material-symbols-outlined text-sm">wb_sunny</span>
                                <span class="text-[11px] font-bold">Sunlight Mode</span>
                            </button>
                            <div class="px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                                <span class="text-[10px] text-slate-300 font-mono">LANG:</span>
                                <select onchange="window.setLanguage(this.value)" class="bg-transparent text-white font-bold text-xs outline-none cursor-pointer">
                                    <option value="en" ${currentLanguage === 'en' ? 'selected' : ''} class="text-black">EN</option>
                                    <option value="hi" ${currentLanguage === 'hi' ? 'selected' : ''} class="text-black">हिन्दी</option>
                                    <option value="ta" ${currentLanguage === 'ta' ? 'selected' : ''} class="text-black">தமிழ்</option>
                                    <option value="te" ${currentLanguage === 'te' ? 'selected' : ''} class="text-black">తెలుగు</option>
                                    <option value="bn" ${currentLanguage === 'bn' ? 'selected' : ''} class="text-black">বাংলা</option>
                                </select>
                            </div>
                        </div>

                        <!-- NavIC Satellites Status -->
                        <div class="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2 flex items-center justify-between">
                            <div class="flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span class="text-[10px] text-emerald-200 font-mono">NavIC Constellation</span>
                            </div>
                            <span class="text-[10px] font-mono text-emerald-300 font-bold">7 L5/S Locked</span>
                        </div>
                    </div>

                </div>

                <!-- 🚪 SECTION 6: Logout & Exit (Bottom Fixed) -->
                <div class="p-3 bg-[#000d1a] border-t border-white/10 flex items-center justify-between shrink-0">
                    <button onclick="window.orcaLogout()" class="w-full py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md">
                        <span class="material-symbols-outlined text-sm">logout</span>
                        <span>Sign Out of ORCA</span>
                    </button>
                </div>

            </aside>
        `;

        applySunlightMode();
    }

    // Mobile Drawer Controls
    window.toggleMobileDrawer = function(targetSectionId) {
        const backdrop = document.getElementById('orca-drawer-backdrop');
        const panel = document.getElementById('orca-drawer-panel');
        if (!panel || !backdrop) return;

        const isClosed = panel.classList.contains('translate-x-full');
        if (isClosed) {
            backdrop.classList.remove('opacity-0', 'pointer-events-none');
            backdrop.classList.add('opacity-100');
            panel.classList.remove('translate-x-full');
            panel.classList.add('translate-x-0');
            document.body.style.overflow = 'hidden';

            if (targetSectionId) {
                setTimeout(() => {
                    const sec = document.getElementById(targetSectionId);
                    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);
            }
        } else {
            window.closeMobileDrawer();
        }
    };

    window.closeMobileDrawer = function() {
        const backdrop = document.getElementById('orca-drawer-backdrop');
        const panel = document.getElementById('orca-drawer-panel');
        if (!panel || !backdrop) return;

        backdrop.classList.remove('opacity-100');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
        panel.classList.remove('translate-x-0');
        panel.classList.add('translate-x-full');
        document.body.style.overflow = '';
    };

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
