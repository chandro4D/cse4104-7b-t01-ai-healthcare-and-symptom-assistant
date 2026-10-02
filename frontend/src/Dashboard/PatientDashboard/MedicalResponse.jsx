import {
  AlertTriangle,
  ShieldAlert,
  HeartPulse,
  CircleAlert,
} from "lucide-react";

export default function MedicalResponse({ text }) {
  // Remove markdown formatting (**, ###, etc.)
  const cleanText = text
    .replace(/\*\*/g, "")
    .replace(/###/g, "")
    .replace(/\r/g, "")
    .trim();

  const getSection = (title) => {
    const regex = new RegExp(
      `${title}:?\\s*([\\s\\S]*?)(?=\\n(?:Assessment|Recommended department|Urgency|Home care|Emergency warning signs|Disclaimer):|$)`,
      "i",
    );

    const match = cleanText.match(regex);
    return match ? match[1].trim() : null;
  };

  const assessment = getSection("Assessment");
  const department = getSection("Recommended department");
  const urgency = getSection("Urgency");
  const homeCare = getSection("Home care");
  const warnings = getSection("Emergency warning signs");

  const isEmergency = urgency?.toLowerCase().includes("emergency");

  const toList = (content) => {
    if (!content) return [];

    return content
      .split(/\n+/) // split only by new lines
      .map((line) =>
        line
          .replace(/^[-*•]\s*/, "") // remove leading bullet
          .trim(),
      )
      .filter((line) => line.length > 0);
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-5">
      {/* Emergency banner */}
      {isEmergency && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700 font-bold">
            <AlertTriangle className="w-5 h-5" />
            Emergency alert
          </div>
          <p className="mt-2 text-sm text-red-700 leading-6">
            Your symptoms may indicate a potentially life-threatening condition.
            Seek emergency medical care immediately.
          </p>
        </div>
      )}

      {/* Assessment */}
      {assessment && (
        <section>
          <h3 className="mb-2 text-base font-bold text-stone-900">
            Assessment
          </h3>
          <p className="text-sm leading-6 text-stone-700">{assessment}</p>
        </section>
      )}

      {/* Department */}
      {department && (
        <section>
          <h3 className="mb-2 text-base font-bold text-stone-900">
            Recommended department
          </h3>
          <div
            className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
              isEmergency
                ? "border-red-200 bg-red-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <HeartPulse
                className={`w-5 h-5 ${
                  isEmergency ? "text-red-600" : "text-emerald-600"
                }`}
              />
              <span
                className={`font-semibold ${
                  isEmergency ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {department}
              </span>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
                isEmergency ? "bg-red-600" : "bg-emerald-600"
              }`}
            >
              {isEmergency ? "Immediate" : "Recommended"}
            </span>
          </div>
        </section>
      )}

      {/* Urgency */}
      {urgency && (
        <section>
          <h3 className="mb-2 text-base font-bold text-stone-900">Urgency</h3>

          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              urgency.toLowerCase().includes("emergency")
                ? "bg-red-100 text-red-700"
                : urgency.toLowerCase().includes("urgent")
                  ? "bg-orange-100 text-orange-700"
                  : urgency.toLowerCase().includes("moderate")
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {urgency}
          </span>
        </section>
      )}

      {/* Home care */}
      {homeCare && (
        <section>
          <h3 className="mb-2 text-base font-bold text-stone-900">
            What to do now
          </h3>

          <ul className="space-y-2 text-sm text-stone-700">
            {toList(homeCare).map((item, idx) => (
              <li key={idx} className="flex gap-2">
                <CircleAlert className="mt-0.5 h-4 w-4 text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Warning signs */}
      {warnings && (
        <section>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="mb-3 flex items-center gap-2 font-bold text-red-700">
              <ShieldAlert className="h-5 w-5" />
              Emergency warning signs
            </div>

            <ul className="space-y-2 text-sm text-red-700">
              {toList(warnings).map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <div className="border-t border-stone-200 pt-4">
        <p className="text-xs leading-5 text-stone-500">
          This is preliminary AI-generated health information and is not a
          substitute for a licensed medical professional. If symptoms are
          severe, worsening, or you are unsure, seek medical care immediately.
        </p>
      </div>
    </div>
  );
}
