/**
 * ORCA Maritime Platform — Shared Navigation, PWA, & Cross-Page State Engine
 * Unifies Top Utility Bar, Desktop Nav, Mobile Sticky Bottom Nav, High-Sunlight Mode, and LocalStorage State.
 */

(function() {
    // 1. Initialize State from LocalStorage
    const DEFAULT_PORT = 'goa';
    let currentPort = localStorage.getItem('orca_active_port') || DEFAULT_PORT;
    if (!window.PORT_COORDINATES || !window.PORT_COORDINATES[currentPort]) {
        currentPort = DEFAULT_PORT;
    }
    localStorage.setItem('orca_active_port', currentPort);

    let currentUsername = localStorage.getItem('orca_username') || 'Capt. Murugan';
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

        const langButtons = [
            { code: 'hi', label: 'हिन्दी' },
            { code: 'ta', label: 'தமிழ்' },
            { code: 'te', label: 'తెలుగు' },
            { code: 'bn', label: 'বাংলা' },
            { code: 'en', label: 'EN' }
        ].map(l => {
            const isSel = (currentLanguage === l.code);
            return `<button onclick="window.setLanguage('${l.code}')" class="px-2 py-0.5 rounded text-[11px] font-bold transition-all ${isSel ? 'bg-white text-[#00264b] shadow-xs' : 'text-white/80 hover:text-white hover:bg-white/10'}">${l.label}</button>`;
        }).join('');

        const mainNavItems = [
            { href: 'index.html', label: 'Home', icon: 'home' },
            { href: 'advisor.html', label: 'Ask ORCA', icon: 'psychology' },
            { href: 'map.html', label: 'Ocean GIS', icon: 'explore' },
            { href: 'weather.html', label: 'Weather & Waves', icon: 'air' },
            { href: 'sos.html', label: 'SOS Rescue', icon: 'emergency', isSos: true },
            { href: 'command_center.html', label: 'Command Console', icon: 'monitoring' }
        ];

        const moreNavItems = [
            { href: 'catch_log.html', label: 'Catch Diary & Diesel', icon: 'menu_book' },
            { href: 'market.html', label: 'Daily Fish Mandi Rates', icon: 'storefront' },
            { href: 'regulations.html', label: 'Marine Protected Laws', icon: 'gavel' }
        ];

        const isMoreActive = moreNavItems.some(item => currentPage === item.href);

        const navPillsHtml = mainNavItems.map(item => {
            const isActive = (currentPage === item.href) || 
                             (currentPage === '' && item.href === 'index.html') ||
                             (currentPage === '/' && item.href === 'index.html');
            
            if (item.isSos) {
                return `
                    <a href="${item.href}" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                        isActive 
                            ? 'bg-rose-600 text-white shadow-rose-600/30' 
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200'
                    }">
                        <span class="material-symbols-outlined text-sm ${isActive ? '' : 'text-rose-600'}">emergency</span>
                        <span>SOS Rescue</span>
                    </a>
                `;
            }

            return `
                <a href="${item.href}" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                        ? 'bg-[#00264b] text-white shadow-xs'
                        : 'text-slate-700 hover:text-[#00264b] hover:bg-slate-100'
                }">
                    <span class="material-symbols-outlined text-sm ${isActive ? 'text-cyan-300' : 'text-slate-500'}">${item.icon}</span>
                    <span>${item.label}</span>
                </a>
            `;
        }).join('');

        // Dropdown for Additional Sections
        const moreDropdownHtml = `
            <div class="relative group">
                <button type="button" class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isMoreActive 
                        ? 'bg-[#00264b] text-white shadow-sm' 
                        : 'text-slate-700 hover:text-[#00264b] hover:bg-slate-100'
                }">
                    <span class="material-symbols-outlined text-sm ${isMoreActive ? 'text-cyan-300' : 'text-slate-500'}">more_vert</span>
                    <span>More</span>
                    <span class="material-symbols-outlined text-xs">expand_more</span>
                </button>
                <div class="hidden group-hover:block absolute right-0 top-full pt-1 w-56 z-50 animate-in fade-in duration-100">
                    <div class="bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5">
                        ${moreNavItems.map(item => {
                            const isItemActive = currentPage === item.href;
                            return `
                                <a href="${item.href}" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                                    isItemActive 
                                        ? 'bg-cyan-50 text-cyan-800' 
                                        : 'text-slate-700 hover:bg-slate-100 hover:text-[#00264b]'
                                }">
                                    <span class="material-symbols-outlined text-base text-cyan-600">${item.icon}</span>
                                    <span>${item.label}</span>
                                </a>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        mount.innerHTML = `
            <!-- 🇮🇳 Top Government of India & ISRO Utility Bar -->
            <div class="bg-[#00264b] text-white text-[11px] px-3 sm:px-6 py-1.5 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-cyan-300 text-sm">shield</span>
                    <span class="inline-flex items-center gap-1.5 font-bold tracking-wide uppercase">
                        GOVERNMENT OF INDIA | भारत सरकार | ISRO Earth Observation Marine Operations
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="flex items-center gap-1 font-mono">
                        ${langButtons}
                    </div>
                </div>
            </div>

            <!-- ⚓ Main Desktop & Laptop Header Navbar -->
            <header class="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 shadow-xs sticky top-0 z-40">
                <div class="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    
                    <!-- Left: Brand Logo & Title -->
                    <div class="flex items-center gap-3">
                        <a href="index.html" class="flex items-center gap-2.5 group">
                            <img src="assets/orca_logo.jpg" alt="ORCA" class="w-9 h-9 rounded-xl object-cover shadow-sm border border-slate-200 group-hover:scale-105 transition-transform"/>
                            <div class="flex flex-col">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-base font-black tracking-tight text-[#00264b]">ORCA</span>
                                    <span class="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">ISRO</span>
                                </div>
                                <span class="hidden sm:inline text-[10px] text-slate-500 font-medium -mt-0.5">AI Marine Decision Support Platform</span>
                            </div>
                        </a>
                    </div>

                    <!-- Center / Right: Harbor Selector & Nav Pills -->
                    <div class="flex items-center gap-2.5">
                        
                        <!-- Desktop Nav Pills (hidden on mobile, visible on desktop/laptop) -->
                        <nav class="hidden md:flex items-center gap-1">
                            ${navPillsHtml}
                            ${moreDropdownHtml}
                        </nav>

                        <!-- Base Fishing Harbor Dropdown -->
                        <div class="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-cyan-500 transition-colors">
                            <span class="material-symbols-outlined text-cyan-700 text-base">anchor</span>
                            <select onchange="window.switchPort(this.value)" class="orca-port-select bg-transparent text-xs font-bold text-[#00264b] border-none p-0 outline-none cursor-pointer">
                                ${portOptions}
                            </select>
                        </div>

                        <!-- User Profile Badge -->
                        <button onclick="window.changeUsername()" title="Change Registered Vessel / Username" class="flex items-center gap-1.5 bg-[#00264b] hover:bg-[#003870] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors">
                            <span class="material-symbols-outlined text-xs">person</span>
                            <span class="orca-username-badge font-mono">${currentUsername}</span>
                        </button>

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
            <div class="md:hidden fixed bottom-14 left-0 right-0 z-40 px-3 py-1 bg-slate-900/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between text-[11px] text-white">
                <div class="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
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
                </div>
            </div>

            <!-- Sticky 5-Tab Bottom Bar -->
            <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl px-2 py-1.5 flex items-center justify-around">
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
