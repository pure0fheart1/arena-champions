// Arena System - Handles game arena, walls, and destructible cover
class Arena {
    constructor(arenaData) {
        this.width = CONFIG.ARENA_WIDTH;
        this.height = CONFIG.ARENA_HEIGHT;
        this.walls = [...arenaData.walls];
        this.destructibleCover = [...arenaData.destructibleCover];
        this.collisionQuadTree = new QuadTree(0, 0, this.width, this.height);
        this.updateQuadTree();
    }

    // Update arena state from server
    updateState(arenaData) {
        this.walls = [...arenaData.walls];
        this.destructibleCover = [...arenaData.destructibleCover];
        this.updateQuadTree();
    }

    // Update collision quad tree for optimization
    updateQuadTree() {
        this.collisionQuadTree.clear();
        
        // Add walls to quad tree
        this.walls.forEach(wall => {
            this.collisionQuadTree.insert(wall);
        });
        
        // Add destructible cover to quad tree
        this.destructibleCover.forEach(cover => {
            if (cover.health > 0) {
                this.collisionQuadTree.insert(cover);
            }
        });
    }

    // Check collision for player movement
    checkCollision(position, playerSize) {
        const playerRadius = playerSize / 2;
        const bounds = {
            x: position.x - playerRadius,
            y: position.y - playerRadius,
            width: playerSize,
            height: playerSize
        };

        // Check against arena boundaries
        position.x = Math.max(playerRadius, Math.min(this.width - playerRadius, position.x));
        position.y = Math.max(playerRadius, Math.min(this.height - playerRadius, position.y));

        // Get potential collision objects from quad tree
        const potentialCollisions = this.collisionQuadTree.retrieve(bounds);

        // Check collision with walls and cover
        for (const obstacle of potentialCollisions) {
            if (this.isColliding(bounds, obstacle)) {
                // Calculate collision resolution
                const resolution = this.resolveCollision(position, playerRadius, obstacle);
                position.x = resolution.x;
                position.y = resolution.y;
            }
        }

        return position;
    }

    // Check if projectile collides with arena
    checkProjectileCollision(projectile) {
        const projectileBounds = {
            x: projectile.x - CONFIG.PROJECTILE_SIZE / 2,
            y: projectile.y - CONFIG.PROJECTILE_SIZE / 2,
            width: CONFIG.PROJECTILE_SIZE,
            height: CONFIG.PROJECTILE_SIZE
        };

        // Check against walls
        for (const wall of this.walls) {
            if (this.isColliding(projectileBounds, wall)) {
                return true;
            }
        }

        // Check against destructible cover
        for (const cover of this.destructibleCover) {
            if (cover.health > 0 && this.isColliding(projectileBounds, cover)) {
                // Damage the cover
                cover.health -= projectile.damage;
                
                // Create destruction effect if cover is destroyed
                if (cover.health <= 0) {
                    this.createDestructionEffect(cover);
                    this.updateQuadTree(); // Update quad tree after destruction
                }
                
                return true;
            }
        }

        return false;
    }

    // Check if line of sight is blocked
    checkLineOfSight(start, end) {
        const obstacles = [...this.walls, ...this.destructibleCover.filter(cover => cover.health > 0)];
        
        for (const obstacle of obstacles) {
            if (this.lineIntersectsRect(start, end, obstacle)) {
                return false;
            }
        }
        
        return true;
    }

    // Check if two rectangles are colliding
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // Resolve collision between player and obstacle
    resolveCollision(playerPos, playerRadius, obstacle) {
        const playerLeft = playerPos.x - playerRadius;
        const playerRight = playerPos.x + playerRadius;
        const playerTop = playerPos.y - playerRadius;
        const playerBottom = playerPos.y + playerRadius;

        const obstacleLeft = obstacle.x;
        const obstacleRight = obstacle.x + obstacle.width;
        const obstacleTop = obstacle.y;
        const obstacleBottom = obstacle.y + obstacle.height;

        // Calculate overlap on each axis
        const overlapLeft = playerRight - obstacleLeft;
        const overlapRight = obstacleRight - playerLeft;
        const overlapTop = playerBottom - obstacleTop;
        const overlapBottom = obstacleBottom - playerTop;

        // Find the smallest overlap (minimum translation vector)
        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        let newX = playerPos.x;
        let newY = playerPos.y;

        if (minOverlapX < minOverlapY) {
            // Resolve on X axis
            if (overlapLeft < overlapRight) {
                newX = obstacleLeft - playerRadius;
            } else {
                newX = obstacleRight + playerRadius;
            }
        } else {
            // Resolve on Y axis
            if (overlapTop < overlapBottom) {
                newY = obstacleTop - playerRadius;
            } else {
                newY = obstacleBottom + playerRadius;
            }
        }

        return { x: newX, y: newY };
    }

