import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

@Component({
  selector: 'app-three-background',
  templateUrl: './three-background.component.html',
  styleUrls: ['./three-background.component.scss']
})
export class ThreeBackgroundComponent implements OnInit, OnDestroy {
  @ViewChild('bgCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private animationId: any;
  private mouse = { x: 0, y: 0 };

  private spheres: THREE.Mesh[] = [];
  private particles: THREE.Points | null = null;
  private letters: THREE.Sprite[] = [];
  private icons: THREE.Sprite[] = []; // 🧩 quiz icons
  private ideaBursts: THREE.Mesh[] = []; // 💬 idea sparks

  ngOnInit(): void {
    this.initScene();
    this.animate();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
  }

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;
    this.scene = new THREE.Scene();

    // 🌅 Gradient Background
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 1;
    gradientCanvas.height = 256;
    const ctx = gradientCanvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#0f2027');
    gradient.addColorStop(0.5, '#203a43');
    gradient.addColorStop(1, '#133646ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 256);
    this.scene.background = new THREE.CanvasTexture(gradientCanvas);

    // 🎥 Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    this.camera.position.z = 400;

    // ⚙️ Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // 💡 Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const directional = new THREE.DirectionalLight(0x88ccff, 0.8);
    directional.position.set(100, 200, 300);
    this.scene.add(ambient, directional);

    // ⚪ Floating Spheres
    const sphereGeometry = new THREE.SphereGeometry(15, 32, 32);
    const colors = [0xffaacc, 0x99ddff, 0xaaffcc, 0xffee99];
    for (let i = 0; i < 6; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        metalness: 0.3,
        roughness: 0.6,
        transparent: true,
        opacity: 0.8,
        emissive: new THREE.Color(colors[i % colors.length]),
        emissiveIntensity: 0.2
      });
      const sphere = new THREE.Mesh(sphereGeometry, material);
      sphere.position.set(
        (Math.random() - 0.5) * 800,
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 400
      );
      this.scene.add(sphere);
      this.spheres.push(sphere);
    }

    // ✨ Particles
    const particleCount = 2000;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      particlePositions[i] = (Math.random() - 0.5) * 2000;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      transparent: true,
      opacity: 0.6,
    });
    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particles);

    // 🪶 Add small glowing quiz letters
    const quizSymbols = ['Q', 'A', '?', '✓', '✕'];
    for (let i = 0; i < 10; i++) {
      const letter = quizSymbols[Math.floor(Math.random() * quizSymbols.length)];
      const sprite = this.createQuizLetter(letter);
      sprite.position.set(
        (Math.random() - 0.5) * 800,
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 200
      );
      sprite.scale.set(40, 40, 1);
      this.scene.add(sprite);
      this.letters.push(sprite);
    }

    // 🧩 Floating quiz icons (💡🏆⭐)
    const icons = ['💡', '⭐', '🏆'];
    for (let i = 0; i < 6; i++) {
      const iconChar = icons[Math.floor(Math.random() * icons.length)];
      const sprite = this.createIconSprite(iconChar);
      sprite.position.set(
        (Math.random() - 0.5) * 700,
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 300
      );
      sprite.scale.set(20, 20, 1);
      this.scene.add(sprite);
      this.icons.push(sprite);
    }

    // 🌟 Bloom effect
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5,
      0.6,
      0.1
    );
    this.composer.addPass(bloomPass);

    // 💬 Idea burst generator (every few seconds)
    setInterval(() => this.createIdeaBurst(), 3500);
  }

  /** 🩵 Create glowing quiz letter */
  private createQuizLetter(char: string): THREE.Sprite {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#4a6fa5');
    gradient.addColorStop(1, '#8e5a9f');

    ctx.font = 'bold 90px "Poppins", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#ffd580';
    ctx.shadowBlur = 15;
    ctx.fillText(char, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(material);
  }

  /** 🧩 Create quiz icon (💡🏆⭐) */
  private createIconSprite(icon: string): THREE.Sprite {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '90px "Segoe UI Emoji"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.shadowColor = '#ffd580';
    ctx.shadowBlur = 20;
    ctx.fillText(icon, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(material);
  }

  /** 💬 Create a short-lived "idea burst" glow */
  private createIdeaBurst(): void {
    const geometry = new THREE.SphereGeometry(3, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.8
    });
    const burst = new THREE.Mesh(geometry, material);
    burst.position.set(
      (Math.random() - 0.5) * 600,
      (Math.random() - 0.5) * 300,
      (Math.random() - 0.5) * 200
    );
    this.scene.add(burst);
    this.ideaBursts.push(burst);

    // fade and expand animation
    const startTime = Date.now();
    const duration = 1200; // ms
    const animateBurst = () => {
      const elapsed = Date.now() - startTime;
      const t = elapsed / duration;
      burst.scale.setScalar(1 + t * 4);
      (burst.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
      if (t < 1) requestAnimationFrame(animateBurst);
      else {
        this.scene.remove(burst);
        this.ideaBursts = this.ideaBursts.filter(b => b !== burst);
      }
    };
    animateBurst();
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    const time = Date.now() * 0.001;

    // 🌀 Animate spheres
    this.spheres.forEach((sphere, i) => {
      sphere.position.y += Math.sin(time + i) * 0.2;
      sphere.position.x += Math.cos(time * 0.3 + i) * 0.1;
    });

    // ✨ Animate quiz letters
    this.letters.forEach((letter, i) => {
      letter.position.y += Math.sin(time * 0.3 + i) * 0.1;
      letter.position.x += Math.cos(time * 0.2 + i) * 0.05;
      letter.material.opacity = 0.6 + 0.4 * Math.sin(time * 0.5 + i);
    });

    // 🧩 Animate icons
    this.icons.forEach((icon, i) => {
      icon.position.y += Math.sin(time * 0.5 + i) * 0.15;
      icon.material.opacity = 0.7 + 0.3 * Math.sin(time * 0.8 + i);
    });

    // ✨ Particle rotation
    if (this.particles) {
      this.particles.rotation.y += 0.0005;
      this.particles.rotation.x += 0.0003;
    }

    // 🎥 Parallax
    this.camera.position.x += (this.mouse.x * 80 - this.camera.position.x) * 0.05;
    this.camera.position.y += (-this.mouse.y * 50 - this.camera.position.y) * 0.05;
    this.camera.lookAt(0, 0, 0);

    this.composer.render();
  };

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  };

  private onMouseMove = (event: MouseEvent) => {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
  };
}
