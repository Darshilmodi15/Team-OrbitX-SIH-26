/** Decode the browser's real recording and send mono PCM, not mislabeled MP4/WebM. */
export async function speechWav(recording: Blob): Promise<Blob> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await recording.arrayBuffer());
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start();
    const pcm = (await offline.startRendering()).getChannelData(0);
    const bytes = new ArrayBuffer(44 + pcm.length * 2); const view = new DataView(bytes);
    const tag = (offset:number,text:string) => [...text].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));
    tag(0,"RIFF"); view.setUint32(4,36+pcm.length*2,true); tag(8,"WAVE"); tag(12,"fmt ");
    view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);
    view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);tag(36,"data");view.setUint32(40,pcm.length*2,true);
    pcm.forEach((sample,i)=>{const value=Math.max(-1,Math.min(1,sample));view.setInt16(44+i*2,value*(value<0?32768:32767),true);});
    return new Blob([bytes],{type:"audio/wav"});
  } finally { await context.close(); }
}
