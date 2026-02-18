import type { NavItem, NavSection, RoleNavConfig } from "@/types/ui";

const studentSections: NavSection[] = [
  {
    key: "start",
    title: "Start",
    items: [
      { label: "Onboarding", href: "/onboarding" },
      { label: "Home", href: "/home" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Check-In", href: "/checkin" },
      { label: "Goal", href: "/goal" },
      { label: "Profile", href: "/profile" },
      { label: "Join Class", href: "/join" }
    ]
  },
  {
    key: "learn",
    title: "Learn",
    items: [
      { label: "Activities", href: "/activities" },
      { label: "Claim", href: "/claim" },
      { label: "Journal", href: "/journal" },
      { label: "Progress", href: "/progress" },
      { label: "Recommended", href: "/recommended" },
      { label: "Transcript", href: "/transcript" },
      { label: "Assignments", href: "/assignments" },
      { label: "Credentials", href: "/credentials" }
    ]
  },
  {
    key: "community",
    title: "Community",
    items: [
      { label: "Events", href: "/events" },
      { label: "Kudos", href: "/kudos" },
      { label: "Hot Takes", href: "/hot-takes" },
      { label: "Discussion", href: "/discussion" },
      { label: "Pod Chat", href: "/pod-chat" },
      { label: "Pods", href: "/pods" },
      { label: "Quests", href: "/quests" },
      { label: "Raffles", href: "/raffles" },
      { label: "Leaderboard", href: "/leaderboard" },
      { label: "Calendar", href: "/calendar" }
    ]
  },
  {
    key: "track",
    title: "Track",
    items: [
      { label: "Roadmap", href: "/roadmap" },
      { label: "Timeline", href: "/timeline" },
      { label: "Skills", href: "/skills" },
      { label: "Checklist", href: "/checklist" },
      { label: "What's New", href: "/whats-new" },
      { label: "Notifications", href: "/notifications" },
      { label: "Notif. Prefs", href: "/notification-preferences" }
    ]
  },
  {
    key: "support",
    title: "Support",
    items: [
      { label: "Help", href: "/help" },
      { label: "History", href: "/history" },
      { label: "Status", href: "/status" },
      { label: "Records", href: "/records" },
      { label: "Rewards", href: "/rewards" },
      { label: "Refer", href: "/refer" },
      { label: "Referrals", href: "/referrals" },
      { label: "Chat", href: "/chat" }
    ]
  }
];

const adminSections: NavSection[] = [
  {
    key: "core",
    title: "Core Ops",
    items: [
      { label: "Overview", href: "/admin/overview" },
      { label: "Launch", href: "/admin/launch" },
      { label: "Students", href: "/admin/students" },
      { label: "Invites", href: "/admin/invites" },
      { label: "Support", href: "/admin/support" },
      { label: "Action Queue", href: "/admin/action-queue" },
      { label: "Audit", href: "/admin/audit-log" },
      { label: "Runbook", href: "/admin/runbook" }
    ]
  },
  {
    key: "curriculum",
    title: "Curriculum",
    items: [
      { label: "Curriculum", href: "/admin/curriculum" },
      { label: "Programs", href: "/admin/curriculum/programs" },
      { label: "Modules", href: "/admin/curriculum/modules" },
      { label: "Lessons", href: "/admin/curriculum/lessons" },
      { label: "Activities", href: "/admin/curriculum/activities" },
      { label: "Outcomes", href: "/admin/curriculum/outcomes" },
      { label: "Publish", href: "/admin/curriculum/publish" }
    ]
  },
  {
    key: "engagement",
    title: "Engagement",
    items: [
      { label: "Seasons", href: "/admin/seasons" },
      { label: "Events", href: "/admin/events" },
      { label: "Pods", href: "/admin/pods" },
      { label: "Quests", href: "/admin/quests" },
      { label: "Engagement", href: "/admin/engagement/overview" },
      { label: "Dropoff", href: "/admin/engagement/dropoff" },
      { label: "Goals", href: "/admin/goals" },
      { label: "Rewards", href: "/admin/rewards" },
      { label: "Referrals", href: "/admin/referrals" }
    ]
  },
  {
    key: "insights",
    title: "Insights",
    items: [
      { label: "Analytics", href: "/admin/analytics" },
      { label: "Mastery", href: "/admin/analytics/mastery" },
      { label: "Decision Trends", href: "/admin/analytics/decision-trends" },
      { label: "At-Risk", href: "/admin/analytics/at-risk" },
      { label: "Cohort Trends", href: "/admin/analytics/cohort-trends" },
      { label: "Intervention Queue", href: "/admin/interventions/queue" },
      { label: "Interventions", href: "/admin/interventions/templates" },
      { label: "Negotiation", href: "/admin/negotiation/scorecards" },
      { label: "Journal Review", href: "/admin/journal/review" }
    ]
  },
  {
    key: "comms",
    title: "Communication",
    items: [
      { label: "Broadcast", href: "/admin/broadcast" },
      { label: "Announcements", href: "/admin/announcements" },
      { label: "Notes", href: "/admin/notes" },
      { label: "Spotlight", href: "/admin/spotlight" },
      { label: "Kudos", href: "/admin/kudos" },
      { label: "Chat", href: "/admin/chat" },
      { label: "Calendar", href: "/admin/calendar" },
      { label: "Changelog", href: "/admin/changelog" }
    ]
  },
  {
    key: "system",
    title: "System",
    items: [
      { label: "Content Validation", href: "/admin/content/validation" },
      { label: "Preview", href: "/admin/preview" },
      { label: "Settings", href: "/admin/settings" },
      { label: "Assignments", href: "/admin/assignments" },
      { label: "Raffles", href: "/admin/raffles" }
    ]
  }
];

export const roleNavigation: RoleNavConfig = {
  STUDENT: studentSections,
  ADMIN: adminSections
};

export function flattenSections(sections: NavSection[]): NavItem[] {
  const items: NavItem[] = [];
  for (const section of sections) {
    items.push(...section.items);
  }
  return items;
}

export function findLabelForPath(pathname: string, sections: NavSection[]): string {
  const path = pathname.split("?")[0];
  for (const section of sections) {
    const exact = section.items.find((item) => item.href === path);
    if (exact) return exact.label;

    const nested = section.items.find((item) => path.startsWith(item.href + "/"));
    if (nested) return nested.label;
  }

  if (path.startsWith("/admin")) return "Admin";
  if (path === "/") return "Welcome";
  return "Portal";
}
