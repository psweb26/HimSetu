import { useState } from 'react';
import { MapPin, Upload, FileText, Building2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { HIMACHAL_ADMIN_HIERARCHY, TERRAIN_RISKS, INFRASTRUCTURE_TYPES } from '../utils/himachalRegions';

// Reusable components
function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--him-stone)] pb-3 mb-4">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-[var(--him-stone)] bg-[#F5F7FA] text-[var(--devdar-forest)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--kinnaur-marigold)]">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function FormField({ label, description, required, children }) {
  return (
    <label className="grid gap-1.5">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
          {label}
        </span>
        {required && <span className="text-[var(--pahadi-crimson)] font-bold">*</span>}
      </div>
      {description && (
        <p className="text-[10px] text-slate-500 font-medium">
          {description}
        </p>
      )}
      {children}
    </label>
  );
}

function GovernmentInput({ ...props }) {
  return (
    <input
      {...props}
      className="w-full rounded-sm border border-[var(--him-stone)] bg-[#F8FAFB] px-3 py-2.5 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--devdar-forest)] focus:ring-2 focus:ring-[var(--devdar-forest)]/10 shadow-xs"
    />
  );
}

function GovernmentSelect({ options, ...props }) {
  return (
    <select
      {...props}
      className="w-full rounded-sm border border-[var(--him-stone)] bg-white px-3 py-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-[var(--devdar-forest)] focus:ring-2 focus:ring-[var(--devdar-forest)]/10 shadow-xs appearance-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23475569' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        paddingRight: '28px',
      }}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function SubmissionChecklist({ completed }) {
  const items = [
    { key: 'location', label: 'Location Selected', icon: MapPin },
    { key: 'infrastructure', label: 'Infrastructure Type', icon: Building2 },
    { key: 'description', label: 'Description Provided', icon: FileText },
  ];

  return (
    <div className="rounded-sm border border-[var(--him-stone)] bg-[#F8FAFB] p-4 space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
        Submission Checklist
      </p>
      <div className="space-y-1.5">
        {items.map((item) => {
          const isComplete = completed[item.key];
          const IconComp = isComplete ? CheckCircle2 : item.icon;
          return (
            <div key={item.key} className="flex items-center gap-2.5 text-xs">
              <IconComp
                className={`h-3.5 w-3.5 shrink-0 ${
                  isComplete ? 'text-emerald-600' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              <span
                className={isComplete ? 'text-emerald-700 font-semibold' : 'text-slate-600'}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GrievanceForm({ onSubmission, backendUrl }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dist, setDist] = useState('Kullu');
  const [block, setBlock] = useState('Bhuntar');
  const [panchayat, setPanchayat] = useState('Sainj');
  const [infra, setInfra] = useState('Connecting Bailey Bridge');
  const [risk, setRisk] = useState('Flash Flood Khud Proximity');
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState('');

  const blockOptions = Object.keys(HIMACHAL_ADMIN_HIERARCHY[dist] || {});
  const panchayatOptions = HIMACHAL_ADMIN_HIERARCHY[dist]?.[block] || [];

  const handleDistrictChange = (newDist) => {
    setDist(newDist);
    const firstBlock = Object.keys(HIMACHAL_ADMIN_HIERARCHY[newDist])[0];
    setBlock(firstBlock);
    setPanchayat(HIMACHAL_ADMIN_HIERARCHY[newDist][firstBlock][0]);
  };

  const handleBlockChange = (newBlock) => {
    setBlock(newBlock);
    setPanchayat(HIMACHAL_ADMIN_HIERARCHY[dist][newBlock][0]);
  };

  const handleCommit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !desc.trim()) {
      setError('Title and description are required for incident registration.');
      return;
    }

    const bodyFormData = new FormData();
    bodyFormData.append('title', title.trim());
    bodyFormData.append('description', desc.trim());
    bodyFormData.append('district', dist);
    bodyFormData.append('block', block);
    bodyFormData.append('panchayat', panchayat);
    bodyFormData.append('terrainRisk', risk);
    bodyFormData.append('infrastructureType', infra);
    bodyFormData.append('administrative_unit', `Office of Municipal Council, ${block}`);
    bodyFormData.append('lgd_code', '153201');
    if (coords) {
      bodyFormData.append('latitude', coords.lat);
      bodyFormData.append('longitude', coords.lng);
    }

    try {
      const res = await fetch(`${backendUrl}/api/grievances`, {
        method: 'POST',
        body: bodyFormData,
      });
      if (res.ok) {
        setTitle('');
        setDesc('');
        setCoords(null);
        if (onSubmission) onSubmission();
      } else {
        setError('Database constraints verification failed.');
      }
    } catch {
      setError('Network bridge connection failure.');
    }
  };

  const checklist = {
    location: !!dist && !!block && !!panchayat,
    infrastructure: !!infra,
    description: !!title.trim() && !!desc.trim(),
  };

  return (
    <form onSubmit={handleCommit} className="kathkuni-card bg-white p-8 space-y-6">
      {/* GOVERNMENT FILING HEADER */}
      <div className="border-b-2 border-[var(--pahadi-crimson)] pb-4 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-[var(--kinnaur-marigold)] bg-amber-100 px-2.5 py-1 rounded-xs">
            Public Interface Core
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
            HimSetu Community Intake Portal
          </span>
        </div>
        <h2 className="text-lg font-black text-[var(--devdar-forest)] uppercase tracking-tight">
          जन पुकार / Citizen Incident Registration
        </h2>
        <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
          File mountain infrastructure hazard reports directly into district accountability workflows.
          Your incident will be verified, escalated to the responsible department, and tracked through
          resolution.
        </p>
      </div>

      {/* SECTION 1: REPORTER INFORMATION */}
      <section className="space-y-4">
        <SectionHeader
          icon={FileText}
          title="Reporter Information"
          description="Basic identification for incident registration and follow-up communication."
        />
        <div className="grid gap-4">
          <FormField label="Citizen Name" required>
            <GovernmentInput
              type="text"
              placeholder="Full name of incident reporter"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>
          <FormField label="Contact Details (Optional)" description="Mobile or email for updates">
            <GovernmentInput
              type="text"
              placeholder="Not required for anonymous reporting"
            />
          </FormField>
        </div>
      </section>

      <div className="himachali-weave-divider" />

      {/* SECTION 2: LOCATION INFORMATION */}
      <section className="space-y-4">
        <SectionHeader
          icon={MapPin}
          title="Location Information"
          description="Administrative and geospatial boundaries for incident routing and mapping."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="District" required description="Administrative district">
            <GovernmentSelect
              options={Object.keys(HIMACHAL_ADMIN_HIERARCHY)}
              value={dist}
              onChange={(e) => handleDistrictChange(e.target.value)}
            />
          </FormField>
          <FormField label="Block" required description="Sub-district block">
            <GovernmentSelect
              options={blockOptions}
              value={block}
              onChange={(e) => handleBlockChange(e.target.value)}
            />
          </FormField>
          <FormField label="Gram Panchayat" required description="Village council boundary">
            <GovernmentSelect
              options={panchayatOptions}
              value={panchayat}
              onChange={(e) => setPanchayat(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Geospatial Lock (GPS Coordinate)" description="Optional: Tap to embed location">
          <button
            type="button"
            onClick={() => setCoords({ lat: '31.7087', lng: '76.9320' })}
            className={`w-full flex items-center justify-center gap-2.5 rounded-sm border-2 border-dashed p-3 transition ${
              coords
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-[var(--him-stone)] bg-[#F8FAFB] text-slate-600 hover:border-[var(--devdar-forest)] hover:bg-white'
            }`}
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wide">
              {coords ? `Locked: ${coords.lat}°N, ${coords.lng}°E` : 'Embed GPS Coordinate'}
            </span>
          </button>
        </FormField>
      </section>

      <div className="himachali-weave-divider" />

      {/* SECTION 3: INFRASTRUCTURE CLASSIFICATION */}
      <section className="space-y-4">
        <SectionHeader
          icon={Building2}
          title="Infrastructure Classification"
          description="Asset type and terrain risk determine department assignment and SLA."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Infrastructure Type" required description="Which asset is affected?">
            <GovernmentSelect
              options={INFRASTRUCTURE_TYPES}
              value={infra}
              onChange={(e) => setInfra(e.target.value)}
            />
          </FormField>
          <FormField label="Terrain Risk Vector" required description="Mountain hazard classification">
            <GovernmentSelect
              options={TERRAIN_RISKS}
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
            />
          </FormField>
        </div>
      </section>

      <div className="himachali-weave-divider" />

      {/* SECTION 4: INCIDENT DETAILS */}
      <section className="space-y-4">
        <SectionHeader
          icon={AlertTriangle}
          title="Incident Details"
          description="Concise title and comprehensive engineering inspection notes."
        />
        <div className="space-y-4">
          <FormField label="Incident Title" required description="Brief headline of the problem">
            <GovernmentInput
              type="text"
              maxLength={150}
              placeholder="E.g., Bailey bridge deck plates buckling near Sainj market"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>

          <FormField
            label="Detailed Description"
            required
            description="Structural damage details, hazard specifics, and impact on local community."
          >
            <textarea
              className="w-full rounded-sm border border-[var(--him-stone)] bg-[#F8FAFB] px-3 py-2.5 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--devdar-forest)] focus:ring-2 focus:ring-[var(--devdar-forest)]/10 shadow-xs resize-none"
              rows={6}
              placeholder="Describe the structural damage, current hazards, and how this affects the community. Include observable signs and immediate risks..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </FormField>
        </div>
      </section>

      <div className="himachali-weave-divider" />

      {/* SECTION 5: EVIDENCE UPLOAD */}
      <section className="space-y-4">
        <SectionHeader
          icon={Upload}
          title="Evidence & Attachments"
          description="Optional: Add photos or documents to strengthen verification."
        />
        <FormField label="Photographic Evidence (Optional)">
          <div className="rounded-sm border-2 border-dashed border-[var(--him-stone)] bg-[#F8FAFB] p-6 text-center hover:border-[var(--devdar-forest)] hover:bg-white transition cursor-pointer">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-sm border border-[var(--him-stone)] bg-white text-slate-500 mb-3">
              <Upload className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-bold text-slate-700 mb-1">
              Drag photos or tap to upload
            </p>
            <p className="text-[10px] text-slate-500">
              Accepted: JPG, PNG • Max 5MB • Up to 3 files
            </p>
            <input
              type="file"
              disabled
              className="absolute inset-0 opacity-0 cursor-not-allowed"
            />
          </div>
        </FormField>
      </section>

      {/* SUBMISSION CHECKLIST */}
      <SubmissionChecklist completed={checklist} />

      {/* ERROR STATE */}
      {error && (
        <div className="flex items-start gap-3 rounded-sm border border-[var(--pahadi-crimson)]/30 bg-rose-50 p-4">
          <XCircle className="h-5 w-5 shrink-0 text-[var(--pahadi-crimson)] mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold text-[var(--pahadi-crimson)]">Registration Error</p>
            <p className="text-xs text-slate-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* SUBMIT BUTTON */}
      <button
        type="submit"
        disabled={!checklist.description}
        className="w-full h-12 rounded-sm bg-[var(--devdar-forest)] px-6 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition hover:bg-[#0f2b1f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        Submit Incident Registration
      </button>

      <p className="text-center text-[10px] text-slate-500 font-medium">
        Your report will be verified within 24 hours and escalated to the responsible department.
      </p>
    </form>
  );
}
