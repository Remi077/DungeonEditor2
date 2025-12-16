// @ts-nocheck

export default class InputManager {
    constructor() {
        this.keysDown = new Set();
        this.mouseButtons = new Set();
        this.mousePos = { x: 0, y: 0};
        this.hoveredElement = null; // currently hovered DOM element

        // Callbacks per event type
        this.listeners = {
            keydown: [],
            keyup: [],
            keypressonce: [],
            mousedown: [],
            mouseup: [],
            mousemove: [],
            wheel: [],
            resize: [],
            pointerlockchange: [],
        }

        // Prevent context menu globally
        document.addEventListener("contextmenu", (e) => e.preventDefault());

        // lock change
        document.addEventListener("pointerlockchange", (e) => this._pointerlockchange(e));

        // Bind DOM events once
        window.addEventListener('keydown', e => this._handleKeyDown(e));
        window.addEventListener('keyup', e => this._handleKeyUp(e));
        window.addEventListener('keypressonce', e => this._handleKeyPressOnce(e));
        window.addEventListener('mousedown', e => this._handleMouseDown(e));
        window.addEventListener('mouseup', e => this._handleMouseUp(e));
        window.addEventListener('mousemove', e => this._handleMouseMove(e));
        window.addEventListener('wheel', e => this._handleWheel(e));
        window.addEventListener('resize', e => this._resize(e));

        // Track hovered element
        window.addEventListener('mousemove', e => {
            this.hoveredElement = document.elementFromPoint(e.clientX, e.clientY);
        });
    }

    /* ------------------------- Public API -------------------------------- */

    /** Subscribe callback for eventType */
    on(eventType, callback) {
        if (this.listeners[eventType]) {
            this.listeners[eventType].push(callback);
            return callback;
        }
        console.warn(`Unknown input event: ${eventType}`);
        return null;
    }

    /** Remove ALL listeners - called when switching game states */
    clearAllListeners() {
        for (let key in this.listeners) {
            this.listeners[key].length = 0;
        }
    }

    /** Utility: check if key is currently held */
    isKeyDown(code) {
        return this.keysDown.has(code);
    }

    /** Check if mouse is hovering over a specific DOM element or its children */
    isMouseOver(target) {
        if (!target) return false;
        return target.contains(this.hoveredElement);
    }

    /** Utility: check if mouse button is held */
    isMouseDown(button) {
        //console.log(this.mouseButtons.has(button));
        return this.mouseButtons.has(button);
    }

    /* ------------------------- Internal event handlers -------------------------------- */

    _handleKeyDown(e) {
        const code = this._normalize(e);

        if (!this.keysDown[code]) { // key was not down before
            this.keysDown[code] = true;

            //dispatch custom event
            const customEvent = new CustomEvent('keypressonce', { detail: { code } });
            window.dispatchEvent(customEvent);
        }

        this.listeners.keydown.forEach(cb => cb(e));
    }

    _handleKeyPressOnce(e) {
        const code = e.detail.code;
        this.listeners.keypressonce.forEach(cb => cb(e));
    }

    _handleKeyUp(e) {
        const code = this._normalize(e);
        this.keysDown[code] = false;
        this.listeners.keyup.forEach(cb => cb(e));
    }

    _handleMouseDown(e) {
        this.mouseButtons.add(e.button);
        // console.log("down", this.mouseButtons)
        this.listeners.mousedown.forEach(cb => cb(e));
    }

    _handleMouseUp(e) {
        this.mouseButtons.delete(e.button);
        // console.log("up", this.mouseButtons)
        this.listeners.mouseup.forEach(cb => cb(e));
    }

    _handleMouseMove(e) {
        this.mousePos.x = e.clientX;
        this.mousePos.y = e.clientY;
        // console.log(this.mousePos.x,this.mousePos.y)
        this.listeners.mousemove.forEach(cb => cb(e));
    }

    _handleWheel(e) {
        this.listeners.wheel.forEach(cb => cb(e));
    }

    _resize(e) {
        this.listeners.resize.forEach(cb => cb(e));
    }

    _normalize(e) {
        let code = e.code;

        // --- Add Ctrl+ or Meta+ prefix if required ---
        if ((e.ctrlKey || e.metaKey) &&
            e.code !== "ControlLeft" &&
            e.code !== "ControlRight") {
            code = "Ctrl+" + code;
        }

        // --- Prevent browser from doing stupid things (save, find, reload, tabbing) ---
        const blocked = [
            "Tab",
            "Ctrl+KeyS",
            "Ctrl+KeyL",
            "Ctrl+KeyR",
            "Ctrl+KeyA"
        ];

        if (blocked.includes(code)) {
            e.preventDefault();
        }

        return code;
    }

    _pointerlockchange(e) {
        this.listeners.pointerlockchange.forEach(cb => cb(e));
    }

}