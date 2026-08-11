import { useState } from "react";
import { Building2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import Button from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ email, password });
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-command">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-md bg-him-pine text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-him-marigold">HimSetu</p>
            <h1 className="text-lg font-black text-slate-950">Admin Command Center</h1>
          </div>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</span>
            <span className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <Mail className="h-4 w-4 text-him-river" />
              <input className="w-full bg-transparent text-sm font-semibold outline-none" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
            </span>
          </label>

          <label className="grid gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Password</span>
            <span className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <LockKeyhole className="h-4 w-4 text-him-river" />
              <input className="w-full bg-transparent text-sm font-semibold outline-none" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
            </span>
          </label>

          {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-900">{error}</p>}

          <Button loading={loading} type="submit">
            <ShieldCheck className="h-4 w-4" />
            Enter Admin
          </Button>
        </form>
      </section>
    </main>
  );
}
