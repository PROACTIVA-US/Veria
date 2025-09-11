import { pluginHost } from './pluginHost';
export function renderForm(container: HTMLElement, typeName: string, onSubmit: (data:any)=>void) {
  if (!pluginHost.manifest) throw new Error('Manifest not loaded');
  const def = pluginHost.manifest.nodeTypes[typeName]; if (!def) throw new Error(`Unknown type ${typeName}`);
  const schema = def.schema || {}; const props = schema.properties || {};
  container.innerHTML = ''; const form = document.createElement('form');
  for (const key of Object.keys(props)) { const label = document.createElement('label'); label.textContent = key; const input = document.createElement('input'); input.name = key; input.required = (schema.required||[]).includes(key); form.appendChild(label); form.appendChild(input); form.appendChild(document.createElement('br')); }
  const btn = document.createElement('button'); btn.type = 'submit'; btn.textContent = 'Save'; form.appendChild(btn);
  form.addEventListener('submit', (e) => { e.preventDefault(); const fd = new FormData(form); const obj:any = {}; for (const [k,v] of fd.entries()) obj[k]=v; onSubmit(obj); });
  container.appendChild(form);
}
