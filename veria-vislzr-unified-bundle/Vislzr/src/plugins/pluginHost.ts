export type NodeTypeDef = { schema: any, icon?: string };
export type EdgeKindDef = Record<string, unknown>;
export type Manifest = { domain:string; version:string; nodeTypes:Record<string,NodeTypeDef>; edgeKinds:Record<string,EdgeKindDef>; prompts?:Record<string,string>; overlays?: any[] };
export class PluginHost { manifest?: Manifest; async loadManifest(baseUrl:string, domain:string, version='latest'){ const url = `${baseUrl}/packs/${domain}/${version}/manifest`; const res = await fetch(url); if(!res.ok) throw new Error(`Failed to load manifest: ${url}`); this.manifest = await res.json(); } }
export const pluginHost = new PluginHost();
