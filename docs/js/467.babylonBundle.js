"use strict";(self.webpackChunkbabylonjs_typescript_webpack_template=self.webpackChunkbabylonjs_typescript_webpack_template||[]).push([[467],{22489:(e,t,s)=>{s.d(t,{p:()=>n});const n=(0,s(39371).Z)()},95281:(e,t,s)=>{s.r(t),s.d(t,{default:()=>u});var n=s(8714),a=s(23579),o=s(90972),r=s(32758),i=s(30307),c=(s(68522),s(18913),s(39268),s(22489)),l=s(63239),d=s(98830),h=s(91503),w=s(30766),g=s(42110);const p=s.p+"af84c650d8f3c742962ce5d36ec5bb3f.glb";var f=s(73354);const u=new class{constructor(){this.preTasks=[c.p],this.createScene=async(e,t)=>{const u=new n.x(e);Promise.all([Promise.resolve().then(s.bind(s,31568)),Promise.all([s.e(596),s.e(247)]).then(s.t.bind(s,53596,23))]).then((e=>{console.log(e),u.debugLayer.show({handleResize:!0,overlay:!0,globalRoot:document.getElementById("#root")||void 0})}));const b=new a.Y("my first camera",0,Math.PI/3,10,new o.P(0,0,0),u);b.setTarget(o.P.Zero()),b.attachControl(t,!0),new r.e("light",new o.P(0,1,0),u).intensity=.7;const m=(0,i.$6)("ground",{width:10,height:10},u);u.enablePhysics(null,new w.a(!0,await c.p));const P=new l.y2(new o.P(0,0,0),o._f.Identity(),new o.P(10,.1,10),u),E=new d.Q(m,h.c4.STATIC,!1,u);function A(e){const t=new f.StandardMaterial("material",u);t.diffuseColor=new f.Color3(.5,1,.5);const s=new f.StandardMaterial("material",u);s.diffuseColor=new f.Color3(.5,.5,.5),"moveable"===e.name?e.material=t:e.material=s,e.scaling=new o.P(.08,.08,.08),e.position=new o.P(0,2,0);const n=new o.P(0,0,0);n.addInPlace(e.position),b.setTarget(n)}P.material={friction:.2,restitution:.8},E.shape=P,E.setMassProperties({mass:0});const S=await f.SceneLoader.ImportMeshAsync("","",g.Z,u,void 0),R=await f.SceneLoader.ImportMeshAsync("","",p,u,void 0,".glb"),_=S.meshes[1],y=R.meshes[1];return A(_),A(y),_.updateFacetData(),y.updateFacetData(),new f.HighlightLayer("hl1",u),y.getIndices(),_.facetNb,function(e){const t=[],s=e.getVerticesData(f.VertexBuffer.PositionKind);for(let n=0;n<e.facetNb;n++)t.push(o.P.FromArray(s,3*n))}(y),_.getFacetPosition(0),u}}}},42110:(e,t,s)=>{s.d(t,{Z:()=>n});const n=s.p+"87c16888db5ebec0fb7b6c3bb705d897.glb"},51723:(e,t,s)=>{s.d(t,{w:()=>r});var n=s(6070),a=s(66089),o=s(84686);s(64863).p.AddParser(o.l.NAME_SHADOWGENERATOR,((e,t)=>{if(void 0!==e.shadowGenerators&&null!==e.shadowGenerators)for(let s=0,o=e.shadowGenerators.length;s<o;s++){const o=e.shadowGenerators[s];o.className===a.R.CLASSNAME?a.R.Parse(o,t):n.u.Parse(o,t)}}));class r{constructor(e){this.name=o.l.NAME_SHADOWGENERATOR,this.scene=e}register(){this.scene._gatherRenderTargetsStage.registerStep(o.l.STEP_GATHERRENDERTARGETS_SHADOWGENERATOR,this,this._gatherRenderTargets)}rebuild(){}serialize(e){e.shadowGenerators=[];const t=this.scene.lights;for(const s of t){const t=s.getShadowGenerators();if(t){const s=t.values();for(let t=s.next();!0!==t.done;t=s.next()){const s=t.value;e.shadowGenerators.push(s.serialize())}}}}addFromContainer(e){}removeFromContainer(e,t){}dispose(){}_gatherRenderTargets(e){const t=this.scene;if(this.scene.shadowsEnabled)for(let s=0;s<t.lights.length;s++){const n=t.lights[s],a=n.getShadowGenerators();if(n.isEnabled()&&n.shadowEnabled&&a){const s=a.values();for(let n=s.next();!0!==n.done;n=s.next()){const s=n.value.getShadowMap();-1!==t.textures.indexOf(s)&&e.push(s)}}}}}n.u._SceneComponentInitialization=e=>{let t=e._getComponent(o.l.NAME_SHADOWGENERATOR);t||(t=new r(e),e._addComponent(t))}}}]);
//# sourceMappingURL=467.babylonBundle.js.map