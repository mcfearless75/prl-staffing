const BASE = "https://www.prismworkforce.online";

const responses = [
  {
    companyName: "Metlen Minerals & Metals",
    contactName: "Nicholas Farrell",
    contactEmail: "nicholas.farrell@metlen.com",
    dateOfService: null,
    overallSatisfaction: 5,
    qualityOfWorkers: 5,
    communication: 5,
    compliance: 5,
    valueForMoney: 5,
    recommend: "Yes",
    whatDidWell: "All categories rated as Very Well (top score). Customer Service, Quality, Delivery, Pricing, Technical Support and Overall Performance all scored maximum marks.",
    whatToImprove: "",
    otherComments: "Respondent: Nicholas Farrell, Site Manager. Contact: 07393292734.",
  },
  {
    companyName: "Dalkia Engineering",
    contactName: "Kevin McKillop",
    contactEmail: "kevin.mckillop@dalkia.com",
    dateOfService: null,
    overallSatisfaction: 4,
    qualityOfWorkers: 4,
    communication: 5,
    compliance: 4,
    valueForMoney: 5,
    recommend: "Yes",
    whatDidWell: "Customer service, delivery performance, technical support and pricing response all rated highly (Very Well to Above Average). Scope covers various agency resource and placements across Urenco, Protos, EDF Heysham and EDF Hartlepool.",
    whatToImprove: "",
    otherComments: "Respondent: Kevin McKillop, Operations Director - Nuclear. Contact: 07595021417.",
  },
];

for (const body of responses) {
  const res = await fetch(`${BASE}/api/survey`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(`${body.companyName}: ${res.status} — ${JSON.stringify(data)}`);
}