    // Check if line intersects with rectangle
    lineIntersectsRect(start, end, rect) {
        // Check if line intersects any of the rectangle's edges
        const rectLines = [
            { x1: rect.x, y1: rect.y, x2: rect.x + rect.width, y2: rect.y },
            { x1: rect.x + rect.width, y1: rect.y, x2: rect.x + rect.width, y2: rect.y + rect.height },
            { x1: rect.x + rect.width, y1: rect.y + rect.height, x2: rect.x, y2: rect.y + rect.height },
            { x1: rect.x, y1: rect.y + rect.height, x2: rect.x, y2: rect.y }
        ];

        for (const rectLine of rectLines) {
            if (this.linesIntersect(start, end, rectLine)) {
                return true;
            }
        }

        return false;
    }

    // Check if two lines intersect
    linesIntersect(line1, line2) {
        const { x: x1, y: y1 } = line1;
        const { x: x2, y: y2 } = line1;
        const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2;

        const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        
        if (denominator === 0) {
            return false; // Lines are parallel
        }

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    // Create destruction effect
    createDestructionEffect(cover) {
        // This would typically create particles and visual effects
        // For now, we'll just mark it as destroyed
        cover.destroyed = true;
        
        // Create explosion effect
        if (gameEngine) {
            gameEngine.addEffect('explosion', {
                x: cover.x + cover.width / 2,
                y: cover.y + cover.height / 2
            }, null, cover.width);
        }
    }

    // Get all solid obstacles (for AI pathfinding, etc.)
    getSolidObstacles() {
        return [
            ...this.walls,
            ...this.destructibleCover.filter(cover => cover.health > 0)
        ];
    }

    // Get cover at position
    getCoverAt(x, y) {
        for (const cover of this.destructibleCover) {
            if (cover.health > 0 && 
                x >= cover.x && x <= cover.x + cover.width &&
                y >= cover.y && y <= cover.y + cover.height) {
                return cover;
            }
        }
        return null;
    }

    // Repair all cover (for new rounds)
    repairAllCover() {
        this.destructibleCover.forEach(cover => {
            cover.health = cover.maxHealth;
            cover.destroyed = false;
        });
        this.updateQuadTree();
    }

    // Reset arena for new round
    reset() {
        // Reset destructible cover
        this.destructibleCover.forEach(cover => {
            cover.health = CONFIG.COVER_HEALTH;
        });
        console.log('Arena reset for new round');
    }

    // Get visual data for rendering
    getVisualData() {
        return {
            walls: this.walls,
            destructibleCover: this.destructibleCover.map(cover => ({
                ...cover,
                healthPercentage: cover.health / cover.maxHealth
            }))
        };
    }
}

// Quad Tree for collision optimization
class QuadTree {
    constructor(x, y, width, height, level = 0, maxLevel = 5, maxObjects = 10) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.level = level;
        this.maxLevel = maxLevel;
        this.maxObjects = maxObjects;
        this.objects = [];
        this.nodes = [];
    }

    // Clear the quad tree
    clear() {
        this.objects = [];
        this.nodes = [];
    }

    // Split the quad tree into 4 sub-nodes
    split() {
        const subWidth = this.width / 2;
        const subHeight = this.height / 2;
        const x = this.x;
        const y = this.y;

        this.nodes[0] = new QuadTree(x + subWidth, y, subWidth, subHeight, this.level + 1, this.maxLevel, this.maxObjects);
        this.nodes[1] = new QuadTree(x, y, subWidth, subHeight, this.level + 1, this.maxLevel, this.maxObjects);
        this.nodes[2] = new QuadTree(x, y + subHeight, subWidth, subHeight, this.level + 1, this.maxLevel, this.maxObjects);
        this.nodes[3] = new QuadTree(x + subWidth, y + subHeight, subWidth, subHeight, this.level + 1, this.maxLevel, this.maxObjects);
    }

    // Get the index of the node that the object belongs to
    getIndex(rect) {
        let index = -1;
        const verticalMidpoint = this.x + this.width / 2;
        const horizontalMidpoint = this.y + this.height / 2;

        const topQuadrant = rect.y < horizontalMidpoint && rect.y + rect.height < horizontalMidpoint;
        const bottomQuadrant = rect.y > horizontalMidpoint;

        if (rect.x < verticalMidpoint && rect.x + rect.width < verticalMidpoint) {
            if (topQuadrant) {
                index = 1;
            } else if (bottomQuadrant) {
                index = 2;
            }
        } else if (rect.x > verticalMidpoint) {
            if (topQuadrant) {
                index = 0;
            } else if (bottomQuadrant) {
                index = 3;
            }
        }

        return index;
    }

