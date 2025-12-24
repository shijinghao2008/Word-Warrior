
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

interface WarriorPreviewProps {
    skinColor: string;
    hairColor: string;
    armorId: string;
    weaponId: string;
    modelColor?: string; // Added prop
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
                preload: preload,
                create: create,
                update: update
            },
            pixelArt: true
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        function preload(this: Phaser.Scene) {
            this.load.image('warrior_idle_blue', '/assets/warrior/warrior_idle_v3.png?v=6');
            this.load.image('warrior_idle_red', '/assets/warrior/warrior_idle_red.png?v=6');
            this.load.image('warrior_idle_yellow', '/assets/warrior/warrior_idle_yellow.png?v=6');
            this.load.image('warrior_idle_purple', '/assets/warrior/warrior_idle_purple.png?v=6');
            this.load.image('warrior_idle_black', '/assets/warrior/warrior_idle_black.png?v=6');
        }

        function create(this: Phaser.Scene) {
            sceneRef.current = this;

            // Generate Animations
            const colors = ['blue', 'red', 'yellow', 'purple', 'black'];

            colors.forEach(color => {
                const keyRaw = `warrior_idle_${color}`;
                const keyAnim = `warrior_anim_${color}`;
                const keySheet = `warrior_sheet_${color}`;

                if (!this.textures.exists(keyRaw)) return;

                const rawTex = this.textures.get(keyRaw);
                const source = rawTex.getSourceImage() as any;

                const fWidth = Math.floor(source.width / 8);
                const fHeight = source.height;

                // Only create if not exists
                if (!this.textures.exists(keySheet)) {
                    this.textures.addSpriteSheet(keySheet, source, {
                        frameWidth: fWidth,
                        frameHeight: fHeight
                    });
                }

                if (!this.anims.exists(keyAnim)) {
                    this.anims.create({
                        key: keyAnim,
                        frames: this.anims.generateFrameNumbers(keySheet, { start: 0, end: 7 }),
                        frameRate: 10,
                        repeat: -1
                    });
                }
            });

            const container = this.add.container(150, 200);
            container.setName('preview_char');

            // Create sprite (placeholder texture initially, will be swapped)
            const sprite = this.add.sprite(0, 0, 'warrior_sheet_blue');
            sprite.setName('sprite');
            sprite.setScale(4);

            container.add(sprite);

            updateColor(this, props);
        }

        function update(this: Phaser.Scene) {
            // Optional bobbing
        }

        return () => {
            game.destroy(true);
        };
    }, []);

    useEffect(() => {
        const scene = sceneRef.current;
        if (scene) {
            updateColor(scene, props);
        }
    }, [props]);

    function updateColor(scene: Phaser.Scene, data: WarriorPreviewProps) {
        const char = scene.children.getByName('preview_char') as Phaser.GameObjects.Container;
        if (!char) return;

        const sprite = char.getByName('sprite') as Phaser.GameObjects.Sprite;
        if (!sprite) return;

        const color = (data as any).modelColor || 'blue';
        const animKey = `warrior_anim_${color}`;

        if (scene.anims.exists(animKey)) {
            sprite.play(animKey, true);
            // Ensure any tint is cleared
            sprite.clearTint();
        } else {
            console.warn(`Animation ${animKey} not found!`);
            // Fallback
            if (scene.anims.exists('warrior_anim_blue')) {
                sprite.play('warrior_anim_blue', true);
            }
        }
    }

    return <div ref={parentEl} className="w-full h-full flex items-center justify-center rounded-2xl overflow-hidden" />;
};

export default WarriorPreview;
