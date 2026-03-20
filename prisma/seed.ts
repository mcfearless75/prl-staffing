import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding PRL contractor management database...\n");

  // ── 1. Clear existing data (reverse dependency order) ──
  console.log("Clearing existing data...");
  await prisma.timesheetEntry.deleteMany();
  await prisma.timesheet.deleteMany();
  await prisma.complianceRecord.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.contractor.deleteMany();
  await prisma.company.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.rateCard.deleteMany();
  await prisma.user.deleteMany();
  console.log("All tables cleared.\n");

  // ── 2. Admin user ──
  console.log("Creating admin user...");
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@prl.co.uk",
      name: "Admin User",
      passwordHash,
      role: "admin",
    },
  });
  console.log(`  Created user: ${admin.email}`);

  // ── 3. Companies ──
  console.log("\nCreating companies...");
  const balfourBeatty = await prisma.company.create({
    data: {
      name: "Balfour Beatty",
      address: "5 Churchill Place, Canary Wharf",
      city: "London",
      postcode: "SE1 2DA",
      contactName: "Helen Crawford",
      contactEmail: "h.crawford@balfourbeatty.com",
      contactPhone: "020 7216 6800",
      isActive: true,
    },
  });

  const kierGroup = await prisma.company.create({
    data: {
      name: "Kier Group",
      address: "2 Cornwall Street",
      city: "Birmingham",
      postcode: "B1 1BB",
      contactName: "Stuart Richardson",
      contactEmail: "s.richardson@kier.co.uk",
      contactPhone: "0121 679 4200",
      isActive: true,
    },
  });

  const morganSindall = await prisma.company.create({
    data: {
      name: "Morgan Sindall",
      address: "56 Whitworth Street",
      city: "Manchester",
      postcode: "M1 1AD",
      contactName: "Fiona Halliday",
      contactEmail: "f.halliday@morgansindall.com",
      contactPhone: "0161 233 7300",
      isActive: true,
    },
  });

  const willmottDixon = await prisma.company.create({
    data: {
      name: "Willmott Dixon",
      address: "14 Park Row",
      city: "Leeds",
      postcode: "LS1 1UR",
      contactName: "Andrew Sheridan",
      contactEmail: "a.sheridan@willmottdixon.co.uk",
      contactPhone: "0113 245 7600",
      isActive: true,
    },
  });

  const companies = [balfourBeatty, kierGroup, morganSindall, willmottDixon];
  companies.forEach((c) => console.log(`  Created company: ${c.name}`));

  // ── 4. Suppliers ──
  console.log("\nCreating suppliers...");
  const hays = await prisma.supplier.create({
    data: {
      name: "Hays Recruitment",
      tier: "Tier 1",
      contactName: "Claire Bennett",
      contactEmail: "claire.bennett@hays.com",
      contactPhone: "020 3465 0000",
      score: 94,
      isActive: true,
    },
  });

  const manpower = await prisma.supplier.create({
    data: {
      name: "ManpowerGroup",
      tier: "Tier 1",
      contactName: "James Oakley",
      contactEmail: "j.oakley@manpowergroup.co.uk",
      contactPhone: "020 7470 7000",
      score: 88,
      isActive: true,
    },
  });

  const reed = await prisma.supplier.create({
    data: {
      name: "Reed Specialist",
      tier: "Tier 2",
      contactName: "Samantha Boyle",
      contactEmail: "s.boyle@reed.co.uk",
      contactPhone: "020 7065 5200",
      score: 76,
      isActive: true,
    },
  });

  [hays, manpower, reed].forEach((s) =>
    console.log(`  Created supplier: ${s.name} (${s.tier}, score: ${s.score})`)
  );

  // ── 5. Contractors ──
  console.log("\nCreating contractors...");
  const sarahMitchell = await prisma.contractor.create({
    data: {
      firstName: "Sarah",
      lastName: "Mitchell",
      email: "sarah.mitchell@email.co.uk",
      phone: "07712 345678",
      jobTitle: "Project Manager",
      payRate: 55.0,
      chargeRate: 85.0,
      dayRate: 440.0,
      status: "Active",
      supplierId: hays.id,
      niNumber: "AB123456C",
      utrNumber: "1234567890",
      ir35Status: "Outside",
      notes: "PRINCE2 Practitioner. 12 years experience in major infrastructure projects.",
    },
  });

  const jamesDavies = await prisma.contractor.create({
    data: {
      firstName: "James",
      lastName: "Davies",
      email: "james.davies@protonmail.com",
      phone: "07891 234567",
      jobTitle: "Senior Developer",
      payRate: 50.0,
      chargeRate: 78.0,
      dayRate: 400.0,
      status: "Active",
      supplierId: manpower.id,
      niNumber: "CD234567D",
      ir35Status: "Inside",
      notes: "Full-stack developer. Building project management and BIM integration tools.",
    },
  });

  const karenLee = await prisma.contractor.create({
    data: {
      firstName: "Karen",
      lastName: "Lee",
      email: "karen.lee@outlook.com",
      phone: "07456 789012",
      jobTitle: "QA Engineer",
      payRate: 40.0,
      chargeRate: 62.0,
      dayRate: 320.0,
      status: "Active",
      supplierId: hays.id,
      niNumber: "EF345678E",
      ir35Status: "Inside",
      notes: "Specialises in construction software QA and compliance systems.",
    },
  });

  const michaelBrown = await prisma.contractor.create({
    data: {
      firstName: "Michael",
      lastName: "Brown",
      email: "m.brown@gmail.com",
      phone: "07723 456789",
      jobTitle: "Site Engineer",
      payRate: 45.0,
      chargeRate: 70.0,
      dayRate: 360.0,
      status: "Active",
      supplierId: reed.id,
      niNumber: "GH456789F",
      utrNumber: "2345678901",
      ir35Status: "Outside",
      notes: "Chartered civil engineer. SMSTS certified. Experienced on rail and highway schemes.",
    },
  });

  const emmaWilson = await prisma.contractor.create({
    data: {
      firstName: "Emma",
      lastName: "Wilson",
      email: "emma.wilson@wilsonqs.co.uk",
      phone: "07834 567890",
      jobTitle: "Quantity Surveyor",
      payRate: 48.0,
      chargeRate: 72.0,
      dayRate: 384.0,
      status: "Active",
      supplierId: null,
      niNumber: "JK567890G",
      utrNumber: "3456789012",
      ir35Status: "Outside",
      notes: "MRICS qualified. Runs own limited company. NEC contract specialist.",
    },
  });

  const davidThompson = await prisma.contractor.create({
    data: {
      firstName: "David",
      lastName: "Thompson",
      email: "d.thompson@safetyworks.co.uk",
      phone: "07945 678901",
      jobTitle: "H&S Advisor",
      payRate: 38.0,
      chargeRate: 58.0,
      dayRate: 304.0,
      status: "Active",
      supplierId: manpower.id,
      niNumber: "LM678901H",
      ir35Status: "Inside",
      notes: "NEBOSH Diploma. CDM Regulations specialist. Fire safety assessor.",
    },
  });

  const rachelGreen = await prisma.contractor.create({
    data: {
      firstName: "Rachel",
      lastName: "Green",
      email: "rachel.green@outlook.co.uk",
      phone: "07056 789012",
      jobTitle: "Project Lead",
      payRate: 52.0,
      chargeRate: 80.0,
      dayRate: 416.0,
      status: "On Hold",
      supplierId: null,
      niNumber: "NP789012J",
      utrNumber: "4567890123",
      ir35Status: "Outside",
      notes: "On hold pending client budget approval. Previously delivered Manchester tram extension.",
    },
  });

  const tomHarrison = await prisma.contractor.create({
    data: {
      firstName: "Tom",
      lastName: "Harrison",
      email: "tom.harrison@yahoo.co.uk",
      phone: "07167 890123",
      jobTitle: "Crane Operator",
      payRate: 35.0,
      chargeRate: 55.0,
      dayRate: 280.0,
      status: "Active",
      supplierId: reed.id,
      niNumber: "QR890123K",
      ir35Status: "Inside",
      notes: "CPCS A04 tower crane licence. 8 years city centre high-rise experience.",
    },
  });

  const lisaChen = await prisma.contractor.create({
    data: {
      firstName: "Lisa",
      lastName: "Chen",
      email: "lisa.chen@bimconsult.co.uk",
      phone: "07278 901234",
      jobTitle: "BIM Manager",
      payRate: 47.0,
      chargeRate: 73.0,
      dayRate: 376.0,
      status: "Active",
      supplierId: hays.id,
      niNumber: "ST901234L",
      utrNumber: "5678901234",
      ir35Status: "Outside",
      notes: "Revit/Navisworks expert. BIM Level 2 accredited. Manages federated models.",
    },
  });

  const markStevens = await prisma.contractor.create({
    data: {
      firstName: "Mark",
      lastName: "Stevens",
      email: "mark.stevens99@gmail.com",
      phone: "07389 012345",
      jobTitle: "General Operative",
      payRate: 18.0,
      chargeRate: 32.0,
      dayRate: 144.0,
      status: "Inactive",
      supplierId: null,
      niNumber: "UV012345M",
      ir35Status: "Inside",
      notes: "Previously on Kier framework. Left site due to project completion. Available from April.",
    },
  });

  const allContractors = [
    sarahMitchell, jamesDavies, karenLee, michaelBrown, emmaWilson,
    davidThompson, rachelGreen, tomHarrison, lisaChen, markStevens,
  ];
  allContractors.forEach((c) =>
    console.log(`  Created contractor: ${c.firstName} ${c.lastName} - ${c.jobTitle} (${c.status})`)
  );

  // ── 6. Assignments ──
  console.log("\nCreating assignments...");
  const assignments = await Promise.all([
    prisma.assignment.create({
      data: {
        contractorId: sarahMitchell.id,
        companyId: balfourBeatty.id,
        role: "Project Manager - Crossrail Finishes Package",
        location: "London",
        startDate: new Date("2026-01-06"),
        endDate: new Date("2026-07-03"),
        status: "Active",
        poNumber: "BB-PM-2026-001",
        notes: "Leading fit-out works at Whitechapel station.",
      },
    }),
    prisma.assignment.create({
      data: {
        contractorId: jamesDavies.id,
        companyId: morganSindall.id,
        role: "Senior Developer - Digital Delivery Platform",
        location: "Manchester",
        startDate: new Date("2026-01-13"),
        endDate: new Date("2026-06-30"),
        status: "Active",
        poNumber: "MS-DEV-2026-014",
        notes: "Building contractor portal and timesheet module.",
      },
    }),
    prisma.assignment.create({
      data: {
        contractorId: karenLee.id,
        companyId: morganSindall.id,
        role: "QA Engineer - Digital Delivery Platform",
        location: "Manchester",
        startDate: new Date("2026-02-03"),
        endDate: new Date("2026-06-30"),
        status: "Active",
        poNumber: "MS-QA-2026-015",
        notes: "Testing contractor portal alongside James Davies.",
      },
    }),
    prisma.assignment.create({
      data: {
        contractorId: michaelBrown.id,
        companyId: kierGroup.id,
        role: "Site Engineer - HS2 Enabling Works",
        location: "Birmingham",
        startDate: new Date("2026-01-20"),
        endDate: null,
        status: "Active",
        poNumber: "KG-SE-2026-008",
        notes: "Open-ended. Earthworks and drainage on Phase 1.",
      },
    }),
    prisma.assignment.create({
      data: {
        contractorId: emmaWilson.id,
        companyId: balfourBeatty.id,
        role: "Quantity Surveyor - Commercial Team",
        location: "London",
        startDate: new Date("2026-02-10"),
        endDate: new Date("2026-08-07"),
        status: "Active",
        poNumber: "BB-QS-2026-003",
        notes: "Interim QS covering maternity leave. NEC valuations and CVIs.",
      },
    }),
    prisma.assignment.create({
      data: {
        contractorId: davidThompson.id,
        companyId: willmottDixon.id,
        role: "H&S Advisor - Leeds Schools Programme",
        location: "Leeds",
        startDate: new Date("2026-03-02"),
        endDate: null,
        status: "Active",
        poNumber: "WD-HS-2026-022",
        notes: "Rolling programme of school refurbishments across West Yorkshire.",
      },
    }),
    prisma.assignment.create({
      data: {
        contractorId: tomHarrison.id,
        companyId: kierGroup.id,
        role: "Crane Operator - Victoria Gate Phase 2",
        location: "Leeds",
        startDate: new Date("2026-01-27"),
        endDate: new Date("2026-09-25"),
        status: "Active",
        poNumber: "KG-CO-2026-011",
        notes: "Liebherr 280 EC-H tower crane. 6-day working weeks available.",
      },
    }),
    prisma.assignment.create({
      data: {
        contractorId: lisaChen.id,
        companyId: balfourBeatty.id,
        role: "BIM Manager - Crossrail Finishes Package",
        location: "London",
        startDate: new Date("2026-01-06"),
        endDate: new Date("2026-07-03"),
        status: "Active",
        poNumber: "BB-BIM-2026-002",
        notes: "Managing federated BIM model alongside Sarah Mitchell's PM team.",
      },
    }),
  ]);
  assignments.forEach((a) =>
    console.log(`  Created assignment: ${a.role} (${a.status})`)
  );

  // ── 7. Compliance records ──
  console.log("\nCreating compliance records...");

  const complianceData: Array<{
    contractorId: string;
    type: string;
    documentName: string;
    reference: string;
    issueDate: Date;
    expiryDate: Date | null;
    status: string;
    notes?: string;
  }> = [
    // Sarah Mitchell
    { contractorId: sarahMitchell.id, type: "CSCS Card", documentName: "CSCS Black Manager Card", reference: "CSCS-8834521", issueDate: new Date("2024-06-15"), expiryDate: new Date("2029-06-14"), status: "Verified" },
    { contractorId: sarahMitchell.id, type: "DBS Check", documentName: "Enhanced DBS Certificate", reference: "DBS-001927364", issueDate: new Date("2025-03-01"), expiryDate: new Date("2028-03-01"), status: "Verified" },
    { contractorId: sarahMitchell.id, type: "Right to Work", documentName: "British Passport", reference: "PP-923847561", issueDate: new Date("2020-09-12"), expiryDate: new Date("2030-09-12"), status: "Verified" },

    // James Davies
    { contractorId: jamesDavies.id, type: "Right to Work", documentName: "British Passport", reference: "PP-712038456", issueDate: new Date("2022-01-10"), expiryDate: new Date("2032-01-10"), status: "Verified" },
    { contractorId: jamesDavies.id, type: "DBS Check", documentName: "Basic DBS Certificate", reference: "DBS-004718293", issueDate: new Date("2025-08-20"), expiryDate: new Date("2028-08-20"), status: "Verified" },
    { contractorId: jamesDavies.id, type: "IR35 Assessment", documentName: "IR35 Status Determination Statement", reference: "IR35-SDS-2026-014", issueDate: new Date("2026-01-10"), expiryDate: new Date("2026-06-30"), status: "Verified", notes: "Inside IR35 per client SDS." },

    // Karen Lee
    { contractorId: karenLee.id, type: "Right to Work", documentName: "UK BRP (Settled Status)", reference: "BRP-UK8374621", issueDate: new Date("2021-04-01"), expiryDate: new Date("2031-04-01"), status: "Verified" },
    { contractorId: karenLee.id, type: "DBS Check", documentName: "Basic DBS Certificate", reference: "DBS-007621834", issueDate: new Date("2025-11-05"), expiryDate: new Date("2028-11-05"), status: "Verified" },

    // Michael Brown
    { contractorId: michaelBrown.id, type: "CSCS Card", documentName: "CSCS Blue Skilled Worker Card", reference: "CSCS-6621478", issueDate: new Date("2023-09-01"), expiryDate: new Date("2028-08-31"), status: "Verified" },
    { contractorId: michaelBrown.id, type: "Right to Work", documentName: "British Passport", reference: "PP-562718493", issueDate: new Date("2019-05-20"), expiryDate: new Date("2029-05-20"), status: "Verified" },
    { contractorId: michaelBrown.id, type: "IR35 Assessment", documentName: "IR35 Status Determination Statement", reference: "IR35-SDS-2026-008", issueDate: new Date("2026-01-15"), expiryDate: null, status: "Verified", notes: "Outside IR35. Genuine business on own account." },

    // Emma Wilson
    { contractorId: emmaWilson.id, type: "CSCS Card", documentName: "CSCS White Prof Qualified Card", reference: "CSCS-9912347", issueDate: new Date("2022-03-20"), expiryDate: new Date("2026-04-15"), status: "Expiring", notes: "Expiring within 30 days. Renewal application submitted." },
    { contractorId: emmaWilson.id, type: "Right to Work", documentName: "British Birth Certificate + NI Letter", reference: "BC-EW-1989", issueDate: new Date("2025-01-05"), expiryDate: null, status: "Verified" },
    { contractorId: emmaWilson.id, type: "Insurance", documentName: "Professional Indemnity Insurance", reference: "PI-WQS-2026", issueDate: new Date("2026-01-01"), expiryDate: new Date("2027-01-01"), status: "Verified", notes: "Hiscox PI policy. Covers up to 1M." },

    // David Thompson
    { contractorId: davidThompson.id, type: "CSCS Card", documentName: "CSCS Black Manager Card", reference: "CSCS-4478213", issueDate: new Date("2025-01-10"), expiryDate: new Date("2030-01-09"), status: "Verified" },
    { contractorId: davidThompson.id, type: "Right to Work", documentName: "British Passport", reference: "PP-839217456", issueDate: new Date("2023-07-01"), expiryDate: new Date("2033-07-01"), status: "Verified" },
    { contractorId: davidThompson.id, type: "DBS Check", documentName: "Enhanced DBS Certificate", reference: "DBS-009234571", issueDate: new Date("2024-12-01"), expiryDate: new Date("2027-12-01"), status: "Verified" },

    // Rachel Green
    { contractorId: rachelGreen.id, type: "CSCS Card", documentName: "CSCS Black Manager Card", reference: "CSCS-3317892", issueDate: new Date("2021-11-01"), expiryDate: new Date("2025-11-01"), status: "Expired", notes: "Card expired. Must renew before any new placement." },
    { contractorId: rachelGreen.id, type: "Right to Work", documentName: "British Passport", reference: "PP-271839456", issueDate: new Date("2021-08-15"), expiryDate: new Date("2031-08-15"), status: "Verified" },

    // Tom Harrison
    { contractorId: tomHarrison.id, type: "CSCS Card", documentName: "CPCS A04 Tower Crane Card", reference: "CPCS-7748291", issueDate: new Date("2024-03-01"), expiryDate: new Date("2029-02-28"), status: "Verified" },
    { contractorId: tomHarrison.id, type: "Right to Work", documentName: "British Passport", reference: "PP-483921756", issueDate: new Date("2020-02-28"), expiryDate: new Date("2030-02-28"), status: "Verified" },
    { contractorId: tomHarrison.id, type: "Insurance", documentName: "Employers Liability Insurance", reference: "EL-TH-2025", issueDate: new Date("2025-04-01"), expiryDate: new Date("2026-03-31"), status: "Expiring", notes: "Renewal due end of March. Chasing broker." },

    // Lisa Chen
    { contractorId: lisaChen.id, type: "CSCS Card", documentName: "CSCS White Prof Qualified Card", reference: "CSCS-5521893", issueDate: new Date("2024-07-01"), expiryDate: new Date("2029-06-30"), status: "Verified" },
    { contractorId: lisaChen.id, type: "Right to Work", documentName: "UK BRP (Settled Status)", reference: "BRP-UK6173829", issueDate: new Date("2021-06-30"), expiryDate: new Date("2031-06-30"), status: "Verified" },
    { contractorId: lisaChen.id, type: "Insurance", documentName: "Professional Indemnity Insurance", reference: "PI-BIM-2026", issueDate: new Date("2025-12-01"), expiryDate: new Date("2026-12-01"), status: "Pending", notes: "Awaiting certificate from insurer." },

    // Mark Stevens
    { contractorId: markStevens.id, type: "CSCS Card", documentName: "CSCS Green Labourer Card", reference: "CSCS-1129384", issueDate: new Date("2023-01-15"), expiryDate: new Date("2028-01-14"), status: "Verified" },
    { contractorId: markStevens.id, type: "Right to Work", documentName: "British Birth Certificate + NI Letter", reference: "BC-MS-1995", issueDate: new Date("2024-06-01"), expiryDate: null, status: "Verified" },
  ];

  for (const record of complianceData) {
    await prisma.complianceRecord.create({ data: record });
  }
  console.log(`  Created ${complianceData.length} compliance records.`);

  // ── 8. Timesheets and entries ──
  console.log("\nCreating timesheets and entries...");

  // Helper: get Monday of a given week offset from today
  function getMonday(weeksAgo: number): Date {
    const now = new Date("2026-03-20"); // current date
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff - weeksAgo * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  const thisWeekMon = getMonday(0); // w/c 16 Mar 2026
  const lastWeekMon = getMonday(1); // w/c 9 Mar 2026
  const twoWeeksAgoMon = getMonday(2); // w/c 2 Mar 2026

  // Active contractors with their assignment
  const activeContractorAssignments = [
    { contractor: sarahMitchell, assignment: assignments[0], hoursPerDay: 8, overtimeDay: 3 },
    { contractor: jamesDavies, assignment: assignments[1], hoursPerDay: 7.5, overtimeDay: null },
    { contractor: karenLee, assignment: assignments[2], hoursPerDay: 7.5, overtimeDay: null },
    { contractor: michaelBrown, assignment: assignments[3], hoursPerDay: 8, overtimeDay: 4 },
    { contractor: emmaWilson, assignment: assignments[4], hoursPerDay: 8, overtimeDay: null },
    { contractor: davidThompson, assignment: assignments[5], hoursPerDay: 8, overtimeDay: 2 },
    { contractor: tomHarrison, assignment: assignments[6], hoursPerDay: 8, overtimeDay: 5 },
    { contractor: lisaChen, assignment: assignments[7], hoursPerDay: 7.5, overtimeDay: null },
  ];

  let timesheetCount = 0;
  let entryCount = 0;

  for (const { contractor, assignment, hoursPerDay, overtimeDay } of activeContractorAssignments) {
    const weeks = [
      { weekStart: twoWeeksAgoMon, status: "Approved", submittedAt: new Date("2026-03-08"), approvedAt: new Date("2026-03-10"), approvedBy: admin.name },
      { weekStart: lastWeekMon, status: "Approved", submittedAt: new Date("2026-03-15"), approvedAt: new Date("2026-03-17"), approvedBy: admin.name },
      { weekStart: thisWeekMon, status: "Draft", submittedAt: null, approvedAt: null, approvedBy: null },
    ];

    // Vary: some current-week timesheets are Submitted rather than Draft
    if (contractor.id === jamesDavies.id || contractor.id === emmaWilson.id) {
      weeks[2].status = "Submitted";
      weeks[2].submittedAt = new Date("2026-03-20");
    }

    for (const week of weeks) {
      const totalRegularHours = hoursPerDay * 5;
      const overtimeHours = overtimeDay !== null ? 2 : 0;

      const timesheet = await prisma.timesheet.create({
        data: {
          contractorId: contractor.id,
          assignmentId: assignment.id,
          weekStarting: week.weekStart,
          status: week.status,
          totalHours: totalRegularHours + overtimeHours,
          overtimeHours: overtimeHours,
          submittedAt: week.submittedAt,
          approvedAt: week.approvedAt,
          approvedBy: week.approvedBy,
        },
      });
      timesheetCount++;

      // Create Mon-Fri entries (dayOfWeek 0-4)
      for (let day = 0; day < 5; day++) {
        const isOvertimeDay = overtimeDay !== null && day === overtimeDay;
        await prisma.timesheetEntry.create({
          data: {
            timesheetId: timesheet.id,
            dayOfWeek: day,
            hours: hoursPerDay,
            overtime: isOvertimeDay ? 2 : 0,
            notes: isOvertimeDay ? "Extended hours to meet deadline" : null,
          },
        });
        entryCount++;
      }

      // Tom Harrison sometimes works Saturdays (crane ops on tight programme)
      if (contractor.id === tomHarrison.id && week.status === "Approved") {
        await prisma.timesheetEntry.create({
          data: {
            timesheetId: timesheet.id,
            dayOfWeek: 5, // Saturday
            hours: 6,
            overtime: 0,
            notes: "Saturday working - tower crane lift schedule",
          },
        });
        entryCount++;

        // Update the timesheet total to include Saturday
        await prisma.timesheet.update({
          where: { id: timesheet.id },
          data: {
            totalHours: totalRegularHours + overtimeHours + 6,
          },
        });
      }
    }
  }
  console.log(`  Created ${timesheetCount} timesheets with ${entryCount} entries.`);

  // ── 9. Rate cards ──
  console.log("\nCreating rate cards...");
  const rateCards = await Promise.all([
    prisma.rateCard.create({
      data: {
        role: "Project Manager",
        location: "London",
        payRate: 55.0,
        chargeRate: 85.0,
        margin: 35.29,
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: null,
      },
    }),
    prisma.rateCard.create({
      data: {
        role: "Site Manager",
        location: "London",
        payRate: 50.0,
        chargeRate: 78.0,
        margin: 35.9,
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: null,
      },
    }),
    prisma.rateCard.create({
      data: {
        role: "Quantity Surveyor",
        location: "London",
        payRate: 40.0,
        chargeRate: 62.0,
        margin: 35.48,
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: null,
      },
    }),
    prisma.rateCard.create({
      data: {
        role: "H&S Advisor",
        location: "National",
        payRate: 38.0,
        chargeRate: 58.0,
        margin: 34.48,
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: null,
      },
    }),
    prisma.rateCard.create({
      data: {
        role: "General Operative",
        location: "National",
        payRate: 18.0,
        chargeRate: 32.0,
        margin: 43.75,
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: null,
      },
    }),
    prisma.rateCard.create({
      data: {
        role: "Crane Operator",
        location: "London",
        payRate: 35.0,
        chargeRate: 55.0,
        margin: 36.36,
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: null,
      },
    }),
  ]);
  rateCards.forEach((r) =>
    console.log(`  Created rate card: ${r.role} (${r.location}) - Pay: £${r.payRate}/hr, Charge: £${r.chargeRate}/hr`)
  );

  console.log("\nSeed completed successfully!");
  console.log(`
Summary:
  - 1 admin user
  - ${companies.length} companies
  - 3 suppliers
  - ${allContractors.length} contractors
  - ${assignments.length} assignments
  - ${complianceData.length} compliance records
  - ${timesheetCount} timesheets (${entryCount} entries)
  - ${rateCards.length} rate cards
  `);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
