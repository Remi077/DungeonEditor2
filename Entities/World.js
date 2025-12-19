export default class World {
    constructor() {
        this.entities = new Set();
        this.activeEntities = new Set();
        this.components = new Map(); 
        this.player = null;
        // Map<tag, Set<Entity>>
    }

    setPlayer(entity) {
        this.player = entity;
    }

    addEntity(entity, { active = false } = {}) {
        this.entities.add(entity);
        if (active) this.activeEntities.add(entity);
    }

    addComponent(entity, component) {
        if (!this.entities.has(entity)) {
            this.addEntity(entity);
        }

        entity.addComponent(component);

        if (!this.components.has(component.type)) {
            this.components.set(component.type, new Set());
        }
        this.components.get(component.type).add(entity);
    }

    removeEntity(entity) {
        this.entities.delete(entity);
        this.activeEntities.delete(entity);

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
            if (!this.activeEntities.has(entity)) continue;

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

    *queryAll(...componentTags) {
    // same as query but without active check
        if (componentTags.length === 0) return;

        const [first, ...rest] = componentTags;
        const baseSet = this.components.get(first);
        if (!baseSet) return;

        for (const entity of baseSet) {
            if (!this.entities.has(entity)) continue;

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

    setActive(entity, active) {
        if (!this.entities.has(entity)) return;

        if (active) {
            this.activeEntities.add(entity);
        } else {
            this.activeEntities.delete(entity);
        }
    }

    isActive(entity) {
        return this.activeEntities.has(entity);
    }

}
