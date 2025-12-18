export const GAMESTATES = {
    MENU : "menu",
    GAME : "game",
    EDITOR : "editor",
    GAMEOVER : "gameover",
}

export default class GameStateManager {
    constructor() {
        this.states = {};
        this.current = null;
    }

    add(name, stateInstance) {
        this.states[name] = stateInstance;
    }

    setState(name) {
        if (this.current?.onExit) this.current.onExit();
        this.current = this.states[name];
        if (this.current?.onEnter) this.current.onEnter();
    }

    update(dt) {
        this.current?.update?.(dt);
    }

    render(dt) {
        this.current?.render?.(dt);
    }
}