    // Insert an object into the quad tree
    insert(rect) {
        if (this.nodes.length > 0) {
            const index = this.getIndex(rect);
            if (index !== -1) {
                this.nodes[index].insert(rect);
                return;
            }
        }

        this.objects.push(rect);

        if (this.objects.length > this.maxObjects && this.level < this.maxLevel) {
            if (this.nodes.length === 0) {
                this.split();
            }

            let i = 0;
            while (i < this.objects.length) {
                const index = this.getIndex(this.objects[i]);
                if (index !== -1) {
                    this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                } else {
                    i++;
                }
            }
        }
    }

    // Retrieve all objects that could collide with the given rectangle
    retrieve(rect) {
        const returnObjects = [...this.objects];

        if (this.nodes.length > 0) {
            const index = this.getIndex(rect);
            if (index !== -1) {
                returnObjects.push(...this.nodes[index].retrieve(rect));
            } else {
                // Object spans multiple quadrants, check all
                for (const node of this.nodes) {
                    returnObjects.push(...node.retrieve(rect));
                }
            }
        }

        return returnObjects;
    }
}

// Arena Generator - Creates different arena layouts
class ArenaGenerator {
    static generateClassicArena() {
        return {
            walls: [
                // Outer walls
                { x: 0, y: 0, width: CONFIG.ARENA_WIDTH, height: CONFIG.WALL_THICKNESS },
                { x: 0, y: CONFIG.ARENA_HEIGHT - CONFIG.WALL_THICKNESS, width: CONFIG.ARENA_WIDTH, height: CONFIG.WALL_THICKNESS },
                { x: 0, y: 0, width: CONFIG.WALL_THICKNESS, height: CONFIG.ARENA_HEIGHT },
                { x: CONFIG.ARENA_WIDTH - CONFIG.WALL_THICKNESS, y: 0, width: CONFIG.WALL_THICKNESS, height: CONFIG.ARENA_HEIGHT }
            ],
            destructibleCover: [
                { x: 300, y: 200, width: 80, height: 80, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 620, y: 200, width: 80, height: 80, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 300, y: 320, width: 80, height: 80, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 620, y: 320, width: 80, height: 80, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 460, y: 260, width: 80, height: 80, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH }
            ]
        };
    }

    static generateMazeArena() {
        return {
            walls: [
                // Outer walls
                { x: 0, y: 0, width: CONFIG.ARENA_WIDTH, height: CONFIG.WALL_THICKNESS },
                { x: 0, y: CONFIG.ARENA_HEIGHT - CONFIG.WALL_THICKNESS, width: CONFIG.ARENA_WIDTH, height: CONFIG.WALL_THICKNESS },
                { x: 0, y: 0, width: CONFIG.WALL_THICKNESS, height: CONFIG.ARENA_HEIGHT },
                { x: CONFIG.ARENA_WIDTH - CONFIG.WALL_THICKNESS, y: 0, width: CONFIG.WALL_THICKNESS, height: CONFIG.ARENA_HEIGHT },
                
                // Internal walls
                { x: 200, y: 100, width: CONFIG.WALL_THICKNESS, height: 200 },
                { x: 400, y: 200, width: CONFIG.WALL_THICKNESS, height: 200 },
                { x: 600, y: 100, width: CONFIG.WALL_THICKNESS, height: 200 },
                { x: 800, y: 200, width: CONFIG.WALL_THICKNESS, height: 200 }
            ],
            destructibleCover: [
                { x: 150, y: 150, width: 60, height: 60, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 350, y: 250, width: 60, height: 60, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 550, y: 150, width: 60, height: 60, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 750, y: 250, width: 60, height: 60, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH }
            ]
        };
    }

    static generateOpenArena() {
        return {
            walls: [
                // Outer walls only
                { x: 0, y: 0, width: CONFIG.ARENA_WIDTH, height: CONFIG.WALL_THICKNESS },
                { x: 0, y: CONFIG.ARENA_HEIGHT - CONFIG.WALL_THICKNESS, width: CONFIG.ARENA_WIDTH, height: CONFIG.WALL_THICKNESS },
                { x: 0, y: 0, width: CONFIG.WALL_THICKNESS, height: CONFIG.ARENA_HEIGHT },
                { x: CONFIG.ARENA_WIDTH - CONFIG.WALL_THICKNESS, y: 0, width: CONFIG.WALL_THICKNESS, height: CONFIG.ARENA_HEIGHT }
            ],
            destructibleCover: [
                { x: 200, y: 200, width: 100, height: 100, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 700, y: 200, width: 100, height: 100, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH },
                { x: 450, y: 350, width: 100, height: 100, health: CONFIG.COVER_HEALTH, maxHealth: CONFIG.COVER_HEALTH }
            ]
        };
    }

    static generateRandomArena() {
        const layouts = [
            this.generateClassicArena(),
            this.generateMazeArena(),
            this.generateOpenArena()
        ];
        
        return layouts[Math.floor(Math.random() * layouts.length)];
    }
} 