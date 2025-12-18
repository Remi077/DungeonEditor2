// @ts-nocheck
export default class World {
    constructor() {
        this.entities = new Set();
        this.components = new Map(); 
        this.player = null;
        // Map<tag, Set<Entity>>
    }

    setPlayer(entity) {
        this.player = entity;
    }

    addEntity(entity) {
        this.entities.add(entity);
    }

    addComponent(entity, component) {
        entity.addComponent(component);

        if (!this.components.has(component.type)) {
            this.components.set(component.type, new Set());
        }
        this.components.get(component.type).add(entity);
    }

    removeEntity(entity) {
        this.entities.delete(entity);
        for (const set of this.components.values()) {
            set.delete(entity);
        }
    }

    *query(...componentTags) {
        if (componentTags.length === 0) return;

        const [first, ...rest] = componentTags;
        const baseSet = this.components.get(first);
        if (!baseSet) return;

        for (const entity of baseSet) {
            let valid = true;
            for (const tag of rest) {
                if (!entity.get(tag)) {
                    valid = false;
                    break;
                }
            }
            if (valid) yield entity;
        }
    }
}
