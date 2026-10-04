import * as THREE from "three";

export const StressHeatmapShader = {
  uniforms: {
    uStressIntensity: { value: 0.3 }, // Normalized 0.0 to 1.5
    uTime: { value: 0.0 },
    uIsolineDensity: { value: 24.0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uStressIntensity;
    uniform float uTime;
    uniform float uIsolineDensity;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    // Standard 5-stop Turbo/Jet FEA Heatmap Color Ramp
    vec3 getFEAColor(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 c0 = vec3(0.05, 0.15, 0.85); // Blue (Safe)
      vec3 c1 = vec3(0.0, 0.75, 0.85);  // Cyan
      vec3 c2 = vec3(0.15, 0.85, 0.2);  // Green (Nominal)
      vec3 c3 = vec3(0.95, 0.85, 0.1);  // Yellow (Elevated)
      vec3 c4 = vec3(0.9, 0.1, 0.05);   // Crimson Red (Yield Limit)

      if (t < 0.25) return mix(c0, c1, t / 0.25);
      if (t < 0.50) return mix(c1, c2, (t - 0.25) / 0.25);
      if (t < 0.75) return mix(c2, c3, (t - 0.50) / 0.25);
      return mix(c3, c4, (t - 0.75) / 0.25);
    }

    void main() {
      // Localized tooth root bending gradient based on radial distance from center
      float radius = length(vPosition.yz);
      float rootFilletGradient = smoothstep(0.4, 0.95, radius);

      // Total scalar stress field
      float localStress = clamp(uStressIntensity * rootFilletGradient, 0.0, 1.2);

      // Base false-color
      vec3 baseColor = getFEAColor(localStress);

      // Dynamic FEA Isoline Contours
      float isoField = fract(localStress * uIsolineDensity);
      float isoline = smoothstep(0.0, 0.08, isoField) * (1.0 - smoothstep(0.92, 1.0, isoField));
      
      // Composite contour lines into heatmap
      vec3 finalColor = mix(baseColor * 0.45, baseColor, isoline);

      // Soft directional light shading
      vec3 lightDir = normalize(vec3(1.0, 1.5, 1.0));
      float diff = max(dot(vNormal, lightDir), 0.25);

      gl_FragColor = vec4(finalColor * diff, 1.0);
    }
  `
};

export function createStressMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(StressHeatmapShader.uniforms),
    vertexShader: StressHeatmapShader.vertexShader,
    fragmentShader: StressHeatmapShader.fragmentShader,
    side: THREE.DoubleSide,
  });
}