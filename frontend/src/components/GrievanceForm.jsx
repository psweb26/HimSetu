import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
  MapPin,
  XCircle,
} from "lucide-react";
import { HIMACHAL_ADMIN_HIERARCHY } from "../utils/himachalRegions";

const terrainRiskOptions = [
  "Flash Flood Khud Proximity",
  "Landslide Vulnerable Link",
  "High-Alpine Alpine Track",
  "Standard Rural Road",
];

const infrastructureTypeOptions = [
  "Connecting Bailey Bridge",
  "Drinking Water Line",
  "NH Highway Link",
  "Power Grid Substation",
];

const initialDistrict = Object.keys(HIMACHAL_ADMIN_HIERARCHY)[0] || "";
const initialBlock =
  Object.keys(HIMACHAL_ADMIN_HIERARCHY[initialDistrict] || {})[0] || "";
const initialPanchayat =
  HIMACHAL_ADMIN_HIERARCHY[initialDistrict]?.[initialBlock]?.[0] || "";

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-[var(--him-stone)] bg-[#F8FAFB]">
        <Icon className="h-4 w-4 text-[var(--devdar-forest)]" />
      </div>
      <div className="pt-0.5">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--kinnaur-marigold)]">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
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
        {required && (
          <span className="font-bold text-[var(--pahadi-crimson)]">*</span>
        )}
      </div>
      {description && (
        <p className="text-[10px] font-medium text-slate-500">{description}</p>
      )}
      {children}
    </label>
  );
}

function GovernmentInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-sm border border-[var(--him-stone)] bg-[#F8FAFB] px-3 py-2.5 text-xs font-medium text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-[var(--devdar-forest)] focus:ring-2 focus:ring-[var(--devdar-forest)]/10"
    />
  );
}

function GovernmentSelect({ options, ...props }) {
  return (
    <select
      {...props}
      className="w-full appearance-none rounded-sm border border-[var(--him-stone)] bg-white px-3 py-2.5 text-xs font-medium text-slate-900 shadow-xs outline-none transition focus:border-[var(--devdar-forest)] focus:ring-2 focus:ring-[var(--devdar-forest)]/10"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23475569' d='M2 4l4 4 4-4'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 8px center",
        backgroundRepeat: "no-repeat",
        paddingRight: "28px",
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function KathKuniDivider() {
  return (
    <div className="flex justify-center py-2">
      <div
        className="h-[1.6px] w-[90%] rounded-sm"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg,#8B1E2D 0 12px,#E39A15 12px 24px,#234C36 24px 36px,#F5D36A 36px 48px)",
        }}
      />
    </div>
  );
}

