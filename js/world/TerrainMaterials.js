import * as THREE from 'three';

// World-space material blending preserves the generated collision heightfield.
export function createGroundMaterial(terrain, textures) {
  const material = new THREE.MeshStandardMaterial({roughness: .94, metalness: 0});
  material.userData.preservePBR = true;
  material.onBeforeCompile = shader => {
    for (const name of ['grass','dirt','rock','sand']) shader.uniforms['u'+name] = {value:textures[name]};
    shader.uniforms.uBiome = {value: terrain.biome === 'arctic' ? 2 : terrain.biome === 'desert' ? 1 : 0};
    shader.vertexShader = 'varying vec3 vTerrainPos; varying vec3 vTerrainNormal;\n'+shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTerrainPos=position; vTerrainNormal=normal;');
    shader.fragmentShader = `varying vec3 vTerrainPos; varying vec3 vTerrainNormal;
      uniform sampler2D ugrass,udirt,urock,usand; uniform float uBiome;
      float field(vec2 p){return sin(p.x*.19+sin(p.y*.13))*sin(p.y*.17+cos(p.x*.11))*.5+.5;}
      vec3 surface(sampler2D tex,vec2 p){
        #ifdef TERRAIN_SIMPLE
        return texture2D(tex,p).rgb;
        #else
        return mix(texture2D(tex,p).rgb,texture2D(tex,mat2(.8,-.6,.6,.8)*p*.73+vec2(.32,.57)).rgb,.45);
        #endif
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec2 p=vTerrainPos.xz*.21;
      float variation=field(vTerrainPos.xz);
      float dirt=smoothstep(.38,.78,variation)*.65;
      float slope=1.0-abs(normalize(vTerrainNormal).y);
      float stone=clamp(smoothstep(.12,.48,slope)+smoothstep(3.8,7.5,vTerrainPos.y)*.5,0.,1.);
      float shore=1.0-smoothstep(.05,1.25,vTerrainPos.y);
      vec3 grassColor=surface(ugrass,p)*vec3(.78,1.04,.79);
      vec3 dirtColor=surface(udirt,p*.85);
      vec3 rockColor=surface(urock,p*.55);
      #ifndef TERRAIN_SIMPLE
      // Project cliff faces from the side instead of stretching top-down UVs.
      vec3 weights=pow(abs(normalize(vTerrainNormal)),vec3(4.));
      weights/=max(dot(weights,vec3(1.)),.001);
      rockColor=rockColor*weights.y
        +texture2D(urock,vTerrainPos.zy*.115).rgb*weights.x
        +texture2D(urock,vTerrainPos.xy*.115).rgb*weights.z;
      #endif
      vec3 sandColor=surface(usand,p*.75);
      vec3 ground=mix(grassColor,dirtColor,dirt);
      ground=mix(ground,rockColor,stone);
      ground=mix(ground,sandColor,shore*.92);
      if(uBiome>0.5&&uBiome<1.5)ground=mix(sandColor,dirtColor,variation*.42+stone*.2);
      if(uBiome>1.5){
        float grain=dot(sandColor,vec3(.299,.587,.114));
        ground=mix(vec3(.78,.85,.88)*mix(.86,1.08,grain),rockColor,clamp(stone*.8+dirt*.23,0.,.8));
      }
      #ifndef TERRAIN_SIMPLE
      // Fine wind-carved bands follow the biome without additional texture reads.
      float ridges=sin(vTerrainPos.x*.85+sin(vTerrainPos.z*.22)*2.8);
      if(uBiome>.5)ground*=mix(.96,1.04,ridges*.5+.5);
      #endif
      ground*=mix(.88,1.08,field(vTerrainPos.xz*.37));
      // Broad meadow patches break up repetition without more texture fetches.
      float meadow=field(vTerrainPos.xz*.21);
      if(uBiome<.5)ground*=mix(vec3(.83,.94,.82),vec3(1.07,1.04,.89),meadow);
      float wet=1.-smoothstep(-.1,.65,vTerrainPos.y);
      ground*=mix(1.,.72,wet);
      diffuseColor.rgb*=ground;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      roughnessFactor=mix(roughnessFactor,.38,1.-smoothstep(-.1,.65,vTerrainPos.y));
    `);
  };
  material.customProgramCacheKey=()=> 'warzone-ground-v3';
  return material;
}

