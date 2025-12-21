
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

interface BattleSceneProps {
    playerIds: {
        skinColor: string;
        hairColor: string;
        armorId: string;
        weaponId: string;
    };
    enemyIds: {
        skinColor: string;
        armorId: string;
        weaponId: string;
    };
    combatEvent: { type: 'attack' | 'hit' | 'block'; target: 'player' | 'enemy'; damage?: number } | null;
}

const ChantBattleScene: React.FC<BattleSceneProps> = ({ playerIds, enemyIds, combatEvent }) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const parentEl = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<Phaser.Scene | null>(null);
    const hitScaleRatioRef = useRef<number>(1);
    const attackScaleRatioRef = useRef<number>(1);

    useEffect(() => {
        if (!parentEl.current) return;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: parentEl.current,
            width: 800,
            height: 400,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
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
            this.load.image('warrior_idle_raw', '/assets/warrior/warrior_idle_v3.png');
            this.load.image('warrior_hit_raw', '/assets/warrior/warrior_hit.png');
            this.load.image('warrior_attack_1_raw', '/assets/warrior/warrior_attack_1.png');
            this.load.image('warrior_attack_2_raw', '/assets/warrior/warrior_attack_2.png');
        }

        function create(this: Phaser.Scene) {
            sceneRef.current = this;

            // --- 1. SETUP ANIMATIONS HELPER ---
            const createAnimFromRaw = (keyRaw: string, keyFinal: string, animKey: string, framesCount: number, rate: number = 10, repeat: number = -1): number | undefined => {
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

                return fWidth;
            };

            // --- 2. CREATE SPECIFIC ANIMATIONS ---
            const idleWidth = createAnimFromRaw('warrior_idle_raw', 'warrior_idle_final', 'warrior_idle_anim', 8, 10, -1);
            const hitWidth = createAnimFromRaw('warrior_hit_raw', 'warrior_hit_final', 'warrior_hit_anim', 6, 10, 0); // Repeat 0 = play once

            // Attack Anims (4 frames)
            const atk1Width = createAnimFromRaw('warrior_attack_1_raw', 'warrior_attack_1_final', 'warrior_attack_1_anim', 4, 12, 0);
            const atk2Width = createAnimFromRaw('warrior_attack_2_raw', 'warrior_attack_2_final', 'warrior_attack_2_anim', 4, 12, 0);

            if (idleWidth && hitWidth) {
                hitScaleRatioRef.current = idleWidth / hitWidth;
            }
            if (idleWidth && atk1Width) {
                // Assuming both attacks have same dimensions since they are from same set
                attackScaleRatioRef.current = idleWidth / atk1Width;
            }

            // --- 3. CREATE CHARACTERS ---
            createWarrior(this, 200, 250, 'player', playerIds);
            createWarrior(this, 600, 250, 'enemy', enemyIds);

            const enemy = this.children.getByName('enemy') as Phaser.GameObjects.Container;
            if (enemy) {
                enemy.setScale(-1, 1); // Face left
                const sprite = enemy.getByName('sprite') as Phaser.GameObjects.Sprite;
                if (sprite) sprite.setTint(0xffaaaa);
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
    useEffect(() => {
        // With spritesheets, we don't redraw composed graphics on ID changes currently.
        // Future: Swap spritesheets based on armorId/weaponId
    }, [playerIds]);

    // --- COMBAT ANIMATIONS ---
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene || !combatEvent) return;

        let attackerName = combatEvent.target === 'player' ? 'enemy' : 'player';
        const attacker = scene.children.getByName(attackerName) as Phaser.GameObjects.Container;
        const victim = scene.children.getByName(combatEvent.target) as Phaser.GameObjects.Container;

        if (!attacker || !victim) return;

        // 1. Play Hit Animation on Victim
        const victimSprite = victim.getByName('sprite') as Phaser.GameObjects.Sprite;
        if (victimSprite) {
            // Stop any existing animation and play hit. forceRestart = true
            // Apply scale correction if hit texture is different size
            const baseScale = 2.5;
            victimSprite.setScale(baseScale * hitScaleRatioRef.current);

            victimSprite.play('warrior_hit_anim', true);

            // Return to idle after. 'animationcomplete' fires when non-looping anim finishes
            victimSprite.once('animationcomplete', () => {
                victimSprite.setScale(baseScale); // Reset scale
                victimSprite.play('warrior_idle_anim', true);
            });
        }

        if (combatEvent.type === 'attack') {
            // 2. Play Random Attack Animation on Attacker
            const attackerSprite = attacker.getByName('sprite') as Phaser.GameObjects.Sprite;
            if (attackerSprite) {
                const isAtk1 = Math.random() > 0.5;
                const animKey = isAtk1 ? 'warrior_attack_1_anim' : 'warrior_attack_2_anim';
                const baseScale = 2.5;

                attackerSprite.setScale(baseScale * attackScaleRatioRef.current);
                attackerSprite.play(animKey, true);

                attackerSprite.once('animationcomplete', () => {
                    attackerSprite.setScale(baseScale);
                    attackerSprite.play('warrior_idle_anim', true);
                });
            }

            // 3. Lunge Tween (Match duration to animation approx)
            const startX = attacker.x;
            const lungeDist = 40; // Smaller lunge since sprite moves a bit
            const lungX = attackerName === 'player' ? startX + lungeDist : startX - lungeDist;

            scene.tweens.add({
                targets: attacker,
                x: lungX,
                duration: 200,
                yoyo: true,
                ease: 'Power1',
                onYoyo: () => {
                    // 4. Impact Effect
                    const color = attackerName === 'player' ? 0xffffff : 0xff4444;
                    createSlashEffect(scene, victim.x, victim.y, color);

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

    function createWarrior(scene: Phaser.Scene, x: number, y: number, name: string, data: any) {
        const container = scene.add.container(x, y);
        container.setName(name);

        // Add Sprite
        // We assume 'warrior_idle' is available. If not loaded yet (race condition), might need check.
        // But in 'create', it should be ready if loaded in preload.
        if (scene.textures.exists('warrior_idle_final')) {
            const sprite = scene.add.sprite(0, -32, 'warrior_idle_final');
            sprite.setName('sprite');
            sprite.play('warrior_idle_anim');
            sprite.setScale(2.5); // Pixel art scaling
            container.add(sprite);
        } else {
            // Fallback text if something failed
            const text = scene.add.text(0, 0, '?', { fontSize: '32px' });
            container.add(text);
        }

        // Shadow
        const shadow = scene.add.ellipse(0, 30, 40, 10, 0x000000, 0.3);
        container.addAt(shadow, 0); // Add at bottom

        return container;
    }

    function createSlashEffect(scene: Phaser.Scene, x: number, y: number, color: number) {
        const slash = scene.add.graphics({ x, y });
        slash.lineStyle(4, color, 1);
        slash.beginPath();
        slash.moveTo(-20, -20);
        slash.lineTo(20, 20);
        slash.strokePath();

        scene.tweens.add({
            targets: slash,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 200,
            onComplete: () => slash.destroy()
        });
    }

    return <div ref={parentEl} className="w-full h-[300px] md:h-[400px] overflow-hidden rounded-3xl" />;
};

export default ChantBattleScene;
