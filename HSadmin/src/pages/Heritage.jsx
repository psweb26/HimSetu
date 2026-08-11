import { useState } from "react";
import { Landmark, Pencil, Plus, Star, Trash2 } from "lucide-react";

import { createHeritage, deleteHeritage, featureHeritage, hideHeritage, listHeritage, updateHeritage } from "../api/heritage";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import Modal from "../components/ui/Modal";
import { useFetch } from "../hooks/useFetch";

const empty = { id: "", title: "", pillar_category: "General", description: "", specification: "", image_url: "" };

export default function Heritage() {
  const { data, error, loading, refresh } = useFetch(listHeritage);
  const [editor, setEditor] = useState(null);
  const [actionError, setActionError] = useState("");
  if (loading && !data) return <Loader />;

  async function save(event) {
    event.preventDefault(); setActionError("");
    try { if (editor.mode === "create") await createHeritage(editor.form); else await updateHeritage(editor.form.id, editor.form); setEditor(null); await refresh(); } catch (err) { setActionError(err.message || "Heritage save failed."); }
  }
  async function act(fn, id) { setActionError(""); try { await fn(id); await refresh(); } catch (err) { setActionError(err.message || "Heritage action failed."); } }

  return <div className="grid gap-4">
    <section className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm"><div><p className="text-[10px] font-black uppercase tracking-widest text-him-river">Hamari Virasat</p><h2 className="mt-1 text-lg font-black text-slate-950">Heritage cards</h2></div><Button onClick={() => setEditor({ mode: "create", form: empty })}><Plus className="h-4 w-4" /> Add</Button></section>
    {error && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">{error}</p>}{actionError && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-him-crimson">{actionError}</p>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(data || []).map((asset) => <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={asset.id}><div className="flex items-start justify-between gap-3"><div className="grid h-10 w-10 place-items-center rounded-md bg-amber-50 text-him-marigold"><Landmark className="h-5 w-5" /></div><span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-900">{asset.pillar_category}</span></div><h3 className="mt-4 text-base font-black text-slate-950">{asset.title}</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-600">{asset.description}</p><p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-700">{asset.specification}</p><div className="mt-4 flex flex-wrap gap-2"><Button className="h-8 px-2" onClick={() => setEditor({ mode: "edit", form: asset })} variant="secondary"><Pencil className="h-3.5 w-3.5" /> Edit</Button><Button className="h-8 px-2" onClick={() => act(featureHeritage, asset.id)} variant="secondary"><Star className="h-3.5 w-3.5" /> Feature</Button><Button className="h-8 px-2" onClick={() => act(hideHeritage, asset.id)} variant="secondary">Hide</Button><Button className="h-8 px-2" onClick={() => act(deleteHeritage, asset.id)} variant="danger"><Trash2 className="h-3.5 w-3.5" /></Button></div></article>)}</div>
    {editor && <Modal onClose={() => setEditor(null)} title={`${editor.mode === "create" ? "Add" : "Edit"} heritage card`}><form className="grid gap-3" onSubmit={save}>{["id", "title", "pillar_category", "description", "specification", "image_url"].map((key) => <input className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-him-river" disabled={key === "id" && editor.mode === "edit"} key={key} onChange={(event) => setEditor({ ...editor, form: { ...editor.form, [key]: event.target.value } })} placeholder={key} value={editor.form[key] || ""} />)}<div className="flex justify-end gap-2"><Button onClick={() => setEditor(null)} variant="secondary">Cancel</Button><Button type="submit">Save</Button></div></form></Modal>}
  </div>;
}
