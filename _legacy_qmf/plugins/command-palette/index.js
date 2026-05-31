/**
 * QMF Command Palette Plugin
 * Spotlight-like command palette (⌘K / Ctrl+K)
 * @version 1.0.0
 */

import { eventBus } from '../kernel/event-bus.js';
import { context } from '../kernel/context.js';

/**
 * @typedef {Object} CommandPaletteConfig
 * @property {string} placeholder - Input placeholder
 * @property {Array} commands - Available commands
 * @property {number} maxResults - Max results to show
 * @property {boolean} fuzzySearch - Enable fuzzy search
 */

class CommandPalettePlugin {
    constructor() {
        this.element = null;
        this.config = {};
        this.isOpen = false;
        this.commands = [];
        this.filteredCommands = [];
        this.selectedIndex = 0;
        this.mode = 'command'; // 'command' | 'search' | 'goto'
        this.recentCommands = [];
        
        this._defaults = {
            placeholder: 'Type a command or search...',
            maxResults: 10,
            fuzzySearch: true,
            showRecent: true,
            maxRecent: 5,
            categories: ['Navigation', 'Actions', 'Settings', 'Help'],
            shortcuts: {
                open: ['Meta+k', 'Control+k'],
                close: ['Escape'],
                select: ['Enter'],
                up: ['ArrowUp'],
                down: ['ArrowDown']
            }
        };
    }
    
    /**
     * Initialize command palette
     */
    init(config = {}) {
        this.config = { ...this._defaults, ...config };
        this.commands = config.commands || [];
        this._loadRecent();
        this._createPalette();
        this._bindEvents();
        
        eventBus.emit('command-palette:initialized', { config: this.config });
        
        return this;
    }
    
