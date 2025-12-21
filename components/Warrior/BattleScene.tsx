
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

const BattleScene: React.FC<BattleSceneProps> = ({ playerIds, enemyIds, combatEvent }) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const parentEl = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<Phaser.Scene | null>(null);

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
                create: create,
                update: update
            }
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        function create(this: Phaser.Scene) {
            sceneRef.current = this;

            // --- PLAYER ---
            createWarrior(this, 200, 250, 'player', playerIds);

            // --- ENEMY ---
            createWarrior(this, 600, 250, 'enemy', enemyIds);
            const enemy = this.children.getByName('enemy') as Phaser.GameObjects.Container;
            if (enemy) enemy.setScale(-1, 1); // Face left
        }

        function update(this: Phaser.Scene) {
            const player = this.children.getByName('player') as Phaser.GameObjects.Container;
            const enemy = this.children.getByName('enemy') as Phaser.GameObjects.Container;

            // Idle "Bobbing" Animation
            if (player) {
                player.y = 250 + Math.sin(this.time.now / 400) * 3;
            }
            if (enemy) {
                enemy.y = 250 + Math.sin(this.time.now / 500 + 1) * 3;
            }
        }

        return () => {
            game.destroy(true);
        };
    }, []);

    // --- RE-RENDER VISUALS WHEN PROPS CHANGE ---
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;

        // Re-draw player
        const player = scene.children.getByName('player') as Phaser.GameObjects.Container;
        if (player) {
            player.removeAll(true);
            drawWarriorGraphics(scene, player, playerIds);
        }

    }, [playerIds]); // Only player updates dynamically usually

    // --- COMBAT ANIMATIONS ---
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene || !combatEvent) return;

        let attackerName = combatEvent.target === 'player' ? 'enemy' : 'player';
        const attacker = scene.children.getByName(attackerName) as Phaser.GameObjects.Container;
        const victim = scene.children.getByName(combatEvent.target) as Phaser.GameObjects.Container;

        if (!attacker || !victim) return;

        if (combatEvent.type === 'attack') {
            // 1. Arm Swing Animation
            const hand = attacker.getByName('hand');
            if (hand) {
                scene.tweens.add({
                    targets: hand,
                    angle: attackerName === 'player' ? 90 : -90, // Swing down
                    duration: 150,
                    yoyo: true
                });
            }

            // 2. Lunge Tween
            const startX = attacker.x;
            const lungeDist = 60;
            const lungX = attackerName === 'player' ? startX + lungeDist : startX - lungeDist;

            scene.tweens.add({
                targets: attacker,
                x: lungX,
                duration: 150,
                yoyo: true,
                onYoyo: () => {
                    // 3. Impact Effect
                    const color = attackerName === 'player' ? 0xffffff : 0xff4444;
                    createSlashEffect(scene, victim.x, victim.y, color);

                    // 4. Shake Victim
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
        drawWarriorGraphics(scene, container, data);
        return container;
    }

    function drawWarriorGraphics(scene: Phaser.Scene, container: Phaser.GameObjects.Container, data: any) {
        // Colors
        const skinColor = parseInt(data.skinColor.replace('#', '0x'));
        const hairColor = parseInt(data.hairColor?.replace('#', '0x') || '0x000000');

        // 1. Legs (Back)
        const legBack = scene.add.rectangle(10, 30, 12, 24, 0x333333);
        container.add(legBack);

        // 2. Body
        const bodyColor = data.armorId !== 'default' ? 0x888888 : skinColor;
        const body = scene.add.rectangle(0, 0, 30, 40, bodyColor);
        container.add(body);

        // Armor Design (Simple Chestplate)
        if (data.armorId !== 'default') {
            const armorColor = data.armorId === 'arm_golden' ? 0xffd700 : 0xcccccc;
            const chest = scene.add.rectangle(0, -5, 24, 20, armorColor);
            container.add(chest);
        }

        // 3. Head
        const head = scene.add.circle(0, -30, 14, skinColor);
        container.add(head);

        // Eyes
        // const eyeLCor = data.skinColor === '#000000' ? 0xffffff : 0x000000;
        const eyeR = scene.add.circle(6, -32, 2, 0x000000); // Only right eye visible for side view?
        container.add(eyeR);

        // Hair (Simple Block)
        const hair = scene.add.rectangle(-4, -38, 22, 10, hairColor);
        container.add(hair);

        // 4. Legs (Front)
        const legFront = scene.add.rectangle(-10, 30, 12, 24, 0x333333);
        container.add(legFront);

        // 5. Arm & Weapon Hand (Pivot point for animation)
        const handContainer = scene.add.container(0, -5);
        handContainer.setName('hand');

        // Arm
        const arm = scene.add.rectangle(0, 10, 10, 24, skinColor);
        handContainer.add(arm);

        // Weapon
        drawWeapon(scene, handContainer, data.weaponId);

        container.add(handContainer);
    }

    function drawWeapon(scene: Phaser.Scene, container: Phaser.GameObjects.Container, weaponId: string) {
        // Weapon held in hand (offset relative to hand container)
        // Hand pivot is shoulder (0, -5 relative to body). Weapon is at end of arm (0, 20).

        if (weaponId === 'default') return;

        const wY = 20;

        if (weaponId === 'wpn_wood_sword') {
            const blade = scene.add.rectangle(0, wY - 20, 6, 40, 0x8b4513); // Wood
            const guard = scene.add.rectangle(0, wY, 16, 4, 0x5c3a21);
            container.add([blade, guard]);
        }
        else if (weaponId === 'wpn_iron_sword') {
            const blade = scene.add.rectangle(0, wY - 25, 8, 50, 0xeeeeee); // Iron
            const guard = scene.add.rectangle(0, wY, 20, 4, 0x444444);
            container.add([blade, guard]);
        }
        else if (weaponId === 'wpn_flame_blade') {
            const blade = scene.add.rectangle(0, wY - 30, 10, 60, 0xff4500); // Orange Red
            const core = scene.add.rectangle(0, wY - 30, 4, 50, 0xffff00); // Yellow Core
            const guard = scene.add.rectangle(0, wY, 24, 6, 0x8b0000);
            container.add([blade, core, guard]);
        }
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

export default BattleScene;
