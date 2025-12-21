
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

interface WarriorPreviewProps {
    skinColor: string;
    hairColor: string;
    armorId: string;
    weaponId: string;
}

const WarriorPreview: React.FC<WarriorPreviewProps> = (props) => {
    const parentEl = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<Phaser.Scene | null>(null);

    useEffect(() => {
        if (!parentEl.current) return;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: parentEl.current,
            width: 300,
            height: 300,
            transparent: true,
            scene: {
                create: create,
                update: update
            }
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        function create(this: Phaser.Scene) {
            sceneRef.current = this;
            const container = this.add.container(150, 200);
            container.setName('preview_char');
            container.setScale(3); // Zoom in

            drawWarrior(this, container, props);
        }

        function update(this: Phaser.Scene) {
            const char = this.children.getByName('preview_char') as Phaser.GameObjects.Container;
            if (char) {
                char.y = 200 + Math.sin(this.time.now / 400) * 3;
            }
        }

        return () => {
            game.destroy(true);
        };
    }, []);

    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;

        const container = scene.children.getByName('preview_char') as Phaser.GameObjects.Container;
        if (container) {
            container.removeAll(true);
            drawWarrior(scene, container, props);
        }
    }, [props]);

    function drawWarrior(scene: Phaser.Scene, container: Phaser.GameObjects.Container, data: WarriorPreviewProps) {
        // Reuse similar logic to BattleScene but simplified/shared if possible.
        // For now, copying to ensure self-contained.

        const skinColor = parseInt(data.skinColor.replace('#', '0x'));
        const hairColor = parseInt(data.hairColor?.replace('#', '0x') || '0x000000');

        // 1. Legs (Back)
        container.add(scene.add.rectangle(10, 30, 12, 24, 0x333333));

        // 2. Body
        const bodyColor = data.armorId !== 'default' ? 0x888888 : skinColor;
        container.add(scene.add.rectangle(0, 0, 30, 40, bodyColor));

        if (data.armorId !== 'default') {
            const armorColor = data.armorId === 'arm_golden' ? 0xffd700 : 0xcccccc;
            container.add(scene.add.rectangle(0, -5, 24, 20, armorColor));
        }

        // 3. Head
        container.add(scene.add.circle(0, -30, 14, skinColor));

        // Eyes (Right)
        container.add(scene.add.circle(6, -32, 2, 0x000000));

        // Hair
        container.add(scene.add.rectangle(-4, -38, 22, 10, hairColor));

        // 4. Legs (Front)
        container.add(scene.add.rectangle(-10, 30, 12, 24, 0x333333));

        // 5. Arm & Weapon
        const handContainer = scene.add.container(0, -5);
        handContainer.add(scene.add.rectangle(0, 10, 10, 24, skinColor));

        drawWeapon(scene, handContainer, data.weaponId);

        container.add(handContainer);
    }

    function drawWeapon(scene: Phaser.Scene, container: Phaser.GameObjects.Container, weaponId: string) {
        if (weaponId === 'default') return;
        const wY = 20;

        if (weaponId === 'wpn_wood_sword') {
            container.add([
                scene.add.rectangle(0, wY - 20, 6, 40, 0x8b4513),
                scene.add.rectangle(0, wY, 16, 4, 0x5c3a21)
            ]);
        }
        else if (weaponId === 'wpn_iron_sword') {
            container.add([
                scene.add.rectangle(0, wY - 25, 8, 50, 0xeeeeee),
                scene.add.rectangle(0, wY, 20, 4, 0x444444)
            ]);
        }
        else if (weaponId === 'wpn_flame_blade') {
            container.add([
                scene.add.rectangle(0, wY - 30, 10, 60, 0xff4500),
                scene.add.rectangle(0, wY - 30, 4, 50, 0xffff00),
                scene.add.rectangle(0, wY, 24, 6, 0x8b0000)
            ]);
        }
    }

    return <div ref={parentEl} className="w-full h-full flex items-center justify-center rounded-2xl overflow-hidden bg-slate-800/50" />;
};

export default WarriorPreview;