    /**
     * Create palette DOM
     */
    _createPalette() {
        this.element = document.createElement('div');
        this.element.id = 'qmf-command-palette';
        this.element.className = 'qmf-command-palette';
        this.element.setAttribute('role', 'dialog');
        this.element.setAttribute('aria-modal', 'true');
        this.element.setAttribute('aria-label', 'Command palette');
        
        this.element.innerHTML = `
            <div class="qmf-command-palette__backdrop"></div>
            <div class="qmf-command-palette__dialog">
                <div class="qmf-command-palette__header">
                    <div class="qmf-command-palette__input-wrapper">
                        <svg class="qmf-command-palette__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input type="text" 
                               class="qmf-command-palette__input" 
                               placeholder="${this.config.placeholder}"
                               autocomplete="off"
                               autocorrect="off"
                               autocapitalize="off"
                               spellcheck="false">
                        <div class="qmf-command-palette__mode-indicator"></div>
                    </div>
                </div>
                <div class="qmf-command-palette__body">
                    <div class="qmf-command-palette__results"></div>
                    <div class="qmf-command-palette__empty">
                        <span>No results found</span>
                    </div>
                </div>
                <div class="qmf-command-palette__footer">
                    <div class="qmf-command-palette__hints">
                        <span class="qmf-command-palette__hint">
                            <kbd>↑↓</kbd> Navigate
                        </span>
                        <span class="qmf-command-palette__hint">
                            <kbd>↵</kbd> Select
                        </span>
                        <span class="qmf-command-palette__hint">
                            <kbd>esc</kbd> Close
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.element);
        this._injectStyles();
    }
    
    /**
     * Bind events
     */
    _bindEvents() {
        const input = this.element.querySelector('.qmf-command-palette__input');
        const backdrop = this.element.querySelector('.qmf-command-palette__backdrop');
        
        // Keyboard shortcuts to open
        document.addEventListener('keydown', (e) => {
            // ⌘K or Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.open();
            }
            
            // ⌘P or Ctrl+P for goto mode
            if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
                e.preventDefault();
                this.open('goto');
            }
            
            // ⌘/ or Ctrl+/ for search
            if ((e.metaKey || e.ctrlKey) && e.key === '/') {
                e.preventDefault();
                this.open('search');
            }
        });
        
        // Input handling
        input.addEventListener('input', (e) => this._onInput(e.target.value));
        
        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this._navigate(-1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this._navigate(1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    this._executeSelected();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.close();
                    break;
                case 'Tab':
                    e.preventDefault();
                    this._navigate(e.shiftKey ? -1 : 1);
                    break;
            }
        });
        
        // Click on backdrop
        backdrop.addEventListener('click', () => this.close());
        
        // Click on result
        this.element.querySelector('.qmf-command-palette__results').addEventListener('click', (e) => {
            const item = e.target.closest('.qmf-command-palette__item');
            if (item) {
                const index = parseInt(item.dataset.index, 10);
                this.selectedIndex = index;
                this._executeSelected();
            }
        });
        
        // Listen for open events
        eventBus.on('command-palette:open', ({ mode }) => this.open(mode));
        eventBus.on('command-palette:close', () => this.close());
    }
    
    /**
     * Handle input change
     */
    _onInput(query) {
        // Check for mode switches
        if (query.startsWith('>')) {
            this.mode = 'command';
            query = query.slice(1).trim();
        } else if (query.startsWith('@')) {
            this.mode = 'goto';
            query = query.slice(1).trim();
        } else if (query.startsWith('?')) {
            this.mode = 'search';
            query = query.slice(1).trim();
        }
        
        this._updateModeIndicator();
        this._filter(query);
        this._render();
    }
    
    /**
     * Filter commands
     */
    _filter(query) {
        if (!query) {
            // Show recent commands or all
            if (this.config.showRecent && this.recentCommands.length) {
                this.filteredCommands = this.recentCommands.slice(0, this.config.maxRecent);
            } else {
                this.filteredCommands = this.commands.slice(0, this.config.maxResults);
            }
            this.selectedIndex = 0;
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        
        let filtered;
        
        if (this.config.fuzzySearch) {
            // Fuzzy search with scoring
            filtered = this.commands
                .map(cmd => ({
                    ...cmd,
                    score: this._fuzzyScore(cmd.label.toLowerCase(), lowerQuery)
                }))
                .filter(cmd => cmd.score > 0)
                .sort((a, b) => b.score - a.score);
        } else {
            // Simple includes filter
            filtered = this.commands.filter(cmd => 
                cmd.label.toLowerCase().includes(lowerQuery) ||
                (cmd.keywords && cmd.keywords.some(k => k.toLowerCase().includes(lowerQuery)))
            );
        }
        
        this.filteredCommands = filtered.slice(0, this.config.maxResults);
        this.selectedIndex = 0;
    }
    
    /**
     * Simple fuzzy scoring
     */
    _fuzzyScore(str, query) {
        if (str === query) return 100;
        if (str.startsWith(query)) return 80;
        if (str.includes(query)) return 60;
        
        let score = 0;
        let queryIndex = 0;
        let prevMatchIndex = -1;
        
        for (let i = 0; i < str.length && queryIndex < query.length; i++) {
            if (str[i] === query[queryIndex]) {
                score += 10;
                // Bonus for consecutive matches
                if (prevMatchIndex === i - 1) score += 5;
                // Bonus for word boundary
                if (i === 0 || str[i - 1] === ' ' || str[i - 1] === '-') score += 3;
                prevMatchIndex = i;
                queryIndex++;
            }
        }
        
        return queryIndex === query.length ? score : 0;
    }
    
    /**
     * Navigate through results
     */
    _navigate(delta) {
        const len = this.filteredCommands.length;
        if (len === 0) return;
        
        this.selectedIndex = (this.selectedIndex + delta + len) % len;
        this._updateSelection();
    }
    
    /**
     * Update selected item UI
     */
    _updateSelection() {
        const items = this.element.querySelectorAll('.qmf-command-palette__item');
        items.forEach((item, i) => {
            item.classList.toggle('qmf-command-palette__item--selected', i === this.selectedIndex);
        });
        
        // Scroll into view
        const selected = items[this.selectedIndex];
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }
    
    /**
     * Execute selected command
     */
    _executeSelected() {
        const command = this.filteredCommands[this.selectedIndex];
        if (!command) return;
        
        // Add to recent
        this._addToRecent(command);
        
        // Close palette
        this.close();
        
        // Execute command
        if (typeof command.action === 'function') {
            command.action();
        } else if (command.href) {
            window.location.href = command.href;
        } else if (command.event) {
            eventBus.emit(command.event, command.payload || {});
        }
        
        eventBus.emit('command-palette:execute', { command });
    }
    
    /**
     * Render results
     */
    _render() {
        const resultsEl = this.element.querySelector('.qmf-command-palette__results');
        const emptyEl = this.element.querySelector('.qmf-command-palette__empty');
        
        if (this.filteredCommands.length === 0) {
            resultsEl.style.display = 'none';
            emptyEl.style.display = 'block';
            return;
        }
        
        resultsEl.style.display = 'block';
        emptyEl.style.display = 'none';
        
        // Group by category
        const grouped = this._groupByCategory(this.filteredCommands);
        
        let html = '';
        
        let globalIndex = 0;
        for (const [category, items] of Object.entries(grouped)) {
            if (category !== 'undefined') {
                html += `<div class="qmf-command-palette__category">${category}</div>`;
            }
            
            items.forEach((cmd) => {
                const isSelected = globalIndex === this.selectedIndex;
                html += `
                    <div class="qmf-command-palette__item ${isSelected ? 'qmf-command-palette__item--selected' : ''}"
                         data-index="${globalIndex}"
                         role="option"
                         aria-selected="${isSelected}">
                        <div class="qmf-command-palette__item-content">
                            ${cmd.icon ? `<span class="qmf-command-palette__item-icon">${cmd.icon}</span>` : ''}
                            <span class="qmf-command-palette__item-label">${this._highlight(cmd.label)}</span>
                            ${cmd.description ? `<span class="qmf-command-palette__item-description">${cmd.description}</span>` : ''}
                        </div>
                        ${cmd.shortcut ? `<kbd class="qmf-command-palette__item-shortcut">${cmd.shortcut}</kbd>` : ''}
                    </div>
                `;
                globalIndex++;
            });
        }
        
        resultsEl.innerHTML = html;
    }
    
    /**
     * Group commands by category
     */
    _groupByCategory(commands) {
        return commands.reduce((groups, cmd) => {
            const cat = cmd.category || 'Actions';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(cmd);
            return groups;
        }, {});
    }
    
    /**
     * Highlight matching text
     */
    _highlight(text) {
        const input = this.element.querySelector('.qmf-command-palette__input');
        const query = input.value.replace(/^[>@?]/, '').trim();
        
        if (!query) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    /**
     * Update mode indicator
     */
    _updateModeIndicator() {
        const indicator = this.element.querySelector('.qmf-command-palette__mode-indicator');
        const modeLabels = {
            command: 'Commands',
            search: 'Search',
            goto: 'Go to'
        };
        
        indicator.textContent = modeLabels[this.mode] || '';
        indicator.style.display = this.mode !== 'command' ? 'block' : 'none';
    }
    
    /**
     * Add command to recent
     */
    _addToRecent(command) {
        this.recentCommands = [
            command,
            ...this.recentCommands.filter(c => c.id !== command.id)
        ].slice(0, this.config.maxRecent);
        
        this._saveRecent();
    }
    
    /**
     * Save recent to localStorage
     */
    _saveRecent() {
        try {
            localStorage.setItem('qmf_recent_commands', JSON.stringify(
                this.recentCommands.map(c => c.id)
            ));
        } catch (e) {}
    }
    
    /**
     * Load recent from localStorage
     */
    _loadRecent() {
        try {
            const ids = JSON.parse(localStorage.getItem('qmf_recent_commands') || '[]');
            this.recentCommands = ids
                .map(id => this.commands.find(c => c.id === id))
                .filter(Boolean);
        } catch (e) {
            this.recentCommands = [];
        }
    }
    
    /**
     * Register command
     */
    register(command) {
        // Avoid duplicates
        const existing = this.commands.findIndex(c => c.id === command.id);
        if (existing >= 0) {
            this.commands[existing] = command;
        } else {
            this.commands.push(command);
        }
        
        return this;
    }
    
    /**
     * Register multiple commands
     */
    registerMany(commands) {
        commands.forEach(cmd => this.register(cmd));
        return this;
    }
    
    /**
     * Unregister command
     */
    unregister(commandId) {
        this.commands = this.commands.filter(c => c.id !== commandId);
        return this;
    }
    
    /**
     * Open palette
     */
    open(mode = 'command') {
        this.isOpen = true;
        this.mode = mode;
        this.selectedIndex = 0;
        
        const input = this.element.querySelector('.qmf-command-palette__input');
        
        // Set mode prefix
        const prefixes = { goto: '@', search: '?' };
        input.value = prefixes[mode] || '';
        
        this._updateModeIndicator();
        this._filter('');
        this._render();
        
        this.element.classList.add('qmf-command-palette--open');
        document.body.style.overflow = 'hidden';
        
        // Focus input
        requestAnimationFrame(() => {
            input.focus();
            if (input.value) {
                input.setSelectionRange(input.value.length, input.value.length);
            }
        });
        
        eventBus.emit('command-palette:opened', { mode });
    }
    
    /**
     * Close palette
     */
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.element.classList.remove('qmf-command-palette--open');
        document.body.style.overflow = '';
        
        // Clear input
        const input = this.element.querySelector('.qmf-command-palette__input');
        input.value = '';
        
        eventBus.emit('command-palette:closed');
    }
    
    /**
     * Toggle palette
     */
    toggle() {
        this.isOpen ? this.close() : this.open();
    }
    
    /**
     * Inject styles
     */
    _injectStyles() {
        if (document.getElementById('qmf-command-palette-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'qmf-command-palette-styles';
        style.textContent = `
            .qmf-command-palette {
                position: fixed;
                inset: 0;
                z-index: var(--qmf-z-modal);
                display: none;
            }
            
            .qmf-command-palette--open {
                display: block;
            }
            
            .qmf-command-palette__backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                animation: qmf-fade-in var(--qmf-duration-fast) var(--qmf-easing-out);
            }
            