export function createWater(terrain) {
  // Sample the same heightfield as gameplay: shore foam follows coasts and streams.
  const side=terrain.mapSize+1, pixels=new Uint8Array(side*side*4);
  for(let z=0;z<side;z++)for(let x=0;x<side;x++){
    const i=(z*side+x)*4;pixels[i]=Math.round(THREE.MathUtils.clamp((terrain.heightData[z][x]+16)/32,0,1)*255);pixels[i+3]=255;
  }
  const heights=new THREE.DataTexture(pixels,side,side,THREE.RGBAFormat);heights.needsUpdate=true;heights.magFilter=THREE.LinearFilter;heights.minFilter=THREE.LinearFilter;
  const material=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uHeight:{value:heights},uSize:{value:terrain.worldSize},uCameraPos:{value:new THREE.Vector3()},
      uShallow:{value:new THREE.Color(terrain.biome==='arctic'?0x659ca4:0x528d81)},uDeep:{value:new THREE.Color(0x193f50)},
      uSunDirection:{value:new THREE.Vector3(.6,1.,.4).normalize()},uSunColor:{value:new THREE.Color(0xffedce)},uLight:{value:1}},
    vertexShader:`varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform sampler2D uHeight;uniform float uTime,uSize,uLight;uniform vec3 uShallow,uDeep,uCameraPos,uSunDirection,uSunColor;varying vec3 vWorld;
      void main(){
        float bed=texture2D(uHeight,clamp(vWorld.xz/uSize,0.,1.)).r*32.-16.;
        float depth=-.25-bed;if(depth<0.)discard;
        vec2 p=vWorld.xz;
        float flow=sin(p.x*1.8+p.y*.62-uTime*1.4)+sin(p.y*2.3-p.x*.37+uTime*.8);
        vec3 color=mix(uShallow,uDeep,smoothstep(.1,3.8,depth));
        vec3 n=normalize(vec3(cos(p.x*.8+p.y*.3-uTime)*.085,1.,sin(p.y*.9-p.x*.2+uTime)*.065));
        vec3 view=normalize(uCameraPos-vWorld);float fresnel=pow(1.-max(dot(n,view),0.),3.);
        color=mix(color,vec3(.40,.59,.64),fresnel*.5);
        // Broad broken foam ribbons follow the real shoreline heightfield.
        float band=sin(depth*16.-uTime*1.3+flow*.7)*.5+.5;
        float foam=(1.-smoothstep(.10,.72,depth))*smoothstep(.55,.82,band);
        color=mix(color,vec3(.70,.79,.68),foam*.42);
        float ripple=sin(p.x*.65+p.y*1.45+sin(p.x*.17+uTime*.25)*1.5-uTime*1.1);
        float broken=smoothstep(-.2,.65,sin(p.x*.24-p.y*.11+uTime*.12));
        color+=vec3(.035,.055,.05)*smoothstep(.94,1.,ripple)*broken;
        vec3 halfVector=normalize(view+uSunDirection);
        float sheen=pow(max(dot(n,halfVector),0.),32.);
        float sparkle=pow(max(dot(n,halfVector),0.),180.);
        color*=uLight;
        color+=uSunColor*(sheen*.13+sparkle*.38)*uLight;
        // Pale sand shelves remain visible through the shallows.
        float shelf=(1.-smoothstep(.0,1.4,depth))*(1.-foam);
        color+=vec3(.08,.11,.07)*shelf*uLight;
        gl_FragColor=vec4(color,mix(.68,.97,smoothstep(0.,1.2,depth)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,transparent:true,depthWrite:false
  });
  const geometry=new THREE.PlaneGeometry(terrain.worldSize,terrain.worldSize);geometry.rotateX(-Math.PI/2);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(terrain.worldSize/2,-.25,terrain.worldSize/2);mesh.name='Shore-aware water';
  return {mesh,material};
}

export async function loadGroundTextures(renderer) {
  const loader=new THREE.TextureLoader(),textures={};
  await Promise.all(['grass','dirt','rock','sand'].map(async name=>{
    try{const t=await loader.loadAsync(`assets/textures/environment/${name}.webp`);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer?.capabilities.getMaxAnisotropy()??1);textures[name]=t;}
    catch(error){console.error('Terrain texture unavailable:',name,error);const t=new THREE.DataTexture(new Uint8Array([112,119,85,255]),1,1);t.needsUpdate=true;textures[name]=t;}
  }));return textures;
}
