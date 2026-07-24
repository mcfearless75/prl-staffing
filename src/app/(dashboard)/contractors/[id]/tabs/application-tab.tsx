function row(label: string, value: unknown) {
  const v = value === null || value === undefined || value === "" ? null : String(value);
  if (!v) return null;
  return (
    <div key={label} className="grid grid-cols-[180px_1fr] gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-xs text-gray-800 break-words">{v}</span>
    </div>
  );
}

function ApplicationNotes({ raw }: { raw: string | null }) {
  if (!raw) return <p className="text-sm text-gray-500">No notes.</p>;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    // Plain text notes — just display as-is
    return <p className="whitespace-pre-wrap text-sm text-gray-700">{raw}</p>;
  }

  const sections: Array<{ title: string; fields: Array<[string, unknown]> }> = [
    {
      title: "Location & Nationality",
      fields: [
        ["Country", data.country],
        ["City", data.city],
        ["Non-British National", data.nonBritishNational],
        ["Requires Work Permit", data.requiresWorkPermit],
        ["Passport Number", data.passportNumber],
        ["Passport Expiry", data.passportExpiry],
        ["Visa Number", data.visaNumber],
        ["Visa Expiry", data.visaExpiry],
      ],
    },
    {
      title: "Driving",
      fields: [
        ["Full UK Driving Licence", data.fullDrivingLicence],
        ["Motoring Convictions", data.motoringConvictions],
        ["Regular Use Of", data.regularUseOf],
        ["Endorsement Details", data.endorsementDetails],
      ],
    },
    {
      title: "Next of Kin",
      fields: [["Next of Kin", data.nextOfKin]],
    },
    {
      title: "Bank Details",
      fields: [
        ["Bank Name", data.bankName],
        ["Name on Account", data.nameOnAccount],
        ["Account in Your Name", data.accountInYourName],
        ["Account Number", data.accountNumber],
        ["Sort Code", data.sortCode],
      ],
    },
    {
      title: "Work Requirements",
      fields: [
        ["Positions Sought", data.positionsSought],
        ["Salary / Rate Required", data.salaryRequired],
        ["Hours Preferred", data.hoursPreferred],
        ["Days Preferred", data.daysPreferred],
        ["Locations Preferred", data.locationsPreferred],
        ["Required Hours", data.requiredHours],
        ["Relevant Skills", data.relevantSkills],
      ],
    },
    {
      title: "Criminal Record & Security",
      fields: [
        ["DBS (last 3 years)", data.hasDbs],
        ["DBS Number", data.dbsNumber],
        ["DBS Issued", data.dbsIssued],
        ["Criminal Conviction", data.hasCriminalConviction],
        ["Previous Convictions", data.hasPreviousConvictions],
        ["Security Clearance", data.hasSecurityClearance],
        ["Clearance Level", data.clearanceLevel],
      ],
    },
    {
      title: "Declaration",
      fields: [
        ["48hr Waiver Decision", data.waiverDecision],
        ["Signature", data.signature],
        ["Privacy Agreed", data.privacyAgreed ? "Yes" : null],
      ],
    },
    {
      title: "References",
      fields: [["References", data.references]],
    },
  ];

  return (
    <div className="space-y-5">
      {sections.map((section) => {
        const rows = section.fields.map(([label, val]) => row(label, val)).filter(Boolean);
        if (rows.length === 0) return null;
        return (
          <div key={section.title}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-1">
              {section.title}
            </h3>
            <div>{rows}</div>
          </div>
        );
      })}
    </div>
  );
}

export function ApplicationTab({ notes }: { notes: string | null }) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Application</h2>
      <ApplicationNotes raw={notes} />
    </div>
  );
}