            .qmf-command-palette__dialog {
                position: absolute;
                top: 15%;
                left: 50%;
                transform: translateX(-50%);
                width: 90%;
                max-width: 600px;
                max-height: 70vh;
                background: var(--qmf-color-surface);
                border-radius: var(--qmf-radius-xl);
                box-shadow: var(--qmf-shadow-2xl);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: qmf-scale-in var(--qmf-duration-fast) var(--qmf-easing-out);
            }
            
            .qmf-command-palette__header {
                padding: var(--qmf-space-3);
                border-bottom: 1px solid var(--qmf-color-border);
            }
            
            .qmf-command-palette__input-wrapper {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-3);
                padding: var(--qmf-space-2) var(--qmf-space-3);
                background: var(--qmf-color-bg-secondary);
                border-radius: var(--qmf-radius-lg);
            }
            
            .qmf-command-palette__search-icon {
                width: 20px;
                height: 20px;
                color: var(--qmf-color-text-tertiary);
                flex-shrink: 0;
            }
            
            .qmf-command-palette__input {
                flex: 1;
                border: none;
                background: none;
                font-size: var(--qmf-font-size-lg);
                color: var(--qmf-color-text);
                outline: none;
            }
            
            .qmf-command-palette__input::placeholder {
                color: var(--qmf-color-text-tertiary);
            }
            
            .qmf-command-palette__mode-indicator {
                display: none;
                padding: var(--qmf-space-1) var(--qmf-space-2);
                background: var(--qmf-color-primary-100);
                color: var(--qmf-color-primary);
                font-size: var(--qmf-font-size-xs);
                font-weight: var(--qmf-font-weight-medium);
                border-radius: var(--qmf-radius);
            }
            
            .qmf-command-palette__body {
                flex: 1;
                overflow-y: auto;
                padding: var(--qmf-space-2);
            }
            
            .qmf-command-palette__category {
                padding: var(--qmf-space-2) var(--qmf-space-3);
                font-size: var(--qmf-font-size-xs);
                font-weight: var(--qmf-font-weight-semibold);
                color: var(--qmf-color-text-tertiary);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .qmf-command-palette__item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--qmf-space-2) var(--qmf-space-3);
                border-radius: var(--qmf-radius);
                cursor: pointer;
                transition: background var(--qmf-duration-fast) var(--qmf-easing-default);
            }
            
            .qmf-command-palette__item:hover,
            .qmf-command-palette__item--selected {
                background: var(--qmf-color-bg-secondary);
            }
            
            .qmf-command-palette__item--selected {
                background: var(--qmf-color-primary-50);
            }
            
            .qmf-command-palette__item-content {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-3);
                min-width: 0;
            }
            
            .qmf-command-palette__item-icon {
                width: 20px;
                height: 20px;
                color: var(--qmf-color-text-secondary);
                flex-shrink: 0;
            }
            
            .qmf-command-palette__item-icon svg {
                width: 100%;
                height: 100%;
            }
            
            .qmf-command-palette__item-label {
                font-size: var(--qmf-font-size-sm);
                color: var(--qmf-color-text);
            }
            
            .qmf-command-palette__item-label mark {
                background: var(--qmf-color-warning-100);
                color: inherit;
                border-radius: 2px;
            }
            
            .qmf-command-palette__item-description {
                font-size: var(--qmf-font-size-sm);
                color: var(--qmf-color-text-tertiary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .qmf-command-palette__item-shortcut {
                padding: 2px 6px;
                background: var(--qmf-color-bg-tertiary);
                border: 1px solid var(--qmf-color-border);
                border-radius: var(--qmf-radius-sm);
                font-size: 11px;
                font-family: var(--qmf-font-family-mono);
                color: var(--qmf-color-text-secondary);
            }
            
            .qmf-command-palette__empty {
                display: none;
                padding: var(--qmf-space-8);
                text-align: center;
                color: var(--qmf-color-text-tertiary);
            }
            
            .qmf-command-palette__footer {
                padding: var(--qmf-space-2) var(--qmf-space-3);
                border-top: 1px solid var(--qmf-color-border);
                background: var(--qmf-color-bg-secondary);
            }
            
            .qmf-command-palette__hints {
                display: flex;
                gap: var(--qmf-space-4);
            }
            
            .qmf-command-palette__hint {
                display: flex;
                align-items: center;
                gap: var(--qmf-space-2);
                font-size: var(--qmf-font-size-xs);
                color: var(--qmf-color-text-tertiary);
            }
            
            .qmf-command-palette__hint kbd {
                padding: 2px 4px;
                background: var(--qmf-color-surface);
                border: 1px solid var(--qmf-color-border);
                border-radius: var(--qmf-radius-sm);
                font-size: 10px;
            }
            
            @media (max-width: 640px) {
                .qmf-command-palette__dialog {
                    top: 0;
                    width: 100%;
                    max-height: 100vh;
                    border-radius: 0;
                }
                
                .qmf-command-palette__hints {
                    display: none;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

export const commandPalette = new CommandPalettePlugin();
export default commandPalette;
