import type { TemplateDef } from "./catalog";

/**
 * The animated collection.
 *
 * Every entry sets `animated: true`, which layers `motion.ts` on top of the
 * normal CSS and JS: scroll reveals, an aurora hero wash, word-by-word headline
 * entry, pointer-tracked cards, counting statistics and a looping logo strip.
 *
 * All of it is plain CSS and vanilla JavaScript — an exported site still runs
 * from a file:// URL with nothing installed. They are Pro-only because the
 * motion work is the thing worth paying for, not because they need a server.
 */

const img = (seed: string, w = 1400, h = 900) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const f = (title: string, body: string, icon?: string) => ({ title, body, icon });
const q = (quote: string, name: string, role: string) => ({ quote, name, role });
const faq = (question: string, answer: string) => ({ q: question, a: answer });

const NAV = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

export const CATALOG_ANIMATED: TemplateDef[] = [
  {
    slug: "pulse-motion-saas",
    name: "Pulse — Motion SaaS",
    category: "animated",
    theme: "midnight",
    tier: "PRO",
    animated: true,
    featured: true,
    description:
      "A launch page built around movement: an aurora hero, headline words that rise into place, counters that roll up as they scroll in, and cards that light up under the cursor.",
    tags: ["dark", "gradient", "saas", "bold"],
    layout: [
      "nav:simple",
      "hero:centered",
      "block:logos",
      "block:stats",
      "block:featureBento",
      "block:steps",
      "block:testimonials",
      "block:pricing",
      "block:faq",
      "block:cta",
      "block:footer",
    ],
    data: {
      brand: "Pulse",
      nav: NAV,
      eyebrow: "Real-time product analytics",
      headline: "See what your product does the moment it does it",
      subhead:
        "Events land in under a second, dashboards update without a refresh, and every chart is one click from the raw rows behind it.",
      ctaPrimary: { label: "Start free", href: "#pricing" },
      ctaSecondary: { label: "Watch the tour", href: "#how" },
      logos: ["Northwind", "Halcyon", "Meridian", "Crestline", "Perigee", "Ashgrove"],
      stats: [
        { value: "480ms", label: "Median event latency" },
        { value: "12,400", label: "Teams shipping weekly" },
        { value: "99.98%", label: "Uptime over 12 months" },
        { value: "3.2B", label: "Events processed daily" },
      ],
      featuresTitle: "Built for the questions you actually ask",
      features: [
        f("Live funnels", "Watch a funnel redraw itself as traffic arrives. No scheduled rebuild, no stale cache.", "bolt"),
        f("Session replay", "Jump from a dropped step straight to the recording of someone dropping it.", "camera"),
        f("Cohort builder", "Define an audience once, then reuse it across retention, revenue and messaging.", "users"),
        f("Warehouse sync", "Query the data where it already lives. No second copy to keep honest.", "layers"),
        f("Anomaly alerts", "Told when a number moves further than it usually does, not when it crosses a guess.", "spark"),
      ],
      steps: [
        f("Drop in the snippet", "One script tag, or the SDK for your framework. Events start flowing immediately."),
        f("Name what matters", "Mark the three or four actions that mean something. Ignore the rest until you need it."),
        f("Watch it move", "Dashboards build themselves from the events you named. Share a link, not a screenshot."),
      ],
      quotes: [
        q("The counters ticking up during a launch is oddly motivating. It also caught a broken signup flow in about four minutes.", "Dana Whitfield", "Head of Growth, Northwind"),
        q("We replaced three tools with this. The one that mattered was session replay wired to the funnel.", "Marco Reyes", "Product Lead, Halcyon"),
      ],
      plans: [
        { name: "Solo", price: "$0", cadence: "/mo", cta: "Start free", features: ["100k events", "3 dashboards", "7-day retention"] },
        { name: "Team", price: "$79", cadence: "/mo", cta: "Choose Team", featured: true, features: ["5M events", "Unlimited dashboards", "Session replay", "12-month retention"] },
        { name: "Scale", price: "Custom", cadence: "", cta: "Talk to us", features: ["Warehouse sync", "SSO and SCIM", "Dedicated support", "Custom retention"] },
      ],
      faq: [
        faq("Does the tracking slow my site down?", "The snippet is 4 kB and loads async. It never blocks render, and it queues events if the network drops."),
        faq("Can I self-host?", "Scale plans can run the collector in your own VPC and keep raw events inside your network."),
        faq("What happens when I hit the event limit?", "Collection keeps running. You get an email and a week to decide whether to upgrade."),
      ],
      ctaTitle: "Put a number on it",
      ctaBody: "Free while you are under 100k events a month. No card, no call.",
      contact: { email: "hello@pulse.example", phone: "+1 (555) 0142", address: "218 Mercer Street, New York" },
      footerNote: "Pulse Analytics — built for teams who ship on Fridays.",
    },
  },

  {
    slug: "kinetic-studio",
    name: "Kinetic — Creative Studio",
    category: "animated",
    theme: "noir",
    tier: "PRO",
    animated: true,
    featured: true,
    description:
      "A motion-forward studio portfolio. Oversized type that assembles word by word, work that tilts under the cursor, and a logo strip that never stops moving.",
    tags: ["dark", "editorial", "bold", "typography"],
    layout: [
      "nav:minimal",
      "hero:split",
      "block:logos",
      "block:gallery",
      "block:featureAlternating",
      "block:stats",
      "block:testimonials",
      "block:cta",
      "block:contact",
      "block:footer",
    ],
    data: {
      brand: "Kinetic",
      nav: [
        { label: "Work", href: "#gallery" },
        { label: "Studio", href: "#features" },
        { label: "Contact", href: "#contact" },
      ],
      eyebrow: "Independent design studio",
      headline: "Brands that move before you touch them",
      subhead:
        "We design identity systems for companies that live on screens — where the logo is the least interesting part of the brand.",
      ctaPrimary: { label: "See the work", href: "#gallery" },
      ctaSecondary: { label: "Start a project", href: "#contact" },
      heroImage: img("kinetic-hero", 1600, 1100),
      heroImageAlt: "A wall of motion studies from recent studio projects",
      logos: ["Vantage", "Orbit", "Fathom", "Lumen", "Tessera", "Bramble"],
      gallery: [
        { src: img("kin-1", 900, 700), caption: "Vantage — identity and motion system" },
        { src: img("kin-2", 900, 700), caption: "Orbit — product launch film" },
        { src: img("kin-3", 900, 700), caption: "Fathom — editorial art direction" },
        { src: img("kin-4", 900, 700), caption: "Lumen — packaging and type" },
        { src: img("kin-5", 900, 700), caption: "Tessera — interface language" },
        { src: img("kin-6", 900, 700), caption: "Bramble — campaign and OOH" },
      ],
      featuresTitle: "How we work",
      features: [
        f("Motion is not decoration", "We design the transitions with the layouts. A brand that only exists as a static PDF is half finished.", "spark"),
        f("Small team, no handoff", "The people in the pitch are the people doing the work. Nothing gets translated through an account layer.", "users"),
        f("Systems, not artefacts", "You leave with tokens, components and rules — the things that let your team keep going without us.", "layers"),
      ],
      stats: [
        { value: "48", label: "Identity systems shipped" },
        { value: "11", label: "Years running" },
        { value: "6", label: "People, total" },
      ],
      quotes: [
        q("They gave us a brand that behaves. Our engineers implemented it in a week because the motion was already specified.", "Priya Raman", "CEO, Vantage"),
        q("The only studio we have worked with that shipped a Figma library and a CSS file that matched.", "Tom Alvarez", "Design Director, Orbit"),
      ],
      ctaTitle: "Got something to launch?",
      ctaBody: "We take four projects a quarter. Tell us what you are working on.",
      contact: { email: "studio@kinetic.example", phone: "+44 20 7946 0813", address: "Unit 4, Shoreditch Works, London", hours: "Mon–Thu, 10:00–18:00" },
      footerNote: "Kinetic — a small studio in London.",
    },
  },

  {
    slug: "aurora-launch",
    name: "Aurora — Product Launch",
    category: "animated",
    theme: "aurora",
    tier: "PRO",
    animated: true,
    description:
      "A single-goal launch page with a drifting gradient hero, sections that reveal as you scroll, and a pricing table that responds to the pointer.",
    tags: ["gradient", "colorful", "startup", "bold"],
    layout: [
      "nav:centered",
      "hero:cover",
      "block:stats",
      "block:featureGrid",
      "block:steps",
      "block:pricing",
      "block:faq",
      "block:cta",
      "block:footer",
    ],
    data: {
      brand: "Aurora",
      nav: NAV,
      eyebrow: "Launching this spring",
      headline: "The writing app that keeps up with you",
      subhead:
        "Offline-first, keyboard-first, and fast enough that you forget it is there. Your words stay in plain files you own.",
      ctaPrimary: { label: "Get early access", href: "#pricing" },
      ctaSecondary: { label: "See how it works", href: "#how" },
      heroImage: img("aurora-hero", 1600, 1000),
      heroImageAlt: "The Aurora writing interface in dark mode",
      stats: [
        { value: "18,900", label: "On the waiting list" },
        { value: "8ms", label: "Keystroke to screen" },
        { value: "100%", label: "Works offline" },
      ],
      featuresTitle: "Everything, nothing more",
      features: [
        f("Plain files", "Markdown on your disk. No database, no export step, no lock-in.", "code"),
        f("Instant search", "Every note, every version, under 20 milliseconds — even at ten thousand files.", "bolt"),
        f("Version history", "Every save is a version. Scrub back through a paragraph without leaving the line.", "clock"),
        f("Sync you control", "Point it at your own folder, drive or git remote. We never see the text.", "lock"),
        f("Focus mode", "Dims everything but the sentence you are in. Genuinely useful at 2am.", "spark"),
        f("Real keyboard support", "Every action has a shortcut, and the palette tells you what it is.", "layers"),
      ],
      steps: [
        f("Pick a folder", "Aurora reads what is already there. Nothing gets moved or rewritten."),
        f("Write", "The app gets out of the way. No sidebar full of features you will never open."),
        f("Keep the files", "Cancel any time and your work is exactly where it was — readable in any editor."),
      ],
      plans: [
        { name: "Free", price: "$0", cadence: "", cta: "Download", features: ["Unlimited local notes", "Full-text search", "Version history"] },
        { name: "Sync", price: "$5", cadence: "/mo", cta: "Get Sync", featured: true, features: ["End-to-end encrypted sync", "Unlimited devices", "Priority support"] },
        { name: "Lifetime", price: "$149", cadence: "once", cta: "Buy once", features: ["Everything in Sync", "All future updates", "No subscription"] },
      ],
      faq: [
        faq("Where is my writing stored?", "In a folder you choose, as ordinary Markdown files. Aurora is a viewer and editor, not a vault."),
        faq("What happens if the company disappears?", "Your files are already on your disk in a standard format. Nothing to export, nothing to rescue."),
        faq("Is there a mobile app?", "iOS is in beta for Sync subscribers. Android follows this year."),
      ],
      ctaTitle: "Start writing today",
      ctaBody: "Free forever for local notes. Sync when you want it on more than one machine.",
      footerNote: "Aurora — plain text, kept fast.",
    },
  },

  {
    slug: "orbit-agency-motion",
    name: "Orbit — Motion Agency",
    category: "animated",
    theme: "cobalt",
    tier: "PRO",
    animated: true,
    description:
      "A service page that earns its scroll: staged reveals, a counting results bar, alternating case studies and a contact block that feels alive.",
    tags: ["dark", "b2b", "services", "gradient"],
    layout: [
      "nav:simple",
      "hero:stacked",
      "block:logos",
      "block:stats",
      "block:featureAlternating",
      "block:steps",
      "block:testimonials",
      "block:faq",
      "block:contact",
      "block:footer",
    ],
    data: {
      brand: "Orbit",
      nav: NAV,
      eyebrow: "Performance marketing",
      headline: "Growth that survives the quarter it was booked in",
      subhead:
        "We run acquisition for companies past product-market fit — the part where the easy channels have stopped working.",
      ctaPrimary: { label: "Book a call", href: "#contact" },
      ctaSecondary: { label: "See results", href: "#features" },
      logos: ["Fielding", "Corvus", "Ashgrove", "Ridgeway", "Stackline"],
      stats: [
        { value: "312%", label: "Median 12-month growth" },
        { value: "$48M", label: "Ad spend managed" },
        { value: "27", label: "Active accounts" },
        { value: "4.9", label: "Average client rating" },
      ],
      featuresTitle: "What we actually do",
      features: [
        f("Paid acquisition", "Search, social and everything that can be measured. We stop what does not work faster than most teams are comfortable with.", "chart"),
        f("Landing page systems", "A page per audience, built and tested in days. Your engineers stay on the product.", "layers"),
        f("Lifecycle and retention", "The cheapest customer is the one you already have. Most of the wins are here.", "heart"),
      ],
      steps: [
        f("Two-week audit", "We go through the accounts, the analytics and the last six months of spend before proposing anything."),
        f("Ninety-day plan", "Three channels, clear targets, weekly numbers. You see the same dashboard we do."),
        f("Hand it back", "Most clients bring this in-house by month twelve. We write the playbook that makes it possible."),
      ],
      quotes: [
        q("They cut our spend by a third in the first month and revenue went up. That conversation was uncomfortable and correct.", "Sarah Lindqvist", "CMO, Fielding"),
        q("The only agency that ever told us to stop paying them. We hired the playbook and two of their people.", "James Okonkwo", "Founder, Corvus"),
      ],
      faq: [
        faq("What is the minimum engagement?", "Three months. Anything shorter and you are paying for the ramp without seeing the result."),
        faq("Do you work with pre-revenue companies?", "Rarely. Paid acquisition before product-market fit usually buys expensive proof that you are not ready."),
        faq("Who actually does the work?", "The two people in your kickoff. We do not have a junior bench."),
      ],
      contact: { email: "new@orbit.example", phone: "+1 (555) 0188", address: "1100 Fulton Market, Chicago", hours: "Mon–Fri, 09:00–17:00 CT" },
      footerNote: "Orbit — performance marketing, honestly measured.",
    },
  },

  {
    slug: "flux-portfolio-motion",
    name: "Flux — Animated Portfolio",
    category: "animated",
    theme: "slate",
    tier: "PRO",
    animated: true,
    description:
      "A personal portfolio where the type assembles itself, the project grid tilts under the pointer, and the experience list draws in as you reach it.",
    tags: ["dark", "minimal", "typography", "personal"],
    layout: [
      "nav:minimal",
      "hero:editorial",
      "block:gallery",
      "block:featureGrid",
      "block:stats",
      "block:testimonials",
      "block:cta",
      "block:contact",
      "block:footer",
    ],
    data: {
      brand: "Ren Ashcroft",
      nav: [
        { label: "Work", href: "#gallery" },
        { label: "About", href: "#features" },
        { label: "Contact", href: "#contact" },
      ],
      eyebrow: "Product designer, Berlin",
      headline: "I design interfaces that explain themselves",
      subhead:
        "Twelve years on developer tools and financial products — the kind where being wrong is expensive and the UI has to be honest about uncertainty.",
      ctaPrimary: { label: "See selected work", href: "#gallery" },
      ctaSecondary: { label: "Get in touch", href: "#contact" },
      heroImage: img("flux-hero", 1400, 1000),
      heroImageAlt: "Interface studies from recent product work",
      gallery: [
        { src: img("flux-1", 900, 700), caption: "Ledger — reconciliation for finance teams" },
        { src: img("flux-2", 900, 700), caption: "Signal — observability for platform engineers" },
        { src: img("flux-3", 900, 700), caption: "Harbour — deployment dashboard" },
        { src: img("flux-4", 900, 700), caption: "Tide — treasury and cash forecasting" },
      ],
      featuresTitle: "What I am good at",
      features: [
        f("Dense interfaces", "Tables, filters and dashboards that stay readable at a thousand rows.", "layers"),
        f("Design systems", "Tokens and components your engineers will actually keep using after I leave.", "code"),
        f("Prototyping in code", "I build the real thing in HTML and CSS. Static mockups hide the hard problems.", "bolt"),
        f("Research that changes things", "Six interviews and a decision, not forty and a slide deck.", "users"),
      ],
      stats: [
        { value: "12", label: "Years designing" },
        { value: "34", label: "Products shipped" },
        { value: "4", label: "Design systems built" },
      ],
      quotes: [
        q("Ren rebuilt our reconciliation flow and support tickets about it dropped by 70%. The design was mostly deletion.", "Anke Vogel", "VP Product, Ledger"),
        q("The prototypes arrive as working code. It changed how our team argues about design.", "Daniel Foss", "Engineering Lead, Signal"),
      ],
      ctaTitle: "Available from March",
      ctaBody: "Taking one contract at a time, remote or in Berlin.",
      contact: { email: "hello@ren.example", phone: "+49 30 5550 1188", address: "Kreuzberg, Berlin" },
      footerNote: "Ren Ashcroft — product design.",
    },
  },

  {
    slug: "vertex-gaming-motion",
    name: "Vertex — Esports",
    category: "animated",
    theme: "neon",
    tier: "PRO",
    animated: true,
    description:
      "A high-energy team page: neon aurora, roster cards that light up under the cursor, counters for the trophy cabinet and a scrolling sponsor strip.",
    tags: ["dark", "colorful", "bold", "gaming"],
    layout: [
      "nav:simple",
      "hero:cover",
      "block:logos",
      "block:stats",
      "block:team",
      "block:featureGrid",
      "block:testimonials",
      "block:cta",
      "block:footer",
    ],
    data: {
      brand: "Vertex",
      nav: [
        { label: "Roster", href: "#team" },
        { label: "Results", href: "#features" },
        { label: "Sponsors", href: "#logos" },
        { label: "Contact", href: "#contact" },
      ],
      eyebrow: "Tier-one competitive team",
      headline: "Nine players. Four titles. One very loud room.",
      subhead:
        "Founded in a university dorm in 2018 and currently ranked third in the world. Watch us live every Thursday.",
      ctaPrimary: { label: "Watch live", href: "#features" },
      ctaSecondary: { label: "Meet the roster", href: "#team" },
      heroImage: img("vertex-hero", 1600, 1000),
      heroImageAlt: "The Vertex roster on stage at a tournament final",
      logos: ["Hyperion", "Voltcore", "Nimbus", "Raster", "Kite", "Foundry"],
      stats: [
        { value: "4", label: "Major titles" },
        { value: "218", label: "Matches won" },
        { value: "1.4M", label: "Followers across platforms" },
        { value: "$2.8M", label: "Prize money" },
      ],
      team: [
        { name: "Kai Nakamura", role: "In-game leader", initials: "KN" },
        { name: "Sofia Marchetti", role: "Entry fragger", initials: "SM" },
        { name: "Andre Boateng", role: "Support", initials: "AB" },
        { name: "Lena Fischer", role: "Sniper", initials: "LF" },
        { name: "Diego Ramos", role: "Flex", initials: "DR" },
        { name: "Coach Petrov", role: "Head coach", initials: "CP" },
      ],
      featuresTitle: "This season",
      features: [
        f("Spring Major — 1st", "Beat Hyperion 3–1 in the final after dropping the opening map.", "star"),
        f("Continental Cup — 2nd", "Lost the decider in overtime. We are not over it.", "shield"),
        f("Invitational — 1st", "Cleanest run of the year: nine maps, one dropped.", "rocket"),
      ],
      quotes: [
        q("The most disciplined team in the league right now. Their mid-round calling is a level above.", "Ana Duarte", "Analyst, Circuit Weekly"),
        q("Vertex have turned a student roster into a genuine dynasty in six years.", "Ben Carroway", "Commentator"),
      ],
      ctaTitle: "Thursdays, 19:00 CET",
      ctaBody: "Follow the stream and never miss a match.",
      footerNote: "Vertex Esports — founded 2018.",
    },
  },
];
