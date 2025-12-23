
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

interface BattleSceneProps {
    playerIds: {
        skinColor: string;
        hairColor: string;
        armorId: string;
        weaponId: string;
        modelColor?: string;
    };
    enemyIds: {
        skinColor: string;
        armorId: string;
        weaponId: string;
    };
    combatEvent: { type: 'attack' | 'hit' | 'block'; target: 'player' | 'enemy'; damage?: number } | null;
}

const BattleScene: React.FC<BattleSceneProps> = ({ playerIds, enemyIds, combatEvent }) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const parentEl = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<Phaser.Scene | null>(null);

    // Store scale ratios for different animation types to maintain consistent visual size
    // Key: animation type ('idle', 'hit', 'attack'), Value: scale multiplier
    const scaleRatiosRef = useRef<{ idle: number; hit: number; attack1: number; attack2: number }>({
        idle: 1,
        hit: 1,
        attack1: 1,
        attack2: 1
    });
    const BASE_SCALE = 2.5; // Base scale for idle animation

    useEffect(() => {
        if (!parentEl.current) return;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: parentEl.current,
            width: 800,
            height: 400,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                // Prevent Phaser from modifying the parent container size
                expandParent: false
            },
            transparent: true,
            physics: {
                default: 'arcade',
                arcade: { gravity: { x: 0, y: 0 } }
            },
            scene: {
                preload: preload,
                create: create,
                update: update
            }
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        function preload(this: Phaser.Scene) {
            // Load as plain image first to inspect dimensions dynamically
            // Load all color variants
            this.load.image('warrior_idle_blue', '/assets/warrior/warrior_idle_v3.png?v=6');
            this.load.image('warrior_idle_red', '/assets/warrior/warrior_idle_red.png?v=6');
            this.load.image('warrior_idle_yellow', '/assets/warrior/warrior_idle_yellow.png?v=6');
            this.load.image('warrior_idle_purple', '/assets/warrior/warrior_idle_purple.png?v=6');
            this.load.image('warrior_idle_black', '/assets/warrior/warrior_idle_black.png?v=6');

            // Combat Animations - Load Blue (Default/Raw)
            this.load.image('warrior_hit_blue', '/assets/warrior/warrior_hit.png');
            this.load.image('warrior_attack_1_blue', '/assets/warrior/warrior_attack_1.png');
            this.load.image('warrior_attack_2_blue', '/assets/warrior/warrior_attack_2.png');

            // Combat Animations - Load Red
            this.load.image('warrior_hit_red', '/assets/warrior/warrior_hit_red.png');
            this.load.image('warrior_attack_1_red', '/assets/warrior/warrior_attack_1_red.png');
            this.load.image('warrior_attack_2_red', '/assets/warrior/warrior_attack_2_red.png');

            // Combat Animations - Load Yellow
            this.load.image('warrior_hit_yellow', '/assets/warrior/warrior_hit_yellow.png');
            this.load.image('warrior_attack_1_yellow', '/assets/warrior/warrior_attack_1_yellow.png');
            this.load.image('warrior_attack_2_yellow', '/assets/warrior/warrior_attack_2_yellow.png');

            // Combat Animations - Load Purple
            this.load.image('warrior_hit_purple', '/assets/warrior/warrior_hit_purple.png');
            this.load.image('warrior_attack_1_purple', '/assets/warrior/warrior_attack_1_purple.png');
            this.load.image('warrior_attack_2_purple', '/assets/warrior/warrior_attack_2_purple.png');

            // Combat Animations - Load Black (Newly added)
            // Assuming fallback for others until provided
            this.load.image('warrior_hit_black', '/assets/warrior/warrior_hit_black.png');
            this.load.image('warrior_attack_1_black', '/assets/warrior/warrior_attack_1_black.png');
            this.load.image('warrior_attack_2_black', '/assets/warrior/warrior_attack_2_black.png');
        }

        function create(this: Phaser.Scene) {
            sceneRef.current = this;

            // --- 1. SETUP ANIMATIONS HELPER ---
            const createAnimFromRaw = (keyRaw: string, keyFinal: string, animKey: string, framesCount: number, rate: number = 10, repeat: number = -1): { width: number, height: number } | undefined => {
                if (!this.textures.exists(keyRaw)) return undefined;

                const rawTex = this.textures.get(keyRaw);
                const source = rawTex.getSourceImage() as any;
                if (source.width === 0 || source.height === 0) return undefined;

                const fWidth = Math.floor(source.width / framesCount);
                const fHeight = source.height;

                if (this.textures.exists(keyFinal)) this.textures.remove(keyFinal);

                this.textures.addSpriteSheet(keyFinal, source, {
                    frameWidth: fWidth,
                    frameHeight: fHeight
                });

                if (this.anims.exists(animKey)) this.anims.remove(animKey);

                const frames = this.anims.generateFrameNumbers(keyFinal, { start: 0, end: framesCount - 1 });
                if (frames.length > 0) {
                    this.anims.create({
                        key: animKey,
                        frames: frames,
                        frameRate: rate,
                        repeat: repeat
                    });
                }

                return { width: fWidth, height: fHeight };
            };

            // --- 2. CREATE SPECIFIC ANIMATIONS ---
            const colors = ['blue', 'red', 'yellow', 'purple', 'black'];

            // Track frame dims to calculate scale ratios
            let idleDims: { width: number, height: number } | undefined;
            let hitDims: { width: number, height: number } | undefined;
            let attack1Dims: { width: number, height: number } | undefined;
            let attack2Dims: { width: number, height: number } | undefined;

            colors.forEach(color => {
                // Idle (8 frames)
                const dimsIdle = createAnimFromRaw(`warrior_idle_${color}`, `warrior_sheet_${color}`, `warrior_anim_${color}`, 8, 10, -1);
                if (color === 'blue' && dimsIdle) idleDims = dimsIdle;

                // Hit (6 frames) - 10 game frames per image (60 frames total / 60fps = 1s) -> FPS = 6
                let hitKey = `warrior_hit_${color}`;
                if (!this.textures.exists(hitKey)) hitKey = 'warrior_hit_blue';
                const dimsHit = createAnimFromRaw(hitKey, `warrior_hit_sheet_${color}`, `warrior_hit_anim_${color}`, 6, 6, 0);
                if (color === 'blue' && dimsHit) hitDims = dimsHit;

                // Attack 1 (4 frames) - 10 game frames per image (40 frames total / 60fps = 0.66s) -> FPS = 6
                let atk1Key = `warrior_attack_1_${color}`;
                if (!this.textures.exists(atk1Key)) atk1Key = 'warrior_attack_1_blue';
                const dimsAtk1 = createAnimFromRaw(atk1Key, `warrior_attack_1_sheet_${color}`, `warrior_attack_1_anim_${color}`, 4, 6, 0);
                if (color === 'blue' && dimsAtk1) attack1Dims = dimsAtk1;

                // Attack 2 (4 frames) - 10 game frames per image (40 frames total / 60fps = 0.66s) -> FPS = 6
                let atk2Key = `warrior_attack_2_${color}`;
                if (!this.textures.exists(atk2Key)) atk2Key = 'warrior_attack_2_blue';
                const dimsAtk2 = createAnimFromRaw(atk2Key, `warrior_attack_2_sheet_${color}`, `warrior_attack_2_anim_${color}`, 4, 6, 0);
                if (color === 'blue' && dimsAtk2) attack2Dims = dimsAtk2;
            });

            // Calculate scale ratios to maintain consistent visual size
            // Formula: To display same visual HEIGHT, scale = idleHeight / thisHeight
            // Using height works better because width variances usually imply action range, not character size
            if (idleDims) {
                scaleRatiosRef.current.idle = 1; // Idle is our reference
                if (hitDims) {
                    scaleRatiosRef.current.hit = idleDims.height / hitDims.height;
                }
                if (attack1Dims) {
                    scaleRatiosRef.current.attack1 = idleDims.height / attack1Dims.height;
                }
                if (attack2Dims) {
                    scaleRatiosRef.current.attack2 = idleDims.height / attack2Dims.height;
                }
                console.log('📊 Scale ratios calculated (based on height):', scaleRatiosRef.current);
            }

            // --- 3. CREATE CHARACTERS ---
            createWarrior(this, 200, 250, 'player', playerIds);
            createWarrior(this, 600, 250, 'enemy', enemyIds);

            const enemy = this.children.getByName('enemy') as Phaser.GameObjects.Container;
            if (enemy) {
                enemy.setScale(-1, 1); // Face left
                const sprite = enemy.getByName('sprite') as Phaser.GameObjects.Sprite;
                if (sprite) sprite.setTint(0xffffff);
            }
        }

        function update(this: Phaser.Scene) {
            // Sprites handle their own animation playback, no need for manual bobbing unless desired
            // Keeping bobbing for the container can add extra life
            const player = this.children.getByName('player') as Phaser.GameObjects.Container;
            const enemy = this.children.getByName('enemy') as Phaser.GameObjects.Container;

            // Subtle breathing/bobbing
            if (player) {
                player.y = 250 + Math.sin(this.time.now / 600) * 2;
            }
            if (enemy) {
                enemy.y = 250 + Math.sin(this.time.now / 700 + 1) * 2;
            }
        }

        return () => {
            game.destroy(true);
        };
    }, []);

    // --- RE-RENDER VISUALS WHEN PROPS CHANGE ---
    // This is where we fix the "miniature bug" - ensure scale is reset to base
    // FIX: Add ref to track previous IDs to prevent unnecessary resets during attacks
    const prevIdsRef = useRef<{ player: string, enemy: string }>({ player: '', enemy: '' });

    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;

        const updateChar = (name: string, data: any, prevRefKey: 'player' | 'enemy') => {
            const dataStr = JSON.stringify(data);
            if (dataStr === prevIdsRef.current[prevRefKey]) return; // Skip if no meaningful change
            prevIdsRef.current[prevRefKey] = dataStr;

            const container = scene.children.getByName(name) as Phaser.GameObjects.Container;
            if (!container) return;
            const sprite = container.getByName('sprite') as Phaser.GameObjects.Sprite;
            if (!sprite) return;

            const color = (data as any).modelColor || 'blue';
            // Check if animation exists
            const animKey = `warrior_anim_${color}`;
            const finalAnim = scene.anims.exists(animKey) ? animKey : 'warrior_anim_blue';

            // IMPORTANT: Reset scale to Base when force-resetting to idle
            sprite.setScale(BASE_SCALE);

            // Only play if not already playing (handled by true arg)
            sprite.play(finalAnim, true);
        };

        updateChar('player', playerIds, 'player');
        updateChar('enemy', enemyIds, 'enemy');
    }, [playerIds, enemyIds]);

    // --- COMBAT ANIMATIONS ---
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene || !combatEvent) return;

        let attackerName = combatEvent.target === 'player' ? 'enemy' : 'player';
        const attacker = scene.children.getByName(attackerName) as Phaser.GameObjects.Container;
        const victim = scene.children.getByName(combatEvent.target) as Phaser.GameObjects.Container;

        if (!attacker || !victim) return;

        // Determine colors
        const victimColor = (combatEvent.target === 'player' ? (playerIds as any).modelColor : (enemyIds as any).modelColor) || 'blue';
        const attackerColor = (attackerName === 'player' ? (playerIds as any).modelColor : (enemyIds as any).modelColor) || 'blue';

        // 1. Play Hit Animation on Victim - apply scale correction
        const victimSprite = victim.getByName('sprite') as Phaser.GameObjects.Sprite;
        if (victimSprite) {
            victimSprite.stop(); // Stop current animation first
            // Apply hit scale ratio to maintain consistent visual size
            const scale = BASE_SCALE * (scaleRatiosRef.current.hit || 1);
            victimSprite.setScale(scale);
            victimSprite.play(`warrior_hit_anim_${victimColor}`, true);

            // Return to idle after. 'animationcomplete' fires when non-looping anim finishes
            victimSprite.once('animationcomplete', () => {
                victimSprite.stop();
                // Restore to idle scale
                victimSprite.setScale(BASE_SCALE);
                victimSprite.play(`warrior_anim_${victimColor}`, true);
            });
        }

        if (combatEvent.type === 'attack') {
            // 2. Play Random Attack Animation on Attacker - apply scale correction
            const attackerSprite = attacker.getByName('sprite') as Phaser.GameObjects.Sprite;
            if (attackerSprite) {
                const isAtk1 = Math.random() > 0.5;
                const animKey = isAtk1 ? `warrior_attack_1_anim_${attackerColor}` : `warrior_attack_2_anim_${attackerColor}`;
                const scaleRatio = isAtk1 ? scaleRatiosRef.current.attack1 : scaleRatiosRef.current.attack2;

                // Fix for Flash: If ratio is 1 (failed calc) but texture is huge, we might have issues. 
                // However, standard ratio calc should work.

                attackerSprite.stop(); // Stop current animation first
                // Apply attack scale ratio to maintain consistent visual size
                attackerSprite.setScale(BASE_SCALE * (scaleRatio || 1));
                attackerSprite.play(animKey, true);

                attackerSprite.once('animationcomplete', () => {
                    attackerSprite.stop();
                    // Restore to idle scale
                    attackerSprite.setScale(BASE_SCALE);
                    const color = (attackerName === 'player' ? (playerIds as any).modelColor : (enemyIds as any).modelColor) || 'blue';
                    attackerSprite.play(`warrior_anim_${color}`, true);
                });
            }

            // 3. Lunge Tween (Match duration to animation approx)
            const startX = attacker.x;
            const lungeDist = 60; // Make lunge more obvious
            const lungX = attackerName === 'player' ? startX + lungeDist : startX - lungeDist;

            scene.tweens.add({
                targets: attacker,
                x: lungX,
                duration: 150, // Faster lunge
                yoyo: true,
                ease: 'Power1',
                onYoyo: () => {
                    // 4. Impact Effect - Add slash at the impact point (victim's position ideally, or midpoint)
                    // Visual position logic: if player attacks, slash should be on enemy 
                    const impactX = attackerName === 'player' ? victim.x : victim.x;
                    const impactY = victim.y;

                    const color = attackerName === 'player' ? 0xffffff : 0xff4444;
                    const direction = attackerName === 'player' ? 1 : -1;
                    createSlashEffect(scene, impactX, impactY, color, direction);

                    // 5. Shake Victim
                    scene.tweens.add({
                        targets: victim,
                        x: victim.x + (Math.random() * 10 - 5),
                        duration: 50,
                        yoyo: true,
                        repeat: 3
                    });
                }
            });
        }

    }, [combatEvent]);

    // --- HELPERS ---

    function createWarrior(scene: Phaser.Scene, x: number, y: number, name: string, data: any): void {
        const container = scene.add.container(x, y);
        container.setName(name);

        // Add Sprite
        const color = (data as any).modelColor || 'blue';
        const idleAnim = `warrior_anim_${color}`;
        // Fallback to blue if specific anim doesn't exist (though we created all)
        const finalAnim = scene.anims.exists(idleAnim) ? idleAnim : 'warrior_anim_blue';

        const baseScale = BASE_SCALE; // Use the constant defined at component level
        if (scene.anims.exists(finalAnim)) {
            const sprite = scene.add.sprite(0, -32, `warrior_sheet_${color}`); // Initial texture
            sprite.setName('sprite');
            sprite.play(finalAnim);
            sprite.setScale(baseScale);
            container.add(sprite);
        } else {
            // Fallback text if something failed
            const text = scene.add.text(0, 0, '?', { fontSize: '32px' });
            container.add(text);
        }

        // Shadow
        const shadow = scene.add.ellipse(0, 30, 40, 10, 0x000000, 0.3);
        container.addAt(shadow, 0); // Add at bottom
    }

    function createSlashEffect(scene: Phaser.Scene, x: number, y: number, color: number, direction: number) {
        // Create a cool arc slash
        const slash = scene.add.graphics({ x, y });
        slash.setDepth(100); // Ensure it's on top

        // Use path for curves as Graphics.quadraticBezierTo is not available
        const path = new Phaser.Curves.Path(-20 * direction, -30);
        path.quadraticBezierTo(20 * direction, 0, -20 * direction, 30);

        // Draw Main Arc
        slash.lineStyle(6, color, 1);
        path.draw(slash);

        // Draw Glow/Inner Arc
        slash.lineStyle(2, 0xffffff, 0.8);
        path.draw(slash);

        // Initial state
        slash.setScale(0.5);
        slash.setAlpha(1);

        // Rotate based on direction slightly for variety
        slash.setRotation((Math.random() * 0.5 - 0.25) * direction);

        scene.tweens.add({
            targets: slash,
            scaleX: 2.5,
            scaleY: 2.5,
            alpha: 0,
            x: x + (30 * direction), // Move forward in attack direction
            duration: 300,
            ease: 'Quad.out',
            onComplete: () => slash.destroy()
        });
    }

    // The container has FIXED dimensions that don't change with page layout.
    // Using flex-none to prevent flex shrinking/growing.
    // The container height is fixed per breakpoint to ensure consistent canvas size.
    return (
        <div
            ref={parentEl}
            className="w-full max-w-[800px] mx-auto overflow-hidden rounded-3xl flex-none"
            style={{
                // Fixed heights that won't change with content
                height: 'clamp(160px, 25vw, 300px)',
            }}
        />
    );
};

export default BattleScene;
