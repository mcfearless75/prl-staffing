import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Their scale: 1=Very Well (best) → 5 stars, 5=Poor → 1 star
function mapRating(theirRating: number): number {
  return 6 - theirRating; // 1→5, 2→4, 3→3, 4→2, 5→1
}

const responses = [
  {
    userName: "Nicholas Farrell",
    userEmail: "nicholas.farrell@metlen.com",
    details: {
      companyName: "Metlen Minerals & Metals",
      contactName: "Nicholas Farrell",
      contactEmail: "nicholas.farrell@metlen.com",
      dateOfService: null,
      overallSatisfaction: mapRating(1),    // 5 stars — all 1s (Very Well)
      qualityOfWorkers: mapRating(1),       // 5 stars
      communication: mapRating(1),          // 5 stars
      compliance: mapRating(1),             // 5 stars
      valueForMoney: mapRating(1),          // 5 stars
      recommend: "Yes",
      whatDidWell: "All categories rated as Very Well (top score). Customer Service, Quality, Delivery, Pricing, Technical Support and Overall Performance all scored 1 (Very Well).",
      whatToImprove: "",
      otherComments: "Respondent: Nicholas Farrell, Site Manager. Contact: 07393292734.",
    },
  },
  {
    userName: "Kevin McKillop",
    userEmail: "kevin.mckillop@dalkia.com",
    details: {
      companyName: "Dalkia Engineering",
      contactName: "Kevin McKillop",
      contactEmail: "kevin.mckillop@dalkia.com",
      dateOfService: null,
      overallSatisfaction: mapRating(2),    // 4 stars — mostly 1-2 (Very Well to Above Average)
      qualityOfWorkers: mapRating(2),       // 4 stars
      communication: mapRating(1),          // 5 stars — customer service rated 1
      compliance: mapRating(2),             // 4 stars
      valueForMoney: mapRating(1),          // 5 stars — pricing timely response rated 1
      recommend: "Yes",
      whatDidWell: "Customer service, delivery performance, technical support and pricing response all rated highly (Very Well to Above Average). Scope covers various agency resource and placements across Urenco, Protos, EDF Heysham and EDF Hartlepool.",
      whatToImprove: "",
      otherComments: "Respondent: Kevin McKillop, Operations Director - Nuclear. Contact: 07595021417. Roles covered: Various agency resource and placements.",
    },
  },
];

async function main() {
  for (const r of responses) {
    await prisma.activityLog.create({
      data: {
        userName: r.userName,
        userEmail: r.userEmail,
        action: "SURVEY",
        entityType: "CustomerSurvey",
        details: JSON.stringify(r.details),
      },
    });
    console.log(`Created survey record for: ${r.details.companyName}`);
  }
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
