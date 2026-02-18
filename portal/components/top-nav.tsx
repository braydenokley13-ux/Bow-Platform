import Link from "next/link";
import { AuthStatus } from "@/components/auth-status";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

const studentLinks = [
  ["Onboarding", "/onboarding"],
  ["Home", "/home"],
  ["Dashboard", "/dashboard"],
  ["Check-In", "/checkin"],
  ["Goal", "/goal"],
  ["Profile", "/profile"],
  ["Join Class", "/join"],
  ["Events", "/events"],
  ["Kudos", "/kudos"],
  ["Hot Takes", "/hot-takes"],
  ["Discussion", "/discussion"],
  ["Pod Chat", "/pod-chat"],
  ["Pods", "/pods"],
  ["Quests", "/quests"],
  ["Activities", "/activities"],
  ["Claim", "/claim"],
  ["Journal", "/journal"],
  ["Progress", "/progress"],
  ["Recommended", "/recommended"],
  ["Transcript", "/transcript"],
  ["Assignments", "/assignments"],
  ["Credentials", "/credentials"],
  ["Leaderboard", "/leaderboard"],
  ["Badges", "/badges"],
  ["Trophy Case", "/trophy-case"],
  ["Deep Dive", "/deep-dive"],
  ["Calendar", "/calendar"],
  ["Chat", "/chat"],
  ["Raffles", "/raffles"],
  ["Roadmap", "/roadmap"],
  ["Timeline", "/timeline"],
  ["Skills", "/skills"],
  ["Checklist", "/checklist"],
  ["What's New", "/whats-new"],
  ["Notif. Prefs", "/notification-preferences"],
  ["Notifications", "/notifications"],
  ["Help", "/help"],
  ["History", "/history"],
  ["Status", "/status"],
  ["Records", "/records"],
  ["Rewards", "/rewards"],
  ["Refer", "/refer"],
] as const;

const adminLinks = [
  ["Overview", "/admin/overview"],
  ["Analytics", "/admin/analytics"],
  ["Launch", "/admin/launch"],
  ["Seasons", "/admin/seasons"],
  ["Events", "/admin/events"],
  ["Pods", "/admin/pods"],
  ["Quests", "/admin/quests"],
  ["Engagement", "/admin/engagement/overview"],
  ["Dropoff", "/admin/engagement/dropoff"],
  ["Content Validation", "/admin/content/validation"],
  ["Curriculum", "/admin/curriculum"],
  ["Programs", "/admin/curriculum/programs"],
  ["Modules", "/admin/curriculum/modules"],
  ["Lessons", "/admin/curriculum/lessons"],
  ["Activities", "/admin/curriculum/activities"],
  ["Outcomes", "/admin/curriculum/outcomes"],
  ["Publish", "/admin/curriculum/publish"],
  ["Mastery", "/admin/analytics/mastery"],
  ["Decision Trends", "/admin/analytics/decision-trends"],
  ["At-Risk", "/admin/analytics/at-risk"],
  ["Cohort Trends", "/admin/analytics/cohort-trends"],
  ["Intervention Queue", "/admin/interventions/queue"],
  ["Interventions", "/admin/interventions/templates"],
  ["Negotiation", "/admin/negotiation/scorecards"],
  ["Journal Review", "/admin/journal/review"],
  ["Students", "/admin/students"],
  ["Goals", "/admin/goals"],
  ["Kudos", "/admin/kudos"],
  ["Broadcast", "/admin/broadcast"],
  ["Changelog", "/admin/changelog"],
  ["Settings", "/admin/settings"],
  ["Support", "/admin/support"],
  ["Invites", "/admin/invites"],
  ["Action Queue", "/admin/action-queue"],
  ["Assignments", "/admin/assignments"],
  ["Calendar", "/admin/calendar"],
  ["Deep Dive", "/admin/deep-dive"],
  ["Achievements", "/admin/achievements"],
  ["Chat", "/admin/chat"],
  ["Raffles", "/admin/raffles"],
  ["Audit", "/admin/audit-log"],
  ["Runbook", "/admin/runbook"],
  ["Rewards", "/admin/rewards"],
  ["Referrals", "/admin/referrals"],
  ["Spotlight", "/admin/spotlight"],
  ["Notes", "/admin/notes"],
  ["Announcements", "/admin/announcements"],
] as const;

export function TopNav() {
  return (
    <header className="top">
      <div className="bar">
        <div className="brand">
          <div className="logo" aria-hidden />
          <span>BOW Sports Capital Portal</span>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <AuthStatus />
            <DarkModeToggle />
          </div>
          <div className="nav-row">
            {studentLinks.map(([label, href]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
          <div className="nav-row">
            {adminLinks.map(([label, href]) => (
              <Link key={href} href={href}>
                Admin: {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
