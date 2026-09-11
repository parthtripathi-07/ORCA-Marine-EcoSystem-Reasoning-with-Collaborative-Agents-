/**
 * ORCA Maritime Platform — Shared Navigation & Cross-Page State Engine
 * Unifies Top Utility Bar, Desktop Nav, Mobile Sticky Bottom Nav, and LocalStorage State.
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

        const navItems = [
            { href: 'index.html', label: 'Home', icon: 'home', id: 'nav-home' },
            { href: 'advisor.html', label: 'AI Advisor', icon: 'psychology', id: 'nav-advisor' },
            { href: 'map.html', label: 'Ocean GIS', icon: 'explore', id: 'nav-map' },
            { href: 'weather.html', label: 'Marine Weather', icon: 'air', id: 'nav-weather' },
            { href: 'sos.html', label: 'Emergency SOS', icon: 'emergency', id: 'nav-sos', isDanger: true },
            { href: 'command_center.html', label: 'Command Console', icon: 'monitoring', id: 'nav-cmd' }
        ];

        const navPillsHtml = navItems.map(item => {
            const isActive = (currentPage === item.href) || 
                             (currentPage === '' && item.href === 'index.html') ||
                             (currentPage === '/' && item.href === 'index.html');
            
            if (item.isDanger) {
                return `
                    <a href="${item.href}" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                        isActive 
                            ? 'bg-rose-600 text-white shadow-rose-600/30' 
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200'
                    }">
                        <span class="material-symbols-outlined text-sm ${isActive ? '' : 'text-rose-600'}">emergency</span>
                        <span>SOS</span>
                    </a>
                `;
            }

            return `
                <a href="${item.href}" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                        ? 'bg-[#00264b] text-white shadow-sm'
                        : 'text-slate-600 hover:text-[#00264b] hover:bg-slate-100'
                }">
                    <span class="material-symbols-outlined text-sm ${isActive ? 'text-cyan-300' : 'text-slate-500'}">${item.icon}</span>
                    <span>${item.label}</span>
                </a>
            `;
        }).join('');

        mount.innerHTML = `
            <!-- 🇮🇳 Top Government of India & ISRO Utility Bar -->
            <div class="bg-[#00172e] text-slate-300 text-[11px] px-3 sm:px-6 py-1 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 font-semibold text-white tracking-wide">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Department of Space · Indian Space Research Organisation (ISRO)
                    </span>
                    <span class="hidden md:inline text-white/30">|</span>
                    <span class="hidden md:inline text-cyan-300/90 font-mono">Smart India Hackathon #26176</span>
                </div>
                <div class="flex items-center gap-2.5">
                    <div class="flex items-center gap-1 font-mono text-[10px] bg-white/10 px-2 py-0.5 rounded">
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

            <!-- ⚓ Main Desktop & Laptop Header Navbar -->
            <header class="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 shadow-xs sticky top-0 z-40">
                <div class="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    
                    <!-- Left: Brand Logo & Title -->
                    <div class="flex items-center gap-3">
                        <a href="index.html" class="flex items-center gap-2.5 group">
                            <img src="assets/orca_logo.jpg" alt="ORCA" class="w-9 h-9 rounded-xl object-cover shadow-sm border border-slate-200 group-hover:scale-105 transition-transform"/>
                            <div class="flex flex-col">
                                <div class="flex items-center gap-2">
                                    <span class="text-base font-extrabold tracking-tight text-[#00264b]">ORCA</span>
                                    <span class="text-[9px] bg-cyan-50 text-cyan-700 border border-cyan-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">ISRO AI · Live</span>
                                </div>
                                <span class="hidden sm:inline text-[10px] text-slate-500 font-medium -mt-0.5">Marine EcoSystem Reasoning with Collaborative Agents</span>
                            </div>
                        </a>
                    </div>

                    <!-- Center / Right: Harbor Selector & Nav Pills -->
                    <div class="flex items-center gap-2.5">
                        
                        <!-- Base Fishing Harbor Dropdown -->
                        <div class="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-cyan-500 transition-colors">
                            <span class="material-symbols-outlined text-cyan-700 text-base">anchor</span>
                            <div class="flex flex-col">
                                <span class="text-[8px] text-slate-400 uppercase font-bold tracking-wider leading-none">Base Harbor</span>
                                <select onchange="window.switchPort(this.value)" class="orca-port-select bg-transparent text-xs font-bold text-[#00264b] border-none p-0 outline-none cursor-pointer">
                                    ${portOptions}
                                </select>
                            </div>
                        </div>

                        <!-- Desktop Nav Pills (hidden on mobile, visible on desktop/laptop) -->
                        <nav class="hidden md:flex items-center gap-1 bg-slate-50/80 p-1 rounded-xl border border-slate-200">
                            ${navPillsHtml}
                        </nav>

                        <!-- User Profile Badge -->
                        <button onclick="window.changeUsername()" title="Change Registered Vessel / Username" class="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-[#00264b] text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
                            <span class="w-5 h-5 rounded-full bg-[#00264b] text-white flex items-center justify-center text-[10px]">
                                <span class="material-symbols-outlined text-xs">person</span>
                            </span>
                            <span class="orca-username-badge hidden lg:inline max-w-[110px] truncate">${currentUsername}</span>
                        </button>

                    </div>
                </div>
            </header>
        `;
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
            <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl px-2 py-1.5 flex items-center justify-around">
                ${tabsHtml}
            </nav>
        `;
    }

    // Auto-Mount on DOM Load
    document.addEventListener('DOMContentLoaded', () => {
        renderTopNav();
        renderMobileBottomNav();
    });

})();
