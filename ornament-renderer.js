/* Local vector artwork. No network, model inference or changes to audio. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const palettes = {
    gold_sapphire: {bg:'#09151f',light:'#173a40',gold:'#d7b36b',edge:'#f8e1aa',fill:'#24666b',accent:'#ac443b'},
    ruby_graphite: {bg:'#160e18',light:'#39202a',gold:'#d7a36d',edge:'#ffe0b6',fill:'#a83c3b',accent:'#d69b61'},
    ochre_linen: {bg:'#f3e9d3',light:'#fcf7eb',gold:'#94602e',edge:'#633b20',fill:'#bb6139',accent:'#395d56'}
  };
  let animation = 0;
  function circle(c,r,color,width=1) {
    c.beginPath();c.arc(0,0,r,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();
  }
  function dot(c,x,y,r,color) { c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=color;c.fill(); }
  function leaf(c,x,y,rotation,p,size=14) {
    c.save();c.translate(x,y);c.rotate(rotation);c.beginPath();c.moveTo(0,0);
    c.bezierCurveTo(-size*.8,-size*.8,-size*.4,-size*1.6,0,-size*2);
    c.bezierCurveTo(size*.4,-size*1.6,size*.8,-size*.8,0,0);
    c.fillStyle=p.fill;c.fill();c.strokeStyle=p.gold;c.lineWidth=.7;c.stroke();
    c.beginPath();c.moveTo(0,-2);c.lineTo(0,-size*1.65);c.stroke();c.restore();
  }
  function tulip(c,p) {
    c.strokeStyle=p.gold;c.lineWidth=1.3;
    c.beginPath();c.moveTo(0,30);c.bezierCurveTo(3,15,0,4,0,-9);c.stroke();
    leaf(c,-1,23,-.85,p,9);leaf(c,1,15,.85,p,9);
    c.beginPath();c.moveTo(0,8);c.bezierCurveTo(-19,5,-24,-13,-20,-28);
    c.lineTo(-10,-22);c.quadraticCurveTo(-6,-36,0,-41);
    c.quadraticCurveTo(6,-36,10,-22);c.lineTo(20,-28);
    c.bezierCurveTo(24,-13,19,5,0,8);c.closePath();
    c.fillStyle=p.accent;c.fill();c.strokeStyle=p.edge;c.lineWidth=1;c.stroke();
    c.beginPath();c.moveTo(-10,-22);c.quadraticCurveTo(-12,-5,0,8);
    c.quadraticCurveTo(12,-5,10,-22);c.moveTo(0,-34);c.lineTo(0,4);c.strokeStyle=p.gold;c.stroke();
    dot(c,0,-9,2,p.edge);
  }
  function horse(c,p) {
    c.save();c.scale(1.12,1.12);c.beginPath();c.moveTo(-23,-6);
    c.bezierCurveTo(-17,-13,2,-12,9,-8);c.lineTo(11,-23);c.lineTo(15,-31);
    c.lineTo(18,-26);c.lineTo(27,-23);c.lineTo(25,-17);c.lineTo(18,-18);
    c.bezierCurveTo(19,-5,15,2,11,5);c.lineTo(14,24);c.lineTo(10,24);
    c.lineTo(5,8);c.lineTo(-9,7);c.lineTo(-15,23);c.lineTo(-20,23);
    c.lineTo(-17,5);c.bezierCurveTo(-27,3,-26,-4,-23,-6);c.closePath();
    c.fillStyle=p.accent;c.fill();c.strokeStyle=p.gold;c.lineWidth=1;c.stroke();
    c.beginPath();c.moveTo(-23,-3);c.quadraticCurveTo(-38,-14,-27,-24);c.stroke();
    c.beginPath();c.moveTo(-16,-5);c.quadraticCurveTo(-3,-1,9,-4);c.strokeStyle=p.edge;c.stroke();
    for(let x=-13;x<=5;x+=6)dot(c,x,-5,1.2,p.edge);
    dot(c,19,-22,1.1,p.edge);c.restore();
  }
  function bird(c,p) {
    c.beginPath();c.moveTo(0,7);c.bezierCurveTo(-16,6,-33,-9,-33,-27);
    c.quadraticCurveTo(-10,-21,0,-1);c.quadraticCurveTo(10,-21,33,-27);
    c.bezierCurveTo(33,-9,16,6,0,7);c.fillStyle=p.fill;c.fill();c.strokeStyle=p.gold;c.lineWidth=1;c.stroke();
    for(let k=0;k<4;k++) {
      for(const side of [-1,1]) {c.beginPath();c.moveTo(side*3,1);c.quadraticCurveTo(side*(10+k*4),-7,side*(13+k*6),-18-k*2);c.stroke();}
    }
    c.beginPath();c.moveTo(0,3);c.lineTo(-13,30);c.quadraticCurveTo(0,23,13,30);c.closePath();c.fillStyle=p.accent;c.fill();c.stroke();
    c.beginPath();c.ellipse(0,0,5,17,0,0,TAU);c.fillStyle=p.gold;c.fill();
    dot(c,0,-18,5,p.gold);c.beginPath();c.moveTo(4,-20);c.lineTo(10,-17);c.lineTo(3,-15);c.fill();dot(c,1,-19,1,p.bg);
  }
  function rhombus(c,p) {
    c.save();c.rotate(Math.PI/4);
    for(let i=0;i<3;i++) {const r=21-i*6;c.strokeStyle=i===1?p.accent:p.gold;c.lineWidth=i===1?3:1;c.strokeRect(-r,-r,r*2,r*2);}
    for(const x of [-1,1])for(const y of [-1,1]) {c.beginPath();c.moveTo(x*21,y*12);c.lineTo(x*29,y*12);c.lineTo(x*29,y*21);c.strokeStyle=p.edge;c.lineWidth=1;c.stroke();}
    dot(c,0,0,3,p.accent);c.restore();
  }
  function lyre(c,p) {
    c.strokeStyle=p.gold;c.lineWidth=2;
    for(const side of [-1,1]) {
      c.beginPath();c.moveTo(0,31);c.bezierCurveTo(side*3,16,side*30,-1,side*25,-22);
      c.bezierCurveTo(side*20,-42,side*3,-36,side*7,-24);
      c.bezierCurveTo(side*11,-16,side*19,-24,side*13,-29);c.stroke();
      leaf(c,side*7,19,side*.9,p,8);dot(c,side*25,-18,2,p.edge);
    }
    c.beginPath();c.moveTo(0,28);c.lineTo(0,-27);c.strokeStyle=p.edge;c.lineWidth=.8;c.stroke();
    dot(c,0,-27,4,p.accent);dot(c,0,-12,2,p.gold);
  }
  const renderers={'Казанский тюльпан':tulip,'Мезенский конь':horse,'Щепная птица':bird,'Солярный ромб':rhombus,'Лировидный узор':lyre};
  function drawOrnament(canvas,motifs,symmetry,paletteKey,onDone) {
    if(!canvas)return;
    const c=canvas.getContext('2d');if(!c)return;
    cancelAnimationFrame(animation);
    canvas.width=1024;canvas.height=1024;
    const p=palettes[paletteKey]||palettes.gold_sapphire;
    const selected=(motifs||[]).filter(m=>renderers[m]);if(!selected.length)selected.push('Казанский тюльпан');
    const n=[8,12,16].includes(symmetry)?symmetry:12;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration=reduced?0:700, start=performance.now();
    function paint(now) {
      const progress=duration?Math.min(1,(now-start)/duration):1;
      const ease=1-Math.pow(1-progress,3);
      c.setTransform(1024/600,0,0,1024/600,0,0);
      const bg=c.createRadialGradient(300,260,20,300,300,400);bg.addColorStop(0,p.light);bg.addColorStop(1,p.bg);
      c.fillStyle=bg;c.fillRect(0,0,600,600);c.translate(300,300);
      // Quiet engraved field and outer jewellery rim.
      c.globalAlpha=.1;c.strokeStyle=p.gold;c.lineWidth=.5;
      for(let i=0;i<36;i++){const a=i*TAU/36;c.beginPath();c.moveTo(Math.cos(a)*90,Math.sin(a)*90);c.lineTo(Math.cos(a)*242,Math.sin(a)*242);c.stroke();}c.globalAlpha=1;
      for(const [r,w,col] of [[263,1,p.gold],[258,.7,p.edge],[246,2,p.gold],[238,.6,p.gold],[116,.8,p.gold],[102,1.3,p.gold]])circle(c,r,col,w);
      for(let i=0;i<144;i++) {const a=i*TAU/144;dot(c,Math.cos(a)*252,Math.sin(a)*252,i%3===0?1.8:.9,i%3===0?p.edge:p.gold);}
      // One motif per slot. Selected motifs alternate; no overlapping stacks.
      const slots=Math.ceil(n*ease);
      for(let i=0;i<slots;i++) {
        c.save();c.rotate(i*TAU/n);c.translate(0,-178);
        const scale=n===16?.72:n===12?.88:1.08;c.scale(scale,scale);
        c.globalAlpha=Math.min(1,Math.max(0,(ease*n-i)*2));renderers[selected[i%selected.length]](c,p);c.restore();
      }
      c.globalAlpha=1;
      // Fine foliage follows the gaps between the principal motifs.
      for(let i=0;i<n;i++) {
        c.save();c.rotate((i+.5)*TAU/n);c.globalAlpha=.8*ease;
        c.beginPath();c.moveTo(0,-121);c.quadraticCurveTo(9,-163,0,-217);c.strokeStyle=p.gold;c.lineWidth=.8;c.stroke();
        leaf(c,1,-150,.55,p,7);leaf(c,-1,-174,-.65,p,7);dot(c,0,-218,2,p.edge);c.restore();
      }
      // Central enamel medallion and woven rosette.
      c.globalAlpha=ease;c.fillStyle=p.bg;c.beginPath();c.arc(0,0,88,0,TAU);c.fill();
      circle(c,89,p.gold,1.3);circle(c,82,p.edge,.6);
      for(let i=0;i<8;i++) {
        c.save();c.rotate(i*TAU/8);c.beginPath();c.moveTo(0,-12);
        c.bezierCurveTo(-30,-30,-23,-62,0,-73);c.bezierCurveTo(23,-62,30,-30,0,-12);
        c.fillStyle=i%2?p.fill:p.accent;c.fill();c.strokeStyle=p.gold;c.lineWidth=1;c.stroke();
        c.beginPath();c.moveTo(0,-19);c.lineTo(0,-63);c.strokeStyle=p.edge;c.lineWidth=.6;c.stroke();c.restore();
      }
      dot(c,0,0,19,p.gold);dot(c,0,0,14,p.fill);circle(c,14,p.edge,.7);dot(c,-4,-5,3,p.edge);
      c.globalAlpha=1;
      if(progress<1)animation=requestAnimationFrame(paint);
      else {animation=0;if(onDone)onDone();}
    }
    animation=requestAnimationFrame(paint);
  }
  window.ArtefactOrnaments={drawOrnament};
})();
