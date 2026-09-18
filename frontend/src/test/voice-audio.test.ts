import { afterEach, expect, it, vi } from "vitest";
import { speechWav } from "@/lib/orca/voice-audio";
afterEach(()=>vi.unstubAllGlobals());
it("caps delayed recording PCM at exactly 45 seconds and encodes mono 16 kHz WAV", async()=>{
  const close=vi.fn(); let length=0;
  vi.stubGlobal("AudioContext",class {decodeAudioData=async()=>({duration:46.2});close=close;});
  vi.stubGlobal("OfflineAudioContext",class {
    destination={};
    constructor(channels:number,frames:number,rate:number){expect(channels).toBe(1);expect(rate).toBe(16000);length=frames;}
    createBufferSource(){return {buffer:null,connect:vi.fn(),start:vi.fn()};}
    async startRendering(){return {getChannelData:()=>new Float32Array(length)};}
  });
  const result=await speechWav({arrayBuffer:async()=>new ArrayBuffer(1)} as Blob);
  expect(length).toBe(720000);
  expect(result.type).toBe("audio/wav");
  expect(result.size).toBe(44+720000*2);
  expect(close).toHaveBeenCalledOnce();
});
