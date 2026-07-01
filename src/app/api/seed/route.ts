import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Household, Voter } from "@prisma/client";
import { requireSession } from "@/lib/api-auth";

// GET /api/seed — idempotent: only seeds if no campaign exists
export async function GET() {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  try {
    const existing = await db.campaign.count();
    if (existing > 0) {
      return NextResponse.json({ ok: true, seeded: false, message: "Already seeded" });
    }
    await seedAll();
    return NextResponse.json({ ok: true, seeded: true });
  } catch (e) {
    console.error("Seed error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

async function seedAll() {
  // ===== Campaign =====
  const campaign = await db.campaign.create({
    data: {
      candidateName: "Jordan Avery",
      officeSought: "City Council, District 4",
      district: "District 4",
      party: "Nonpartisan",
      electionDate: new Date(Date.now() + 47 * 86_400_000),
      fundraisingGoalCents: 75_000_00,
      voteGoal: 4200,
    },
  });

  // ===== Precincts =====
  const precinctNames = [
    { name: "Riverview Heights", code: "RV-01", ward: "Ward 4" },
    { name: "Old Mill", code: "OM-02", ward: "Ward 4" },
    { name: "Cedar Grove", code: "CG-03", ward: "Ward 4" },
    { name: "Lincoln Square", code: "LS-04", ward: "Ward 4" },
    { name: "Sunset Park", code: "SP-05", ward: "Ward 4" },
  ];
  const precincts = await Promise.all(
    precinctNames.map((p) =>
      db.precinct.create({
        data: { ...p, totalRegisteredVoters: 800 + Math.floor(Math.random() * 600) },
      })
    )
  );

  // ===== Households =====
  const streets = [
    "Maple Ave", "Oak St", "Cedar Ln", "Birch Way", "Pine Dr",
    "Elm Ct", "Willow Rd", "Sycamore Pl", "Aspen Blvd", "Walnut St",
    "Cherry St", "Spruce Ave", "Hawthorn Ln", "Magnolia Way", "Poplar Dr",
  ];
  const households: Household[] = [];
  for (let i = 0; i < 120; i++) {
    const street = streets[i % streets.length];
    const num = 100 + i * 7;
    const h = await db.household.create({
      data: {
        address: `${num} ${street}`,
        city: "Rivermont",
        state: "OR",
        zip: "97204",
        precinctId: precincts[i % precincts.length].id,
        campaignId: campaign.id,
      },
    });
    households.push(h);
  }

  // ===== Voters =====
  const firstNames = ["Maria", "James", "Aisha", "Liam", "Sofia", "Noah", "Priya", "Ethan", "Maya", "Lucas", "Zoe", "Diego", "Hana", "Owen", "Leah", "Marcus", "Nora", "Theo", "Ruby", "Felix", "Yuki", "Caleb", "Iris", "Anika", "Sam", "Grace", "Hugo", "Elena", "Bram", "Talia"];
  const lastNames = ["Reyes", "Patel", "Nguyen", "Okafor", "Schwartz", "Kim", "Garcia", "Johnson", "Lee", "Martinez", "Cohen", "Singh", "Murphy", "Rossi", "Park", "Hassan", "Walsh", "Bauer", "Lopez", "Klein", "Foster", "Doyle", "Mendez", "Brennan", "Yamada", "Petrov", "Adeyemi", "Costa", "Vargas", "Holm"];
  const parties = ["Dem", "Rep", "Ind", "Green", "NPP", "Lib"];
  const supportLevels = ["strong-support", "lean-support", "undecided", "lean-oppose", "strong-oppose", "unknown"];
  const supportWeights = [0.18, 0.22, 0.3, 0.12, 0.08, 0.1];

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function weightedPick<T>(arr: T[], weights: number[]): T {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < arr.length; i++) {
      cum += weights[i];
      if (r <= cum) return arr[i];
    }
    return arr[arr.length - 1];
  }

  const voters: Voter[] = [];
  for (let i = 0; i < 280; i++) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const support = weightedPick(supportLevels, supportWeights);
    const hh = households[i % households.length];
    const voted24 = Math.random() > 0.4;
    const voted22 = Math.random() > 0.55;
    const voted20 = Math.random() > 0.35;
    const v = await db.voter.create({
      data: {
        firstName: first,
        lastName: last,
        email: Math.random() > 0.5 ? `${first.toLowerCase()}.${last.toLowerCase()}@example.com` : null,
        phone: Math.random() > 0.3 ? `503-555-${String(1000 + i).slice(-4)}` : null,
        partyAffiliation: pick(parties),
        registeredAddress: hh.address,
        birthYear: 1945 + Math.floor(Math.random() * 65),
        voterSince: 1985 + Math.floor(Math.random() * 35),
        votedIn2024: voted24,
        votedIn2022: voted22,
        votedIn2020: voted20,
        supportLevel: support,
        volunteer: Math.random() < 0.06,
        hasYardSign: support === "strong-support" && Math.random() > 0.4,
        hasBumperSticker: Math.random() < 0.05,
        notes: Math.random() < 0.12 ? "Mentioned concerns about housing affordability and school funding." : null,
        tags: Math.random() < 0.15 ? "small-donor,host" : null,
        householdId: hh.id,
        precinctId: hh.precinctId,
        campaignId: campaign.id,
      },
    });
    voters.push(v);
  }

  // ===== Volunteers =====
  const volunteerData = [
    { first: "Maya", last: "Reyes", role: "coordinator", zip: "97204", hours: 124, status: "lead" },
    { first: "Tom", last: "Alvarez", role: "canvasser", zip: "97201", hours: 48, status: "active" },
    { first: "Priya", last: "Sharma", role: "phone-banker", zip: "97214", hours: 32, status: "active" },
    { first: "Eli", last: "Carter", role: "canvasser", zip: "97211", hours: 67, status: "active" },
    { first: "Jordan", last: "Ng", role: "data", zip: "97209", hours: 22, status: "active" },
    { first: "Rosa", last: "Lopez", role: "designer", zip: "97215", hours: 18, status: "active" },
    { first: "Caleb", last: "Foster", role: "canvasser", zip: "97202", hours: 41, status: "active" },
    { first: "Anika", last: "Patel", role: "phone-banker", zip: "97219", hours: 29, status: "active" },
    { first: "Marcus", last: "Bauer", role: "canvasser", zip: "97212", hours: 15, status: "inactive" },
    { first: "Sofia", last: "Romano", role: "phone-banker", zip: "97206", hours: 53, status: "active" },
    { first: "Theo", last: "Park", role: "coordinator", zip: "97210", hours: 88, status: "lead" },
    { first: "Nadia", last: "Hassan", role: "general", zip: "97233", hours: 11, status: "active" },
  ];
  const volunteerRecords = await Promise.all(
    volunteerData.map((v) =>
      db.volunteer.create({
        data: {
          firstName: v.first,
          lastName: v.last,
          email: `${v.first.toLowerCase()}.${v.last.toLowerCase()}@example.com`,
          phone: `503-555-${String(Math.floor(1000 + Math.random() * 8999))}`,
          role: v.role,
          skills: v.role === "coordinator" ? "leadership,canvassing,data" : v.role === "designer" ? "design,social-media" : v.role,
          hoursPledged: v.hours + 20,
          hoursLogged: v.hours,
          status: v.status,
          zip: v.zip,
          campaignId: campaign.id,
        },
      })
    )
  );

  // ===== Donors =====
  const donorData = [
    { first: "Eleanor", last: "Whitfield", capacity: "major", type: "individual", employer: "Whitfield Foundation", occupation: "Philanthropist" },
    { first: "Daniel", last: "Cho", capacity: "major", type: "individual", employer: "Cho Architects", occupation: "Architect" },
    { first: "Patricia", last: "O'Brien", capacity: "mid", type: "individual", employer: "Self", occupation: "Retired Teacher" },
    { first: "Marcus", last: "Greene", capacity: "mid", type: "small-business", employer: "Greene Hardware", occupation: "Business Owner" },
    { first: "Yuki", last: "Tanaka", capacity: "mid", type: "individual", employer: "Tanaka Law", occupation: "Attorney" },
    { first: "Aisha", last: "Bello", capacity: "small", type: "individual", employer: "—", occupation: "Nurse" },
    { first: "Robert", last: "Mendes", capacity: "small", type: "individual", employer: "—", occupation: "Electrician" },
    { first: "Helen", last: "Larsson", capacity: "small", type: "individual", employer: "—", occupation: "Retired" },
    { first: "Citizens", last: "for Progress PAC", capacity: "mid", type: "pac", employer: "—", occupation: "PAC" },
    { first: "Rivermont", last: "Teachers Assoc.", capacity: "mid", type: "pac", employer: "—", occupation: "PAC" },
  ];
  const donors = await Promise.all(
    donorData.map((d, i) =>
      db.donor.create({
        data: {
          firstName: d.first,
          lastName: d.last,
          email: `${d.first.toLowerCase()}.${d.last.toLowerCase().replace(/[^a-z]/g, "")}@example.com`,
          phone: `503-555-${String(2000 + i)}`,
          address: `${100 + i * 11} ${["Maple", "Oak", "Cedar", "Birch"][i % 4]} St`,
          city: "Rivermont",
          state: "OR",
          zip: "9720" + (i % 9),
          employer: d.employer,
          occupation: d.occupation,
          type: d.type,
          capacity: d.capacity,
          isRecurring: Math.random() > 0.7,
          campaignId: campaign.id,
        },
      })
    )
  );

  // ===== Donations =====
  const methods = ["online", "check", "cash", "in-kind"];
  const now = Date.now();
  const donations: ReturnType<typeof db.donation.create>[] = [];
  for (let i = 0; i < 60; i++) {
    const donor = donors[i % donors.length];
    const baseAmount = donor.capacity === "major" ? 1500_00 : donor.capacity === "mid" ? 250_00 : 50_00;
    const variance = 0.5 + Math.random() * 1.5;
    const amount = Math.max(5_00, Math.round((baseAmount * variance) / 100) * 100);
    const daysAgo = Math.floor(Math.random() * 90);
    donations.push(
      db.donation.create({
        data: {
          amountCents: amount,
          donationDate: new Date(now - daysAgo * 86_400_000),
          method: weightedPick(methods, [0.6, 0.25, 0.1, 0.05]),
          inKindDescription: Math.random() < 0.08 ? "Office space rental" : null,
          complianceVerified: Math.random() > 0.15,
          campaignId: campaign.id,
          donorId: donor.id,
        },
      })
    );
  }
  await Promise.all(donations);

  // ===== Events =====
  const eventTypes = ["town-hall", "canvass-kickoff", "phone-bank", "fundraiser", "rally", "volunteer-meeting"];
  const eventTitles = [
    "District 4 Town Hall — Housing & Schools",
    "Weekend Canvass Kickoff",
    "Tuesday Phone Bank",
    "Small Donor Reception",
    "Get Out The Vote Rally",
    "Volunteer Orientation",
    "Coffee with the Candidate",
    "Lawn Sign Distribution Day",
  ];
  for (let i = 0; i < 8; i++) {
    const startTime = new Date(now + (i - 2) * 4 * 86_400_000 + 18 * 3_600_000);
    const event = await db.event.create({
      data: {
        title: eventTitles[i % eventTitles.length],
        description: "Join neighbors and the campaign team to discuss priorities for the district.",
        type: eventTypes[i % eventTypes.length],
        startTime,
        endTime: new Date(startTime.getTime() + 90 * 60_000),
        location: ["Community Center", "Public Library", "Riverside Park", "Local Café"][i % 4],
        address: `${300 + i * 12} Main St, Rivermont`,
        capacity: 40 + i * 5,
        status: startTime.getTime() < now ? "completed" : "scheduled",
        campaignId: campaign.id,
      },
    });
    for (let j = 0; j < 8 + Math.floor(Math.random() * 15); j++) {
      const voter = voters[Math.floor(Math.random() * voters.length)];
      try {
        await db.eventAttendee.create({
          data: {
            eventId: event.id,
            voterId: voter.id,
            rsvpStatus: Math.random() > 0.2 ? "attended" : "registered",
          },
        });
      } catch {}
    }
  }

  // ===== Tasks =====
  const taskTitles = [
    "Print walk-list packets for Saturday knock",
    "Update voter support scores after canvass",
    "Call back 12 undecided voters in Cedar Grove",
    "Confirm lawn sign delivery to Riverview Heights",
    "Coordinate ride-share for elderly voters on Election Day",
    "Recruit 3 more phone-bankers for Tuesday",
    "Draft thank-you notes to major donors",
    "Verify compliance for in-kind office space donation",
    "Schedule coffee with civic association president",
    "Update volunteer hours spreadsheet",
    "Order more yard signs (run low in Ward 4)",
    "Prepare slide deck for town hall",
  ];
  const priorities = ["low", "medium", "high", "urgent"];
  const statuses = ["todo", "in-progress", "done", "blocked"];
  for (let i = 0; i < 12; i++) {
    await db.task.create({
      data: {
        title: taskTitles[i],
        description: "Auto-generated seed task to demonstrate workflow.",
        status: weightedPick(statuses, [0.35, 0.25, 0.3, 0.1]),
        priority: weightedPick(priorities, [0.25, 0.4, 0.25, 0.1]),
        dueDate: new Date(now + (i - 4) * 86_400_000),
        campaignId: campaign.id,
        assignedVolunteerId: volunteerRecords[i % volunteerRecords.length].id,
      },
    });
  }

  // ===== Canvass Logs =====
  const canvassOutcomes = ["canvassed", "not-home", "refused", "wrong-address", "language-barrier"];
  const canvassOutcomeWeights = [0.42, 0.32, 0.1, 0.1, 0.06];
  const issues = ["housing", "schools", "public-safety", "budget", "parks", "transit"];
  for (let i = 0; i < 80; i++) {
    const voter = voters[Math.floor(Math.random() * voters.length)];
    const volunteer = volunteerRecords[Math.floor(Math.random() * volunteerRecords.length)];
    const outcome = weightedPick(canvassOutcomes, canvassOutcomeWeights);
    await db.canvassLog.create({
      data: {
        voterId: voter.id,
        householdId: voter.householdId,
        volunteerId: volunteer.id,
        campaignId: campaign.id,
        outcome,
        supportLevel: outcome === "canvassed" ? weightedPick(supportLevels, [0.3, 0.25, 0.25, 0.1, 0.05, 0.05]) : null,
        yardSign: outcome === "canvassed" && Math.random() > 0.85,
        issuePriority: outcome === "canvassed" ? pick(issues) : null,
        notes: outcome === "canvassed" && Math.random() < 0.2 ? "Strong support; wants yard sign." : null,
        contactedAt: new Date(now - Math.floor(Math.random() * 30) * 86_400_000),
      },
    });
  }

  // ===== Call Logs =====
  const callOutcomes = ["contacted", "no-answer", "voicemail", "wrong-number", "refused", "call-back"];
  const callOutcomeWeights = [0.28, 0.35, 0.2, 0.05, 0.05, 0.07];
  for (let i = 0; i < 100; i++) {
    const voter = voters[Math.floor(Math.random() * voters.length)];
    const volunteer = volunteerRecords[Math.floor(Math.random() * volunteerRecords.length)];
    const outcome = weightedPick(callOutcomes, callOutcomeWeights);
    await db.callLog.create({
      data: {
        voterId: voter.id,
        volunteerId: volunteer.id,
        campaignId: campaign.id,
        outcome,
        supportLevel: outcome === "contacted" ? weightedPick(supportLevels, [0.3, 0.25, 0.25, 0.1, 0.05, 0.05]) : null,
        issuePriority: outcome === "contacted" ? pick(issues) : null,
        callLengthSec: outcome === "contacted" ? Math.floor(Math.random() * 240) + 30 : 0,
        notes: outcome === "contacted" && Math.random() < 0.15 ? "Supporter; reminded about election date." : null,
        calledAt: new Date(now - Math.floor(Math.random() * 30) * 86_400_000),
      },
    });
  }
}