export default function GrievanceForm({ onSubmission, backendUrl }) {
  const [citizenName, setCitizenName] = useState("");
  const [contact, setContact] = useState("");
  const [dist, setDist] = useState(initialDistrict);
  const [block, setBlock] = useState(initialBlock);
  const [panchayat, setPanchayat] = useState(initialPanchayat);
  const [terrainRisk, setTerrainRisk] = useState(terrainRiskOptions[0]);
  const [infrastructureType, setInfrastructureType] = useState(
    infrastructureTypeOptions[0],
  );
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidencePreviews, setEvidencePreviews] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const replaceInputRefs = useRef([]);

  useEffect(() => {
    const previews = evidenceFiles.map((file) => URL.createObjectURL(file));
    setEvidencePreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [evidenceFiles]);

  const blockOptions = dist
    ? Object.keys(HIMACHAL_ADMIN_HIERARCHY[dist] || {})
    : [];
  const panchayatOptions =
    dist && block ? HIMACHAL_ADMIN_HIERARCHY[dist]?.[block] || [] : [];

  function validateEvidenceFile(file) {
    if (!file) return false;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Supported evidence formats are JPG, PNG, or WEBP.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Evidence photograph must be under 5 MB.");
      return false;
    }
    return true;
  }

  function addEvidenceFiles(fileList) {
    const nextFiles = Array.from(fileList || []);
    if (nextFiles.length === 0) return;
    if (evidenceFiles.length + nextFiles.length > 3) {
      setError("You can upload a maximum of 3 evidence photographs.");
      return;
    }
    const validFiles = [];
    for (const file of nextFiles) {
      if (!validateEvidenceFile(file)) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      validFiles.push(file);
    }
    setError("");
    setEvidenceFiles((current) => [...current, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function replaceEvidenceFile(index, file) {
    if (!file) return;
    if (!validateEvidenceFile(file)) {
      if (replaceInputRefs.current[index]) replaceInputRefs.current[index].value = "";
      return;
    }
    setError("");
    setEvidenceFiles((current) =>
      current.map((existingFile, fileIndex) =>
        fileIndex === index ? file : existingFile,
      ),
    );
    if (replaceInputRefs.current[index]) replaceInputRefs.current[index].value = "";
  }

  function removeEvidenceFile(index) {
    setEvidenceFiles((current) =>
      current.filter((_, fileIndex) => fileIndex !== index),
    );
    setError("");
  }

  async function handleCommit(event) {
    event.preventDefault();
    if (!backendUrl) {
      setError("Backend unavailable.");
      return;
    }
    setError("");

    if (!citizenName.trim()) {
      setError("Please enter the citizen name.");
      return;
    }
    if (!dist || !block || !panchayat) {
      setError("Please select a complete administrative location.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter the incident title.");
      return;
    }
    if (!desc.trim()) {
      setError("Please describe the incident.");
      return;
    }
    if (evidenceFiles.length === 0) {
      setError("Please attach at least one evidence photograph.");
      return;
    }

    setLoading(true);
    const bodyFormData = new FormData();
    bodyFormData.append("citizenName", citizenName.trim());
    if (contact.trim()) bodyFormData.append("contact", contact.trim());
    bodyFormData.append("title", title.trim());
    bodyFormData.append("description", desc.trim());
    bodyFormData.append("district", dist);
    bodyFormData.append("block", block);
    bodyFormData.append("panchayat", panchayat);
    bodyFormData.append("terrainRisk", terrainRisk);
    bodyFormData.append("infrastructureType", infrastructureType);
    evidenceFiles.forEach((file) => bodyFormData.append("files", file));

    try {
      const response = await fetch(`${backendUrl}/api/grievances`, {
        method: "POST",
        body: bodyFormData,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || "Database constraints verification failed.");
      }

      const createdTicket = await response.json();
      setCitizenName("");
      setContact("");
      setTitle("");
      setDesc("");
      setEvidenceFiles([]);
      setDist(initialDistrict);
      setBlock(initialBlock);
      setPanchayat(initialPanchayat);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      if (onSubmission) await onSubmission(createdTicket);
    } catch (submitError) {
      setError(submitError.message || "Network bridge connection failure.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleCommit} className="kathkuni-card space-y-3 bg-white p-5">
      <div className="space-y-2 border-b-2 border-[var(--pahadi-crimson)] pb-3">
        <h2 className="text-lg font-black uppercase tracking-tight text-[var(--devdar-forest)]">
          Jan Pukar / Community Infrastructure Intake
        </h2>
      </div>

      {success && (
        <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-2.5 text-[9px] font-bold text-emerald-800">
          Incident submitted successfully. Your report has entered the community
          verification queue.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Citizen Name" required>
          <GovernmentInput
            placeholder="e.g. Pransh Sharma"
            value={citizenName}
            onChange={(event) => setCitizenName(event.target.value)}
          />
        </FormField>
        <FormField label="Contact (Optional)">
          <GovernmentInput
            placeholder="Mobile number or email"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
          />
        </FormField>
      </div>

      <KathKuniDivider />

      <section className="space-y-3">
        <SectionHeader icon={MapPin} title="Location Information" />
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="District" required>
            <GovernmentSelect
              options={Object.keys(HIMACHAL_ADMIN_HIERARCHY)}
              value={dist}
              onChange={(event) => {
                const nextDistrict = event.target.value;
                const nextBlock =
                  Object.keys(HIMACHAL_ADMIN_HIERARCHY[nextDistrict] || {})[0] || "";
                setDist(nextDistrict);
                setBlock(nextBlock);
                setPanchayat(
                  HIMACHAL_ADMIN_HIERARCHY[nextDistrict]?.[nextBlock]?.[0] || "",
                );
              }}
            />
          </FormField>
          <FormField label="Block" required>
            <GovernmentSelect
              disabled={!dist}
              options={blockOptions}
              value={block}
              onChange={(event) => {
                const nextBlock = event.target.value;
                setBlock(nextBlock);
                setPanchayat(HIMACHAL_ADMIN_HIERARCHY[dist]?.[nextBlock]?.[0] || "");
              }}
            />
          </FormField>
          <FormField label="Panchayat" required>
            <GovernmentSelect
              disabled={!block}
              options={panchayatOptions}
              value={panchayat}
              onChange={(event) => setPanchayat(event.target.value)}
            />
          </FormField>
        </div>

        <div className="rounded-sm border border-[var(--him-stone)] bg-[#F8FAFB] p-3">
          {dist && block && panchayat ? (
            <div className="text-emerald-700">
              <div className="mb-1 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase">
                  Administrative Location Verified
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-700">
                {panchayat} / {block} / {dist}
              </p>
            </div>
          ) : (
            <div className="text-[10px] font-black uppercase text-slate-500">
              Location Status: Select District, Block and Gram Panchayat.
            </div>
          )}
        </div>
      </section>

      <KathKuniDivider />

      <section className="space-y-3">
        <SectionHeader icon={AlertTriangle} title="Incident Details" />
        <FormField label="Incident Title" required>
          <GovernmentInput
            placeholder="E.g., Bridge approach slab cracked after rainfall"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Incident Category" required>
            <GovernmentSelect
              options={infrastructureTypeOptions}
              value={infrastructureType}
              onChange={(event) => setInfrastructureType(event.target.value)}
            />
          </FormField>
          <FormField label="Terrain Risk" required>
            <GovernmentSelect
              options={terrainRiskOptions}
              value={terrainRisk}
              onChange={(event) => setTerrainRisk(event.target.value)}
            />
          </FormField>
        </div>
        <FormField label="Description" required>
          <textarea
            className="h-20 w-full rounded-sm border border-[var(--him-stone)] bg-[#F8FAFB] p-2 text-xs"
            placeholder="Describe visible damage, public safety risks and community impact."
            value={desc}
            onChange={(event) => setDesc(event.target.value)}
          />
        </FormField>
      </section>

      <KathKuniDivider />

      <section className="space-y-3">
        <SectionHeader icon={ImagePlus} title="Evidence (Max 3 Images)" />

        {evidenceFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {evidenceFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="relative overflow-hidden rounded-sm border border-[var(--him-stone)] bg-white"
              >
                <img
                  src={evidencePreviews[index]}
                  alt=""
                  className="h-24 w-full object-cover"
                />
                <div className="absolute left-1 top-1 rounded-sm bg-white/90 px-1.5 py-0.5 text-[8px] font-black uppercase text-[var(--devdar-forest)]">
                  {index === 0 ? "Primary" : `Image ${index + 1}`}
                </div>
                <button
                  type="button"
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[var(--pahadi-crimson)] shadow"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => removeEvidenceFile(index)}
                >
                  x
                </button>
                <div className="flex items-center justify-between gap-1 p-1.5">
                  <p className="min-w-0 flex-1 truncate text-[9px] font-bold text-slate-600">
                    {file.name}
                  </p>
                  <label className="cursor-pointer rounded-sm border border-slate-200 px-1.5 py-0.5 text-[8px] font-black uppercase text-slate-600">
                    Replace
                    <input
                      ref={(node) => {
                        replaceInputRefs.current[index] = node;
                      }}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="sr-only"
                      onChange={(event) =>
                        replaceEvidenceFile(index, event.target.files?.[0])
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="relative cursor-pointer rounded-sm border-2 border-dashed border-[var(--him-stone)] bg-[#F8FAFB] p-3 text-center">
          <ImagePlus className="mx-auto mb-2 h-5 w-5 text-slate-400" />
          <p className="text-xs font-bold text-slate-700">
            {evidenceFiles.length >= 3
              ? "Maximum evidence images attached"
              : "Add evidence photographs"}
          </p>
          <div className="mt-1 text-[10px] text-slate-500">
            Supported: JPG / PNG / WEBP | Max: 5 MB | {evidenceFiles.length}/3 selected
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp"
            disabled={evidenceFiles.length >= 3}
            onChange={(event) => addEvidenceFiles(event.target.files)}
            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </div>
        <p className="text-[10px] font-semibold text-slate-500">
          The first image becomes the primary image for Discovery, incident details,
          and reports. Upload order is preserved.
        </p>
      </section>

      {error && (
        <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--pahadi-crimson)]">
          <XCircle className="h-3 w-3" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full bg-[var(--devdar-forest)] text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Incident Record"}
      </button>

      <p className="text-center text-[10px] font-medium text-slate-500">
        Every submission enters the community verification workflow before being
        escalated to the responsible department.
      </p>
    </form>
  );
}
