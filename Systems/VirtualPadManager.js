export default class VirtualPadManager {
    constructor(game) {
        this.game = game;
        this.actions = {};
        this.actionsOnce = {};

        this._joystickTouchId = null;
        this._lookTouchId = null;
        this._joystickOrigin = { x: 0, y: 0 };
        this._lookLast = { x: 0, y: 0 };

        this._JOYSTICK_RADIUS = 60;

        this._build();
        this._bindEvents();
    }

    static isMobile() {
        return navigator.maxTouchPoints > 0 || /Mobi|Android/i.test(navigator.userAgent);
    }

    _build() {
        const style = document.createElement('style');
        style.id = 'virtual-pad-styles';
        style.textContent = `
            #vpad-joystick-base {
                position: absolute;
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: rgba(255,255,255,0.12);
                border: 2px solid rgba(255,255,255,0.35);
                pointer-events: none;
                z-index: 50;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #vpad-joystick-knob {
                width: 52px;
                height: 52px;
                border-radius: 50%;
                background: rgba(255,255,255,0.45);
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                pointer-events: none;
            }
            #vpad-btn-jump {
                position: absolute;
                bottom: 200px;
                right: 50px;
                width: 70px;
                height: 70px;
                border-radius: 50%;
                background: rgba(200,220,255,0.25);
                border: 2px solid rgba(200,220,255,0.55);
                color: white;
                font-size: 13px;
                font-family: sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: none;
                user-select: none;
                z-index: 50;
            }
            #vpad-btn-attack {
                position: absolute;
                bottom: 110px;
                right: 50px;
                width: 70px;
                height: 70px;
                border-radius: 50%;
                background: rgba(255,100,80,0.3);
                border: 2px solid rgba(255,100,80,0.65);
                color: white;
                font-size: 13px;
                font-family: sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: none;
                user-select: none;
                z-index: 50;
            }
            #vpad-btn-interact {
                position: absolute;
                bottom: 110px;
                right: 140px;
                width: 70px;
                height: 70px;
                border-radius: 50%;
                background: rgba(80,200,255,0.25);
                border: 2px solid rgba(80,200,255,0.55);
                color: white;
                font-size: 13px;
                font-family: sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: none;
                user-select: none;
                z-index: 50;
            }
        `;
        document.head.appendChild(style);
        this._style = style;

        const cc = this.game.canvasContainer;

        this._joystickBase = document.createElement('div');
        this._joystickBase.id = 'vpad-joystick-base';
        this._joystickBase.style.display = 'none'; // hidden until first touch
        this._joystickKnob = document.createElement('div');
        this._joystickKnob.id = 'vpad-joystick-knob';
        this._joystickBase.appendChild(this._joystickKnob);

        this._btnJump = document.createElement('div');
        this._btnJump.id = 'vpad-btn-jump';
        this._btnJump.textContent = 'JUMP';

        this._btnAttack = document.createElement('div');
        this._btnAttack.id = 'vpad-btn-attack';
        this._btnAttack.textContent = 'ATK';

        this._btnInteract = document.createElement('div');
        this._btnInteract.id = 'vpad-btn-interact';
        this._btnInteract.textContent = 'USE';

        cc.appendChild(this._joystickBase);
        cc.appendChild(this._btnJump);
        cc.appendChild(this._btnAttack);
        cc.appendChild(this._btnInteract);
    }

    _bindEvents() {
        const cc = this.game.canvasContainer;

        this._onTouchStart = (e) => this._touchStart(e);
        this._onTouchMove  = (e) => this._touchMove(e);
        this._onTouchEnd   = (e) => this._touchEnd(e);

        cc.addEventListener('touchstart',  this._onTouchStart,  { passive: false });
        cc.addEventListener('touchmove',   this._onTouchMove,   { passive: false });
        cc.addEventListener('touchend',    this._onTouchEnd,    { passive: false });
        cc.addEventListener('touchcancel', this._onTouchEnd,    { passive: false });

        this._btnJump.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.actionsOnce.jump = true;
        }, { passive: true });

        this._btnAttack.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.actions.attack = true;
        }, { passive: true });
        this._btnAttack.addEventListener('touchend', (e) => {
            e.stopPropagation();
            this.actions.attack = false;
        }, { passive: true });

        this._btnInteract.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.actionsOnce.interact = true;
        }, { passive: true });
    }

    _touchStart(e) {
        e.preventDefault();
        const containerWidth = this.game.canvasContainer.clientWidth;
        const rect = this.game.canvasContainer.getBoundingClientRect();

        for (const touch of e.changedTouches) {
            const x = touch.clientX;

            // Left 45% of screen → joystick
            if (x < containerWidth * 0.45 && this._joystickTouchId === null) {
                this._joystickTouchId = touch.identifier;
                this._joystickOrigin = { x, y: touch.clientY };

                // Place joystick base at touch position
                this._joystickBase.style.display = '';
                this._joystickBase.style.left = (x - rect.left - 60) + 'px';
                this._joystickBase.style.top  = (touch.clientY - rect.top - 60) + 'px';
                this._joystickKnob.style.transform = 'translate(-50%, -50%)';
            }
            // Right 55% → camera look
            else if (x >= containerWidth * 0.45 && this._lookTouchId === null) {
                this._lookTouchId = touch.identifier;
                this._lookLast = { x, y: touch.clientY };
            }
        }
    }

    _touchMove(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === this._joystickTouchId) {
                this._updateJoystick(touch);
            } else if (touch.identifier === this._lookTouchId) {
                this._updateLook(touch);
            }
        }
    }

    _touchEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === this._joystickTouchId) {
                this._joystickTouchId = null;
                this._clearJoystick();
            } else if (touch.identifier === this._lookTouchId) {
                this._lookTouchId = null;
            }
        }
    }

    _updateJoystick(touch) {
        const dx = touch.clientX - this._joystickOrigin.x;
        const dy = touch.clientY - this._joystickOrigin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = this._JOYSTICK_RADIUS;

        const clamped = Math.min(dist, radius);
        const angle = Math.atan2(dy, dx);
        const nx = Math.cos(angle) * clamped;
        const ny = Math.sin(angle) * clamped;

        this._joystickKnob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;

        const deadzone = 0.2;
        const normX = dist > radius * deadzone ? nx / radius : 0;
        const normY = dist > radius * deadzone ? ny / radius : 0;

        this.actions.moveCamLeft  = normX < -0.3;
        this.actions.moveCamRight = normX >  0.3;
        this.actions.moveCamFront = normY < -0.3;
        this.actions.moveCamBack  = normY >  0.3;
    }

    _clearJoystick() {
        this._joystickBase.style.display = 'none';
        this._joystickKnob.style.transform = 'translate(-50%, -50%)';
        this.actions.moveCamLeft  = false;
        this.actions.moveCamRight = false;
        this.actions.moveCamFront = false;
        this.actions.moveCamBack  = false;
    }

    _updateLook(touch) {
        const dx = touch.clientX - this._lookLast.x;
        const dy = touch.clientY - this._lookLast.y;
        this._lookLast = { x: touch.clientX, y: touch.clientY };
        // same sensitivity as mouse, slight multiplier for comfortable touch feel
        this.game.systems.cameraManager.mousemove(dx * 1.5, dy * 1.5);
    }

    /** Clear one-shot actions — call after they've been consumed each frame */
    clearActionsOnce() {
        for (const k in this.actionsOnce) this.actionsOnce[k] = false;
    }

    destroy() {
        const cc = this.game.canvasContainer;
        cc.removeEventListener('touchstart',  this._onTouchStart);
        cc.removeEventListener('touchmove',   this._onTouchMove);
        cc.removeEventListener('touchend',    this._onTouchEnd);
        cc.removeEventListener('touchcancel', this._onTouchEnd);

        this._joystickBase.remove();
        this._btnJump.remove();
        this._btnAttack.remove();
        this._btnInteract.remove();
        this._style.remove();
    }
}
